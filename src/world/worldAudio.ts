type Surface = "road" | "grass";

function nearestRoadDistance(value: number): number {
  return Math.min(...[-16, 0, 16].map((road) => Math.abs(value - road)));
}

export function surfaceAt(x: number, z: number): Surface {
  return nearestRoadDistance(x) < 3.5 || nearestRoadDistance(z) < 3.5
    ? "road"
    : "grass";
}

export class WorldAudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wind: GainNode | null = null;
  private birdTimer = 0;
  private enabled = false;
  private toggleSeq = 0;

  get isEnabled(): boolean {
    return this.enabled;
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    // Sequence guard: if a newer toggle happens while we await resume(), this
    // (now-stale) call must not re-raise the gain after the user turned it off.
    const seq = ++this.toggleSeq;
    if (!enabled) {
      if (this.master) this.master.gain.setTargetAtTime(0, this.ctx?.currentTime ?? 0, 0.05);
      // Let the fade finish, then suspend the context so a muted World stops
      // rendering the wind loop and burning CPU/battery.
      window.setTimeout(() => {
        if (!this.enabled && seq === this.toggleSeq) void this.ctx?.suspend();
      }, 200);
      return;
    }
    this.ensureGraph();
    await this.ctx?.resume();
    if (seq !== this.toggleSeq) return; // superseded by a later toggle
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(0.55, this.ctx.currentTime, 0.08);
    }
    this.scheduleBird();
  }

  private ensureGraph(): void {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);

    const duration = 2;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    this.wind = this.ctx.createGain();
    this.wind.gain.value = 0.035;
    source.connect(filter).connect(this.wind).connect(this.master);
    source.start();
  }

  updatePosition(x: number, z: number, daylight: number): void {
    if (!this.enabled || !this.ctx || !this.wind) return;
    const breeze = 0.025 + Math.min(0.035, Math.hypot(x, z) / 900);
    const nightQuiet = 0.45 + daylight * 0.55;
    this.wind.gain.setTargetAtTime(breeze * nightQuiet, this.ctx.currentTime, 0.4);
  }

  step(surface: Surface): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = surface === "road" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(surface === "road" ? 105 : 72, now);
    osc.frequency.exponentialRampToValueAtTime(surface === "road" ? 58 : 42, now + 0.075);
    filter.type = "lowpass";
    filter.frequency.value = surface === "road" ? 520 : 280;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.075, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);
    osc.connect(filter).connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  private scheduleBird(): void {
    if (!this.enabled) return;
    window.clearTimeout(this.birdTimer);
    this.birdTimer = window.setTimeout(() => {
      this.chirp();
      this.scheduleBird();
    }, 2800 + Math.random() * 5200);
  }

  private chirp(): void {
    if (!this.ctx || !this.master || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1300 + Math.random() * 450, now);
    osc.frequency.linearRampToValueAtTime(2100 + Math.random() * 500, now + 0.12);
    osc.frequency.linearRampToValueAtTime(1550, now + 0.24);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.27);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  celebration(): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((frequency, index) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      const start = now + index * 0.09;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.connect(gain).connect(this.master!);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  dispose(): void {
    window.clearTimeout(this.birdTimer);
    this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.wind = null;
  }
}
