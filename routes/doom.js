const express = require('express');
const router = express.Router();
const User = require('../models/User');
const DoomSession = require('../models/DoomSession');

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

// POST /api/doom/init - Инициализация DOOM сессии
router.post('/init', requireAuth, async (req, res) => {
  try {
    let doomSession = await DoomSession.findOne({ userId: req.user._id });
    
    if (!doomSession) {
      doomSession = await DoomSession.createForUser(req.user._id);
      console.log(`🎮 New DOOM session created for ${req.user.username}`);
    } else {
      doomSession.stats.sessionsPlayed += 1;
      doomSession.sessionStarted = new Date();
      await doomSession.save();
      console.log(`🎮 DOOM session restored for ${req.user.username}`);
    }
    
    res.json({
      success: true,
      session: {
        id: doomSession._id,
        level: doomSession.level,
        currentWeek: doomSession.currentWeek,
        player: doomSession.player,
        resources: doomSession.resources,
        enemiesKilled: doomSession.enemiesKilled,
        itemsCollected: doomSession.itemsCollected,
        stats: doomSession.stats,
        currentLevel: {
          mapData: JSON.parse(doomSession.currentLevel.mapData),
          enemies: doomSession.currentLevel.enemyPositions.filter(e => e.isAlive),
          items: doomSession.currentLevel.itemPositions.filter(i => !i.collected),
          npcs: doomSession.currentLevel.npcStates
        },
        achievements: doomSession.achievements,
        settings: doomSession.settings
      }
    });
    
  } catch (error) {
    console.error('❌ DOOM init error:', error);
    res.status(500).json({
      error: 'Failed to initialize DOOM session',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/doom/sync - Синхронизация состояния игрока
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const { player, sessionTime } = req.body;
    
    if (!player) {
      return res.status(400).json({ error: 'Player data required' });
    }
    
    const doomSession = await DoomSession.findOne({ userId: req.user._id });
    if (!doomSession) {
      return res.status(404).json({ error: 'DOOM session not found' });
    }
    
    // Синхронизируем данные игрока
    doomSession.syncPlayerStats(player);
    
    // Добавляем время игры
    if (sessionTime) {
      doomSession.addPlayTime(sessionTime);
    }
    
    await doomSession.save();
    
    res.json({
      success: true,
      player: doomSession.player,
      resources: doomSession.resources,
      stats: doomSession.stats
    });
    
  } catch (error) {
    console.error('❌ DOOM sync error:', error);
    res.status(500).json({
      error: 'Failed to sync player data',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/doom/enemy-killed - Уничтожение врага
router.post('/enemy-killed', requireAuth, async (req, res) => {
  try {
    const { enemyId, enemyType, playerStats, shotsFired } = req.body;
    
    if (!enemyId || !enemyType) {
      return res.status(400).json({ error: 'Enemy ID and type required' });
    }
    
    const doomSession = await DoomSession.findOne({ userId: req.user._id });
    if (!doomSession) {
      return res.status(404).json({ error: 'DOOM session not found' });
    }
    
    // Записываем убийство врага
    doomSession.killEnemy(enemyType);
    
    // Записываем выстрелы
    if (shotsFired) {
      doomSession.recordShot(true); // попадание
    }
    
    // Обновляем статы игрока если переданы
    if (playerStats) {
      doomSession.syncPlayerStats(playerStats);
    }
    
    // Проверяем достижения
    const newAchievements = checkCombatAchievements(doomSession);
    
    await doomSession.save();
    
    // Обновляем опыт и очки пользователя
    const expGain = getEnemyExperience(enemyType);
    const scoreGain = Math.floor(expGain / 2); // Очки = половина от опыта
    
    req.user.experience += expGain;
    req.user.addScore(scoreGain);
    
    // Проверяем повышение уровня
    const levelUp = checkLevelUp(req.user);
    if (levelUp) {
      req.user.level += 1;
      doomSession.level = req.user.level;
    }
    
    await req.user.save();
    if (levelUp) await doomSession.save();
    
    console.log(`⚔️ ${req.user.username} killed ${enemyType} (${enemyId})`);
    
    res.json({
      success: true,
      enemiesKilled: doomSession.enemiesKilled,
      experience: req.user.experience,
      score: req.user.score,
      levelUp,
      newLevel: req.user.level,
      expGain,
      scoreGain,
      newAchievements,
      stats: doomSession.stats
    });
    
  } catch (error) {
    console.error('❌ Enemy killed error:', error);
    res.status(500).json({
      error: 'Failed to record enemy kill',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/doom/item-collected - Сбор предмета
router.post('/item-collected', requireAuth, async (req, res) => {
  try {
    const { itemId, itemType, value, playerStats } = req.body;
    
    if (!itemId || !itemType) {
      return res.status(400).json({ error: 'Item ID and type required' });
    }
    
    const doomSession = await DoomSession.findOne({ userId: req.user._id });
    if (!doomSession) {
      return res.status(404).json({ error: 'DOOM session not found' });
    }
    
    // Записываем сбор предмета
    doomSession.collectItem(itemType, value || 1);
    
    // Обновляем статы игрока если переданы
    if (playerStats) {
      doomSession.syncPlayerStats(playerStats);
    }
    
    // Проверяем достижения
    const newAchievements = checkCollectionAchievements(doomSession);
    
    await doomSession.save();
    
    console.log(`📦 ${req.user.username} collected ${itemType} (${itemId})`);
    
    res.json({
      success: true,
      itemsCollected: doomSession.itemsCollected,
      player: doomSession.player,
      resources: doomSession.resources,
      newAchievements
    });
    
  } catch (error) {
    console.error('❌ Item collected error:', error);
    res.status(500).json({
      error: 'Failed to record item collection',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/doom/npc-dialogue - Диалог с NPC
router.post('/npc-dialogue', requireAuth, async (req, res) => {
  try {
    const { npcId, dialogueStage, completed } = req.body;
    
    if (!npcId || dialogueStage === undefined) {
      return res.status(400).json({ error: 'NPC ID and dialogue stage required' });
    }
    
    const doomSession = await DoomSession.findOne({ userId: req.user._id });
    if (!doomSession) {
      return res.status(404).json({ error: 'DOOM session not found' });
    }
    
    // Обновляем диалог с NPC
    doomSession.updateNPCDialogue(npcId, dialogueStage);
    
    // Если диалог завершен, даем награды
    let levelUp = false;
    let expGain = 0;
    if (completed) {
      const rewards = getNPCRewards(npcId);
      if (rewards.experience) {
        expGain = rewards.experience;
        req.user.experience += expGain;
        
        // Проверяем повышение уровня
        levelUp = checkLevelUp(req.user);
        if (levelUp) {
          req.user.level += 1;
          doomSession.level = req.user.level; // Синхронизируем уровень
        }
      }
      if (rewards.resources) {
        Object.keys(rewards.resources).forEach(resource => {
          if (doomSession.resources[resource] !== undefined) {
            doomSession.resources[resource] += rewards.resources[resource];
          }
        });
      }
    }
    
    // Проверяем достижения диалогов
    const newAchievements = checkDialogueAchievements(doomSession);
    
    await doomSession.save();
    await req.user.save();
    
    console.log(`💬 ${req.user.username} talked to ${npcId} (stage ${dialogueStage})`);
    
    res.json({
      success: true,
      npcInteractions: doomSession.npcInteractions,
      resources: doomSession.resources,
      experience: req.user.experience,
      expGain,
      levelUp,
      newLevel: req.user.level,
      newAchievements
    });
    
  } catch (error) {
    console.error('❌ NPC dialogue error:', error);
    res.status(500).json({
      error: 'Failed to record NPC dialogue',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/doom/death - Смерть игрока
router.post('/death', requireAuth, async (req, res) => {
  try {
    const { cause, enemyType } = req.body;
    
    const doomSession = await DoomSession.findOne({ userId: req.user._id });
    if (!doomSession) {
      return res.status(404).json({ error: 'DOOM session not found' });
    }
    
    // Записываем смерть
    doomSession.recordDeath();
    
    // Сбрасываем статы игрока
    doomSession.player.health = 100;
    doomSession.player.armor = 100;
    doomSession.player.ammo = 50;
    doomSession.player.x = 2;
    doomSession.player.y = 2;
    
    await doomSession.save();
    
    console.log(`💀 ${req.user.username} died (cause: ${cause})`);
    
    res.json({
      success: true,
      deathsCount: doomSession.stats.deathsCount,
      player: doomSession.player,
      message: `Вы погибли от ${cause}. Возрождение...`
    });
    
  } catch (error) {
    console.error('❌ Death record error:', error);
    res.status(500).json({
      error: 'Failed to record death',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/doom/level-complete - Завершение уровня
router.post('/level-complete', requireAuth, async (req, res) => {
  try {
    const { week, score, enemiesKilled, itemsCollected, timeSpent } = req.body;
    
    if (!week || score === undefined) {
      return res.status(400).json({ error: 'Week and score required' });
    }
    
    const doomSession = await DoomSession.findOne({ userId: req.user._id });
    if (!doomSession) {
      return res.status(404).json({ error: 'DOOM session not found' });
    }
    
    // Записываем завершение уровня
    doomSession.completeLevel(week, score, enemiesKilled, itemsCollected, timeSpent);
    
    // Даем очки в общую систему рейтинга
    req.user.addScore(score);
    
    // Даем большой опыт за завершение уровня
    const levelExp = score * 10;
    req.user.experience += levelExp;
    
    // Проверяем повышение уровня
    const levelUp = checkLevelUp(req.user);
    if (levelUp) {
      req.user.level += 1;
      doomSession.level = req.user.level;
    }
    
    // Проверяем достижения
    const newAchievements = checkLevelAchievements(doomSession, week, score);
    
    await doomSession.save();
    await req.user.save();
    
    console.log(`🏆 ${req.user.username} completed Week ${week} with score ${score}`);
    
    res.json({
      success: true,
      levelsCompleted: doomSession.levelsCompleted,
      currentWeek: doomSession.currentWeek,
      experience: req.user.experience,
      levelUp,
      newLevel: req.user.level,
      expGain: levelExp,
      newAchievements,
      nextLevelUnlocked: week + 1 <= 10
    });
    
  } catch (error) {
    console.error('❌ Level complete error:', error);
    res.status(500).json({
      error: 'Failed to record level completion',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/doom/leaderboard - Таблица лидеров DOOM
router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'score', limit = 10 } = req.query;
    
    let sortField = 'stats.bestWeekScore';
    if (type === 'kills') sortField = 'enemiesKilled.bug';
    if (type === 'survival') sortField = 'stats.survivalStreak';
    if (type === 'playtime') sortField = 'stats.totalPlayTime';
    
    const leaderboard = await DoomSession.find()
      .populate('userId', 'username avatar level')
      .sort({ [sortField]: -1 })
      .limit(parseInt(limit));
    
    const formattedLeaderboard = leaderboard.map((session, index) => ({
      rank: index + 1,
      username: session.userId.username,
      avatar: session.userId.avatar,
      level: session.userId.level,
      score: session.stats.bestWeekScore,
      enemiesKilled: Object.values(session.enemiesKilled).reduce((a, b) => a + b, 0),
      survivalStreak: session.stats.survivalStreak,
      playtime: Math.floor(session.stats.totalPlayTime / 60), // в минутах
      achievements: session.achievements.length
    }));
    
    res.json({
      success: true,
      leaderboard: formattedLeaderboard,
      type
    });
    
  } catch (error) {
    console.error('❌ DOOM leaderboard error:', error);
    res.status(500).json({
      error: 'Failed to get leaderboard',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// === HELPER FUNCTIONS ===

function getEnemyExperience(enemyType) {
  const expTable = {
    bug: 10,
    deadline: 25,
    complexTask: 50,
    imposter: 75,
    interview: 100
  };
  return expTable[enemyType] || 10;
}

function checkLevelUp(user) {
  const requiredExp = user.level * 100; // Простая формула: уровень * 100
  // Проверяем, что уровень не превышает максимальный (50)
  return user.experience >= requiredExp && user.level < 50;
}

function getNPCRewards(npcId) {
  const rewards = {
    mentor_alex: {
      experience: 50,
      resources: { motivation: 20, knowledge: 15 }
    },
    student_helper: {
      experience: 25,
      resources: { coffee: 30 }
    }
  };
  return rewards[npcId] || { experience: 10 };
}

function checkCombatAchievements(session) {
  const achievements = [];
  const totalKills = Object.values(session.enemiesKilled).reduce((a, b) => a + b, 0);
  
  if (totalKills >= 10 && !session.achievements.find(a => a.id === 'first_hunter')) {
    achievements.push({
      id: 'first_hunter',
      name: 'Первый охотник',
      category: 'combat',
      unlockedAt: new Date()
    });
    session.achievements.push(achievements[achievements.length - 1]);
  }
  
  if (session.enemiesKilled.bug >= 5 && !session.achievements.find(a => a.id === 'bug_destroyer')) {
    achievements.push({
      id: 'bug_destroyer',
      name: 'Уничтожитель багов',
      category: 'combat',
      unlockedAt: new Date()
    });
    session.achievements.push(achievements[achievements.length - 1]);
  }
  
  return achievements;
}

function checkCollectionAchievements(session) {
  const achievements = [];
  const totalItems = Object.values(session.itemsCollected).reduce((a, b) => a + b, 0);
  
  if (totalItems >= 5 && !session.achievements.find(a => a.id === 'collector')) {
    achievements.push({
      id: 'collector',
      name: 'Коллекционер',
      category: 'exploration',
      unlockedAt: new Date()
    });
    session.achievements.push(achievements[achievements.length - 1]);
  }
  
  return achievements;
}

function checkDialogueAchievements(session) {
  const achievements = [];
  
  if (session.npcInteractions.length >= 2 && !session.achievements.find(a => a.id === 'social')) {
    achievements.push({
      id: 'social',
      name: 'Социальный',
      category: 'dialogue',
      unlockedAt: new Date()
    });
    session.achievements.push(achievements[achievements.length - 1]);
  }
  
  return achievements;
}

function checkLevelAchievements(session, week, score) {
  const achievements = [];
  
  if (week === 1 && !session.achievements.find(a => a.id === 'first_week')) {
    achievements.push({
      id: 'first_week',
      name: 'Первая неделя',
      category: 'survival',
      unlockedAt: new Date()
    });
    session.achievements.push(achievements[achievements.length - 1]);
  }
  
  if (score >= 1000 && !session.achievements.find(a => a.id === 'high_scorer')) {
    achievements.push({
      id: 'high_scorer',
      name: 'Мастер результата',
      category: 'survival',
      unlockedAt: new Date()
    });
    session.achievements.push(achievements[achievements.length - 1]);
  }
  
  return achievements;
}

module.exports = router; 