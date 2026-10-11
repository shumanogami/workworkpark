import { describe, expect, it } from 'vitest'
import { midiToFrequency } from './audio'
import { BASS, LOOP_STEPS, MELODY, notesAtStep, STEP_SECONDS } from './score'

describe('midiToFrequency', () => {
  it('ラ（69）は 440Hz、1オクターブ上は2倍', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440)
    expect(midiToFrequency(81)).toBeCloseTo(880)
  })
})

describe('楽譜', () => {
  it('メロディとベースの長さがそろっている（くり返しでずれない）', () => {
    expect(MELODY).toHaveLength(BASS.length)
    expect(LOOP_STEPS % 8).toBe(0) // 小節（8分音符8つ）の区切りで終わる
  })
})

describe('notesAtStep', () => {
  it('step 番目の音を、曲の頭から step × 8分音符 の時刻で返す', () => {
    const notes = notesAtStep(3, 10)
    expect(notes.every((n) => n.time === 10 + 3 * STEP_SECONDS)).toBe(true)
  })

  it('最後まで行くと曲の頭に戻ってくり返す', () => {
    const first = notesAtStep(0, 0).map((n) => n.note)
    const looped = notesAtStep(LOOP_STEPS, 0).map((n) => n.note)
    expect(looped).toEqual(first)
  })

  it('休み（null）の位置では、そのパートの音を返さない', () => {
    const restIndex = BASS.findIndex((n) => n === null)
    expect(notesAtStep(restIndex, 0).some((n) => n.part === 'bass')).toBe(false)
  })
})
