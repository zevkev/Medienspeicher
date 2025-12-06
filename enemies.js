class EnemySystem {
    constructor(game) {
        this.game = game;
        // Hinzugefügte neue Gegner und angepasste Skalierung
        this.definitions = [
            { id: 'normal', emoji: '🪲', hp: 20, speed: 1.2, damage: 10, scale: 30, chance: 0.5 },
            { id: 'fast', emoji: '🐞', hp: 8, speed: 3.0, damage: 5, scale: 25, chance: 0.2 },
            { id: 'tank', emoji: '🪳', hp: 60, speed: 0.8, damage: 20, scale: 45, chance: 0.1 },
            { id: 'corrupt', emoji: '🦠', hp: 10, speed: 1.5, damage: 15, scale: 30, chance: 0.1, loot: 'money' },
            { id: 'swarm', emoji: '🐜', hp: 5, speed: 2.0, damage: 2, scale: 15, chance: 0.1, xp: 5 } // Schwarm gibt weniger XP
        ];
    }

    spawn() {
        const maxEnemies = 10 + this.game.stats.level * 2;
        if (this.game.enemies.length >= maxEnemies) return;

        const rand = Math.random();
        let selectedType = this.definitions[0];
        let cumChance = 0;
        
        for(let def of this.definitions) {
            cumChance += def.chance;
            if(rand < cumChance) { selectedType = def; break; }
        }

        let x, y;
        const spawnDistance = 100;
        // Spawn außerhalb des Sichtfelds
        if(Math.random() > 0.5) {
            x = Math.random() > 0.5 ? -spawnDistance : this.game.canvas.width + spawnDistance;
            y = Math.random() * this.game.canvas.height;
        } else {
            x = Math.random() * this.game.canvas.width;
            y = Math.random() > 0.5 ? -spawnDistance : this.game.canvas.height + spawnDistance;
        }

        const hpMultiplier = 1 + this.game.stats.level * 0.3;
        
        this.game.enemies.push({
            ...selectedType,
            x: x, y: y,
            maxHp: selectedType.hp * hpMultiplier, 
            currentHp: selectedType.hp * hpMultiplier
        });
    }

    update() {
        const p = this.game.player;
        
        for (let i = this.game.enemies.length - 1; i >= 0; i--) {
            let en = this.game.enemies[i];
            
            const dx = p.x - en.x;
            const dy = p.y - en.y;
            const dist = Math.hypot(dx, dy);
            
            // Bewegung des Gegners zum Spieler
            en.x += (dx / dist) * en.speed;
            en.y += (dy / dist) * en.speed;

            // Kollision mit dem Spieler
            if(dist < en.scale / 2 + 10) { 
                this.game.takeDamage(en.damage);
                
                // Knockback-Effekt auf den Gegner
                if (p.stats.knockback > 0) {
                    en.x += (dx / dist) * p.stats.knockback * 1.5;
                    en.y += (dy / dist) * p.stats.knockback * 1.5;
                    continue; 
                }
                
                this.game.enemies.splice(i, 1);
            }
        }
    }
}
