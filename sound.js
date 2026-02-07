class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterVolume = 0.3;
        this.isMuted = false;

        // BGM Modes: 'wav' (sound.wav) or 'cute' (synth)
        this.bgmMode = 'wav';
        this.isPlayingBGM = false;

        // Audio File Setup for BGM
        this.bgmAudio = new Audio('assets/sound.wav');
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = 0.4; // Initial volume

        // Synth Sequencer Variables
        this.noteTime = 0;
        this.bgmTimeout = null;

        // Distortion Curve Cache for SFX
        this.distCurve = this.makeDistortionCurve(400);
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopBGM();
        } else {
            this.playBGM();
        }
        return this.isMuted;
    }

    toggleMode() {
        // Toggle between 'wav' (Real Audio) and 'cute' (Synth)
        this.bgmMode = this.bgmMode === 'wav' ? 'cute' : 'wav';

        // Restart music if playing to switch tracks
        if (this.isPlayingBGM) {
            this.stopBGM();
            this.playBGM();
        }
        return this.bgmMode;
    }

    makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    // --- SFX ROUTER (Keep synthesized SFX) ---

    playMove() {
        this.playTone(400, 'triangle', 0.1, 0.5);
    }

    playRotate() {
        this.playTone(300, 'sine', 0.15, 0.5, 600);
    }

    playDrop() {
        if (this.bgmMode === 'wav') this.playMetalBass(100); // Heavy sound fits wav
        else this.playTone(150, 'square', 0.1, 0.4, 50);
    }

    playHardDrop() {
        if (this.bgmMode === 'wav') this.playMetalCrash();
        else this.playTone(200, 'square', 0.15, 0.6, 50);
    }

    playMeow() {
        if (this.isMuted) return;
        this.resume();

        // Regular Cute Meow
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.linearRampToValueAtTime(1200, t + 0.1);
        osc.frequency.linearRampToValueAtTime(400, t + 0.4);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(this.masterVolume, t + 0.05);
        gain.gain.linearRampToValueAtTime(0, t + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(t + 0.4);
    }

    playGameOver() {
        this.stopBGM();
        [400, 350, 300, 250].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sawtooth', 0.3, 0.5), i * 300);
        });
    }

    // --- BGM CONTROL ---

    playBGM() {
        if (this.isMuted || this.isPlayingBGM) return;
        this.isPlayingBGM = true;

        if (this.bgmMode === 'wav') {
            // Play Real Audio File
            this.bgmAudio.play().catch(e => console.log("Audio play failed (interaction needed):", e));
        } else {
            // Play Cute Synth
            this.scheduleCuteNote(0);
        }
    }

    stopBGM() {
        this.isPlayingBGM = false;

        // Stop WAV
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;

        // Stop Synth
        if (this.bgmTimeout) clearTimeout(this.bgmTimeout);
    }

    // --- SYNTH HELPERS ---

    playTone(freq, type, duration, vol = 1, slideTo = null) {
        if (this.isMuted) return;
        this.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slideTo) {
            osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
        }
        gain.gain.setValueAtTime(vol * this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playDistortedNote(freq, duration, slideTo = null) {
        if (this.isMuted) return;
        this.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const dist = this.ctx.createWaveShaper();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slideTo) {
            osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
        }

        dist.curve = this.distCurve;
        dist.oversample = '4x';

        gain.gain.setValueAtTime(0.3 * this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(dist);
        dist.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playMetalCrash() {
        if (this.isMuted) return;
        this.resume();
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5 * this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        noise.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }

    playMetalBass(freq) {
        this.playDistortedNote(freq, 0.1);
    }

    scheduleCuteNote(index) {
        if (!this.isPlayingBGM || this.bgmMode !== 'cute') return;
        const melody = [
            { f: 523.25, d: 4 }, { f: 659.25, d: 4 }, { f: 783.99, d: 4 }, { f: 659.25, d: 4 },
            { f: 880.00, d: 4 }, { f: 783.99, d: 4 }, { f: 659.25, d: 4 }, { f: 523.25, d: 4 },
            { f: 587.33, d: 4 }, { f: 659.25, d: 4 }, { f: 587.33, d: 4 }, { f: 493.88, d: 4 },
            { f: 523.25, d: 2 }, { f: 0, d: 2 },
        ];
        const note = melody[index % melody.length];
        const beatLen = 0.15;

        if (note.f > 0) this.playTone(note.f, 'sine', note.d * beatLen * 0.8, 0.15);

        this.bgmTimeout = setTimeout(() => this.scheduleCuteNote(index + 1), note.d * beatLen * 1000);
    }
}

const sounds = new SoundManager();
