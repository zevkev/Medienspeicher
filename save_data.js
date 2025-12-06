// save_data.js 

const SAVE_KEY = "FloppyDefenderSaveData";

class SaveData {
    constructor(game) {
        this.game = game;
        this.defaultPersistentData = {
            upgrades: [],
            totalMoneyEarned: 0 
        };
    }

    loadPersistentData() {
        try {
            const data = localStorage.getItem(SAVE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                return { ...this.defaultPersistentData, ...parsed };
            }
        } catch (e) {
            console.error("Fehler beim Laden der Speicherdaten:", e);
        }
        return this.defaultPersistentData;
    }

    savePersistentData() {
        const dataToSave = {
            upgrades: this.game.upgrades.activeUpgrades.map(u => ({ id: u.id, level: u.level })),
            totalMoneyEarned: this.game.stats.totalMoneyEarned || 0 
        };
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(dataToSave));
        } catch (e) {
            console.error("Fehler beim Speichern der Speicherdaten:", e);
        }
    }

    resetAndApplyUpgrades() {
        const persistentUpgrades = this.loadPersistentData().upgrades;

        this.game.stats.level = 1;
        this.game.stats.xp = 0;
        this.game.stats.xpToNext = 100;
        this.game.stats.money = 0;
        
        this.game.player.hp = 100; 
        this.game.player.maxHp = 100;
        this.game.player.stats = { 
            damageMult: 1, fireRate: 600, projSpeed: 8, 
            xpMult: 1, moneyMult: 1, pickupRange: 10000, regen: 0, splash: 0,
            pierceCount: 0 // Ersetzt projLife
        };

        this.game.upgrades.activeUpgrades = []; 
        persistentUpgrades.forEach(up => {
            for(let i = 0; i < up.level; i++) {
                this.game.upgrades.apply(up.id, true); 
            }
        });
        
        console.log("Roguelite Reset abgeschlossen. Upgrades beibehalten.");
    }
}
