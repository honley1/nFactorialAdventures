# 🎯 ПЛАН ИНТЕГРАЦИИ nFactorial DOOM

## 📋 **СЮЖЕТ И КОНЦЕПЦИЯ**

### **🎮 Игровая концепция:**
**nFactorial DOOM Academy** - виртуальная тренировочная симуляция, где студенты проходят испытания буткемпа, сражаясь с багами и дедлайнами в лабиринтах кода.

### **📖 Сюжетная арка:**

**Пролог:** Студент подключается к симуляции nFactorial, чтобы отточить навыки программирования в экстремальных условиях.

**Уровни-Недели:**
1. **Week 1: HTML Hell** 🔥 - Основы веб-разработки, простые баги
2. **Week 3: CSS Nightmare** 👹 - Стилизация и адаптивность, сложные враги
3. **Week 5: JavaScript Inferno** ⚡ - Логика и алгоритмы, боссы дедлайнов
4. **Week 8: React Abyss** ⚛️ - Компонентная архитектура, командные квесты
5. **Week 10: Final Exam Doom** 💀 - Финальный проект, все враги вместе

**Эпилог:** Выпуск из nFactorial с сертификатом "DOOM Survivor".

---

## 🔗 **ТЕКУЩЕЕ СОСТОЯНИЕ СВЯЗЕЙ**

### **✅ Что уже работает:**
- Аутентификация через Telegram (`/api/auth/login`)
- Пользователи сохраняются в MongoDB
- DOOM фронтенд полностью функционален

### **🔧 Что нужно интегрировать:**

#### **1. Новые API endpoints (уже созданы):**
```
POST /api/doom/init          - Инициализация DOOM сессии
POST /api/doom/sync          - Синхронизация состояния игрока
POST /api/doom/enemy-killed  - Уничтожение врага
POST /api/doom/item-collected - Сбор предмета
POST /api/doom/npc-dialogue  - Диалог с NPC
POST /api/doom/death         - Смерть игрока
POST /api/doom/level-complete - Завершение уровня
GET  /api/doom/leaderboard   - Таблица лидеров
```

#### **2. Модель данных DoomSession (уже создана):**
- Полная синхронизация статов игрока (health, armor, ammo)
- Отслеживание убитых врагов по типам
- Прогресс диалогов с NPC
- Система достижений
- Детальная статистика

---

## 🛠 **ПЛАН ИНТЕГРАЦИИ ФРОНТЕНДА**

### **Этап 1: Базовая синхронизация**

#### **1.1 Инициализация при входе в игру**
```javascript
// В doom.js, метод initGame()
async initGame() {
    // ... существующий код ...
    
    // ДОБАВИТЬ: Инициализация DOOM сессии
    await this.initDoomSession();
}

async initDoomSession() {
    try {
        const response = await fetch('/api/doom/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegramId: this.tg?.initDataUnsafe?.user?.id
            })
        });
        
        const result = await response.json();
        if (result.success) {
            this.doomSession = result.session;
            
            // Синхронизируем данные с сервера
            this.player.health = this.doomSession.player.health;
            this.player.armor = this.doomSession.player.armor;  
            this.player.ammo = this.doomSession.player.ammo;
            
            console.log('🎮 DOOM session initialized');
        }
    } catch (error) {
        console.error('❌ Failed to init DOOM session:', error);
    }
}
```

#### **1.2 Периодическая синхронизация**
```javascript
// ДОБАВИТЬ: Автосохранение каждые 30 секунд
startAutoSync() {
    setInterval(() => {
        this.syncPlayerStats();
    }, 30000); // 30 секунд
}

async syncPlayerStats() {
    try {
        const response = await fetch('/api/doom/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegramId: this.tg?.initDataUnsafe?.user?.id,
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
        console.log('🔄 Player stats synced');
    } catch (error) {
        console.error('❌ Sync failed:', error);
    }
}
```

### **Этап 2: События игры**

#### **2.1 Уничтожение врагов**
```javascript
// ИЗМЕНИТЬ: Метод killEnemy()
async killEnemy(enemyIndex) {
    const enemy = this.enemies[enemyIndex];
    if (!enemy || enemy.health <= 0) return;
    
    // Существующая логика убийства...
    enemy.health = 0;
    
    // ДОБАВИТЬ: Отправка на сервер
    try {
        const response = await fetch('/api/doom/enemy-killed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegramId: this.tg?.initDataUnsafe?.user?.id,
                enemyId: enemy.id,
                enemyType: enemy.type,
                playerStats: this.player,
                shotsFired: 1
            })
        });
        
        const result = await response.json();
        if (result.success) {
            // Показываем полученный опыт
            if (result.expGain) {
                this.showNotification(`+${result.expGain} EXP`, 'success');
            }
            
            // Проверяем повышение уровня
            if (result.levelUp) {
                this.showNotification(`LEVEL UP! Уровень ${result.newLevel}`, 'levelup');
            }
            
            // Показываем новые достижения
            result.newAchievements?.forEach(achievement => {
                this.showNotification(`🏆 ${achievement.name}`, 'achievement');
            });
        }
    } catch (error) {
        console.error('❌ Failed to record enemy kill:', error);
    }
}
```

#### **2.2 Сбор предметов**
```javascript
// ИЗМЕНИТЬ: Метод collectItem()
async collectItem(itemIndex) {
    const item = this.items[itemIndex];
    if (!item) return;
    
    // Существующая логика сбора...
    switch (item.type) {
        case 'coffee':
            this.player.health = Math.min(100, this.player.health + item.value);
            break;
        // ... остальные типы
    }
    
    // ДОБАВИТЬ: Отправка на сервер
    try {
        const response = await fetch('/api/doom/item-collected', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegramId: this.tg?.initDataUnsafe?.user?.id,
                itemId: item.id,
                itemType: item.type,
                value: item.value,
                playerStats: this.player
            })
        });
        
        const result = await response.json();
        if (result.success && result.newAchievements) {
            result.newAchievements.forEach(achievement => {
                this.showNotification(`🏆 ${achievement.name}`, 'achievement');
            });
        }
    } catch (error) {
        console.error('❌ Failed to record item collection:', error);
    }
    
    // Удаляем предмет из массива
    this.items.splice(itemIndex, 1);
}
```

#### **2.3 Диалоги с NPC**
```javascript
// ИЗМЕНИТЬ: Методы диалогов
async continueDialogue() {
    if (!this.dialogue.active || !this.dialogue.npc) return;
    
    this.dialogue.messageIndex++;
    const npc = this.dialogue.npc;
    
    // Если диалог завершен
    if (this.dialogue.messageIndex >= npc.dialogue.length) {
        this.dialogue.active = false;
        
        // ДОБАВИТЬ: Отправка завершения диалога
        try {
            const response = await fetch('/api/doom/npc-dialogue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegramId: this.tg?.initDataUnsafe?.user?.id,
                    npcId: npc.id,
                    dialogueStage: this.dialogue.messageIndex,
                    completed: true
                })
            });
            
            const result = await response.json();
            if (result.success) {
                // Показываем полученные награды
                this.showNotification('Диалог завершен! Получены награды', 'success');
            }
        } catch (error) {
            console.error('❌ Failed to record dialogue:', error);
        }
        
        this.hideDialogue();
        return;
    }
    
    this.updateDialogueDisplay();
}
```

### **Этап 3: Расширенные функции**

#### **3.1 Система смерти и возрождения**
```javascript
// ДОБАВИТЬ: Обработка смерти
async handlePlayerDeath(cause, enemyType = null) {
    // Отправляем на сервер
    try {
        const response = await fetch('/api/doom/death', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegramId: this.tg?.initDataUnsafe?.user?.id,
                cause: cause,
                enemyType: enemyType
            })
        });
        
        const result = await response.json();
        if (result.success) {
            // Показываем экран смерти
            this.showDeathScreen(result.message);
            
            // Через 3 секунды возрождаем
            setTimeout(() => {
                this.respawnPlayer();
            }, 3000);
        }
    } catch (error) {
        console.error('❌ Failed to record death:', error);
        this.respawnPlayer(); // Возрождаем в любом случае
    }
}

respawnPlayer() {
    // Сбрасываем позицию и статы
    this.player.x = 2;
    this.player.y = 2;
    this.player.health = 100;
    this.player.armor = 100;
    this.player.ammo = 50;
    
    // Скрываем экран смерти
    this.hideDeathScreen();
    
    this.showNotification('Возрождение завершено', 'info');
}
```

#### **3.2 Завершение уровней**
```javascript
// ДОБАВИТЬ: Логика завершения уровня
async completeLevel() {
    const score = this.calculateLevelScore();
    const enemiesKilled = this.enemies.filter(e => e.health <= 0).length;
    const itemsCollected = 3 - this.items.length; // Начинали с 3 предметов
    const timeSpent = this.getSessionTime();
    
    try {
        const response = await fetch('/api/doom/level-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegramId: this.tg?.initDataUnsafe?.user?.id,
                week: this.currentWeek,
                score: score,
                enemiesKilled: enemiesKilled,
                itemsCollected: itemsCollected,
                timeSpent: timeSpent
            })
        });
        
        const result = await response.json();
        if (result.success) {
            this.showLevelCompleteScreen({
                score: score,
                expGain: result.expGain,
                levelUp: result.levelUp,
                newLevel: result.newLevel,
                achievements: result.newAchievements,
                nextLevelUnlocked: result.nextLevelUnlocked
            });
        }
    } catch (error) {
        console.error('❌ Failed to record level completion:', error);
    }
}

calculateLevelScore() {
    let score = 0;
    
    // Очки за здоровье
    score += this.player.health * 5;
    
    // Очки за броню
    score += this.player.armor * 3;
    
    // Очки за патроны
    score += this.player.ammo * 2;
    
    // Очки за убитых врагов
    this.enemies.forEach(enemy => {
        if (enemy.health <= 0) {
            score += enemy.type === 'deadline' ? 100 : 50;
        }
    });
    
    // Очки за собранные предметы
    score += (3 - this.items.length) * 25;
    
    return score;
}
```

#### **3.3 Интерфейс статистики**
```javascript
// ДОБАВИТЬ: Показ статистики игрока
showPlayerStats() {
    if (!this.doomSession) return;
    
    const statsHTML = `
        <div class="player-stats">
            <h3>📊 Статистика игрока</h3>
            <div class="stats-grid">
                <div>🏆 Уровень: ${this.user.level}</div>
                <div>⭐ Опыт: ${this.user.experience}</div>
                <div>⚔️ Врагов убито: ${Object.values(this.doomSession.enemiesKilled).reduce((a,b) => a+b, 0)}</div>
                <div>📦 Предметов собрано: ${Object.values(this.doomSession.itemsCollected).reduce((a,b) => a+b, 0)}</div>
                <div>🎯 Точность: ${this.doomSession.stats.accuracy}%</div>
                <div>⏱️ Время игры: ${Math.floor(this.doomSession.stats.totalPlayTime / 60)} мин</div>
                <div>💀 Смертей: ${this.doomSession.stats.deathsCount}</div>
                <div>🔥 Лучший счет: ${this.doomSession.stats.bestWeekScore}</div>
            </div>
            <div class="achievements">
                <h4>🏆 Достижения (${this.doomSession.achievements.length})</h4>
                ${this.doomSession.achievements.map(a => `<span class="achievement">${a.name}</span>`).join('')}
            </div>
        </div>
    `;
    
    // Показываем в интерфейсе
    document.getElementById('stats-display').innerHTML = statsHTML;
}
```

---

## 🎨 **ДОПОЛНЕНИЯ ДЛЯ ФРОНТЕНДА**

### **1. Новые UI элементы:**
```css
/* ДОБАВИТЬ в doom.css */
.death-screen {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.9);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #ff0000;
    font-size: 24px;
    z-index: 1000;
}

.level-complete-screen {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(45deg, #1a1a2e, #16213e);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #00ff00;
    z-index: 1000;
}

.achievement-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(45deg, #ffd700, #ffed4e);
    color: #000;
    padding: 10px 20px;
    border-radius: 10px;
    animation: achievementPop 3s ease-in-out;
    z-index: 999;
}

@keyframes achievementPop {
    0% { transform: translateX(300px); opacity: 0; }
    20% { transform: translateX(0); opacity: 1; }
    80% { transform: translateX(0); opacity: 1; }
    100% { transform: translateX(300px); opacity: 0; }
}

.exp-notification {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #00ff00;
    font-size: 18px;
    font-weight: bold;
    animation: expFloat 2s ease-out;
    z-index: 999;
    pointer-events: none;
}

@keyframes expFloat {
    0% { opacity: 1; transform: translate(-50%, -50%); }
    100% { opacity: 0; transform: translate(-50%, -100px); }
}
```

### **2. Система таблицы лидеров:**
```javascript
// ДОБАВИТЬ: Кнопка таблицы лидеров в меню
async showLeaderboard() {
    try {
        const response = await fetch('/api/doom/leaderboard?type=score&limit=10');
        const result = await response.json();
        
        if (result.success) {
            const leaderboardHTML = result.leaderboard.map((player, index) => `
                <div class="leaderboard-entry">
                    <span class="rank">#${player.rank}</span>
                    <span class="avatar">${getAvatarEmoji(player.avatar)}</span>
                    <span class="username">${player.username}</span>
                    <span class="score">${player.score}</span>
                    <span class="level">Lvl ${player.level}</span>
                </div>
            `).join('');
            
            document.getElementById('leaderboard-content').innerHTML = leaderboardHTML;
            this.showScreen('leaderboard');
        }
    } catch (error) {
        console.error('❌ Failed to load leaderboard:', error);
    }
}
```

---

## 🚀 **ПЛАН РЕАЛИЗАЦИИ**

### **Приоритет 1 (Критично):**
1. ✅ Создать модель DoomSession 
2. ✅ Создать API endpoints для DOOM
3. ⏳ Интегрировать базовую синхронизацию (инициализация, автосохранение)
4. ⏳ Добавить отслеживание событий (убийства врагов, сбор предметов)

### **Приоритет 2 (Важно):**
5. ⏳ Реализовать систему опыта и уровней
6. ⏳ Добавить достижения и уведомления
7. ⏳ Создать экраны смерти и завершения уровня

### **Приоритет 3 (Желательно):**
8. ⏳ Таблица лидеров
9. ⏳ Детальная статистика игрока
10. ⏳ Система множественных уровней

**Готовы приступить к интеграции? Начнем с Приоритета 1!** 🎮 