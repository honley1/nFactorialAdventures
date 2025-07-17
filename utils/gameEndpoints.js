// Дополнительные игровые endpoints для nFactorial Adventures
const express = require('express');
const { resourceSystem } = require('./resourceSystem');
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const Quest = require('../models/Quest');
const Achievement = require('../models/Achievement');

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

// GET /api/game/resources/:sessionId - Получить статус ресурсов
const getResourceStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await GameSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Обновляем ресурсы
    await resourceSystem.regenerateResources(sessionId);
    const updatedSession = await GameSession.findById(sessionId);

    const resourceStatus = resourceSystem.getResourceStatus(updatedSession.resources);
    const recommendations = resourceSystem.getRecommendations(updatedSession.resources);

    res.json({
      success: true,
      resources: updatedSession.resources,
      status: resourceStatus,
      recommendations,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get resource status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get resource status',
      message: error.message
    });
  }
};

// POST /api/game/action - Выполнить игровое действие
const performAction = async (req, res) => {
  try {
    const { telegramId, sessionId, actionType, location, multiplier = 1 } = req.body;
    
    if (!telegramId || !sessionId || !actionType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: telegramId, sessionId, actionType'
      });
    }

    // Проверяем существование пользователя
    const user = await User.findOne({ telegramId: telegramId.toString() });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Выполняем действие через систему ресурсов
    const result = await resourceSystem.performAction(sessionId, actionType, multiplier);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Обновляем позицию если это движение
    if (actionType === 'move' && location) {
      await GameSession.findByIdAndUpdate(sessionId, {
        'player.location': location
      });
    }

    // Проверяем и обновляем квесты
    const questUpdates = await checkQuestProgress(user, sessionId, actionType);

    // Проверяем достижения
    const achievementUpdates = await checkAchievements(user, sessionId, actionType);

    res.json({
      success: true,
      message: result.message,
      resources: result.resources,
      rewards: result.rewards,
      costs: result.costs,
      questUpdates,
      achievementUpdates,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Perform action error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform action',
      message: error.message
    });
  }
};

// POST /api/game/interact - Взаимодействие с объектами
const interactWithObject = async (req, res) => {
  try {
    const { telegramId, sessionId, objectType, objectId } = req.body;

    if (!telegramId || !sessionId || !objectType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: telegramId, sessionId, objectType'
      });
    }

    // Определяем действие на основе типа объекта
    let actionType;
    switch (objectType) {
      case 'coffee_machine':
        actionType = 'coffee_machine';
        break;
      case 'computer':
        actionType = 'code';
        break;
      case 'mentor':
        actionType = 'mentor_talk';
        break;
      case 'bed':
      case 'rest_zone':
        actionType = 'rest';
        break;
      case 'motivational_poster':
        actionType = 'motivational_speech';
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Unknown object type: ' + objectType
        });
    }

    // Выполняем действие
    const result = await resourceSystem.performAction(sessionId, actionType);

    // Добавляем специфичную для объекта информацию
    let interactionMessage = result.message;
    if (objectType === 'coffee_machine') {
      interactionMessage = '☕ Вы купили кофе и восстановили энергию!';
    } else if (objectType === 'mentor') {
      interactionMessage = '👨‍🏫 Ментор дал вам ценный совет и поднял мотивацию!';
    } else if (objectType === 'computer') {
      interactionMessage = '💻 Вы написали код и получили знания!';
    }

    res.json({
      ...result,
      message: interactionMessage,
      objectType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Interact with object error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to interact with object',
      message: error.message
    });
  }
};

// GET /api/game/time - Получить игровое время
const getGameTime = async (req, res) => {
  try {
    const now = new Date();
    const hour = now.getHours();
    
    // Определяем время суток
    let timeOfDay;
    if (hour >= 6 && hour < 12) {
      timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 18) {
      timeOfDay = 'afternoon';
    } else if (hour >= 18 && hour < 22) {
      timeOfDay = 'evening';
    } else {
      timeOfDay = 'night';
    }

    // Модификаторы эффективности
    const efficiencyModifiers = {
      morning: { coffee: 1.2, motivation: 1.1, knowledge: 1.0, sleep: 0.9 },
      afternoon: { coffee: 1.0, motivation: 1.0, knowledge: 1.2, sleep: 0.8 },
      evening: { coffee: 0.8, motivation: 1.1, knowledge: 0.9, sleep: 0.7 },
      night: { coffee: 0.6, motivation: 0.8, knowledge: 0.7, sleep: 0.5 }
    };

    res.json({
      success: true,
      currentTime: now.toISOString(),
      hour,
      timeOfDay,
      efficiencyModifiers: efficiencyModifiers[timeOfDay],
      dayPhase: {
        name: getTimeOfDayName(timeOfDay),
        icon: getTimeOfDayIcon(timeOfDay),
        description: getTimeOfDayDescription(timeOfDay)
      }
    });

  } catch (error) {
    console.error('❌ Get game time error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game time',
      message: error.message
    });
  }
};

// POST /api/game/week/advance - Переход на следующую неделю
const advanceWeek = async (req, res) => {
  try {
    const { telegramId, sessionId } = req.body;

    if (!telegramId || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: telegramId, sessionId'
      });
    }

    const session = await GameSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Проверяем можно ли перейти на следующую неделю
    if (session.currentWeek >= 10) {
      return res.status(400).json({
        success: false,
        error: 'Already at maximum week (10)'
      });
    }

    // Требования для перехода на следующую неделю
    const weekRequirements = {
      minKnowledge: session.currentWeek * 50,
      minTotalScore: session.currentWeek * 100,
      completedQuests: Math.min(session.currentWeek * 2, 10)
    };

    const currentKnowledge = session.resources.knowledge || 0;
    const currentScore = session.stats.totalScore || 0;
    const completedQuests = session.completedQuests.length;

    if (currentKnowledge < weekRequirements.minKnowledge) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient knowledge',
        required: weekRequirements.minKnowledge,
        current: currentKnowledge
      });
    }

    if (currentScore < weekRequirements.minTotalScore) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient total score',
        required: weekRequirements.minTotalScore,
        current: currentScore
      });
    }

    if (completedQuests < weekRequirements.completedQuests) {
      return res.status(400).json({
        success: false,
        error: 'Not enough completed quests',
        required: weekRequirements.completedQuests,
        current: completedQuests
      });
    }

    // Переходим на следующую неделю
    const newWeek = session.currentWeek + 1;
    const weekBonus = newWeek * 50;

    await GameSession.findByIdAndUpdate(sessionId, {
      currentWeek: newWeek,
      'stats.totalScore': currentScore + weekBonus,
      'resources.motivation': Math.min(100, (session.resources.motivation || 0) + 30),
      lastUpdated: new Date()
    });

    res.json({
      success: true,
      message: `Поздравляем! Вы перешли на неделю ${newWeek}!`,
      newWeek,
      weekBonus,
      unlockedContent: getUnlockedContent(newWeek),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Advance week error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to advance week',
      message: error.message
    });
  }
};

// Вспомогательные функции
async function checkQuestProgress(user, sessionId, actionType) {
  // TODO: Реализовать проверку прогресса квестов
  return [];
}

async function checkAchievements(user, sessionId, actionType) {
  // TODO: Реализовать проверку достижений
  return [];
}

function getTimeOfDayName(timeOfDay) {
  const names = {
    morning: 'Утро',
    afternoon: 'День',
    evening: 'Вечер',
    night: 'Ночь'
  };
  return names[timeOfDay] || timeOfDay;
}

function getTimeOfDayIcon(timeOfDay) {
  const icons = {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌇',
    night: '🌙'
  };
  return icons[timeOfDay] || '🕐';
}

function getTimeOfDayDescription(timeOfDay) {
  const descriptions = {
    morning: 'Отличное время для кофе и продуктивной работы!',
    afternoon: 'Пик дня - время для обучения и новых знаний!',
    evening: 'Время подведения итогов и мотивации!',
    night: 'Поздно, нужно отдохнуть для восстановления сил!'
  };
  return descriptions[timeOfDay] || '';
}

function getUnlockedContent(week) {
  const content = {
    2: ['Новые квесты по React', 'Доступ к продвинутым заданиям'],
    3: ['Git и командная работа', 'Первые проекты'],
    4: ['Backend разработка', 'API интеграция'],
    5: ['Базы данных', 'MongoDB практика'],
    6: ['Тестирование', 'Unit тесты'],
    7: ['Развертывание', 'Docker контейнеры'],
    8: ['Оптимизация', 'Performance туning'],
    9: ['Продвинутые темы', 'Архитектура'],
    10: ['Финальный проект', 'Презентация']
  };
  return content[week] || [];
}

module.exports = {
  requireAuth,
  getResourceStatus,
  performAction,
  interactWithObject,
  getGameTime,
  advanceWeek
}; 