// LootBoxAnimation.js

class LootBoxAnimation {
    constructor(gameContext) {
        this.game = gameContext; // Referenz auf die Game-Klasse
        this.isRunning = false;
        this.powerUps = [
            { id: 'fireRate', name: 'Schnellschuss ⚡', desc: 'Erhöht Feuerrate temporär' },
            { id: 'doubleShot', name: 'Doppelschuss 💥', desc: 'Schießt 2 Projektile' },
            { id: 'shield', name: 'Schild 🛡️', desc: 'Absorbiert 1 Hit' },
            { id: 'heal', name: 'Bonusleben ❤️', desc: '+25 HP' }
        ]; 
        this.selectedIndex = 0;
        this.spinSpeed = 2; 
        this.spinCounter = 0;
        this.initialSpins = 40; 
        this.isSlowingDown = false;
        this.targetIndex = -1;
    }

    startAnimation() {
        if(this.isRunning) return; 
        this.isRunning = true;
        this.game.pauseGame(true); // Spiel pausieren
        this.spinCounter = 0;
        this.spinSpeed = 2;
        this.isSlowingDown = false;
        this.targetIndex = Math.floor(Math.random() * this.powerUps.length); 
        
        this.game.audio.playLootSpin();
    }

    update() {
        if (!this.isRunning) return;

        this.spinCounter++;

        // 1. Verlangsamung starten
        if (this.spinCounter > this.initialSpins && !this.isSlowingDown) {
            this.isSlowingDown = true;
        }

        // 2. Index-Wechsel-Logik
        if (this.spinCounter % this.spinSpeed === 0) {
            this.selectedIndex = (this.selectedIndex + 1) % this.powerUps.length;

            // 3. Verlangsamung und Stoppen
            if (this.isSlowingDown) {
                this.spinSpeed += 2; // Verlangsamen
                
                if (this.spinSpeed > 20 && this.selectedIndex === this.targetIndex) {
                    this.finishAnimation(this.powerUps[this.targetIndex]);
                }
            }
        }
    }

    draw(ctx) {
        if (!this.isRunning) return;

        // Halb-transparenter Hintergrund (U-Effekt)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; 
        ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

        // Das "Glücksrad"-Fenster
        const boxWidth = 400;
        const boxHeight = 200;
        const x = (this.game.canvas.width - boxWidth) / 2;
        const y = (this.game.canvas.height - boxHeight) / 2;
        
        ctx.fillStyle = '#34495e'; 
        ctx.fillRect(x, y, boxWidth, boxHeight);
        ctx.strokeStyle = '#f1c40f'; 
        ctx.lineWidth = 8;
        ctx.strokeRect(x, y, boxWidth, boxHeight);
        
        // "U" (Lootbox/Glücksrad) Emoji
        ctx.textAlign = 'center';
        ctx.font = '70px Arial';
        
        ctx.save();
        const emojiX = x + boxWidth / 2;
        const emojiY = y + 60;
        
        if(this.spinSpeed < 10) { 
            ctx.translate(emojiX, emojiY);
            ctx.rotate(Math.sin(this.spinCounter * 0.5) * 0.1);
            ctx.fillText('🎁', 0, 0);
        } else {
             ctx.fillText('🎁', emojiX, emojiY);
        }
        ctx.restore();


        // Text
        ctx.font = '24px Arial';
        ctx.fillStyle = '#ecf0f1';
        ctx.fillText("Dein Powerup wird ermittelt...", x + boxWidth / 2, y + 105);

        // Aktuell angezeigtes Powerup
        const currentPowerUp = this.powerUps[this.selectedIndex];
        
        ctx.font = '40px Arial Bold';
        ctx.fillStyle = this.isSlowingDown && this.selectedIndex === this.targetIndex ? '#2ecc71' : '#f39c12'; 
        ctx.fillText(currentPowerUp.name, x + boxWidth / 2, y + 165);
    }

    finishAnimation(powerUp) {
        this.isRunning = false;
        this.game.pauseGame(false); // Spiel fortsetzen
        this.game.applyLootboxPowerUp(powerUp.id); 
        this.game.audio.playLootStop(true);
    }
}
