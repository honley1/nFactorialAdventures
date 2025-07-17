const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  // Achievement Info
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 200
  },
  icon: {
    type: String,
    default: '🏆'
  },
  
  // Achievement Type
  category: {
    type: String,
    enum: [
      'first_steps',      // Первые шаги
      'learning',         // Обучение
      'projects',         // Проекты
      'social',           // Социальные
      'dedication',       // Преданность
      'special',          // Специальные
      'easter_eggs'       // Пасхалки
    ],
    required: true
  },
  
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  
  // Unlock Conditions
  requirements: {
    // Resource thresholds
    minScore: { type: Number, default: 0 },
    minLevel: { type: Number, default: 0 },
    minKnowledge: { type: Number, default: 0 },
    
    // Activity requirements
    projectsCompleted: { type: Number, default: 0 },
    mentorInteractions: { type: Number, default: 0 },
    coffeeConsumed: { type: Number, default: 0 },
    daysActive: { type: Number, default: 0 },
    
    // Special conditions
    specialConditions: [String], // Custom achievement logic
    timeLimit: Number, // Complete within X hours/days
    
    // Combo requirements
    comboActions: [{
      action: String,
      count: Number,
      timeWindow: Number // within X minutes
    }]
  },
  
  // Rewards
  rewards: {
    score: { type: Number, default: 0 },
    title: String, // Unlocked title
    badge: String, // Badge icon/name
    unlocks: [String], // Features, areas, or content
    motivation: { type: Number, default: 0 },
    specialReward: String // Description of special reward
  },
  
  // Progress tracking
  isSecret: {
    type: Boolean,
    default: false // Hidden until unlocked
  },
  
  // Users who unlocked this achievement
  unlockedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    telegramId: Number,
    unlockedAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    context: mongoose.Schema.Types.Mixed // Additional unlock context
  }],
  
  // Statistics
  stats: {
    totalUnlocks: { type: Number, default: 0 },
    unlockRate: { type: Number, default: 0 }, // Percentage of players who unlocked
    averageTimeToUnlock: { type: Number, default: 0 }, // Average hours to unlock
    firstUnlockedAt: Date,
    lastUnlockedAt: Date
  },
  
  // Meta
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
achievementSchema.index({ category: 1, rarity: 1 });
achievementSchema.index({ 'unlockedBy.userId': 1 });
achievementSchema.index({ 'unlockedBy.telegramId': 1 });
achievementSchema.index({ isActive: 1, sortOrder: 1 });

// Update stats before saving
achievementSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  this.updateStats();
  next();
});

// Method to update statistics
achievementSchema.methods.updateStats = function() {
  this.stats.totalUnlocks = this.unlockedBy.length;
  
  if (this.unlockedBy.length > 0) {
    // Find first and last unlock dates
    const unlockDates = this.unlockedBy.map(u => u.unlockedAt).sort();
    this.stats.firstUnlockedAt = unlockDates[0];
    this.stats.lastUnlockedAt = unlockDates[unlockDates.length - 1];
  }
};

// Method to check if user can unlock achievement
achievementSchema.methods.canUnlock = function(user, additionalData = {}) {
  const req = this.requirements;
  
  // Check basic requirements
  if (user.totalScore < req.minScore) return false;
  if (user.level < req.minLevel) return false;
  if (user.knowledge < req.minKnowledge) return false;
  if (user.projectsCompleted < req.projectsCompleted) return false;
  if (user.mentorInteractions < req.mentorInteractions) return false;
  if (user.coffeeConsumed < req.coffeeConsumed) return false;
  
  // Check if already unlocked
  const alreadyUnlocked = this.unlockedBy.some(u => u.telegramId === user.telegramId);
  if (alreadyUnlocked) return false;
  
  // Check special conditions
  if (req.specialConditions && req.specialConditions.length > 0) {
    return this.checkSpecialConditions(user, additionalData);
  }
  
  return true;
};

// Method to unlock achievement for user
achievementSchema.methods.unlockForUser = function(user, context = {}) {
  // Check if already unlocked
  const existing = this.unlockedBy.find(u => u.telegramId === user.telegramId);
  if (existing) return existing;
  
  const unlock = {
    userId: user._id,
    telegramId: user.telegramId,
    unlockedAt: new Date(),
    progress: 100,
    context
  };
  
  this.unlockedBy.push(unlock);
  
  // Update user's achievements
  if (!user.achievements.some(a => a.name === this.name)) {
    user.achievements.push({
      name: this.name,
      unlockedAt: new Date(),
      description: this.description
    });
  }
  
  return unlock;
};

// Method to check special conditions
achievementSchema.methods.checkSpecialConditions = function(user, data) {
  if (!this.requirements.specialConditions) return true;
  
  for (const condition of this.requirements.specialConditions) {
    switch (condition) {
      case 'first_day_completion':
        // Check if user completed first day without going to zero resources
        return data.firstDayCompleted && data.resourcesNeverZero;
        
      case 'night_owl':
        // Active between 11 PM and 5 AM
        const hour = new Date().getHours();
        return hour >= 23 || hour <= 5;
        
      case 'early_bird':
        // Active between 6 AM and 8 AM
        const morningHour = new Date().getHours();
        return morningHour >= 6 && morningHour <= 8;
        
      case 'weekend_warrior':
        // Active on weekends
        const day = new Date().getDay();
        return day === 0 || day === 6;
        
      case 'perfect_week':
        // Complete week without any failed projects
        return data.perfectWeek === true;
        
      case 'social_butterfly':
        // Interact with mentor 5 times in one session
        return data.mentorInteractionsInSession >= 5;
        
      case 'coffee_addict':
        // Consume 10 coffees in one hour
        return data.coffeeInLastHour >= 10;
        
      case 'knowledge_seeker':
        // Reach 100 knowledge without using mentor
        return user.knowledge >= 100 && data.noMentorUsed;
        
      default:
        return true;
    }
  }
  
  return true;
};

// Static method to create default nFactorial achievements
achievementSchema.statics.createDefaultAchievements = async function() {
  const defaultAchievements = [
    // First Steps
    {
      name: 'first_login',
      title: 'Добро пожаловать в nFactorial! 👋',
      description: 'Войти в игру в первый раз',
      icon: '🎯',
      category: 'first_steps',
      rarity: 'common',
      requirements: { minScore: 0 },
      rewards: { score: 50, motivation: 10 }
    },
    {
      name: 'first_coffee',
      title: 'Первый глоток ☕',
      description: 'Выпить первую чашку кофе',
      icon: '☕',
      category: 'first_steps',
      rarity: 'common',
      requirements: { coffeeConsumed: 1 },
      rewards: { score: 25 }
    },
    {
      name: 'first_mentor_talk',
      title: 'Знакомство с ментором 👨‍🏫',
      description: 'Поговорить с ментором в первый раз',
      icon: '🤝',
      category: 'first_steps',
      rarity: 'common',
      requirements: { mentorInteractions: 1 },
      rewards: { score: 75, motivation: 15 }
    },
    
    // Learning
    {
      name: 'knowledge_100',
      title: 'Знания - сила! 🧠',
      description: 'Достичь 100 знаний',
      icon: '🧠',
      category: 'learning',
      rarity: 'rare',
      requirements: { minKnowledge: 100 },
      rewards: { score: 200, title: 'Эрудит' }
    },
    {
      name: 'level_5',
      title: 'Середина пути 🎖️',
      description: 'Достичь 5 уровня',
      icon: '🎖️',
      category: 'learning',
      rarity: 'rare',
      requirements: { minLevel: 5 },
      rewards: { score: 500, unlocks: ['advanced_features'] }
    },
    
    // Projects
    {
      name: 'first_project',
      title: 'Первый проект 🚀',
      description: 'Завершить первый проект',
      icon: '🚀',
      category: 'projects',
      rarity: 'common',
      requirements: { projectsCompleted: 1 },
      rewards: { score: 100, motivation: 20 }
    },
    {
      name: 'project_master',
      title: 'Мастер проектов 🏆',
      description: 'Завершить 10 проектов',
      icon: '🏆',
      category: 'projects',
      rarity: 'epic',
      requirements: { projectsCompleted: 10 },
      rewards: { score: 1000, title: 'Проектный мастер', badge: 'master' }
    },
    
    // Social
    {
      name: 'mentor_friend',
      title: 'Друг ментора 👥',
      description: 'Поговорить с ментором 50 раз',
      icon: '👥',
      category: 'social',
      rarity: 'rare',
      requirements: { mentorInteractions: 50 },
      rewards: { score: 300, title: 'Любимчик ментора' }
    },
    
    // Dedication
    {
      name: 'coffee_addict',
      title: 'Кофеман ☕️',
      description: 'Выпить 100 чашек кофе',
      icon: '☕️',
      category: 'dedication',
      rarity: 'epic',
      requirements: { coffeeConsumed: 100 },
      rewards: { score: 500, title: 'Кофейный наркоман', specialReward: 'Unlimited coffee for a day' }
    },
    {
      name: 'night_owl',
      title: 'Сова 🦉',
      description: 'Играть ночью (23:00-05:00)',
      icon: '🦉',
      category: 'dedication',
      rarity: 'rare',
      requirements: { specialConditions: ['night_owl'] },
      rewards: { score: 200, title: 'Ночная сова' }
    },
    
    // Special
    {
      name: 'perfect_week',
      title: 'Идеальная неделя ⭐',
      description: 'Пройти неделю без провалов',
      icon: '⭐',
      category: 'special',
      rarity: 'legendary',
      requirements: { specialConditions: ['perfect_week'] },
      rewards: { score: 2000, title: 'Перфекционист', badge: 'perfect' }
    },
    {
      name: 'nfactorial_legend',
      title: 'Легенда nFactorial 👑',
      description: 'Достичь максимального уровня',
      icon: '👑',
      category: 'special',
      rarity: 'legendary',
      requirements: { minLevel: 10, minScore: 10000 },
      rewards: { score: 5000, title: 'Легенда nFactorial', badge: 'legend' }
    },
    
    // Easter Eggs
    {
      name: 'konami_code',
      title: 'Старая школа 🕹️',
      description: 'Ввести код Konami',
      icon: '🕹️',
      category: 'easter_eggs',
      rarity: 'rare',
      requirements: { specialConditions: ['konami_code'] },
      rewards: { score: 300, specialReward: 'Secret game mode unlocked' },
      isSecret: true
    }
  ];
  
  for (const achievementData of defaultAchievements) {
    const existing = await this.findOne({ name: achievementData.name });
    if (!existing) {
      await this.create(achievementData);
    }
  }
};

// Static method to check and unlock achievements for user
achievementSchema.statics.checkAndUnlockForUser = async function(user, additionalData = {}) {
  const achievements = await this.find({ isActive: true });
  const unlockedAchievements = [];
  
  for (const achievement of achievements) {
    if (achievement.canUnlock(user, additionalData)) {
      const unlock = achievement.unlockForUser(user, additionalData);
      await achievement.save();
      unlockedAchievements.push({
        achievement,
        unlock
      });
    }
  }
  
  return unlockedAchievements;
};

module.exports = mongoose.model('Achievement', achievementSchema); 