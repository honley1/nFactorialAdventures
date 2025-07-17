// nFactorial DOOM - Полный движок с raycasting
class NFactorialDoom {
    constructor() {
        // Настройки Telegram
        this.tg = window.Telegram?.WebApp;
        this.user = null;
        this.gameSession = null;

        // Игровой мир (16x16 карта)
        this.worldMap = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,1,1,1,0,0,0,0,1,1,1,0,0,1],
            [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
            [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
            [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
            [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
            [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
            [1,0,0,1,1,1,0,0,0,0,1,1,1,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];

        // Игрок
        this.player = {
            x: 8.5,        // Позиция X
            y: 8.5,        // Позиция Y  
            angle: 0,      // Угол поворота
            health: 100,   // Здоровье
            armor: 100,    // Броня
            ammo: 50,      // Патроны
            moveSpeed: 0.05,
            turnSpeed: 0.03
        };

        // НПС система
        this.npcs = [
            {
                id: 'mentor_alex',
                name: 'Ментор Алекс',
                x: 2, y: 2,
                sprite: '👨‍💻',
                dialogue: [
                    'Добро пожаловать в nFactorial DOOM!',
                    'Тебе предстоит пройти через лабиринт буткемпа.',
                    'Собирай кофе ☕, изучай материалы 📚, и остерегайся багов 🐛!'
                ],
                currentDialogue: 0
            },
            {
                id: 'student_helper',
                name: 'Студент-помощник',
                x: 14, y: 2,
                sprite: '🧑‍🎓',
                dialogue: [
                    'Здесь полно дедлайнов! Будь осторожен!',
                    'Если кончится мотивация, игра закончится...'
                ],
                currentDialogue: 0
            }
        ];

        // Враги - размещаем их подальше от игрока
        this.enemies = [
            { id: 'bug1', type: 'bug', x: 3, y: 3, health: 30, sprite: '🐛', lastAttack: 0 },
            { id: 'deadline1', type: 'deadline', x: 13, y: 13, health: 50, sprite: '⏰', lastAttack: 0 }
        ];

        // Предметы для сбора - размещаем в безопасных местах
        this.items = [
            { id: 'coffee1', type: 'coffee', x: 2, y: 8, sprite: '☕', value: 25 },
            { id: 'book1', type: 'knowledge', x: 14, y: 2, sprite: '📚', value: 10 },
            { id: 'energy1', type: 'motivation', x: 2, y: 12, sprite: '💪', value: 20 }
        ];

        // Настройки raycasting
        this.fov = Math.PI / 3;      // 60° поле зрения
        this.rayCount = 320;         // Количество лучей
        this.maxDistance = 16;       // Максимальная дистанция
        
        // Canvas и контекст
        this.canvas = null;
        this.ctx = null;
        this.minimapCanvas = null;
        this.minimapCtx = null;

        // Состояние управления
        this.keys = {};
        this.mouse = { locked: false, sensitivity: 0.002 };
        this.mobile = this.isMobile();
        this.joystick = { active: false, centerX: 0, centerY: 0, knobX: 0, knobY: 0 };

        // Состояние игры
        this.gameState = 'loading';  // loading, menu, playing, paused
        this.dialogue = { active: false, npc: null, messageIndex: 0 };
        
        // === СИСТЕМА ЗВУКОВ ===
        this.sounds = {
            gun: null,
            hurt: null
        };
        this.audioManager = {
            enabled: true,
            volume: 0.5
        };
        
        // === СИСТЕМА ПУЛЬ/ПАТРОНОВ ===
        this.bullets = []; // Массив летящих пуль
        this.bulletSpeed = 0.15; // Скорость полета пули
        this.bulletLifetime = 2000; // Время жизни пули в мс
        
        this.init();
    }

    // Инициализация
    async init() {
        console.log('🎮 Инициализация nFactorial DOOM...');
        
        try {
            // Инициализация Telegram
            this.initTelegram();
            
            // Инициализация звуков
            this.initSounds();
            
            // Показать экран загрузки
            this.showScreen('loading-screen');
            await this.simulateLoading();
            
            // Авторизация
            await this.authenticateUser();
            
            // Переход в меню
            this.gameState = 'menu';
            this.showScreen('menu-screen');
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            this.showNotification('Ошибка загрузки игры', 'error');
        }
    }

    // === СИСТЕМА ЗВУКОВ ===
    
    // Инициализация звуков
    initSounds() {
        try {
            console.log('🎵 Инициализация звуковой системы...');
            
            // Создание Audio объектов
            this.sounds.gun = new Audio('gun.mp3');
            this.sounds.hurt = new Audio('hurt.mp3');
            
            // Настройка звуков
            Object.values(this.sounds).forEach(sound => {
                if (sound) {
                    sound.volume = this.audioManager.volume;
                    sound.preload = 'auto';
                    
                    // Обработка ошибок загрузки
                    sound.addEventListener('error', (e) => {
                        console.warn(`⚠️ Ошибка загрузки звука:`, e);
                    });
                }
            });
            
            console.log('✅ Звуковая система инициализирована');
        } catch (error) {
            console.warn('⚠️ Ошибка инициализации звуков:', error);
            this.audioManager.enabled = false;
        }
    }
    
    // Воспроизведение звука
    playSound(soundName) {
        if (!this.audioManager.enabled || !this.sounds[soundName]) return;
        
        try {
            const sound = this.sounds[soundName];
            sound.currentTime = 0; // Сброс к началу для повторного воспроизведения
            sound.volume = this.audioManager.volume;
            
            const playPromise = sound.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn(`⚠️ Ошибка воспроизведения звука ${soundName}:`, error);
                });
            }
        } catch (error) {
            console.warn(`⚠️ Ошибка при попытке воспроизвести звук ${soundName}:`, error);
        }
    }
    
    // Управление громкостью
    setVolume(volume) {
        this.audioManager.volume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach(sound => {
            if (sound) sound.volume = this.audioManager.volume;
        });
    }
    
    // Включение/выключение звуков
    toggleSounds() {
        this.audioManager.enabled = !this.audioManager.enabled;
        console.log(`🔊 Звуки: ${this.audioManager.enabled ? 'включены' : 'выключены'}`);
    }

    // === СИСТЕМА ПУЛЬ/ПАТРОНОВ ===
    
    // Создание пули
    createBullet(startX, startY, angle) {
        const bullet = {
            id: Date.now() + Math.random(), // Уникальный ID
            x: startX,
            y: startY,
            angle: angle,
            speed: this.bulletSpeed,
            startTime: Date.now(),
            alive: true,
            // Направление движения
            dx: Math.cos(angle) * this.bulletSpeed,
            dy: Math.sin(angle) * this.bulletSpeed
        };
        
        this.bullets.push(bullet);
        console.log(`🔫 Пуля выпущена: ${bullet.id}`);
        return bullet;
    }
    
    // Обновление пуль
    updateBullets() {
        const currentTime = Date.now();
        
        this.bullets = this.bullets.filter(bullet => {
            if (!bullet.alive) return false;
            
            // Проверка времени жизни
            if (currentTime - bullet.startTime > this.bulletLifetime) {
                console.log(`💨 Пуля ${bullet.id} исчезла (время жизни)`);
                return false;
            }
            
            // Движение пули
            bullet.x += bullet.dx;
            bullet.y += bullet.dy;
            
            // Проверка коллизии со стенами
            if (this.isWall(Math.floor(bullet.x), Math.floor(bullet.y))) {
                console.log(`💥 Пуля ${bullet.id} попала в стену`);
                return false;
            }
            
            // Проверка коллизии с врагами
            this.enemies.forEach(enemy => {
                if (enemy.health <= 0) return;
                
                const dx = enemy.x - bullet.x;
                const dy = enemy.y - bullet.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 0.3) { // Радиус попадания
                    const damage = 25;
                    enemy.health -= damage;
                    bullet.alive = false;
                    
                    console.log(`🎯 Пуля ${bullet.id} попала в ${enemy.type}! Урон: ${damage}`);
                    this.showNotification(`Попадание! -${damage} HP`, 'success');
                    
                    if (enemy.health <= 0) {
                        this.showNotification(`${enemy.type === 'bug' ? 'Баг' : 'Дедлайн'} уничтожен!`, 'success');
                        // DOOM интеграция: Записываем убийство врага
                        this.recordEnemyKill(enemy);
                    }
                }
            });
            
            return bullet.alive;
        });
    }
    
    // Рендеринг пуль
    renderBullets() {
        this.bullets.forEach(bullet => {
            if (!bullet.alive) return;
            
            const dx = bullet.x - this.player.x;
            const dy = bullet.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > this.maxDistance) return;
            
            // Угол к пуле
            const angle = Math.atan2(dy, dx);
            let angleDiff = angle - this.player.angle;
            
            // Нормализация угла
            if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            // Проверка видимости
            if (Math.abs(angleDiff) > this.fov / 2) return;
            
            // Позиция на экране
            const screenX = (this.canvas.width / 2) + (angleDiff / this.fov) * this.canvas.width;
            const bulletSize = Math.max(2, (this.canvas.height / distance) * 0.02);
            const screenY = (this.canvas.height / 2) - bulletSize / 2;
            
            // Рендер пули как желтая точка
            this.ctx.fillStyle = '#ffff00';
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, bulletSize, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    // Инициализация Telegram
    initTelegram() {
        if (this.tg) {
            this.tg.ready();
            this.tg.expand();
            console.log('📱 Telegram WebApp инициализирован');
        }
    }

    // Симуляция загрузки
    async simulateLoading() {
        const progressBar = document.getElementById('loading-progress');
        const loadingTexts = [
            'Загружаем лабиринты буткемпа...',
            'Готовим кофе для студентов...',
            'Компилируем код менторов...',
            'Инициализируем систему багов...',
            'Создаем дедлайны...'
        ];
        
        for (let i = 0; i <= 100; i += 2) {
            progressBar.style.width = i + '%';
            
            if (i % 20 === 0) {
                const textIndex = Math.floor(i / 20);
                if (loadingTexts[textIndex]) {
                    document.querySelector('.loading-text').textContent = loadingTexts[textIndex];
                }
            }
            
            await this.delay(30);
        }
    }

    // Авторизация пользователя
    async authenticateUser() {
        try {
            const userData = {
                telegramId: this.tg?.initDataUnsafe?.user?.id || '12345',
                username: this.tg?.initDataUnsafe?.user?.username || 'TestUser',
                avatar: 'doomguy',
                first_name: this.tg?.initDataUnsafe?.user?.first_name || 'Test'
            };

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();
            
            if (result.success) {
                this.user = result.user;
                this.gameSession = result.gameSession;
                this.updatePlayerInfo();
                console.log('✅ Авторизация успешна:', this.user.username);
                
                // DOOM интеграция: Инициализация DOOM сессии
                await this.initDoomSession();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('❌ Ошибка авторизации:', error);
            this.showNotification('Ошибка входа в систему', 'error');
            throw error; // Прерываем инициализацию вместо fallback
        }
    }

    // Обновление информации о игроке
    updatePlayerInfo() {
        if (this.user) {
            document.getElementById('player-name').textContent = this.user.username;
            document.getElementById('player-level').textContent = `Уровень ${this.user.level}`;
            
            // Обновляем полоску опыта
            const currentExp = this.user.experience || 0;
            const requiredExp = this.user.level * 100; // Синхронизировано с бэкендом
            const expProgress = Math.min(100, (currentExp / requiredExp) * 100);
            
            document.getElementById('exp-fill').style.width = expProgress + '%';
            document.getElementById('exp-text').textContent = `${currentExp}/${requiredExp} EXP`;
        }
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Кнопки меню
        document.getElementById('start-game')?.addEventListener('click', () => this.startGame());
        document.getElementById('settings-btn')?.addEventListener('click', () => this.showSettings());
        document.getElementById('leaderboard-btn')?.addEventListener('click', () => this.showLeaderboard());
        
        // Кнопки паузы
        document.getElementById('resume-btn')?.addEventListener('click', () => this.resumeGame());
        document.getElementById('menu-btn')?.addEventListener('click', () => this.goToMenu());
        document.getElementById('restart-btn')?.addEventListener('click', () => this.restartGame());
        
        // Настройки
        document.getElementById('save-settings')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('close-settings')?.addEventListener('click', () => this.closeSettings());
        
        // Настройки звука
        const volumeSlider = document.getElementById('volume-slider');
        const volumeValue = document.getElementById('volume-value');
        const soundToggle = document.getElementById('sound-toggle');
        
        volumeSlider?.addEventListener('input', (e) => {
            const volume = parseInt(e.target.value) / 100;
            this.setVolume(volume);
            if (volumeValue) volumeValue.textContent = `${e.target.value}%`;
        });
        
        soundToggle?.addEventListener('change', (e) => {
            this.audioManager.enabled = e.target.checked;
            console.log(`🔊 Звуки: ${this.audioManager.enabled ? 'включены' : 'выключены'}`);
        });
        
        // Диалоги
        document.getElementById('dialogue-continue')?.addEventListener('click', () => this.continueDialogue());
        
        // Клавиатура
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Мобильные контроли
        if (this.mobile) {
            this.setupMobileControls();
        }
        
        // Кнопка Escape для паузы
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.gameState === 'playing') {
                this.pauseGame();
            }
        });
    }

    // Настройка мобильных контролей
    setupMobileControls() {
        const joystick = document.getElementById('movement-joystick');
        const shootBtn = document.getElementById('shoot-btn');
        const interactBtn = document.getElementById('interact-btn');
        const turnLeftBtn = document.getElementById('turn-left-btn');
        const turnRightBtn = document.getElementById('turn-right-btn');

        // Виртуальный джойстик
        joystick?.addEventListener('touchstart', (e) => this.handleJoystickStart(e));
        joystick?.addEventListener('touchmove', (e) => this.handleJoystickMove(e));
        joystick?.addEventListener('touchend', (e) => this.handleJoystickEnd(e));

        // Кнопки действий
        shootBtn?.addEventListener('touchstart', () => this.shoot());
        interactBtn?.addEventListener('touchstart', () => this.interact());
        turnLeftBtn?.addEventListener('touchstart', () => this.keys['ArrowLeft'] = true);
        turnLeftBtn?.addEventListener('touchend', () => this.keys['ArrowLeft'] = false);
        turnRightBtn?.addEventListener('touchstart', () => this.keys['ArrowRight'] = true);
        turnRightBtn?.addEventListener('touchend', () => this.keys['ArrowRight'] = false);
    }

    // Обработка джойстика
    handleJoystickStart(e) {
        e.preventDefault();
        const rect = e.target.getBoundingClientRect();
        this.joystick.centerX = rect.left + rect.width / 2;
        this.joystick.centerY = rect.top + rect.height / 2;
        this.joystick.active = true;
    }

    handleJoystickMove(e) {
        if (!this.joystick.active) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.joystick.centerX;
        const deltaY = touch.clientY - this.joystick.centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = 40;
        
        if (distance <= maxDistance) {
            this.joystick.knobX = deltaX;
            this.joystick.knobY = deltaY;
        } else {
            this.joystick.knobX = (deltaX / distance) * maxDistance;
            this.joystick.knobY = (deltaY / distance) * maxDistance;
        }
        
        // Обновить визуальное положение
        const knob = document.querySelector('.joystick-knob');
        knob.style.transform = `translate(calc(-50% + ${this.joystick.knobX}px), calc(-50% + ${this.joystick.knobY}px))`;
        
        // Установить клавиши движения
        this.keys['KeyW'] = this.joystick.knobY < -10;
        this.keys['KeyS'] = this.joystick.knobY > 10;
        this.keys['KeyA'] = this.joystick.knobX < -10;
        this.keys['KeyD'] = this.joystick.knobX > 10;
    }

    handleJoystickEnd(e) {
        e.preventDefault();
        this.joystick.active = false;
        this.joystick.knobX = 0;
        this.joystick.knobY = 0;
        
        // Сбросить визуальное положение
        const knob = document.querySelector('.joystick-knob');
        knob.style.transform = 'translate(-50%, -50%)';
        
        // Очистить клавиши движения
        this.keys['KeyW'] = false;
        this.keys['KeyS'] = false;
        this.keys['KeyA'] = false;
        this.keys['KeyD'] = false;
    }

    // Обработка клавиш
    handleKeyDown(e) {
        this.keys[e.code] = true;
        
        // Специальные клавиши
        if (e.code === 'Space') {
            e.preventDefault();
            this.shoot();
        }
        if (e.code === 'KeyE' || e.code === 'Enter') {
            this.interact();
        }
    }

    handleKeyUp(e) {
        this.keys[e.code] = false;
    }

    // Проверка мобильного устройства
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Начать игру
    async startGame() {
        console.log('🎮 Запуск игры...');
        
        // Проверяем начальное состояние игрока
        console.log('👤 Игрок инициализирован:', {
            position: `${this.player.x}, ${this.player.y}`,
            health: this.player.health,
            armor: this.player.armor,
            ammo: this.player.ammo
        });
        
        console.log('👹 Враги инициализированы:', this.enemies.map(e => 
            `${e.type} в позиции ${e.x}, ${e.y} (HP: ${e.health})`
        ));
        
        this.gameState = 'playing';
        this.showScreen('game-screen');
        
        // Инициализация canvas
        this.initCanvas();
        
        // Настройка управления мышью для десктопа
        if (!this.mobile) {
            this.setupMouseControls();
        }
        
        // Запуск игрового цикла
        this.startGameLoop();
        
        // DOOM интеграция: Запуск автосинхронизации
        this.startAutoSync();
        
        // Показать уведомление
        this.showNotification('Добро пожаловать в nFactorial DOOM!', 'info');
    }

    // Инициализация canvas
    initCanvas() {
        // Основной canvas
        this.canvas = document.getElementById('doom-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Minimap canvas
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        
        // Размеры
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Отключить сглаживание для пиксельного стиля
        this.ctx.imageSmoothingEnabled = false;
        this.minimapCtx.imageSmoothingEnabled = false;
    }

    // Изменение размера canvas
    resizeCanvas() {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    // Настройка управления мышью
    setupMouseControls() {
        this.canvas.addEventListener('click', () => {
            this.canvas.requestPointerLock();
        });
        
        document.addEventListener('pointerlockchange', () => {
            this.mouse.locked = document.pointerLockElement === this.canvas;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.mouse.locked && this.gameState === 'playing') {
                this.player.angle += e.movementX * this.mouse.sensitivity;
                
                // Ограничение угла от 0 до 2π
                if (this.player.angle < 0) this.player.angle += Math.PI * 2;
                if (this.player.angle >= Math.PI * 2) this.player.angle -= Math.PI * 2;
            }
        });
    }

    // Запуск игрового цикла
    startGameLoop() {
        console.log('🎮 Запуск игрового цикла...');
        
        // Добавляем задержку перед началом обновлений (защита от мгновенного урона)
        let gameStarted = false;
        setTimeout(() => {
            gameStarted = true;
            console.log('✅ Игра активна');
        }, 1000);
        
        const gameLoop = () => {
            if (this.gameState === 'playing' && gameStarted) {
                this.update();
                this.render();
            } else if (this.gameState === 'playing') {
                // Только рендер в первую секунду
                this.render();
            }
            requestAnimationFrame(gameLoop);
        };
        gameLoop();
    }

    // Обновление игрового состояния
    update() {
        this.updatePlayer();
        this.updateEnemies();
        this.updateBullets(); // Обновление пуль
        this.checkCollisions();
        this.checkInteractions();
    }

    // Обновление игрока
    updatePlayer() {
        let moveX = 0;
        let moveY = 0;
        
        // Движение вперед/назад
        if (this.keys['KeyW']) {
            moveX += Math.cos(this.player.angle) * this.player.moveSpeed;
            moveY += Math.sin(this.player.angle) * this.player.moveSpeed;
        }
        if (this.keys['KeyS']) {
            moveX -= Math.cos(this.player.angle) * this.player.moveSpeed;
            moveY -= Math.sin(this.player.angle) * this.player.moveSpeed;
        }
        
        // Движение влево/вправо (стрейф)
        if (this.keys['KeyA']) {
            moveX += Math.cos(this.player.angle - Math.PI/2) * this.player.moveSpeed;
            moveY += Math.sin(this.player.angle - Math.PI/2) * this.player.moveSpeed;
        }
        if (this.keys['KeyD']) {
            moveX += Math.cos(this.player.angle + Math.PI/2) * this.player.moveSpeed;
            moveY += Math.sin(this.player.angle + Math.PI/2) * this.player.moveSpeed;
        }
        
        // Поворот (клавиши стрелок)
        if (this.keys['ArrowLeft']) {
            this.player.angle -= this.player.turnSpeed;
        }
        if (this.keys['ArrowRight']) {
            this.player.angle += this.player.turnSpeed;
        }
        
        // Ограничение угла
        if (this.player.angle < 0) this.player.angle += Math.PI * 2;
        if (this.player.angle >= Math.PI * 2) this.player.angle -= Math.PI * 2;
        
        // Проверка коллизий и движение
        const newX = this.player.x + moveX;
        const newY = this.player.y + moveY;
        
        if (!this.isWall(Math.floor(newX), Math.floor(this.player.y))) {
            this.player.x = newX;
        }
        if (!this.isWall(Math.floor(this.player.x), Math.floor(newY))) {
            this.player.y = newY;
        }
    }

    // Обновление врагов
    updateEnemies() {
        this.enemies.forEach(enemy => {
            if (enemy.health <= 0) return;
            
            // Простая ИИ: движение к игроку только если он достаточно близко
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Враги начинают преследовать только с определенного расстояния
            const activationDistance = enemy.type === 'deadline' ? 4 : 3;
            const attackDistance = 0.8; // Минимальное расстояние для атаки
            
            if (distance > attackDistance && distance < activationDistance) {
                const moveSpeed = enemy.type === 'deadline' ? 0.015 : 0.01;
                const moveX = (dx / distance) * moveSpeed;
                const moveY = (dy / distance) * moveSpeed;
                
                // Проверяем коллизии со стенами перед движением
                const newX = enemy.x + moveX;
                const newY = enemy.y + moveY;
                
                if (!this.isWall(Math.floor(newX), Math.floor(enemy.y))) {
                    enemy.x = newX;
                }
                if (!this.isWall(Math.floor(enemy.x), Math.floor(newY))) {
                    enemy.y = newY;
                }
            }
        });
    }

    // Проверка коллизий
    checkCollisions() {
        const currentTime = Date.now();
        
        // Коллизии с врагами
        this.enemies.forEach(enemy => {
            if (enemy.health <= 0) return;
            
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 0.5) {
                // Проверяем кулдаун атаки (1 секунда)
                if (currentTime - enemy.lastAttack > 1000) {
                    const damage = enemy.type === 'deadline' ? 10 : 5;
                    console.log(`💥 ${enemy.type} атакует! Урон: ${damage}, HP было: ${this.player.health}`);
                    
                    // Звук получения урона
                    this.playSound('hurt');
                    
                    this.player.health -= damage;
                    enemy.lastAttack = currentTime;
                    console.log(`❤️ HP стало: ${this.player.health}`);
                    this.showNotification(`Получен урон: ${damage}`, 'damage');
                    
                    if (this.player.health <= 0) {
                        console.log('💀 Игрок погиб!');
                        this.gameOver();
                        return;
                    }
                }
                
                // Отталкивание
                const pushDistance = 0.3;
                enemy.x -= (dx / distance) * pushDistance;
                enemy.y -= (dy / distance) * pushDistance;
            }
        });
    }

    // Проверка взаимодействий
    checkInteractions() {
        // Сбор предметов
        this.items = this.items.filter(item => {
            const dx = this.player.x - item.x;
            const dy = this.player.y - item.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 0.5) {
                this.collectItem(item);
                return false; // Удалить предмет
            }
            return true;
        });
    }

    // Сбор предмета
    collectItem(item) {
        switch (item.type) {
            case 'coffee':
                this.player.health = Math.min(100, this.player.health + item.value);
                this.showNotification(`+${item.value} здоровья ☕`, 'success');
                break;
            case 'knowledge':
                this.player.ammo = Math.min(100, this.player.ammo + item.value);
                this.showNotification(`+${item.value} патронов 📚`, 'success');
                break;
            case 'motivation':
                this.player.armor = Math.min(100, this.player.armor + item.value);
                this.showNotification(`+${item.value} брони 💪`, 'success');
                break;
        }
        
        this.updateHUD();
        
        // DOOM интеграция: Записываем сбор предмета
        this.recordItemCollection(item);
    }

    // Проверка стены
    isWall(x, y) {
        if (x < 0 || x >= this.worldMap[0].length || y < 0 || y >= this.worldMap.length) {
            return true;
        }
        return this.worldMap[y][x] === 1;
    }

    // Стрельба
    shoot() {
        if (this.player.ammo <= 0) {
            this.showNotification('Нет патронов!', 'warning');
            return;
        }
        
        // Звук выстрела
        this.playSound('gun');
        
        // Уменьшаем патроны
        this.player.ammo--;
        this.updateHUD();
        
        // Создаем пулю
        const bulletStartX = this.player.x + Math.cos(this.player.angle) * 0.3;
        const bulletStartY = this.player.y + Math.sin(this.player.angle) * 0.3;
        this.createBullet(bulletStartX, bulletStartY, this.player.angle);
        
        console.log(`🔫 Выстрел! Патронов осталось: ${this.player.ammo}`);
    }

    // Взаимодействие
    interact() {
        // Поиск ближайшего НПС
        let nearestNPC = null;
        let minDistance = Infinity;
        
        this.npcs.forEach(npc => {
            const dx = npc.x - this.player.x;
            const dy = npc.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 1.5 && distance < minDistance) {
                minDistance = distance;
                nearestNPC = npc;
            }
        });
        
        if (nearestNPC) {
            this.startDialogue(nearestNPC);
        }
    }

    // Начать диалог
    startDialogue(npc) {
        this.dialogue.active = true;
        this.dialogue.npc = npc;
        this.dialogue.messageIndex = 0;
        
        this.showDialogue();
    }

    // Показать диалог
    showDialogue() {
        const dialogueBox = document.getElementById('dialogue-box');
        const npcName = document.getElementById('npc-name');
        const dialogueMessage = document.getElementById('dialogue-message');
        const npcAvatar = document.getElementById('npc-avatar');
        
        const npc = this.dialogue.npc;
        const message = npc.dialogue[this.dialogue.messageIndex];
        
        npcName.textContent = npc.name;
        dialogueMessage.textContent = message;
        npcAvatar.textContent = npc.sprite;
        
        dialogueBox.classList.add('active');
    }

    // Продолжить диалог
    continueDialogue() {
        this.dialogue.messageIndex++;
        
        if (this.dialogue.messageIndex >= this.dialogue.npc.dialogue.length) {
            // DOOM интеграция: Записываем завершение диалога
            this.recordNPCDialogue(this.dialogue.npc.id, this.dialogue.messageIndex, true);
            
            this.endDialogue();
        } else {
            this.showDialogue();
        }
    }

    // Закончить диалог
    endDialogue() {
        this.dialogue.active = false;
        this.dialogue.npc = null;
        this.dialogue.messageIndex = 0;
        
        document.getElementById('dialogue-box').classList.remove('active');
    }

    // Рендеринг
    render() {
        this.renderWorld();
        this.renderSprites();
        this.renderBullets(); // Рендеринг пуль
        this.renderMinimap();
        this.updateHUD();
    }

    // Рендеринг мира (raycasting)
    renderWorld() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Очистка canvas
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(0, 0, width, height);
        
        // Рендер неба и пола
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(0, 0, width, height / 2);
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, height / 2, width, height / 2);
        
        // Raycasting
        const rayAngleStep = this.fov / this.rayCount;
        const startAngle = this.player.angle - this.fov / 2;
        
        for (let i = 0; i < this.rayCount; i++) {
            const rayAngle = startAngle + i * rayAngleStep;
            const rayData = this.castRay(rayAngle);
            
            // Исправление fish-eye эффекта
            const distance = rayData.distance * Math.cos(rayAngle - this.player.angle);
            
            // Высота стены на экране
            const wallHeight = (height / distance) * 0.5;
            const wallTop = (height - wallHeight) / 2;
            
            // Освещение на основе расстояния
            const brightness = Math.max(0.1, 1 - distance / this.maxDistance);
            const color = Math.floor(brightness * 255);
            
            // Цвет стены
            this.ctx.fillStyle = `rgb(${color}, ${Math.floor(color * 0.8)}, ${Math.floor(color * 0.6)})`;
            
            // Рисуем стену
            const rayWidth = width / this.rayCount;
            this.ctx.fillRect(i * rayWidth, wallTop, rayWidth + 1, wallHeight);
        }
    }

    // Пускание луча
    castRay(angle) {
        let distance = 0;
        const step = 0.02;
        
        while (distance < this.maxDistance) {
            const testX = this.player.x + Math.cos(angle) * distance;
            const testY = this.player.y + Math.sin(angle) * distance;
            
            if (this.isWall(Math.floor(testX), Math.floor(testY))) {
                return { distance, x: testX, y: testY };
            }
            
            distance += step;
        }
        
        return { distance: this.maxDistance, x: 0, y: 0 };
    }

    // Рендеринг спрайтов
    renderSprites() {
        const sprites = [
            ...this.npcs.map(npc => ({ ...npc, type: 'npc' })),
            ...this.enemies.filter(enemy => enemy.health > 0).map(enemy => ({ ...enemy, type: 'enemy' })),
            ...this.items.map(item => ({ ...item, type: 'item' }))
        ];
        
        // Сортировка по расстоянию (дальние первыми)
        sprites.sort((a, b) => {
            const distA = Math.sqrt((a.x - this.player.x) ** 2 + (a.y - this.player.y) ** 2);
            const distB = Math.sqrt((b.x - this.player.x) ** 2 + (b.y - this.player.y) ** 2);
            return distB - distA;
        });
        
        sprites.forEach(sprite => this.renderSprite(sprite));
    }

    // Рендеринг одного спрайта
    renderSprite(sprite) {
        const dx = sprite.x - this.player.x;
        const dy = sprite.y - this.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.maxDistance) return;
        
        // Угол к спрайту
        const angle = Math.atan2(dy, dx);
        let angleDiff = angle - this.player.angle;
        
        // Нормализация угла
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Проверка видимости
        if (Math.abs(angleDiff) > this.fov / 2) return;
        
        // Позиция на экране
        const screenX = (this.canvas.width / 2) + (angleDiff / this.fov) * this.canvas.width;
        const spriteSize = (this.canvas.height / distance) * 0.3;
        const screenY = (this.canvas.height / 2) - spriteSize / 2;
        
        // Рендер спрайта как текст
        this.ctx.font = `${spriteSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = distance > 3 ? '#888' : '#fff';
        this.ctx.fillText(sprite.sprite, screenX, screenY + spriteSize);
    }

    // Рендеринг мини-карты
    renderMinimap() {
        const size = 120;
        const scale = size / 16;
        
        // Очистка
        this.minimapCtx.fillStyle = '#000';
        this.minimapCtx.fillRect(0, 0, size, size);
        
        // Рендер карты
        for (let y = 0; y < this.worldMap.length; y++) {
            for (let x = 0; x < this.worldMap[y].length; x++) {
                if (this.worldMap[y][x] === 1) {
                    this.minimapCtx.fillStyle = '#666';
                    this.minimapCtx.fillRect(x * scale, y * scale, scale, scale);
                }
            }
        }
        
        // Радар направления взгляда (рисуем сначала, чтобы игрок был поверх)
        this.renderRadar(this.player.x * scale, this.player.y * scale, this.player.angle);
        
        // Рендер игрока
        this.minimapCtx.fillStyle = '#0f0';
        this.minimapCtx.fillRect(
            this.player.x * scale - 2,
            this.player.y * scale - 2,
            4, 4
        );
        
        // Врагии НПС
        [...this.npcs, ...this.enemies, ...this.items].forEach(entity => {
            this.minimapCtx.fillStyle = entity.type === 'enemy' ? '#f00' : 
                                       entity.type === 'npc' ? '#ff0' : '#0ff';
            this.minimapCtx.fillRect(
                entity.x * scale - 1,
                entity.y * scale - 1,
                2, 2
            );
        });
    }

    // Рендеринг радара направления взгляда
    renderRadar(centerX, centerY, angle) {
        const ctx = this.minimapCtx;
        const maxRadius = 15; // Уменьшили радиус радара для мини-карты 120x120
        const fovAngle = Math.PI / 3; // 60° - поле зрения
        
        // Сохраняем состояние контекста
        ctx.save();
        
        // === КОНЦЕНТРИЧЕСКИЕ КОЛЬЦА РАДАРА ===
        const rings = [5, 10, 15]; // Радиусы колец уменьшены для мини-карты
        
        rings.forEach((radius, index) => {
            ctx.strokeStyle = `rgba(0, 255, 0, ${0.6 - index * 0.15})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();
        });
        
        // Сбрасываем пунктирную линию
        ctx.setLineDash([]);
        
        // === СЕКТОР НАПРАВЛЕНИЯ ВЗГЛЯДА ===
        // Создаем градиент для сектора
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
        gradient.addColorStop(0, 'rgba(0, 255, 0, 0.6)');
        gradient.addColorStop(0.7, 'rgba(0, 255, 0, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
        
        // Рисуем сектор поля зрения
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, maxRadius, angle - fovAngle/2, angle + fovAngle/2);
        ctx.closePath();
        ctx.fill();
        
        // === ЛИНИЯ ОСНОВНОГО НАПРАВЛЕНИЯ ===
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + Math.cos(angle) * 12,
            centerY + Math.sin(angle) * 12
        );
        ctx.stroke();
        
        // === ЦЕНТРАЛЬНАЯ ТОЧКА РАДАРА ===
        ctx.fillStyle = '#00ff00';
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // === ИМПУЛЬС СКАНИРОВАНИЯ (анимация) ===
        // Создаем эффект "пульса" радара
        const time = Date.now() * 0.003;
        const pulseRadius = (Math.sin(time) * 0.5 + 0.5) * maxRadius;
        
        ctx.strokeStyle = `rgba(0, 255, 0, ${0.8 - (pulseRadius / maxRadius) * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Восстанавливаем состояние контекста
        ctx.restore();
    }

    // Обновление HUD
    updateHUD() {
        // Здоровье
        document.getElementById('health-value').textContent = Math.floor(this.player.health);
        document.getElementById('health-fill').style.width = this.player.health + '%';
        
        // Броня
        document.getElementById('armor-value').textContent = Math.floor(this.player.armor);
        document.getElementById('armor-fill').style.width = this.player.armor + '%';
        
        // Патроны
        document.getElementById('ammo-value').textContent = Math.floor(this.player.ammo);
        document.getElementById('ammo-fill').style.width = (this.player.ammo / 100) * 100 + '%';
    }

    // Вспомогательные функции экранов
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId)?.classList.add('active');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.getElementById('notifications').appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    pauseGame() {
        this.gameState = 'paused';
        this.showScreen('pause-screen');
    }

    resumeGame() {
        this.gameState = 'playing';
        this.showScreen('game-screen');
    }

    goToMenu() {
        this.gameState = 'menu';
        this.showScreen('menu-screen');
    }

    restartGame() {
        // Сброс игрока
        this.player = {
            x: 8.5, y: 8.5, angle: 0,
            health: 100, armor: 100, ammo: 50,
            moveSpeed: 0.05, turnSpeed: 0.03
        };
        
        // Сброс врагов - возвращаем на исходные позиции
        this.enemies = [
            { id: 'bug1', type: 'bug', x: 3, y: 3, health: 30, sprite: '🐛', lastAttack: 0 },
            { id: 'deadline1', type: 'deadline', x: 13, y: 13, health: 50, sprite: '⏰', lastAttack: 0 }
        ];
        
        // Сброс предметов
        this.items = [
            { id: 'coffee1', type: 'coffee', x: 2, y: 8, sprite: '☕', value: 25 },
            { id: 'book1', type: 'knowledge', x: 14, y: 2, sprite: '📚', value: 10 },
            { id: 'energy1', type: 'motivation', x: 2, y: 12, sprite: '💪', value: 20 }
        ];
        
        // Сброс диалогов
        this.dialogue = { active: false, npc: null, messageIndex: 0 };
        
        // Обновляем HUD
        this.updateHUD();
        
        this.resumeGame();
    }

    gameOver() {
        alert('Игра окончена! Тебя одолели баги и дедлайны...');
        this.goToMenu();
    }

    showSettings() {
        this.showScreen('settings-screen');
    }

    closeSettings() {
        this.showScreen('menu-screen');
    }

    saveSettings() {
        // Сохранение настроек
        console.log('Настройки сохранены');
        this.closeSettings();
    }

    showLeaderboard() {
        alert('Лидерборд пока в разработке!');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // === DOOM ИНТЕГРАЦИЯ С БЭКЕНДОМ ===

    async initDoomSession() {
        try {
            console.log('🎮 Инициализация DOOM сессии...');
            
            const response = await fetch('/api/doom/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegramId: this.tg?.initDataUnsafe?.user?.id || '12345'
                })
            });
            
            const result = await response.json();
            if (result.success) {
                this.doomSession = result.session;
                
                // Синхронизируем данные с сервера
                if (this.doomSession.player) {
                    this.player.health = this.doomSession.player.health;
                    this.player.armor = this.doomSession.player.armor;  
                    this.player.ammo = this.doomSession.player.ammo;
                    
                    // Позиция игрока (если сохранена)
                    if (this.doomSession.player.x && this.doomSession.player.y) {
                        this.player.x = this.doomSession.player.x;
                        this.player.y = this.doomSession.player.y;
                        this.player.angle = this.doomSession.player.angle || 0;
                    }
                }
                
                console.log('✅ DOOM сессия инициализирована:', {
                    level: this.doomSession.level,
                    currentWeek: this.doomSession.currentWeek,
                    stats: this.doomSession.stats,
                    enemiesKilled: this.doomSession.enemiesKilled,
                    achievements: this.doomSession.achievements?.length || 0
                });
                
                // Показываем достижения если есть новые
                if (this.doomSession.achievements?.length > 0) {
                    this.doomSession.achievements.slice(-3).forEach((achievement, index) => {
                        setTimeout(() => {
                            this.showNotification(`🏆 ${achievement.name}`, 'achievement');
                        }, index * 1000);
                    });
                }
                
            } else {
                console.error('❌ Ошибка инициализации DOOM сессии:', result.error);
            }
        } catch (error) {
            console.error('❌ Ошибка подключения к DOOM API:', error);
            // Продолжаем без сессии, игра работает локально
            this.doomSession = null;
        }
    }

    async syncPlayerStats() {
        if (!this.doomSession || !this.user) return;
        
        try {
            const response = await fetch('/api/doom/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegramId: this.tg?.initDataUnsafe?.user?.id || '12345',
                    player: {
                        x: this.player.x,
                        y: this.player.y,
                        angle: this.player.angle,
                        health: this.player.health,
                        armor: this.player.armor,
                        ammo: this.player.ammo
                    },
                    sessionTime: 30 // секунд с последней синхронизации
                })
            });
            
            const result = await response.json();
            if (result.success) {
                console.log('🔄 Статы игрока синхронизированы');
            }
        } catch (error) {
            console.warn('⚠️ Ошибка синхронизации:', error);
        }
    }

    startAutoSync() {
        // Автосохранение каждые 30 секунд
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(() => {
            if (this.gameState === 'playing') {
                this.syncPlayerStats();
            }
        }, 30000); // 30 секунд
        
        console.log('🔄 Автосинхронизация запущена (каждые 30 сек)');
    }

    async recordEnemyKill(enemy) {
        if (!this.doomSession || !this.user) return;
        
        try {
            const response = await fetch('/api/doom/enemy-killed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegramId: this.tg?.initDataUnsafe?.user?.id || '12345',
                    enemyId: enemy.id,
                    enemyType: enemy.type,
                    playerStats: this.player,
                    shotsFired: 1
                })
            });
            
            const result = await response.json();
            if (result.success) {
                // Показываем полученный опыт и очки
                if (result.expGain) {
                    this.showNotification(`+${result.expGain} EXP`, 'success');
                }
                if (result.scoreGain) {
                    this.showNotification(`+${result.scoreGain} очков`, 'success');
                }
                
                // Проверяем повышение уровня
                if (result.levelUp) {
                    this.showNotification(`🆙 LEVEL UP! Уровень ${result.newLevel}`, 'levelup');
                    this.user.level = result.newLevel;
                    this.updatePlayerInfo(); // Обновляем отображение уровня в HUD
                }
                
                // Показываем новые достижения
                if (result.newAchievements?.length > 0) {
                    result.newAchievements.forEach((achievement, index) => {
                        setTimeout(() => {
                            this.showNotification(`🏆 ${achievement.name}`, 'achievement');
                        }, (index + 1) * 1000);
                    });
                }
                
                // Обновляем локальную статистику
                this.user.experience = result.experience;
                this.updatePlayerInfo(); // Обновляем отображение опыта
                
                console.log(`⚔️ Враг ${enemy.type} убит, опыт: +${result.expGain}`);
            }
        } catch (error) {
            console.warn('⚠️ Ошибка записи убийства врага:', error);
        }
    }

    async recordItemCollection(item) {
        if (!this.doomSession || !this.user) return;
        
        try {
            const response = await fetch('/api/doom/item-collected', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegramId: this.tg?.initDataUnsafe?.user?.id || '12345',
                    itemId: item.id,
                    itemType: item.type,
                    value: item.value,
                    playerStats: this.player
                })
            });
            
            const result = await response.json();
            if (result.success && result.newAchievements?.length > 0) {
                result.newAchievements.forEach((achievement, index) => {
                    setTimeout(() => {
                        this.showNotification(`🏆 ${achievement.name}`, 'achievement');
                    }, (index + 1) * 1000);
                });
            }
            
            console.log(`📦 Предмет ${item.type} собран`);
        } catch (error) {
            console.warn('⚠️ Ошибка записи сбора предмета:', error);
        }
    }

    async recordNPCDialogue(npcId, dialogueStage, completed = false) {
        if (!this.doomSession || !this.user) return;
        
        try {
            const response = await fetch('/api/doom/npc-dialogue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegramId: this.tg?.initDataUnsafe?.user?.id || '12345',
                    npcId: npcId,
                    dialogueStage: dialogueStage,
                    completed: completed
                })
            });
            
            const result = await response.json();
            if (result.success && completed) {
                this.showNotification('💬 Диалог завершен! Получены награды', 'success');
                
                // Показываем полученный опыт
                if (result.expGain) {
                    this.showNotification(`+${result.expGain} EXP`, 'success');
                }
                
                // Проверяем повышение уровня
                if (result.levelUp) {
                    this.showNotification(`🆙 LEVEL UP! Уровень ${result.newLevel}`, 'levelup');
                    this.user.level = result.newLevel;
                    this.updatePlayerInfo(); // Обновляем отображение уровня в HUD
                }
                
                // Показываем новые достижения
                if (result.newAchievements?.length > 0) {
                    result.newAchievements.forEach((achievement, index) => {
                        setTimeout(() => {
                            this.showNotification(`🏆 ${achievement.name}`, 'achievement');
                        }, (index + 1) * 1000);
                    });
                }
                
                // Обновляем опыт
                if (result.experience) {
                    this.user.experience = result.experience;
                    this.updatePlayerInfo(); // Обновляем отображение опыта
                }
            }
            
            console.log(`💬 Диалог с ${npcId}, этап ${dialogueStage}`);
        } catch (error) {
            console.warn('⚠️ Ошибка записи диалога:', error);
        }
    }
}

// Запуск игры
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Запуск nFactorial DOOM...');
    window.game = new NFactorialDoom();
}); 