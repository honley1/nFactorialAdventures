const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  telegramId: {
    type: Number,
    required: true,
    index: true
  },
  
  // Session Info
  sessionStart: {
    type: Date,
    default: Date.now
  },
  sessionEnd: Date,
  duration: Number, // in seconds
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Game State Snapshot
  gameState: {
    currentWeek: {
      type: Number,
      default: 1,
      min: 1,
      max: 10
    },
    dayOfWeek: {
      type: Number,
      default: 1,
      min: 1,
      max: 7
    },
    timeOfDay: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night'],
      default: 'morning'
    },
    
    // Current Resources
    resources: {
      coffee: { type: Number, default: 100 },
      motivation: { type: Number, default: 100 },
      knowledge: { type: Number, default: 0 },
      sleep: { type: Number, default: 100 }
    },
    
    // Player Position
    position: {
      x: { type: Number, default: 400 },
      y: { type: Number, default: 300 }
    },
    
    // Current Mission
    activeMission: {
      id: String,
      name: String,
      description: String,
      progress: { type: Number, default: 0 },
      target: Number,
      reward: {
        score: Number,
        resources: mongoose.Schema.Types.Mixed
      }
    }
  },
  
  // Session Statistics
  stats: {
    totalScore: { type: Number, default: 0 },
    actionsPerformed: { type: Number, default: 0 },
    
    // Interaction counts
    coffeeUsed: { type: Number, default: 0 },
    computerInteractions: { type: Number, default: 0 },
    mentorInteractions: { type: Number, default: 0 },
    
    // Movement
    distanceTraveled: { type: Number, default: 0 },
    totalMoves: { type: Number, default: 0 },
    
    // Achievements unlocked this session
    achievementsUnlocked: [String],
    
    // Mission progress
    missionsCompleted: { type: Number, default: 0 },
    missionsStarted: { type: Number, default: 0 }
  },
  
  // Events during session
  events: [{
    timestamp: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['action', 'resource_change', 'mission_start', 'mission_complete', 'achievement', 'level_up']
    },
    data: mongoose.Schema.Types.Mixed,
    score: { type: Number, default: 0 }
  }],
  
  // Performance metrics
  performance: {
    efficiency: Number, // Score per minute
    resourceManagement: Number, // How well resources are managed
    missionSuccessRate: Number, // Percentage of missions completed
    averageActionTime: Number // Average time between actions
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

// Indexes for better performance
gameSessionSchema.index({ telegramId: 1, isActive: 1 });
gameSessionSchema.index({ sessionStart: -1 });
gameSessionSchema.index({ 'stats.totalScore': -1 });

// Update the updatedAt field before saving
gameSessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate duration if session is ending
  if (this.sessionEnd && !this.duration) {
    this.duration = Math.floor((this.sessionEnd - this.sessionStart) / 1000);
  }
  
  next();
});

// Method to add event to session
gameSessionSchema.methods.addEvent = function(type, data, score = 0) {
  this.events.push({
    type,
    data,
    score,
    timestamp: new Date()
  });
  
  this.stats.totalScore += score;
  this.stats.actionsPerformed += 1;
  
  // Update specific stats based on event type
  if (type === 'action') {
    switch (data.action) {
      case 'use_coffee':
        this.stats.coffeeUsed += 1;
        break;
      case 'use_computer':
        this.stats.computerInteractions += 1;
        break;
      case 'talk_to_mentor':
        this.stats.mentorInteractions += 1;
        break;
    }
  }
  
  return this.save();
};

// Method to end session
gameSessionSchema.methods.endSession = function() {
  this.isActive = false;
  this.sessionEnd = new Date();
  this.duration = Math.floor((this.sessionEnd - this.sessionStart) / 1000);
  
  // Calculate performance metrics
  this.calculatePerformance();
  
  return this.save();
};

// Method to calculate performance metrics
gameSessionSchema.methods.calculatePerformance = function() {
  const durationMinutes = this.duration / 60;
  
  this.performance = {
    efficiency: durationMinutes > 0 ? this.stats.totalScore / durationMinutes : 0,
    resourceManagement: this.calculateResourceManagement(),
    missionSuccessRate: this.stats.missionsStarted > 0 ? 
      (this.stats.missionsCompleted / this.stats.missionsStarted) * 100 : 0,
    averageActionTime: this.stats.actionsPerformed > 0 ? 
      this.duration / this.stats.actionsPerformed : 0
  };
};

// Helper method to calculate resource management score
gameSessionSchema.methods.calculateResourceManagement = function() {
  const resourceEvents = this.events.filter(e => e.type === 'resource_change');
  if (resourceEvents.length === 0) return 100;
  
  // Calculate how well resources were maintained (never going to zero)
  let totalResourceHealth = 0;
  let resourceChecks = 0;
  
  resourceEvents.forEach(event => {
    if (event.data.resources) {
      const { coffee, motivation, knowledge, sleep } = event.data.resources;
      const avgResource = (coffee + motivation + sleep) / 3; // Exclude knowledge as it starts at 0
      totalResourceHealth += avgResource;
      resourceChecks += 1;
    }
  });
  
  return resourceChecks > 0 ? totalResourceHealth / resourceChecks : 100;
};

module.exports = mongoose.model('GameSession', gameSessionSchema); 