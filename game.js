const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

class Game {
    constructor() {
        this.canvas = canvas;
        this.ctx = ctx;
        this.audio = new SoundEngine(); 
        this.ui = new UI(this);
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
                xpMult: 1, moneyMult: 1, pickupRange: 10000, regen: 0, splash: 0
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
        document.getElementById('btn-start').addEventListener('click', () => this.startGame());

        this.applyInitialUpgrades(); 

        this.loop(0);
    }
    
    bindEvents() {
        this.shootHandler = (e) => this.inputShoot(e);
        canvas.addEventListener('mousedown', this.shootHandler);
    }

    applyInitialUpgrades() {
        const loadedData = this.saveData.loadPersistentData();
        
        loadedData.upgrades.forEach(up => {
            for(let i = 0; i < up.level; i++) {
                this.upgrades.apply(up.id, true);
            }
        });
        
        this.stats.totalMoneyEarned = loadedData.totalMoneyEarned; 
    }

    startGame() {
        this.saveData.resetAndApplyUpgrades(); 
        
        document.getElementById('start-overlay').classList.add('hidden');
        document.getElementById('ui-layer').classList.remove('hidden');
        
        this.player.x = canvas.width / 2;
        this.player.y = canvas.height / 2;
        
        this.paused = false;
        this.audio.playBGM(); 
        
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
            this.audio.stopBGM(); 
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
            life: (this.player.stats.projLife || 60),
            size: (this.player.stats.projSize || 0)
        });
        this.audio.playShoot();
    }

    createExplosion(x, y, radius, damage) {
        // Explosion state (rendered over several frames)
        this.explosions.push({ x, y, r: 0, maxR: radius, alpha: 1, damage });

        // Play sound immediately
        this.audio.playHit();

        // Apply immediate damage (optional) — keep this so enemies nearby take damage right away
        this.enemies.forEach(en => {
            const d = Math.hypot(en.x - x, en.y - y);
            if(d <= radius) {
                en.currentHp -= damage;
                this.createParticle(en.x, en.y, '💥');
            }
        });
    }

    createParticle(x, y, char) {
        // life in frames
        this.particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 1,
            char,
            life: 30,
            age: 0
        });
    }

    loop(timestamp) {
        requestAnimationFrame((t) => this.loop(t));
        
        // Reset transform & global canvas state each frame to avoid leaked state
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1;

        if(this.paused || this.gameOver) {
            // When paused or game over, clear and draw minimal UI / player if needed
            this.ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (this.gameOver || document.getElementById('start-overlay').classList.contains('hidden')) {
                // draw player in paused state if player is on-screen
                if (this.player.x > 0 && this.player.y > 0) this.drawPlayer();
            }
            return;
        }

        // Normal frame
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.upgrades.update(timestamp);
        this.enemySystem.update();

        // PROJECTILES
        for(let i=this.projectiles.length-1; i>=0; i--) {
            let p = this.projectiles[i];
            p.x += p.vx; p.y += p.vy; p.life--;

            // draw projectile (use save/restore in case font or other state changes later)
            this.ctx.save();
            this.ctx.font = `${20 + (p.size || 0)}px Arial`;
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText('💿', p.x, p.y);
            this.ctx.restore();

            let hit = false;
            if(p.life <= 0) hit = true;
            
            for(let ei = this.enemies.length - 1; ei >= 0; ei--) {
                const en = this.enemies[ei];
                const r = en.scale || 16;
                if(Math.hypot(p.x - en.x, p.y - en.y) < r) {
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

        // EXPLOSIONS (animated, safe drawing)
        for(let i=this.explosions.length-1; i>=0; i--) {
            let ex = this.explosions[i];
            ex.r += 6;
            ex.alpha -= 0.06;
            ex.alpha = Math.max(0, ex.alpha);

            // safe drawing: save/restore so composite/alpha/etc cannot leak
            this.ctx.save();
            // optional nice blend mode for explosion
            this.ctx.globalCompositeOperation = 'lighter';

            // use radial gradient for nicer look (clamped alpha)
            const grad = this.ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, ex.r || 1);
            grad.addColorStop(0, `rgba(255,255,200,${ex.alpha})`);
            grad.addColorStop(0.4, `rgba(255,150,0,${ex.alpha * 0.9})`);
            grad.addColorStop(1, `rgba(255,0,0,0)`);

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.restore();

            // apply damage to any enemies that enter the expanding radius this frame
            // (optional - if you already applied immediate damage you can skip)
            for(let ei = this.enemies.length - 1; ei >= 0; ei--) {
                const en = this.enemies[ei];
                if(Math.hypot(en.x - ex.x, en.y - ex.y) <= ex.r) {
                    // small tick-damage (make sure not to over-damage each frame)
                    // here we apply only once when the explosion reaches half size (example rule)
                    if(!ex._damagedOnce && ex.r >= ex.maxR * 0.2) {
                        en.currentHp -= (ex.damage || 0);
                        ex._damagedOnce = true;
                    }
                }
            }

            if(ex.alpha <= 0 || ex.r > ex.maxR * 1.2) this.explosions.splice(i, 1);
        }

        // ENEMY DEATHS
        for(let i=this.enemies.length-1; i>=0; i--) {
            if(this.enemies[i].currentHp <= 0) {
                const en = this.enemies[i];
                this.loot.push({x:en.x, y:en.y, type:'xp'});
                if(Math.random() > 0.7) this.loot.push({x:en.x+10, y:en.y, type:'money'});
                this.enemies.splice(i, 1);
                this.stats.totalMoneyEarned += 10;
            }
        }

        // LOOT & GLOBAL MAGNET
        for(let i=this.loot.length-1; i>=0; i--) {
            let l = this.loot[i];
            const dx = this.player.x - l.x;
            const dy = this.player.y - l.y;
            const dist = Math.hypot(dx, dy);

            // protective guard: if dist is 0 treat as already collected or skip movement
            if (dist === 0) {
                // snap to player to avoid NaN / Infinity
                l.x = this.player.x;
                l.y = this.player.y;
            } else {
                // IMMER zum Spieler ziehen (Geschw. nimmt mit Distanz ab, max. 8px/frame)
                const pullSpeed = Math.min(8, dist / 10); 
                l.x += (dx / dist) * pullSpeed;
                l.y += (dy / dist) * pullSpeed;
            }
            
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
                continue;
            }
            
            this.ctx.save();
            this.ctx.font = "20px Arial";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText(l.type==='xp'?'✨':'📀', l.x, l.y);
            this.ctx.restore();
        }

        // PARTICLES (draw + decay)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.vy += 0.06; // gravity-ish
            pt.age++;
            pt.life--;

            // fade-out
            const alpha = Math.max(0, Math.min(1, pt.life / 30));

            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.font = "18px Arial";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText(pt.char, pt.x, pt.y);
            this.ctx.restore();

            if(pt.life <= 0) this.particles.splice(i, 1);
        }

        // DRAW REMAINING GAME OBJECTS (player + enemies)
        this.drawGameObjects();
        this.ui.update();
    }
    
    drawGameObjects() {
        this.drawPlayer();

        for (let i = 0; i < this.enemies.length; i++) {
            const en = this.enemies[i];
            this.ctx.save();
            this.ctx.font = `${en.scale || 24}px Arial`;
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText(en.emoji || '👾', en.x, en.y);
            this.ctx.restore();
        }
    }

    drawPlayer() {
        const p = this.player;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        const hpPerc = Math.max(0, Math.min(1, (p.hp / p.maxHp) || 0));
        
        if (p.x > 0 && p.y > 0) {
            this.ctx.save();
            this.ctx.font = "40px Arial";
            this.ctx.fillText("💾", p.x, p.y);
            this.ctx.restore();

            // Outline circle
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
            this.ctx.strokeStyle = "rgba(255,0,0,0.3)";
            this.ctx.lineWidth = 4;
            this.ctx.stroke();

            // HP arc
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 30, -Math.PI/2, (-Math.PI/2) + (Math.PI*2 * hpPerc));
            this.ctx.strokeStyle = `hsl(${hpPerc * 120}, 100%, 50%)`; 
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
        }
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
                this.audio.playBGM();
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

