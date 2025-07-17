const express = require('express');
const router = express.Router();

// Временное хранилище игровых сессий
const gameSessions = new Map();

// POST /api/game/save - Сохранить игровой прогресс
router.post('/save', async (req, res) => {
    try {
        const { userId, weekNumber, resources, position, currentMission } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'ID пользователя обязателен'
            });
        }
        
        const sessionId = `${userId}_${weekNumber}`;
        const gameSession = {
            id: sessionId,
            userId,
            weekNumber,
            resources: resources || {
                coffee: 100,
                motivation: 100,
                knowledge: 0,
                sleep: 100
            },
            position: position || { x: 5, y: 15 },
            currentMission: currentMission || "Добро пожаловать в nFactorial!",
            lastSaveAt: new Date(),
            events: []
        };
        
        gameSessions.set(sessionId, gameSession);
        
        res.json({
            success: true,
            message: 'Прогресс сохранен',
            gameSession
        });
        
    } catch (error) {
        console.error('Save game error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при сохранении игры'
        });
    }
});

// GET /api/game/load/:userId/:week - Загрузить игровой прогресс
router.get('/load/:userId/:week', async (req, res) => {
    try {
        const { userId, week } = req.params;
        const sessionId = `${userId}_${week}`;
        
        let gameSession = gameSessions.get(sessionId);
        
        if (!gameSession) {
            // Создаем новую сессию
            gameSession = {
                id: sessionId,
                userId,
                weekNumber: parseInt(week),
                resources: {
                    coffee: 100,
                    motivation: 100,
                    knowledge: 0,
                    sleep: 100
                },
                position: { x: 5, y: 15 },
                currentMission: `Добро пожаловать в неделю ${week}!`,
                lastSaveAt: new Date(),
                events: []
            };
            gameSessions.set(sessionId, gameSession);
        }
        
        res.json({
            success: true,
            gameSession
        });
        
    } catch (error) {
        console.error('Load game error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при загрузке игры'
        });
    }
});

// POST /api/game/interact - Обработать взаимодействие с объектом
router.post('/interact', async (req, res) => {
    try {
        const { userId, weekNumber, objectType, currentResources } = req.body;
        
        const sessionId = `${userId}_${weekNumber}`;
        let gameSession = gameSessions.get(sessionId);
        
        if (!gameSession) {
            return res.status(404).json({
                success: false,
                message: 'Игровая сессия не найдена'
            });
        }
        
        let message = '';
        let newResources = { ...currentResources };
        
        switch (objectType) {
            case 'coffee_machine':
                if (newResources.coffee < 100) {
                    newResources.coffee = Math.min(100, newResources.coffee + 30);
                    message = 'Кофе восполнен! +30 ☕';
                } else {
                    message = 'Уже максимум кофе!';
                }
                break;
                
            case 'computer':
                if (newResources.coffee > 20) {
                    newResources.knowledge += 10;
                    newResources.coffee -= 10;
                    newResources.motivation -= 5;
                    message = 'Кодинг! +10 Knowledge 🧠';
                } else {
                    message = 'Нужно больше кофе для кодинга!';
                }
                break;
                
            case 'mentor':
                if (newResources.knowledge > 30) {
                    newResources.motivation += 20;
                    newResources.knowledge -= 10;
                    message = 'Ментор дал совет! +20 Motivation 💪';
                } else {
                    message = 'Изучи больше, потом приходи!';
                }
                break;
                
            default:
                message = 'Неизвестный объект';
        }
        
        // Обновляем сессию
        gameSession.resources = newResources;
        gameSession.lastSaveAt = new Date();
        gameSession.events.push({
            type: `${objectType}_interaction`,
            timestamp: new Date(),
            message
        });
        
        gameSessions.set(sessionId, gameSession);
        
        res.json({
            success: true,
            message,
            resources: newResources,
            gameSession
        });
        
    } catch (error) {
        console.error('Interact error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при взаимодействии'
        });
    }
});

// GET /api/game/missions/:week - Получить миссии для недели
router.get('/missions/:week', async (req, res) => {
    try {
        const { week } = req.params;
        const weekNum = parseInt(week);
        
        const missions = {
            1: [
                {
                    id: 'welcome',
                    title: 'Добро пожаловать!',
                    description: 'Найди кофе-машину и восполни энергию',
                    reward: 'coffee',
                    completed: false
                },
                {
                    id: 'first_code',
                    title: 'Первый код',
                    description: 'Напиши свою первую строчку кода',
                    reward: 'knowledge',
                    completed: false
                },
                {
                    id: 'mentor_talk',
                    title: 'Поговори с ментором',
                    description: 'Найди ментора и получи совет',
                    reward: 'motivation',
                    completed: false
                }
            ],
            2: [
                {
                    id: 'html_master',
                    title: 'HTML Мастер',
                    description: 'Изучи основы HTML',
                    reward: 'knowledge',
                    completed: false
                }
            ]
        };
        
        res.json({
            success: true,
            missions: missions[weekNum] || []
        });
        
    } catch (error) {
        console.error('Get missions error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении миссий'
        });
    }
});

module.exports = router; 