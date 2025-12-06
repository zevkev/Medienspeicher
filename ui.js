class UI {
    constructor(game) {
        this.game = game;
        this.elLevel = document.getElementById('level-display');
        this.elMoney = document.getElementById('money-display');
        this.elXpFill = document.getElementById('xp-bar-fill');
        this.elXpText = document.getElementById('xp-text');
        this.elHpFill = document.getElementById('hp-bar-fill');
        this.elHpText = document.getElementById('hp-text');
        this.elShopCost = document.getElementById('lootbox-cost');
        
        this.elVolumeSlider = document.getElementById('volume-slider');
        this.initVolumeControl();

        this.elLootboxBtn = document.getElementById('btn-shop');
        this.elLootboxBtn.addEventListener('click', () => this.buyLootbox());
        
        // Füge Klick-Sound zu allen Haupt-Buttons hinzu
        document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => this.game.audio.playClick());
        });

        // 🟢 FIX FÜR DEN SPIELSTART-KNOPF: Event-Listener hier binden
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
            this.game.audio.setVolume(e.target.value);
        });
    }

    updateHUD() {
        const s = this.game.stats;
        const p = this.game.player;
        const hpPercent = p.hp / p.maxHp;
        const xpPercent = s.xp / s.xpToNext;

        // Level und XP
        this.elLevel.innerText = `LEVEL ${s.level}`;
        this.elXpFill.style.width = `${xpPercent * 100}%`;
        this.elXpText.innerText = `${Math.floor(s.xp)} / ${Math.floor(s.xpToNext)}`;

        // HP 
        this.elHpFill.style.width = `${Math.max(0, hpPercent) * 100}%`;
        this.elHpText.innerText = `${Math.max(0, Math.floor(p.hp))} / ${Math.floor(p.maxHp)} ${p.stats.shieldActive ? '🛡️' : ''}`;

        // Geld und Shop
        this.elMoney.innerText = `📀 ${Math.floor(s.money)}`;
        this.elShopCost.innerText = Math.floor(s.lootboxCost);

        // Lootbox Button Zustand
        this.elLootboxBtn.disabled = s.money < s.lootboxCost || this.game.lootBoxAnimation.isRunning;
        this.elLootboxBtn.style.opacity = this.elLootboxBtn.disabled ? 0.5 : 1;
    }

    buyLootbox() {
        if (this.game.stats.money >= this.game.stats.lootboxCost && !this.game.lootBoxAnimation.isRunning) {
            this.game.stats.money -= this.game.stats.lootboxCost;
            this.game.stats.lootboxCost *= 1.5; // Erhöht den Preis für die nächste Box
            this.game.lootBoxAnimation.startAnimation();
            this.updateHUD();
        }
    }

    updateGameOverScreen() {
        const s = this.game.stats;
        document.getElementById('go-level').innerText = s.level;
        document.getElementById('go-money').innerText = Math.floor(s.totalMoneyEarned);
    }
    
    // Die Discord Webhook Funktion wurde beibehalten (BITTE URL ANPASSEN!)
    async sendToDiscord() {
        const btn = document.getElementById('btn-discord');
        btn.disabled = true;

        const playerName = document.getElementById('player-name').value || 'Anonym';
        const s = this.game.stats;
        const upgradeList = this.game.upgrades.activeUpgrades
            .filter(u => u.level > 0)
            .map(u => `${u.emoji} ${u.name} (Lv ${u.level})`)
            .join('\\n') || 'Keine Upgrades';

        // BITTE HIER IHRE WEBHOOK URL EINFÜGEN!
        const webhookURL = "IHRE_DISCORD_WEBHOOK_URL_HIER"; 

        const payload = {
            username: "Floppy Defender Highscore",
            avatar_url: "https://em-content.zobj.net/source/microsoft-teams/337/floppy-disk_1f4be.png",
            embeds: [
                {
                    title: `💾 Neuer Highscore von ${playerName}: Level ${s.level} erreicht!`,
                    color: 10181046, 
                    fields: [
                        { name: "Level erreicht", value: s.level.toString(), inline: true },
                        { name: "Gesammeltes Geld", value: `📀 ${Math.floor(s.totalMoneyEarned)}`, inline: true },
                        { name: "---\u200b", value: "\u200b", inline: false }, 
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
        } catch (error) {
            btn.innerText = "FEHLER! ❌";
            console.error("Fehler beim Senden an Discord:", error);
        }
    }
}
