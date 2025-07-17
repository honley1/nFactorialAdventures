const express = require('express');
const router = express.Router();
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const Quest = require('../models/Quest');
const Achievement = require('../models/Achievement');
const { resourceSystem } = require('../utils/resourceSystem');

// Middleware для проверки авторизации
const requireAuth = async (req, res, next) => {
  try {
    const { telegramId } = req.body;
    
    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'telegramId required' });
    }
    
    const user = await User.findOne({ telegramId: telegramId.toString() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// GET /api/game/state - Получить текущее состояние игры
router.post('/state', requireAuth, async (req, res) => {
  try {
    const gameSession = await GameSession.findOne({ userId: req.user._id });
    
    if (!gameSession) {
      return res.status(404).json({ error: 'Game session not found' });
    }
    
    // Автоматически обновляем ресурсы
    gameSession.calculateResourceDecay();
    await gameSession.save();
    
    // Получаем доступные квесты
    const availableQuests = await Quest.getAvailableQuests(req.user, gameSession);
    
    // Проверяем достижения
    const unlockedAchievements = await Achievement.checkAllAchievements(
      req.user, 
      gameSession, 
      { recentActions: gameSession.actions.slice(-10) }
    );
    
    // Разблокируем новые достижения
    for (const achievement of unlockedAchievements) {
      if (req.user.unlockAchievement(achievement.id)) {
        const rewards = achievement.applyRewards(req.user, gameSession);
        console.log(`🏆 Achievement unlocked: ${achievement.name} for ${req.user.username}`);
      }
    }
    
    if (unlockedAchievements.length > 0) {
      await req.user.save();
      await gameSession.save();
    }
    
    res.json({
      success: true,
      gameSession: {
        id: gameSession._id,
        resources: gameSession.resources,
        currentLocation: gameSession.currentLocation,
        currentWeek: gameSession.currentWeek,
        gameTime: gameSession.gameTime,
        activeQuests: gameSession.activeQuests,
        unlockedContent: gameSession.unlockedContent,
        actions: gameSession.actions.slice(-20), // последние 20 действий
        efficiencyMultiplier: gameSession.efficiencyMultiplier
      },
      user: {
        level: req.user.level,
        experience: req.user.experience,
        score: req.user.score,
        currentWeek: req.user.currentWeek
      },
      availableQuests: availableQuests.map(q => ({
        id: q.id,
        name: q.name,
        description: q.description,
        difficulty: q.difficulty,
        category: q.category,
        estimatedDuration: q.estimatedDuration,
        rewards: q.rewards
      })),
      newAchievements: unlockedAchievements.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        rarity: a.rarity
      }))
    });
    
  } catch (error) {
    console.error('❌ Game state error:', error);
    res.status(500).json({
      error: 'Failed to get game state',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/game/action - Выполнить игровое действие
router.post('/action', requireAuth, async (req, res) => {
  try {
    const { actionType, target, parameters = {} } = req.body;
    
    if (!actionType || !target) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'actionType and target are required'
      });
    }
    
    const gameSession = await GameSession.findOne({ userId: req.user._id });
    if (!gameSession) {
      return res.status(404).json({ error: 'Game session not found' });
    }
    
    const originalResources = { ...gameSession.resources };
    let actionResult = {};
    
    // Обрабатываем различные типы действий
    switch (actionType) {
      case 'interact':
        actionResult = await handleInteraction(target, gameSession, req.user, parameters);
        break;
        
      case 'move':
        actionResult = await handleMovement(target, gameSession, req.user);
        break;
        
      case 'dialog':
        actionResult = await handleDialog(target, gameSession, req.user, parameters);
        break;
        
      default:
        return res.status(400).json({ error: 'Unknown action type' });
    }
    
    // Записываем действие в историю
    gameSession.addAction(actionType, target, originalResources, gameSession.resources, {
      ...parameters,
      result: actionResult
    });
    
    // Обновляем прогресс квестов
    const questUpdates = await updateQuestProgress(gameSession, req.user, {
      type: actionType,
      target,
      metadata: parameters
    });
    
    // Сохраняем изменения
    await gameSession.save();
    await req.user.save();
    
    res.json({
      success: true,
      result: actionResult,
      resources: gameSession.resources,
      questUpdates,
      message: actionResult.message || 'Действие выполнено'
    });
    
  } catch (error) {
    console.error('❌ Game action error:', error);
    res.status(500).json({
      error: 'Failed to perform action',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/game/move - Перемещение между локациями
router.post('/move', requireAuth, async (req, res) => {
  try {
    const { location } = req.body;
    
    const validLocations = ['classroom', 'coworking', 'cafe', 'lobby'];
    if (!validLocations.includes(location)) {
      return res.status(400).json({ error: 'Invalid location' });
    }
    
    const gameSession = await GameSession.findOne({ userId: req.user._id });
    if (!gameSession) {
      return res.status(404).json({ error: 'Game session not found' });
    }
    
    // Проверяем, разблокирована ли локация
    if (!gameSession.unlockedContent.locations.includes(location)) {
      return res.status(403).json({ 
        error: 'Location locked',
        message: 'Эта локация еще не разблокирована'
      });
    }
    
    // Выполняем перемещение
    const previousLocation = gameSession.currentLocation;
    gameSession.moveToLocation(location);
    
    await gameSession.save();
    
    res.json({
      success: true,
      previousLocation,
      currentLocation: location,
      resources: gameSession.resources,
      message: `Перемещение в: ${getLocationName(location)}`
    });
    
  } catch (error) {
    console.error('❌ Move error:', error);
    res.status(500).json({
      error: 'Failed to move',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/game/save - Сохранить прогресс игры
router.post('/save', requireAuth, async (req, res) => {
  try {
    const gameSession = await GameSession.findOne({ userId: req.user._id });
    if (!gameSession) {
      return res.status(404).json({ error: 'Game session not found' });
    }
    
    // Обновляем время последнего сохранения
    gameSession.lastSaved = new Date();
    req.user.lastPlayed = new Date();
    
    await gameSession.save();
    await req.user.save();
    
    res.json({
      success: true,
      message: 'Прогресс сохранен',
      savedAt: gameSession.lastSaved
    });
    
  } catch (error) {
    console.error('❌ Save error:', error);
    res.status(500).json({
      error: 'Failed to save',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// === HELPER FUNCTIONS ===

// Обработка взаимодействий с объектами
async function handleInteraction(target, gameSession, user, parameters) {
  const interactions = {
    coffee_machine: {
      cost: { motivation: 5 },
      benefit: { coffee: 40, motivation: 5 },
      message: 'Выпили чашку ароматного кофе! ☕',
      cooldown: 60000 // 1 минута
    },
    computer: {
      cost: { coffee: 15, motivation: 10 },
      benefit: { knowledge: 20 },
      message: 'Написали код и изучили новые технологии! 💻',
      condition: { coffee: 15 } // минимум кофе
    },
    mentor_npc: {
      cost: { coffee: 5 },
      benefit: { motivation: 30, knowledge: 15 },
      message: 'Получили ценные советы от ментора! 👨‍🏫'
    },
    food_counter: {
      cost: { motivation: 5 },
      benefit: { sleep: 20, motivation: 10 },
      message: 'Перекусили и восстановили силы! 🍕'
    }
  };
  
  const interaction = interactions[target];
  if (!interaction) {
    throw new Error(`Unknown interaction target: ${target}`);
  }
  
  // Проверяем условия
  if (interaction.condition) {
    for (const [resource, minValue] of Object.entries(interaction.condition)) {
      if (gameSession.resources[resource] < minValue) {
        throw new Error(`Недостаточно ${resource}: нужно ${minValue}, есть ${gameSession.resources[resource]}`);
      }
    }
  }
  
  // Применяем затраты
  if (interaction.cost) {
    const changes = {};
    for (const [resource, cost] of Object.entries(interaction.cost)) {
      changes[resource] = -cost;
    }
    gameSession.updateResources(changes);
  }
  
  // Применяем выгоды (с учетом времени дня)
  if (interaction.benefit) {
    const efficiency = gameSession.efficiencyMultiplier;
    const changes = {};
    
    for (const [resource, benefit] of Object.entries(interaction.benefit)) {
      changes[resource] = Math.floor(benefit * efficiency);
    }
    
    gameSession.updateResources(changes);
  }
  
  // Обновляем статистику пользователя
  user.stats.interactionsCount += 1;
  
  if (target === 'coffee_machine') {
    user.stats.coffeeCupsConsumed += 1;
  } else if (target === 'computer') {
    user.stats.codingSessionsCompleted += 1;
  } else if (target.includes('npc')) {
    user.stats.npcDialogues += 1;
  }
  
  return {
    message: interaction.message,
    efficiency: gameSession.efficiencyMultiplier,
    target
  };
}

// Обработка перемещений
async function handleMovement(location, gameSession, user) {
  // Перемещение обрабатывается в основном endpoint
  return {
    message: `Перемещение в: ${getLocationName(location)}`,
    location
  };
}

// Обработка диалогов с NPC
async function handleDialog(npcId, gameSession, user, parameters) {
  const { dialogueStage = 'start' } = parameters;
  
  // Здесь можно добавить логику конкретных диалогов
  user.stats.npcDialogues += 1;
  
  return {
    message: `Поговорили с ${npcId}`,
    npcId,
    stage: dialogueStage
  };
}

// Обновление прогресса квестов
async function updateQuestProgress(gameSession, user, action) {
  const updates = [];
  
  for (const activeQuest of gameSession.activeQuests) {
    if (activeQuest.isCompleted) continue;
    
    const quest = await Quest.findOne({ id: activeQuest.questId });
    if (!quest) continue;
    
    // Проверяем прогресс
    const isCompleted = quest.checkProgress(gameSession, action);
    const progress = quest.calculateProgress(gameSession, action);
    
    if (progress > activeQuest.progress) {
      activeQuest.progress = progress;
      updates.push({
        questId: quest.id,
        name: quest.name,
        progress: progress,
        completed: isCompleted
      });
    }
    
    if (isCompleted && !activeQuest.isCompleted) {
      // Завершаем квест
      gameSession.completeQuest(quest.id);
      const questResult = user.completeQuest(quest.id, quest.rewards);
      
      // Применяем награды
      const rewards = quest.applyRewards(user, gameSession);
      
      updates.push({
        questId: quest.id,
        name: quest.name,
        progress: 100,
        completed: true,
        rewards
      });
      
      console.log(`✅ Quest completed: ${quest.name} by ${user.username}`);
    }
  }
  
  return updates;
}

// Получение человекочитаемого названия локации
function getLocationName(location) {
  const names = {
    classroom: 'Учебный класс',
    coworking: 'Коворкинг',
    cafe: 'Кафе nFactorial',
    lobby: 'Главное лобби'
  };
  return names[location] || location;
}

module.exports = router; 