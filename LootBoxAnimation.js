// LootBoxAnimation.js

class LootBoxAnimation {
    constructor(gameContext) {
        this.game = gameContext; // Referenz auf die Game-Klasse
        this.isRunning = false;
        this.powerUps = ['Schnellschuss', 'Doppelschuss', 'Schild', 'Bonusleben']; // Die verfügbaren Powerups
        this.selectedIndex = 0; // Das aktuell angezeigte Powerup
        this.spinSpeed = 10; // Frames, um weiterzuschalten (startet schnell)
        this.spinCounter = 0;
        this.finalSpins = 30; // Anzahl der verbleibenden Spinn-Ticks, bevor es langsamer wird
        this.isSlowingDown = false;
        this.targetIndex = -1; // Das endgültig ausgewählte Powerup
    }

    startAnimation() {
        this.isRunning = true;
        this.game.isPaused = true; // Spiel pausieren
        this.spinCounter = 0;
        this.spinSpeed = 2; // Sehr schnelle initiale Rotation
        this.isSlowingDown = false;
        // Wählt das finale Powerup zufällig aus
        this.targetIndex = Math.floor(Math.random() * this.powerUps.length); 
        console.log("Lootbox gestartet! Gewonnenes Item:", this.powerUps[this.targetIndex]);
    }

    update() {
        if (!this.isRunning) return;

        this.spinCounter++;

        // 1. Verlangsamung starten, nachdem der initiale Spin beendet ist
        if (this.spinCounter > this.finalSpins && !this.isSlowingDown) {
            this.isSlowingDown = true;
        }

        // 2. Index-Wechsel-Logik (Glücksrad-Effekt)
        if (this.spinCounter % this.spinSpeed === 0) {
            this.selectedIndex = (this.selectedIndex + 1) % this.powerUps.length;

            // 3. Verlangsamung und Stoppen
            if (this.isSlowingDown) {
                // Erhöhen Sie die Wartezeit exponentiell oder linear
                this.spinSpeed += 1; 

                // Prüfen, ob das Ziel fast erreicht ist (langsame Rotation)
                if (this.spinSpeed > 10 && this.selectedIndex === this.targetIndex) {
                    // Stoppen!
                    this.finishAnimation(this.powerUps[this.targetIndex]);
                }
            }
        }
    }

    draw(ctx) {
        if (!this.isRunning) return;

        // Halb-transparenter Hintergrund (U-Effekt)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.game.width, this.game.height);

        // Das "Glücksrad"-Fenster (zentriert)
        const boxWidth = 300;
        const boxHeight = 150;
        const x = (this.game.width - boxWidth) / 2;
        const y = (this.game.height - boxHeight) / 2;
        
        ctx.fillStyle = '#2c3e50'; // Dunkles Blau/Grau
        ctx.fillRect(x, y, boxWidth, boxHeight);
        ctx.strokeStyle = '#f1c40f'; // Goldener Rahmen
        ctx.lineWidth = 5;
        ctx.strokeRect(x, y, boxWidth, boxHeight);

        // Aktuell angezeigtes Powerup
        const currentPowerUp = this.powerUps[this.selectedIndex];
        
        ctx.textAlign = 'center';
        ctx.font = '30px Arial';
        ctx.fillStyle = '#ecf0f1'; // Weiß
        ctx.fillText("Glücksrad dreht...", x + boxWidth / 2, y + 50);

        ctx.font = '40px Arial Bold';
        // Bei Stopp: Farbe des Textes ändern
        ctx.fillStyle = this.isSlowingDown && this.selectedIndex === this.targetIndex ? '#2ecc71' : '#f39c12'; 
        ctx.fillText(currentPowerUp, x + boxWidth / 2, y + 110);
        
        // Fügen Sie hier Ihre "U" Animation/Grafik hinzu
        // 
    }

    finishAnimation(powerUp) {
        this.isRunning = false;
        this.game.isPaused = false; // Spiel fortsetzen
        // Fügen Sie hier die Logik hinzu, um das Powerup dem Spieler zu geben
        this.game.player.applyPowerUp(powerUp); 
        console.log(`Du hast ${powerUp} gewonnen!`);
    }
}
