import { describe, expect, it } from 'vitest'
import {
  afterMiniResult,
  afterResult,
  createMatch,
  finishRound,
  type MatchState,
  pickNextGame,
  type Random,
  STEPS_TO_WIN,
  WINS_TO_CLEAR,
} from './match'

const GAMES = ['g1', 'g2', 'g3']
const PLAYERS = ['a', 'b', 'c']
// いつも「残っている候補の先頭」を選ぶ乱数（結果を毎回同じにするため）
const first: Random = () => 0

// 同じ人がラウンドに勝ち続けて、ミニリザルトの後まで進める
function winRounds(state: MatchState, winners: string[], times: number): MatchState {
  let s = state
  for (let i = 0; i < times; i++) s = afterMiniResult(finishRound(s, winners))
  return s
}

describe('pickNextGame（次のミニゲームを選ぶ）', () => {
  it('まだ遊んでいないものから選び、遊んだ一覧に足す', () => {
    expect(pickNextGame(GAMES, ['g1'], first)).toEqual({ gameId: 'g2', played: ['g1', 'g2'] })
  })

  it('全部遊ぶまで同じミニゲームを選ばない', () => {
    let played: string[] = []
    const picked: string[] = []
    for (let i = 0; i < GAMES.length; i++) {
      const r = pickNextGame(GAMES, played, Math.random)
      picked.push(r.gameId)
      played = r.played
    }
    expect([...picked].sort()).toEqual(GAMES)
  })

  it('全部遊び終えたら、一巡をやり直して全部の中から選ぶ（Q5）', () => {
    expect(pickNextGame(GAMES, ['g1', 'g2', 'g3'], () => 0.99)).toEqual({ gameId: 'g3', played: ['g3'] })
  })

  it('ミニゲームが1本だけなら、毎回それを選ぶ', () => {
    expect(pickNextGame(['only'], ['only'], first).gameId).toBe('only')
  })
})

describe('ラウンドとミニリザルト（2勝でミニゲームの勝者）', () => {
  it('始めはラウンド。全員0勝・0段', () => {
    const s = createMatch(PLAYERS, GAMES, first)
    expect(s.stage).toBe('round')
    expect(s.gameId).toBe('g1')
    expect(s.wins).toEqual({ a: 0, b: 0, c: 0 })
    expect(s.steps).toEqual({ a: 0, b: 0, c: 0 })
  })

  it('ラウンドが終わると、勝った人のライトが1つ点いてミニリザルトへ', () => {
    const s = finishRound(createMatch(PLAYERS, GAMES, first), ['b'])
    expect(s.stage).toBe('miniResult')
    expect(s.wins).toEqual({ a: 0, b: 1, c: 0 })
    expect(s.roundWinners).toEqual(['b'])
  })

  it('引き分けなら勝った全員に点く。全員引き分けなら全員に点く（Q1）', () => {
    const s = createMatch(PLAYERS, GAMES, first)
    expect(finishRound(s, ['a', 'c']).wins).toEqual({ a: 1, b: 0, c: 1 })
    expect(finishRound(s, ['a', 'b', 'c']).wins).toEqual({ a: 1, b: 1, c: 1 })
  })

  it('参加者でない id は無視する', () => {
    expect(finishRound(createMatch(PLAYERS, GAMES, first), ['zzz']).wins).toEqual({ a: 0, b: 0, c: 0 })
  })

  it('まだだれも2勝していなければ、同じミニゲームの次のラウンドへ', () => {
    const s = winRounds(createMatch(PLAYERS, GAMES, first), ['a'], WINS_TO_CLEAR - 1)
    expect(s.stage).toBe('round')
    expect(s.gameId).toBe('g1')
    expect(s.roundNumber).toBe(WINS_TO_CLEAR)
  })

  it('2勝したらその人がミニゲームの勝者。1段上がってリザルトへ', () => {
    const s = winRounds(createMatch(PLAYERS, GAMES, first), ['a'], WINS_TO_CLEAR)
    expect(s.stage).toBe('result')
    expect(s.gameWinners).toEqual(['a'])
    expect(s.steps).toEqual({ a: 1, b: 0, c: 0 })
  })

  it('2人が同時に2勝したら、2人ともミニゲームの勝者で、2人とも1段上がる（Q2）', () => {
    const s = winRounds(createMatch(PLAYERS, GAMES, first), ['a', 'b'], WINS_TO_CLEAR)
    expect(s.gameWinners).toEqual(['a', 'b'])
    expect(s.steps).toEqual({ a: 1, b: 1, c: 0 })
  })
})

describe('リザルト（階段2段で総合優勝）', () => {
  it('まだだれも一番上でなければ、次のミニゲーム（まだ遊んでいないもの）の1ラウンド目へ。勝ち数は0に戻る', () => {
    let s = winRounds(createMatch(PLAYERS, GAMES, first), ['a'], WINS_TO_CLEAR)
    s = afterResult(s, GAMES, first)
    expect(s.stage).toBe('round')
    expect(s.gameId).toBe('g2')
    expect(s.roundNumber).toBe(1)
    expect(s.wins).toEqual({ a: 0, b: 0, c: 0 })
    expect(s.steps).toEqual({ a: 1, b: 0, c: 0 }) // 段は残る
  })

  it('一番上（2段）に着いたら総合優勝', () => {
    let s = createMatch(PLAYERS, GAMES, first)
    for (let i = 0; i < STEPS_TO_WIN; i++) {
      s = winRounds(s, ['c'], WINS_TO_CLEAR)
      s = afterResult(s, GAMES, first)
    }
    expect(s.stage).toBe('champion')
    expect(s.champions).toEqual(['c'])
  })

  it('2人が同時に一番上に着いたら、2人とも総合優勝（Q3）', () => {
    let s = createMatch(PLAYERS, GAMES, first)
    for (let i = 0; i < STEPS_TO_WIN; i++) {
      s = winRounds(s, ['a', 'b'], WINS_TO_CLEAR)
      s = afterResult(s, GAMES, first)
    }
    expect(s.champions).toEqual(['a', 'b'])
  })

  it('違うミニゲームで別々の人が勝っても、段は人ごとに数える', () => {
    let s = createMatch(PLAYERS, GAMES, first)
    s = afterResult(winRounds(s, ['a'], WINS_TO_CLEAR), GAMES, first)
    s = afterResult(winRounds(s, ['b'], WINS_TO_CLEAR), GAMES, first)
    expect(s.stage).toBe('round')
    expect(s.steps).toEqual({ a: 1, b: 1, c: 0 })
    s = winRounds(s, ['a'], WINS_TO_CLEAR)
    expect(afterResult(s, GAMES, first).champions).toEqual(['a'])
  })
})

describe('順番を守らない呼び出しは無視する', () => {
  it('ミニリザルト中に finishRound を呼んでも変わらない', () => {
    const s = finishRound(createMatch(PLAYERS, GAMES, first), ['a'])
    expect(finishRound(s, ['b'])).toBe(s)
  })

  it('ラウンド中に afterMiniResult・afterResult を呼んでも変わらない', () => {
    const s = createMatch(PLAYERS, GAMES, first)
    expect(afterMiniResult(s)).toBe(s)
    expect(afterResult(s, GAMES, first)).toBe(s)
  })
})
