class EnemySystem {
    constructor(game) {
        this.game = game;
        this.definitions = [
            { id: 'normal', emoji: '🪲', hp: 20, speed: 1.2, damage: 10, scale: 30, chance: 0.2 },
            { id: 'fast', emoji: '🐞', hp: 8, speed: 2.5, damage: 5, scale: 20, chance: 0.15 },
            { id: 'tank', emoji: '🪳', hp: 60, speed: 0.6, damage: 20, scale: 45, chance: 0.05 },
            // --- Neue Bugs ---
            { id: 'sprinter', emoji: '🐜', hp: 12, speed: 3.5, damage: 7, scale: 22, chance: 0.2 }, // Sehr schnell, wenig HP
            { id: 'brute', emoji: '🕷️', hp: 80, speed: 0.4, damage: 30, scale: 50, chance: 0.05 }, // Extrem viel HP und Schaden, sehr langsam
            { id: 'mosquito', emoji: '🦟', hp: 5, speed: 1.8, damage: 3, scale: 15, chance: 0.2 }, // Schwach, aber schwer zu treffen, geringer Schaden
            { id: 'bomber', emoji: '🦗', hp: 30, speed: 1.0, damage: 50, scale: 35, chance: 0.1 }, // Moderat, hoher Schaden-Output beim Aufprall
            { id: 'juggernaut', emoji: '🦂', hp: 100, speed: 0.3, damage: 40, scale: 60, chance: 0.05 } // Der ultimative Tank: Langsam, viel HP, hoher Schaden
            // Die Wahrscheinlichkeiten (chance) wurden angepasst, um insgesamt 1.0 zu ergeben:
            // 0.2 + 0.15 + 0.05 + 0.2 + 0.05 + 0.2 + 0.1 + 0.05 = 1.0
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
