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

    // Hilfsfunktion: Oszillator mit Envelope
    playTone(freq, type, duration, vol = 0.1, slideTo = null) {
        if (this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

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

    playShoot() {
        // High pitch chirp
        this.playTone(800, 'triangle', 0.1, 0.1, 300);
    }

    playHit() {
        // Noise-like low tone
        this.playTone(150, 'square', 0.1, 0.05, 50);
    }

    playCollectXP() {
        // Sparkling high sine
        this.playTone(1200 + Math.random()*500, 'sine', 0.2, 0.05);
    }

    playCollectMoney() {
        // Coin sound
        this.playTone(2000, 'sine', 0.1, 0.05);
        setTimeout(() => this.playTone(2500, 'sine', 0.2, 0.05), 50);
    }

    playLevelUp() {
        // Power up chord
        this.playTone(440, 'triangle', 0.5, 0.2);
        setTimeout(() => this.playTone(554, 'triangle', 0.5, 0.2), 100);
        setTimeout(() => this.playTone(659, 'triangle', 1.0, 0.2), 200);
    }

    playLootboxSpin() {
        this.playTone(600, 'square', 0.05, 0.05);
    }
}
