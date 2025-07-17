const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();

// Инициализация бота
const bot = new Telegraf(process.env.BOT_TOKEN);

// URL Mini App
const MINI_APP_URL = process.env.FRONTEND_URL || 'https://eed58e0935c7.ngrok-free.app';

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

// Команда /start
bot.start(async (ctx) => {
    const firstName = ctx.from.first_name || 'Студент';
    
    const welcomeMessage = `🎮 **Добро пожаловать в nFactorial Adventures!**

Привет, ${firstName}! 👋

Это уникальная игра-симулятор студенческой жизни в nFactorial Bootcamp! Ты пройдешь все 10 недель обучения, будешь управлять ресурсами, кодить, общаться с менторами и переживать настоящие студенческие приключения.

🎯 **Особенности игры:**
☕ Управляй кофе, мотивацией, знаниями и сном
💻 Кодь на React, JavaScript и других технологиях  
👨‍🏫 Общайся с менторами и получай советы
🏢 Исследуй локации nFactorial
🏆 Собирай достижения и поднимайся в рейтинге

📱 **Игра работает в 2D от первого лица!**
Просто осматривайся и кликай на объекты для взаимодействия.

🚀 Готов начать свое путешествие в мир nFactorial?`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('🎮 Начать игру!', MINI_APP_URL)],
        [
            Markup.button.callback('📚 Правила игры', 'rules'),
            Markup.button.callback('🏆 Лидерборд', 'leaderboard')
        ],
        [Markup.button.callback('❓ Помощь', 'help')]
    ]);

    try {
        await ctx.replyWithPhoto(
            { source: './nfact.png' },
            {
                caption: welcomeMessage,
                parse_mode: 'Markdown',
                ...keyboard
            }
        );
    } catch (error) {
        console.error('❌ Error sending photo:', error);
        // Fallback: отправляем текстовое сообщение
        await ctx.reply(welcomeMessage, {
            parse_mode: 'Markdown',
            ...keyboard
        });
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

// Команда /help
bot.help(async (ctx) => {
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

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// Команда /stats
bot.command('stats', async (ctx) => {
    // Здесь можно добавить запрос к базе данных
    const statsMessage = `📊 **Твоя статистика**

🎮 Игры сыграно: 0
⏱️ Время в игре: 0 мин
🏆 Достижений: 0/25
📊 Очки: 0

🏅 Твой ранг: Новичок 🌱

💡 Начни играть, чтобы увидеть статистику!`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('🎮 Играть сейчас!', MINI_APP_URL)]
    ]);

    await ctx.reply(statsMessage, {
        parse_mode: 'Markdown',
        ...keyboard
    });
});

// Команда /leaderboard
bot.command('leaderboard', async (ctx) => {
    const leaderboardMessage = `🏆 **Топ игроков nFactorial Adventures**

1. 👑 @student1 - 10,250 очков
2. 🥈 @coder_pro - 8,900 очков  
3. 🥉 @react_master - 7,650 очков
4. 🏅 @js_ninja - 6,420 очков
5. 🏅 @frontend_guru - 5,880 очков

*Твое место будет здесь после первой игры!*

💡 Зарабатывай очки:
• Кодь на компьютерах (+50)
• Общайся с менторами (+30)
• Выполняй проекты (+100-1000)
• Собирай достижения (+100)`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Подняться в рейтинге!', MINI_APP_URL)]
    ]);

    await ctx.reply(leaderboardMessage, {
        parse_mode: 'Markdown',
        ...keyboard
    });
});

// ===== CALLBACK HANDLERS =====

// Правила игры
bot.action('rules', async (ctx) => {
    await ctx.answerCbQuery();
    
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

    await ctx.editMessageText(rulesMessage, { parse_mode: 'Markdown' });
});

// Лидерборд
bot.action('leaderboard', async (ctx) => {
    await ctx.answerCbQuery('🏆 Открываю лидерборд...');
    
    const leaderboardMessage = `🏆 **Топ игроков nFactorial Adventures**

1. 👑 @student1 - 10,250 очков
2. 🥈 @coder_pro - 8,900 очков  
3. 🥉 @react_master - 7,650 очков
4. 🏅 @js_ninja - 6,420 очков
5. 🏅 @frontend_guru - 5,880 очков

*Твое место будет здесь после первой игры!*

💡 Зарабатывай очки:
• Кодь на компьютерах (+50)
• Общайся с менторами (+30)
• Выполняй проекты (+100-1000)
• Собирай достижения (+100)`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Подняться в рейтинге!', MINI_APP_URL)]
    ]);

    await ctx.editMessageText(leaderboardMessage, {
        parse_mode: 'Markdown',
        ...keyboard
    });
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

    await ctx.editMessageText(helpMessage, { parse_mode: 'Markdown' });
});

// Статистика
bot.action('stats', async (ctx) => {
    await ctx.answerCbQuery('📊 Загружаю твою статистику...');
    
    // Здесь можно добавить запрос к базе данных
    const statsMessage = `📊 **Твоя статистика**

🎮 Игры сыграно: 0
⏱️ Время в игре: 0 мин
🏆 Достижений: 0/25
📊 Очки: 0

🏅 Твой ранг: Новичок 🌱

💡 Начни играть, чтобы увидеть статистику!`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('🎮 Играть сейчас!', MINI_APP_URL)]
    ]);

    await ctx.editMessageText(statsMessage, {
        parse_mode: 'Markdown',
        ...keyboard
    });
});

// Достижения
bot.action('achievements', async (ctx) => {
    await ctx.answerCbQuery('🏆 Загружаю достижения...');
    
    const achievementsMessage = `🏆 **Достижения nFactorial Adventures**

**Доступные достижения (25):**

🌱 **Первые шаги:**
• Первый вход - Войти в игру
• Первый кофе - Выпить кофе 
• Знакомство с ментором - Поговорить с ментором

💻 **Обучение:**
• Первый код - Написать код на компьютере
• Знания = сила - Достичь 100 знаний
• Середина пути - Достичь 5 уровня

🚀 **Проекты:**
• Первый проект - Завершить проект
• Мастер проектов - Завершить 10 проектов

☕ **Преданность:**
• Кофеман - Выпить 100 чашек кофе
• Сова - Играть ночью

⭐ **Специальные:**
• Перфекционист - Идеальная неделя
• Легенда nFactorial - Максимальный уровень

🎮 Начни играть, чтобы разблокировать!`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('🎯 Начать охоту за достижениями!', MINI_APP_URL)]
    ]);

    await ctx.editMessageText(achievementsMessage, {
        parse_mode: 'Markdown',
        ...keyboard
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