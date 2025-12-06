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

        this.elLootboxBtn = document.getElementById('btn-shop');
        this.elLootboxBtn.addEventListener('click', () => this.buyLootbox());
        
        // Füge Klick-Sound zu allen Haupt-Buttons hinzu
        document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => this.game.audio.playClick());
        });

        // 🟢 FIX: Start-Button Logik hier binden, um sicherzustellen, dass das Spiel startet
        document.getElementById('btn-start').addEventListener('click', () => {
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

    /** Wird aufgerufen, wenn das Spiel endet. */
    showGameOver() {
        const s = this.game.stats;
        document.getElementById('game-over-overlay').classList.remove('hidden');
        document.getElementById('ui-layer').classList.add('hidden'); 
        document.getElementById('go-level').innerText = s.level;
        document.getElementById('go-money').innerText = Math.floor(s.money);
        
        // 🟢 FIX: Name Input Element wird erst hier abgerufen, wenn das Overlay sichtbar wird.
        const elPlayerName = document.getElementById('player-name'); 
        if (elPlayerName) {
            elPlayerName.value = localStorage.getItem('playerName') || ''; 
        }
        
        this.game.canvas.removeEventListener('mousedown', this.game.shootHandler); 
    }

    /** Lootbox Kauf Logik */
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
                // 5% Chance auf Level-Up
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
        const btn = document.getElementById('btn-discord');
        // Player Name abrufen (sicherstellen, dass es existiert, falls HTML fehlt)
        const playerNameEl = document.getElementById('player-name');
        const playerName = playerNameEl ? playerNameEl.value.trim() || "ANONYM" : "ANONYM"; 
        
        localStorage.setItem('playerName', playerName); 
        
        // Upgrades für Discord-Nachricht formatieren
        const s = this.game.stats;
        const upgradeList = this.game.upgrades.activeUpgrades.map(u => 
            `${u.emoji} ${u.name} (Lv ${u.level})`
        ).join('\\n') || 'Keine Upgrades gesammelt.';

        // **WICHTIG**: Dies ist eine Beispiel-URL. Du musst deine eigene Webhook-URL hier einfügen.
        const webhookURL = "https://discord.com/api/webhooks/1445472531413991580/DcsBOrTXpI8vjZFaWAM8jO9uitsn7ZzhrzsAskeWcaMypXM8U7Gjxgloe0gdhac7jV-9";

        const payload = {
            username: "Floppy Defender Highscore",
            avatar_url: "https://em-content.zobj.net/source/microsoft-teams/337/floppy-disk_1f4be.png",
            embeds: [
                {
                    title: `💾 Neuer Highscore von ${playerName}: Daten korrumpiert!`,
                    color: 10181046, 
                    fields: [
                        { name: "Level erreicht", value: s.level.toString(), inline: true },
                        { name: "Gesammeltes Geld", value: `📀 ${Math.floor(s.money)}`, inline: true },
                        { name: "---\\u200b", value: "\\u200b", inline: false }, 
                        { name: "Erworbene Upgrades", value: upgradeList }
                    ],
                    footer: { text: `Datum: ${new Date().toLocaleDateString('de-DE')} | Floppy Defender` },
                    timestamp: new Date().toISOString()
                }
            ]
        };

        try {
            await fetch(webhookURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            btn.innerText = "GESENDET! 🎉";
            btn.disabled = true;
        } catch (e) {
            console.error("Fehler beim Senden an Discord:", e);
            btn.innerText = "FEHLER BEIM SENDEN ❌";
        }
    }
}
