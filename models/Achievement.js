const mongoose = require('mongoose');

// Схема достижения
const achievementSchema = new mongoose.Schema({
  // Основная информация
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  
  // Визуальное представление
  icon: {
    type: String,
    required: true // эмодзи или путь к картинке
  },
  
  // Условия разблокировки
  conditions: {
    type: {
      type: String,
      required: true,
      enum: [
        'resource_threshold',    // достичь уровня ресурса
        'quest_count',          // выполнить N квестов
        'time_played',          // играть N времени
        'interaction_count',    // N взаимодействий
        'week_reached',         // достичь недели
        'score_threshold',      // набрать очков
        'sequence',             // выполнить последовательность
        'social',               // социальные достижения
        'endurance',            // выносливость
        'special'               // особые условия
      ]
    },
    
    // Параметры условий
    parameters: {
      // Для resource_threshold
      resource: {
        type: String,
        enum: ['coffee', 'motivation', 'knowledge', 'sleep', 'any']
      },
      threshold: Number,
      
      // Для quest_count
      questCategory: String, // категория квестов
      questCount: Number,
      
      // Для time_played
      timeRequired: Number, // в минутах
      
      // Для interaction_count
      interactionType: String, // 'coffee_machine', 'npc_*', 'any'
      interactionCount: Number,
      
      // Для week_reached
      weekNumber: Number,
      
      // Для score_threshold
      scoreRequired: Number,
      scoreType: {
        type: String,
        enum: ['total', 'weekly', 'single_session'],
        default: 'total'
      },
      
      // Для sequence
      sequence: [{
        action: String,
        target: String,
        order: Number
      }],
      
      // Для social
      npcDialogues: Number,
      uniqueNpcs: Number,
      
      // Для endurance
      consecutiveDays: Number,
      resourceMaintained: String, // какой ресурс держать на уровне
      minimumLevel: Number,
      
      // Специальные условия
      custom: mongoose.Schema.Types.Mixed
    }
  },
  
  // Награды за достижение
  rewards: {
    experience: {
      type: Number,
      default: 0,
      min: 0
    },
    score: {
      type: Number,
      default: 0,
      min: 0
    },
    title: {
      type: String // титул игрока
    },
    badge: {
      type: String // специальный значок
    },
    resources: {
      coffee: { type: Number, default: 0 },
      motivation: { type: Number, default: 0 },
      knowledge: { type: Number, default: 0 },
      sleep: { type: Number, default: 0 }
    },
    unlocks: [{
      type: String // что разблокируется
    }]
  },
  
  // Метаданные достижения
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  
  category: {
    type: String,
    enum: ['learning', 'social', 'endurance', 'mastery', 'exploration', 'special'],
    required: true
  },
  
  // Теги
  tags: [{
    type: String
  }],
  
  // Секретное достижение (не показывается до разблокировки)
  isSecret: {
    type: Boolean,
    default: false
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Сообщения
  unlockMessage: {
    type: String,
    required: true
  },
  
  hintMessage: {
    type: String // подсказка для секретных достижений
  },
  
  // Статистика
  stats: {
    timesUnlocked: {
      type: Number,
      default: 0
    },
    firstUnlockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    firstUnlockedAt: Date,
    rarity_percentage: {
      type: Number,
      default: 0 // процент игроков разблокировавших
    }
  },
  
  // Приоритет отображения
  priority: {
    type: Number,
    default: 0
  },
  
  // Создание
  createdBy: {
    type: String,
    default: 'system'
  },
  
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  collection: 'achievements'
});

// Индексы
achievementSchema.index({ category: 1, rarity: 1 });
achievementSchema.index({ isActive: 1, priority: -1 });
achievementSchema.index({ 'conditions.type': 1 });
achievementSchema.index({ tags: 1 });

// Виртуальные поля
achievementSchema.virtual('rarityScore').get(function() {
  const rarityValues = {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 4,
    legendary: 5
  };
  return rarityValues[this.rarity] || 1;
});

achievementSchema.virtual('isVeryRare').get(function() {
  return this.stats.rarity_percentage < 5; // менее 5% игроков
});

// Методы модели
achievementSchema.methods.checkConditions = function(user, gameSession, actionData = null) {
  const condition = this.conditions;
  const params = condition.parameters;
  
  switch (condition.type) {
    case 'resource_threshold':
      if (params.resource === 'any') {
        return Object.values(gameSession.resources).some(value => value >= params.threshold);
      }
      return gameSession.resources[params.resource] >= params.threshold;
      
    case 'quest_count':
      let questCount = user.completedQuests.length;
      if (params.questCategory) {
        // Нужно проверить категорию квестов (требует доступ к Quest модели)
        questCount = user.completedQuests.filter(cq => {
          // Здесь должна быть логика проверки категории
          return true; // временная заглушка
        }).length;
      }
      return questCount >= params.questCount;
      
    case 'time_played':
      return user.stats.totalPlayTime >= params.timeRequired;
      
    case 'interaction_count':
      if (params.interactionType === 'any') {
        return user.stats.interactionsCount >= params.interactionCount;
      }
      
      // Проверяем специфичные взаимодействия
      if (params.interactionType === 'coffee_machine') {
        return user.stats.coffeeCupsConsumed >= params.interactionCount;
      }
      
      if (params.interactionType.startsWith('npc_')) {
        return user.stats.npcDialogues >= params.interactionCount;
      }
      
      return false;
      
    case 'week_reached':
      return user.currentWeek >= params.weekNumber;
      
    case 'score_threshold':
      switch (params.scoreType) {
        case 'total':
          return user.score.total >= params.scoreRequired;
        case 'weekly':
          return user.score.weekly >= params.scoreRequired;
        case 'single_session':
          // Проверяется во время сессии
          return actionData && actionData.sessionScore >= params.scoreRequired;
        default:
          return false;
      }
      
    case 'sequence':
      // Проверяем последовательность действий
      if (!actionData || !actionData.recentActions) return false;
      
      const sequence = params.sequence.sort((a, b) => a.order - b.order);
      const recentActions = actionData.recentActions.slice(-sequence.length);
      
      return sequence.every((step, index) => {
        const action = recentActions[index];
        return action && 
               action.type === step.action && 
               action.target === step.target;
      });
      
    case 'social':
      if (params.npcDialogues && user.stats.npcDialogues < params.npcDialogues) {
        return false;
      }
      
      if (params.uniqueNpcs) {
        // Подсчет уникальных NPC (требует анализ истории действий)
        const uniqueNpcs = new Set();
        gameSession.actions.forEach(action => {
          if (action.type === 'dialog' && action.target.startsWith('npc_')) {
            uniqueNpcs.add(action.target);
          }
        });
        return uniqueNpcs.size >= params.uniqueNpcs;
      }
      
      return true;
      
    case 'endurance':
      // Проверка выносливости (держать ресурс на уровне N дней подряд)
      if (params.consecutiveDays && params.resourceMaintained && params.minimumLevel) {
        // Это требует проверки истории ресурсов за несколько дней
        // Временная заглушка
        return gameSession.resources[params.resourceMaintained] >= params.minimumLevel;
      }
      return false;
      
    case 'special':
      // Особые условия, обрабатываются отдельно
      return this.checkSpecialConditions(user, gameSession, actionData);
      
    default:
      return false;
  }
};

achievementSchema.methods.checkSpecialConditions = function(user, gameSession, actionData) {
  const params = this.conditions.parameters.custom;
  
  // Примеры специальных условий
  switch (this.id) {
    case 'perfect_week':
      // Неделя без падения ресурсов ниже 50
      return gameSession.actions.filter(a => 
        a.type === 'resource_change' && 
        Object.values(a.resourcesAfter).every(val => val >= 50)
      ).length > 50; // примерный порог
      
    case 'night_owl':
      // Активность ночью
      return gameSession.gameTime.period === 'night' && actionData;
      
    case 'early_bird':
      // Активность утром
      return gameSession.gameTime.period === 'morning' && actionData;
      
    case 'coffee_addict':
      // Выпить кофе 10 раз за сессию
      const coffeeActions = gameSession.actions.filter(a => 
        a.type === 'interact' && a.target === 'coffee_machine'
      );
      return coffeeActions.length >= 10;
      
    default:
      return false;
  }
};

achievementSchema.methods.getProgress = function(user, gameSession) {
  const condition = this.conditions;
  const params = condition.parameters;
  
  let current = 0;
  let target = 1;
  
  switch (condition.type) {
    case 'resource_threshold':
      current = gameSession.resources[params.resource] || 0;
      target = params.threshold;
      break;
      
    case 'quest_count':
      current = user.completedQuests.length;
      target = params.questCount;
      break;
      
    case 'time_played':
      current = user.stats.totalPlayTime;
      target = params.timeRequired;
      break;
      
    case 'interaction_count':
      if (params.interactionType === 'coffee_machine') {
        current = user.stats.coffeeCupsConsumed;
      } else if (params.interactionType.startsWith('npc_')) {
        current = user.stats.npcDialogues;
      } else {
        current = user.stats.interactionsCount;
      }
      target = params.interactionCount;
      break;
      
    case 'week_reached':
      current = user.currentWeek;
      target = params.weekNumber;
      break;
      
    case 'score_threshold':
      current = user.score.total;
      target = params.scoreRequired;
      break;
      
    default:
      return { current: 0, target: 1, percentage: 0 };
  }
  
  const percentage = Math.min(100, (current / target) * 100);
  return { current, target, percentage };
};

achievementSchema.methods.applyRewards = function(user, gameSession) {
  const rewards = this.rewards;
  const results = [];
  
  // Опыт
  if (rewards.experience > 0) {
    const levelResult = user.addExperience(rewards.experience);
    results.push({ 
      type: 'experience', 
      amount: rewards.experience, 
      levelUp: levelResult.levelUp 
    });
  }
  
  // Очки
  if (rewards.score > 0) {
    user.addScore(rewards.score);
    results.push({ type: 'score', amount: rewards.score });
  }
  
  // Титул
  if (rewards.title) {
    user.titles.push({
      name: rewards.title,
      earnedAt: new Date(),
      isActive: true
    });
    results.push({ type: 'title', name: rewards.title });
  }
  
  // Значок
  if (rewards.badge) {
    results.push({ type: 'badge', badge: rewards.badge });
  }
  
  // Ресурсы
  const resourceChanges = {};
  Object.entries(rewards.resources).forEach(([resource, amount]) => {
    if (amount !== 0) {
      resourceChanges[resource] = amount;
    }
  });
  
  if (Object.keys(resourceChanges).length > 0) {
    gameSession.updateResources(resourceChanges);
    results.push({ type: 'resources', changes: resourceChanges });
  }
  
  // Разблокировки
  if (rewards.unlocks && rewards.unlocks.length > 0) {
    rewards.unlocks.forEach(unlockId => {
      results.push({ type: 'unlock', item: unlockId });
    });
  }
  
  return results;
};

// Статические методы
achievementSchema.statics.checkAllAchievements = function(user, gameSession, actionData) {
  return this.find({ isActive: true }).then(achievements => {
    const unlockedAchievements = [];
    
    achievements.forEach(achievement => {
      // Проверяем, не разблокировано ли уже
      const alreadyUnlocked = user.achievementsUnlocked.some(
        ua => ua.achievementId === achievement.id
      );
      
      if (!alreadyUnlocked && achievement.checkConditions(user, gameSession, actionData)) {
        unlockedAchievements.push(achievement);
      }
    });
    
    return unlockedAchievements;
  });
};

achievementSchema.statics.getByCategory = function(category, includeSecret = false) {
  const query = { category, isActive: true };
  if (!includeSecret) {
    query.isSecret = false;
  }
  
  return this.find(query).sort({ priority: -1, rarity: 1 });
};

achievementSchema.statics.getPlayerAchievements = function(user, includeProgress = false) {
  const unlockedIds = user.achievementsUnlocked.map(ua => ua.achievementId);
  
  return this.find({ isActive: true }).then(achievements => {
    const result = {
      unlocked: achievements.filter(a => unlockedIds.includes(a.id)),
      locked: achievements.filter(a => !unlockedIds.includes(a.id) && !a.isSecret)
    };
    
    if (includeProgress) {
      result.locked = result.locked.map(achievement => ({
        ...achievement.toObject(),
        progress: achievement.getProgress(user, gameSession)
      }));
    }
    
    return result;
  });
};

achievementSchema.statics.updateRarityStats = function() {
  // Обновляем статистику редкости всех достижений
  return this.find({ isActive: true }).then(achievements => {
    const User = mongoose.model('User');
    
    return User.countDocuments().then(totalUsers => {
      if (totalUsers === 0) return;
      
      const updates = achievements.map(achievement => {
        return User.countDocuments({
          'achievementsUnlocked.achievementId': achievement.id
        }).then(unlockedCount => {
          const percentage = (unlockedCount / totalUsers) * 100;
          
          return this.updateOne(
            { _id: achievement._id },
            { 'stats.rarity_percentage': percentage }
          );
        });
      });
      
      return Promise.all(updates);
    });
  });
};

// Middleware
achievementSchema.pre('save', function(next) {
  // Обновляем статистику при разблокировке
  if (this.isModified('stats.timesUnlocked')) {
    if (this.stats.timesUnlocked === 1) {
      this.stats.firstUnlockedAt = new Date();
    }
  }
  
  next();
});

const Achievement = mongoose.model('Achievement', achievementSchema);

module.exports = Achievement; 