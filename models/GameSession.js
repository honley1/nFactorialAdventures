const mongoose = require('mongoose');

// Схема игровой сессии - текущее состояние игры
const gameSessionSchema = new mongoose.Schema({
  // Ссылка на пользователя
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // Игровые ресурсы (0-100)
  resources: {
    coffee: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    motivation: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    knowledge: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    sleep: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    }
  },
  
  // Текущее местоположение и состояние
  currentLocation: {
    type: String,
    default: 'classroom',
    enum: ['classroom', 'coworking', 'cafe', 'lobby'],
    required: true
  },
  
  currentWeek: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  
  // Прогресс дня (0-100%)
  dayProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Внутриигровое время
  gameTime: {
    hour: {
      type: Number,
      default: 9, // начинаем с 9 утра
      min: 0,
      max: 23
    },
    day: {
      type: Number,
      default: 1, // день недели в буткемпе
      min: 1,
      max: 7
    },
    period: {
      type: String,
      default: 'morning',
      enum: ['morning', 'afternoon', 'evening', 'night']
    }
  },
  
  // Активные квесты
  activeQuests: [{
    questId: {
      type: String,
      required: true
    },
    progress: {
      type: Number,
      default: 0,
      min: 0
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    isCompleted: {
      type: Boolean,
      default: false
    }
  }],
  
  // История игровых действий (последние 100)
  actions: [{
    type: {
      type: String,
      required: true,
      enum: ['interact', 'move', 'dialog', 'quest_start', 'quest_complete', 'resource_change']
    },
    target: {
      type: String,
      required: true // 'coffee_machine', 'npc_alex', 'classroom', etc.
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    resourcesBefore: {
      coffee: Number,
      motivation: Number,
      knowledge: Number,
      sleep: Number
    },
    resourcesAfter: {
      coffee: Number,
      motivation: Number,
      knowledge: Number,
      sleep: Number
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  
  // Состояние разблокированного контента
  unlockedContent: {
    locations: [{
      type: String,
      enum: ['classroom', 'coworking', 'cafe', 'lobby']
    }],
    npcs: [{
      type: String
    }],
    features: [{
      type: String
    }]
  },
  
  // Достижения в процессе выполнения
  achievementProgress: [{
    achievementId: String,
    currentValue: {
      type: Number,
      default: 0
    },
    targetValue: Number,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Временные состояния и буффы
  temporaryEffects: [{
    type: {
      type: String,
      enum: ['motivation_boost', 'coffee_buzz', 'tired', 'focused', 'inspired']
    },
    value: Number, // сила эффекта
    expiresAt: Date,
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Настройки автосохранения
  autoSave: {
    enabled: {
      type: Boolean,
      default: true
    },
    interval: {
      type: Number,
      default: 30 // секунды
    },
    lastSaved: {
      type: Date,
      default: Date.now
    }
  },
  
  // Метки времени
  lastResourceUpdate: {
    type: Date,
    default: Date.now
  },
  
  sessionStarted: {
    type: Date,
    default: Date.now
  },
  
  totalSessionTime: {
    type: Number,
    default: 0 // в секундах
  },
  
  // Время последнего обновления ресурсов
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'game_sessions'
});

// Индексы
gameSessionSchema.index({ currentWeek: 1, currentLocation: 1 });
gameSessionSchema.index({ 'activeQuests.questId': 1 });
gameSessionSchema.index({ lastResourceUpdate: 1 });

// Виртуальные поля
gameSessionSchema.virtual('resourcesTotal').get(function() {
  return this.resources.coffee + this.resources.motivation + 
         this.resources.knowledge + this.resources.sleep;
});

gameSessionSchema.virtual('timeOfDay').get(function() {
  const hour = this.gameTime.hour;
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
});

gameSessionSchema.virtual('efficiencyMultiplier').get(function() {
  const timeEffects = {
    morning: 1.2,
    afternoon: 1.0,
    evening: 0.8,
    night: 0.5
  };
  return timeEffects[this.timeOfDay] || 1.0;
});

// Методы модели
gameSessionSchema.methods.updateResources = function(changes) {
  const originalResources = { ...this.resources };
  
  Object.keys(changes).forEach(resource => {
    if (this.resources[resource] !== undefined) {
      this.resources[resource] = Math.max(0, Math.min(100, 
        this.resources[resource] + changes[resource]
      ));
    }
  });
  
  // Записываем действие в историю
  this.addAction('resource_change', 'manual_update', originalResources, this.resources, {
    changes
  });
  
  return this.resources;
};

gameSessionSchema.methods.moveToLocation = function(location) {
  const previousLocation = this.currentLocation;
  this.currentLocation = location;
  
  // Небольшой расход энергии за перемещение
  this.updateResources({ sleep: -2 });
  
  this.addAction('move', location, null, null, {
    from: previousLocation,
    to: location
  });
  
  return true;
};

gameSessionSchema.methods.addAction = function(type, target, resourcesBefore, resourcesAfter, metadata = {}) {
  const action = {
    type,
    target,
    timestamp: new Date(),
    resourcesBefore: resourcesBefore || { ...this.resources },
    resourcesAfter: resourcesAfter || { ...this.resources },
    metadata
  };
  
  this.actions.unshift(action); // добавляем в начало
  
  // Ограничиваем историю 100 записями
  if (this.actions.length > 100) {
    this.actions = this.actions.slice(0, 100);
  }
};

gameSessionSchema.methods.startQuest = function(questId, parameters = {}) {
  // Проверяем, нет ли уже такого квеста
  const existingQuest = this.activeQuests.find(q => q.questId === questId);
  if (existingQuest) {
    return false;
  }
  
  this.activeQuests.push({
    questId,
    progress: 0,
    startedAt: new Date(),
    parameters,
    isCompleted: false
  });
  
  this.addAction('quest_start', questId);
  return true;
};

gameSessionSchema.methods.updateQuestProgress = function(questId, progress) {
  const quest = this.activeQuests.find(q => q.questId === questId && !q.isCompleted);
  if (quest) {
    quest.progress = Math.max(quest.progress, progress);
    return quest;
  }
  return null;
};

gameSessionSchema.methods.completeQuest = function(questId) {
  const quest = this.activeQuests.find(q => q.questId === questId);
  if (quest) {
    quest.isCompleted = true;
    quest.completedAt = new Date();
    this.addAction('quest_complete', questId);
    return quest;
  }
  return null;
};

// Автоматический расчет изменений ресурсов
gameSessionSchema.methods.calculateResourceDecay = function() {
  const now = new Date();
  const timeDiff = now - this.lastResourceUpdate;
  const minutesElapsed = timeDiff / (1000 * 60);
  
  if (minutesElapsed < 1) return; // обновляем раз в минуту минимум
  
  // Конфигурация автоматического расхода (за минуту)
  const decay = {
    coffee: 0.4,      // -0.4 за минуту
    motivation: 0.2,  // -0.2 за минуту  
    knowledge: 0,     // не уменьшается
    sleep: 0.3        // -0.3 за минуту
  };
  
  const changes = {};
  Object.keys(decay).forEach(resource => {
    const amount = -Math.floor(decay[resource] * minutesElapsed);
    if (amount !== 0) {
      changes[resource] = amount;
    }
  });
  
  if (Object.keys(changes).length > 0) {
    this.updateResources(changes);
  }
  
  this.lastResourceUpdate = now;
};

gameSessionSchema.methods.advanceTime = function(hours = 1) {
  this.gameTime.hour = (this.gameTime.hour + hours) % 24;
  
  // Если прошел полный день
  if (this.gameTime.hour < hours) {
    this.gameTime.day = (this.gameTime.day % 7) + 1;
    this.dayProgress = 0;
  }
  
  // Обновляем период дня
  this.gameTime.period = this.timeOfDay;
};

// Статические методы
gameSessionSchema.statics.createForUser = function(userId) {
  return this.create({
    userId,
    unlockedContent: {
      locations: ['classroom', 'cafe'], // начальные локации
      npcs: ['mentor_alex'],
      features: ['basic_interactions']
    }
  });
};

// Middleware
gameSessionSchema.pre('save', function(next) {
  // Автоматически рассчитываем расход ресурсов
  this.calculateResourceDecay();
  
  // Обновляем время сессии
  if (this.sessionStarted) {
    const now = new Date();
    const sessionDuration = (now - this.sessionStarted) / 1000;
    this.totalSessionTime += sessionDuration;
    this.sessionStarted = now;
  }
  
  // Обновляем lastUpdated
  this.lastUpdated = new Date();
  
  // Очищаем истекшие временные эффекты
  const now = new Date();
  this.temporaryEffects = this.temporaryEffects.filter(effect => 
    effect.expiresAt > now
  );
  
  next();
});

const GameSession = mongoose.model('GameSession', gameSessionSchema);

module.exports = GameSession; 