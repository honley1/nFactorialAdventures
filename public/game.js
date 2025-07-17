// nFactorial Adventures - Isometric Game Engine
class nFactorialGame {
    constructor() {
        this.currentScreen = 'loading-screen';
        this.user = null;
        this.gameSession = null;
        this.resources = {};
        this.isLoading = false;
        this.API_BASE = window.location.origin + '/api';
        
        // Изометрические настройки
        this.iso = {
            tileWidth: 64,
            tileHeight: 32,
            offsetX: 0,
            offsetY: 0,
            scale: 1
        };
        
        // Игровой мир
        this.world = {
            width: 20,
            height: 20,
            tiles: [],
            buildings: [],
            npcs: []
        };
        
        // Игрок
        this.player = {
            x: 10,
            y: 10,
            animation: 'idle',
            direction: 'down-right'
        };
        
        // Камера
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0
        };
        
        // Telegram WebApp
        this.tg = window.Telegram?.WebApp;
        
        this.init();
    }

    async init() {
        console.log('🎮 nFactorial Adventures starting...');
        
        // Инициализация Telegram WebApp
        this.initTelegram();
        
        // Запуск загрузочного экрана
        this.startLoadingScreen();
        
        // Установка обработчиков событий
        this.setupEventListeners();
        
        // Проверка сохраненного состояния
        await this.checkSavedState();
        
        // Инициализация игрового мира
        this.initWorld();
    }

    initWorld() {
        // Создаем базовый мир nFactorial
        this.world.tiles = [];
        for (let x = 0; x < this.world.width; x++) {
            this.world.tiles[x] = [];
            for (let y = 0; y < this.world.height; y++) {
                this.world.tiles[x][y] = {
                    type: 'grass',
                    elevation: 0,
                    object: null
                };
            }
        }
        
        // Добавляем здания nFactorial
        this.world.buildings = [
            {
                x: 5, y: 5,
                width: 3, height: 2,
                type: 'classroom',
                name: 'Аудитория Веб-разработки',
                color: '#4169E1'
            },
            {
                x: 10, y: 4,
                width: 2, height: 2,
                type: 'cafe',
                name: 'nFactorial Кафе',
                color: '#8B4513'
            },
            {
                x: 14, y: 8,
                width: 4, height: 3,
                type: 'coworking',
                name: 'Коворкинг Пространство',
                color: '#228B22'
            },
            {
                x: 3, y: 12,
                width: 2, height: 2,
                type: 'mentor_room',
                name: 'Кабинет Ментора',
                color: '#9932CC'
            },
            {
                x: 16, y: 15,
                width: 3, height: 2,
                type: 'interview_room',
                name: 'Комната Собеседований',
                color: '#DC143C'
            }
        ];
        
        // Добавляем интерактивные объекты
        this.world.tiles[6][6].object = { type: 'computer', interactive: true };
        this.world.tiles[11][5].object = { type: 'coffee_machine', interactive: true };
        this.world.tiles[15][10].object = { type: 'mentor_desk', interactive: true };
        this.world.tiles[4][13].object = { type: 'rest_zone', interactive: true };
    }

    initTelegram() {
        if (this.tg) {
            console.log('📱 Telegram WebApp detected');
            
            // Настраиваем тему
            this.tg.setHeaderColor('#1a1a1a');
            this.tg.expand();
            
            // Включаем закрытие подтверждения
            this.tg.enableClosingConfirmation();
            
            // Настраиваем главную кнопку
            this.tg.MainButton.hide();
            
            console.log('✅ Telegram WebApp initialized');
        } else {
            console.log('⚠️ Running without Telegram WebApp');
        }
    }

    startLoadingScreen() {
        const loadingFill = document.querySelector('.loading-fill');
        const loadingPercentage = document.querySelector('.loading-percentage');
        let progress = 0;

        const loadingInterval = setInterval(() => {
            progress += Math.random() * 15 + 5; // 5-20% за раз
            
            if (progress >= 100) {
                progress = 100;
                clearInterval(loadingInterval);
                
                setTimeout(() => {
                    this.finishLoading();
                }, 1000);
            }
            
            loadingFill.style.width = progress + '%';
            loadingPercentage.textContent = Math.floor(progress) + '%';
        }, 200);

        // Симуляция загрузки ресурсов
        this.loadGameResources();
    }

    async loadGameResources() {
        // Здесь можно загружать спрайты, звуки, данные
        console.log('📦 Loading game resources...');
        
        // Симуляция загрузки
        await this.delay(2000);
        
        console.log('✅ Game resources loaded');
    }

    finishLoading() {
        // Проверяем авторизацию пользователя
        if (this.tg && this.tg.initDataUnsafe?.user) {
            // Пользователь уже авторизован в Telegram
            this.autoLogin();
        } else {
            // Показываем экран авторизации
            this.showScreen('auth-screen');
        }
    }

    async autoLogin() {
        if (!this.tg?.initDataUnsafe?.user) {
            this.showScreen('auth-screen');
            return;
        }

        const user = this.tg.initDataUnsafe.user;
        
        try {
            this.showLoading('Входим в игру...');
            
            const response = await this.apiCall('/auth/login', {
                telegramId: user.id.toString(),
                username: user.username || user.first_name,
                avatar: 'student1', // По умолчанию
                firstName: user.first_name,
                lastName: user.last_name
            });

            if (response.success) {
                this.user = response.user;
                this.gameSession = response.gameSession;
                this.showNotification('Добро пожаловать в nFactorial Adventures! 🎮', 'success');
                this.showScreen('menu-screen');
            } else {
                throw new Error(response.message || 'Login failed');
            }
            
        } catch (error) {
            console.error('❌ Auto login failed:', error);
            this.showNotification('Ошибка входа: ' + error.message, 'error');
            this.showScreen('auth-screen');
        } finally {
            this.hideLoading();
        }
    }

    setupEventListeners() {
        // Кнопка авторизации
        document.getElementById('auth-button').addEventListener('click', () => {
            this.handleAuth();
        });

        // Кнопки главного меню
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleMenuAction(action);
            });
        });

        // Кнопки действий в игре
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleGameAction(action);
            });
        });

        // Клики по канвасу для изометрического управления
        const canvas = document.getElementById('game-canvas');
        canvas.addEventListener('click', (e) => {
            this.handleCanvasClick(e);
        });

        // Тач события для мобильных устройств
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const clickEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY,
                target: canvas
            };
            this.handleCanvasClick(clickEvent);
        });

        // Управление клавиатурой (WASD)
        document.addEventListener('keydown', (e) => {
            this.handleKeyInput(e);
        });

        // Кнопка назад в лидерборде
        document.getElementById('back-to-menu').addEventListener('click', () => {
            this.showScreen('menu-screen');
        });

        // Модальные окна
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideModal();
            });
        });

        document.querySelector('.modal-ok').addEventListener('click', () => {
            this.hideModal();
        });

        // Закрытие модалки по клику на overlay
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideModal();
            }
        });
    }

    handleCanvasClick(e) {
        if (this.currentScreen !== 'game-screen') return;
        
        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Преобразуем экранные координаты в мировые
        const worldX = x - this.camera.x;
        const worldY = y - this.camera.y;
        
        // Преобразуем в координаты сетки
        const gridPos = this.isometricToCartesian(worldX, worldY);
        
        if (this.isValidPosition(gridPos.x, gridPos.y)) {
            this.movePlayerTo(gridPos.x, gridPos.y);
        }
    }

    handleKeyInput(e) {
        if (this.currentScreen !== 'game-screen') return;
        
        let newX = this.player.x;
        let newY = this.player.y;
        
        switch (e.key.toLowerCase()) {
            case 'w':
            case 'ц':
                newY--;
                this.player.direction = 'up-left';
                break;
            case 's':
            case 'ы':
                newY++;
                this.player.direction = 'down-right';
                break;
            case 'a':
            case 'ф':
                newX--;
                this.player.direction = 'down-left';
                break;
            case 'd':
            case 'в':
                newX++;
                this.player.direction = 'up-right';
                break;
            case ' ':
            case 'e':
            case 'у':
                this.interactWithNearbyObject();
                return;
        }
        
        if (this.isValidPosition(newX, newY)) {
            this.movePlayerTo(newX, newY);
        }
    }

    isValidPosition(x, y) {
        // Проверяем границы мира
        if (x < 0 || x >= this.world.width || y < 0 || y >= this.world.height) {
            return false;
        }
        
        // Проверяем, не занято ли место зданием
        for (const building of this.world.buildings) {
            if (x >= building.x && x < building.x + building.width &&
                y >= building.y && y < building.y + building.height) {
                return false;
            }
        }
        
        return true;
    }

    movePlayerTo(x, y) {
        this.player.x = x;
        this.player.y = y;
        this.player.animation = 'walking';
        
        // Обновляем камеру
        const canvas = document.getElementById('game-canvas');
        this.centerCameraOnPlayer(canvas.width, canvas.height);
        
        // Проверяем взаимодействие с объектами
        this.checkObjectInteraction();
        
        setTimeout(() => {
            this.player.animation = 'idle';
        }, 500);
    }

    interactWithNearbyObject() {
        // Проверяем ближайшие клетки вокруг игрока
        const directions = [
            { x: 0, y: 0 },   // текущая позиция
            { x: -1, y: 0 },  // слева
            { x: 1, y: 0 },   // справа
            { x: 0, y: -1 },  // сверху
            { x: 0, y: 1 },   // снизу
        ];
        
        for (const dir of directions) {
            const checkX = this.player.x + dir.x;
            const checkY = this.player.y + dir.y;
            
            if (checkX >= 0 && checkX < this.world.width && 
                checkY >= 0 && checkY < this.world.height) {
                
                const tile = this.world.tiles[checkX][checkY];
                if (tile.object && tile.object.interactive) {
                    this.handleObjectInteraction(tile.object);
                    return;
                }
            }
        }
        
        // Проверяем здания
        for (const building of this.world.buildings) {
            const distance = Math.abs(this.player.x - (building.x + building.width/2)) + 
                           Math.abs(this.player.y - (building.y + building.height/2));
            
            if (distance <= 2) {
                this.handleBuildingInteraction(building);
                return;
            }
        }
        
        this.showNotification('Здесь нет ничего интересного', 'info');
    }

    checkObjectInteraction() {
        const tile = this.world.tiles[this.player.x][this.player.y];
        if (tile.object && tile.object.interactive) {
            this.showNotification(`Нажмите Пробел для взаимодействия с ${this.getObjectName(tile.object.type)}`, 'info');
        }
    }

    getObjectName(objectType) {
        const names = {
            'computer': 'компьютером',
            'coffee_machine': 'кофемашиной',
            'mentor_desk': 'столом ментора',
            'rest_zone': 'зоной отдыха'
        };
        return names[objectType] || 'объектом';
    }

    async handleObjectInteraction(object) {
        try {
            this.showLoading('Взаимодействие...');
            
            const response = await this.apiCall('/game/interact', {
                telegramId: this.user.telegramId,
                sessionId: this.gameSession.id,
                objectType: object.type
            });

            if (response && response.success) {
                this.updateResources(response.resources);
                this.showNotification(response.message, 'success');
                
                if (this.tg) {
                    this.tg.HapticFeedback.impactOccurred('light');
                }
            } else {
                throw new Error(response?.message || 'Interaction failed');
            }
            
        } catch (error) {
            console.error('❌ Object interaction failed:', error);
            this.showNotification('Ошибка: ' + error.message, 'error');
            
            if (this.tg) {
                this.tg.HapticFeedback.notificationOccurred('error');
            }
        } finally {
            this.hideLoading();
        }
    }

    handleBuildingInteraction(building) {
        this.showModal(building.name, `
            <div class="pixel-text">
                <p>🏢 Тип: ${building.type}</p>
                <p>📏 Размер: ${building.width}x${building.height}</p>
                <p style="margin-top: 12px;">${this.getBuildingDescription(building.type)}</p>
            </div>
        `);
    }

    getBuildingDescription(buildingType) {
        const descriptions = {
            'classroom': 'Здесь проходят лекции по веб-разработке. Изучайте новые технологии и получайте знания!',
            'cafe': 'Место для перекуса и общения с одногруппниками. Восстанавливайте энергию с помощью кофе!',
            'coworking': 'Открытое пространство для работы над проектами. Здесь можно кодить в комфортной обстановке.',
            'mentor_room': 'Кабинет ментора. Получайте советы и помощь по сложным вопросам программирования.',
            'interview_room': 'Комната для технических собеседований. Готовьтесь к карьере в IT!'
        };
        return descriptions[buildingType] || 'Интересное место в nFactorial.';
    }

    async handleAuth() {
        if (!this.tg) {
            this.showNotification('Эта игра работает только в Telegram!', 'error');
            return;
        }

        const user = this.tg.initDataUnsafe?.user;
        if (!user) {
            this.showNotification('Ошибка получения данных пользователя', 'error');
            return;
        }

        await this.autoLogin();
    }

    async handleMenuAction(action) {
        switch (action) {
            case 'start-game':
            case 'continue-game':
                await this.startGame();
                break;
            case 'leaderboard':
                await this.showLeaderboard();
                break;
            case 'settings':
                this.showSettings();
                break;
        }
    }

    async startGame() {
        if (!this.gameSession) {
            this.showNotification('Сначала войдите в игру!', 'error');
            return;
        }

        try {
            this.showLoading('Загружаем игровой мир...');
            
            // Получаем актуальное состояние игры
            const response = await this.apiCall('/game/state', {
                telegramId: this.user.telegramId
            });

            if (response.success) {
                this.gameSession = response.gameSession;
                this.updateResourceDisplay();
                this.showScreen('game-screen');
                this.initGameCanvas();
            } else {
                throw new Error(response.message || 'Failed to load game state');
            }
            
        } catch (error) {
            console.error('❌ Start game failed:', error);
            this.showNotification('Ошибка запуска игры: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleGameAction(action) {
        if (!this.gameSession) return;

        try {
            this.showLoading('Выполняем действие...');
            
            let response;
            
            if (action === 'code') {
                response = await this.apiCall('/game/interact', {
                    telegramId: this.user.telegramId,
                    sessionId: this.gameSession.id,
                    objectType: 'computer'
                });
            } else if (action === 'coffee') {
                response = await this.apiCall('/game/interact', {
                    telegramId: this.user.telegramId,
                    sessionId: this.gameSession.id,
                    objectType: 'coffee_machine'
                });
            } else if (action === 'mentor') {
                response = await this.apiCall('/game/interact', {
                    telegramId: this.user.telegramId,
                    sessionId: this.gameSession.id,
                    objectType: 'mentor'
                });
            } else if (action === 'rest') {
                response = await this.apiCall('/game/interact', {
                    telegramId: this.user.telegramId,
                    sessionId: this.gameSession.id,
                    objectType: 'rest_zone'
                });
            }

            if (response && response.success) {
                this.updateResources(response.resources);
                this.showNotification(response.message, 'success');
                
                // Добавляем тактильную обратную связь
                if (this.tg) {
                    this.tg.HapticFeedback.impactOccurred('light');
                }
            } else {
                throw new Error(response?.message || 'Action failed');
            }
            
        } catch (error) {
            console.error('❌ Game action failed:', error);
            this.showNotification('Ошибка: ' + error.message, 'error');
            
            if (this.tg) {
                this.tg.HapticFeedback.notificationOccurred('error');
            }
        } finally {
            this.hideLoading();
        }
    }

    async showLeaderboard() {
        try {
            this.showLoading('Загружаем лидерборд...');
            
            const response = await this.apiCall('/leaderboard', {}, 'GET');
            
            if (response.success) {
                this.renderLeaderboard(response.leaderboard);
                this.showScreen('leaderboard-screen');
            } else {
                throw new Error(response.message || 'Failed to load leaderboard');
            }
            
        } catch (error) {
            console.error('❌ Leaderboard failed:', error);
            this.showNotification('Ошибка загрузки лидерборда: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderLeaderboard(leaderboard) {
        const container = document.getElementById('leaderboard-list');
        container.innerHTML = '';

        if (leaderboard.length === 0) {
            container.innerHTML = '<div class="pixel-text">Пока нет игроков</div>';
            return;
        }

        leaderboard.forEach((player, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item pixel-box';
            item.style.marginBottom = '8px';
            item.style.padding = '12px';
            
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="position">${player.position}</span>
                        <span class="avatar">${player.avatar || '🎮'}</span>
                        <span class="username">${player.username}</span>
                    </div>
                    <div style="text-align: right;">
                        <div class="score">🏆 ${player.totalScore || 0}</div>
                        <div class="week" style="font-size: 6px; opacity: 0.8;">Неделя ${player.highestWeekCompleted || 1}</div>
                    </div>
                </div>
            `;
            
            container.appendChild(item);
        });
    }

    initGameCanvas() {
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        
        // Адаптируем размер canvas под экран
        this.resizeCanvas();
        
        // Отключаем сглаживание для пиксель-арта
        ctx.imageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
        
        // Центрируем камеру на игроке
        this.centerCameraOnPlayer(canvas.width, canvas.height);
        
        // Обработка изменения размера окна
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Запускаем игровой цикл
        this.gameLoop(ctx, canvas.width, canvas.height);
    }

    resizeCanvas() {
        const canvas = document.getElementById('game-canvas');
        const gameArea = document.querySelector('.game-area');
        
        if (gameArea && canvas) {
            const rect = gameArea.getBoundingClientRect();
            canvas.width = Math.floor(rect.width);
            canvas.height = Math.floor(rect.height);
            
            // Обновляем камеру
            this.centerCameraOnPlayer(canvas.width, canvas.height);
        }
    }

    gameLoop(ctx, width, height) {
        if (this.currentScreen !== 'game-screen') {
            requestAnimationFrame(() => this.gameLoop(ctx, width, height));
            return;
        }
        
        this.updateCamera();
        this.drawIsometricWorld(ctx, width, height);
        
        requestAnimationFrame(() => this.gameLoop(ctx, width, height));
    }

    // Изометрические координаты
    cartesianToIsometric(cartX, cartY) {
        const isoX = (cartX - cartY) * (this.iso.tileWidth / 2);
        const isoY = (cartX + cartY) * (this.iso.tileHeight / 2);
        return { x: isoX, y: isoY };
    }

    isometricToCartesian(isoX, isoY) {
        const cartX = (isoX / (this.iso.tileWidth / 2) + isoY / (this.iso.tileHeight / 2)) / 2;
        const cartY = (isoY / (this.iso.tileHeight / 2) - isoX / (this.iso.tileWidth / 2)) / 2;
        return { x: Math.floor(cartX), y: Math.floor(cartY) };
    }

    updateCamera() {
        // Плавное движение камеры к цели
        this.camera.x += (this.camera.targetX - this.camera.x) * 0.1;
        this.camera.y += (this.camera.targetY - this.camera.y) * 0.1;
    }

    centerCameraOnPlayer(screenWidth, screenHeight) {
        const playerIso = this.cartesianToIsometric(this.player.x, this.player.y);
        this.camera.targetX = screenWidth / 2 - playerIso.x;
        this.camera.targetY = screenHeight / 2 - playerIso.y - 100;
    }

    drawIsometricWorld(ctx, width, height) {
        // Очищаем canvas
        ctx.clearRect(0, 0, width, height);
        
        // Рисуем градиентное небо
        const gradient = ctx.createLinearGradient(0, 0, 0, height / 2);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#B0E0E6');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Сохраняем состояние и применяем трансформацию камеры
        ctx.save();
        ctx.translate(this.camera.x, this.camera.y);
        
        // Рисуем тайлы (снизу вверх, справа налево для правильного порядка)
        for (let y = this.world.height - 1; y >= 0; y--) {
            for (let x = this.world.width - 1; x >= 0; x--) {
                this.drawIsometricTile(ctx, x, y);
            }
        }
        
        // Рисуем здания
        this.world.buildings.forEach(building => {
            this.drawIsometricBuilding(ctx, building);
        });
        
        // Рисуем игрока
        this.drawIsometricPlayer(ctx);
        
        // Рисуем интерактивные объекты
        for (let x = 0; x < this.world.width; x++) {
            for (let y = 0; y < this.world.height; y++) {
                if (this.world.tiles[x][y].object) {
                    this.drawIsometricObject(ctx, x, y, this.world.tiles[x][y].object);
                }
            }
        }
        
        // Рисуем UI элементы поверх всего
        this.drawGameUI(ctx, width, height);
        
        ctx.restore();
    }

    drawIsometricTile(ctx, tileX, tileY) {
        const iso = this.cartesianToIsometric(tileX, tileY);
        const screenX = iso.x;
        const screenY = iso.y;
        
        // Рисуем травяной тайл
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX + this.iso.tileWidth / 2, screenY + this.iso.tileHeight / 2);
        ctx.lineTo(screenX, screenY + this.iso.tileHeight);
        ctx.lineTo(screenX - this.iso.tileWidth / 2, screenY + this.iso.tileHeight / 2);
        ctx.closePath();
        ctx.fill();
        
        // Рисуем границы тайла
        ctx.strokeStyle = '#1F5F1F';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Добавляем текстуру травы
        this.drawGrassTexture(ctx, screenX, screenY);
    }

    drawGrassTexture(ctx, x, y) {
        ctx.fillStyle = '#32CD32';
        // Рисуем маленькие пиксели травы
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
                if (Math.random() > 0.7) {
                    const px = x - 20 + i * 10 + Math.random() * 10;
                    const py = y + 10 + j * 8 + Math.random() * 8;
                    ctx.fillRect(px, py, 2, 2);
                }
            }
        }
    }

    drawIsometricBuilding(ctx, building) {
        const iso = this.cartesianToIsometric(building.x, building.y);
        const screenX = iso.x;
        const screenY = iso.y;
        
        const buildingWidth = building.width * this.iso.tileWidth / 2;
        const buildingHeight = building.height * this.iso.tileHeight / 2;
        const buildingDepth = 40; // Высота здания
        
        // Тень здания
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.moveTo(screenX + 5, screenY + 5);
        ctx.lineTo(screenX + buildingWidth + 5, screenY + buildingHeight / 2 + 5);
        ctx.lineTo(screenX + 5, screenY + buildingHeight + 5);
        ctx.lineTo(screenX - buildingWidth + 5, screenY + buildingHeight / 2 + 5);
        ctx.closePath();
        ctx.fill();
        
        // Основание здания
        ctx.fillStyle = building.color;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX + buildingWidth, screenY + buildingHeight / 2);
        ctx.lineTo(screenX, screenY + buildingHeight);
        ctx.lineTo(screenX - buildingWidth, screenY + buildingHeight / 2);
        ctx.closePath();
        ctx.fill();
        
        // Левая стена (более темная)
        const darkerColor = this.darkenColor(building.color, 0.7);
        ctx.fillStyle = darkerColor;
        ctx.beginPath();
        ctx.moveTo(screenX - buildingWidth, screenY + buildingHeight / 2);
        ctx.lineTo(screenX - buildingWidth, screenY + buildingHeight / 2 - buildingDepth);
        ctx.lineTo(screenX, screenY - buildingDepth);
        ctx.lineTo(screenX, screenY);
        ctx.closePath();
        ctx.fill();
        
        // Правая стена (средний тон)
        const mediumColor = this.darkenColor(building.color, 0.85);
        ctx.fillStyle = mediumColor;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX, screenY - buildingDepth);
        ctx.lineTo(screenX + buildingWidth, screenY + buildingHeight / 2 - buildingDepth);
        ctx.lineTo(screenX + buildingWidth, screenY + buildingHeight / 2);
        ctx.closePath();
        ctx.fill();
        
        // Крыша
        ctx.fillStyle = '#696969';
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - buildingDepth);
        ctx.lineTo(screenX + buildingWidth, screenY + buildingHeight / 2 - buildingDepth);
        ctx.lineTo(screenX, screenY + buildingHeight - buildingDepth);
        ctx.lineTo(screenX - buildingWidth, screenY + buildingHeight / 2 - buildingDepth);
        ctx.closePath();
        ctx.fill();
        
        // Контуры
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Окна
        this.drawBuildingWindows(ctx, screenX, screenY, buildingWidth, buildingHeight, buildingDepth, building.type);
        
        // Название здания
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(building.name, screenX, screenY - buildingDepth - 10);
    }

    drawBuildingWindows(ctx, x, y, width, height, depth, type) {
        const windowColor = '#FFD700';
        ctx.fillStyle = windowColor;
        
        if (type === 'classroom') {
            // Большие окна аудитории
            ctx.fillRect(x - width/2, y - depth + 10, 8, 12);
            ctx.fillRect(x - width/2 + 15, y - depth + 10, 8, 12);
            ctx.fillRect(x + width/2 - 15, y + height/4 - depth + 10, 6, 10);
        } else if (type === 'cafe') {
            // Окна кафе
            ctx.fillRect(x - width/2 + 5, y - depth + 8, 6, 8);
            ctx.fillRect(x + width/2 - 10, y + height/4 - depth + 8, 6, 8);
        } else {
            // Стандартные окна
            ctx.fillRect(x - width/3, y - depth + 12, 4, 6);
            ctx.fillRect(x + width/3, y + height/4 - depth + 12, 4, 6);
        }
    }

    drawIsometricPlayer(ctx) {
        const iso = this.cartesianToIsometric(this.player.x, this.player.y);
        const screenX = iso.x;
        const screenY = iso.y;
        
        // Тень игрока
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(screenX - 8, screenY + 20, 16, 8);
        
        // Тело игрока (изометрическая проекция)
        // Голова
        ctx.fillStyle = '#FDBCB4';
        ctx.fillRect(screenX - 6, screenY - 25, 12, 12);
        
        // Глаза
        ctx.fillStyle = '#000000';
        ctx.fillRect(screenX - 4, screenY - 21, 2, 2);
        ctx.fillRect(screenX + 2, screenY - 21, 2, 2);
        
        // Волосы
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(screenX - 6, screenY - 25, 12, 4);
        
        // Тело (nFactorial футболка)
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(screenX - 8, screenY - 12, 16, 20);
        
        // Логотип nFactorial на футболке
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '6px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('n!', screenX, screenY - 5);
        
        // Руки
        ctx.fillStyle = '#FDBCB4';
        ctx.fillRect(screenX - 12, screenY - 8, 4, 12);
        ctx.fillRect(screenX + 8, screenY - 8, 4, 12);
        
        // Ноги
        ctx.fillStyle = '#2F4F4F';
        ctx.fillRect(screenX - 6, screenY + 8, 5, 12);
        ctx.fillRect(screenX + 1, screenY + 8, 5, 12);
        
        // Контуры
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX - 6, screenY - 25, 12, 12); // голова
        ctx.strokeRect(screenX - 8, screenY - 12, 16, 20); // тело
    }

    drawIsometricObject(ctx, tileX, tileY, object) {
        const iso = this.cartesianToIsometric(tileX, tileY);
        const screenX = iso.x;
        const screenY = iso.y;
        
        // Проверяем расстояние до игрока для отображения интерактивности
        const distance = Math.abs(this.player.x - tileX) + Math.abs(this.player.y - tileY);
        const isNearPlayer = distance <= 1;
        
        // Рисуем объект
        switch (object.type) {
            case 'computer':
                this.drawComputer(ctx, screenX, screenY);
                break;
            case 'coffee_machine':
                this.drawCoffeeMachine(ctx, screenX, screenY);
                break;
            case 'mentor_desk':
                this.drawMentorDesk(ctx, screenX, screenY);
                break;
            case 'rest_zone':
                this.drawRestZone(ctx, screenX, screenY);
                break;
        }
        
        // Рисуем индикатор интерактивности
        if (object.interactive && isNearPlayer) {
            this.drawInteractionIndicator(ctx, screenX, screenY - 30);
        }
    }

    drawInteractionIndicator(ctx, x, y) {
        const time = Date.now() * 0.005;
        const bounce = Math.sin(time) * 2;
        
        // Фон индикатора
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.roundRect = ctx.roundRect || function(x, y, w, h, r) {
            this.beginPath();
            this.moveTo(x + r, y);
            this.lineTo(x + w - r, y);
            this.arc(x + w - r, y + r, r, -Math.PI/2, 0);
            this.lineTo(x + w, y + h - r);
            this.arc(x + w - r, y + h - r, r, 0, Math.PI/2);
            this.lineTo(x + r, y + h);
            this.arc(x + r, y + h - r, r, Math.PI/2, Math.PI);
            this.lineTo(x, y + r);
            this.arc(x + r, y + r, r, Math.PI, -Math.PI/2);
        };
        ctx.roundRect(x - 15, y + bounce - 8, 30, 16, 8);
        ctx.fill();
        
        // Текст
        ctx.fillStyle = '#000000';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('E', x, y + bounce + 2);
        
        // Обводка
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.roundRect(x - 15, y + bounce - 8, 30, 16, 8);
        ctx.stroke();
    }

    drawGameUI(ctx, width, height) {
        // Рисуем сетку для дебага (опционально)
        if (false) { // Можно включить для отладки
            this.drawDebugGrid(ctx);
        }
        
        // Рисуем миникарту
        this.drawMiniMap(ctx, width - 120, 20);
        
        // Рисуем инструкции управления
        this.drawControls(ctx, 20, height - 80);
    }

    drawDebugGrid(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        for (let x = 0; x < this.world.width; x++) {
            for (let y = 0; y < this.world.height; y++) {
                const iso = this.cartesianToIsometric(x, y);
                const screenX = iso.x;
                const screenY = iso.y;
                
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(screenX + this.iso.tileWidth / 2, screenY + this.iso.tileHeight / 2);
                ctx.lineTo(screenX, screenY + this.iso.tileHeight);
                ctx.lineTo(screenX - this.iso.tileWidth / 2, screenY + this.iso.tileHeight / 2);
                ctx.closePath();
                ctx.stroke();
            }
        }
    }

    drawMiniMap(ctx, x, y) {
        const mapSize = 80;
        const tileSize = mapSize / Math.max(this.world.width, this.world.height);
        
        // Фон миникарты
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, mapSize, mapSize);
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, mapSize, mapSize);
        
        // Рисуем здания на миникарте
        this.world.buildings.forEach(building => {
            ctx.fillStyle = building.color;
            ctx.fillRect(
                x + building.x * tileSize,
                y + building.y * tileSize,
                building.width * tileSize,
                building.height * tileSize
            );
        });
        
        // Рисуем игрока
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(
            x + this.player.x * tileSize - 1,
            y + this.player.y * tileSize - 1,
            3, 3
        );
        
        // Заголовок
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '6px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('Карта', x + mapSize/2, y - 5);
    }

    drawControls(ctx, x, y) {
        const controls = [
            'WASD - движение',
            'E/Space - взаимодействие',
            'Клик - перемещение'
        ];
        
        // Фон
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, 200, 50);
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, 200, 50);
        
        // Текст управления
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '6px "Press Start 2P"';
        ctx.textAlign = 'left';
        
        controls.forEach((control, index) => {
            ctx.fillText(control, x + 5, y + 15 + index * 12);
        });
    }

    drawComputer(ctx, x, y) {
        // Стол
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x - 12, y - 5, 24, 4);
        
        // Монитор
        ctx.fillStyle = '#2F2F2F';
        ctx.fillRect(x - 8, y - 20, 16, 12);
        
        // Экран
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 6, y - 18, 12, 8);
        
        // Код на экране
        ctx.fillStyle = '#00FF00';
        ctx.font = '4px monospace';
        ctx.fillText('function()', x - 5, y - 14);
        ctx.fillText('{ code }', x - 3, y - 11);
        
        // Клавиатура
        ctx.fillStyle = '#CCCCCC';
        ctx.fillRect(x - 6, y - 3, 12, 3);
    }

    drawCoffeeMachine(ctx, x, y) {
        // Основа кофемашины
        ctx.fillStyle = '#4A4A4A';
        ctx.fillRect(x - 8, y - 15, 16, 18);
        
        // Дисплей
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(x - 4, y - 12, 8, 4);
        
        // Кнопки
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(x - 6, y - 6, 3, 3);
        ctx.fillRect(x + 3, y - 6, 3, 3);
        
        // Чашка
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - 2, y + 1, 4, 4);
        
        // Пар
        ctx.fillStyle = '#CCCCCC';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(x - 1 + i, y - 20 - i * 2, 1, 1);
        }
    }

    drawMentorDesk(ctx, x, y) {
        // Стол ментора
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x - 14, y - 5, 28, 6);
        
        // Стул
        ctx.fillStyle = '#654321';
        ctx.fillRect(x - 8, y + 3, 16, 4);
        ctx.fillRect(x - 6, y - 8, 12, 8);
        
        // Книги
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(x - 10, y - 8, 4, 6);
        ctx.fillStyle = '#0000FF';
        ctx.fillRect(x - 5, y - 8, 4, 6);
        ctx.fillStyle = '#00AA00';
        ctx.fillRect(x, y - 8, 4, 6);
        
        // Лампа
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x + 8, y - 12, 4, 8);
    }

    drawRestZone(ctx, x, y) {
        // Диван
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(x - 12, y - 5, 24, 8);
        ctx.fillRect(x - 12, y - 12, 4, 8);
        ctx.fillRect(x + 8, y - 12, 4, 8);
        
        // Подушки
        ctx.fillStyle = '#FF6347';
        ctx.fillRect(x - 8, y - 8, 6, 4);
        ctx.fillRect(x + 2, y - 8, 6, 4);
        
        // Растение
        ctx.fillStyle = '#228B22';
        ctx.fillRect(x + 10, y - 8, 4, 8);
        ctx.fillRect(x + 11, y - 12, 2, 4);
    }

    darkenColor(color, factor) {
        const hex = color.replace('#', '');
        const r = Math.floor(parseInt(hex.substr(0, 2), 16) * factor);
        const g = Math.floor(parseInt(hex.substr(2, 2), 16) * factor);
        const b = Math.floor(parseInt(hex.substr(4, 2), 16) * factor);
        return `rgb(${r}, ${g}, ${b})`;
    }

    updateResources(resources) {
        this.resources = resources;
        this.updateResourceDisplay();
    }

    updateResourceDisplay() {
        const resourceTypes = ['coffee', 'motivation', 'knowledge', 'sleep'];
        
        resourceTypes.forEach(type => {
            const value = this.resources[type] || 0;
            const percentage = Math.max(0, Math.min(100, value));
            
            const bar = document.getElementById(`${type}-bar`);
            const valueElement = document.getElementById(`${type}-value`);
            
            if (bar) {
                bar.style.width = percentage + '%';
            }
            
            if (valueElement) {
                valueElement.textContent = Math.floor(value);
            }
        });
    }

    showSettings() {
        this.showModal('Настройки', `
            <div class="pixel-text">
                <p>🔊 Звуки: ${this.user?.settings?.soundEnabled ? 'Вкл' : 'Выкл'}</p>
                <p>🔔 Уведомления: ${this.user?.settings?.notifications ? 'Вкл' : 'Выкл'}</p>
                <p>🎨 Тема: ${this.user?.settings?.theme || 'dark'}</p>
                <p>🌍 Язык: ${this.user?.settings?.language || 'ru'}</p>
            </div>
        `);
    }

    showScreen(screenId) {
        // Скрываем все экраны
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Показываем нужный экран
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
            
            console.log(`🖥️ Switched to screen: ${screenId}`);
        }
    }

    showModal(title, content) {
        const modal = document.getElementById('modal-overlay');
        const titleElement = modal.querySelector('.modal-title');
        const bodyElement = modal.querySelector('.modal-body');
        
        titleElement.textContent = title;
        bodyElement.innerHTML = content;
        
        modal.classList.add('active');
    }

    hideModal() {
        const modal = document.getElementById('modal-overlay');
        modal.classList.remove('active');
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications-container');
        
        const notification = document.createElement('div');
        notification.className = `notification ${type} pixel-box`;
        notification.innerHTML = `
            <div class="pixel-text">${message}</div>
        `;
        
        container.appendChild(notification);
        
        // Автоматически удаляем через 3 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
        
        console.log(`📢 Notification (${type}): ${message}`);
    }

    showLoading(message = 'Загрузка...') {
        this.isLoading = true;
        // Здесь можно показать лоадер
        console.log(`⏳ Loading: ${message}`);
    }

    hideLoading() {
        this.isLoading = false;
        console.log('✅ Loading finished');
    }

    async apiCall(endpoint, data = {}, method = 'POST') {
        const url = this.API_BASE + endpoint;
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (method === 'POST') {
            options.body = JSON.stringify(data);
        }
        
        console.log(`🌐 API Call: ${method} ${endpoint}`, data);
        
        try {
            const response = await fetch(url, options);
            const result = await response.json();
            
            console.log(`✅ API Response:`, result);
            return result;
            
        } catch (error) {
            console.error(`❌ API Error:`, error);
            throw error;
        }
    }

    async checkSavedState() {
        // Проверяем есть ли сохраненное состояние в localStorage
        const savedUser = localStorage.getItem('nfactorial_user');
        const savedSession = localStorage.getItem('nfactorial_session');
        
        if (savedUser && savedSession) {
            try {
                this.user = JSON.parse(savedUser);
                this.gameSession = JSON.parse(savedSession);
                console.log('💾 Restored saved state');
            } catch (error) {
                console.error('❌ Failed to restore saved state:', error);
                localStorage.removeItem('nfactorial_user');
                localStorage.removeItem('nfactorial_session');
            }
        }
    }

    saveState() {
        if (this.user) {
            localStorage.setItem('nfactorial_user', JSON.stringify(this.user));
        }
        if (this.gameSession) {
            localStorage.setItem('nfactorial_session', JSON.stringify(this.gameSession));
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Запуск игры при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.game = new nFactorialGame();
});

// Обработка закрытия приложения
window.addEventListener('beforeunload', () => {
    if (window.game) {
        window.game.saveState();
    }
}); 