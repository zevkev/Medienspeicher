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

        this.paused = false;
        this.gameOver = false;
        
        this.stats = { level: 1, xp: 0, xpToNext: 100, money: 0, lootboxCost: 100 };
        
        this.player = {
            x: canvas.width/2, y: canvas.height/2,
            hp: 100, maxHp: 100,
            stats: { 
                damageMult: 1, fireRate: 600, projSpeed: 8, 
                xpMult: 1, moneyMult: 1, pickupRange: 100 
            },
            lastShot: 0
        };

        this.enemies = [];
        this.projectiles = [];
        this.loot = [];
        this.particles = [];
        this.explosions = [];

        // Input
        canvas.addEventListener('mousedown', (e) => this.inputShoot(e));

        // Start Loop
        this.loop(0);
        
        // Passive Loop (Spawn & Regen)
        setInterval(() => { if(!this.paused && !this.gameOver) this.enemySystem.spawn(); }, 1000);
        setInterval(() => { 
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
        if(this.paused || this.gameOver) return;

        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Updates
        this.upgrades.update(timestamp);
        this.enemySystem.update();
        
        // Projectiles
        for(let i=this.projectiles.length-1; i>=0; i--) {
            let p = this.projectiles[i];
            p.x += p.vx; p.y += p.vy; p.life--;
            
            // Draw
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

        // Loot
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

        // Draw Player & UI Update
        this.ctx.font = "40px Arial";
        this.ctx.fillText("💾", this.player.x, this.player.y);
        
        // Enemies Draw
        this.enemies.forEach(en => {
            this.ctx.font = `${en.scale}px Arial`;
            this.ctx.fillText(en.emoji, en.x, en.y);
        });
        
        this.ui.update();
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
            // Check existing level
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
}

// Start
const game = new Game();
