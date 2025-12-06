// upgrades.js

const UPGRADES_DB = [
    // --- COMMON (14) ---
    { id: 'dmg', name: 'Schaden+', emoji: '🗡️', rarity: 'common', desc: 'Erhöht Schaden um 15%', type: 'stat', stat: 'damageMult', val: 0.15 },
    { id: 'att_spd', name: 'Feuerrate', emoji: '⚡', rarity: 'common', desc: 'Schießt 10% schneller', type: 'stat', stat: 'fireRateMult', val: 0.9 },
    { id: 'proj_spd', name: 'Projektil Speed', emoji: '🏹', rarity: 'common', desc: 'Schüsse fliegen schneller', type: 'stat', stat: 'projSpeed', val: 1.2 },
    { id: 'hp_max', name: 'Max Leben', emoji: '❤️', rarity: 'common', desc: '+20 Max HP', type: 'stat', stat: 'maxHp', val: 20 },
    { id: 'regen', name: 'Regeneration', emoji: '🥑', rarity: 'common', desc: '+1 HP / Sek', type: 'stat', stat: 'regen', val: 1 },
    { id: 'move_spd', name: 'Bewegung', emoji: '👟', rarity: 'common', desc: 'Spieler ist schneller (N/A)', type: 'dummy', desc: 'Du fühlst dich leichter' }, 
    { id: 'greed', name: 'Gier', emoji: '🤑', rarity: 'common', desc: '+20% Geld', type: 'stat', stat: 'moneyMult', val: 0.2 },
    { id: 'crit', name: 'Krit Chance', emoji: '🎯', rarity: 'common', desc: '+5% Krit Chance', type: 'stat', stat: 'critChance', val: 0.05 },
    { id: 'crit_dmg', name: 'Krit Schaden', emoji: '💥', rarity: 'common', desc: '+50% Krit Schaden', type: 'stat', stat: 'critDmg', val: 0.5 },
    { id: 'luck', name: 'Glück', emoji: '🍀', rarity: 'common', desc: 'Mehr XP', type: 'stat', stat: 'xpMult', val: 0.2 },
    { id: 'size', name: 'Große Kaliber', emoji: '🎾', rarity: 'common', desc: 'Größere Projektile', type: 'stat', stat: 'projSize', val: 5 },
    { id: 'thorn', name: 'Dornen', emoji: '🌵', rarity: 'common', desc: 'Gegner nehmen Schaden bei Berührung', type: 'stat', stat: 'thorns', val: 5 },
    { id: 'knock', name: 'Knockback', emoji: '🥊', rarity: 'common', desc: 'Wirft Gegner zurück', type: 'stat', stat: 'knockback', val: 2 },
    { id: 'life', name: 'Projektildauer', emoji: '⏳', rarity: 'common', desc: 'Schüsse fliegen weiter', type: 'stat', stat: 'projLife', val: 20 },

    // --- RARE / ACTIVE (5) ---
    { 
        id: 'bomb', name: 'Bombenwerfer', emoji: '💣', rarity: 'rare', 
        desc: 'Wirft alle 5s eine Bombe (Flächenschaden).',
        type: 'active',
        interval: 5000,
        onTick: (game, level) => {
            if(game.enemies.length > 0) {
                const target = game.enemies[Math.floor(Math.random()*game.enemies.length)];
                game.createExplosion(target.x, target.y, 100 + (level*20), 50 + (level*10));
            }
        },
        upgradeDesc: (lvl) => `Cooldown -0.5s, Schaden +`
    },
    {
        id: 'protector', name: 'Bodyguard', emoji: '🛡️', rarity: 'rare',
        desc: 'Ein kleiner Bot der mitschießt.',
        type: 'active',
        interval: 4000,
        onTick: (game, level) => {
             if(game.enemies.length > 0) {
                 const t = game.enemies[0];
                 game.shootProjectile(game.player.x + 40, game.player.y - 40, t.x, t.y, 15 * level);
             }
        }
    },
    { id: 'splash', name: 'Explosiv-Munition', emoji: '🎇', rarity: 'rare', desc: 'Deine Schüsse explodieren', type: 'stat', stat: 'splash', val: 1 },
    { id: 'multi', name: 'Multishot', emoji: '🔱', rarity: 'rare', desc: 'Schießt 1 Projektil mehr', type: 'stat', stat: 'amount', val: 1 },
    { id: 'vamp', name: 'Vampir', emoji: '🧛', rarity: 'rare', desc: 'Chance auf Heilung bei Kill', type: 'stat', stat: 'lifesteal', val: 0.1 }
];

class UpgradeManager {
    constructor(game) {
        this.game = game;
        this.activeUpgrades = []; 
    }

    getOptions(count = 3) {
        let opts = [];
        for(let i=0; i<count; i++) {
            const item = UPGRADES_DB[Math.floor(Math.random() * UPGRADES_DB.length)];
            opts.push(item);
        }
        return opts;
    }

    apply(id, isSilent = false) {
        const dbEntry = UPGRADES_DB.find(u => u.id === id);
        let active = this.activeUpgrades.find(u => u.id === id);

        if(!active) {
            active = { ...dbEntry, level: 1, lastTrigger: 0 };
            this.activeUpgrades.push(active);
        } else {
            active.level++;
        }

        if(dbEntry.type === 'stat') {
            if(dbEntry.stat === 'fireRateMult') this.game.player.stats.fireRate *= dbEntry.val;
            else if(dbEntry.stat === 'maxHp') {
                this.game.player.maxHp += dbEntry.val;
                if(!isSilent) this.game.player.hp += dbEntry.val; 
            }
            else {
                 this.game.player.stats[dbEntry.stat] = (this.game.player.stats[dbEntry.stat] || 0) + dbEntry.val;
            }
        }

        if(dbEntry.type === 'active') {
             active.interval = Math.max(500, active.interval * 0.9); 
        }

        if(!isSilent) {
            this.game.saveData.savePersistentData();
        }
    }

    update(time) {
        this.activeUpgrades.forEach(u => {
            if(u.type === 'active') {
                if(time - u.lastTrigger > u.interval) {
                    u.onTick(this.game, u.level);
                    u.lastTrigger = time;
                }
            }
        });
    }
}
