const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

// Die Klassen UI, EnemySystem, UpgradeManager sind in den externen Dateien

class Game {
    constructor() {
        this.canvas = canvas;
        this.ctx = ctx;
        this.audio = new SoundEngine();
        this.ui = new UI(this);
        this.enemySystem = new EnemySystem(this);
        this.upgrades = new UpgradeManager(this);

        this.paused = true; // Spiel startet pausiert
        this.gameOver = false;
        
        this.stats = { level: 1, xp: 0, xpToNext: 100, money: 0, lootboxCost: 100 };
        
        this.player = {
            x: -100, // Standardmäßig außerhalb des Screens
            y: -100,
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

        // UI-Ebenen vorbereiten
        document.getElementById('ui-layer').classList.add('hidden');
        document.getElementById('game-over-overlay').classList.add('hidden');
        
        // Input und Start-Events
        this.bindEvents();
        document.getElementById('btn-start').addEventListener('click', () => this.startGame());

        // Die Game Loop startet sofort, rendert aber nur, wenn `paused=false`
        this.loop(0);
    }
    
    bindEvents() {
        canvas.addEventListener('mousedown', (e) => this.inputShoot(e));
        // Settings-Button in UI.js gebunden
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
        
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 500);

        if(this.player.hp <= 0) {
            this.player.hp = 0;
            this.gameOver = true;
            this.audio.stopBGM(); // Musik stoppen
            this.ui.showGameOver(); // Zeigt das Game Over UI
        }
    }

    // ... (restliche Logik wie inputShoot, shootProjectile, createExplosion bleiben gleich) ...

    loop(timestamp) {
        requestAnimationFrame((t) => this.loop(t));
        
        if(this.paused || this.gameOver) {
            // Nur das Canvas löschen, wenn das Spiel läuft, oder wenn es gerade neu gestartet wird
            if(!this.paused && !this.gameOver) {
                 this.ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            return;
        }

        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Updates
        this.upgrades.update(timestamp);
        this.enemySystem.update();
        
        // ... (Logik für Projectiles, Explosions, Enemies, Loot, Draw) ...
        
        this.ui.update();
    }
    
    // ... (checkLevel, showUpgradeMenu bleiben gleich) ...
    
    pauseGame(state) {
        this.paused = state;
        const overlay = document.getElementById('menu-overlay');
        if(state) {
            overlay.classList.remove('hidden');
            this.audio.stopBGM(); // Musik bei Pause stoppen
        }
        else {
            overlay.classList.add('hidden');
            this.audio.playBGM(); // Musik bei Fortsetzung starten
        }
    }
}

const game = new Game();
// Warten auf Start Button Klick.
