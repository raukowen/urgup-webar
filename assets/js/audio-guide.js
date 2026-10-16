/**
 * Ürgüp Meydanı WebAR - Çok Dilli Sesli Rehber & Ambiyans Motoru
 * Turistler heykelleri incelerken Türkçe ve İngilizce sesli anlatım
 * ve Kapadokya atmosferik mahzen/meydan fısıltı sesleri çalar.
 */

class AudioGuideEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.currentUtterance = null;
    this.isPlaying = false;
    this.lang = 'tr-TR';
    this.audioCtx = null;
  }

  setLanguage(lang) {
    this.lang = lang === 'en' ? 'en-US' : 'tr-TR';
    if (this.isPlaying) {
      this.stop();
    }
  }

  // Eserin sesli rehber metnini oku
  speak(statue) {
    if (!this.synth) return;

    this.stop();

    const isEN = this.lang.startsWith('en');
    const textToSpeak = isEN
      ? `${statue.nameEN || statue.name}. Created by ${statue.artist}. ${statue.descriptionEN || statue.description}`
      : `${statue.name}. Sanatçı: ${statue.artist}. ${statue.description}`;

    this.currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
    this.currentUtterance.lang = this.lang;
    this.currentUtterance.rate = 0.95;
    this.currentUtterance.pitch = 1.0;

    // Uygun ses tonunu seç
    const voices = this.synth.getVoices();
    const voice = voices.find(v => v.lang.startsWith(this.lang.slice(0, 2)));
    if (voice) {
      this.currentUtterance.voice = voice;
    }

    this.currentUtterance.onstart = () => {
      this.isPlaying = true;
      this.onStateChange && this.onStateChange(true);
    };

    this.currentUtterance.onend = () => {
      this.isPlaying = false;
      this.onStateChange && this.onStateChange(false);
    };

    this.currentUtterance.onerror = () => {
      this.isPlaying = false;
      this.onStateChange && this.onStateChange(false);
    };

    this.synth.speak(this.currentUtterance);
    this.playChime();
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isPlaying = false;
      this.onStateChange && this.onStateChange(false);
    }
  }

  // Başlangıç Gong/Çan Sesi (Web Audio API ile sıfır harici dosya)
  playChime() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!this.audioCtx) this.audioCtx = new AudioContext();

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(528, this.audioCtx.currentTime); // 528 Hz sevgi ve şifa frekansı
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 1.2);
    } catch (e) {
      // sessiz hata
    }
  }
}

window.AudioGuideEngine = AudioGuideEngine;
