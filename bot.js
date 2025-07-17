const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Подключение к MongoDB (используем тот же URI что и сервер)
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('🤖 Bot connected to MongoDB'))
        .catch(err => console.error('❌ Bot MongoDB connection error:', err));
} else {
    console.warn('⚠️  MONGO_URI not set for bot, some features may not work');
}

// Импорт моделей
const User = require('./models/User');
const DoomSession = require('./models/DoomSession');
const GameSession = require('./models/GameSession');
const Achievement = require('./models/Achievement');

// Инициализация бота
const bot = new Telegraf(process.env.BOT_TOKEN);

// Настройка команд для меню (слева от поля ввода)
bot.telegram.setMyCommands([
    { command: 'start', description: '🚀 Начать игру' },
    { command: 'game', description: '🎮 Открыть игру' },
    { command: 'help', description: '❓ Помощь' },
    { command: 'stats', description: '📊 Моя статистика' },
    { command: 'leaderboard', description: '🏆 Топ игроков' },
    { command: 'rules', description: '📚 Правила игры' },
    { command: 'achievements', description: '🏅 Мои достижения' }
]);

// Helper функция для безопасного редактирования сообщений
const safeEditMessage = async (ctx, text, options = {}) => {
    try {
        await ctx.editMessageText(text, options);
    } catch (error) {
        // Если не получается редактировать (медиа сообщение), отправляем новое
        await ctx.reply(text, options);
    }
};

// URL Mini App
const MINI_APP_URL = process.env.MINI_APP_URL || process.env.FRONTEND_URL || 'https://eed58e0935c7.ngrok-free.app';

// Настройка кнопки "Open" в списке чатов для Web App
bot.telegram.setChatMenuButton({
    type: 'web_app',
    text: '🎮 ИГРАТЬ',
    web_app: { url: MINI_APP_URL }
}).then(() => {
    console.log('✅ Кнопка "ИГРАТЬ" установлена в меню чата');
}).catch(err => {
    console.error('❌ Ошибка установки кнопки меню:', err);
});

console.log('🤖 nFactorial Adventures Bot (Telegraf) started');
console.log('🔗 Mini App URL:', MINI_APP_URL);

// Middleware для логирования
bot.use((ctx, next) => {
    const start = Date.now();
    return next().then(() => {
        const ms = Date.now() - start;
        console.log(`⚡ ${ctx.updateType} from ${ctx.from?.username || ctx.from?.first_name} (${ms}ms)`);
    });
});

// ===== КОМАНДЫ БОТА =====

// Команда /start
bot.command('start', async (ctx) => {
    const welcomeMessage = `🎉 **Добро пожаловать в nFactorial Adventures!**

Это официальная игра про жизнь в буткемпе nFactorial! 

🎯 **Твоя цель:** Пройти все 10 недель обучения и стать крутым разработчиком!

🎮 **Что тебя ждет:**
• Изучай программирование в виртуальном nFactorial  
• Общайся с менторами и студентами
• Управляй ресурсами: кофе ☕, мотивация 💪, знания 🧠, сон 😴
• Выполняй реальные проекты и задания
• Соревнуйся с другими студентами

Готов начать свое приключение? 🚀`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('🎮 ИГРАТЬ', process.env.MINI_APP_URL || 'https://eed58e0935c7.ngrok-free.app')],
        [
            Markup.button.callback('📚 Правила', 'rules'),
            Markup.button.callback('❓ Помощь', 'help')
        ],
        [
            Markup.button.callback('🏆 Топ игроков', 'leaderboard'),
            Markup.button.callback('🏅 Достижения', 'achievements')
        ]
    ]);

    try {
        // Пробуем отправить с картинкой
        await ctx.replyWithPhoto(
            { source: path.join(__dirname, 'public', 'nfact.png') },
            {
                caption: welcomeMessage,
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            }
        );
    } catch (error) {
        // Если картинка не найдена, отправляем текст
        await ctx.reply(welcomeMessage, {
            parse_mode: 'Markdown',
            reply_markup: keyboard.reply_markup
        });
    }
});

// Команда /help
bot.command('help', async (ctx) => {
    const helpMessage = `❓ **Помощь по nFactorial Adventures**

**Команды бота:**
/start - Начать игру
/game - Открыть игру  
/help - Эта помощь
/stats - Твоя статистика
/leaderboard - Топ игроков
/rules - Правила игры
/achievements - Твои достижения

**Как играть:**
1. 👀 **Осматривайся** - изучай локации
2. 🤏 **Взаимодействуй** - кликай на объекты
3. 🚶 **Перемещайся** - ходи между локациями
4. ⚖️ **Управляй ресурсами** - следи за показателями

**Ресурсы:**
☕ **Кофе** - энергия для кодинга
💪 **Мотивация** - желание учиться  
🧠 **Знания** - твой прогресс
😴 **Сон** - отдых и восстановление

**Локации nFactorial:**
🏫 Учебный класс
🏢 Коворкинг зона
🌟 Главный холл
☕ Кафе nFactorial

Удачи в путешествии! 🚀`;

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// Команда /rules
bot.command('rules', async (ctx) => {
    const rulesMessage = `📚 **Правила игры nFactorial Adventures**

**Цель:** Пройти все 10 недель bootcamp и стать крутым разработчиком!

**Правила:**
1. 📊 Следи за ресурсами - не давай им упасть до нуля
2. ⏰ Управляй временем - день, вечер, ночь влияют на эффективность  
3. 🎯 Выполняй задания и проекты для получения знаний
4. 🤝 Общайся с менторами для мотивации
5. ☕ Пей кофе для поддержания энергии
6. 😴 Отдыхай в кафе для восстановления сна

**Победа:** Завершить все 10 недель с максимальными навыками!

**Штрафы:**
- Ресурс = 0 → временная блокировка действий
- Плохое управление временем → снижение эффективности

Удачи, будущий разработчик! 💻`;

    await ctx.reply(rulesMessage, { parse_mode: 'Markdown' });
});

// Команда /achievements
bot.command('achievements', async (ctx) => {
    try {
        const telegramId = ctx.from.id.toString();
        
        // Получаем пользователя и его достижения
        const user = await User.findOne({ telegramId });
        
        if (!user) {
            const noUserMessage = `🏅 **Достижения недоступны**

❌ Сначала нужно войти в игру!

💡 Нажмите "Играть" чтобы создать аккаунт и начать разблокировать достижения.`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.webApp('🎮 Начать игру!', MINI_APP_URL)]
            ]);

            return await ctx.reply(noUserMessage, {
                parse_mode: 'Markdown',
                ...keyboard
            });
        }

        // Получаем DOOM сессию для проверки простых достижений
        const doomSession = await DoomSession.findOne({ userId: user._id });
        
        // Подсчитываем достижения
        const globalAchievements = user.achievementsUnlocked || [];
        const doomAchievements = doomSession?.achievements || [];
        const totalUnlocked = globalAchievements.length + doomAchievements.length;

        let achievementsText = `🏅 **Достижения ${user.username || user.firstName}**\n\n`;

        // Показываем разблокированные DOOM достижения
        if (doomAchievements.length > 0) {
            achievementsText += `✅ **Разблокированные (DOOM):**\n`;
            doomAchievements.forEach(achievement => {
                const date = achievement.unlockedAt?.toLocaleDateString('ru-RU') || 'недавно';
                achievementsText += `• 🏆 **${achievement.name}** (${date})\n`;
            });
            achievementsText += `\n`;
        }

        // Показываем глобальные достижения
        if (globalAchievements.length > 0) {
            achievementsText += `✅ **Глобальные достижения:**\n`;
            globalAchievements.forEach(achievement => {
                achievementsText += `• ⭐ **${achievement.name || achievement.id}**\n`;
            });
            achievementsText += `\n`;
        }

        // Показываем доступные для разблокировки достижения
        achievementsText += `🔒 **Доступные достижения:**\n`;
        
        // DOOM достижения
        const enemiesKilled = doomSession ? Object.values(doomSession.enemiesKilled).reduce((a, b) => a + b, 0) : 0;
        const itemsCollected = doomSession ? Object.values(doomSession.itemsCollected).reduce((a, b) => a + b, 0) : 0;
        
        if (enemiesKilled < 10) {
            achievementsText += `• ⚔️ Первый охотник - Убей 10 врагов (${enemiesKilled}/10)\n`;
        }
        if (!doomAchievements.find(a => a.id === 'bug_destroyer')) {
            const bugKills = doomSession?.enemiesKilled?.bug || 0;
            achievementsText += `• 🐛 Истребитель багов - Убей 5 багов (${bugKills}/5)\n`;
        }
        if (!doomAchievements.find(a => a.id === 'collector')) {
            achievementsText += `• 📦 Коллекционер - Собери 5 предметов (${itemsCollected}/5)\n`;
        }
        if (user.currentWeek < 1) {
            achievementsText += `• 📅 Первая неделя - Завершить неделю 1\n`;
        }
        if (user.level < 5) {
            achievementsText += `• 🚀 Продвинутый - Достичь 5 уровня (${user.level}/5)\n`;
        }
        if (user.level < 10) {
            achievementsText += `• ⭐ Эксперт - Достичь 10 уровня (${user.level}/10)\n`;
        }

        achievementsText += `\n📊 **Статистика:** ${totalUnlocked} достижений разблокировано\n\n`;
        achievementsText += `💡 Продолжай играть в DOOM чтобы разблокировать больше достижений!`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.webApp('🎯 За достижениями!', MINI_APP_URL)]
        ]);

        await ctx.reply(achievementsText, {
            parse_mode: 'Markdown',
            ...keyboard
        });

    } catch (error) {
        console.error('❌ Achievements command error:', error);
        await ctx.reply('😓 Ошибка получения достижений. Попробуйте позже.');
    }
});

// Команда /game
bot.command('game', async (ctx) => {
    const gameMessage = `🎮 **nFactorial Adventures**

Выбери действие:`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Играть сейчас!', MINI_APP_URL)],
        [
            Markup.button.callback('📊 Моя статистика', 'stats'),
            Markup.button.callback('🏆 Достижения', 'achievements')
        ]
    ]);

    try {
        await ctx.replyWithPhoto(
            { source: './nfact.png' },
            {
                caption: gameMessage,
                parse_mode: 'Markdown',
                ...keyboard
            }
        );
    } catch (error) {
        console.error('❌ Error sending photo:', error);
        await ctx.reply(gameMessage, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }
});

// Команда /stats
bot.command('stats', async (ctx) => {
    try {
        const telegramId = ctx.from.id.toString();
        
        // Получаем пользователя из базы
        const user = await User.findOne({ telegramId });
        
        if (!user) {
            const noUserMessage = `📊 **Статистика недоступна**

❌ Сначала нужно войти в игру!

💡 Нажмите "Играть" чтобы создать аккаунт.`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.webApp('🎮 Начать играть!', MINI_APP_URL)]
            ]);

            return await ctx.reply(noUserMessage, {
                parse_mode: 'Markdown',
                ...keyboard
            });
        }

        // Получаем DOOM сессию
        const doomSession = await DoomSession.findOne({ userId: user._id });
        const gameSession = await GameSession.findOne({ userId: user._id });

        // Подсчитываем статистику
        const totalEnemiesKilled = doomSession ? 
            Object.values(doomSession.enemiesKilled).reduce((a, b) => a + b, 0) : 0;
        const totalItemsCollected = doomSession ?
            Object.values(doomSession.itemsCollected).reduce((a, b) => a + b, 0) : 0;
        const playTimeMinutes = doomSession ?
            Math.floor(doomSession.stats.totalPlayTime / 60) : 0;
        const achievementsCount = (user.achievementsUnlocked?.length || 0) + 
                                 (doomSession?.achievements?.length || 0);

        // Определяем ранг
        const getRank = (level) => {
            if (level >= 20) return '👑 Легенда nFactorial';
            if (level >= 15) return '🏆 Мастер';
            if (level >= 10) return '⭐ Эксперт';
            if (level >= 5) return '🚀 Продвинутый';
            return '🌱 Новичок';
        };

        const statsMessage = `📊 **Статистика ${user.username || user.firstName}**

🎮 **Общий прогресс:**
• Уровень: ${user.level}/50
• Опыт: ${user.experience}
• Очки: ${user.score?.total || 0}
• Неделя: ${user.currentWeek}/10

⚔️ **DOOM статистика:**
• Врагов убито: ${totalEnemiesKilled}
• Предметов собрано: ${totalItemsCollected}
• Время в игре: ${playTimeMinutes} мин
• Достижений: ${achievementsCount}

🏅 **Твой ранг:** ${getRank(user.level)}

📅 Создан: ${user.createdAt?.toLocaleDateString('ru-RU') || 'Неизвестно'}
🕐 Последний вход: ${user.lastPlayed?.toLocaleDateString('ru-RU') || 'Сегодня'}`;

    const keyboard = Markup.inlineKeyboard([
            [Markup.button.webApp('🎮 Продолжить играть!', MINI_APP_URL)]
    ]);

    await ctx.reply(statsMessage, {
        parse_mode: 'Markdown',
        ...keyboard
    });

    } catch (error) {
        console.error('❌ Stats command error:', error);
        await ctx.reply('😓 Ошибка получения статистики. Попробуйте позже.');
    }
});

// Команда /leaderboard
bot.command('leaderboard', async (ctx) => {
    try {
        // Получаем топ-5 игроков из базы
        const topPlayers = await User.aggregate([
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
                    totalAchievements: { $size: '$achievementsUnlocked' }
                }
            },
            {
                $sort: { 
                    level: -1, 
                    experience: -1, 
                    totalScore: -1,
                    totalAchievements: -1
                }
            },
            {
                $limit: 5
            },
            {
                $project: {
                    username: 1,
                    firstName: 1,
                    level: 1,
                    experience: 1,
                    totalScore: 1,
                    totalAchievements: 1,
                    currentWeek: 1
                }
            }
        ]);

        let leaderboardText = '🏆 **Топ игроков nFactorial Adventures**\n\n';

        if (topPlayers.length === 0) {
            leaderboardText += '🤷‍♂️ Пока никого нет в рейтинге!\n\n*Стань первым! Начни играть.*';
        } else {
            const medals = ['👑', '🥈', '🥉', '🏅', '🏅'];
            
            topPlayers.forEach((player, index) => {
                const name = player.username || player.firstName || 'Анонимный игрок';
                const medal = medals[index] || '🏅';
                const level = player.level || 1;
                const exp = player.experience || 0;
                const score = player.totalScore || 0;
                const achievements = player.totalAchievements || 0;
                
                leaderboardText += `${index + 1}. ${medal} **${name}**\n`;
                leaderboardText += `    📊 Уровень ${level} • ${exp} опыта\n`;
                leaderboardText += `    🎯 ${score} очков • 🏆 ${achievements} достижений\n\n`;
            });
        }

        // Проверяем позицию текущего игрока
        const currentUser = await User.findOne({ telegramId: ctx.from.id.toString() });
        if (currentUser) {
            const allPlayers = await User.countDocuments();
            const betterPlayers = await User.countDocuments({
                $or: [
                    { level: { $gt: currentUser.level } },
                    { 
                        level: currentUser.level, 
                        experience: { $gt: currentUser.experience } 
                    }
                ]
            });
            const userPosition = betterPlayers + 1;
            
            leaderboardText += `📍 **Твоя позиция:** ${userPosition}/${allPlayers}\n\n`;
        }

        leaderboardText += `💡 **Как подняться в рейтинге:**\n`;
        leaderboardText += `• ⚔️ Убивай врагов в DOOM (+10 опыта)\n`;
        leaderboardText += `• 💬 Общайся с NPC (+5-15 опыта)\n`;
        leaderboardText += `• 📦 Собирай предметы\n`;
        leaderboardText += `• 🏆 Разблокируй достижения\n`;
        leaderboardText += `• 🎯 Завершай недели DOOM`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Подняться в рейтинге!', MINI_APP_URL)]
    ]);

        await ctx.reply(leaderboardText, {
        parse_mode: 'Markdown',
        ...keyboard
    });

    } catch (error) {
        console.error('❌ Leaderboard command error:', error);
        await ctx.reply('😓 Ошибка получения рейтинга. Попробуйте позже.');
    }
});

// ===== CALLBACK HANDLERS =====

// Правила игры
bot.action('rules', async (ctx) => {
    const rulesMessage = `📚 **Правила игры nFactorial Adventures**

**Цель:** Пройти все 10 недель bootcamp и стать крутым разработчиком!

**Правила:**
1. 📊 Следи за ресурсами - не давай им упасть до нуля
2. ⏰ Управляй временем - день, вечер, ночь влияют на эффективность  
3. 🎯 Выполняй задания и проекты для получения знаний
4. 🤝 Общайся с менторами для мотивации
5. ☕ Пей кофе для поддержания энергии
6. 😴 Отдыхай в кафе для восстановления сна

**Победа:** Завершить все 10 недель с максимальными навыками!

**Штрафы:**
- Ресурс = 0 → временная блокировка действий
- Плохое управление временем → снижение эффективности

Удачи, будущий разработчик! 💻`;

    await safeEditMessage(ctx, rulesMessage, { parse_mode: 'Markdown' });
});

// Лидерборд
bot.action('leaderboard', async (ctx) => {
    await ctx.answerCbQuery('🏆 Открываю лидерборд...');
    
    try {
        // Получаем топ-3 игроков из базы (для компактности)
        const topPlayers = await User.aggregate([
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
                    totalAchievements: { $size: '$achievementsUnlocked' }
                }
            },
            {
                $sort: { 
                    level: -1, 
                    experience: -1, 
                    totalScore: -1
                }
            },
            {
                $limit: 3
            },
            {
                $project: {
                    username: 1,
                    firstName: 1,
                    level: 1,
                    experience: 1,
                    totalScore: 1,
                    totalAchievements: 1
                }
            }
        ]);

        let leaderboardText = '🏆 **Топ игроков nFactorial Adventures**\n\n';

        if (topPlayers.length === 0) {
            leaderboardText += '🤷‍♂️ Пока никого нет в рейтинге!\n\n*Стань первым!*';
        } else {
            const medals = ['👑', '🥈', '🥉'];
            
            topPlayers.forEach((player, index) => {
                const name = player.username || player.firstName || 'Анонимный игрок';
                const medal = medals[index];
                const level = player.level || 1;
                const exp = player.experience || 0;
                
                leaderboardText += `${index + 1}. ${medal} **${name}**\n`;
                leaderboardText += `    Уровень ${level} • ${exp} опыта\n\n`;
            });
        }

        // Проверяем позицию текущего игрока
        const currentUser = await User.findOne({ telegramId: ctx.from.id.toString() });
        if (currentUser) {
            const betterPlayers = await User.countDocuments({
                $or: [
                    { level: { $gt: currentUser.level } },
                    { 
                        level: currentUser.level, 
                        experience: { $gt: currentUser.experience } 
                    }
                ]
            });
            const userPosition = betterPlayers + 1;
            leaderboardText += `📍 **Твоя позиция:** ${userPosition}\n\n`;
        }

        leaderboardText += `💡 **Поднимайся в рейтинге:**\n`;
        leaderboardText += `• ⚔️ Убивай врагов в DOOM\n`;
        leaderboardText += `• 💬 Общайся с NPC\n`;
        leaderboardText += `• 🏆 Собирай достижения`;

        await safeEditMessage(ctx, leaderboardText, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
                [Markup.button.webApp('🎮 Играть', MINI_APP_URL)],
            [Markup.button.callback('🏠 Главное меню', 'main_menu')]
        ])
    });

    } catch (error) {
        console.error('❌ Leaderboard callback error:', error);
        await ctx.answerCbQuery('😓 Ошибка загрузки рейтинга');
    }
});

// Помощь
bot.action('help', async (ctx) => {
    await ctx.answerCbQuery('❓ Открываю помощь...');
    
    const helpMessage = `❓ **Помощь по nFactorial Adventures**

**Команды бота:**
/start - Начать игру
/game - Открыть игру  
/help - Эта помощь
/stats - Твоя статистика
/leaderboard - Топ игроков

**Как играть:**
1. 👀 **Осматривайся** - изучай локации
2. 🤏 **Взаимодействуй** - кликай на объекты
3. 🚶 **Перемещайся** - ходи между локациями
4. ⚖️ **Управляй ресурсами** - следи за показателями

**Ресурсы:**
☕ **Кофе** - энергия для кодинга
💪 **Мотивация** - желание учиться  
🧠 **Знания** - твой прогресс
😴 **Сон** - отдых и восстановление

**Локации nFactorial:**
🏫 Учебный класс
🏢 Коворкинг зона
🌟 Главный холл
☕ Кафе nFactorial

Удачи в путешествии! 🚀`;

    await safeEditMessage(ctx, helpMessage, { parse_mode: 'Markdown' });
});

// Статистика
bot.action('stats', async (ctx) => {
    await ctx.answerCbQuery('📊 Загружаю твою статистику...');
    
    try {
        const telegramId = ctx.from.id.toString();
        
        // Получаем пользователя из базы
        const user = await User.findOne({ telegramId });
        
        if (!user) {
            const noUserMessage = `📊 **Статистика недоступна**

❌ Сначала нужно войти в игру!

💡 Нажмите "Играть" чтобы создать аккаунт.`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.webApp('🎮 Начать играть!', MINI_APP_URL)]
            ]);

            return await safeEditMessage(ctx, noUserMessage, {
                parse_mode: 'Markdown',
                ...keyboard
            });
        }

        // Получаем DOOM сессию
        const doomSession = await DoomSession.findOne({ userId: user._id });

        // Подсчитываем статистику
        const totalEnemiesKilled = doomSession ? 
            Object.values(doomSession.enemiesKilled).reduce((a, b) => a + b, 0) : 0;
        const playTimeMinutes = doomSession ?
            Math.floor(doomSession.stats.totalPlayTime / 60) : 0;
        const achievementsCount = (user.achievementsUnlocked?.length || 0) + 
                                 (doomSession?.achievements?.length || 0);

        // Определяем ранг
        const getRank = (level) => {
            if (level >= 20) return '👑 Легенда';
            if (level >= 15) return '🏆 Мастер';
            if (level >= 10) return '⭐ Эксперт';
            if (level >= 5) return '🚀 Продвинутый';
            return '🌱 Новичок';
        };

        const statsMessage = `📊 **Статистика ${user.username || user.firstName}**

🎮 **Прогресс:**
• Уровень: ${user.level}/50
• Опыт: ${user.experience}
• Неделя: ${user.currentWeek}/10

⚔️ **DOOM:**
• Врагов убито: ${totalEnemiesKilled}
• Время в игре: ${playTimeMinutes} мин
• Достижений: ${achievementsCount}

🏅 **Ранг:** ${getRank(user.level)}

📅 В игре с: ${user.createdAt?.toLocaleDateString('ru-RU') || 'недавно'}`;

    const keyboard = Markup.inlineKeyboard([
            [Markup.button.webApp('🎮 Продолжить игру!', MINI_APP_URL)]
    ]);

    await safeEditMessage(ctx, statsMessage, {
        parse_mode: 'Markdown',
        ...keyboard
    });

    } catch (error) {
        console.error('❌ Stats callback error:', error);
        await ctx.answerCbQuery('😓 Ошибка загрузки статистики');
    }
});

// Достижения
bot.action('achievements', async (ctx) => {
    await ctx.answerCbQuery('🏆 Загружаю достижения...');
    
    try {
        const telegramId = ctx.from.id.toString();
        
        // Получаем пользователя и его достижения
        const user = await User.findOne({ telegramId });
        
        if (!user) {
            const noUserMessage = `🏆 **Достижения nFactorial Adventures**

❌ Данные недоступны - нужно войти в игру!

🎮 Нажмите "Играть" чтобы создать аккаунт.`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.webApp('🎮 Начать игру!', MINI_APP_URL)]
            ]);

            return await safeEditMessage(ctx, noUserMessage, {
                parse_mode: 'Markdown',
                ...keyboard
            });
        }

        // Получаем DOOM сессию
        const doomSession = await DoomSession.findOne({ userId: user._id });
        
        // Подсчитываем статистику для достижений
        const enemiesKilled = doomSession ? Object.values(doomSession.enemiesKilled).reduce((a, b) => a + b, 0) : 0;
        const itemsCollected = doomSession ? Object.values(doomSession.itemsCollected).reduce((a, b) => a + b, 0) : 0;
        const doomAchievements = doomSession?.achievements || [];
        const globalAchievements = user.achievementsUnlocked || [];
        const totalUnlocked = doomAchievements.length + globalAchievements.length;

        let achievementsText = `🏆 **Достижения ${user.username || user.firstName}**\n\n`;

        // Показываем прогресс
        achievementsText += `📊 **Твой прогресс:** ${totalUnlocked} разблокировано\n\n`;

        // Показываем основные категории достижений
        achievementsText += `🌱 **Первые шаги (DOOM):**\n`;
        if (doomAchievements.find(a => a.id === 'first_kill')) {
            achievementsText += `✅ Первое убийство\n`;
        } else {
            achievementsText += `🔒 Первое убийство - Убей первого врага\n`;
        }

        if (doomAchievements.find(a => a.id === 'collector')) {
            achievementsText += `✅ Коллекционер\n`;
        } else {
            achievementsText += `🔒 Коллекционер - Собери 5 предметов (${itemsCollected}/5)\n`;
        }

        achievementsText += `\n⚔️ **Боевые достижения:**\n`;
        if (doomAchievements.find(a => a.id === 'bug_destroyer')) {
            achievementsText += `✅ Истребитель багов\n`;
        } else {
            const bugKills = doomSession?.enemiesKilled?.bug || 0;
            achievementsText += `🔒 Истребитель багов - Убей 5 багов (${bugKills}/5)\n`;
        }

        if (enemiesKilled >= 10) {
            achievementsText += `✅ Первый охотник\n`;
        } else {
            achievementsText += `🔒 Первый охотник - Убей 10 врагов (${enemiesKilled}/10)\n`;
        }

        achievementsText += `\n🚀 **Прогресс игрока:**\n`;
        if (user.level >= 5) {
            achievementsText += `✅ Продвинутый (уровень 5+)\n`;
        } else {
            achievementsText += `🔒 Продвинутый - Достичь 5 уровня (${user.level}/5)\n`;
        }

        if (user.level >= 10) {
            achievementsText += `✅ Эксперт (уровень 10+)\n`;
        } else {
            achievementsText += `🔒 Эксперт - Достичь 10 уровня (${user.level}/10)\n`;
        }

        achievementsText += `\n🎯 Играй в DOOM, чтобы разблокировать больше!`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.webApp('🎯 За достижениями!', MINI_APP_URL)]
        ]);

        await safeEditMessage(ctx, achievementsText, {
            parse_mode: 'Markdown',
            ...keyboard
        });

    } catch (error) {
        console.error('❌ Achievements callback error:', error);
        await ctx.answerCbQuery('😓 Ошибка загрузки достижений');
    }
});

// Главное меню
bot.action('main_menu', async (ctx) => {
    await ctx.answerCbQuery('🏠 Главное меню');
    
    const welcomeMessage = `🎮 **nFactorial Adventures**

Добро пожаловать в игру про жизнь в буткемпе nFactorial!

🎯 Выбери действие:`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('🎮 ИГРАТЬ', MINI_APP_URL)],
        [
            Markup.button.callback('📊 Моя статистика', 'stats'),
            Markup.button.callback('🏆 Достижения', 'achievements')
        ],
        [
            Markup.button.callback('🏆 Лидерборд', 'leaderboard'),
            Markup.button.callback('❓ Помощь', 'help')
        ]
    ]);

    await safeEditMessage(ctx, welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard.reply_markup
    });
});

// ===== ТЕКСТОВЫЕ СООБЩЕНИЯ =====

// Обработка обычных сообщений
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    
    // Игнорируем команды
    if (text.startsWith('/')) return;
    
    const responses = [
        '🎮 Готов играть в nFactorial Adventures? Нажми /game',
        '💻 Хочешь стать крутым разработчиком? Начни игру!',
        '☕ Время для кодинга! Запускай игру командой /start',
        '🚀 nFactorial ждет тебя! Используй /help если нужна помощь'
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('🎮 Играть!', MINI_APP_URL)]
    ]);
    
    await ctx.reply(randomResponse, keyboard);
});

// ===== СПЕЦИАЛЬНЫЕ КОМАНДЫ =====

// Команда для разработки - проверка статуса
bot.command('debug', async (ctx) => {
    const debugInfo = `🔧 **Debug Info**

🤖 Bot: Running
🌐 Server: ${MINI_APP_URL}
👤 User: ${ctx.from.username || ctx.from.first_name}
💬 Chat ID: ${ctx.chat.id}
⏰ Time: ${new Date().toLocaleString('ru-RU')}

✅ All systems operational!`;

    await ctx.reply(debugInfo, { parse_mode: 'Markdown' });
});

// Команда для админов
bot.command('admin', async (ctx) => {
    // Здесь можно добавить проверку на админа
    const adminMessage = `👨‍💼 **Админ панель**

📊 Статистика сервера:
• Активных пользователей: 0
• Игр сыграно: 0  
• Время работы: ${Math.floor(process.uptime() / 60)} мин

🎮 Управление игрой:
• Restart server: /restart
• View logs: /logs
• Send announcement: /announce`;

    await ctx.reply(adminMessage, { parse_mode: 'Markdown' });
});

// ===== ERROR HANDLING =====

// Обработка ошибок
bot.catch(async (err, ctx) => {
    console.error('❌ Bot error:', err);
    
    try {
        await ctx.reply('😓 Произошла ошибка. Попробуйте еще раз или используйте /start');
    } catch (replyError) {
        console.error('❌ Error sending error message:', replyError);
    }
});

// Graceful shutdown
process.once('SIGINT', () => {
    console.log('🛑 Received SIGINT, stopping bot...');
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, stopping bot...');
    bot.stop('SIGTERM');
});

// Запуск бота
const startBot = async () => {
    try {
        await bot.launch();
        console.log('✅ Bot started successfully!');
        console.log(`🔗 @${bot.botInfo?.username || 'unknown'} is running`);
    } catch (error) {
        console.error('❌ Failed to start bot:', error);
        process.exit(1);
    }
};

// Экспорт для использования в server.js
module.exports = { bot, startBot }; 