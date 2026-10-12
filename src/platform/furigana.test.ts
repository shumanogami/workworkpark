import { describe, expect, it } from 'vitest'
import { MINI_GAMES } from './registry'
import { toFurigana } from './furigana'

describe('toFurigana', () => {
  it('漢字に読みを付け、それ以外はそのまま分ける', () => {
    expect(toFurigana('高く跳べ！')).toEqual([
      { text: '高', reading: 'たか' },
      { text: 'く' },
      { text: '跳', reading: 'と' },
      { text: 'べ！' },
    ])
  })

  it('漢字がなければ1かたまりのまま', () => {
    expect(toFurigana('おしだせ！')).toEqual([{ text: 'おしだせ！' }])
  })

  it('辞書にない漢字は読みなしで出す', () => {
    expect(toFurigana('避けろ！')).toEqual([{ text: '避' }, { text: 'けろ！' }])
  })

  it('つなげると元の文に戻る', () => {
    expect(toFurigana('マグマから逃げろ！').map((s) => s.text).join('')).toBe('マグマから逃げろ！')
  })

  // 新しいミニゲームを登録したときに、辞書への読みの足し忘れに気づけるようにする
  it('登録済みのミニゲームの指示の漢字には、すべて読みがある', () => {
    for (const game of MINI_GAMES) {
      const missing = toFurigana(game.instruction).filter((s) => /[一-鿿]/.test(s.text) && !s.reading)
      expect(missing, `${game.title}「${game.instruction}」`).toEqual([])
    }
  })
})
