import { midiToFrequency } from '../../audio/audio'
import { playTone } from '../../audio/sfx'

// コイン集めの効果音（このゲーム専用。部品の playTone で作る）

// コインを取った音：高い2音が続く「チャリン」
export function playCoin() {
  playTone({ type: 'square', from: midiToFrequency(83), duration: 0.07, volume: 0.22 })
  playTone({ type: 'square', from: midiToFrequency(88), start: 0.07, duration: 0.2, volume: 0.22 })
}
