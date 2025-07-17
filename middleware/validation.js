// Middleware для валидации запросов в nFactorial Adventures
const mongoose = require('mongoose');

// Валидация телеграм ID
const validateTelegramId = (req, res, next) => {
  const { telegramId } = req.body || req.params || req.query;
  
  if (!telegramId) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'telegramId is required'
    });
  }

  // Проверяем что это число или строка с числом
  const id = telegramId.toString();
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'telegramId must be a valid number'
    });
  }

  req.telegramId = id;
  next();
};

// Валидация session ID
const validateSessionId = (req, res, next) => {
  const { sessionId } = req.body || req.params || req.query;
  
  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'sessionId is required'
    });
  }

  // Проверяем что это валидный MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'sessionId must be a valid MongoDB ObjectId'
    });
  }

  req.sessionId = sessionId;
  next();
};

// Валидация типа действия
const validateActionType = (req, res, next) => {
  const { actionType } = req.body;
  
  if (!actionType) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'actionType is required'
    });
  }

  const validActions = [
    'move', 'code', 'study', 'mentor_talk', 'coffee_machine', 
    'rest', 'motivational_speech', 'complete_quest'
  ];

  if (!validActions.includes(actionType)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: `Invalid actionType. Must be one of: ${validActions.join(', ')}`
    });
  }

  req.actionType = actionType;
  next();
};

// Валидация типа объекта для взаимодействия
const validateObjectType = (req, res, next) => {
  const { objectType } = req.body;
  
  if (!objectType) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'objectType is required'
    });
  }

  const validObjects = [
    'coffee_machine', 'computer', 'mentor', 'bed', 
    'rest_zone', 'motivational_poster'
  ];

  if (!validObjects.includes(objectType)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: `Invalid objectType. Must be one of: ${validObjects.join(', ')}`
    });
  }

  req.objectType = objectType;
  next();
};

// Валидация параметров лидерборда
const validateLeaderboardParams = (req, res, next) => {
  const { limit, sortBy } = req.query;
  
  if (limit && (!Number.isInteger(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'limit must be a number between 1 and 100'
    });
  }

  const validSortBy = ['totalScore', 'weekCompleted', 'fastestTime', 'achievements'];
  if (sortBy && !validSortBy.includes(sortBy)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: `Invalid sortBy. Must be one of: ${validSortBy.join(', ')}`
    });
  }

  req.validatedQuery = {
    limit: limit ? parseInt(limit) : 10,
    sortBy: sortBy || 'totalScore'
  };
  next();
};

// Валидация данных пользователя
const validateUserData = (req, res, next) => {
  const { firstName, lastName, username } = req.body;
  
  // Проверяем длину имени
  if (firstName && (firstName.length < 1 || firstName.length > 50)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'firstName must be between 1 and 50 characters'
    });
  }

  if (lastName && (lastName.length < 1 || lastName.length > 50)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'lastName must be between 1 and 50 characters'
    });
  }

  if (username && (username.length < 3 || username.length > 30)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'username must be between 3 and 30 characters'
    });
  }

  // Проверяем username на валидные символы
  if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'username can only contain letters, numbers, and underscores'
    });
  }

  next();
};

// Валидация multiplier для действий
const validateMultiplier = (req, res, next) => {
  const { multiplier } = req.body;
  
  if (multiplier !== undefined) {
    const mult = parseFloat(multiplier);
    if (isNaN(mult) || mult < 0.1 || mult > 10) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'multiplier must be a number between 0.1 and 10'
      });
    }
    req.multiplier = mult;
  } else {
    req.multiplier = 1;
  }
  
  next();
};

// Общий error handler
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // MongoDB ошибки
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: messages.join(', ')
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Cast Error',
      message: 'Invalid ID format'
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate Error',
      message: 'Resource already exists'
    });
  }

  // JWT ошибки
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: 'Token expired'
    });
  }

  // Общие ошибки
  res.status(err.status || 500).json({
    success: false,
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Middleware для логирования запросов
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Логируем запрос
  console.log(`📥 ${req.method} ${req.path} - ${req.ip} - ${new Date().toISOString()}`);
  
  // Логируем ответ
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusIcon = status >= 400 ? '❌' : status >= 300 ? '⚠️' : '✅';
    
    console.log(`📤 ${statusIcon} ${req.method} ${req.path} - ${status} - ${duration}ms`);
    originalSend.call(this, data);
  };
  
  next();
};

// Rate limiting для API
const createRateLimit = (windowMs = 60000, max = 60) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Очищаем старые запросы
    for (const [key, data] of requests.entries()) {
      if (now - data.firstRequest > windowMs) {
        requests.delete(key);
      }
    }
    
    // Проверяем текущий IP
    const userData = requests.get(ip);
    
    if (!userData) {
      requests.set(ip, {
        count: 1,
        firstRequest: now
      });
      return next();
    }
    
    if (userData.count >= max) {
      return res.status(429).json({
        success: false,
        error: 'Rate Limit Exceeded',
        message: `Too many requests. Limit: ${max} per ${windowMs / 1000} seconds`,
        retryAfter: Math.ceil((userData.firstRequest + windowMs - now) / 1000)
      });
    }
    
    userData.count++;
    next();
  };
};

module.exports = {
  validateTelegramId,
  validateSessionId,
  validateActionType,
  validateObjectType,
  validateLeaderboardParams,
  validateUserData,
  validateMultiplier,
  errorHandler,
  requestLogger,
  createRateLimit
}; 