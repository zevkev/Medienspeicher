const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

class Game {
    constructor() {
        this.canvas = canvas;
        this.ctx = ctx;
        this.audio = new SoundEngine(); 
        this.ui = new UI(this); // UI initialisiert sich hier und bindet den Start-Button
        this.enemySystem = new EnemySystem(this);
        this.upgrades = new UpgradeManager(this);
        this.saveData = new SaveData(this); 

        this.paused = true; 
        this.gameOver = false;
        
        this.stats = { level: 1, xp: 0, xpToNext: 100, money: 0, lootboxCost: 100, totalMoneyEarned: 0 };
        
        this.player = {
            x: -100, 
            y: -100,
            hp: 100, maxHp: 100,
            stats: { 
                damageMult: 1, fireRate: 600, projSpeed: 8, 
                xpMult: 1, moneyMult: 1, pickupRange: 10000, regen: 0, splash: 0,
                pierceCount: 0 
            },
            lastShot: 0
        };

        this.enemies = [];
        this.projectiles = [];
        this.loot = [];
        this.particles = [];
        this.explosions = [];

        document.getElementById('ui-layer').classList.add('hidden');
        document.getElementById('game-over-overlay').classList.add('hidden');
        
        this.bindEvents();
        // HINWEIS: Der Event Listener für btn-start wurde in UI.js verschoben, um Doppel-Bindung zu vermeiden.
        // Falls Sie den alten Code aus der UI.js von vorhin hatten:
        // document.getElementById('btn-start').addEventListener('click', () => this.startGame()); 

        this.applyInitialUpgrades(); 

        this.loop(0);
    }
    
    bindEvents() {
        this.shootHandler = (e) => this.inputShoot(e);
        canvas.addEventListener('mousedown', this.shootHandler);
    }

    applyInitialUpgrades() {
        try {
            const loadedData = this.saveData.loadPersistentData();
            
            loadedData.upgrades.forEach(up => {
                if (UPGRADES_DB.find(u => u.id === up.id)) {
                    for(let i = 0; i < up.level; i++) {
                        this.upgrades.apply(up.id, true);
                    }
                }
            });
            
            this.stats.totalMoneyEarned = loadedData.totalMoneyEarned; 
        } catch (e) {
            console.error("Fehler beim Anwenden der gespeicherten Upgrades. Die Spieldaten werden ignoriert.", e);
        }
    }

    startGame() {
        this.saveData.resetAndApplyUpgrades(); 
        
        // DIESE ZWEI ZEILEN SIND KRITISCH, damit das Spiel startet:
        document.getElementById('start-overlay').classList.add('hidden');
        document.getElementById('ui-layer').classList.remove('hidden');
        
        this.player.x = canvas.width / 2;
        this.player.y = canvas.height / 2;
        
        this.paused = false;
        
        this.spawnInterval = setInterval(() => { if(!this.paused && !this.gameOver) this.enemySystem.spawn(); }, 1000);
        this.regenInterval = setInterval(() => { 
            if(!this.paused && !this.gameOver && this.player.hp < this.player.maxHp) {
                this.player.hp += (this.player.stats.regen || 0);
                if(this.player.hp > this.player.maxHp) this.player.hp = this.player.maxHp;
            }
        }, 1000);
    }

    takeDamage(amount) {
        this.player.hp -= amount;
        this.audio.playDamage();
        
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 500);

        if(this.player.hp <= 0) {
            this.player.hp = 0;
            this.gameOver = true;
            clearInterval(this.spawnInterval); 
            clearInterval(this.regenInterval);
            this.ui.showGameOver(); 
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
            size: (this.player.stats.projSize || 0),
            
            hits: 0,
            maxHits: 1 + (this.player.stats.pierceCount || 0) 
        });
        this.audio.playShoot();
    }

    createExplosion(x, y, radius, damage) {
        this.explosions.push({ x, y, r: 0, maxR: radius, alpha: 1 });
        this.audio.playExplosion(); 
        
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
            if (this.gameOver || document.getElementById('start-overlay').classList.contains('hidden')) {
                this.ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (!document.getElementById('start-overlay').classList.contains('hidden') || this.gameOver) {
                    this.drawPlayer();
                }
            }
            return;
        }

        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.upgrades.update(timestamp);
        this.enemySystem.update();
        
        for(let i=this.projectiles.length-1; i>=0; i--) {
            let p = this.projectiles[i];
            p.x += p.vx; p.y += p.vy; 
            
            if(p.x < -100 || p.x > canvas.width + 100 || p.y < -100 || p.y > canvas.height + 100) {
                this.projectiles.splice(i, 1);
                continue;
            }

            this.ctx.font = `${20 + p.size}px Arial`;
            this.ctx.fillText('💿', p.x, p.y);

            let removed = false;
            
            for(let en of this.enemies) {
                if(Math.hypot(p.x - en.x, p.y - en.y) < en.scale) {
                    en.currentHp -= p.damage;
                    this.createParticle(p.x, p.y, '💥');
                    this.audio.playHit();
                    
                    p.hits++;
                    
                    if(this.player.stats.splash) this.createExplosion(p.x, p.y, 50, p.damage/2);
                    
                    if(p.hits >= p.maxHits) { 
                        removed = true;
                        break;
                    }
                }
            }
            if(removed) this.projectiles.splice(i, 1);
        }

        for(let i=this.explosions.length-1; i>=0; i--) {
            let ex = this.explosions[i];
            ex.r += 5; ex.alpha -= 0.05;
            this.ctx.beginPath();
            this.ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI*2);
            this.ctx.fillStyle = `rgba(255, 100, 0, ${ex.alpha})`;
            this.ctx.fill();
            if(ex.alpha <= 0) this.explosions.splice(i, 1);
        }

        for(let i=this.enemies.length-1; i>=0; i--) {
            if(this.enemies[i].currentHp <= 0) {
                const en = this.enemies[i];
                this.loot.push({x:en.x, y:en.y, type:'xp'});
                if(Math.random() > 0.7) this.loot.push({x:en.x+10, y:en.y, type:'money'});
                this.enemies.splice(i, 1);
                this.stats.totalMoneyEarned += 10;
            }
        }

        // Loot & GLOBAL MAGNET
        for(let i=this.loot.length-1; i>=0; i--) {
            let l = this.loot[i];
            const dx = this.player.x - l.x;
            const dy = this.player.y - l.y;
            const dist = Math.hypot(dx, dy);
            
            const pullSpeed = Math.min(8, dist / 10); 
            
            l.x += (dx / dist) * pullSpeed;
            l.y += (dy / dist) * pullSpeed;
            
            if(dist < 20) {
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
        this.drawPlayer();

        this.enemies.forEach(en => {
            this.ctx.font = `${en.scale}px Arial`;
            this.ctx.fillText(en.emoji, en.x, en.y);
        });
        
        this.drawActiveUpgrades();
    }

    drawPlayer() {
        const p = this.player;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        const hpPerc = p.hp / p.maxHp;
        
        if (p.x > 0 && p.y > 0) {
            this.ctx.font = "40px Arial";
            this.ctx.fillText("💾", p.x, p.y);

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
            this.ctx.strokeStyle = "rgba(255,0,0,0.3)";
            this.ctx.lineWidth = 4;
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 30, -Math.PI/2, (-Math.PI/2) + (Math.PI*2 * hpPerc));
            this.ctx.strokeStyle = `hsl(${hpPerc * 120}, 100%, 50%)`; 
            this.ctx.stroke();
        }
    }
    
    drawActiveUpgrades() {
        const u = this.upgrades.activeUpgrades;
        const iconSize = 28;
        const totalWidth = u.length * iconSize * 1.5;
        const startX = canvas.width / 2 - (totalWidth / 2);
        const startY = canvas.height - 40; 
        
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        
        u.forEach((up, index) => {
            const x = startX + (index * iconSize * 1.5);
            const y = startY;
            
            this.ctx.font = `${iconSize}px Arial`;
            this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            this.ctx.fillText(up.emoji, x, y);
            
            this.ctx.font = "12px Arial";
            this.ctx.fillStyle = "white";
            this.ctx.fillText(`L${up.level}`, x, y + iconSize / 2 + 5);
        });
    }

    checkLevel() {
        if(this.stats.xp >= this.stats.xpToNext) {
            this.stats.xp = 0;
            this.stats.xpToNext *= 1.2;
            this.stats.level++;
            this.paused = true;
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
            };
            modalBody.appendChild(div);
        });
    }
    
    pauseGame(state) {
        this.paused = state;
        const overlay = document.getElementById('menu-overlay');
        if(state) {
            overlay.classList.remove('hidden');
        }
        else {
            overlay.classList.add('hidden');
        }
    }
}

const game = new Game();
