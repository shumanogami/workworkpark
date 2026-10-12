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

// 1曲分の楽譜（メロディとベースは同じ長さ）
export type Score = { melody: (number | null)[]; bass: (number | null)[] }

// ゲーム中の BGM
export const GAME_SCORE: Score = { melody: MELODY, bass: BASS }

// 総合優勝の画面の BGM。ゲーム中と同じテンポで、明るい C → F → G → C の分散和音をくり返す（お祝いの気分を出すため）
export const VICTORY_SCORE: Score = {
  melody: [
    // C
    72, 76, 79, 76, 84, 79, 76, 79,
    // F
    77, 81, 84, 81, 89, 84, 81, 84,
    // G
    79, 83, 86, 83, 91, 86, 83, 86,
    // C
    88, 84, 79, 84, 88, null, 84, null,
  ],
  bass: [
    48, null, 60, null, 48, null, 60, null,
    41, null, 53, null, 41, null, 53, null,
    43, null, 55, null, 43, null, 55, null,
    48, null, 55, null, 48, null, null, null,
  ],
}

// エントリー（ホーム）画面の BGM。みんなが集まるのを待つ、ゆったりした F → G → Em → Am の分散和音。ゲーム中より落ち着いた曲にして、始まったときに盛り上がるようにする
export const LOBBY_SCORE: Score = {
  melody: [
    // F
    81, null, 84, null, 89, null, 84, null,
    // G
    79, null, 83, null, 86, null, 83, null,
    // Em
    76, null, 79, null, 83, null, 79, null,
    // Am
    81, null, 84, null, 88, null, 84, 81,
  ],
  bass: [
    41, null, null, null, 48, null, null, null,
    43, null, null, null, 50, null, null, null,
    40, null, null, null, 47, null, null, null,
    45, null, null, null, 52, null, null, null,
  ],
}

export type ScheduledNote = { part: 'melody' | 'bass'; note: number; time: number; duration: number }

// 曲の頭からの step 番目（8分音符単位、くり返しを含む）の音を、鳴らす時刻つきで返す
export function notesAtStep(step: number, startTime: number, score: Score = GAME_SCORE): ScheduledNote[] {
  const i = step % score.melody.length
  const time = startTime + step * STEP_SECONDS
  const notes: ScheduledNote[] = []
  const m = score.melody[i]
  if (m !== null) notes.push({ part: 'melody', note: m, time, duration: STEP_SECONDS * 0.9 })
  const b = score.bass[i]
  if (b !== null) notes.push({ part: 'bass', note: b, time, duration: STEP_SECONDS * 1.9 })
  return notes
}
