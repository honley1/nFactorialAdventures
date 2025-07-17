// nFactorial Adventures - First Person View Game
console.log('🎮 nFactorial Adventures Loading...');

// Telegram Web App инициализация
let tg = window.Telegram?.WebApp;
let user = null;
let gameState = null;
let gameCanvas = null;
let gameContext = null;

// ===== FIRST PERSON GAME STATE =====
let currentLocation = 'classroom';
let gameResources = {
    coffee: 100,
    motivation: 100,
    knowledge: 0,
    sleep: 100
};

let gameStats = {
    week: 1,
    day: 1,
    timeOfDay: 'morning',
    totalScore: 0,
    level: 1,
    projectsCompleted: 0,
    mentorInteractions: 0,
    coffeeConsumed: 0
};

let currentMessage = null;
let messageTimer = 0;
let animationId = null;
let interactiveObjects = [];

// ===== LOCATIONS & SCENES =====
const gameLocations = {
    classroom: {
        name: 'Учебный класс nFactorial',
        description: 'Современный класс с большими экранами и удобными столами. Здесь проходят лекции и практические занятия.',
        background: 'classroom_bg',
        objects: [
            {
                id: 'coffee_machine',
                name: 'Кофе-машина ☕',
                type: 'coffee_machine',
                x: 15, y: 45, width: 25, height: 35,
                description: 'Настоящее спасение студентов. Всегда готова поделиться бодрящим напитком.',
                action: 'use_coffee'
            },
            {
                id: 'computer_lab',
                name: 'Рабочие станции 💻',
                type: 'computer',
                x: 40, y: 35, width: 30, height: 25,
                description: 'Мощные компьютеры для разработки. Здесь рождается код.',
                action: 'use_computer'
            },
            {
                id: 'mentor_desk',
                name: 'Ментор 👨‍🏫',
                type: 'mentor',
                x: 70, y: 30, width: 20, height: 40,
                description: 'Опытный ментор всегда готов помочь с вопросами и дать ценный совет.',
                action: 'talk_to_mentor'
            },
            {
                id: 'whiteboard',
                name: 'Доска с заданиями 📋',
                type: 'board',
                x: 30, y: 15, width: 40, height: 20,
                description: 'На доске написаны задания на сегодня и важные объявления.',
                action: 'check_assignments'
            }
        ],
        exits: [
            { name: 'Коворкинг', direction: 'right', target: 'coworking' },
            { name: 'Холл', direction: 'back', target: 'lobby' }
        ]
    },
    
    coworking: {
        name: 'Коворкинг зона',
        description: 'Открытое пространство для работы над проектами. Здесь студенты объединяются в команды.',
        background: 'coworking_bg',
        objects: [
            {
                id: 'project_board',
                name: 'Доска проектов 🚀',
                type: 'project_board',
                x: 20, y: 25, width: 35, height: 30,
                description: 'Здесь можно выбрать проект для работы или посмотреть прогресс команды.',
                action: 'manage_projects'
            },
            {
                id: 'coffee_corner',
                name: 'Кофе-корнер ☕',
                type: 'coffee_machine',
                x: 75, y: 50, width: 20, height: 30,
                description: 'Еще одна кофе-машина для тех, кто работает допоздна.',
                action: 'use_coffee'
            },
            {
                id: 'team_table',
                name: 'Стол для команды 👥',
                type: 'table',
                x: 45, y: 45, width: 25, height: 20,
                description: 'Место для встреч команды и обсуждения проектов.',
                action: 'team_meeting'
            }
        ],
        exits: [
            { name: 'Учебный класс', direction: 'left', target: 'classroom' },
            { name: 'Кафе', direction: 'forward', target: 'cafe' }
        ]
    },
    
    lobby: {
        name: 'Главный холл nFactorial',
        description: 'Просторный холл с логотипом nFactorial. Здесь проходят важные события и встречи.',
        background: 'lobby_bg',
        objects: [
            {
                id: 'nfactorial_logo',
                name: 'Логотип nFactorial 🏢',
                type: 'decoration',
                x: 35, y: 20, width: 30, height: 25,
                description: 'Гордость школы - светящийся логотип nFactorial.',
                action: 'admire_logo'
            },
            {
                id: 'announcement_board',
                name: 'Доска объявлений 📢',
                type: 'board',
                x: 15, y: 35, width: 25, height: 35,
                description: 'Важные новости, объявления о хакатонах и мероприятиях.',
                action: 'read_announcements'
            },
            {
                id: 'reception',
                name: 'Ресепшн 💼',
                type: 'reception',
                x: 65, y: 45, width: 30, height: 25,
                description: 'Администрация школы. Здесь можно решить организационные вопросы.',
                action: 'visit_reception'
            }
        ],
        exits: [
            { name: 'Учебный класс', direction: 'forward', target: 'classroom' },
            { name: 'Кафе', direction: 'right', target: 'cafe' }
        ]
    },
    
    cafe: {
        name: 'Кафе nFactorial',
        description: 'Уютное кафе для отдыха и неформального общения. Место силы для студентов.',
        background: 'cafe_bg',
        objects: [
            {
                id: 'food_counter',
                name: 'Стойка с едой 🍕',
                type: 'food',
                x: 25, y: 40, width: 30, height: 25,
                description: 'Вкусная еда для восстановления сил и энергии.',
                action: 'buy_food'
            },
            {
                id: 'chill_zone',
                name: 'Зона отдыха 🛋️',
                type: 'rest',
                x: 60, y: 50, width: 25, height: 30,
                description: 'Удобные диваны для отдыха и восстановления сна.',
                action: 'take_rest'
            },
            {
                id: 'networking_area',
                name: 'Зона нетворкинга 🤝',
                type: 'social',
                x: 40, y: 25, width: 35, height: 20,
                description: 'Место для знакомств с другими студентами и выпускниками.',
                action: 'network'
            }
        ],
        exits: [
            { name: 'Коворкинг', direction: 'back', target: 'coworking' },
            { name: 'Холл', direction: 'left', target: 'lobby' }
        ]
    }
};

// ===== GAME BACKGROUNDS =====
const backgrounds = {
    classroom_bg: {
        sky: '#87CEEB',
        wall: '#f8f9fa',
        floor: '#495057',
        elements: [
            { type: 'window', x: 5, y: 10, width: 20, height: 25 },
            { type: 'projector_screen', x: 25, y: 5, width: 50, height: 30 }
        ]
    },
    coworking_bg: {
        sky: '#87CEEB',
        wall: '#e9ecef',
        floor: '#6c757d',
        elements: [
            { type: 'plants', x: 10, y: 60, width: 15, height: 20 },
            { type: 'modern_lights', x: 0, y: 0, width: 100, height: 15 }
        ]
    },
    lobby_bg: {
        sky: '#87CEEB',
        wall: '#ffffff',
        floor: '#343a40',
        elements: [
            { type: 'marble_pillars', x: 5, y: 20, width: 10, height: 60 },
            { type: 'marble_pillars', x: 85, y: 20, width: 10, height: 60 },
            { type: 'chandelier', x: 40, y: 5, width: 20, height: 15 }
        ]
    },
    cafe_bg: {
        sky: '#87CEEB',
        wall: '#fff3cd',
        floor: '#8d5524',
        elements: [
            { type: 'cafe_lights', x: 0, y: 0, width: 100, height: 10 },
            { type: 'cafe_decor', x: 75, y: 15, width: 20, height: 30 }
        ]
    }
};

// ===== CORE GAME FUNCTIONS =====

// Инициализация игры
function initGame() {
    console.log('🎯 Initializing First Person Game...');
    
    gameCanvas = document.getElementById('game-canvas');
    gameContext = gameCanvas.getContext('2d');
    
    // Установка размеров canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Инициализация интерфейса
    setupEventListeners();
    setupInteractiveObjects();
    
    // Запуск игрового цикла
    gameLoop();
    
    console.log('✅ Game initialized successfully');
}

// Изменение размера canvas
function resizeCanvas() {
    const container = gameCanvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    gameCanvas.width = rect.width;
    gameCanvas.height = rect.height;
    
    // Обновить позиции интерактивных объектов
    updateInteractiveObjectPositions();
}

// Настройка событий
function setupEventListeners() {
    // Кнопки действий
    document.getElementById('look-around').addEventListener('click', () => {
        lookAround();
    });
    
    document.getElementById('interact-btn').addEventListener('click', () => {
        showInteractionHints();
    });
    
    document.getElementById('move-btn').addEventListener('click', () => {
        showMovementOptions();
    });
    
    document.getElementById('menu-btn-action').addEventListener('click', () => {
        showGameMenu();
    });
    
    // Клики по canvas для взаимодействия
    gameCanvas.addEventListener('click', handleCanvasClick);
    
    // Hover эффекты
    gameCanvas.addEventListener('mousemove', handleCanvasHover);
}

// Настройка интерактивных объектов
function setupInteractiveObjects() {
    const overlay = document.getElementById('interactive-overlay');
    overlay.innerHTML = '';
    
    const location = gameLocations[currentLocation];
    if (!location) return;
    
    interactiveObjects = [];
    
    location.objects.forEach(obj => {
        const element = document.createElement('div');
        element.className = 'interactive-object';
        element.id = `obj-${obj.id}`;
        element.innerHTML = `
            <div class="fp-object-label">${obj.name}</div>
        `;
        
        element.addEventListener('click', () => {
            interactWithObject(obj);
        });
        
        overlay.appendChild(element);
        interactiveObjects.push({ element, data: obj });
    });
    
    updateInteractiveObjectPositions();
}

// Обновление позиций объектов
function updateInteractiveObjectPositions() {
    if (!gameCanvas) return;
    
    const canvasRect = gameCanvas.getBoundingClientRect();
    
    interactiveObjects.forEach(({ element, data }) => {
        const x = (data.x / 100) * canvasRect.width;
        const y = (data.y / 100) * canvasRect.height;
        const width = (data.width / 100) * canvasRect.width;
        const height = (data.height / 100) * canvasRect.height;
        
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
    });
}

// ===== RENDERING FUNCTIONS =====

// Основная функция рендеринга
function render() {
    if (!gameContext) return;
    
    const canvas = gameCanvas;
    const ctx = gameContext;
    
    // Очистка canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рендер фона локации
    renderBackground();
    
    // Рендер элементов локации
    renderLocationElements();
    
    // Эффекты и анимации
    renderEffects();
}

// Рендер фона
function renderBackground() {
    const canvas = gameCanvas;
    const ctx = gameContext;
    const location = gameLocations[currentLocation];
    const bg = backgrounds[location.background];
    
    if (!bg) return;
    
    // Небо/верхняя часть
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.4);
    gradient.addColorStop(0, bg.sky);
    gradient.addColorStop(1, lightenColor(bg.wall, 20));
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.4);
    
    // Стены
    ctx.fillStyle = bg.wall;
    ctx.fillRect(0, canvas.height * 0.4, canvas.width, canvas.height * 0.35);
    
    // Пол
    const floorGradient = ctx.createLinearGradient(0, canvas.height * 0.75, 0, canvas.height);
    floorGradient.addColorStop(0, bg.floor);
    floorGradient.addColorStop(1, darkenColor(bg.floor, 30));
    
    ctx.fillStyle = floorGradient;
    ctx.fillRect(0, canvas.height * 0.75, canvas.width, canvas.height * 0.25);
    
    // Элементы фона
    renderBackgroundElements(bg.elements);
}

// Рендер элементов фона
function renderBackgroundElements(elements) {
    const canvas = gameCanvas;
    const ctx = gameContext;
    
    if (!elements) return;
    
    elements.forEach(element => {
        const x = (element.x / 100) * canvas.width;
        const y = (element.y / 100) * canvas.height;
        const width = (element.width / 100) * canvas.width;
        const height = (element.height / 100) * canvas.height;
        
        switch (element.type) {
            case 'window':
                renderWindow(x, y, width, height);
                break;
            case 'projector_screen':
                renderProjectorScreen(x, y, width, height);
                break;
            case 'plants':
                renderPlants(x, y, width, height);
                break;
            case 'modern_lights':
                renderModernLights(x, y, width, height);
                break;
            case 'marble_pillars':
                renderMarblePillars(x, y, width, height);
                break;
            case 'chandelier':
                renderChandelier(x, y, width, height);
                break;
            case 'cafe_lights':
                renderCafeLights(x, y, width, height);
                break;
            case 'cafe_decor':
                renderCafeDecor(x, y, width, height);
                break;
        }
    });
}

// Рендер конкретных элементов
function renderWindow(x, y, width, height) {
    const ctx = gameContext;
    
    // Рама окна
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x, y, width, height);
    
    // Стекло
    ctx.fillStyle = '#E6F3FF';
    ctx.fillRect(x + 2, y + 2, width - 4, height - 4);
    
    // Крестовина
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + width/2 - 1, y + 2, 2, height - 4);
    ctx.fillRect(x + 2, y + height/2 - 1, width - 4, 2);
}

function renderProjectorScreen(x, y, width, height) {
    const ctx = gameContext;
    
    // Экран
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(x, y, width, height);
    
    // Рамка
    ctx.strokeStyle = '#343a40';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Текст nFactorial
    ctx.fillStyle = '#007bff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('nFactorial', x + width/2, y + height/2);
}

function renderPlants(x, y, width, height) {
    const ctx = gameContext;
    
    // Горшок
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x, y + height * 0.7, width, height * 0.3);
    
    // Растение
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.ellipse(x + width/2, y + height * 0.4, width * 0.4, height * 0.4, 0, 0, 2 * Math.PI);
    ctx.fill();
}

function renderModernLights(x, y, width, height) {
    const ctx = gameContext;
    
    ctx.fillStyle = '#FFD700';
    for (let i = 0; i < 5; i++) {
        const lightX = x + (i * width / 4);
        ctx.beginPath();
        ctx.arc(lightX, y + height/2, 3, 0, 2 * Math.PI);
        ctx.fill();
    }
}

function renderMarblePillars(x, y, width, height) {
    const ctx = gameContext;
    
    // Основа
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(x, y, width, height);
    
    // Мраморные прожилки
    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x, y + (i * height / 3));
        ctx.lineTo(x + width, y + (i * height / 3) + 5);
        ctx.stroke();
    }
}

function renderChandelier(x, y, width, height) {
    const ctx = gameContext;
    
    // Основа люстры
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x + width * 0.2, y, width * 0.6, height * 0.3);
    
    // Свет
    ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x + width/2, y + height, width * 0.8, height * 0.5, 0, 0, 2 * Math.PI);
    ctx.fill();
}

function renderCafeLights(x, y, width, height) {
    const ctx = gameContext;
    
    ctx.fillStyle = '#FF6B35';
    for (let i = 0; i < 8; i++) {
        const lightX = x + (i * width / 7);
        ctx.beginPath();
        ctx.arc(lightX, y + height/2, 2, 0, 2 * Math.PI);
        ctx.fill();
    }
}

function renderCafeDecor(x, y, width, height) {
    const ctx = gameContext;
    
    // Декор кафе
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x, y, width, height);
    
    ctx.fillStyle = '#FFE4B5';
    ctx.fillRect(x + 2, y + 2, width - 4, height - 4);
}

// Рендер элементов локации (объекты)
function renderLocationElements() {
    // Объекты теперь рендерятся как HTML элементы
    // Здесь можем добавить дополнительные эффекты
}

// Рендер эффектов
function renderEffects() {
    const ctx = gameContext;
    
    // Эффект времени дня
    renderTimeOfDayEffect();
    
    // Частицы/атмосфера
    renderAtmosphere();
}

function renderTimeOfDayEffect() {
    const ctx = gameContext;
    const canvas = gameCanvas;
    
    let overlayColor;
    let alpha;
    
    switch (gameStats.timeOfDay) {
        case 'morning':
            overlayColor = 'rgba(255, 223, 186, ';
            alpha = 0.1;
            break;
        case 'afternoon':
            overlayColor = 'rgba(255, 255, 255, ';
            alpha = 0;
            break;
        case 'evening':
            overlayColor = 'rgba(255, 140, 0, ';
            alpha = 0.15;
            break;
        case 'night':
            overlayColor = 'rgba(25, 25, 112, ';
            alpha = 0.3;
            break;
    }
    
    if (alpha > 0) {
        ctx.fillStyle = overlayColor + alpha + ')';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function renderAtmosphere() {
    // Добавить частицы, пыль, etc.
    // Для простоты пока пропускаем
}

// ===== GAME ACTIONS =====

// Взаимодействие с объектом
function interactWithObject(obj) {
    console.log(`🎯 Interacting with: ${obj.name}`);
    
    tg?.HapticFeedback?.impactOccurred('light');
    
    switch (obj.action) {
        case 'use_coffee':
            useCoffeeMachine();
            break;
        case 'use_computer':
            useComputer();
            break;
        case 'talk_to_mentor':
            talkToMentor();
            break;
        case 'check_assignments':
            checkAssignments();
            break;
        case 'manage_projects':
            manageProjects();
            break;
        case 'team_meeting':
            teamMeeting();
            break;
        case 'admire_logo':
            admireLogo();
            break;
        case 'read_announcements':
            readAnnouncements();
            break;
        case 'visit_reception':
            visitReception();
            break;
        case 'buy_food':
            buyFood();
            break;
        case 'take_rest':
            takeRest();
            break;
        case 'network':
            networkWithStudents();
            break;
        default:
            showMessage(`Взаимодействие с ${obj.name}`);
    }
}

// Осмотреться
function lookAround() {
    const location = gameLocations[currentLocation];
    showMessage(`📍 ${location.name}\n\n${location.description}`);
    
    // Подсветить все интерактивные объекты
    interactiveObjects.forEach(({ element }) => {
        element.classList.add('highlighted');
        setTimeout(() => {
            element.classList.remove('highlighted');
        }, 3000);
    });
}

// Показать подсказки по взаимодействию
function showInteractionHints() {
    const location = gameLocations[currentLocation];
    const hints = location.objects.map(obj => `• ${obj.name}`).join('\n');
    
    showMessage(`🎯 Доступные действия:\n\n${hints}\n\nНажмите на объект для взаимодействия`);
}

// Показать варианты перемещения
function showMovementOptions() {
    const location = gameLocations[currentLocation];
    
    if (location.exits.length === 0) {
        showMessage('🚪 Отсюда некуда пойти');
        return;
    }
    
    const exitsList = location.exits.map(exit => 
        `• ${exit.name} (${getDirectionEmoji(exit.direction)})`
    ).join('\n');
    
    showMessage(`🚶 Куда пойти?\n\n${exitsList}`, () => {
        showExitButtons(location.exits);
    });
}

// Показать кнопки выходов
function showExitButtons(exits) {
    const actionButtons = document.querySelector('.action-buttons');
    const originalHTML = actionButtons.innerHTML;
    
    actionButtons.innerHTML = exits.map(exit => `
        <button class="action-btn" onclick="moveToLocation('${exit.target}')">
            <span class="action-icon">${getDirectionEmoji(exit.direction)}</span>
            <span>${exit.name}</span>
        </button>
    `).join('') + `
        <button class="action-btn" onclick="restoreActionButtons()">
            <span class="action-icon">↩️</span>
            <span>Назад</span>
        </button>
    `;
    
    // Сохранить оригинальный HTML для восстановления
    window.originalActionButtons = originalHTML;
}

// Восстановить оригинальные кнопки
function restoreActionButtons() {
    if (window.originalActionButtons) {
        document.querySelector('.action-buttons').innerHTML = window.originalActionButtons;
        setupEventListeners(); // Пересоздать обработчики событий
    }
}

// Переместиться в локацию
function moveToLocation(targetLocation) {
    if (!gameLocations[targetLocation]) {
        showMessage('❌ Неизвестная локация');
        return;
    }
    
    console.log(`🚶 Moving to: ${targetLocation}`);
    
    currentLocation = targetLocation;
    setupInteractiveObjects();
    
    const location = gameLocations[currentLocation];
    showMessage(`📍 Перешли в: ${location.name}`);
    
    // Небольшие затраты ресурсов на перемещение
    updateResource('motivation', -5);
    
    // Восстановить кнопки действий
    restoreActionButtons();
    
    tg?.HapticFeedback?.impactOccurred('medium');
}

// ===== RESOURCE ACTIONS =====

function useCoffeeMachine() {
    if (gameResources.coffee >= 90) {
        showMessage('☕ У вас уже достаточно кофе!');
        return;
    }
    
    updateResource('coffee', 30);
    gameStats.coffeeConsumed++;
    
    const messages = [
        '☕ Ароматный кофе добавил вам энергии!',
        '☕ Бодрящий напиток поднял настроение!',
        '☕ Кофеин начал действовать!',
        '☕ Теперь можно кодить до утра!'
    ];
    
    showMessage(messages[Math.floor(Math.random() * messages.length)]);
    
    // Достижения
    if (gameStats.coffeeConsumed === 1) {
        unlockAchievement('first_coffee');
    }
    if (gameStats.coffeeConsumed === 10) {
        unlockAchievement('coffee_lover');
    }
}

function useComputer() {
    if (gameResources.knowledge >= 90) {
        showMessage('🧠 Ваши знания уже на максимуме!');
        return;
    }
    
    if (gameResources.coffee < 10) {
        showMessage('☕ Нужно больше кофе для концентрации!');
        return;
    }
    
    updateResource('knowledge', 10);
    updateResource('coffee', -10);
    updateResource('motivation', -5);
    
    gameStats.totalScore += 50;
    updateScoreDisplay();
    
    const codingMessages = [
        '💻 Написали крутой код на JavaScript!',
        '💻 Разобрались с React хуками!',
        '💻 Создали красивый компонент!',
        '💻 Исправили баг и чувствуете себя героем!',
        '💻 Изучили новую библиотеку!',
        '💻 Оптимизировали алгоритм!'
    ];
    
    showMessage(codingMessages[Math.floor(Math.random() * codingMessages.length)]);
}

function talkToMentor() {
    if (gameResources.motivation >= 90) {
        showMessage('💪 Ваша мотивация уже на пике!');
        return;
    }
    
    if (gameResources.knowledge < 5) {
        showMessage('🧠 Сначала изучите базу, потом приходите с вопросами!');
        return;
    }
    
    updateResource('motivation', 20);
    updateResource('knowledge', -10);
    
    gameStats.mentorInteractions++;
    gameStats.totalScore += 30;
    updateScoreDisplay();
    
    const mentorMessages = [
        '👨‍🏫 "Отличная работа! Продолжайте в том же духе!"',
        '👨‍🏫 "Помните: лучший код - это читаемый код"',
        '👨‍🏫 "Ошибки - это возможности для обучения"',
        '👨‍🏫 "Не забывайте про отдых между кодингом"',
        '👨‍🏫 "Ваш прогресс впечатляет!"',
        '👨‍🏫 "Попробуйте новый подход к этой задаче"'
    ];
    
    showMessage(mentorMessages[Math.floor(Math.random() * mentorMessages.length)]);
    
    if (gameStats.mentorInteractions === 1) {
        unlockAchievement('first_mentor_talk');
    }
}

function checkAssignments() {
    const assignments = [
        '📋 Сегодня: Создать React компонент',
        '📋 Завтра: Изучить хуки useState и useEffect',
        '📋 На неделе: Финальный проект',
        '📋 Дедлайн: Презентация в пятницу',
        '📋 Новое: Хакатон в выходные'
    ];
    
    const randomAssignment = assignments[Math.floor(Math.random() * assignments.length)];
    showMessage(randomAssignment);
}

function manageProjects() {
    showMessage('🚀 Проекты доступны:\n\n• Todo App (Легкий)\n• E-commerce (Средний)\n• Social Network (Сложный)\n\nВыберите проект для работы!');
}

function teamMeeting() {
    updateResource('motivation', 15);
    gameStats.totalScore += 25;
    updateScoreDisplay();
    
    showMessage('👥 Продуктивная встреча с командой! Обсудили планы и распределили задачи.');
}

function admireLogo() {
    updateResource('motivation', 5);
    showMessage('🏢 Логотип nFactorial вдохновляет на новые достижения!');
}

function readAnnouncements() {
    const announcements = [
        '📢 Новый хакатон уже в эту субботу!',
        '📢 Встреча с выпускниками в четверг',
        '📢 Дополнительные лекции по алгоритмам',
        '📢 Карьерная ярмарка в следующем месяце',
        '📢 Открыта регистрация на интенсив'
    ];
    
    const randomNews = announcements[Math.floor(Math.random() * announcements.length)];
    showMessage(randomNews);
}

function visitReception() {
    showMessage('💼 Администрация: "Добро пожаловать в nFactorial! Все вопросы решаем оперативно."');
}

function buyFood() {
    if (gameResources.motivation >= 90) {
        showMessage('🍕 Вы уже сыты и довольны!');
        return;
    }
    
    updateResource('motivation', 25);
    updateResource('sleep', 10);
    gameStats.totalScore += 20;
    updateScoreDisplay();
    
    showMessage('🍕 Вкусная еда восстановила силы и подняла настроение!');
}

function takeRest() {
    if (gameResources.sleep >= 90) {
        showMessage('😴 Вы уже хорошо отдохнули!');
        return;
    }
    
    updateResource('sleep', 40);
    updateResource('motivation', 10);
    
    showMessage('😴 Короткий отдых освежил голову. Теперь можно кодить с новыми силами!');
}

function networkWithStudents() {
    updateResource('motivation', 15);
    gameStats.totalScore += 35;
    updateScoreDisplay();
    
    const networkingMessages = [
        '🤝 Познакомились с крутым фронтенд разработчиком!',
        '🤝 Обменялись контактами с будущим коллегой!',
        '🤝 Узнали о новых возможностях в IT!',
        '🤝 Договорились о совместном проекте!',
        '🤝 Получили приглашение на стажировку!'
    ];
    
    showMessage(networkingMessages[Math.floor(Math.random() * networkingMessages.length)]);
}

// ===== UTILITY FUNCTIONS =====

// Обновление ресурсов
function updateResource(type, amount) {
    if (!gameResources.hasOwnProperty(type)) return;
    
    gameResources[type] = Math.max(0, Math.min(100, gameResources[type] + amount));
    
    // Обновить UI
    const fillElement = document.getElementById(`${type}-fill`);
    const valueElement = document.getElementById(`${type}-value`);
    
    if (fillElement) {
        fillElement.style.width = `${gameResources[type]}%`;
    }
    
    if (valueElement) {
        valueElement.textContent = Math.round(gameResources[type]);
    }
    
    // Проверка достижений
    checkResourceAchievements();
}

// Обновление отображения очков
function updateScoreDisplay() {
    // Здесь можно добавить отображение общего счета
    console.log(`Score: ${gameStats.totalScore}`);
}

// Показать сообщение
function showMessage(text, callback = null) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
        <div class="menu-content">
            <button class="close-menu" onclick="this.parentElement.parentElement.remove()">✕</button>
            <p style="font-size: 8px; line-height: 1.4; margin-bottom: 15px;">${text.replace(/\n/g, '<br>')}</p>
            <button class="pixel-btn primary" onclick="this.parentElement.parentElement.remove()${callback ? '; (' + callback + ')()' : ''}">OK</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    tg?.HapticFeedback?.notificationOccurred('success');
    
    // Автоудаление через 5 секунд
    setTimeout(() => {
        if (overlay.parentElement) {
            overlay.remove();
        }
    }, 5000);
}

// Показать игровое меню
function showGameMenu() {
    const menuHTML = `
        <div class="overlay">
            <div class="menu-content">
                <button class="close-menu" onclick="this.parentElement.parentElement.remove()">✕</button>
                <h3>Меню игры</h3>
                <button class="menu-item" onclick="showStats()">📊 Статистика</button>
                <button class="menu-item" onclick="showAchievements()">🏆 Достижения</button>
                <button class="menu-item" onclick="showHelp()">❓ Помощь</button>
                <button class="menu-item" onclick="showSettings()">⚙️ Настройки</button>
                <button class="menu-item danger" onclick="restartGame()">🔄 Начать заново</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', menuHTML);
}

// Разблокировать достижение
function unlockAchievement(achievementId) {
    showMessage(`🎉 Достижение разблокировано!\n\n🏆 ${getAchievementName(achievementId)}`);
    gameStats.totalScore += 100;
    updateScoreDisplay();
}

// Получить название достижения
function getAchievementName(id) {
    const achievements = {
        'first_coffee': 'Первый глоток ☕',
        'coffee_lover': 'Кофеман ☕',
        'first_mentor_talk': 'Знакомство с ментором 👨‍🏫'
    };
    
    return achievements[id] || 'Неизвестное достижение';
}

// Проверка достижений по ресурсам
function checkResourceAchievements() {
    if (gameResources.knowledge >= 100) {
        unlockAchievement('knowledge_master');
    }
}

// Эмоджи для направлений
function getDirectionEmoji(direction) {
    const emojis = {
        'forward': '⬆️',
        'back': '⬇️',
        'left': '⬅️',
        'right': '➡️'
    };
    
    return emojis[direction] || '🚪';
}

// Вспомогательные функции для цвета
function lightenColor(color, percent) {
    // Простая реализация осветления цвета
    return color;
}

function darkenColor(color, percent) {
    // Простая реализация затемнения цвета
    return color;
}

// Обработка кликов по canvas
function handleCanvasClick(event) {
    const rect = gameCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    console.log(`Canvas click at: ${x}, ${y}`);
}

// Обработка наведения мыши
function handleCanvasHover(event) {
    // Можно добавить эффекты при наведении
}

// Игровой цикл
function gameLoop() {
    render();
    
    // Логика игры
    gameLogicUpdate();
    
    animationId = requestAnimationFrame(gameLoop);
}

// Обновление игровой логики
function gameLogicUpdate() {
    // Постепенное уменьшение ресурсов
    if (Date.now() % 10000 < 50) { // Каждые 10 секунд
        updateResource('motivation', -1);
        updateResource('sleep', -1);
        
        if (gameResources.coffee > 0) {
            updateResource('coffee', -1);
        }
    }
}

// ===== INITIALIZATION =====

// Telegram Web App готовность
if (tg) {
    tg.ready();
    tg.expand();
    
    // Получение данных пользователя
    if (tg.initDataUnsafe?.user) {
        user = tg.initDataUnsafe.user;
        console.log('👤 User:', user);
    }
}

// Запуск игры при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 DOM loaded, starting game...');
    
    // Имитация загрузки
    setTimeout(() => {
        // Скрыть экран загрузки
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        // Показать экран входа или игры
        if (user) {
            showGameScreen();
        } else {
            showLoginScreen();
        }
    }, 3000);
});

// Показать экран игры
function showGameScreen() {
    document.querySelector('.login-screen').style.display = 'none';
    document.querySelector('.game-screen').classList.add('active');
    
    initGame();
}

// Показать экран входа
function showLoginScreen() {
    document.querySelector('.login-screen').style.display = 'flex';
}

// Вход в игру
function startGame() {
    const username = document.getElementById('username').value;
    const selectedAvatar = document.querySelector('.avatar-option.selected')?.textContent;
    
    if (!username || !selectedAvatar) {
        showMessage('❌ Заполните все поля');
        return;
    }
    
    // Создать пользователя
    user = {
        username: username,
        avatar: selectedAvatar,
        first_name: username
    };
    
    showGameScreen();
}

console.log('✅ nFactorial Adventures script loaded'); 