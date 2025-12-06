// upgrades.js 

const UPGRADES_DB = [
    // --- STATISTISCHE UPGRADES (In-Game, temporär) ---
    // COMMON (10 Upgrades)
    { id: 'dmg', name: 'Schaden+', emoji: '🗡️', rarity: 'common', desc: 'Erhöht Schaden um 10%', type: 'stat', stat: 'damageMult', val: 0.1, isPersistent: false },
    { id: 'fire_rate', name: 'Feuerrate', emoji: '⚡', rarity: 'common', desc: 'Schießt 8% schneller (kürzerer Cooldown)', type: 'stat', stat: 'fireRateMult', val: 0.92, isPersistent: false }, // Multipliziert den Cooldown
    { id: 'hp_max', name: 'Max Leben', emoji: '❤️', rarity: 'common', desc: '+15 Max HP', type: 'stat', stat: 'maxHp', val: 15, isPersistent: false },
    { id: 'regen', name: 'Regeneration', emoji: '🥑', rarity: 'common', desc: '+0.5 HP / Sek', type: 'stat', stat: 'regen', val: 0.5, isPersistent: false },
    { id: 'greed_run', name: 'Gier', emoji: '🤑', rarity: 'common', desc: '+15% Geld in dieser Runde', type: 'stat', stat: 'moneyMult', val: 0.15, isPersistent: false },
    { id: 'luck_run', name: 'Glück', emoji: '🍀', rarity: 'common', desc: '+15% XP in dieser Runde', type: 'stat', stat: 'xpMult', val: 0.15, isPersistent: false },
    { id: 'proj_life', name: 'Reichweite', emoji: '📏', rarity: 'common', desc: 'Projektile fliegen 10% weiter', type: 'stat', stat: 'projLifeMult', val: 0.1, isPersistent: false },
    { id: 'proj_speed', name: 'Projektil Speed', emoji: '🏹', rarity: 'common', desc: 'Schüsse fliegen 10% schneller', type: 'stat', stat: 'projSpeedMult', val: 0.1, isPersistent: false },
    { id: 'pickup_range', name: 'Magnet', emoji: '🧲', rarity: 'common', desc: '+50 Pickup-Reichweite', type: 'stat', stat: 'pickupRange', val: 50, isPersistent: false },
    { id: 'knock', name: 'Knockback', emoji: '🥊', rarity: 'common', desc: 'Wirft Gegner leicht zurück', type: 'stat', stat: 'knockback', val: 1.5, isPersistent: false },
    
    // RARE (5 Upgrades)
    { id: 'crit_run', name: 'Krit Chance', emoji: '🎯', rarity: 'rare', desc: '+3% Krit Chance', type: 'stat', stat: 'critChance', val: 0.03, isPersistent: false },
    { id: 'crit_dmg_run', name: 'Krit Schaden', emoji: '💥', rarity: 'rare', desc: '+30% Krit Schaden', type: 'stat', stat: 'critDmg', val: 0.3, isPersistent: false },
    { id: 'pierce', name: 'Durchschlag', emoji: ' Penetration', rarity: 'rare', desc: 'Projektile durchschlagen 1 Gegner mehr', type: 'stat', stat: 'pierce', val: 1, isPersistent: false },
    { id: 'splash', name: 'Explosiv-Munition', emoji: '🎇', rarity: 'rare', desc: '5% Chance auf Flächenschaden', type: 'stat', stat: 'splashChance', val: 0.05, isPersistent: false }, 
    { id: 'vamp', name: 'Vampir', emoji: '🧛', rarity: 'rare', desc: '5% Chance auf HP-Drop bei Kill (Blut-Drops sind schnell)', type: 'stat', stat: 'lifesteal', val: 0.05, isPersistent: false }, 
    
    // --- AKTIVE UPGRADES (Schießen automatisch) ---
    { 
        id: 'bomb', name: 'Bombenwerfer', emoji: '💣', rarity: 'rare', 
        desc: 'Wirft alle 5s eine Bombe (Flächenschaden).',
        type: 'active',
        interval: 5000,
        onTick: (game, level) => {
            if(game.enemies.length > 0) {
                const target = game.enemies[Math.floor(Math.random()*game.enemies.length)];
                game.createExplosion(target.x, target.y, 80 + (level*10), 30 + (level*5));
            }
        },
        upgradeEffect: (active) => { active.interval = Math.max(1500, active.interval * 0.9); },
        isPersistent: false
    },
    {
        id: 'turret', name: 'Schutz-Turm', emoji: '🛰️', rarity: 'rare',
        desc: 'Ein Turm schießt alle 4s auf einen zufälligen Gegner.',
        type: 'active',
        interval: 4000,
        onTick: (game, level) => {
             if(game.enemies.length > 0) {
                 const t = game.enemies[Math.floor(Math.random()*game.enemies.length)];
                 // Turret-Schüsse basieren auf Spieler-DMG
                 game.shootProjectile(game.player.x, game.player.y - 50, t.x, t.y, game.player.stats.baseDamage * 0.5 * level); 
             }
        },
        upgradeEffect: (active) => { active.interval = Math.max(1000, active.interval * 0.9); },
        isPersistent: false
    },

    // --- PERMANENTE UPGRADES (Lootboxen, Roguelite-Fortschritt) ---
    // EPIC
    { id: 'perm_dmg', name: 'Permanenter Schaden', emoji: '✨🗡️', rarity: 'epic', desc: 'Erhöht START-Schaden um 3%', type: 'stat', stat: 'damageMult', val: 0.03, isPersistent: true },
    { id: 'perm_fire', name: 'Permanente Feuerrate', emoji: '🔥⚡', rarity: 'epic', desc: 'START-Feuerrate um 3% schneller', type: 'stat', stat: 'fireRateMult', val: 0.97, isPersistent: true },
    { id: 'perm_hp', name: 'Permanente HP', emoji: '💖', rarity: 'epic', desc: 'Erhöht START-Max HP um 3', type: 'stat', stat: 'maxHp', val: 3, isPersistent: true },
    { id: 'perm_luck', name: 'Permanentes Glück', emoji: '🍀', rarity: 'epic', desc: 'Erhöht START-XP-Bonus um 3%', type: 'stat', stat: 'xpMult', val: 0.03, isPersistent: true },
    { id: 'perm_greed', name: 'Permanente Gier', emoji: '💰', rarity: 'epic', desc: 'Erhöht START-Geld-Bonus um 3%', type: 'stat', stat: 'moneyMult', val: 0.03, isPersistent: true },
];

class UpgradeManager {
    constructor(game) {
        this.game = game;
        this.activeUpgrades = []; // Temporäre In-Game Upgrades + permanente Upgrades
    }

    getOptions(count = 3) {
        const temporaryUpgrades = UPGRADES_DB.filter(u => !u.isPersistent); 
        
        let opts = [];
        // Stellt sicher, dass das erste Upgrade eine aktive Waffe ist, wenn es noch keine gibt.
        if (this.activeUpgrades.filter(u => u.type === 'active').length === 0) {
            const activeOnly = temporaryUpgrades.filter(u => u.type === 'active');
            if(activeOnly.length > 0) {
                 opts.push(activeOnly[Math.floor(Math.random() * activeOnly.length)]);
            }
        }

        while(opts.length < count) {
            const item = temporaryUpgrades[Math.floor(Math.random() * temporaryUpgrades.length)];
            // Vermeide Duplikate im aktuellen Auswahlfenster
            if (!opts.some(o => o.id === item.id)) {
                 opts.push(item);
            }
        }
        return opts;
    }
    
    // Gibt ein zufälliges permanentes Upgrade zurück
    getLootboxUpgrade() {
        // Fix: Die Lootbox wählt nur aus permanenten Upgrades
        const permanentUpgrades = UPGRADES_DB.filter(u => u.isPersistent);
        return permanentUpgrades[Math.floor(Math.random() * permanentUpgrades.length)];
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

        // Stat-Anpassungen
        if(dbEntry.type === 'stat') {
            if(dbEntry.stat === 'fireRateMult') {
                // Bei Feuerrate multiplizieren wir den Cooldown
                this.game.player.stats.fireRate *= dbEntry.val;
            }
            else if(dbEntry.stat === 'maxHp') {
                this.game.player.maxHp += dbEntry.val;
                if(!isSilent && !dbEntry.isPersistent) this.game.player.hp += dbEntry.val; 
            }
            else if(dbEntry.stat === 'projLifeMult') {
                 // Projektil-Lebensdauer multiplizieren
                 this.game.player.stats.projLife = Math.ceil(this.game.player.stats.projLife * (1 + dbEntry.val));
            }
            else if(dbEntry.stat === 'projSpeedMult') {
                 // Projektil-Geschwindigkeit multiplizieren
                 this.game.player.stats.projSpeed = this.game.player.stats.projSpeed * (1 + dbEntry.val);
            }
            else {
                // Additive Stats (damageMult, xpMult, moneyMult, regen, pickupRange, knockback, critChance, critDmg, pierce, splashChance, lifesteal)
                 this.game.player.stats[dbEntry.stat] = (this.game.player.stats[dbEntry.stat] || 0) + dbEntry.val;
            }
        }

        // Active-Upgrade-Effekte
        if(dbEntry.type === 'active' && active.level > 1 && dbEntry.upgradeEffect) {
             dbEntry.upgradeEffect(active);
        }

        // Speichern von permanenten Upgrades
        if(dbEntry.isPersistent && !isSilent) {
            this.game.saveData.savePersistentData();
        }
        
        if(!isSilent && !dbEntry.isPersistent) {
            this.game.ui.updateActiveUpgrades(); // UI aktualisieren
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
