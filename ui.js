class UI {
    constructor(game) {
        this.game = game;
        this.elLevel = document.getElementById('level-display');
        this.elMoney = document.getElementById('money-display');
        this.elXpFill = document.getElementById('xp-bar-fill');
        this.elXpText = document.getElementById('xp-text');
        this.elShopCost = document.getElementById('lootbox-cost');
        
        // Settings
        document.getElementById('btn-mute').addEventListener('click', (e) => {
            let m = this.game.audio.toggleMute();
            e.target.innerText = m ? "🔇 Sound aus" : "🔊 Sound an";
        });

        // Discord Button Event (muss auf dem Game Over Screen liegen)
        document.getElementById('btn-discord').addEventListener('click', () => this.sendToDiscord());
    }

    update() {
        const s = this.game.stats;
        this.elLevel.innerText = `LEVEL ${s.level}`;
        this.elMoney.innerText = `📀 ${Math.floor(s.money)}`;
        this.elShopCost.innerText = Math.floor(s.lootboxCost);

        // XP Bar Fix
        let perc = (s.xp / s.xpToNext) * 100;
        if(perc > 100) perc = 100;
        this.elXpFill.style.width = `${perc}%`;
        this.elXpText.innerText = `${Math.floor(s.xp)} / ${Math.floor(s.xpToNext)} XP`;
    }

    showGameOver() {
        const s = this.game.stats;
        document.getElementById('game-over-overlay').classList.remove('hidden');
        document.getElementById('ui-layer').classList.add('hidden'); // Haupt-UI ausblenden
        document.getElementById('go-level').innerText = s.level;
        document.getElementById('go-money').innerText = Math.floor(s.money);
        
        // Deaktiviere den Schuss-Event-Handler im game.js, um das Schießen zu verhindern
        this.game.canvas.removeEventListener('mousedown', this.game.shootHandler); 
    }

    async sendToDiscord() {
        const btn = document.getElementById('btn-discord');
        btn.innerText = "Sende...";
        
        const s = this.game.stats;
        
        // Liste der Upgrades im schönen Format
        const upgradeList = this.game.upgrades.activeUpgrades
            .map(u => `${u.emoji} ${u.name} (Lvl ${u.level})`)
            .join('\n') || "Keine Upgrades";

        const webhookURL = "https://discord.com/api/webhooks/1445472531413991580/DcsBOrTXpI8vjZFaWAM8jO9uitsn7ZzhrzsAskeWcaMypXM8U7Gjxgloe0gdhac7jV-9";

        const payload = {
            username: "Floppy Defender Highscore",
            avatar_url: "https://em-content.zobj.net/source/microsoft-teams/337/floppy-disk_1f4be.png",
            embeds: [
                {
                    title: "💾 Neuer Highscore: Daten korrumpiert!",
                    color: 10181046, // Lila
                    fields: [
                        { name: "Level erreicht", value: s.level.toString(), inline: true },
                        { name: "Gesammeltes Geld", value: `📀 ${Math.floor(s.money)}`, inline: true },
                        { name: "---", value: "\u200b", inline: false }, // Separator
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
            btn.innerText = "✅ Gesendet!";
            btn.disabled = true;
        } catch(e) {
            btn.innerText = "❌ Fehler beim Senden";
            console.error(e);
        }
    }
}
