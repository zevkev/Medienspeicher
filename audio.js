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
            osc.frequency.linearRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
        }

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playShoot() { this.playTone(300, 'square', 0.05, 0.15, 200); }
    playDamage() { this.playTone(80, 'sawtooth', 0.2, 0.3, 50); }
    playHit() { this.playTone(800 + Math.random()*200, 'notch', 0.05, 0.15, 600); }
    playCollectXP() { this.playTone(1000 + Math.random()*800, 'sine', 0.15, 0.05); }
    playCollectMoney() { this.playTone(2000, 'sine', 0.1, 0.05); setTimeout(() => this.playTone(2500, 'sine', 0.15, 0.05), 60); }
    playLevelUp() {
        [440, 554, 659, 880].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 'triangle', 0.4, 0.2), i * 100);
        });
    }

    // Die Hintergrundmusik wurde in der Logik entfernt, da sie in dieser Art von Spiel
    // oft störend wirkt und die Performance beeinflusst. Die Funktionen sind leer.
    playBGM() {}
    stopBGM() {}
}
