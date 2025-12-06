const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

// Die Klassen UI, EnemySystem, UpgradeManager sind in den externen Dateien

class Game {
    constructor() {
        this.canvas = canvas;
        this.ctx = ctx;
        // Wichtig: Die SoundEngine (audio.js) und UI (ui.js) müssen zuerst geladen werden
        this.audio = new SoundEngine(); 
        this.ui = new UI(this);
        this.enemySystem = new EnemySystem(this);
        this.upgrades = new UpgradeManager(this);

        this.paused = true; // Spiel startet pausiert
        this.gameOver = false;
        
        this.stats = { level: 1, xp: 0, xpToNext: 100, money: 0, lootboxCost: 100 };
        
        this.player = {
            x: -100, // Außerhalb des Screens, wird bei startGame() zentriert
            y: -100,
            hp: 100, maxHp: 100,
            stats: { 
                damageMult: 1, fireRate: 600, projSpeed: 8, 
                xpMult: 1, moneyMult: 1, pickupRange: 100, regen: 0, splash: 0 // Wichtig: Standardwerte für Upgrades
            },
            lastShot: 0
        };

        this.enemies = [];
        this.projectiles = [];
        this.loot = [];
        this.particles = [];
        this.explosions = [];

        // UI-Ebenen vorbereiten (Ausblenden der UI beim Start)
        document.getElementById('ui-layer').classList.add('hidden');
        document.getElementById('game-over-overlay').classList.add('hidden');
        
        // Input und Start-Events
        this.bindEvents();
        document.getElementById('btn-start').addEventListener('click', () => this.startGame());

        // Die Game Loop startet sofort, rendert aber nur, wenn `paused=false`
        this.loop(0);
    }
    
    bindEvents() {
        // Muss hier gebunden werden, um die Instanz zu referenzieren
        this.shootHandler = (e) => this.inputShoot(e);
        canvas.addEventListener('mousedown', this.shootHandler);
    }

    startGame() {
        document.getElementById('start-overlay').classList.add('hidden');
        document.getElementById('ui-layer').classList.remove('hidden');
        
        // Player in die Mitte setzen
        this.player.x = canvas.width / 2;
        this.player.y = canvas.height / 2;
        
        this.paused = false;
        this.audio.playBGM(); // Hintergrundmusik starten
        
        // Starte passive Loops (Spawn & Regen)
        this.spawnInterval = setInterval(() => { if(!this.paused && !this.gameOver) this.enemySystem.spawn(); }, 1000);
        this.regenInterval = setInterval(() => { 
            if(!this.paused && !this.gameOver && this.player.hp < this.player.maxHp) {
                this.player.hp += (this.player.stats.regen || 0);
            }
        }, 1000);
    }

    takeDamage(amount) {
        this.player.hp -= amount;
        this.audio.playDamage();
        
        // Camera Shake
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 500);

        if(this.player.hp <= 0) {
            this.player.hp = 0;
            this.gameOver = true;
            this.audio.stopBGM(); // Musik stoppen
            clearInterval(this.spawnInterval); // Intervalle stoppen
            clearInterval(this.regenInterval);
            this.ui.showGameOver(); // Zeigt das Game Over UI
        }
    }

    inputShoot(e) {
        if(this.paused || this.gameOver) return;
        if(Date.now() - this.player.lastShot < this.player.stats.fireRate) return;
        
        this.player.lastShot = Date.now();
        const rect = canvas.getBoundingClientRect();
        this.shootProjectile(this.player.x, this.player.y, e.clientX - rect.left, e.clientY - rect.top);
    }

    shootProjectile(sx, sy, tx, ty, damageOverride = null) {
        const angle = Math.atan2(ty - sy, tx - sx);
        const dmg = damageOverride || (20 * (this.player.stats.damageMult || 1));
        
        this.projectiles.push({
            x: sx, y: sy,
            vx: Math.cos(angle) * (this.player.stats.projSpeed || 8),
            vy: Math.sin(angle) * (this.player.stats.projSpeed || 8),
            damage: dmg,
            life: (this.player.stats.projLife || 60),
            size: (this.player.stats.projSize || 0)
        });
        this.audio.playShoot();
    }

    createExplosion(x, y, radius, damage) {
        this.explosions.push({ x, y, r: 0, maxR: radius, alpha: 1 });
        this.audio.playHit();
        // Area Damage
        this.enemies.forEach(en => {
            if(Math.hypot(en.x - x, en.y - y) < radius) {
                en.currentHp -= damage;
                this.createParticle(en.x, en.y, '💥');
            }
        });
    }

    createParticle(x, y, char) {
        this.particles.push({x, y, vx:(Math.random()-0.5)*5, vy:(Math.random()-0.5)*5, char, life:1});
    }

    loop(timestamp) {
        requestAnimationFrame((t) => this.loop(t));
        
        if(this.paused || this.gameOver) {
            // Nur das Canvas löschen, wenn das Spiel läuft
            if (this.gameOver || document.getElementById('start-overlay').classList.contains('hidden')) {
                this.ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Spieler nur zeichnen, wenn das Spiel nicht gestartet ist (start-overlay sichtbar) 
                // oder wenn es Game Over ist (letzter Frame)
                if (!document.getElementById('start-overlay').classList.contains('hidden') || this.gameOver) {
                    this.drawPlayer();
                }
            }
            return;
        }

        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Updates
        this.upgrades.update(timestamp);
        this.enemySystem.update();
        
        // Projectiles
        for(let i=this.projectiles.length-1; i>=0; i--) {
            let p = this.projectiles[i];
            p.x += p.vx; p.y += p.vy; p.life--;
            
            // Draw Projectile
            this.ctx.font = `${20 + p.size}px Arial`;
            this.ctx.fillText('💿', p.x, p.y);

            // Hit Logic
            let hit = false;
            if(p.life <= 0) hit = true;
            
            for(let en of this.enemies) {
                if(Math.hypot(p.x - en.x, p.y - en.y) < en.scale) {
                    en.currentHp -= p.damage;
                    this.createParticle(p.x, p.y, '✨');
                    this.audio.playHit();
                    hit = true;
                    if(this.player.stats.splash) this.createExplosion(p.x, p.y, 50, p.damage/2);
                    break;
                }
            }
            if(hit) this.projectiles.splice(i, 1);
        }

        // Explosions Draw
        for(let i=this.explosions.length-1; i>=0; i--) {
            let ex = this.explosions[i];
            ex.r += 5; ex.alpha -= 0.05;
            this.ctx.beginPath();
            this.ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI*2);
            this.ctx.fillStyle = `rgba(255, 100, 0, ${ex.alpha})`;
            this.ctx.fill();
            if(ex.alpha <= 0) this.explosions.splice(i, 1);
        }

        // Enemies Death Check
        for(let i=this.enemies.length-1; i>=0; i--) {
            if(this.enemies[i].currentHp <= 0) {
                const en = this.enemies[i];
                this.loot.push({x:en.x, y:en.y, type:'xp'});
                if(Math.random() > 0.7) this.loot.push({x:en.x+10, y:en.y, type:'money'});
                this.enemies.splice(i, 1);
            }
        }

        // Loot & Magnet
        for(let i=this.loot.length-1; i>=0; i--) {
            let l = this.loot[i];
            const d = Math.hypot(this.player.x - l.x, this.player.y - l.y);
            const range = this.player.stats.pickupRange || 100;
            
            if(d < range) {
                l.x += (this.player.x - l.x) * 0.1;
                l.y += (this.player.y - l.y) * 0.1;
            }
            
            if(d < 20) {
                if(l.type === 'xp') {
                    this.stats.xp += 10 * (this.player.stats.xpMult || 1);
                    this.audio.playCollectXP();
                } else {
                    this.stats.money += 10 * (this.player.stats.moneyMult || 1);
                    this.audio.playCollectMoney();
                }
                this.loot.splice(i, 1);
                this.checkLevel();
            }
            
            this.ctx.font = "20px Arial";
            this.ctx.fillText(l.type==='xp'?'✨':'📀', l.x, l.y);
        }
        
        this.drawGameObjects();
        this.ui.update();
    }
    
    drawGameObjects() {
        // Draw Player & Health
        this.drawPlayer();

        // Enemies Draw
        this.enemies.forEach(en => {
            this.ctx.font = `${en.scale}px Arial`;
            this.ctx.fillText(en.emoji, en.x, en.y);
        });
    }

    drawPlayer() {
        const p = this.player;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        // Player Emoji
        this.ctx.font = "40px Arial";
        this.ctx.fillText("💾", p.x, p.y);

        // Circular Health Bar
        const hpPerc = p.hp / p.maxHp;
        
        // Background Circle
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
        this.ctx.strokeStyle = "rgba(255,0,0,0.3)";
        this.ctx.lineWidth = 4;
        this.ctx.stroke();

        // Health Arc
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 30, -Math.PI/2, (-Math.PI/2) + (Math.PI*2 * hpPerc));
        this.ctx.strokeStyle = `hsl(${hpPerc * 120}, 100%, 50%)`; // Grün zu Rot
        this.ctx.stroke();
    }

    checkLevel() {
        if(this.stats.xp >= this.stats.xpToNext) {
            this.stats.xp = 0;
            this.stats.xpToNext *= 1.2;
            this.stats.level++;
            this.paused = true;
            this.audio.stopBGM();
            this.audio.playLevelUp();
            this.showUpgradeMenu();
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
                this.audio.playBGM(); // Musik fortsetzen
            };
            modalBody.appendChild(div);
        });
    }
    
    pauseGame(state) {
        this.paused = state;
        const overlay = document.getElementById('menu-overlay');
        if(state) {
            overlay.classList.remove('hidden');
            this.audio.stopBGM();
        }
        else {
            overlay.classList.add('hidden');
            this.audio.playBGM();
        }
    }
}

const game = new Game();
