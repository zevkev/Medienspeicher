class SoundEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
    }

    /**
     * Setzt die Hauptlautstärke des Spiels.
     * @param {number} level - Lautstärkepegel von 0 (leise) bis 1 (max).
     */
    setVolume(level) {
        const gainValue = level / 100;
        this.masterGain.gain.setValueAtTime(gainValue, this.ctx.currentTime);
        localStorage.setItem('gameVolume', level);
    }

    // --- SFX ---
    playTone(freq, type, duration, vol = 0.1, slideTo = null) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        const detune = (Math.random() - 0.5) * 50; 
        osc.detune.value = detune;

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slideTo) {
            osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
        }

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playShoot() { this.playTone(600 + Math.random()*200, 'triangle', 0.1, 0.08, 200); }
    playHit() { this.playTone(100, 'sawtooth', 0.2, 0.1, 50); }
    playDamage() { 
        this.playTone(80, 'square', 0.3, 0.2, 30); 
        this.playTone(150, 'sawtooth', 0.3, 0.2, 50); 
    }
    playCollectXP() { this.playTone(1000 + Math.random()*800, 'sine', 0.15, 0.05); }
    playCollectMoney() { this.playTone(2000, 'sine', 0.1, 0.05); setTimeout(() => this.playTone(2500, 'sine', 0.15, 0.05), 60); }
    playLevelUp() {
        [440, 554, 659, 880].forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 'sine', 0.15, 0.1);
            }, i * 50);
        });
    }
    
    playClick() { this.playTone(500, 'square', 0.05, 0.05, 400); }

    // Lootbox Sounds
    playLootSpin() {
        for(let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.playTone(440 + i * 100, 'square', 0.05, 0.05);
            }, i * 50);
        }
    }

    playLootStop(isWin = true) {
        if (isWin) {
            [523, 659, 784].forEach((freq, i) => {
                setTimeout(() => {
                    this.playTone(freq, 'sine', 0.4, 0.15, 0.1);
                }, i * 50);
            });
        } else {
            this.playTone(200, 'square', 0.3, 0.1);
        }
    }
    
    // SFX für Explosionen/Splash-Schaden.
    playExplosion() {
        this.playTone(50, 'sawtooth', 0.4, 0.2, 20); 
    }
}
