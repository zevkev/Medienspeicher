// game.js

// ----------------------------------------------------
// I. HILFSKLASSEN: Player, Projectile, Particle
// ----------------------------------------------------

class Projectile {
    constructor(x, y, radius, color, velocity, damageMult, pierceCount, critChance, critDamage) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
        
        this.isCritical = Math.random() < critChance;
        this.damage = (10 * damageMult) * (this.isCritical ? (1 + critDamage) : 1); 
        this.pierce = pierceCount; 
        this.enemiesHit = [];
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Kritischer Treffer Effekt (Polish)
        if(this.isCritical) {
            ctx.strokeStyle = '#ff00ea';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}

class Particle {
    constructor(x, y, color, size, velocity) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.velocity = velocity;
        this.alpha = 1;
        this.friction = 0.98; // Etwas mehr Reibung für schnelleren Stillstand
    }

    update() {
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= 0.03; 
        this.size *= 0.98;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        // Global Composite Operation für den Glüheffekt (Polish)
        ctx.globalCompositeOperation = 'lighter'; 
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Player {
    constructor(game) {
        this.game = game;
        this.x = game.canvas.width / 2;
        this.y = game.canvas.height / 2;
        this.radius = 25;
        this.color = 'skyblue';
        this.speed = 4; // Basis-Speed (wird durch Upgrades in saveData überschrieben)
        this.hp = 100; 
        this.maxHp = 100;
        this.lastShot = 0;
        
        // Stat-Container (wird in saveData initialisiert/überschrieben)
        this.stats = { 
            damageMult: 1, fireRateMult: 1, projSpeed: 8, 
            xpMult: 1, moneyMult: 1, pickupRange: 10000, regen: 0, splash: 0,
            pierceCount: 0, critChance: 0, critDamage: 0, projRadius: 5,
            // Temporäre Powerup-Zustände
            doubleShotActive: false,
            shieldActive: false,
        };
    }

    update(keys) {
        if (keys['w']) this.y = Math.max(this.radius, this.y - this.speed);
        if (keys['s']) this.y = Math.min(this.game.canvas.height - this.radius, this.y + this.speed);
        if (keys['a']) this.x = Math.max(this.radius, this.x - this.speed);
        if (keys['d']) this.x = Math.min(this.game.canvas.width - this.radius, this.x + this.speed);
    }
    
    shoot(mousePos) {
        const now = Date.now();
        // Berechnet effektive Feuerrate (Basis 600ms * Multiplikatoren)
        const effectiveFireRate = 600 / this.stats.fireRateMult; 
        
        if (now - this.lastShot < effectiveFireRate) return;

        this.lastShot = now;
        this.game.audio.playShoot();

        const angle = Math.atan2(mousePos.y - this.y, mousePos.x - this.x);
        const velocity = { x: Math.cos(angle) * this.stats.projSpeed, y: Math.sin(angle) * this.stats.projSpeed };

        const projParams = [
            this.x, this.y, this.stats.projRadius, 'white', velocity, 
            this.stats.damageMult, this.stats.pierceCount, this.stats.critChance, this.stats.critDamage
        ];

        // Standard Schuss
        this.game.projectiles.push(new Projectile(...projParams));
        
        // Doppelschuss Powerup
        if (this.stats.doubleShotActive) {
            const angleOffset = Math.PI / 16;
            const angle1 = angle - angleOffset;
            const angle2 = angle + angleOffset;
            
            const v1 = { x: Math.cos(angle1) * this.stats.projSpeed, y: Math.sin(angle1) * this.stats.projSpeed };
            const v2 = { x: Math.cos(angle2) * this.stats.projSpeed, y: Math.sin(angle2) * this.stats.projSpeed };

            // Schüsse leicht abgewinkelt
            this.game.projectiles.push(new Projectile(this.x, this.y, this.stats.projRadius, 'yellow', v1, this.stats.damageMult, this.stats.pierceCount, this.stats.critChance, this.stats.critDamage));
            this.game.projectiles.push(new Projectile(this.x, this.y, this.stats.projRadius, 'yellow', v2, this.stats.damageMult, this.stats.pierceCount, this.stats.critChance, this.stats.critDamage));
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        if (this.stats.shieldActive) {
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}


// ----------------------------------------------------
// II. GAME-KLASSE (HAUPTLOGIK)
// ----------------------------------------------------

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() { 
    if(canvas) {
        canvas.width = window.innerWidth; 
        canvas.height = window.innerHeight; 
    }
}
window.addEventListener('resize', resize); 
resize();

class Game {
    constructor() {
        this.canvas = canvas;
        this.ctx = ctx;
        this.audio = new SoundEngine(); 
        
        // Player, Systems, Data initialisieren
        this.player = new Player(this); 
        this.enemySystem = new EnemySystem(this);
        this.upgrades = new UpgradeManager(this);
        this.saveData = new SaveData(this); 
        this.lootBoxAnimation = new LootBoxAnimation(this);
        this.ui = new UI(this); // UI nach Player/Data initialisieren

        this.paused = true; 
        this.gameOver = false;
        
        this.stats = { 
            level: 1, xp: 0, xpToNext: 100, 
            money: 0, lootboxCost: 100, totalMoneyEarned: 0,
        };
        
        this.enemies = [];
        this.projectiles = [];
        this.loot = [];
        this.particles = [];
        this.input = { keys: {}, mousePos: { x: this.canvas.width / 2, y: this.canvas.height / 2 }, mouseDown: false };
        this.lastTime = 0;
        
        this.setupInput();
        this.saveData.resetAndApplyUpgrades(); 
    }
    
    setupInput() {
        document.addEventListener('keydown', e => this.input.keys[e.key.toLowerCase()] = true);
        document.addEventListener('keyup', e => this.input.keys[e.key.toLowerCase()] = false);

        this.canvas.addEventListener('mousemove', e => {
            const rect = this.canvas.getBoundingClientRect();
            this.input.mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        });

        this.canvas.addEventListener('mousedown', e => this.input.mouseDown = true);
        this.canvas.addEventListener('mouseup', e => this.input.mouseDown = false);
    }
    
    startGame() {
        this.paused = false;
        document.getElementById('start-overlay').classList.add('hidden');
        document.getElementById('ui-layer').classList.remove('hidden');
        requestAnimationFrame(this.loop.bind(this));
        
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height / 2;
        this.ui.updateHUD();
    }
    
    createExplosionParticles(x, y, color, count) {
        const newParticles = [];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = {
                x: Math.cos(angle) * (Math.random() * 4 + 1),
                y: Math.sin(angle) * (Math.random() * 4 + 1)
            };
            newParticles.push(new Particle(x, y, color, Math.random() * 2 + 0.5, velocity));
        }
        return newParticles;
    }
    
    // NEU: Methode zur Schadensverarbeitung (mit Schild-Check und Polish)
    takeDamage(damage) {
        this.audio.playDamage();
        
        // Screen Shake Feedback (Polish)
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 500);

        if (this.player.stats.shieldActive) {
            this.player.stats.shieldActive = false;
            this.ui.updateHUD();
            return; 
        }
        
        this.player.hp -= damage;
        this.ui.updateHUD();
        
        this.particles.push(...this.createExplosionParticles(this.player.x, this.player.y, 'rgba(255, 0, 0, 0.8)', 15));
        
        if (this.player.hp <= 0) {
            this.gameOver = true;
            this.paused = true;
            document.getElementById('game-over-overlay').classList.remove('hidden');
            this.saveData.savePersistentData();
            this.ui.updateGameOverScreen();
        }
    }
    
    // NEU: Powerup-Anwendung der Lootbox
    applyLootboxPowerUp(id) {
        const pStats = this.player.stats;
        switch (id) {
            case 'fireRate':
                // Temporär FireRate auf Basiswert setzen (schneller schießen)
                const originalFireRateMult = pStats.fireRateMult;
                pStats.fireRateMult *= 2; // Verdoppelte Feuerrate
                setTimeout(() => {
                    pStats.fireRateMult = originalFireRateMult;
                    this.saveData.resetAndApplyUpgrades(); // Upgrades neu anwenden, um den originalen Multiplikator wiederherzustellen
                }, 10000); 
                break;
            case 'doubleShot':
                pStats.doubleShotActive = true;
                setTimeout(() => pStats.doubleShotActive = false, 15000); 
                break;
            case 'shield':
                pStats.shieldActive = true;
                break;
            case 'heal':
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
                break;
        }
        this.ui.updateHUD();
    }


    update(deltaTime) {
        if (this.lootBoxAnimation.isRunning) {
            this.lootBoxAnimation.update();
        }
        
        if (this.paused || this.gameOver) return;
        
        // 1. INPUT & PLAYER
        this.player.update(this.input.keys);
        if (this.input.mouseDown) {
            this.player.shoot(this.input.mousePos);
        }

        // 2. ENEMY SPAWN
        this.enemySystem.spawnTimer++;
        if (this.enemySystem.spawnTimer >= this.enemySystem.spawnInterval - (this.stats.level * 2)) {
            this.enemySystem.spawn();
            this.enemySystem.spawnTimer = 0;
        }
        
        // 3. ENEMY UPDATE (Bewegung und Kollision mit Spieler)
        this.enemySystem.update();
        
        // 4. PROJECTILE UPDATE & COLLISION
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.update();
            
            let hit = false;
            
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const en = this.enemies[j];
                const dist = Math.hypot(proj.x - en.x, proj.y - en.y);
                
                if (dist < proj.radius + en.radius) {
                    if (proj.enemiesHit.includes(en)) continue; 

                    en.currentHp -= proj.damage;
                    this.audio.playHit();
                    proj.enemiesHit.push(en);
                    hit = true;
                    
                    if (en.currentHp <= 0) {
                        this.stats.xp += 10 * this.player.stats.xpMult; 
                        this.stats.money += 1 * this.player.stats.moneyMult; 
                        this.stats.totalMoneyEarned += 1 * this.player.stats.moneyMult;
                        this.audio.playCollectXP();
                        this.audio.playCollectMoney();
                        this.particles.push(
                            ...this.createExplosionParticles(en.x, en.y, 'orange', 15)
                        );
                        
                        if (Math.random() < 0.1) {
                            this.lootBoxAnimation.startAnimation();
                        }
                        
                        this.enemies.splice(j, 1);
                        
                    } else if (proj.pierce <= proj.enemiesHit.length - 1) {
                        break; // Durchschlagskraft erschöpft
                    }
                }
            }

            // Projektil entfernen
            if (proj.enemiesHit.length > this.player.stats.pierceCount || proj.x < 0 || proj.x > this.canvas.width || proj.y < 0 || proj.y > this.canvas.height) {
                this.projectiles.splice(i, 1);
            }
        }
        
        // 5. PARTIKEL UPDATE
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].alpha <= 0 || this.particles[i].size <= 0.5) {
                this.particles.splice(i, 1);
            }
        }

        // 6. UPGRADE/LEVEL-UP CHECK
        if (this.stats.xp >= this.stats.xpToNext) {
            this.stats.xp -= this.stats.xpToNext;
            this.stats.xpToNext *= 1.5;
            this.stats.level++;
            this.upgrades.levelUp(); 
            this.audio.playLevelUp();
        }
        
        // 7. AKTIVE UPGRADES (Regen, AoE-Schaden etc.)
        this.upgrades.update(deltaTime); 
    }

    draw(ctx) {
        // Hintergrund
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Projektile zeichnen
        this.projectiles.forEach(p => p.draw(ctx));

        // 2. Gegner zeichnen
        this.enemies.forEach(en => en.draw(ctx));

        // 3. Spieler zeichnen
        this.player.draw(ctx);
        
        // 4. Partikel zeichnen (Polish)
        this.particles.forEach(p => p.draw(ctx));
        
        // 5. Lootbox Animation (über allem)
        this.lootBoxAnimation.draw(ctx);
        
        // 6. UI updaten (HUD)
        this.ui.updateHUD(); 

        // 7. Game Over Screen
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.textAlign = 'center';
            ctx.font = '60px Arial';
            ctx.fillStyle = 'white';
            ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 30);
            ctx.font = '30px Arial';
            ctx.fillText(`Level erreicht: ${this.stats.level}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
        }
    }
    
    showUpgradeMenu() {
        const modalBody = document.getElementById('modal-body');
        document.getElementById('modal-title').innerText = "LEVEL UP!";
        document.getElementById('menu-overlay').classList.remove('hidden');
        modalBody.innerHTML = "";

        const opts = this.upgrades.getOptions(3);
        opts.forEach(opt => {
            const div = document.createElement('div');
            div.className = `upgrade-card rarity-${opt.rarity}`;
            
            const exist = this.upgrades.activeUpgrades.find(u => u.id === opt.id);
            const lvl = exist ? exist.level + 1 : 1;
            
            div.innerHTML = `
                <div class="upgrade-icon">${opt.emoji}</div>
                <div>
                    <h3>${opt.name} <small>(Lv ${lvl})</small></h3>
                    <p>${opt.desc}</p>
                </div>
            `;
            div.onclick = () => {
                this.upgrades.apply(opt.id);
                document.getElementById('menu-overlay').classList.add('hidden');
                this.paused = false;
            };
            modalBody.appendChild(div);
        });
    }
    
    pauseGame(state) {
        this.paused = state;
        const overlay = document.getElementById('menu-overlay');
        if(state) {
            // Verhindern, dass die Upgrade-Menü-Logik bei Lootbox-Pause triggert
            if(!this.lootBoxAnimation.isRunning) {
                overlay.classList.remove('hidden');
            }
        }
        else {
            overlay.classList.add('hidden');
        }
    }

    loop(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.draw(this.ctx);
        
        requestAnimationFrame(this.loop.bind(this));
    }
}

const game = new Game();
