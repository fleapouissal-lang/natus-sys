let audioContext: AudioContext | null = null;

export function unlockNotificationAudio() {
  if (typeof window === "undefined") return;

  if (!audioContext) {
    audioContext = new AudioContext();
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
}

export function playNotificationSound() {
  if (typeof window === "undefined") return;

  try {
    unlockNotificationAudio();
    const ctx = audioContext ?? new AudioContext();

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    const playTone = (frequency: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, start);
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + duration);
    };

    playTone(880, now, 0.12);
    playTone(1174.66, now + 0.14, 0.2);
  } catch {
    // Autoplay bloqué ou Web Audio indisponible
  }
}
