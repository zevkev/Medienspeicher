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
        
        // NEUE STATS: runCount, runMoneyEarned
        this.stats = { level: 1, xp: 0, xpToNext: 100, money: 0, lootboxCost: 100, totalMoneyEarned: 0, runCount: 0, runMoneyEarned: 0 };
        
        this.player = {
            x: -100, 
            y: -100,
            hp: 100, maxHp: 100,
            // Basis-Stats mit neuen Upgrades
            stats: { 
                baseDamage: 20, 
                damageMult: 1, 
                fireRate: 600, // Cooldown in ms
                projSpeed: 8, 
                projLife: 60, // Basislife (Frames)
                xpMult: 1, 
                moneyMult: 1, 
                // pickupRange: 100, // <--- ENTFERNT
                regen: 0, 
                splashChance: 0,
                critChance: 0, 
                critDmg: 0.5, 
                knockback: 0, 
                pierce: 0,
                lifesteal: 0 
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

        this.loop(0);
    }
    
    bindEvents() {
        this.shootHandler = (e) => this.inputShoot(e);
        canvas.addEventListener('mousedown', this.shootHandler);
    }

    startGame() {
        this.saveData.resetAndApplyUpgrades(); 
        
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
        
        this.ui.updateActiveUpgrades(); 
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
    
    heal(amount) {
        this.player.hp += amount;
        if(this.player.hp > this.player.maxHp) this.player.hp = this.player.maxHp;
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
        
        // Kritischer Treffer-Check
        let crit = false;
        let finalDmg = this.player.stats.baseDamage * (this.player.stats.damageMult || 1);
        if (Math.random() < this.player.stats.critChance) {
            finalDmg *= (1 + (this.player.stats.critDmg || 0.5));
            crit = true;
        }
        
        const dmg = damageOverride || finalDmg;
        
        this.projectiles.push({
            x: sx, y: sy,
            vx: Math.cos(angle) * this.player.stats.projSpeed,
            vy: Math.sin(angle) * this.player.stats.projSpeed,
            damage: dmg,
            life: this.player.stats.projLife, // Reichweite (Frames)
            size: (this.player.stats.projSize || 0),
            crit: crit,
            pierceLeft: this.player.stats.pierce || 0, // NEU: Durchschlag
            enemiesHit: new Set() // NEU: Verhindert Mehrfachschaden pro Schuss bei Piercing
        });
        this.audio.playShoot();
    }

    createExplosion(x, y, radius, damage) {
        this.explosions.push({ x, y, r: 0, maxR: radius, alpha: 1 });
        this.audio.playHit();
        
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
            if (!document.getElementById('start-overlay').classList.contains('hidden') || this.gameOver || this.paused) {
                this.ctx.clearRect(0, 0, canvas.width, canvas.height);
                this.drawPlayer();
            }
            return;
        }

        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.upgrades.update(timestamp);
        this.enemySystem.update();
        
        // Projektile Update
        for(let i=this.projectiles.length-1; i>=0; i--) {
            let p = this.projectiles[i];
            p.x += p.vx; p.y += p.vy; p.life--;
            
            this.ctx.font = `${20 + p.size}px Arial`;
            this.ctx.fillStyle = p.crit ? 'yellow' : 'white';
            this.ctx.fillText('💿', p.x, p.y);

            let destroyed = false;
            
            // Reichweite
            if(p.life <= 0) destroyed = true;
            
            // Kollisionscheck
            for(let en of this.enemies) {
                // Nur prüfen, wenn der Gegner noch nicht von diesem Projektil getroffen wurde
                if(!p.enemiesHit.has(en) && Math.hypot(p.x - en.x, p.y - en.y) < en.scale / 2) {
                    
                    en.currentHp -= p.damage;
                    this.createParticle(p.x, p.y, p.crit ? '💥' : '✨');
                    this.audio.playHit();
                    
                    // Splash Check (mit Wahrscheinlichkeit)
                    if(Math.random() < this.player.stats.splashChance) {
                        this.createExplosion(p.x, p.y, 50, p.damage/2);
                    }
                    
                    // Piercing/Durchschlag
                    if(p.pierceLeft > 0) {
                        p.pierceLeft--;
                        p.enemiesHit.add(en);
                    } else {
                        destroyed = true;
                    }
                    break;
                }
            }
            
            if(destroyed) this.projectiles.splice(i, 1);
        }

        // Explosionen Update
        for(let i=this.explosions.length-1; i>=0; i--) {
            let ex = this.explosions[i];
            ex.r += 5; ex.alpha -= 0.05;
            this.ctx.beginPath();
            this.ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI*2);
            this.ctx.fillStyle = `rgba(255, 100, 0, ${ex.alpha})`;
            this.ctx.fill();
            if(ex.alpha <= 0) this.explosions.splice(i, 1);
        }

        // Gegner töten & Loot droppen
        for(let i=this.enemies.length-1; i>=0; i--) {
            if(this.enemies[i].currentHp <= 0) {
                const en = this.enemies[i];
                
                const xpAmount = en.xp || 10;
                this.loot.push({x:en.x, y:en.y, type:'xp', amount: xpAmount});
                
                if(Math.random() > 0.7 || en.loot === 'money') {
                    this.loot.push({x:en.x+10, y:en.y, type:'money', amount: 10});
                }
                
                // Lifesteal/Vampir-HP-Drop (Blut-Drop)
                if(this.player.stats.lifesteal && Math.random() < this.player.stats.lifesteal) {
                    this.loot.push({x:en.x-10, y:en.y, type:'hp', amount: 10, isVampireDrop: true}); // isVampireDrop für schnellen Magnet
                }
                
                this.enemies.splice(i, 1);
                this.stats.runMoneyEarned += 10; 
            }
        }

        // Loot & Globaler Magnet (ANGEPASST)
        for(let i=this.loot.length-1; i>=0; i--) {
            let l = this.loot[i];
            const dx = this.player.x - l.x;
            const dy = this.player.y - l.y;
            const dist = Math.hypot(dx, dy);
            
            // Loot zieht IMMER zum Spieler, wie gewünscht
            // Blut-Drops fliegen schneller (20), normales Loot mit 8
            const pullSpeed = Math.min(l.isVampireDrop ? 20 : 8, dist / 10); 
            
            l.x += (dx / dist) * pullSpeed;
            l.y += (dy / dist) * pullSpeed;
            
            if(dist < 20) {
                if(l.type === 'xp') {
                    this.stats.xp += l.amount * (this.player.stats.xpMult || 1);
                    this.audio.playCollectXP();
                } else if(l.type === 'money') {
                    this.stats.money += l.amount * (this.player.stats.moneyMult || 1);
                    this.stats.totalMoneyEarned += l.amount * (this.player.stats.moneyMult || 1); // Zähle gesamt verdientes Geld
                    this.audio.playCollectMoney();
                } else if(l.type === 'hp') {
                    this.heal(l.amount);
                    this.audio.playCollectXP(); 
                }
                this.loot.splice(i, 1);
                this.checkLevel();
            }
            
            this.ctx.font = "20px Arial";
            this.ctx.fillText(l.type==='xp'?'✨':(l.type==='money'?'📀':'❤️'), l.x, l.y);
        }
        
        // Partikel
        for(let i=this.particles.length-1; i>=0; i--) {
            let p = this.particles[i];
            p.x += p.vx; p.y += p.vy; p.life -= 0.05;
            this.ctx.font = "12px Arial";
            this.ctx.globalAlpha = p.life;
            this.ctx.fillText(p.char, p.x, p.y);
            if(p.life <= 0) this.particles.splice(i, 1);
        }
        this.ctx.globalAlpha = 1;
        
        this.drawGameObjects();
        this.ui.update();
    }
    
    drawGameObjects() {
        this.drawPlayer();

        this.enemies.forEach(en => {
            this.ctx.font = `${en.scale}px Arial`;
            this.ctx.fillText(en.emoji, en.x, en.y);
        });
    }

    drawPlayer() {
        const p = this.player;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        const hpPerc = p.hp / p.maxHp;
        
        if (p.x > 0 && p.y > 0) {
            this.ctx.font = "40px Arial";
            this.ctx.fillText("💾", p.x, p.y); 
            
            // HP-Ring
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

    checkLevel() {
        if(this.stats.xp >= this.stats.xpToNext) {
            this.stats.xp -= this.stats.xpToNext; 
            this.stats.xpToNext = Math.floor(this.stats.xpToNext * 1.2);
            this.stats.level++;
            this.heal(5); // Kleine Heilung beim Level-Up
            this.paused = true;
            this.audio.playLevelUp();
            this.showUpgradeMenu();
        }
    }

    showUpgradeMenu() {
        const modalBody = document.getElementById('modal-body');
        document.getElementById('modal-title').innerText = "LEVEL UP! Wähle ein Upgrade";
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
                this.ui.updateActiveUpgrades(); 
            };
            modalBody.appendChild(div);
        });
    }
    
    pauseGame(state) {
        this.paused = state;
        const overlay = document.getElementById('menu-overlay');
        if(state) {
            document.getElementById('modal-title').innerText = "PAUSE";
            document.getElementById('modal-body').innerHTML = '<p>Klicke zum Fortsetzen auf das X oder außerhalb des Menüs.</p>';
            overlay.classList.remove('hidden');
        }
        else {
            overlay.classList.add('hidden');
        }
    }
}

const game = new Game();
