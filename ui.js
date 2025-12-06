class UI {
    constructor(game) {
        this.game = game;
        this.elLevel = document.getElementById('level-display');
        this.elMoney = document.getElementById('money-display');
        this.elXpFill = document.getElementById('xp-bar-fill');
        this.elXpText = document.getElementById('xp-text');
        this.elShopCost = document.getElementById('lootbox-cost');
        
        this.elVolumeSlider = document.getElementById('volume-slider');
        this.initVolumeControl();

        this.elPlayerName = document.getElementById('player-name'); 

        // NEU: Lootbox Button Event Listener und SFX für alle Buttons
        this.elLootboxBtn = document.getElementById('btn-shop');
        this.elLootboxBtn.addEventListener('click', () => this.buyLootbox());
        
        // Füge Klick-Sound zu allen Haupt-Buttons hinzu
        document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => this.game.audio.playClick());
        });

        // Discord Button Event 
        document.getElementById('btn-discord').addEventListener('click', () => this.sendToDiscord());
        
        // Der Start-Button muss hier einen Klick-Sound bekommen, da er keinen eigenen Logik-Handler hat.
        document.getElementById('btn-start').addEventListener('click', () => this.game.audio.playClick());
    }

    initVolumeControl() {
        const savedVolume = localStorage.getItem('gameVolume') || 50;
        this.elVolumeSlider.value = savedVolume;
        this.game.audio.setVolume(parseInt(savedVolume));

        this.elVolumeSlider.addEventListener('input', (e) => {
            const level = parseInt(e.target.value);
            this.game.audio.setVolume(level);
        });
    }

    update() {
        const s = this.game.stats;
        this.elLevel.innerText = `LEVEL ${s.level}`;
        this.elMoney.innerText = `📀 ${Math.floor(s.money)}`;
        this.elShopCost.innerText = Math.floor(s.lootboxCost);

        let perc = (s.xp / s.xpToNext) * 100;
        if(perc > 100) perc = 100;
        this.elXpFill.style.width = `${perc}%`;
        this.elXpText.innerText = `${Math.floor(s.xp)} / ${Math.floor(s.xpToNext)} XP`;
    }

    showGameOver() {
        const s = this.game.stats;
        document.getElementById('game-over-overlay').classList.remove('hidden');
        document.getElementById('ui-layer').classList.add('hidden'); 
        document.getElementById('go-level').innerText = s.level;
        document.getElementById('go-money').innerText = Math.floor(s.money);
        
        this.elPlayerName.value = localStorage.getItem('playerName') || ''; 
        
        this.game.canvas.removeEventListener('mousedown', this.game.shootHandler); 
    }

    /** NEU: Lootbox Kauf Logik */
    buyLootbox() {
        const cost = Math.floor(this.game.stats.lootboxCost);
        
        if (this.game.stats.money >= cost) {
            this.game.audio.playLootbox();
            this.game.stats.money -= cost;
            this.game.stats.lootboxCost *= 1.5; // Erhöhe den Preis

            // Belohnungs-Roll
            const roll = Math.random();
            if (roll < 0.7) {
                // 70% Chance auf ein Upgrade (wird sofort angewendet)
                const opts = this.game.upgrades.getOptions(1);
                this.game.upgrades.apply(opts[0].id);
            } else if (roll < 0.95) {
                // 25% Chance auf Geld-Bonus
                const bonus = cost * (1 + Math.random());
                this.game.stats.money += bonus;
            } else {
                // 5% Chance auf Level-Up (sehr selten)
                this.game.checkLevel();
            }
            
            this.update();
        } else {
            // Visuelle Rückmeldung bei zu wenig Geld
            this.elLootboxBtn.classList.add('shake');
            setTimeout(() => this.elLootboxBtn.classList.remove('shake'), 500);
        }
    }

    async sendToDiscord() {
        // ... (Logik unverändert)
    }
}
