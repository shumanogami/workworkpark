import { describe, expect, it } from 'vitest'
import type { PhaseMessage } from '../shared/messages'
import { controllerView } from './controllerView'

const players = [
  { playerId: 'a', number: 1, color: '#ff5555' },
  { playerId: 'b', number: 2, color: '#55aaff' },
]
const base = { players, gameTitle: 'Jump the highest', instruction: '高く跳べ！' }

describe('controllerView（スマホに何を出すか）', () => {
  it('ホームはボタンだけ、ラウンド中はボタンとひと言の指示', () => {
    expect(controllerView({ ...base, phase: 'lobby' }, 'a')).toEqual({ kind: 'buttons' })
    expect(controllerView({ ...base, phase: 'playing' }, 'a')).toEqual({ kind: 'buttons' })
  })

  it('ミニリザルト：勝った人は「勝った！」、勝ち数の段にいる', () => {
    const msg: PhaseMessage = { ...base, phase: 'miniResult', winnerIds: ['a'], wins: { a: 1, b: 0 } }
    expect(controllerView(msg, 'a')).toMatchObject({
      headline: '勝った！',
      highlight: true,
      stairs: { levels: 2, current: 1 },
      note: 'あと1勝でこのゲームの勝者',
    })
    expect(controllerView(msg, 'b')).toMatchObject({ headline: '次のラウンドへ', highlight: false, stairs: { current: 0 } })
  })

  it('ミニリザルト：2勝したら「このゲームの勝者！」', () => {
    const msg: PhaseMessage = { ...base, phase: 'miniResult', winnerIds: ['a'], wins: { a: 2 } }
    expect(controllerView(msg, 'a')).toMatchObject({ stairs: { current: 2 }, note: 'このゲームの勝者！' })
  })

  it('リザルト：上がった人は「1段上がった！」、上がれなかった人には勝者の番号を出す', () => {
    const msg: PhaseMessage = { ...base, phase: 'result', winnerIds: ['a'], steps: { a: 1, b: 0 } }
    expect(controllerView(msg, 'a')).toMatchObject({
      sub: 'Jump the highest の勝者',
      headline: '1段上がった！',
      stairs: { levels: 2, current: 1 },
      note: 'あと1段で優勝',
    })
    expect(controllerView(msg, 'b')).toMatchObject({
      sub: 'Jump the highest の勝者は 1P',
      headline: '次のゲームへ',
      note: 'あと2段で優勝',
    })
  })

  it('総合優勝：優勝した人は「優勝！」、ほかの人には優勝した人の番号', () => {
    const msg: PhaseMessage = { ...base, phase: 'champion', winnerIds: ['a', 'b'] }
    expect(controllerView(msg, 'a')).toMatchObject({ headline: '優勝！', highlight: true })
    const other = controllerView({ ...msg, winnerIds: ['b'] }, 'a')
    expect(other).toMatchObject({ headline: '試合終了', note: '優勝は 2P。PCの画面を見てね' })
  })
})
