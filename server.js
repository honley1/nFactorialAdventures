const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Запуск Telegram бота (Telegraf)
const { startBot } = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

// Security и performance middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "https:"]
        }
    }
}));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Статические файлы для Telegram Mini App
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true
}));

// Подключение к MongoDB
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('🚀 Connected to MongoDB'))
        .catch(err => console.error('❌ MongoDB connection error:', err));
} else {
    console.warn('⚠️  MONGO_URI not set, running without database');
}

// Import routes
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const leaderboardRoutes = require('./routes/leaderboard');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'nFactorial Adventures',
        version: '1.0.0',
        bot: 'Running (Telegraf)'
    });
});

// Root route - serve Mini App
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server and bot
const startServer = async () => {
    try {
        // Запускаем Telegram бота
        await startBot();
        
        // Запускаем Express сервер
        app.listen(PORT, () => {
            console.log('🎮 nFactorial Adventures Server');
            console.log(`🌐 Running on port ${PORT}`);
            console.log(`📱 Telegram Mini App: http://localhost:${PORT}`);
            console.log('🔗 Use ngrok for HTTPS: npx ngrok http 3000');
            console.log('🤖 Telegram Bot: Running (Telegraf)');
            
            if (process.env.NODE_ENV === 'development') {
                console.log('🔧 Development mode enabled');
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Shutting down server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Shutting down server...');
    process.exit(0);
});

// Запуск приложения
startServer(); 