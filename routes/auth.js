const express = require('express');
const router = express.Router();
const User = require('../models/User');
const GameSession = require('../models/GameSession');

// Middleware для проверки Telegram данных
const verifyTelegramAuth = (req, res, next) => {
  // Здесь можно добавить проверку подписи Telegram WebApp
  // Пока используем простую проверку наличия telegramId
  const { telegramId } = req.body;
  
  if (!telegramId) {
    return res.status(400).json({ 
      error: 'Missing Telegram ID',
      message: 'telegramId is required for authentication' 
    });
  }
  
  req.telegramId = telegramId.toString();
  next();
};

// POST /api/auth/login - Авторизация и создание/обновление пользователя
router.post('/login', verifyTelegramAuth, async (req, res) => {
  try {
    const { telegramId, username, avatar, firstName, lastName } = req.body;
    
    // Валидация входных данных
    if (!username || !avatar) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'username and avatar are required'
      });
    }
    
    // Проверяем существует ли пользователь
    let user = await User.findOne({ telegramId });
    let isNewUser = false;
    
    if (!user) {
      // Создаем нового пользователя
      user = new User({
        telegramId,
        username,
        avatar,
        level: 1,
        experience: 0,
        currentWeek: 1,
        score: {
          total: 0,
          weekly: 0,
          lastWeeklyReset: new Date()
        }
      });
      
      await user.save();
      isNewUser = true;
      
      console.log(`👤 New user created: ${username} (${telegramId})`);
    } else {
      // Обновляем данные существующего пользователя
      user.username = username;
      user.avatar = avatar;
      user.lastPlayed = new Date();
      
      await user.save();
      
      console.log(`👤 User login: ${username} (${telegramId})`);
    }
    
    // Создаем или обновляем игровую сессию
    let gameSession = await GameSession.findOne({ userId: user._id });
    
    if (!gameSession) {
      gameSession = await GameSession.createForUser(user._id);
      console.log(`🎮 New game session created for ${username}`);
    } else {
      // Обновляем время последнего входа
      gameSession.sessionStarted = new Date();
      await gameSession.save();
      
      console.log(`🎮 Game session restored for ${username}`);
    }
    
    // Возвращаем данные пользователя и сессии
    res.json({
      success: true,
      isNewUser,
      user: {
        id: user._id,
        telegramId: user.telegramId,
        username: user.username,
        avatar: user.avatar,
        level: user.level,
        experience: user.experience,
        currentWeek: user.currentWeek,
        score: user.score,
        achievements: user.achievementsUnlocked,
        settings: user.settings,
        stats: user.stats,
        createdAt: user.createdAt,
        lastPlayed: user.lastPlayed
      },
      gameSession: {
        id: gameSession._id,
        resources: gameSession.resources,
        currentLocation: gameSession.currentLocation,
        currentWeek: gameSession.currentWeek,
        gameTime: gameSession.gameTime,
        activeQuests: gameSession.activeQuests,
        unlockedContent: gameSession.unlockedContent,
        lastSaved: gameSession.lastSaved
      }
    });
    
  } catch (error) {
    console.error('❌ Auth error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/auth/logout - Завершение сессии
router.post('/logout', verifyTelegramAuth, async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.telegramId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Обновляем время последней игры
    user.lastPlayed = new Date();
    await user.save();
    
    // Сохраняем финальное состояние игровой сессии
    const gameSession = await GameSession.findOne({ userId: user._id });
    if (gameSession) {
      gameSession.lastSaved = new Date();
      await gameSession.save();
    }
    
    console.log(`👋 User logout: ${user.username}`);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/auth/profile - Получение профиля пользователя
router.get('/profile', verifyTelegramAuth, async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.telegramId })
      .select('-__v -createdAt -updatedAt');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      user: user
    });
    
  } catch (error) {
    console.error('❌ Profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// PUT /api/auth/settings - Обновление настроек пользователя
router.put('/settings', verifyTelegramAuth, async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        error: 'Invalid settings',
        message: 'settings object is required'
      });
    }
    
    const user = await User.findOne({ telegramId: req.telegramId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Обновляем только разрешенные настройки
    const allowedSettings = ['soundEnabled', 'notifications', 'theme', 'language'];
    
    allowedSettings.forEach(setting => {
      if (settings[setting] !== undefined) {
        user.settings[setting] = settings[setting];
      }
    });
    
    await user.save();
    
    console.log(`⚙️ Settings updated for ${user.username}`);
    
    res.json({
      success: true,
      settings: user.settings
    });
    
  } catch (error) {
    console.error('❌ Settings update error:', error);
    res.status(500).json({
      error: 'Failed to update settings',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/auth/validate - Проверка валидности токена/сессии
router.get('/validate', verifyTelegramAuth, async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.telegramId })
      .select('telegramId username avatar level currentWeek lastPlayed');
    
    if (!user) {
      return res.status(401).json({ 
        valid: false, 
        error: 'User not found' 
      });
    }
    
    // Проверяем, не слишком ли давно был онлайн (например, более 7 дней)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    if (user.lastPlayed < weekAgo) {
      return res.status(401).json({ 
        valid: false, 
        error: 'Session expired',
        message: 'Please login again'
      });
    }
    
    res.json({
      valid: true,
      user: {
        username: user.username,
        avatar: user.avatar,
        level: user.level,
        currentWeek: user.currentWeek
      }
    });
    
  } catch (error) {
    console.error('❌ Validation error:', error);
    res.status(500).json({
      valid: false,
      error: 'Validation failed'
    });
  }
});

module.exports = router; 