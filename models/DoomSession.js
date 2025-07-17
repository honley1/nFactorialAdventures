const mongoose = require('mongoose');

// Модель DOOM игровой сессии
const doomSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Прогресс игрока
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 50
  },
  currentWeek: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  
  // Статы игрока (синхронизируются с фронтендом)
  player: {
    x: { type: Number, default: 8.5 },
    y: { type: Number, default: 8.5 },
    angle: { type: Number, default: 0 },
    health: { type: Number, default: 100, min: 0, max: 100 },
    armor: { type: Number, default: 100, min: 0, max: 100 },
    ammo: { type: Number, default: 50, min: 0, max: 100 }
  },
  
  // Ресурсы для совместимости с существующим бэкендом
  resources: {
    coffee: { type: Number, default: 100 },
    motivation: { type: Number, default: 100 },
    knowledge: { type: Number, default: 50 },
    sleep: { type: Number, default: 100 }
  },
  
  // Прогресс по уровням
  levelsCompleted: [{
    week: Number,
    levelName: String,
    completedAt: Date,
    score: Number,
    enemiesKilled: Number,
    itemsCollected: Number,
    timeSpent: Number
  }],
  
  // Убитые враги
  enemiesKilled: {
    bug: { type: Number, default: 0 },
    deadline: { type: Number, default: 0 },
    complexTask: { type: Number, default: 0 },
    imposter: { type: Number, default: 0 },
    interview: { type: Number, default: 0 }
  },
  
  // Собранные предметы
  itemsCollected: {
    coffee: { type: Number, default: 0 },
    knowledge: { type: Number, default: 0 },
    motivation: { type: Number, default: 0 }
  },
  
  // Диалоги с NPCs
  npcInteractions: [{
    npcId: String,
    dialogueStage: { type: Number, default: 0 },
    lastInteraction: Date,
    completed: { type: Boolean, default: false }
  }],
  
  // Достижения DOOM
  achievements: [{
    id: String,
    name: String,
    unlockedAt: Date,
    category: { type: String, enum: ['combat', 'exploration', 'dialogue', 'survival'] }
  }],
  
  // Игровая статистика
  stats: {
    totalPlayTime: { type: Number, default: 0 }, // в секундах
    sessionsPlayed: { type: Number, default: 0 },
    deathsCount: { type: Number, default: 0 },
    shotsFired: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 }, // процент попаданий
    bestWeekScore: { type: Number, default: 0 },
    survivalStreak: { type: Number, default: 0 }
  },
  
  // Текущее состояние уровня - ИСПРАВЛЕННАЯ СХЕМА
  currentLevel: {
    mapData: { type: String, required: true }, // JSON строка карты 16x16
    enemyPositions: {
      type: [{
        id: { type: String, required: true },
        type: { type: String, required: true },
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        health: { type: Number, required: true },
        isAlive: { type: Boolean, default: true }
      }],
      default: []
    },
    itemPositions: {
      type: [{
        id: { type: String, required: true },
        type: { type: String, required: true },
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        collected: { type: Boolean, default: false }
      }],
      default: []
    },
    npcStates: {
      type: [{
        id: { type: String, required: true },
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        dialogueStage: { type: Number, default: 0 }
      }],
      default: []
    }
  },
  
  // Мультиплеер поддержка (для будущего)
  multiplayer: {
    isInParty: { type: Boolean, default: false },
    partyId: String,
    teamScore: { type: Number, default: 0 }
  },
  
  // Настройки игры
  settings: {
    difficulty: { type: String, enum: ['easy', 'normal', 'hard', 'nightmare'], default: 'normal' },
    soundEnabled: { type: Boolean, default: true },
    graphics: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
  },
  
  // Технические данные
  sessionStarted: { type: Date, default: Date.now },
  lastSaved: { type: Date, default: Date.now },
  lastSync: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Добавляем pre-save middleware для миграции данных
doomSessionSchema.pre('save', function(next) {
  try {
    // Миграция enemyPositions если они в виде строки
    if (this.currentLevel && this.currentLevel.enemyPositions) {
      if (typeof this.currentLevel.enemyPositions === 'string') {
        console.log('🔄 Migrating enemyPositions from string to array');
        this.currentLevel.enemyPositions = JSON.parse(this.currentLevel.enemyPositions);
      }
    }
    
    // Миграция itemPositions если они в виде строки
    if (this.currentLevel && this.currentLevel.itemPositions) {
      if (typeof this.currentLevel.itemPositions === 'string') {
        console.log('🔄 Migrating itemPositions from string to array');
        this.currentLevel.itemPositions = JSON.parse(this.currentLevel.itemPositions);
      }
    }
    
    // Миграция npcStates если они в виде строки
    if (this.currentLevel && this.currentLevel.npcStates) {
      if (typeof this.currentLevel.npcStates === 'string') {
        console.log('🔄 Migrating npcStates from string to array');
        this.currentLevel.npcStates = JSON.parse(this.currentLevel.npcStates);
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ Migration error:', error);
    next(error);
  }
});

// Методы для работы с DOOM сессией
doomSessionSchema.methods.syncPlayerStats = function(frontendPlayer) {
  this.player.x = frontendPlayer.x;
  this.player.y = frontendPlayer.y;
  this.player.angle = frontendPlayer.angle;
  this.player.health = frontendPlayer.health;
  this.player.armor = frontendPlayer.armor;
  this.player.ammo = frontendPlayer.ammo;
  
  // Обновляем ресурсы для совместимости
  this.resources.coffee = frontendPlayer.health;
  this.resources.motivation = frontendPlayer.armor;
  this.resources.knowledge = frontendPlayer.ammo;
  
  this.lastSync = new Date();
};

doomSessionSchema.methods.killEnemy = function(enemyType) {
  if (this.enemiesKilled[enemyType] !== undefined) {
    this.enemiesKilled[enemyType] += 1;
  }
  
  // Обновляем текущий уровень
  const enemy = this.currentLevel.enemyPositions.find(e => e.type === enemyType && e.isAlive);
  if (enemy) {
    enemy.isAlive = false;
    enemy.health = 0;
  }
};

doomSessionSchema.methods.collectItem = function(itemType, value = 1) {
  if (this.itemsCollected[itemType] !== undefined) {
    this.itemsCollected[itemType] += value;
  }
  
  // Обновляем текущий уровень
  const item = this.currentLevel.itemPositions.find(i => i.type === itemType && !i.collected);
  if (item) {
    item.collected = true;
  }
};

doomSessionSchema.methods.updateNPCDialogue = function(npcId, stage) {
  let interaction = this.npcInteractions.find(i => i.npcId === npcId);
  
  if (!interaction) {
    interaction = { npcId, dialogueStage: stage, lastInteraction: new Date() };
    this.npcInteractions.push(interaction);
  } else {
    interaction.dialogueStage = stage;
    interaction.lastInteraction = new Date();
  }
  
  // Обновляем состояние NPC на уровне
  const npc = this.currentLevel.npcStates.find(n => n.id === npcId);
  if (npc) {
    npc.dialogueStage = stage;
  }
};

doomSessionSchema.methods.completeLevel = function(week, score, enemiesKilled, itemsCollected, timeSpent) {
  const completion = {
    week,
    levelName: `Week ${week}`,
    completedAt: new Date(),
    score,
    enemiesKilled,
    itemsCollected,
    timeSpent
  };
  
  this.levelsCompleted.push(completion);
  this.currentWeek = Math.max(this.currentWeek, week + 1);
  
  if (score > this.stats.bestWeekScore) {
    this.stats.bestWeekScore = score;
  }
};

doomSessionSchema.methods.addPlayTime = function(seconds) {
  this.stats.totalPlayTime += seconds;
  this.stats.sessionsPlayed += 1;
};

doomSessionSchema.methods.recordDeath = function() {
  this.stats.deathsCount += 1;
  this.stats.survivalStreak = 0;
};

doomSessionSchema.methods.recordShot = function(hit = false) {
  this.stats.shotsFired += 1;
  if (hit && this.stats.shotsFired > 0) {
    // Пересчитываем точность
    const hits = Math.floor(this.stats.shotsFired * this.stats.accuracy / 100) + (hit ? 1 : 0);
    this.stats.accuracy = Math.round((hits / this.stats.shotsFired) * 100);
  }
};

// Создание новой DOOM сессии для пользователя
doomSessionSchema.statics.createForUser = async function(userId) {
  try {
    console.log('🎮 Creating new DOOM session for user:', userId);
    
    // Инициализация стандартной карты Week 1
    const defaultMap = JSON.stringify([
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,1,1,1,0,0,0,0,1,1,1,0,0,1],
      [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
      [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
      [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
      [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
      [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
      [1,0,0,1,1,1,0,0,0,0,1,1,1,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ]);
    
    // Создаем объекты данных с правильным типом
    const enemyPositions = [
      { id: 'bug1', type: 'bug', x: 3, y: 3, health: 30, isAlive: true },
      { id: 'deadline1', type: 'deadline', x: 13, y: 13, health: 50, isAlive: true }
    ];
    
    const itemPositions = [
      { id: 'coffee1', type: 'coffee', x: 2, y: 8, collected: false },
      { id: 'book1', type: 'knowledge', x: 14, y: 2, collected: false },
      { id: 'energy1', type: 'motivation', x: 2, y: 12, collected: false }
    ];
    
    const npcStates = [
      { id: 'mentor_alex', x: 2, y: 2, dialogueStage: 0 },
      { id: 'student_helper', x: 14, y: 2, dialogueStage: 0 }
    ];
    
    // Логируем данные для отладки
    console.log('📊 Enemy positions:', enemyPositions);
    console.log('📦 Item positions:', itemPositions);
    console.log('👥 NPC states:', npcStates);
    
    const sessionData = {
      userId,
      currentLevel: {
        mapData: defaultMap,
        enemyPositions: enemyPositions,
        itemPositions: itemPositions,
        npcStates: npcStates
      }
    };
    
    console.log('💾 Creating session with data:', JSON.stringify(sessionData.currentLevel, null, 2));
    
    const session = new this(sessionData);
    const savedSession = await session.save();
    
    console.log('✅ DOOM session created successfully');
    return savedSession;
    
  } catch (error) {
    console.error('❌ Error creating DOOM session:', error);
    throw error;
  }
};

module.exports = mongoose.model('DoomSession', doomSessionSchema); 