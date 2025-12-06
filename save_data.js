// save_data.js 

const SAVE_KEY = "FloppyDefenderSaveData";

class SaveData {
    constructor(game) {
        this.game = game;
        this.defaultPersistentData = {
            upgrades: [],
            totalMoneyEarned: 0,
            runCount: 0 
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
        // Filtere nur persistente Upgrades, um sie für den nächsten Run zu speichern
        const persistentUpgrades = this.game.upgrades.activeUpgrades
            .filter(u => u.isPersistent)
            .map(u => ({ id: u.id, level: u.level }));
            
        const dataToSave = {
            upgrades: persistentUpgrades,
            totalMoneyEarned: this.game.stats.totalMoneyEarned || 0,
            runCount: this.game.stats.runCount || 0
        };
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(dataToSave));
        } catch (e) {
            console.error("Fehler beim Speichern der Speicherdaten:", e);
        }
    }

    resetAndApplyUpgrades() {
        const loadedData = this.loadPersistentData();
        const persistentUpgrades = loadedData.upgrades;

        this.game.stats.level = 1;
        this.game.stats.xp = 0;
        this.game.stats.xpToNext = 100;
        this.game.stats.money = 0;
        this.game.stats.runMoneyEarned = 0; 
        this.game.stats.totalMoneyEarned = loadedData.totalMoneyEarned; 
        this.game.stats.runCount = loadedData.runCount + 1; // Zähle Versuche hoch
        
        this.game.player.hp = 100; 
        this.game.player.maxHp = 100;
        
        // Basestats zurücksetzen/definieren
        this.game.player.stats = { 
            baseDamage: 20, 
            damageMult: 1, 
            fireRate: 600, // Cooldown in ms
            projSpeed: 8, 
            projLife: 60, // Basislife (Frames)
            xpMult: 1, 
            moneyMult: 1, 
            // pickupRange: 100, // <--- ENTFERNT: Nicht mehr nötig, da Loot global zieht
            regen: 0, 
            splashChance: 0,
            critChance: 0, 
            critDmg: 0.5, 
            knockback: 0, 
            pierce: 0,
            lifesteal: 0 
        };

        this.game.upgrades.activeUpgrades = []; 
        
        // Permanente Upgrades anwenden
        persistentUpgrades.forEach(up => {
            for(let i = 0; i < up.level; i++) {
                this.game.upgrades.apply(up.id, true); // true = isSilent, keine HP-Heilung
            }
        });
        
        console.log(`Roguelite Reset abgeschlossen. Versuch #${this.game.stats.runCount}`);
    }
}
