const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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
        await safeEditMessage(ctx, text, options);
    } catch (error) {
        // Если не получается редактировать (медиа сообщение), отправляем новое
        await ctx.reply(text, options);
    }
};

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
    const achievementsMessage = `🏅 **Твои достижения**

**Разблокированные:**
✅ 🎉 **Первые шаги** - Зарегистрировался в игре
✅ ☕ **Первый кофе** - Выпил первую чашку кофе

**Заблокированные:**
🔒 🤝 **Социальная бабочка** - Поговори с 10 разными NPC
🔒 💻 **Код-мастер** - Напиши 100 строк кода
🔒 🧠 **Знаток** - Набери 1000 очков знаний
🔒 💪 **Мотиватор** - Поддержи мотивацию на максимуме 7 дней
🔒 😴 **Здоровый сон** - Спи 8+ часов каждую ночь неделю
🔒 🏆 **Топ студент** - Попади в топ-3 лидерборда
🔒 📚 **Книголюб** - Изучи все материалы курса
🔒 🎯 **Финишер** - Заверши все 10 недель bootcamp
🔒 👑 **Легенда nFactorial** - Получи все остальные достижения

*Всего достижений: 2/10*

Продолжай играть чтобы разблокировать больше! 🚀`;

    await ctx.reply(achievementsMessage, { parse_mode: 'Markdown' });
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

    await safeEditMessage(ctx, leaderboardMessage, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🎮 Играть', 'game')],
            [Markup.button.callback('🏠 Главное меню', 'main_menu')]
        ])
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

    await safeEditMessage(ctx, helpMessage, { parse_mode: 'Markdown' });
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

    await safeEditMessage(ctx, statsMessage, {
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

    await safeEditMessage(ctx, achievementsMessage, {
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