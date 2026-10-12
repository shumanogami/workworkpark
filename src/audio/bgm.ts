import { getAudio, midiToFrequency, onAudioReady } from './audio'
import { GAME_SCORE, notesAtStep, STEP_SECONDS, type Score } from './score'

// BGM の再生。setTimeout で毎回音を鳴らすと時間がずれるため、
// 少し先（LOOKAHEAD 秒）までの音を、音の側の正確な時計（AudioContext.currentTime）で予約していく

const LOOKAHEAD = 0.15
const TICK_MS = 25
const BGM_VOLUME = 0.2

let timer: ReturnType<typeof setInterval> | null = null
let bus: GainNode | null = null
let cancelPending: (() => void) | null = null

// BGM を流す（楽譜を省くとゲーム中の曲）。まだ利用者の操作がなく鳴らせないときは、最初の操作のときに流し始める
export function startBgm(score: Score = GAME_SCORE) {
  stopBgm()
  const audio = getAudio()
  if (!audio) {
    cancelPending = onAudioReady(() => {
      cancelPending?.()
      cancelPending = null
      startBgm(score)
    })
    return
  }
  const { ctx, out } = audio

  // BGM 全体の音量。止めるときはこれを切り離せば、予約済みの音もまとめて消える
  const gain = ctx.createGain()
  gain.gain.value = BGM_VOLUME
  gain.connect(out)
  bus = gain

  const startTime = ctx.currentTime + 0.05
  let step = 0
  const schedule = () => {
    while (startTime + step * STEP_SECONDS < ctx.currentTime + LOOKAHEAD) {
      for (const n of notesAtStep(step, startTime, score)) {
        const osc = ctx.createOscillator()
        const env = ctx.createGain()
        osc.type = n.part === 'melody' ? 'square' : 'triangle'
        osc.frequency.value = midiToFrequency(n.note)
        const peak = n.part === 'melody' ? 0.5 : 1
        env.gain.setValueAtTime(peak, n.time)
        env.gain.exponentialRampToValueAtTime(0.001, n.time + n.duration)
        osc.connect(env).connect(gain)
        osc.start(n.time)
        osc.stop(n.time + n.duration)
      }
      step++
    }
  }
  schedule()
  timer = setInterval(schedule, TICK_MS)
}

export function stopBgm() {
  cancelPending?.()
  cancelPending = null
  if (timer) clearInterval(timer)
  timer = null
  if (bus) {
    // すぐ切ると「プツッ」と鳴るので、ごく短くフェードアウトしてから切り離す
    const audio = getAudio()
    const b = bus
    if (audio) {
      b.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.03)
      setTimeout(() => b.disconnect(), 200)
    } else {
      b.disconnect()
    }
  }
  bus = null
}
