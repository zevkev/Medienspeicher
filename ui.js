class UI {
    constructor(game) {
        this.game = game;
        this.elLevel = document.getElementById('level-display');
        this.elMoney = document.getElementById('money-display');
        this.elXpFill = document.getElementById('xp-bar-fill');
        this.elXpText = document.getElementById('xp-text');
        this.elShopCost = document.getElementById('lootbox-cost');
        
        // NEU: Lautstärke-Slider
        this.elVolumeSlider = document.getElementById('volume-slider');
        this.initVolumeControl();

        // NEU: Name Input Element
        this.elPlayerName = document.getElementById('player-name'); 

        // Discord Button Event 
        document.getElementById('btn-discord').addEventListener('click', () => this.sendToDiscord());
    }

    initVolumeControl() {
        // Initialen Wert aus localStorage laden (Standard 50, wenn nicht vorhanden)
        const savedVolume = localStorage.getItem('gameVolume') || 50;
        this.elVolumeSlider.value = savedVolume;
        this.game.audio.setVolume(parseInt(savedVolume));

        // Event Listener für den Slider
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

        // XP Bar
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
        
        // Lade gespeicherten Namen in das Eingabefeld
        this.elPlayerName.value = localStorage.getItem('playerName') || ''; 
        
        this.game.canvas.removeEventListener('mousedown', this.game.shootHandler); 
    }

    async sendToDiscord() {
        const btn = document.getElementById('btn-discord');
        const playerName = this.elPlayerName.value.trim() || "ANONYM"; 
        
        localStorage.setItem('playerName', playerName); // Name lokal speichern

        btn.innerText = "Sende...";
        btn.disabled = true;
        
        this.game.saveData.savePersistentData(); 
        
        const s = this.game.stats;
        
        const upgradeList = this.game.upgrades.activeUpgrades
            .map(u => `${u.emoji} ${u.name} (Lvl ${u.level})`)
            .join('\n') || "Keine Upgrades";

        const webhookURL = "https://discord.com/api/webhooks/1445472531413991580/DcsBOrTXpI8vjZFaWAM8jO9uitsn7ZzhrzsAskeWcaMypXM8U7Gjxgloe0gdhac7jV-9";

        const payload = {
            username: "Floppy Defender Highscore",
            avatar_url: "https://em-content.zobj.net/source/microsoft-teams/337/floppy-disk_1f4be.png",
            embeds: [
                {
                    title: `💾 Highscore von ${playerName}: Daten korrumpiert!`, // Name im Titel
                    color: 10181046, 
                    fields: [
                        { name: "Spielername", value: playerName, inline: true }, // Name als Feld
                        { name: "Level erreicht", value: s.level.toString(), inline: true },
                        { name: "Gesammeltes Geld", value: `📀 ${Math.floor(s.money)}`, inline: true },
                        { name: "---", value: "\u200b", inline: false }, 
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
            btn.innerText = "✅ Gesendet! (Neu laden)";
        } catch(e) {
            btn.innerText = "❌ Fehler beim Senden";
            console.error(e);
            btn.disabled = false;
        }
    }
}
