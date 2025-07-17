const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: {
    type: Number,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  firstName: String,
  lastName: String,
  avatar: {
    type: String,
    default: 'student1',
    enum: ['student1', 'student2', 'student3', 'mentor1', 'mentor2']
  },
  
  // Game Stats
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  totalScore: {
    type: Number,
    default: 0,
    min: 0
  },
  weeksPassed: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  
  // Resources
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
  },
  
  // Progress
  projectsCompleted: {
    type: Number,
    default: 0
  },
  interviewsPassed: {
    type: Number,
    default: 0
  },
  mentorInteractions: {
    type: Number,
    default: 0
  },
  coffeeConsumed: {
    type: Number,
    default: 0
  },
  
  // Achievements
  achievements: [{
    name: String,
    unlockedAt: Date,
    description: String
  }],
  
  // Game State
  currentPosition: {
    x: {
      type: Number,
      default: 400
    },
    y: {
      type: Number,
      default: 300
    }
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  
  // Meta
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.firstName && this.lastName ? 
    `${this.firstName} ${this.lastName}` : 
    this.username;
});

// Method to calculate player rank
userSchema.methods.calculateRank = function() {
  const ranks = [
    { min: 0, title: 'Новичок 🌱', color: '#90EE90' },
    { min: 100, title: 'Студент 📚', color: '#87CEEB' },
    { min: 500, title: 'Кодер 💻', color: '#DDA0DD' },
    { min: 1000, title: 'Разработчик 🚀', color: '#FFB6C1' },
    { min: 2000, title: 'Тимлид 👑', color: '#FFD700' },
    { min: 5000, title: 'Архитектор 🏗️', color: '#FF6347' },
    { min: 10000, title: 'CTO 🔥', color: '#FF1493' }
  ];
  
  for (let i = ranks.length - 1; i >= 0; i--) {
    if (this.totalScore >= ranks[i].min) {
      return ranks[i];
    }
  }
  return ranks[0];
};

// Method to check if user can level up
userSchema.methods.canLevelUp = function() {
  const requiredScore = this.level * 1000;
  return this.totalScore >= requiredScore && this.level < 10;
};

module.exports = mongoose.model('User', userSchema); 