// upgrades.js 

const UPGRADES_DB = [
    // --- COMMON (Level Upgrades skalieren linear) ---
    { id: 'dmg', name: 'Schaden+', emoji: '🗡️', rarity: 'common', desc: 'Erhöht Schaden um 15%', type: 'stat', stat: 'damageMult', val: 0.15, isMultiplier: true },
    { id: 'att_spd', name: 'Feuerrate', emoji: '⚡', rarity: 'common', desc: 'Schießt 10% schneller', type: 'stat', stat: 'fireRateMult', val: 0.9, isMultiplier: true },
    { id: 'proj_spd', name: 'Projektil Speed', emoji: '🏹', rarity: 'common', desc: 'Schüsse fliegen schneller', type: 'stat', stat: 'projSpeed', val: 1.5, isAdditive: true }, // +1.5 pro Level
    { id: 'hp_max', name: 'Max Leben', emoji: '❤️', rarity: 'common', desc: '+20 Max HP', type: 'stat', stat: 'maxHp', val: 20, isAdditive: true }, // +20 pro Level
    { id: 'regen', name: 'Regeneration', emoji: '🥑', rarity: 'common', desc: '+1 HP / Sek', type: 'stat', stat: 'regen', val: 1, isAdditive: true }, // +1 pro Level
    { id: 'greed', name: 'Gier', emoji: '🤑', rarity: 'common', desc: '+20% Geld', type: 'stat', stat: 'moneyMult', val: 0.2, isMultiplier: true },
    { id: 'pierce', name: 'Durchschlag', emoji: '🔗', rarity: 'common', desc: 'Schüsse treffen 1 weiteren Gegner', type: 'stat', stat: 'pierceCount', val: 1, isAdditive: true }, // +1 pro Level

    // --- RARE (Level Upgrades skalieren besser) ---
    { id: 'crit', name: 'Krit Chance', emoji: '🎯', rarity: 'rare', desc: '+10% Krit Chance', type: 'stat', stat: 'critChance', val: 0.1, isAdditive: true },
    { id: 'crit_dmg', name: 'Krit Schaden', emoji: '✨', rarity: 'rare', desc: '+50% Krit Schaden', type: 'stat', stat: 'critDamage', val: 0.5, isAdditive: true },
    { id: 'proj_size', name: 'Projektil Größe', emoji: '⭕', rarity: 'rare', desc: '+2 Radius', type: 'stat', stat: 'projRadius', val: 2, isAdditive: true },
    
    // --- EPIC (Aktiv-Upgrade skaliert gut) ---
    { id: 'aoe_dmg', name: 'Aura des Schutzes', emoji: '🔥', rarity: 'epic', desc: 'Verursacht Schaden an nahen Gegnern (1s Intervall)', type: 'active', stat: 'splash', val: 5, interval: 1000, range: 100 }, 
    
    // --- LEGENDARY (Unique Effekte) ---
    { id: 'xp_boost', name: 'XP-Master', emoji: '💡', rarity: 'legendary', desc: '+50% XP-Gewinn', type: 'stat', stat: 'xpMult', val: 0.5, isMultiplier: true },
    { id: 'magnet', name: 'Magnetfeld', emoji: '🧲', rarity: 'legendary', desc: '+100% Loot-Radius', type: 'stat', stat: 'pickupRange', val: 2, isMultiplier: true },
];

class UpgradeManager {
    constructor(game) {
        this.game = game;
        this.activeUpgrades = [];
        this.UPGRADES_DB = UPGRADES_DB;
    }

    getOptions(count) {
        const available = this.UPGRADES_DB;
        const selected = [];
        const unique = new Set();

        while (selected.length < count) {
            let totalWeight = 0;
            available.forEach(u => {
                const existing = this.activeUpgrades.find(a => a.id === u.id);
                // Multipliziere Gewicht mit 1 / (Level + 1), um häufige Upgrades weniger wahrscheinlich zu machen
                let weight = this.getRarityWeight(u.rarity) * (1 / (existing ? existing.level + 1 : 1));
                u.weight = Math.max(0.1, weight);
                totalWeight += u.weight;
            });

            let rand = Math.random() * totalWeight;
            let cumWeight = 0;

            for (let u of available) {
                cumWeight += u.weight;
                if (rand < cumWeight) {
                    if (!unique.has(u.id)) {
                        selected.push(u);
                        unique.add(u.id);
                        break;
                    }
                }
            }
        }
        return selected;
    }

    getRarityWeight(rarity) {
        switch (rarity) {
            case 'common': return 10;
            case 'rare': return 5;
            case 'epic': return 2;
            case 'legendary': return 1;
            default: return 0;
        }
    }

    levelUp() {
        this.game.pauseGame(true);
        this.game.showUpgradeMenu();
    }

    apply(id, isSilent = false) {
        const dbEntry = this.UPGRADES_DB.find(u => u.id === id);
        if (!dbEntry) {
            console.warn(`Upgrade-ID ${id} existiert nicht mehr in UPGRADES_DB und wird ignoriert.`);
            return;
        }

        let active = this.activeUpgrades.find(u => u.id === id);

        if(!active) {
            active = { ...dbEntry, level: 1, lastTrigger: 0 };
            this.activeUpgrades.push(active);
        } else {
            active.level++;
        }
        
        const currentLevel = active.level;
        const pStats = this.game.player.stats;
        
        // Stats beim Level-Up neu berechnen, um Skalierung anzuwenden
        if(dbEntry.type === 'stat') {
            const baseVal = dbEntry.val;
            
            // Finde den aktuellen Wert im Player-Stat-Objekt
            let statVal = pStats[dbEntry.stat] || 0;

            if (dbEntry.stat === 'fireRateMult') {
                // FireRate ist ein Multiplikator (0.9 = 10% schneller)
                // Da es ein Multiplikator ist, wird es nur im resetAndApplyUpgrades angewendet.
                // Hier wird der Wert im aktiven Upgrade gespeichert, damit er dort korrekt angewendet werden kann.
                // Nur zur Verfolgung der Stärke:
                active.currentValue = Math.pow(baseVal, currentLevel); 
            }
            else if (dbEntry.isAdditive) {
                // Additive Werte werden direkt auf den Player angewendet (HP, Speed, Pierce)
                if(dbEntry.stat === 'maxHp') {
                    // HP muss direkt auf den Player angewendet werden
                    this.game.player.maxHp += baseVal;
                    if(!isSilent) this.game.player.hp += baseVal; 
                } else if (dbEntry.stat === 'speed') {
                    this.game.player.speed += baseVal;
                } else {
                    pStats[dbEntry.stat] = (pStats[dbEntry.stat] || 0) + baseVal;
                }
            } else if (dbEntry.isMultiplier) {
                // Multiplikatoren (Damage, XP, Money) werden als reiner Wert gespeichert 
                // und im resetAndApplyUpgrades korrekt verrechnet
                pStats[dbEntry.stat] = (pStats[dbEntry.stat] || 1) + baseVal;
            }
        }
        
        if(dbEntry.type === 'active') {
             // Aktiv-Upgrades werden mit Level schneller ausgelöst
             active.interval = Math.max(500, dbEntry.interval * Math.pow(0.9, currentLevel - 1)); 
        }

        // Nach jeder Anwendung alle Upgrades neu anwenden, um Multiplikatoren und Additive zu korrigieren
        this.game.saveData.resetAndApplyUpgrades();

        if(!isSilent) {
            this.game.saveData.savePersistentData();
            this.game.ui.updateHUD();
        }
    }

    update(deltaTime) {
        if(this.game.paused || this.game.gameOver) return;
        
        const now = Date.now();
        this.activeUpgrades.forEach(u => {
            if(u.type === 'active' && u.interval && now - u.lastTrigger > u.interval) {
                u.lastTrigger = now;
                this.triggerActiveUpgrade(u);
            }
        });
    }

    triggerActiveUpgrade(upgrade) {
        if(upgrade.id === 'aoe_dmg') {
            const p = this.game.player;
            const range = upgrade.range;
            
            this.game.enemies.forEach(en => {
                const dist = Math.hypot(p.x - en.x, p.y - en.y);
                if(dist < range + en.radius) {
                    // Schaden skaliert mit Upgrade-Level
                    const damage = upgrade.val * upgrade.level; 
                    en.currentHp -= damage; 
                    this.game.particles.push(
                        ...this.game.createExplosionParticles(en.x, en.y, 'rgba(255, 0, 0, 0.5)', 5)
                    );
                    
                    if (en.currentHp <= 0) {
                         this.game.stats.xp += 10;
                         this.game.stats.money += 1 * this.game.player.stats.moneyMult;
                         this.game.audio.playCollectXP();
                         this.game.enemies.splice(this.game.enemies.indexOf(en), 1);
                    }
                }
            });
        }
    }
}
