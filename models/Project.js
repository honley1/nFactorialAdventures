const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  // Project Info
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['homework', 'weekly_project', 'hackathon', 'diploma', 'personal'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'expert'],
    default: 'medium'
  },
  
  // Project Requirements
  requiredSkills: [{
    skill: {
      type: String,
      enum: ['javascript', 'react', 'nodejs', 'database', 'html_css', 'python', 'algorithms', 'design']
    },
    level: {
      type: Number,
      min: 1,
      max: 5
    }
  }],
  
  estimatedTime: {
    type: Number, // in hours
    min: 1,
    max: 168 // 1 week
  },
  deadline: Date,
  
  // Resources needed to complete
  resourceCost: {
    coffee: { type: Number, default: 0 },
    motivation: { type: Number, default: 0 },
    knowledge: { type: Number, default: 0 },
    sleep: { type: Number, default: 0 }
  },
  
  // Rewards
  rewards: {
    score: { type: Number, default: 0 },
    knowledge: { type: Number, default: 0 },
    experience: { type: Number, default: 0 },
    unlocks: [String] // New features, areas, or achievements
  },
  
  // Project Status for users
  submissions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    telegramId: Number,
    
    // Submission details
    startedAt: {
      type: Date,
      default: Date.now
    },
    submittedAt: Date,
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'submitted', 'reviewed', 'completed', 'failed'],
      default: 'not_started'
    },
    
    // Progress tracking
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    // Code/Demo links (for realism)
    links: {
      github: String,
      demo: String,
      presentation: String
    },
    
    // Evaluation
    grade: {
      type: Number,
      min: 0,
      max: 100
    },
    feedback: String,
    reviewedBy: String, // Mentor name
    reviewedAt: Date,
    
    // Resources spent
    resourcesUsed: {
      coffee: { type: Number, default: 0 },
      motivation: { type: Number, default: 0 },
      knowledge: { type: Number, default: 0 },
      sleep: { type: Number, default: 0 }
    },
    
    // Time tracking
    timeSpent: { type: Number, default: 0 }, // in minutes
    sessionsCount: { type: Number, default: 0 },
    
    // Achievements earned from this project
    achievementsEarned: [String]
  }],
  
  // Project Templates (nFactorial themed)
  templates: {
    'e-commerce': {
      name: 'Интернет-магазин "nFactorial Store"',
      description: 'Создайте полноценный интернет-магазин с корзиной и оплатой',
      skills: ['react', 'nodejs', 'database'],
      estimatedHours: 40
    },
    'todo-app': {
      name: 'To-Do приложение "Студенческий планер"',
      description: 'Планировщик задач для студентов bootcamp',
      skills: ['javascript', 'html_css'],
      estimatedHours: 8
    },
    'chat-app': {
      name: 'Чат "nFactorial Community"',
      description: 'Реалтайм чат для общения студентов',
      skills: ['react', 'nodejs', 'websockets'],
      estimatedHours: 30
    },
    'portfolio': {
      name: 'Портфолио разработчика',
      description: 'Создайте свое профессиональное портфолио',
      skills: ['html_css', 'javascript', 'design'],
      estimatedHours: 20
    },
    'api-project': {
      name: 'RESTful API "Система управления курсами"',
      description: 'Backend для управления курсами nFactorial',
      skills: ['nodejs', 'database', 'algorithms'],
      estimatedHours: 35
    }
  },
  
  // Analytics
  analytics: {
    totalSubmissions: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    averageGrade: { type: Number, default: 0 },
    averageTimeSpent: { type: Number, default: 0 },
    popularityScore: { type: Number, default: 0 }
  },
  
  // Meta
  createdBy: String, // Mentor who created the project
  isActive: {
    type: Boolean,
    default: true
  },
  week: {
    type: Number,
    min: 1,
    max: 10
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
projectSchema.index({ type: 1, difficulty: 1 });
projectSchema.index({ week: 1, isActive: 1 });
projectSchema.index({ 'submissions.userId': 1, 'submissions.status': 1 });

// Update analytics before saving
projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  this.updateAnalytics();
  next();
});

// Method to update analytics
projectSchema.methods.updateAnalytics = function() {
  const submissions = this.submissions.filter(s => s.status !== 'not_started');
  
  this.analytics.totalSubmissions = submissions.length;
  
  if (submissions.length > 0) {
    const completed = submissions.filter(s => s.status === 'completed');
    this.analytics.completionRate = (completed.length / submissions.length) * 100;
    
    const graded = submissions.filter(s => s.grade !== undefined);
    if (graded.length > 0) {
      this.analytics.averageGrade = graded.reduce((sum, s) => sum + s.grade, 0) / graded.length;
    }
    
    const timeSpent = submissions.filter(s => s.timeSpent > 0);
    if (timeSpent.length > 0) {
      this.analytics.averageTimeSpent = timeSpent.reduce((sum, s) => sum + s.timeSpent, 0) / timeSpent.length;
    }
    
    // Popularity based on completion rate and submissions
    this.analytics.popularityScore = this.analytics.completionRate * Math.log(submissions.length + 1);
  }
};

// Method to start project for user
projectSchema.methods.startForUser = function(userId, telegramId) {
  const existingSubmission = this.submissions.find(s => s.telegramId === telegramId);
  
  if (existingSubmission) {
    if (existingSubmission.status === 'not_started') {
      existingSubmission.status = 'in_progress';
      existingSubmission.startedAt = new Date();
    }
    return existingSubmission;
  }
  
  const newSubmission = {
    userId,
    telegramId,
    status: 'in_progress',
    startedAt: new Date(),
    progress: 0
  };
  
  this.submissions.push(newSubmission);
  return newSubmission;
};

// Method to update project progress
projectSchema.methods.updateProgress = function(telegramId, progress, resourcesUsed = {}) {
  const submission = this.submissions.find(s => s.telegramId === telegramId);
  
  if (submission) {
    submission.progress = Math.min(100, Math.max(0, progress));
    
    // Update resources used
    Object.keys(resourcesUsed).forEach(resource => {
      if (submission.resourcesUsed[resource] !== undefined) {
        submission.resourcesUsed[resource] += resourcesUsed[resource];
      }
    });
    
    // Auto-submit when 100% complete
    if (submission.progress >= 100 && submission.status === 'in_progress') {
      submission.status = 'submitted';
      submission.submittedAt = new Date();
    }
  }
  
  return submission;
};

// Static method to get projects for week
projectSchema.statics.getProjectsForWeek = function(week) {
  return this.find({ week, isActive: true }).sort({ difficulty: 1, createdAt: 1 });
};

// Static method to create default nFactorial projects
projectSchema.statics.createDefaultProjects = async function() {
  const defaultProjects = [
    {
      name: "Личная страница студента",
      description: "Создайте свою первую веб-страницу с информацией о себе",
      type: "homework",
      difficulty: "easy",
      week: 1,
      requiredSkills: [{ skill: "html_css", level: 1 }],
      estimatedTime: 4,
      resourceCost: { knowledge: 10, motivation: 15 },
      rewards: { score: 100, knowledge: 20, experience: 50 }
    },
    {
      name: "Калькулятор nFactorial",
      description: "Интерактивный калькулятор с красивым дизайном",
      type: "weekly_project",
      difficulty: "medium",
      week: 2,
      requiredSkills: [{ skill: "javascript", level: 2 }, { skill: "html_css", level: 2 }],
      estimatedTime: 12,
      resourceCost: { knowledge: 25, motivation: 20, coffee: 30 },
      rewards: { score: 300, knowledge: 40, experience: 100 }
    },
    {
      name: "Mini Instagram Clone",
      description: "Социальная сеть с фотографиями и лайками",
      type: "hackathon",
      difficulty: "hard",
      week: 8,
      requiredSkills: [
        { skill: "react", level: 4 },
        { skill: "nodejs", level: 3 },
        { skill: "database", level: 3 }
      ],
      estimatedTime: 48,
      resourceCost: { knowledge: 50, motivation: 40, coffee: 60, sleep: 30 },
      rewards: { score: 1000, knowledge: 80, experience: 500, unlocks: ["senior_developer_path"] }
    }
  ];
  
  for (const projectData of defaultProjects) {
    const existing = await this.findOne({ name: projectData.name });
    if (!existing) {
      await this.create(projectData);
    }
  }
};

module.exports = mongoose.model('Project', projectSchema); 