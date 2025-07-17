// Система ресурсов для nFactorial Adventures
const GameSession = require('../models/GameSession');

// Константы ресурсов
const RESOURCE_CONFIG = {
  coffee: {
    max: 100,
    min: 0,
    regenerationRate: 2, // в минуту
    regenerationInterval: 30000, // 30 секунд
    criticalThreshold: 20 // критический уровень
  },
  motivation: {
    max: 100,
    min: 0,
    regenerationRate: 1,
    regenerationInterval: 60000, // 1 минута
    criticalThreshold: 15
  },
  knowledge: {
    max: 100,
    min: 0,
    regenerationRate: 0.5,
    regenerationInterval: 120000, // 2 минуты
    criticalThreshold: 10
  },
  sleep: {
    max: 100,
    min: 0,
    regenerationRate: -3, // сон тратится со временем
    regenerationInterval: 45000, // 45 секунд
    criticalThreshold: 25
  }
};

// Стоимости действий
const ACTION_COSTS = {
  'move': { coffee: 1, sleep: 0.5 },
  'code': { coffee: 10, motivation: 5, sleep: 8 },
  'study': { coffee: 8, motivation: 3, sleep: 5 },
  'mentor_talk': { coffee: 5, sleep: 2 },
  'coffee_machine': { }, // восстанавливает coffee
  'rest': { }, // восстанавливает sleep
  'motivational_speech': { }, // восстанавливает motivation
  'complete_quest': { coffee: 15, motivation: 10, sleep: 10 }
};

// Награды за действия
const ACTION_REWARDS = {
  'code': { knowledge: 15, experience: 10 },
  'study': { knowledge: 20, experience: 5 },
  'mentor_talk': { motivation: 25, knowledge: 5, experience: 3 },
  'coffee_machine': { coffee: 40 },
  'rest': { sleep: 60 },
  'motivational_speech': { motivation: 50 },
  'complete_quest': { experience: 50, motivation: 20 }
};

class ResourceSystem {
  constructor() {
    this.activeRegenerationTimers = new Map();
    this.startGlobalRegeneration();
  }

  // Запуск глобальной регенерации ресурсов
  startGlobalRegeneration() {
    setInterval(async () => {
      try {
        await this.regenerateAllSessions();
      } catch (error) {
        console.error('❌ Resource regeneration error:', error);
      }
    }, 30000); // каждые 30 секунд
  }

  // Регенерация ресурсов для всех активных сессий
  async regenerateAllSessions() {
    try {
      const activeSessions = await GameSession.find({ 
        isActive: true,
        lastUpdated: { $gte: new Date(Date.now() - 3600000) } // активные за последний час
      });

      for (const session of activeSessions) {
        await this.regenerateResources(session._id);
      }
    } catch (error) {
      console.error('❌ Failed to regenerate resources:', error);
    }
  }

  // Регенерация ресурсов для конкретной сессии
  async regenerateResources(sessionId) {
    try {
      const session = await GameSession.findById(sessionId);
      if (!session) return;

      const now = Date.now();
      
      // Проверяем и исправляем lastUpdated если не существует или не является датой
      if (!session.lastUpdated || !(session.lastUpdated instanceof Date)) {
        session.lastUpdated = new Date(now - 60000); // Устанавливаем 1 минуту назад
        await session.save();
      }
      
      const timeDiff = now - session.lastUpdated.getTime();
      const minutesPassed = timeDiff / 60000;

      // Обновляем каждый ресурс
      const updatedResources = { ...session.resources };
      let hasChanges = false;

      for (const [resourceName, config] of Object.entries(RESOURCE_CONFIG)) {
        const currentValue = updatedResources[resourceName] || 0;
        const regenerationAmount = (config.regenerationRate * minutesPassed);
        let newValue = currentValue + regenerationAmount;

        // Ограничиваем значения
        newValue = Math.max(config.min, Math.min(config.max, newValue));
        
        if (Math.abs(newValue - currentValue) > 0.1) {
          updatedResources[resourceName] = Math.round(newValue * 10) / 10;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await GameSession.findByIdAndUpdate(sessionId, {
          resources: updatedResources,
          lastUpdated: new Date()
        });
      }

      return updatedResources;
    } catch (error) {
      console.error('❌ Failed to regenerate resources for session:', sessionId, error);
    }
  }

  // Проверка возможности выполнения действия
  canPerformAction(resources, actionType) {
    const costs = ACTION_COSTS[actionType];
    if (!costs) return { canPerform: true, message: 'Unknown action' };

    for (const [resourceName, cost] of Object.entries(costs)) {
      const currentValue = resources[resourceName] || 0;
      if (currentValue < cost) {
        return {
          canPerform: false,
          message: `Недостаточно ресурса: ${resourceName} (нужно: ${cost}, есть: ${currentValue})`,
          missingResource: resourceName,
          required: cost,
          current: currentValue
        };
      }
    }

    return { canPerform: true };
  }

  // Выполнение действия с тратой ресурсов
  async performAction(sessionId, actionType, multiplier = 1) {
    try {
      const session = await GameSession.findById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Сначала регенерируем ресурсы
      await this.regenerateResources(sessionId);
      const updatedSession = await GameSession.findById(sessionId);

      const resources = { ...updatedSession.resources };
      
      // Проверяем возможность действия
      const canPerform = this.canPerformAction(resources, actionType);
      if (!canPerform.canPerform) {
        return {
          success: false,
          message: canPerform.message,
          resources,
          details: canPerform
        };
      }

      // Тратим ресурсы
      const costs = ACTION_COSTS[actionType] || {};
      const rewards = ACTION_REWARDS[actionType] || {};

      for (const [resourceName, cost] of Object.entries(costs)) {
        resources[resourceName] = Math.max(0, resources[resourceName] - (cost * multiplier));
      }

      // Добавляем награды
      for (const [resourceName, reward] of Object.entries(rewards)) {
        if (RESOURCE_CONFIG[resourceName]) {
          const maxValue = RESOURCE_CONFIG[resourceName].max;
          resources[resourceName] = Math.min(maxValue, (resources[resourceName] || 0) + (reward * multiplier));
        } else {
          // Для других характеристик (experience, etc.)
          resources[resourceName] = (resources[resourceName] || 0) + (reward * multiplier);
        }
      }

      // Обновляем сессию
      const result = await GameSession.findByIdAndUpdate(sessionId, {
        resources,
        lastUpdated: new Date(),
        'stats.actionsPerformed': (updatedSession.stats?.actionsPerformed || 0) + 1
      }, { new: true });

      return {
        success: true,
        message: `Действие "${actionType}" выполнено успешно!`,
        resources: result.resources,
        rewards,
        costs
      };

    } catch (error) {
      console.error('❌ Failed to perform action:', error);
      return {
        success: false,
        message: 'Ошибка выполнения действия',
        error: error.message
      };
    }
  }

  // Получение статуса ресурсов
  getResourceStatus(resources) {
    const status = {};
    
    for (const [resourceName, config] of Object.entries(RESOURCE_CONFIG)) {
      const currentValue = resources[resourceName] || 0;
      const percentage = (currentValue / config.max) * 100;
      
      let level = 'normal';
      if (percentage <= config.criticalThreshold) {
        level = 'critical';
      } else if (percentage <= 40) {
        level = 'low';
      } else if (percentage >= 80) {
        level = 'high';
      }

      status[resourceName] = {
        value: currentValue,
        max: config.max,
        percentage: Math.round(percentage),
        level,
        regenerationRate: config.regenerationRate
      };
    }

    return status;
  }

  // Получение рекомендаций на основе ресурсов
  getRecommendations(resources) {
    const recommendations = [];
    const status = this.getResourceStatus(resources);

    for (const [resourceName, info] of Object.entries(status)) {
      if (info.level === 'critical') {
        switch (resourceName) {
          case 'coffee':
            recommendations.push({
              type: 'urgent',
              message: '☕ Критически низкий уровень кофе! Найдите кофе-машину',
              action: 'coffee_machine'
            });
            break;
          case 'sleep':
            recommendations.push({
              type: 'urgent',
              message: '😴 Вы очень устали! Нужно отдохнуть',
              action: 'rest'
            });
            break;
          case 'motivation':
            recommendations.push({
              type: 'urgent',
              message: '💪 Низкая мотивация! Поговорите с ментором',
              action: 'mentor_talk'
            });
            break;
        }
      }
    }

    return recommendations;
  }
}

// Экспорт синглтона
const resourceSystem = new ResourceSystem();

module.exports = {
  resourceSystem,
  RESOURCE_CONFIG,
  ACTION_COSTS,
  ACTION_REWARDS,
  ResourceSystem
}; 