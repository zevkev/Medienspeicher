class SoundEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.muted = false;
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
    }

    toggleMute() {
        this.muted = !this.muted;
        this.masterGain.gain.value = this.muted ? 0 : 1;
        return this.muted;
    }

    playTone(freq, type, duration, vol = 0.1, slideTo = null) {
        if (this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        // Random Pitch Variation (macht es weniger repetitiv)
        const detune = (Math.random() - 0.5) * 50; // +/- 50 cents
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
}
