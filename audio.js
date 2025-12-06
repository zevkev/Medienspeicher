class SoundEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.muted = false;
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.bgm = { source: null, gain: null };
    }

    toggleMute() {
        this.muted = !this.muted;
        this.masterGain.gain.value = this.muted ? 0 : 1;
        // Musik stoppen/starten, falls sie läuft
        if (this.bgm.source) {
            this.bgm.gain.gain.setValueAtTime(this.muted ? 0 : 0.05, this.ctx.currentTime);
        }
        return this.muted;
    }

    // Hilfsfunktion: Oszillator mit Envelope
    playTone(freq, type, duration, vol = 0.1, slideTo = null) {
        if (this.muted) return;
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

    // --- SFX ---
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
        if (this.bgm.source) return; // Läuft schon

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth'; 
        osc.frequency.setValueAtTime(90, this.ctx.currentTime); // Tiefe Frequenz
        osc.frequency.linearRampToValueAtTime(90.5, this.ctx.currentTime + 4); // Leichter Puls
        osc.loop = true; // Wichtig: Endlosschleife

        gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 3); // Fade-in

        osc.connect(gain);
        gain.connect(this.masterGain);

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
