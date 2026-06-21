let audioContext: AudioContext | null = null;

export type NotificationSoundKind = "new" | "transferred" | "stock_low" | "stock_out";

export function unlockNotificationAudio() {
  if (typeof window === "undefined") return;

  if (!audioContext) {
    audioContext = new AudioContext();
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
}

export function playNotificationSound(kind: NotificationSoundKind = "new") {
  if (typeof window === "undefined") return;

  try {
    unlockNotificationAudio();
    const ctx = audioContext ?? new AudioContext();

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, now);

    const peak =
      kind === "new"
        ? 0.28
        : kind === "stock_out"
          ? 0.3
          : kind === "stock_low"
            ? 0.2
            : 0.22;

    gain.gain.exponentialRampToValueAtTime(peak, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    const playTone = (
      frequency: number,
      start: number,
      duration: number,
      type: OscillatorType = "sine"
    ) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, start);
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + duration);
    };

    switch (kind) {
      case "new":
        playTone(880, now, 0.14);
        playTone(1174.66, now + 0.16, 0.22);
        playTone(1318.51, now + 0.34, 0.18);
        break;
      case "stock_out":
        playTone(523.25, now, 0.12, "triangle");
        playTone(392, now + 0.14, 0.18, "triangle");
        playTone(293.66, now + 0.3, 0.24, "triangle");
        break;
      case "stock_low":
        playTone(740, now, 0.12);
        playTone(622.25, now + 0.16, 0.2);
        break;
      default:
        playTone(659.25, now, 0.16);
        playTone(880, now + 0.18, 0.24);
    }
  } catch {
    // Autoplay bloqué ou Web Audio indisponible
  }
}
