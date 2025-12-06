// --- Initialisierung ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const audio = new SoundEngine();

// Resizing
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- Game State & Entities ---
class Game {
    constructor() {
        this.paused = false;
        this.lastTime = 0;
        
        this.stats = {
            level: 1,
            xp: 0,
            xpToNext: 100,
            money: 0,
            xpMultiplier: 1,
            moneyMultiplier: 1,
            lootboxCost: 100
        };

        this.player = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            hp: 100,
            maxHp: 100,
            damage: 20,
            fireRate: 500, // ms
            lastShot: 0,
            regen: 0,
            splashRadius: 0,
            hasSplash: false
        };

        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.loot = [];
        this.protectors = []; // Die kleinen Begleiter

        this.upgrades = new UpgradeSystem(this);
        
        // Spawn Loop
        this.waveTimer = setInterval(() => this.spawnWave(), 5000);
        // Regen Loop
        setInterval(() => {
            if(!this.paused && this.player.hp < this.player.maxHp) {
                this.player.hp += this.player.regen;
                if(this.player.hp > this.player.maxHp) this.player.hp = this.player.maxHp;
            }
        }, 1000);

        // Bindings
        canvas.addEventListener('mousedown', (e) => this.shoot(e));
        document.getElementById('btn-mute').addEventListener('click', () => {
           let m = audio.toggleMute();
           document.getElementById('btn-mute').innerText = m ? "🔇 Sound aus" : "🔊 Sound an";
        });
        document.getElementById('btn-shop').addEventListener('click', () => this.openShop());
    }

    start() {
        requestAnimationFrame((t) => this.loop(t));
        this.spawnWave();
    }

    // --- Core Logic ---
    spawnWave() {
        if(this.paused) return;
        const count = 5 + this.stats.level;
        for(let i=0; i<count; i++) {
            this.spawnEnemy();
        }
    }

    spawnEnemy() {
        const types = [
            { emoji: '🪲', hp: 30, speed: 1.5, scale: 30 }, // Normal
            { emoji: '🐞', hp: 10, speed: 3.5, scale: 20 }, // Schnell
            { emoji: '🪳', hp: 80, speed: 0.8, scale: 50 }  // Tank
        ];
        // Wahrscheinlichkeit für Tanks steigt mit Level
        let type = types[0];
        if(Math.random() < 0.2 + (this.stats.level * 0.05)) type = types[Math.floor(Math.random()*types.length)];

        // Spawn am Rand
        let ex, ey;
        if(Math.random() > 0.5) {
            ex = Math.random() > 0.5 ? -50 : canvas.width + 50;
            ey = Math.random() * canvas.height;
        } else {
            ex = Math.random() * canvas.width;
            ey = Math.random() > 0.5 ? -50 : canvas.height + 50;
        }

        this.enemies.push({
            x: ex, y: ey,
            ...type,
            maxHp: type.hp * (1 + this.stats.level * 0.2) // Scaling HP
        });
    }

    addProtector() {
        this.protectors.push({
            angle: 0,
            distance: 100,
            lastShot: 0,
            fireRate: 5000 // Alle 5 Sek
        });
    }

    shoot(e, origin = this.player) {
        if(this.paused) return;
        const now = Date.now();
        
        // Player Cooldown check
        if(origin === this.player && now - this.player.lastShot < this.player.fireRate) return;
        if(origin === this.player) this.player.lastShot = now;

        const rect = canvas.getBoundingClientRect();
        const tx = e.clientX - rect.left;
        const ty = e.clientY - rect.top;

        const angle = Math.atan2(ty - origin.y, tx - origin.x);
        
        this.projectiles.push({
            x: origin.x, y: origin.y,
            vx: Math.cos(angle) * 8,
            vy: Math.sin(angle) * 8,
            damage: this.player.damage,
            isSplash: this.player.hasSplash,
            splashRad: this.player.splashRadius,
            life: 100
        });
        audio.playShoot();
    }

    // --- Update & Draw Loop ---
    loop(timestamp) {
        if(!this.paused) {
            this.update();
            this.draw();
        }
        requestAnimationFrame((t) => this.loop(t));
    }

    update() {
        const player = this.player;

        // Protectors
        this.protectors.forEach((p, idx) => {
            p.angle += 0.02;
            p.x = player.x + Math.cos(p.angle + idx) * p.distance;
            p.y = player.y + Math.sin(p.angle + idx) * p.distance;

            if(Date.now() - p.lastShot > p.fireRate) {
                // Finde nächsten Gegner
                if(this.enemies.length > 0) {
                    const target = this.enemies[0]; // Simples Targeting
                    // Mock event structure
                    this.shoot({clientX: target.x, clientY: target.y}, p); 
                    p.lastShot = Date.now();
                }
            }
        });

        // Enemies
        this.enemies.forEach((en, i) => {
            const dx = player.x - en.x;
            const dy = player.y - en.y;
            const dist = Math.hypot(dx, dy);
            
            // Move
            en.x += (dx / dist) * en.speed;
            en.y += (dy / dist) * en.speed;

            // Hit Player
            if(dist < en.scale + 20) {
                player.hp -= 0.5;
                if(player.hp <= 0) alert("Game Over! (Refresh to restart)");
            }
        });

        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            if(p.life <= 0) { this.projectiles.splice(i, 1); continue; }

            // Collision
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                let en = this.enemies[j];
                const dist = Math.hypot(p.x - en.x, p.y - en.y);
                
                if(dist < en.scale) {
                    // Hit!
                    en.hp -= p.damage;
                    audio.playHit();
                    
                    if(p.isSplash) {
                        // Flächenschaden
                        this.enemies.forEach(subEn => {
                            if(Math.hypot(subEn.x - p.x, subEn.y - p.y) < p.splashRad) {
                                subEn.hp -= p.damage * 0.5;
                            }
                        });
                        this.createParticles(p.x, p.y, '💥', 5);
                    } else {
                        this.createParticles(p.x, p.y, '✨', 3);
                    }

                    this.projectiles.splice(i, 1);

                    // Death
                    if(en.hp <= 0) {
                        this.createParticles(en.x, en.y, '💀', 5);
                        this.dropLoot(en.x, en.y);
                        this.enemies.splice(j, 1);
                    }
                    break;
                }
            }
        }

        // Loot Magnet & Collect
        for (let i = this.loot.length - 1; i >= 0; i--) {
            let l = this.loot[i];
            // Magnet logic: Immer zum Spieler
            l.x += (player.x - l.x) * 0.08;
            l.y += (player.y - l.y) * 0.08;

            if(Math.hypot(player.x - l.x, player.y - l.y) < 30) {
                if(l.type === 'xp') {
                    this.stats.xp += 10 * this.stats.xpMultiplier;
                    audio.playCollectXP();
                } else {
                    this.stats.money += 10 * this.stats.moneyMultiplier;
                    audio.playCollectMoney();
                }
                this.loot.splice(i, 1);
                this.checkLevelUp();
            }
        }

        // Particles
        this.particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            if(p.life <= 0) this.particles.splice(i, 1);
        });

        this.updateUI();
    }

    dropLoot(x, y) {
        this.loot.push({ x: x, y: y, type: 'xp', emoji: '✨' });
        if(Math.random() > 0.5) {
            this.loot.push({ x: x+10, y: y, type: 'money', emoji: '📀' });
        }
    }

    createParticles(x, y, char, count) {
        for(let i=0; i<count; i++) {
            this.particles.push({
                x: x, y: y,
                vx: (Math.random()-0.5)*5,
                vy: (Math.random()-0.5)*5,
                char: char,
                life: 1.0
            });
        }
    }

    // --- Drawing ---
    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Player
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("💾", this.player.x, this.player.y);
        
        // Protectors
        this.protectors.forEach(p => {
            ctx.font = "20px Arial";
            ctx.fillText("💾", p.x, p.y);
        });

        // Circular Health Bar
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, 30, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,0,0,0.3)";
        ctx.lineWidth = 4;
        ctx.stroke();

        const hpPerc = this.player.hp / this.player.maxHp;
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, 30, -Math.PI/2, (-Math.PI/2) + (Math.PI*2 * hpPerc));
        ctx.strokeStyle = `hsl(${hpPerc * 120}, 100%, 50%)`; // Grün zu Rot
        ctx.stroke();

        // Enemies
        this.enemies.forEach(en => {
            ctx.font = `${en.scale}px Arial`;
            ctx.fillText(en.emoji, en.x, en.y);
        });

        // Projectiles
        this.projectiles.forEach(p => {
            ctx.font = "20px Arial";
            ctx.fillText("💿", p.x, p.y);
        });

        // Loot
        this.loot.forEach(l => {
            ctx.font = "20px Arial";
            ctx.fillText(l.emoji, l.x, l.y);
        });

        // Particles
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillText(p.char, p.x, p.y);
            ctx.globalAlpha = 1;
        });
    }

    // --- UI & Progression ---
    updateUI() {
        document.getElementById('level-display').innerText = `LEVEL ${this.stats.level}`;
        document.getElementById('money-display').innerText = `📀 ${Math.floor(this.stats.money)}`;
        document.getElementById('lootbox-cost').innerText = Math.floor(this.stats.lootboxCost);
        
        const xpPerc = (this.stats.xp / this.stats.xpToNext) * 100;
        document.getElementById('xp-bar-fill').style.width = `${xpPerc}%`;
    }

    checkLevelUp() {
        if(this.stats.xp >= this.stats.xpToNext) {
            this.stats.xp = 0;
            this.stats.xpToNext *= 1.5;
            this.stats.level++;
            this.triggerUpgradeMenu();
        }
    }

    pauseGame(state) {
        this.paused = state;
        const overlay = document.getElementById('menu-overlay');
        if(state) overlay.classList.remove('hidden');
        else overlay.classList.add('hidden');
    }

    triggerUpgradeMenu() {
        this.pauseGame(true);
        audio.playLevelUp();
        
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        modalTitle.innerText = "LEVEL UP! WÄHLE EIN UPGRADE";
        modalBody.innerHTML = "";

        const options = this.upgrades.getRandomUpgrades(3);
        
        options.forEach(opt => {
            const card = document.createElement('div');
            card.className = `upgrade-card rarity-${opt.rarity.id}`;
            card.innerHTML = `<h3>${opt.name}</h3><p>${opt.desc}</p><small>${opt.rarity.id.toUpperCase()}</small>`;
            card.onclick = () => {
                this.upgrades.applyUpgrade(opt.id);
                this.pauseGame(false);
            };
            modalBody.appendChild(card);
        });
    }

    openShop() {
        if(this.stats.money < this.stats.lootboxCost) return;
        
        this.pauseGame(true);
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        this.stats.money -= this.stats.lootboxCost;
        this.stats.lootboxCost = Math.ceil(this.stats.lootboxCost * 1.5); // Exponentiell
        
        modalTitle.innerText = "LOOTBOX ÖFFNET...";
        modalBody.innerHTML = "<div style='font-size:50px' id='spinner'>❓</div>";

        // Rotations Animation
        let spins = 0;
        const maxSpins = 20;
        const interval = setInterval(() => {
            spins++;
            const randomUpgrade = this.upgrades.getRandomUpgrades(1)[0];
            const spinner = document.getElementById('spinner');
            spinner.innerText = randomUpgrade.name;
            spinner.style.color = randomUpgrade.rarity.color;
            audio.playLootboxSpin();

            if(spins >= maxSpins) {
                clearInterval(interval);
                // Gewinn
                this.upgrades.applyUpgrade(randomUpgrade.id);
                modalTitle.innerText = "GEWONNEN:";
                modalBody.innerHTML += `<button onclick="game.pauseGame(false)" style="margin-top:20px">Weiter</button>`;
                audio.playLevelUp();
            }
        }, 100);
    }
}

// Start Game
const game = new Game();
game.start();
