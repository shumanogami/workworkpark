// 音の土台。効果音・BGM は素材ファイルを使わず、ブラウザの Web Audio API で作る（素材の利用規約の心配がないため）
//
// ブラウザは、利用者が一度クリック・タップ・キー入力をするまで音を鳴らせない。
// installAudioUnlock() で最初の操作をきっかけに音を有効にする

const MUTE_KEY = 'workworkpark:muted'
const MASTER_VOLUME = 0.3

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = readMuted()
const listeners = new Set<(muted: boolean) => void>()
const readyListeners = new Set<() => void>()

// 保存したミュート設定を読む。プライベートブラウズなどで読めないときは「ミュートしない」扱い
function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

// 音を鳴らす土台を返す。まだ利用者の操作がなく鳴らせない場合は null（その音は鳴らさない）
export function getAudio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof AudioContext === 'undefined') return null
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : MASTER_VOLUME
    master.connect(ctx.destination)
  }
  if (ctx.state !== 'running') return null
  return { ctx, out: master! }
}

// 最初のクリック・タップ・キー入力で音を有効にする。M キーでミュートを切り替える
export function installAudioUnlock() {
  const unlock = () => {
    const wasRunning = ctx?.state === 'running'
    getAudio()
    if (wasRunning || !ctx) return
    void ctx.resume().then(() => {
      for (const listener of readyListeners) listener()
    })
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', (e) => {
    unlock()
    if (e.code === 'KeyM' && !e.repeat) setMuted(!muted)
  })
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(next: boolean) {
  muted = next
  try {
    localStorage.setItem(MUTE_KEY, next ? '1' : '0')
  } catch {
    // 保存できなくても、この画面の間はミュートが効く
  }
  if (master && ctx) master.gain.setTargetAtTime(next ? 0 : MASTER_VOLUME, ctx.currentTime, 0.02)
  for (const listener of listeners) listener(next)
}

// ミュートの切り替えを画面に知らせる（ボタンの表示を変えるため）。返り値で登録を解除する
export function onMutedChange(listener: (muted: boolean) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// 音が鳴らせるようになったら（最初の操作の後）呼ぶ。返り値で登録を解除する
export function onAudioReady(listener: () => void): () => void {
  readyListeners.add(listener)
  return () => readyListeners.delete(listener)
}

// 音程（MIDI のノート番号。60 が真ん中のド）を周波数（Hz）に変える
export function midiToFrequency(note: number): number {
  return 440 * 2 ** ((note - 69) / 12)
}
