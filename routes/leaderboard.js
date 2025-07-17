const express = require('express');
const router = express.Router();

// Временное хранилище лидерборда
const leaderboard = new Map();

// GET /api/leaderboard - Получить топ игроков
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        // Имитация данных лидерборда
        const mockLeaderboard = [
            {
                id: '1',
                username: 'AlmazCoder',
                avatar: '💎',
                totalScore: 9500,
                highestWeekCompleted: 10,
                fastestCompletion: 240 // минуты
            },
            {
                id: '2',
                username: 'ReactNinja',
                avatar: '🥷',
                totalScore: 8750,
                highestWeekCompleted: 9,
                fastestCompletion: 280
            },
            {
                id: '3',
                username: 'JSMaster',
                avatar: '👨‍💻',
                totalScore: 8200,
                highestWeekCompleted: 8,
                fastestCompletion: 320
            },
            {
                id: '4',
                username: 'CoffeeAddict',
                avatar: '☕',
                totalScore: 7800,
                highestWeekCompleted: 8,
                fastestCompletion: 350
            },
            {
                id: '5',
                username: 'NightCoder',
                avatar: '🌙',
                totalScore: 7200,
                highestWeekCompleted: 7,
                fastestCompletion: 400
            }
        ];
        
        const topPlayers = mockLeaderboard
            .slice(0, limit)
            .map((player, index) => ({
                ...player,
                rank: index + 1
            }));
        
        res.json({
            success: true,
            leaderboard: topPlayers,
            totalPlayers: mockLeaderboard.length
        });
        
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении лидерборда'
        });
    }
});

// GET /api/leaderboard/user/:userId - Получить позицию пользователя
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Имитация позиции пользователя
        const userPosition = {
            rank: Math.floor(Math.random() * 100) + 1,
            totalScore: Math.floor(Math.random() * 5000) + 1000,
            weeklyRank: Math.floor(Math.random() * 50) + 1,
            weeklyScore: Math.floor(Math.random() * 1000) + 100
        };
        
        res.json({
            success: true,
            userPosition
        });
        
    } catch (error) {
        console.error('Get user position error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении позиции пользователя'
        });
    }
});

// GET /api/leaderboard/weekly - Получить недельный лидерборд
router.get('/weekly', async (req, res) => {
    try {
        const week = parseInt(req.query.week) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        // Имитация недельного лидерборда
        const weeklyLeaderboard = [
            {
                id: '1',
                username: 'SpeedRunner',
                avatar: '⚡',
                weeklyScore: 950,
                weekNumber: week,
                completionTime: 45 // минуты
            },
            {
                id: '2',
                username: 'Perfectionist',
                avatar: '✨',
                weeklyScore: 900,
                weekNumber: week,
                completionTime: 60
            },
            {
                id: '3',
                username: 'Hustler',
                avatar: '🔥',
                weeklyScore: 850,
                weekNumber: week,
                completionTime: 55
            }
        ];
        
        const topWeeklyPlayers = weeklyLeaderboard
            .slice(0, limit)
            .map((player, index) => ({
                ...player,
                rank: index + 1
            }));
        
        res.json({
            success: true,
            weeklyLeaderboard: topWeeklyPlayers,
            week,
            totalPlayers: weeklyLeaderboard.length
        });
        
    } catch (error) {
        console.error('Get weekly leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении недельного лидерборда'
        });
    }
});

// POST /api/leaderboard/submit - Отправить результат
router.post('/submit', async (req, res) => {
    try {
        const { userId, weekNumber, score, completionTime } = req.body;
        
        if (!userId || !weekNumber || !score) {
            return res.status(400).json({
                success: false,
                message: 'Обязательные поля: userId, weekNumber, score'
            });
        }
        
        // Имитация сохранения результата
        const result = {
            id: Date.now().toString(),
            userId,
            weekNumber,
            score,
            completionTime: completionTime || 0,
            submittedAt: new Date()
        };
        
        // Сохраняем в временное хранилище
        leaderboard.set(`${userId}_${weekNumber}`, result);
        
        // Определяем новую позицию (имитация)
        const newRank = Math.floor(Math.random() * 50) + 1;
        
        res.json({
            success: true,
            message: 'Результат отправлен!',
            result,
            newRank,
            scoreImprovement: Math.floor(Math.random() * 200) + 50
        });
        
    } catch (error) {
        console.error('Submit score error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при отправке результата'
        });
    }
});

module.exports = router; 