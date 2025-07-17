# 🎮 nFactorial Adventures - Архитектура игры

## 🏗️ **1. СТРУКТУРА БАЗЫ ДАННЫХ**

### 👤 **User Model**
```javascript
{
  telegramId: String, // ID пользователя в Telegram
  username: String,   // Имя в игре
  avatar: String,     // Выбранный аватар
  
  // Прогресс
  level: Number,      // Уровень игрока (1-10)
  experience: Number, // Общий опыт
  currentWeek: Number, // Текущая неделя (1-10)
  
  // Статистика
  totalPlayTime: Number,     // Общее время игры
  questsCompleted: Number,   // Завершенных квестов
  achievementsUnlocked: Array, // Разблокированные достижения
  
  // Настройки
  settings: {
    soundEnabled: Boolean,
    notifications: Boolean,
    theme: String
  },
  
  createdAt: Date,
  lastPlayed: Date
}
```

### 🎯 **GameSession Model**
```javascript
{
  userId: ObjectId,    // Ссылка на пользователя
  
  // Ресурсы (0-100)
  resources: {
    coffee: Number,     // Кофе ☕
    motivation: Number, // Мотивация 💪  
    knowledge: Number,  // Знания 🧠
    sleep: Number       // Сон 😴
  },
  
  // Локация и состояние
  currentLocation: String, // classroom, coworking, cafe, lobby
  currentWeek: Number,     // 1-10
  dayProgress: Number,     // Прогресс дня (0-100%)
  
  // Активные квесты
  activeQuests: [{
    questId: String,
    progress: Number,
    startedAt: Date,
    parameters: Object // доп. данные квеста
  }],
  
  // История действий (для аналитики)
  actions: [{
    type: String,      // 'interact', 'move', 'quest_complete'
    target: String,    // 'coffee_machine', 'npc_alex'
    timestamp: Date,
    resources_before: Object,
    resources_after: Object
  }],
  
  lastSaved: Date
}
```

### 📋 **Quest Model**
```javascript
{
  id: String,           // уникальный ID
  name: String,         // название квеста
  description: String,  // описание
  
  // Требования
  requirements: {
    week: Number,       // минимальная неделя
    location: String,   // требуемая локация
    previousQuests: [String], // предыдущие квесты
    resources: Object   // минимальные ресурсы
  },
  
  // Цель квеста
  objective: {
    type: String,       // 'interact', 'reach_resources', 'time_based'
    target: String,     // что нужно сделать
    amount: Number,     // количество
    timeLimit: Number   // лимит времени (опционально)
  },
  
  // Награды
  rewards: {
    experience: Number,
    resources: Object,  // бонус к ресурсам
    achievements: [String], // разблокируемые достижения
    unlocks: [String]   // что разблокируется
  },
  
  // Диалоги NPC
  dialogues: [{
    npcId: String,
    text: String,
    options: [String]
  }],
  
  difficulty: String,   // easy, medium, hard
  category: String,     // coding, social, learning
  isActive: Boolean
}
```

### 🏆 **Achievement Model**
```javascript
{
  id: String,
  name: String,
  description: String,
  icon: String,         // эмодзи или путь к картинке
  
  // Условия разблокировки
  conditions: {
    type: String,       // 'resource_threshold', 'quest_count', 'time_played'
    parameters: Object  // специфичные параметры
  },
  
  // Награды
  rewards: {
    experience: Number,
    title: String,      // титул игрока
    badge: String       // значок
  },
  
  rarity: String,       // common, rare, epic, legendary
  category: String,     // learning, social, endurance, master
  unlockMessage: String // сообщение при разблокировке
}
```

## ⚙️ **2. ИГРОВЫЕ МЕХАНИКИ**

### 🔋 **Система ресурсов**
```javascript
// Автоматический расход ресурсов
const RESOURCE_DECAY = {
  coffee: 2,      // -2 каждые 5 минут
  motivation: 1,  // -1 каждые 10 минут
  knowledge: 0,   // не уменьшается
  sleep: 3        // -3 каждые 15 минут
};

// Взаимодействия с объектами
const INTERACTIONS = {
  coffee_machine: { coffee: +40, motivation: +5 },
  computer: { knowledge: +15, coffee: -10, motivation: -5 },
  mentor_npc: { motivation: +25, knowledge: +10, coffee: -5 },
  bed: { sleep: +60, motivation: +10 },
  food: { motivation: +15, sleep: +10 }
};
```

### 📅 **Система времени**
```javascript
// Время влияет на эффективность
const TIME_EFFECTS = {
  morning: { efficiency: 1.2 },    // 06:00-12:00
  afternoon: { efficiency: 1.0 },  // 12:00-18:00  
  evening: { efficiency: 0.8 },    // 18:00-22:00
  night: { efficiency: 0.5 }       // 22:00-06:00
};

// Система недель
const WEEK_PROGRESSION = {
  1: { unlocks: ['classroom', 'cafe'], quests: ['first_coffee', 'meet_mentor'] },
  2: { unlocks: ['coworking'], quests: ['first_project', 'team_work'] },
  3: { unlocks: ['advanced_coding'], quests: ['react_basics'] },
  // ... до недели 10
};
```

### 🎯 **Система квестов**
```javascript
// Типы квестов
const QUEST_TYPES = {
  TUTORIAL: 'Обучающие квесты',
  CODING: 'Задания по программированию', 
  SOCIAL: 'Взаимодействие с NPC',
  RESOURCE: 'Управление ресурсами',
  TIME: 'Временные челленджи',
  WEEKLY: 'Еженедельные цели'
};

// Пример квеста
const SAMPLE_QUEST = {
  id: 'first_coffee',
  name: 'Первый кофе в nFactorial',
  description: 'Найди кофе-машину и выпей свой первый кофе!',
  objective: { type: 'interact', target: 'coffee_machine', amount: 1 },
  rewards: { experience: 50, resources: { motivation: 10 } }
};
```

## 🔌 **3. API ENDPOINTS**

### 👤 **Пользователи**
- `POST /api/auth/login` - Авторизация через Telegram
- `GET /api/user/profile` - Профиль пользователя
- `PUT /api/user/settings` - Обновление настроек

### 🎮 **Игровой процесс**  
- `GET /api/game/state` - Текущее состояние игры
- `POST /api/game/action` - Выполнение действия
- `POST /api/game/move` - Перемещение между локациями
- `POST /api/game/interact` - Взаимодействие с объектом/NPC

### 📋 **Квесты**
- `GET /api/quests/available` - Доступные квесты
- `POST /api/quests/start` - Начать квест
- `POST /api/quests/complete` - Завершить квест
- `GET /api/quests/progress` - Прогресс квестов

### 🏆 **Достижения и рейтинг**
- `GET /api/achievements` - Все достижения
- `POST /api/achievements/unlock` - Разблокировать достижение
- `GET /api/leaderboard` - Топ игроков
- `GET /api/stats/global` - Глобальная статистика

## 🔄 **4. ИГРОВОЙ ЦИКЛ**

1. **Вход в игру** → Загрузка состояния из БД
2. **Автообновление ресурсов** → Расчет изменений за время отсутствия
3. **Игровые действия** → Взаимодействия, перемещения, квесты
4. **Сохранение прогресса** → Обновление БД каждые 30 сек
5. **Проверка достижений** → Автоматическая разблокировка
6. **Обновление рейтинга** → Пересчет позиций

## 🎨 **5. NPC СИСТЕМА**

### 👨‍🏫 **Ментор Алекс**
```javascript
{
  id: 'mentor_alex',
  name: 'Алекс',
  role: 'Senior Mentor', 
  location: 'classroom',
  
  // Динамические диалоги на основе прогресса
  dialogues: {
    week_1: ['Добро пожаловать! Начнем с основ...'],
    week_5: ['Отлично! Теперь усложним задачи...'],
    week_10: ['Ты почти готов к выпуску!']
  },
  
  // Квесты которые может дать
  quests: ['first_coding_task', 'debug_challenge', 'final_project'],
  
  // Влияние на ресурсы при взаимодействии
  interaction_effects: {
    motivation: +25,
    knowledge: +10,
    coffee: -5
  }
}
```

## 🚀 **ЭТАПЫ РЕАЛИЗАЦИИ**

1. **Фаза 1**: База данных и API (модели, схемы, базовые endpoint'ы)
2. **Фаза 2**: Система ресурсов (автообновление, взаимодействия)
3. **Фаза 3**: Квесты и достижения (логика выполнения)
4. **Фаза 4**: Интеграция с frontend (замена моков на реальные API)
5. **Фаза 5**: Балансировка и тестирование

Готов начать реализацию? С чего начнем? 🎯 