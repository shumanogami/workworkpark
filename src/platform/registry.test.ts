import { describe, expect, it } from 'vitest'
import { findMiniGame, MINI_GAMES } from './registry'

// 登録の一覧が、試合の流れで使える状態になっているかを確かめる（ミニゲームを足したときの書き間違いを見つける）
describe('ミニゲームの登録', () => {
  it('1本以上登録されている', () => {
    expect(MINI_GAMES.length).toBeGreaterThan(0)
  })

  it('id が重ならず、英小文字・数字・ハイフンだけでできている', () => {
    const ids = MINI_GAMES.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('名前とひと言の指示が空でない', () => {
    for (const g of MINI_GAMES) {
      expect(g.title.trim()).not.toBe('')
      expect(g.instruction.trim()).not.toBe('')
    }
  })

  it('Jump the highest が登録されていて、id で探せる', () => {
    expect(findMiniGame('jump-the-highest')?.instruction).toBe('高く跳べ！')
    expect(findMiniGame('no-such-game')).toBeUndefined()
  })
})
