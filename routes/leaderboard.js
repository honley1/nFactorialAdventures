const express = require('express');
const router = express.Router();
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const Achievement = require('../models/Achievement');

// GET /api/leaderboard - Получить топ игроков
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const sortBy = req.query.sortBy || 'totalScore'; // totalScore, weekCompleted, fastestTime
        
        // Получаем всех игроков с их активными сессиями
        const leaderboardData = await User.aggregate([
            // Объединяем с игровыми сессиями
            {
                $lookup: {
                    from: 'gamesessions',
                    localField: 'telegramId',
                    foreignField: 'telegramId',
                    as: 'sessions'
                }
            },
            // Добавляем вычисляемые поля
            {
                $addFields: {
                    // Общий счет из всех сессий
                    totalScore: {
                        $sum: '$sessions.stats.totalScore'
                    },
                    // Максимальная завершенная неделя
                    highestWeekCompleted: {
                        $max: '$sessions.currentWeek'
                    },
                    // Лучшее время прохождения
                    fastestCompletion: {
                        $min: '$sessions.stats.fastestCompletion'
                    },
                    // Общее количество достижений
                    totalAchievements: {
                        $size: '$achievements'
                    },
                    // Активная сессия
                    activeSession: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: '$sessions',
                                    cond: { $eq: ['$$this.isActive', true] }
                                }
                            },
                            0
                        ]
                    }
                }
            },
            // Проекция нужных полей
            {
                $project: {
                    _id: 1,
                    telegramId: 1,
                    username: 1,
                    firstName: 1,
                    lastName: 1,
                    avatar: 1,
                    totalScore: 1,
                    highestWeekCompleted: 1,
                    fastestCompletion: 1,
                    totalAchievements: 1,
                    joinedAt: 1,
                    resources: '$activeSession.resources',
                    stats: '$activeSession.stats'
                }
            },
            // Сортировка
            {
                $sort: getSortCriteria(sortBy)
            },
            // Лимит
            {
                $limit: limit
            }
        ]);

        // Добавляем позиции
        const leaderboard = leaderboardData.map((player, index) => ({
            position: index + 1,
            id: player._id,
            telegramId: player.telegramId,
            username: player.username || player.firstName || 'Анонимный игрок',
            firstName: player.firstName,
            lastName: player.lastName,
            avatar: player.avatar || '🎮',
            totalScore: player.totalScore || 0,
            highestWeekCompleted: player.highestWeekCompleted || 0,
            fastestCompletion: player.fastestCompletion || null,
            totalAchievements: player.totalAchievements || 0,
            joinedAt: player.joinedAt,
            resources: player.resources,
            stats: player.stats
        }));

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
                    achievementCount: { $size: '$achievements' }
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
                    achievements: 1
                }
            }
        ]);

        const leaderboard = achievementLeaders.map((player, index) => ({
            position: index + 1,
            telegramId: player.telegramId,
            username: player.username || player.firstName || 'Анонимный игрок',
            avatar: player.avatar || '🏆',
            achievementCount: player.achievementCount,
            achievements: player.achievements
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