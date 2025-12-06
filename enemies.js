// Enemy.js - Enthält die Logik für den einzelnen Gegner und die Health Bar

class Enemy {
    constructor(game, data, x, y) {
        this.game = game;
        // Übernimmt id, emoji, speed, damage, scale
        Object.assign(this, data); 
        this.x = x;
        this.y = y;
        // HP und Schaden wurden bereits in EnemySystem mit Level skaliert
        this.maxHp = data.hp; 
        this.currentHp = data.hp; 
        this.radius = this.scale / 2;
    }

    draw(ctx) {
        // Emoji (Gegner) zeichnen
        ctx.font = `${this.scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.x, this.y);
        
        // Health Bar zeichnen (NEU)
        this.drawHealthBar(ctx);
    }

    drawHealthBar(ctx) {
        // Nur zeichnen, wenn HP verloren wurde
        if (this.currentHp >= this.maxHp) return; 

        const barWidth = this.scale * 1.2;
        const barHeight = 5;
        const x = this.x - barWidth / 2;
        const y = this.y - this.scale * 0.8;
        const healthPercentage = this.currentHp / this.maxHp;
        const currentBarWidth = barWidth * healthPercentage;

        // 1. Hintergrund (Leer/Rot)
        ctx.fillStyle = 'red';
        ctx.fillRect(x, y, barWidth, barHeight);

        // 2. Aktuelle Gesundheit (Grün)
        ctx.fillStyle = 'lime';
        ctx.fillRect(x, y, currentBarWidth, barHeight);

        // 3. Rahmen
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
    }
}


class EnemySystem {
    constructor(game) {
        this.game = game;
        this.definitions = [
            { id: 'normal', emoji: '🪲', hp: 20, speed: 1.2, damage: 10, scale: 30, chance: 0.2 },
            { id: 'fast', emoji: '🐞', hp: 8, speed: 2.5, damage: 5, scale: 20, chance: 0.15 },
            { id: 'tank', emoji: '🪳', hp: 60, speed: 0.6, damage: 20, scale: 45, chance: 0.05 },
            // --- Neue Bugs ---
            { id: 'sprinter', emoji: '🐜', hp: 12, speed: 3.5, damage: 7, scale: 22, chance: 0.2 },
            { id: 'brute', emoji: '🕷️', hp: 80, speed: 0.4, damage: 30, scale: 50, chance: 0.05 },
            { id: 'mosquito', emoji: '🦟', hp: 5, speed: 1.8, damage: 3, scale: 15, chance: 0.2 },
            { id: 'bomber', emoji: '🦗', hp: 30, speed: 1.0, damage: 50, scale: 35, chance: 0.1 }, 
            { id: 'juggernaut', emoji: '🦂', hp: 100, speed: 0.3, damage: 40, scale: 60, chance: 0.05 }
        ];
        this.spawnTimer = 0;
        this.spawnInterval = 120; // 2 Sekunden bei 60 FPS
    }

    spawn() {
        // Max Gegner skaliert mit Level
        const maxEnemies = 5 + this.game.stats.level * 2; 
        if (this.game.enemies.length >= maxEnemies) return;

        const rand = Math.random();
        let selectedType = this.definitions[0];
        let cumChance = 0;
        
        for(let def of this.definitions) {
            cumChance += def.chance;
            if(rand < cumChance) { selectedType = def; break; }
        }

        let x, y;
        const offset = 50;
        if(Math.random() > 0.5) { 
            x = Math.random() * this.game.canvas.width;
            y = Math.random() > 0.5 ? -offset : this.game.canvas.height + offset;
        } else { 
            x = Math.random() > 0.5 ? -offset : this.game.canvas.width + offset;
            y = Math.random() * this.game.canvas.height;
        }

        // HP und Schaden Skalierung pro Level (Stärkere exponentielle Skalierung)
        const levelFactor = 1 + this.game.stats.level * 0.5; // +50% pro Level
        
        const enemyData = {
            ...selectedType,
            hp: selectedType.hp * levelFactor, 
            damage: selectedType.damage * levelFactor,
            // Geschwindigkeit wird leicht reduziert für Tank-Gegner, um sie nicht zu schnell zu machen
            speed: selectedType.speed * (1 + this.game.stats.level * 0.05),
        };
        
        this.game.enemies.push(new Enemy(this.game, enemyData, x, y));
    }

    update() {
        const p = this.game.player;
        
        for (let i = this.game.enemies.length - 1; i >= 0; i--) {
            let en = this.game.enemies[i];
            
            const dx = p.x - en.x;
            const dy = p.y - en.y;
            const dist = Math.hypot(dx, dy);
            
            // Bewegung zum Spieler
            en.x += (dx / dist) * en.speed;
            en.y += (dy / dist) * en.speed;

            // Kollision mit dem Spieler
            if(dist < en.radius + p.radius) {
                this.game.takeDamage(en.damage); 
                
                this.game.particles.push(
                    ...this.game.createExplosionParticles(en.x, en.y, 'red', 10)
                );
                
                this.game.enemies.splice(i, 1);
            }
        }
    }
}
