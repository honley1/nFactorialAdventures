const mongoose = require('mongoose');

// Схема квеста
const questSchema = new mongoose.Schema({
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
  
  // Требования для активации квеста
  requirements: {
    week: {
      type: Number,
      default: 1,
      min: 1,
      max: 10
    },
    location: {
      type: String,
      enum: ['classroom', 'coworking', 'cafe', 'lobby', 'any']
    },
    previousQuests: [{
      type: String // ID предыдущих квестов
    }],
    minResources: {
      coffee: { type: Number, min: 0, max: 100 },
      motivation: { type: Number, min: 0, max: 100 },
      knowledge: { type: Number, min: 0, max: 100 },
      sleep: { type: Number, min: 0, max: 100 }
    },
    playerLevel: {
      type: Number,
      default: 1,
      min: 1,
      max: 10
    }
  },
  
  // Цель квеста
  objective: {
    type: {
      type: String,
      required: true,
      enum: [
        'interact',           // взаимодействие с объектом
        'dialog',            // разговор с NPC
        'reach_resources',   // достичь определенного уровня ресурсов
        'time_based',        // просто подождать время
        'visit_location',    // посетить локацию
        'collect',           // собрать предметы
        'sequence'           // выполнить последовательность действий
      ]
    },
    target: {
      type: String,
      required: true // 'coffee_machine', 'npc_alex', 'classroom', etc.
    },
    amount: {
      type: Number,
      default: 1,
      min: 1
    },
    timeLimit: {
      type: Number, // в минутах, 0 = без лимита
      default: 0
    },
    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
  // Награды за выполнение
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
    resources: {
      coffee: { type: Number, default: 0 },
      motivation: { type: Number, default: 0 },
      knowledge: { type: Number, default: 0 },
      sleep: { type: Number, default: 0 }
    },
    achievements: [{
      type: String // ID достижений которые разблокируются
    }],
    unlocks: [{
      type: String // что разблокируется (локации, NPC, фичи)
    }],
    title: {
      type: String // титул игрока
    }
  },
  
  // Диалоги NPC для этого квеста
  dialogues: [{
    npcId: {
      type: String,
      required: true
    },
    stage: {
      type: String,
      enum: ['start', 'progress', 'complete', 'reward'],
      default: 'start'
    },
    text: {
      type: String,
      required: true
    },
    options: [{
      text: String,
      action: String, // 'accept', 'decline', 'continue', 'custom'
      nextDialogId: String
    }],
    conditions: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  
  // Метаданные квеста
  difficulty: {
    type: String,
    enum: ['tutorial', 'easy', 'medium', 'hard', 'epic'],
    default: 'easy'
  },
  
  category: {
    type: String,
    enum: ['tutorial', 'coding', 'social', 'learning', 'resource', 'exploration', 'achievement'],
    required: true
  },
  
  // Теги для поиска и фильтрации
  tags: [{
    type: String
  }],
  
  // Статус квеста
  isActive: {
    type: Boolean,
    default: true
  },
  
  isRepeatable: {
    type: Boolean,
    default: false
  },
  
  // Приоритет отображения
  priority: {
    type: Number,
    default: 0
  },
  
  // Статистика
  stats: {
    timesStarted: {
      type: Number,
      default: 0
    },
    timesCompleted: {
      type: Number,
      default: 0
    },
    averageCompletionTime: {
      type: Number,
      default: 0 // в минутах
    },
    successRate: {
      type: Number,
      default: 0 // процент
    }
  },
  
  // Создание и обновление
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
  collection: 'quests'
});

// Индексы
questSchema.index({ category: 1, difficulty: 1 });
questSchema.index({ 'requirements.week': 1 });
questSchema.index({ isActive: 1, priority: -1 });
questSchema.index({ tags: 1 });

// Виртуальные поля
questSchema.virtual('estimatedDuration').get(function() {
  const baseDuration = {
    tutorial: 5,
    easy: 10,
    medium: 20,
    hard: 45,
    epic: 90
  };
  return baseDuration[this.difficulty] || 10;
});

questSchema.virtual('completionRate').get(function() {
  if (this.stats.timesStarted === 0) return 0;
  return (this.stats.timesCompleted / this.stats.timesStarted) * 100;
});

// Методы модели
questSchema.methods.checkRequirements = function(gameSession, user) {
  const req = this.requirements;
  
  // Проверка недели
  if (user.currentWeek < req.week) {
    return { valid: false, reason: `Доступно с ${req.week} недели` };
  }
  
  // Проверка уровня
  if (user.level < req.playerLevel) {
    return { valid: false, reason: `Требуется ${req.playerLevel} уровень` };
  }
  
  // Проверка локации
  if (req.location && req.location !== 'any' && gameSession.currentLocation !== req.location) {
    return { valid: false, reason: `Нужно быть в локации: ${req.location}` };
  }
  
  // Проверка предыдущих квестов
  if (req.previousQuests && req.previousQuests.length > 0) {
    const completedQuests = user.completedQuests.map(q => q.questId);
    const missingQuests = req.previousQuests.filter(questId => 
      !completedQuests.includes(questId)
    );
    
    if (missingQuests.length > 0) {
      return { valid: false, reason: `Сначала выполни: ${missingQuests.join(', ')}` };
    }
  }
  
  // Проверка ресурсов
  if (req.minResources) {
    for (const [resource, minValue] of Object.entries(req.minResources)) {
      if (gameSession.resources[resource] < minValue) {
        return { 
          valid: false, 
          reason: `Недостаточно ${resource}: нужно ${minValue}, есть ${gameSession.resources[resource]}` 
        };
      }
    }
  }
  
  return { valid: true };
};

questSchema.methods.getDialogueForStage = function(npcId, stage) {
  return this.dialogues.find(d => d.npcId === npcId && d.stage === stage);
};

questSchema.methods.checkProgress = function(gameSession, action) {
  const objective = this.objective;
  
  switch (objective.type) {
    case 'interact':
      if (action.type === 'interact' && action.target === objective.target) {
        return action.metadata.count >= objective.amount;
      }
      break;
      
    case 'dialog':
      if (action.type === 'dialog' && action.target === objective.target) {
        return action.metadata.dialogueCompleted === true;
      }
      break;
      
    case 'reach_resources':
      const targetResource = objective.target;
      const targetAmount = objective.amount;
      return gameSession.resources[targetResource] >= targetAmount;
      
    case 'visit_location':
      return gameSession.currentLocation === objective.target;
      
    case 'time_based':
      // Проверяем время с начала квеста
      const quest = gameSession.activeQuests.find(q => q.questId === this.id);
      if (quest) {
        const timeElapsed = (Date.now() - quest.startedAt) / (1000 * 60); // в минутах
        return timeElapsed >= objective.amount;
      }
      break;
  }
  
  return false;
};

questSchema.methods.calculateProgress = function(gameSession, action) {
  const objective = this.objective;
  
  switch (objective.type) {
    case 'interact':
      if (action.type === 'interact' && action.target === objective.target) {
        const current = action.metadata.count || 1;
        return Math.min(100, (current / objective.amount) * 100);
      }
      break;
      
    case 'reach_resources':
      const targetResource = objective.target;
      const targetAmount = objective.amount;
      const currentAmount = gameSession.resources[targetResource];
      return Math.min(100, (currentAmount / targetAmount) * 100);
      
    case 'time_based':
      const quest = gameSession.activeQuests.find(q => q.questId === this.id);
      if (quest) {
        const timeElapsed = (Date.now() - quest.startedAt) / (1000 * 60);
        return Math.min(100, (timeElapsed / objective.amount) * 100);
      }
      break;
      
    default:
      return 0;
  }
  
  return 0;
};

questSchema.methods.applyRewards = function(user, gameSession) {
  const rewards = this.rewards;
  const results = [];
  
  // Опыт
  if (rewards.experience > 0) {
    const levelResult = user.addExperience(rewards.experience);
    results.push({ type: 'experience', amount: rewards.experience, levelUp: levelResult.levelUp });
  }
  
  // Очки
  if (rewards.score > 0) {
    user.addScore(rewards.score);
    results.push({ type: 'score', amount: rewards.score });
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
  
  // Достижения
  if (rewards.achievements && rewards.achievements.length > 0) {
    rewards.achievements.forEach(achievementId => {
      if (user.unlockAchievement(achievementId)) {
        results.push({ type: 'achievement', achievementId });
      }
    });
  }
  
  // Разблокировки
  if (rewards.unlocks && rewards.unlocks.length > 0) {
    rewards.unlocks.forEach(unlockId => {
      // Добавляем в разблокированный контент
      if (unlockId.startsWith('location_')) {
        const location = unlockId.replace('location_', '');
        if (!gameSession.unlockedContent.locations.includes(location)) {
          gameSession.unlockedContent.locations.push(location);
          results.push({ type: 'unlock', category: 'location', item: location });
        }
      }
      // Аналогично для NPC и фич
    });
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
  
  return results;
};

// Статические методы
questSchema.statics.getAvailableQuests = function(user, gameSession) {
  return this.find({ isActive: true })
    .sort({ priority: -1, 'requirements.week': 1 })
    .then(quests => {
      return quests.filter(quest => {
        // Проверяем, не выполнен ли уже квест
        const isCompleted = user.completedQuests.some(cq => cq.questId === quest.id);
        if (isCompleted && !quest.isRepeatable) return false;
        
        // Проверяем, не активен ли уже квест
        const isActive = gameSession.activeQuests.some(aq => aq.questId === quest.id && !aq.isCompleted);
        if (isActive) return false;
        
        // Проверяем требования
        const reqCheck = quest.checkRequirements(gameSession, user);
        return reqCheck.valid;
      });
    });
};

questSchema.statics.getQuestsByCategory = function(category, week = null) {
  const query = { category, isActive: true };
  if (week) {
    query['requirements.week'] = { $lte: week };
  }
  
  return this.find(query).sort({ priority: -1, difficulty: 1 });
};

questSchema.statics.getQuestChain = function(questId) {
  // Находим все квесты в цепочке
  return this.findOne({ id: questId }).then(quest => {
    if (!quest) return [];
    
    const chain = [quest];
    
    // Ищем квесты, которые требуют этот квест
    return this.find({ 'requirements.previousQuests': questId })
      .then(nextQuests => {
        return chain.concat(nextQuests);
      });
  });
};

// Middleware
questSchema.pre('save', function(next) {
  // Обновляем статистику успешности
  if (this.stats.timesStarted > 0) {
    this.stats.successRate = (this.stats.timesCompleted / this.stats.timesStarted) * 100;
  }
  
  next();
});

const Quest = mongoose.model('Quest', questSchema);

module.exports = Quest; 