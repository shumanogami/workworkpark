// BGM の楽譜と、鳴らす音の割り出し。音は鳴らさない純粋な関数（テストしやすくするため）

// テンポ（1分間の拍数）。8分音符1つの長さは 60 / BPM / 2 秒
export const BPM = 150
export const STEP_SECONDS = 60 / BPM / 2

// 楽譜は8分音符ごとの MIDI ノート番号（null は休み）。4小節（C → G → Am → F）をくり返す
export const MELODY: (number | null)[] = [
  // C
  76, 79, 84, 79, 76, 79, 84, 88,
  // G
  86, 83, 79, 83, 86, 83, 79, 74,
  // Am
  84, 81, 76, 81, 84, 88, 84, 81,
  // F
  81, 77, 72, 77, 81, 84, 83, 79,
]

// ベースは4分音符（8分音符2つ分）ごと
export const BASS: (number | null)[] = [
  48, null, 55, null, 48, null, 55, null,
  43, null, 50, null, 43, null, 50, null,
  45, null, 52, null, 45, null, 52, null,
  41, null, 48, null, 41, null, 48, null,
]

export const LOOP_STEPS = MELODY.length

export type ScheduledNote = { part: 'melody' | 'bass'; note: number; time: number; duration: number }

// 曲の頭からの step 番目（8分音符単位、くり返しを含む）の音を、鳴らす時刻つきで返す
export function notesAtStep(step: number, startTime: number): ScheduledNote[] {
  const i = step % LOOP_STEPS
  const time = startTime + step * STEP_SECONDS
  const notes: ScheduledNote[] = []
  const m = MELODY[i]
  if (m !== null) notes.push({ part: 'melody', note: m, time, duration: STEP_SECONDS * 0.9 })
  const b = BASS[i]
  if (b !== null) notes.push({ part: 'bass', note: b, time, duration: STEP_SECONDS * 1.9 })
  return notes
}
