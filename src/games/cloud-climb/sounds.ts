import { playNoise, playTone } from '../../audio/sfx'

// 雲のぼり専用の効果音（src/audio/sfx.ts の playTone・playNoise で作る）

// 雷・鳥の予告：「ピッ・ピッ」と2回。気づかせる音
export function playWarning() {
  playTone({ type: 'square', from: 880, duration: 0.07, volume: 0.22 })
  playTone({ type: 'square', from: 880, start: 0.12, duration: 0.07, volume: 0.22 })
}

// 雷が落ちた：「ガシャーン」
export function playThunderStrike() {
  playNoise({ from: 5000, to: 400, duration: 0.45, volume: 0.55 })
  playTone({ type: 'sawtooth', from: 220, to: 50, duration: 0.3, volume: 0.35 })
}

// 雷に打たれた：感電の「ビリッ」
export function playZap() {
  playTone({ type: 'square', from: 1400, to: 200, duration: 0.25, volume: 0.3 })
  playNoise({ from: 4000, to: 1200, duration: 0.2, volume: 0.35 })
}

// 鳥にぶつかった：「ポコッ」
export function playBirdHit() {
  playTone({ type: 'triangle', from: 500, to: 120, duration: 0.2, volume: 0.5 })
  playNoise({ from: 1800, to: 600, duration: 0.1, volume: 0.25 })
}

// 雲から落ちた：音程が下がっていく「ヒュ〜ッ」
export function playFall() {
  playTone({ type: 'sawtooth', from: 700, to: 90, duration: 0.5, volume: 0.22 })
}
