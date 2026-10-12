import { getAudio, midiToFrequency } from './audio'

// 効果音。どれもピコゲーム風の短い電子音で、鳴らせない状態（利用者の操作前）なら何もしない

type Tone = {
  type: OscillatorType
  from: number // 鳴り始めの周波数（Hz）
  to?: number // 鳴り終わりの周波数（Hz）。指定すると音程がなめらかに変わる
  start?: number // 呼び出しから鳴り始めるまで（秒）
  duration: number // 長さ（秒）
  volume?: number
}

// ゲームごとの効果音をそのゲームのフォルダで作れるよう、部品の playTone（音程のある音）と playNoise（ザーッという音）は公開している
export function playTone({ type, from, to, start = 0, duration, volume = 0.5 }: Tone) {
  const audio = getAudio()
  if (!audio) return
  const { ctx, out } = audio
  const t0 = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, t0)
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(to, t0 + duration)
  // 音量を少しずつ下げて終わらせる（急に切ると「プツッ」と雑音が出るため）
  gain.gain.setValueAtTime(volume, t0)
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
  osc.connect(gain).connect(out)
  osc.start(t0)
  osc.stop(t0 + duration)
}

type Noise = {
  from: number // 鳴り始めの中心の周波数（Hz）
  to: number // 鳴り終わりの中心の周波数（Hz）。ザーッという音の「高さ」がなめらかに変わる
  start?: number
  duration: number
  volume?: number
}

// ザーッというノイズ（雑音）を、指定の高さの帯だけ通して鳴らす。「ジュッ」「シュワッ」のような音に使う
export function playNoise({ from, to, start = 0, duration, volume = 0.4 }: Noise) {
  const audio = getAudio()
  if (!audio) return
  const { ctx, out } = audio
  const t0 = ctx.currentTime + start
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 1.2
  filter.frequency.setValueAtTime(from, t0)
  filter.frequency.exponentialRampToValueAtTime(to, t0 + duration)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(volume, t0)
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
  src.connect(filter).connect(gain).connect(out)
  src.start(t0)
  src.stop(t0 + duration)
}

// ジャンプ：音程が上がる「ニュッ」
export function playJump() {
  playTone({ type: 'square', from: 280, to: 760, duration: 0.12, volume: 0.25 })
}

// 決定ボタン：2音の「ピロッ」
export function playDecide() {
  playTone({ type: 'square', from: midiToFrequency(88), duration: 0.07, volume: 0.3 })
  playTone({ type: 'square', from: midiToFrequency(95), start: 0.07, duration: 0.12, volume: 0.3 })
}

// カウントダウンの「3・2・1」：短い「ピッ」
export function playCountdownTick() {
  playTone({ type: 'square', from: midiToFrequency(81), duration: 0.15, volume: 0.35 })
}

// カウントダウンの「スタート」：1オクターブ高く長い「ポーン」
export function playCountdownGo() {
  playTone({ type: 'square', from: midiToFrequency(93), duration: 0.5, volume: 0.35 })
}

// 弾かれたとき：音程が下がる「ボンッ」
export function playBounce() {
  playTone({ type: 'triangle', from: 300, to: 90, duration: 0.15, volume: 0.5 })
}

// マグマに飲まれたとき：落ちていく「ヒュ〜ッ」＋溶ける「ジュワッ」＋最後の「ボコッ」
export function playMagmaDeath() {
  playTone({ type: 'sawtooth', from: 520, to: 60, duration: 0.5, volume: 0.22 })
  playNoise({ from: 3200, to: 700, start: 0.04, duration: 0.55, volume: 0.5 })
  playTone({ type: 'triangle', from: 140, to: 50, start: 0.3, duration: 0.25, volume: 0.45 })
}

// 試合終了：下がっていく3音
export function playFinish() {
  ;[84, 79, 72].forEach((note, i) =>
    playTone({ type: 'square', from: midiToFrequency(note), start: i * 0.12, duration: 0.2, volume: 0.3 }),
  )
}
