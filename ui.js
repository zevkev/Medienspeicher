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

        // Discord Button Event
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
        document.getElementById('go-level').innerText = s.level;
        document.getElementById('go-money').innerText = Math.floor(s.money);
    }

    async sendToDiscord() {
        const btn = document.getElementById('btn-discord');
        btn.innerText = "Sende...";
        
        const s = this.game.stats;
        const upgradeList = this.game.upgrades.activeUpgrades
            .map(u => `${u.emoji} ${u.name} (Lvl ${u.level})`)
            .join('\n') || "Keine Upgrades";

        const webhookURL = "https://discord.com/api/webhooks/1445472531413991580/DcsBOrTXpI8vjZFaWAM8jO9uitsn7ZzhrzsAskeWcaMypXM8U7Gjxgloe0gdhac7jV-9";

        const payload = {
            username: "Floppy Survivor Highscore",
            avatar_url: "https://em-content.zobj.net/source/microsoft-teams/337/floppy-disk_1f4be.png",
            embeds: [
                {
                    title: "💾 Neuer Highscore!",
                    color: 10181046, // Lila
                    fields: [
                        { name: "Level", value: s.level.toString(), inline: true },
                        { name: "Money", value: `📀 ${Math.floor(s.money)}`, inline: true },
                        { name: "Upgrades", value: upgradeList }
                    ],
                    footer: { text: "Gespielt von einem Pro Gamer 🕶️" },
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
            btn.innerText = "❌ Fehler";
            console.error(e);
        }
    }
}
