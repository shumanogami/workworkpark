import { playNoise, playTone } from '../../audio/sfx'

// 落下物避けの効果音（部品の playTone・playNoise で作る）

// コインを取ったとき：高い「ピン」（2音で上がる）
export function playCoin() {
  playTone({ type: 'square', from: 988, duration: 0.07, volume: 0.25 })
  playTone({ type: 'square', from: 1319, start: 0.07, duration: 0.14, volume: 0.25 })
}

// 毒キノコに当たったとき：低く落ちる「ブッ」
export function playPoison() {
  playTone({ type: 'sawtooth', from: 220, to: 70, duration: 0.3, volume: 0.35 })
  playNoise({ from: 600, to: 150, duration: 0.2, volume: 0.2 })
}
