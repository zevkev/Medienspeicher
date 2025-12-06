// Definition der Raritäten
const RARITY = {
    COMMON: { id: 'common', color: '#ffffff', chance: 0.6 },
    RARE: { id: 'rare', color: '#00d2ff', chance: 0.3 },
    EPIC: { id: 'epic', color: '#ff00ea', chance: 0.09 },
    LEGENDARY: { id: 'legendary', color: '#ffd700', chance: 0.01 }
};

// Modulare Upgrade Definitionen
const UpgradeRegistry = [
    {
        id: 'double_xp',
        name: 'Brain Expansion',
        desc: '+20% mehr Erfahrungspunkte',
        rarity: RARITY.COMMON,
        maxStacks: 5,
        apply: (game) => { game.stats.xpMultiplier += 0.2; }
    },
    {
        id: 'money_bags',
        name: 'Kapitalismus',
        desc: '+25% mehr Geld Drops',
        rarity: RARITY.COMMON,
        maxStacks: 5,
        apply: (game) => { game.stats.moneyMultiplier += 0.25; }
    },
    {
        id: 'dmg_boost',
        name: 'Overclock',
        desc: '+20% Schaden',
        rarity: RARITY.RARE,
        maxStacks: 99,
        apply: (game) => { game.player.damage *= 1.2; }
    },
    {
        id: 'splash_dmg',
        name: 'Fragmentierung',
        desc: 'Schüsse explodieren beim Aufprall',
        rarity: RARITY.EPIC,
        maxStacks: 3,
        apply: (game) => { 
            game.player.splashRadius += 50; 
            game.player.hasSplash = true; 
        }
    },
    {
        id: 'fire_rate',
        name: 'High Speed Bus',
        desc: 'Schießt schneller',
        rarity: RARITY.RARE,
        maxStacks: 5,
        apply: (game) => { game.player.fireRate *= 0.85; } // Kleiner ist schneller
    },
    {
        id: 'regen',
        name: 'Backup System',
        desc: 'Heilt 1 HP pro Sekunde',
        rarity: RARITY.RARE,
        maxStacks: 5,
        apply: (game) => { game.player.regen += 1; }
    },
    {
        id: 'protector',
        name: 'Mini-Floppy',
        desc: 'Beschwört einen Begleiter',
        rarity: RARITY.LEGENDARY,
        maxStacks: 3,
        apply: (game) => { 
            game.addProtector(); 
        }
    }
];

class UpgradeSystem {
    constructor(gameInstance) {
        this.game = gameInstance;
    }

    getRandomUpgrades(count = 3) {
        let options = [];
        for(let i=0; i<count; i++) {
            // Einfacher Zufalls-Algorithmus (kann verbessert werden)
            const rand = Math.floor(Math.random() * UpgradeRegistry.length);
            options.push(UpgradeRegistry[rand]);
        }
        return options;
    }

    applyUpgrade(upgradeId) {
        const upg = UpgradeRegistry.find(u => u.id === upgradeId);
        if(upg) {
            upg.apply(this.game);
            console.log("Upgrade applied:", upg.name);
        }
    }
}
