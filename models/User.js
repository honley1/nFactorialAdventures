const mongoose = require('mongoose');

// Схема пользователя игры nFactorial Adventures
const userSchema = new mongoose.Schema({
  // Telegram данные
  telegramId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  avatar: {
    type: String,
    required: true,
    enum: ['student1', 'student2', 'student3', 'mentor1', 'mentor2', 'doomguy', 'doom_marine', 'cyber_student', 'code_warrior', 'debug_knight']
  },
  
  // Игровой прогресс
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 50
  },
  experience: {
    type: Number,
    default: 0,
    min: 0
  },
  currentWeek: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  
  // Игровая статистика
  stats: {
    totalPlayTime: {
      type: Number,
      default: 0 // в минутах
    },
    questsCompleted: {
      type: Number,
      default: 0
    },
    interactionsCount: {
      type: Number,
      default: 0
    },
    npcDialogues: {
      type: Number,
      default: 0
    },
    coffeeCupsConsumed: {
      type: Number,
      default: 0
    },
    codingSessionsCompleted: {
      type: Number,
      default: 0
    }
  },
  
  // Разблокированные достижения
  achievementsUnlocked: [{
    achievementId: String,
    unlockedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Завершенные квесты
  completedQuests: [{
    questId: String,
    completedAt: {
      type: Date,
      default: Date.now
    },
    reward: {
      experience: Number,
      resources: mongoose.Schema.Types.Mixed
    }
  }],
  
  // Настройки игрока
  settings: {
    soundEnabled: {
      type: Boolean,
      default: true
    },
    notifications: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      default: 'dark',
      enum: ['light', 'dark', 'auto']
    },
    language: {
      type: String,
      default: 'ru',
      enum: ['ru', 'en', 'kz']
    }
  },
  
  // Система титулов и рангов
  titles: [{
    name: String,
    earnedAt: Date,
    isActive: Boolean
  }],
  
  // Рейтинг и очки
  score: {
    total: {
      type: Number,
      default: 0
    },
    weekly: {
      type: Number,
      default: 0
    },
    lastWeeklyReset: {
      type: Date,
      default: Date.now
    }
  },
  
  // Метки времени
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastPlayed: {
    type: Date,
    default: Date.now
  },
  lastWeekUpdate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // автоматические createdAt и updatedAt
  collection: 'users'
});

// Индексы для производительности
userSchema.index({ 'score.total': -1 }); // для лидерборда
userSchema.index({ currentWeek: 1 }); // для прогрессии
userSchema.index({ lastPlayed: -1 }); // для активности

// Виртуальные поля
userSchema.virtual('isNewPlayer').get(function() {
  return this.currentWeek === 1 && this.experience < 100;
});

userSchema.virtual('completionPercentage').get(function() {
  return Math.min(100, (this.currentWeek / 10) * 100);
});

// Методы модели
userSchema.methods.addExperience = function(amount) {
  this.experience += amount;
  
  // Проверка повышения уровня
  const requiredExp = this.level * 100; // 100 опыта на уровень (синхронизировано с DOOM)
  if (this.experience >= requiredExp && this.level < 10) {
    this.level += 1;
    return { levelUp: true, newLevel: this.level };
  }
  
  return { levelUp: false };
};

userSchema.methods.addScore = function(points) {
  this.score.total += points;
  this.score.weekly += points;
};

userSchema.methods.unlockAchievement = function(achievementId) {
  const alreadyUnlocked = this.achievementsUnlocked.some(
    achievement => achievement.achievementId === achievementId
  );
  
  if (!alreadyUnlocked) {
    this.achievementsUnlocked.push({
      achievementId,
      unlockedAt: new Date()
    });
    return true;
  }
  
  return false;
};

userSchema.methods.completeQuest = function(questId, reward) {
  this.completedQuests.push({
    questId,
    completedAt: new Date(),
    reward
  });
  
  this.stats.questsCompleted += 1;
  
  if (reward.experience) {
    return this.addExperience(reward.experience);
  }
  
  return { levelUp: false };
};

// Статические методы
userSchema.statics.getLeaderboard = function(limit = 10) {
  return this.find({})
    .sort({ 'score.total': -1 })
    .limit(limit)
    .select('username avatar score.total currentWeek level')
    .lean();
};

userSchema.statics.getWeeklyLeaderboard = function(limit = 10) {
  return this.find({})
    .sort({ 'score.weekly': -1 })
    .limit(limit)
    .select('username avatar score.weekly currentWeek level')
    .lean();
};

// Middleware перед сохранением
userSchema.pre('save', function(next) {
  // Обновляем lastPlayed при каждом сохранении
  this.lastPlayed = new Date();
  
  // Сброс еженедельных очков (каждые 7 дней)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  if (this.score.lastWeeklyReset < weekAgo) {
    this.score.weekly = 0;
    this.score.lastWeeklyReset = new Date();
  }
  
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User; 