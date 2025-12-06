class EnemySystem {
    constructor(game) {
        this.game = game;
        this.definitions = [
            { id: 'normal', emoji: '🪲', hp: 20, speed: 1.2, damage: 10, scale: 30, chance: 0.6 },
            { id: 'fast', emoji: '🐞', hp: 8, speed: 2.5, damage: 5, scale: 20, chance: 0.3 },
            { id: 'tank', emoji: '🪳', hp: 60, speed: 0.6, damage: 20, scale: 45, chance: 0.1 }
        ];
    }

    spawn() {
        const maxEnemies = 5 + this.game.stats.level;
        if (this.game.enemies.length >= maxEnemies) return;

        const rand = Math.random();
        let selectedType = this.definitions[0];
        let cumChance = 0;
        
        for(let def of this.definitions) {
            cumChance += def.chance;
            if(rand < cumChance) { selectedType = def; break; }
        }

        let x, y;
        if(Math.random() > 0.5) {
            x = Math.random() > 0.5 ? -50 : this.game.canvas.width + 50;
            y = Math.random() * this.game.canvas.height;
        } else {
            x = Math.random() * this.game.canvas.width;
            y = Math.random() > 0.5 ? -50 : this.game.canvas.height + 50;
        }

        this.game.enemies.push({
            ...selectedType,
            x: x, y: y,
            maxHp: selectedType.hp * (1 + this.game.stats.level * 0.3), 
            currentHp: selectedType.hp * (1 + this.game.stats.level * 0.3)
        });
    }

    update() {
        const p = this.game.player;
        
        for (let i = this.game.enemies.length - 1; i >= 0; i--) {
            let en = this.game.enemies[i];
            
            const dx = p.x - en.x;
            const dy = p.y - en.y;
            const dist = Math.hypot(dx, dy);
            
            en.x += (dx / dist) * en.speed;
            en.y += (dy / dist) * en.speed;

            if(dist < en.scale + 15) {
                this.game.takeDamage(en.damage);
                
                this.game.enemies.splice(i, 1);
            }
        }
    }
}
 
