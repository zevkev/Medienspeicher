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

        // ❌ ENTFERNT: this.elPlayerName = document.getElementById('player-name'); 
        // Der Zugriff wird jetzt in showGameOver() durchgeführt.

        this.elLootboxBtn = document.getElementById('btn-shop');
        this.elLootboxBtn.addEventListener('click', () => this.buyLootbox());
        
        // Füge Klick-Sound zu allen Haupt-Buttons hinzu
        document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => this.game.audio.playClick());
        });

        // NEU: Start-Button Logik hier binden, um sicherzustellen, dass das Spiel startet
        document.getElementById('btn-start').addEventListener('click', () => {
             // Der Klick-SFX wird bereits durch den .forEach oben behandelt.
             this.game.startGame(); 
        });

        // Discord Button Event 
        document.getElementById('btn-discord').addEventListener('click', () => this.sendToDiscord());
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
        
        // NEU: Name Input Element wird hier abgerufen und initialisiert, wo es sichtbar ist.
        const elPlayerName = document.getElementById('player-name'); 
        elPlayerName.value = localStorage.getItem('playerName') || ''; 
        
        this.game.canvas.removeEventListener('mousedown', this.game.shootHandler); 
    }

    buyLootbox() {
        const cost = Math.floor(this.game.stats.lootboxCost);
        
        if (this.game.stats.money >= cost) {
            this.game.audio.playLootbox();
            this.game.stats.money -= cost;
            this.game.stats.lootboxCost *= 1.5; 

            const roll = Math.random();
            if (roll < 0.7) {
                const opts = this.game.upgrades.getOptions(1);
                this.game.upgrades.apply(opts[0].id);
            } else if (roll < 0.95) {
                const bonus = cost * (1 + Math.random());
                this.game.stats.money += bonus;
            } else {
                this.game.checkLevel();
            }
            
            this.update();
        } else {
            this.elLootboxBtn.classList.add('shake');
            setTimeout(() => this.elLootboxBtn.classList.remove('shake'), 500);
        }
    }

    async sendToDiscord() {
        const btn = document.getElementById('btn-discord');
        // NEU: Name Input Element wird hier abgerufen.
        const playerName = document.getElementById('player-name').value.trim() || "ANONYM"; 
        
        localStorage.setItem('playerName', playerName); 
        // ... (Rest der Funktion, unverändert)
    }
}
