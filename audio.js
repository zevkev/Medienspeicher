class SoundEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.bgm = { source: null, gain: null };
    }

    /**
     * Setzt die Hauptlautstärke des Spiels.
     * @param {number} level - Lautstärkepegel von 0 (leise) bis 1 (max).
     */
    setVolume(level) {
        // Konvertiere den UI-Wert (0-100) in einen Gain-Wert (0.0-1.0)
        const gainValue = level / 100;
        
        // Verwende setValueAtTime für eine sofortige Änderung
        this.masterGain.gain.setValueAtTime(gainValue, this.ctx.currentTime);
        
        // Speichere den Wert lokal, damit er beim nächsten Laden beibehalten wird
        localStorage.setItem('gameVolume', level);
    }

    // --- SFX ---
    playTone(freq, type, duration, vol = 0.1, slideTo = null) {
        // Spielen auch bei niedrigster Lautstärke (0) möglich, wenn der Gain-Knoten verbunden ist.
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
            setTimeout(() => this.playTone(freq, 'triangle', 0.4, 0.2), i * 100);
        });
    }

    // --- Hintergrundmusik (BGM) ---
    playBGM() {
        if (this.bgm.source) return; 

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth'; 
        osc.frequency.setValueAtTime(90, this.ctx.currentTime); 
        osc.frequency.linearRampToValueAtTime(90.5, this.ctx.currentTime + 4); 
        osc.loop = true; 

        // Die BGM wird leiser an den Master-Gain-Node gesendet, da sie im Hintergrund läuft
        gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 3); 

        osc.connect(gain);
        gain.connect(this.masterGain); // Verbindet mit dem Master-Node

        osc.start();
        
        this.bgm.source = osc;
        this.bgm.gain = gain;
    }

    stopBGM() {
        if (this.bgm.source) {
            this.bgm.gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1);
            this.bgm.source.stop(this.ctx.currentTime + 1.1);
            this.bgm.source = null;
        }
    }
}
