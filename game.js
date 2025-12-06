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
        
        // Berechnung des Schadens (mit Krit-Multiplikator)
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
        
        // Loot Magnetism
        this.game.loot.forEach(l => {
            const dx = this.x - l.x;
            const dy = this.y - l.y;
            const dist = Math.hypot(dx, dy);
            
            // Magnet-Effekt-Distanz skaliert mit Upgrade
            const effectiveRange = 100 + (this.stats.pickupRange * 50); 
            
            if (dist < effectiveRange) {
                const pullSpeed = Math.min(this.speed * 2, dist / 10); 
                l.x += (dx / dist) * pullSpeed;
                l.y += (dy / dist) * pullSpeed;
            }
        });
    }
    
    shoot(mousePos) {
        const now = Date.now();
        // Berechnet effektive Feuerrate (Basis 600ms / Multiplikatoren)
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
        this.game.ctx.textAlign = "center";
        this.game.ctx.textBaseline = "middle";
        this.game.ctx.font = "40px Arial";
        this.game.ctx.fillText("💾", this.x, this.y); // Zeichne Floppy Disk Emoji als Spieler

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
        this.spawnTimer = 0; 
        this.spawnInterval = 120; // Startwert für 2 Sekunden bei 60 FPS
        
        this.setupInput();
        this.saveData.resetAndApplyUpgrades(); 
        
        // Startet den Game-Loop sofort (aber er wird angehalten, bis unpaused)
        requestAnimationFrame(this.loop.bind(this));
    }
    
    setupInput() {
        document.addEventListener('keydown', e => {
             this.input.keys[e.key.toLowerCase()] = true;
             // Pause/Resume auf Escape-Taste
             if(e.key === 'Escape') this.pauseGame(!this.paused);
        });
        document.addEventListener('keyup', e => this.input.keys[e.key.toLowerCase()] = false);

        this.canvas.addEventListener('mousemove', e => {
            const rect = this.canvas.getBoundingClientRect();
            this.input.mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        });

        this.canvas.addEventListener('mousedown', e => this.input.mouseDown = true);
        this.canvas.addEventListener('mouseup', e => this.input.mouseDown = false);
    }
    
    startGame() {
        // Zuerst Reset und Upgrades anwenden
        this.saveData.resetAndApplyUpgrades();
        this.ui.updateHUD(); 
        
        document.getElementById('start-overlay').classList.add('hidden');
        document.getElementById('ui-layer').classList.remove('hidden');
        
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height / 2;
        
        this.paused = false;
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
    
    applyLootboxPowerUp(id) {
        const pStats = this.player.stats;
        switch (id) {
            case 'fireRate':
                const originalFireRateMult = pStats.fireRateMult;
                pStats.fireRateMult *= 2; // Verdoppelte Feuerrate
                setTimeout(() => {
                    pStats.fireRateMult = originalFireRateMult;
                    this.saveData.resetAndApplyUpgrades(); 
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
        // Game-Timer-Update
        if (!this.paused && !this.gameOver) {
            // (Hier könnte die Spielzeit hochgezählt werden)
        }
        
        if (this.lootBoxAnimation.isRunning) {
            this.lootBoxAnimation.update();
        }
        
        if (this.paused || this.gameOver) return;
        
        // 1. INPUT & PLAYER
        this.player.update(this.input.keys);
        if (this.input.mouseDown) {
            this.player.shoot(this.input.mousePos);
        }
        
        // HP Regeneration
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.stats.regen * deltaTime / 1000);

        // 2. ENEMY SPAWN
        this.spawnTimer++;
        if (this.spawnTimer >= this.spawnInterval - (this.stats.level * 2)) {
            this.enemySystem.spawn();
            this.spawnTimer = 0;
        }
        
        // 3. ENEMY UPDATE (Bewegung und Kollision mit Spieler)
        this.enemySystem.update();
        
        // 4. PROJECTILE UPDATE & COLLISION
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.update();
            
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const en = this.enemies[j];
                const dist = Math.hypot(proj.x - en.x, proj.y - en.y);
                
                if (dist < proj.radius + en.radius) {
                    if (proj.enemiesHit.includes(en)) continue; 

                    en.currentHp -= proj.damage;
                    this.audio.playHit();
                    proj.enemiesHit.push(en);
                    
                    // Particle-Feedback beim Treffer
                    this.particles.push(...this.createExplosionParticles(proj.x, proj.y, proj.isCritical ? '#ff00ea' : 'white', 3));
                    
                    if (en.currentHp <= 0) {
                        this.stats.xp += 10 * this.player.stats.xpMult; 
                        this.stats.money += 1 * this.player.stats.moneyMult; 
                        this.stats.totalMoneyEarned += 1 * this.player.stats.moneyMult;
                        this.audio.playCollectXP();
                        this.audio.playCollectMoney();
                        
                        this.particles.push(...this.createExplosionParticles(en.x, en.y, 'orange', 15));
                        
                        if (Math.random() < 0.05) { // Geringe Chance auf Lootbox
                            this.lootBoxAnimation.startAnimation();
                        }
                        
                        this.enemies.splice(j, 1);
                        
                    } else if (proj.pierce <= proj.enemiesHit.length - 1) {
                        // Projektil hat maximale Durchschlagskraft erreicht
                        this.projectiles.splice(i, 1); 
                        i--; // Wichtig, da ein Element entfernt wurde
                        break;
                    }
                }
            }

            // Projektil außerhalb des Bildschirms entfernen
            if (i >= 0 && (proj.x < 0 || proj.x > this.canvas.width || proj.y < 0 || proj.y > this.canvas.height)) {
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

        // 2. Loot (XP/Geld) zeichnen
        this.loot.forEach(l => {
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "20px Arial";
            ctx.fillStyle = l.type === 'xp' ? '#00d2ff' : '#f1c40f';
            ctx.fillText(l.type === 'xp' ? '✨' : '📀', l.x, l.y);
        });

        // 3. Gegner zeichnen
        this.enemies.forEach(en => en.draw(ctx));

        // 4. Spieler zeichnen
        this.player.draw(ctx);
        
        // 5. Partikel zeichnen (Polish)
        this.particles.forEach(p => p.draw(ctx));
        
        // 6. Lootbox Animation (über allem)
        this.lootBoxAnimation.draw(ctx);
        
        // 7. UI updaten (HUD)
        this.ui.updateHUD(); 

        // 8. Game Over Screen (wird nur angezeigt, wenn gameOver=true)
        if (this.gameOver) {
            // (Das Game Over Overlay in index.html ist für die Anzeige zuständig)
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
        if (this.gameOver) return;
        this.paused = state;
        const overlay = document.getElementById('menu-overlay');
        
        if(state) {
            document.getElementById('modal-title').innerText = "PAUSE";
            // Verhindern, dass die Upgrade-Menü-Logik bei Lootbox-Pause triggert
            if(!this.lootBoxAnimation.isRunning) {
                overlay.classList.remove('hidden');
            }
        }
        else {
            overlay.classList.add('hidden');
        }
    }

    // Haupt-Game-Loop mit DeltaTime für flüssige Bewegung
    loop(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.draw(this.ctx);
        
        requestAnimationFrame(this.loop.bind(this));
    }
}

const game = new Game();
