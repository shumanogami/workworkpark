// ひと言の指示（「高く跳べ！」など）にふりがなを付けるための辞書と分け方
// 小さい子も遊ぶため、PC に出す指示の漢字には読みを添える。各ミニゲームの instruction は普通の文字のままにしておき、
// 読みはここでまとめて持つ（ゲームごとの登録情報を書き換えずに済むように）

// 漢字（続いた漢字のかたまり）→ 読み。新しいミニゲームの指示に漢字が増えたら、ここに足す
// 辞書にない漢字はふりがななしでそのまま出す
const READINGS: Record<string, string> = {
  高: 'たか',
  跳: 'と',
  逃: 'に',
  生: 'い',
  残: 'のこ',
  集: 'あつ',
}

// 文字のかたまり。reading があるものは、その読みをふりがなとして上に出す
export type FuriganaSegment = { text: string; reading?: string }

const KANJI_RUN = /[一-鿿々]+/g

// 文を「漢字のかたまり」と「それ以外」に分け、辞書にある漢字に読みを付ける
export function toFurigana(text: string): FuriganaSegment[] {
  const segments: FuriganaSegment[] = []
  let last = 0
  for (const m of text.matchAll(KANJI_RUN)) {
    const start = m.index
    if (start > last) segments.push({ text: text.slice(last, start) })
    const reading = READINGS[m[0]]
    segments.push(reading ? { text: m[0], reading } : { text: m[0] })
    last = start + m[0].length
  }
  if (last < text.length) segments.push({ text: text.slice(last) })
  return segments
}
