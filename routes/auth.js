const express = require('express');
const router = express.Router();

// Временное хранилище пользователей (без MongoDB для быстрого тестирования)
const users = new Map();

// POST /api/auth/login - Вход/регистрация пользователя
router.post('/login', async (req, res) => {
    try {
        const { username, avatar, telegramUser } = req.body;
        
        if (!username || username.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Имя пользователя должно содержать минимум 2 символа'
            });
        }
        
        const userId = username.toLowerCase();
        let user = users.get(userId);
        let isNewUser = false;
        
        if (!user) {
            // Создаем нового пользователя
            user = {
                id: Date.now().toString(),
                username: username.trim(),
                avatar: avatar || '🤓',
                currentWeek: 1,
                totalScore: 0,
                highestWeekCompleted: 0,
                telegramData: telegramUser,
                createdAt: new Date(),
                lastLoginAt: new Date()
            };
            users.set(userId, user);
            isNewUser = true;
        } else {
            // Обновляем время последнего входа
            user.lastLoginAt = new Date();
            users.set(userId, user);
        }
        
        // Создаем игровую сессию
        const gameSession = {
            id: Date.now().toString(),
            weekNumber: user.currentWeek,
            resources: {
                coffee: 100,
                motivation: 100,
                knowledge: 0,
                sleep: 100
            },
            position: {
                x: 5,
                y: 15
            },
            currentMission: "Добро пожаловать в nFactorial! Найди кофе-машину ☕"
        };
        
        res.json({
            success: true,
            message: isNewUser ? 'Добро пожаловать в nFactorial!' : 'С возвращением!',
            user: {
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                currentWeek: user.currentWeek,
                totalScore: user.totalScore,
                highestWeekCompleted: user.highestWeekCompleted
            },
            gameSession,
            isNewUser
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при входе в систему'
        });
    }
});

// GET /api/auth/check-username/:username - Проверить доступность имени
router.get('/check-username/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        if (username.length < 2) {
            return res.json({
                success: false,
                available: false,
                message: 'Имя слишком короткое'
            });
        }
        
        const userId = username.toLowerCase();
        const existingUser = users.get(userId);
        
        res.json({
            success: true,
            available: !existingUser,
            message: existingUser ? 'Имя уже занято' : 'Имя доступно'
        });
        
    } catch (error) {
        console.error('Check username error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при проверке имени'
        });
    }
});

// GET /api/auth/avatars - Получить список доступных аватаров
router.get('/avatars', (req, res) => {
    const avatars = [
        { emoji: '🤓', name: 'Нерд', description: 'Классический программист' },
        { emoji: '😎', name: 'Крутой', description: 'Уверенный в себе' },
        { emoji: '🚀', name: 'Ракета', description: 'Быстрый и амбициозный' },
        { emoji: '💻', name: 'Хакер', description: 'Любитель технологий' },
        { emoji: '🧠', name: 'Мозг', description: 'Умный и вдумчивый' },
        { emoji: '☕', name: 'Кофеман', description: 'Не может без кофе' },
        { emoji: '💪', name: 'Сильный', description: 'Мотивированный' },
        { emoji: '🎮', name: 'Геймер', description: 'Любитель игр' },
        { emoji: '🔥', name: 'Огонь', description: 'Энергичный' },
        { emoji: '⚡', name: 'Молния', description: 'Быстрый как молния' }
    ];
    
    res.json({
        success: true,
        avatars
    });
});

// GET /api/auth/user/:id - Получить информацию о пользователе
router.get('/user/:id', async (req, res) => {
    try {
        const user = Array.from(users.values()).find(u => u.id === req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }
        
        res.json({
            success: true,
            user: {
                ...user,
                achievementsCount: 0,
                totalAchievements: 5,
                weeklyProgress: []
            }
        });
        
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении данных пользователя'
        });
    }
});

module.exports = router; 