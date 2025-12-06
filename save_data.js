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
            upgrades: this.game.upgrades.activeUpgrades.map(u => ({ id: u.id, level: u.level })).filter(u => u.level > 0),
            totalMoneyEarned: this.game.stats.totalMoneyEarned || 0 
        };
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(dataToSave));
        } catch (e) {
            console.error("Fehler beim Speichern der Speicherdaten:", e);
        }
    }

    /**
     * Setzt die Spielstatistiken zurück und wendet alle gespeicherten Upgrades an.
     * Dies muss nach jeder Upgrade-Wahl oder beim Spielstart erfolgen.
     */
    resetAndApplyUpgrades() {
        const persistentUpgrades = this.loadPersistentData().upgrades;
        const pStats = this.game.player.stats;

        // Reset Game Stats
        this.game.stats.level = 1;
        this.game.stats.xp = 0;
        this.game.stats.xpToNext = 100;
        this.game.stats.money = 0;
        
        // Reset Player Stats
        this.game.player.hp = 100; 
        this.game.player.maxHp = 100;
        this.game.player.speed = 4; // Basis Speed
        
        // Reset Player Stats Multiplikatoren/Additive
        pStats.damageMult = 1; 
        pStats.fireRateMult = 1; // Muss 1 sein für die Multiplikation
        pStats.projSpeed = 8; // Basis Projectile Speed
        pStats.xpMult = 1; 
        pStats.moneyMult = 1; 
        pStats.pickupRange = 10000; 
        pStats.regen = 0; 
        pStats.splash = 0; // Nicht verwendet
        pStats.pierceCount = 0; 
        pStats.critChance = 0;
        pStats.critDamage = 0;
        pStats.projRadius = 5; // Basis Projectile Radius
        
        // Reset Active Upgrades
        this.game.upgrades.activeUpgrades = [];
        
        // Upgrades anwenden
        persistentUpgrades.forEach(savedUpgrade => {
            const dbEntry = this.game.upgrades.UPGRADES_DB.find(u => u.id === savedUpgrade.id);
            if (!dbEntry) return;

            // Führen Sie die Logik für jedes Level aus
            for(let i = 0; i < savedUpgrade.level; i++) {
                // Wir verwenden die apply-Methode, setzen aber isSilent auf true, 
                // um Rekursion und Speichern zu vermeiden
                this.game.upgrades.apply(savedUpgrade.id, true); 
            }
        });
    }
}
