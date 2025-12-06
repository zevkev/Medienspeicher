class UI {
    constructor(game) {
        this.game = game;
        this.elLevel = document.getElementById('level-display');
        this.elMoney = document.getElementById('money-display');
        this.elXpFill = document.getElementById('xp-bar-fill');
        this.elXpText = document.getElementById('xp-text');
        this.elShopCost = document.getElementById('lootbox-cost');
        this.elUpgradeListContainer = document.getElementById('upgrade-list-container');
        this.elUpgradeDetailsContainer = document.getElementById('upgrade-details-container');
        
        this.elVolumeSlider = document.getElementById('volume-slider');
        this.initVolumeControl();
        
        this.initShopButton(); 
        document.getElementById('btn-discord').addEventListener('click', () => this.sendToDiscord());
        
        // Versuche-Zähler beim Start aktualisieren
        this.updateRunCount();
    }
    
    updateRunCount() {
        document.getElementById('run-count').innerText = `Bisherige Versuche: ${this.game.saveData.loadPersistentData().runCount}`;
    }

    initVolumeControl() {
        const savedVolume = localStorage.getItem('gameVolume') || 50;
        this.elVolumeSlider.value = savedVolume;
        this.game.audio.setVolume(parseInt(savedVolume));

        this.elVolumeSlider.addEventListener('input', (e) => {
            this.game.audio.setVolume(parseInt(e.target.value));
        });
    }
    
    initShopButton() {
        const shopPanel = document.getElementById('shop-panel');
        let btnShop = document.getElementById('btn-shop');
        
        // Entferne alten Listener, falls vorhanden (wichtig, da wir den Button neu erstellen)
        if (btnShop) {
            const newBtn = btnShop.cloneNode(true);
            btnShop.parentNode.replaceChild(newBtn, btnShop);
            btnShop = newBtn;
        }

        if (btnShop) {
            btnShop.addEventListener('click', () => this.buyLootbox());
        }
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

    updateActiveUpgrades() {
        this.elUpgradeListContainer.innerHTML = '';
        this.elUpgradeDetailsContainer.innerHTML = '<h4>Aktive Upgrades</h4><p>Wähle ein Upgrade, um Details zu sehen.</p>';

        const activeTemporary = this.game.upgrades.activeUpgrades.filter(u => !u.isPersistent);

        activeTemporary.forEach(up => {
            const btn = document.createElement('button');
            btn.className = 'upgrade-button';
            // Zeige das Level im Icon an
            btn.innerHTML = `${up.emoji}<span style="position: absolute; bottom: -2px; right: -2px; font-size: 10px; color: var(--accent); text-shadow: 0 0 3px black; font-weight: bold;">${up.level}</span>`;
            btn.style.position = 'relative'; 
            
            btn.onclick = () => this.showUpgradeDetails(up);
            this.elUpgradeListContainer.appendChild(btn);
        });
    }
    
    showUpgradeDetails(upgrade) {
        document.querySelectorAll('.upgrade-button').forEach(b => b.classList.remove('selected'));
        // Finde den Button basierend auf dem Emoji
        const button = Array.from(this.elUpgradeListContainer.children).find(b => b.innerHTML.includes(upgrade.emoji));
        if(button) button.classList.add('selected');
        
        this.elUpgradeDetailsContainer.innerHTML = `
            <h4>${upgrade.name} (Lv ${upgrade.level})</h4>
            <p>${upgrade.desc}</p>
        `;
    }
    
    buyLootbox() {
        const s = this.game.stats;
        if (s.money >= s.lootboxCost) {
            s.money -= s.lootboxCost;
            
            const upgrade = this.game.upgrades.getLootboxUpgrade();
            this.game.upgrades.apply(upgrade.id); 
            
            // Finde das neue Level des permanenten Upgrades
            const currentLevel = this.game.upgrades.activeUpgrades.find(u => u.id === upgrade.id).level;
            
            s.lootboxCost = Math.floor(s.lootboxCost * 1.5); 
            this.game.audio.playLevelUp(); // Lootbox-Sound

            // Visuelles Feedback
            const shopPanel = document.getElementById('shop-panel');
            
            shopPanel.innerHTML = `<div style="color: var(--rarity-epic); font-size: 14px; text-shadow: 0 0 5px black; margin-bottom: 5px;">
                🎉 LOOTBOX GEÖFFNET! 🎉<br>
                +${upgrade.emoji} ${upgrade.name} (Lv ${currentLevel})
            </div>`;
            
            // Stelle den Button nach 3 Sekunden wieder her
            setTimeout(() => {
                shopPanel.innerHTML = `<div id="money-display">📀 ${Math.floor(s.money)}</div>
                    <button id="btn-shop" class="shop-btn">Lootbox (📀 <span id="lootbox-cost">${Math.floor(s.lootboxCost)}</span>)</button>`;
                this.initShopButton(); // Wichtig: Listener neu setzen
                this.update();
            }, 3000);
            
        } else {
            console.log("Nicht genug Geld!");
            const shopPanel = document.getElementById('shop-panel');
            shopPanel.classList.add('shake');
            setTimeout(() => shopPanel.classList.remove('shake'), 500);
        }
    }

    showGameOver() {
        const s = this.game.stats;
        document.getElementById('game-over-overlay').classList.remove('hidden');
        document.getElementById('ui-layer').classList.add('hidden'); 
        document.getElementById('go-level').innerText = s.level;
        document.getElementById('go-money-run').innerText = Math.floor(s.runMoneyEarned);
        document.getElementById('go-money-total').innerText = Math.floor(s.totalMoneyEarned);
        
        this.game.canvas.removeEventListener('mousedown', this.game.shootHandler); 
    }

    async sendToDiscord() {
        const btn = document.getElementById('btn-discord');
        const playerNameInput = document.getElementById('player-name');
        const playerName = playerNameInput.value.trim() || "Anonymer Floppy-Verteidiger";
        
        btn.innerText = "Sende...";
        btn.disabled = true;
        
        this.game.saveData.savePersistentData(); 

        const s = this.game.stats;
        
        const temporaryUpgrades = this.game.upgrades.activeUpgrades
            .filter(u => !u.isPersistent)
            .map(u => `${u.emoji} ${u.name} (Lvl ${u.level})`)
            .join('\n') || "Keine temporären Upgrades";
            
        const permanentUpgrades = this.game.upgrades.activeUpgrades
            .filter(u => u.isPersistent)
            .map(u => `${u.emoji} ${u.name} (Lvl ${u.level})`)
            .join('\n') || "Keine permanenten Upgrades";

        const webhookURL = "https://discord.com/api/webhooks/1445472531413991580/DcsBOrTXpI8vjZFaWAM8jO9uitsn7ZzhrzsAskeWcaMypXM8U7Gjxgloe0gdhac7jV-9";

        const payload = {
            username: "Floppy Defender Highscore",
            avatar_url: "https://em-content.zobj.net/source/microsoft-teams/337/floppy-disk_1f4be.png",
            embeds: [
                {
                    title: `💾 Versuch #${s.runCount}: ${playerName}'s Daten korrumpiert!`,
                    color: 15548997, 
                    fields: [
                        { name: "Level erreicht", value: s.level.toString(), inline: true },
                        { name: "Geld (diese Runde)", value: `📀 ${Math.floor(s.runMoneyEarned)}`, inline: true },
                        { name: "Gesamt Geld", value: `📀 ${Math.floor(s.totalMoneyEarned)}`, inline: true },
                        { name: "\u200b", value: "**Temporäre Upgrades**\n" + temporaryUpgrades, inline: false }, 
                        { name: "\u200b", value: "**Permanente Upgrades (für nächste Runde)**\n" + permanentUpgrades, inline: false }
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
        }
    }
}
