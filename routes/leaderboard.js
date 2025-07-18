const express = require('express');
const router = express.Router();
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const Achievement = require('../models/Achievement');
const DoomSession = require('../models/DoomSession');

// GET /api/leaderboard - Получить топ игроков
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const sortBy = req.query.sortBy || 'totalScore'; // totalScore, weeklyScore, achievements
        
        let leaderboardData;
        
        if (sortBy === 'weeklyScore') {
            // Используем статический метод для недельного рейтинга
            leaderboardData = await User.getWeeklyLeaderboard(limit);
        } else if (sortBy === 'achievements') {
            // Рейтинг по достижениям
            leaderboardData = await User.find({})
                .sort({ 'achievementsUnlocked': -1 })
                .limit(limit)
                .select('username avatar achievementsUnlocked level experience')
                .lean();
        } else {
            // Используем статический метод для общего рейтинга
            leaderboardData = await User.getLeaderboard(limit);
        }

        // Получаем DOOM сессии для всех пользователей
        const userIds = leaderboardData.map(player => player._id);
        const doomSessions = await DoomSession.find({ userId: { $in: userIds } });
        
        // Создаем мапу для быстрого поиска DOOM сессий
        const doomSessionsMap = {};
        doomSessions.forEach(session => {
            doomSessionsMap[session.userId.toString()] = session;
        });

        // Добавляем позиции и форматируем данные
        const leaderboard = leaderboardData.map((player, index) => {
            const doomSession = doomSessionsMap[player._id.toString()];
            const globalAchievements = player.achievementsUnlocked?.length || 0;
            const doomAchievements = doomSession?.achievements?.length || 0;
            const totalAchievements = globalAchievements + doomAchievements;
            
            return {
                position: index + 1,
                id: player._id,
                telegramId: player.telegramId,
                username: player.username || 'Анонимный игрок',
                avatar: player.avatar || '🎮',
                level: player.level || 1,
                experience: player.experience || 0,
                totalScore: player.score?.total || 0,
                weeklyScore: player.score?.weekly || 0,
                totalAchievements: totalAchievements,
                currentWeek: player.currentWeek || 1
            };
        });

        res.json({
            success: true,
            leaderboard,
            meta: {
                total: leaderboard.length,
                limit,
                sortBy,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Leaderboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load leaderboard',
            message: error.message
        });
    }
});

// GET /api/leaderboard/stats - Получить общую статистику
router.get('/stats', async (req, res) => {
    try {
        const stats = await User.aggregate([
            {
                $lookup: {
                    from: 'gamesessions',
                    localField: 'telegramId',
                    foreignField: 'telegramId',
                    as: 'sessions'
                }
            },
            {
                $group: {
                    _id: null,
                    totalPlayers: { $sum: 1 },
                    activePlayers: {
                        $sum: {
                            $cond: [
                                { $gt: [{ $size: { $filter: { input: '$sessions', cond: { $eq: ['$$this.isActive', true] } } } }, 0] },
                                1,
                                0
                            ]
                        }
                    },
                    averageScore: { $avg: { $sum: '$sessions.stats.totalScore' } },
                    totalSessions: { $sum: { $size: '$sessions' } },
                    maxWeekReached: { $max: { $max: '$sessions.currentWeek' } }
                }
            }
        ]);

        const result = stats[0] || {
            totalPlayers: 0,
            activePlayers: 0,
            averageScore: 0,
            totalSessions: 0,
            maxWeekReached: 0
        };

        res.json({
            success: true,
            stats: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Leaderboard stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load stats',
            message: error.message
        });
    }
});

// GET /api/leaderboard/user/:telegramId - Получить позицию конкретного игрока
router.get('/user/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const sortBy = req.query.sortBy || 'totalScore';

        // Получаем всех игроков для определения позиции
        const allPlayers = await User.aggregate([
            {
                $lookup: {
                    from: 'gamesessions',
                    localField: 'telegramId',
                    foreignField: 'telegramId',
                    as: 'sessions'
                }
            },
            {
                $addFields: {
                    totalScore: { $sum: '$sessions.stats.totalScore' },
                    highestWeekCompleted: { $max: '$sessions.currentWeek' },
                    fastestCompletion: { $min: '$sessions.stats.fastestCompletion' }
                }
            },
            {
                $sort: getSortCriteria(sortBy)
            }
        ]);

        const playerIndex = allPlayers.findIndex(p => p.telegramId === telegramId);
        
        if (playerIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }

        const player = allPlayers[playerIndex];
        const position = playerIndex + 1;

        res.json({
            success: true,
            player: {
                position,
                telegramId: player.telegramId,
                username: player.username || player.firstName || 'Анонимный игрок',
                totalScore: player.totalScore || 0,
                highestWeekCompleted: player.highestWeekCompleted || 0,
                fastestCompletion: player.fastestCompletion || null
            },
            meta: {
                totalPlayers: allPlayers.length,
                sortBy
            }
        });

    } catch (error) {
        console.error('❌ Player position error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get player position',
            message: error.message
        });
    }
});

// GET /api/leaderboard/achievements - Топ по достижениям
router.get('/achievements', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const achievementLeaders = await User.aggregate([
            {
                $addFields: {
                    achievementCount: { $size: '$achievementsUnlocked' }
                }
            },
            {
                $sort: { achievementCount: -1, joinedAt: 1 }
            },
            {
                $limit: limit
            },
            {
                $project: {
                    telegramId: 1,
                    username: 1,
                    firstName: 1,
                    avatar: 1,
                    achievementCount: 1,
                    achievementsUnlocked: 1
                }
            }
        ]);

        const leaderboard = achievementLeaders.map((player, index) => ({
            position: index + 1,
            telegramId: player.telegramId,
            username: player.username || player.firstName || 'Анонимный игрок',
            avatar: player.avatar || '🏆',
            achievementCount: player.achievementCount,
            achievements: player.achievementsUnlocked
        }));

        res.json({
            success: true,
            achievementLeaderboard: leaderboard,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Achievement leaderboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load achievement leaderboard',
            message: error.message
        });
    }
});

// GET /api/leaderboard/achievements/:telegramId - Получить достижения игрока
router.get('/achievements/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        
        // Находим пользователя
        const user = await User.findOne({ telegramId: telegramId.toString() });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Получаем DOOM сессию для проверки простых достижений
        const doomSession = await DoomSession.findOne({ userId: user._id });
        
        // Формируем ответ с достижениями
        const response = {
            success: true,
            user: {
                telegramId: user.telegramId,
                username: user.username,
                level: user.level,
                avatar: user.avatar
            },
            achievements: {
                // Глобальные достижения из модели Achievement
                global: user.achievementsUnlocked || [],
                // Простые DOOM достижения
                doom: doomSession?.achievements || [],
                // Статистика
                stats: {
                    totalGlobal: (user.achievementsUnlocked || []).length,
                    totalDoom: (doomSession?.achievements || []).length,
                    enemiesKilled: doomSession?.stats?.enemiesKilled || 0,
                    itemsCollected: doomSession?.stats?.itemsCollected || 0,
                    levelsCompleted: (doomSession?.levelsCompleted || []).length
                }
            },
            timestamp: new Date().toISOString()
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('❌ Get user achievements error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user achievements',
            message: error.message
        });
    }
});

// Вспомогательная функция для получения критериев сортировки
function getSortCriteria(sortBy) {
    switch (sortBy) {
        case 'weekCompleted':
            return { highestWeekCompleted: -1, totalScore: -1 };
        case 'fastestTime':
            return { fastestCompletion: 1, totalScore: -1 };
        case 'achievements':
            return { totalAchievements: -1, totalScore: -1 };
        case 'totalScore':
        default:
            return { totalScore: -1, highestWeekCompleted: -1 };
    }
}

module.exports = router; 