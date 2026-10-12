import RoundShell, { type RoundGame } from '../../platform/RoundShell'
import type { MiniGamePlayer, RoundProps } from '../../platform/types'
import { render, type PlayerLook } from './render'
import { playCoin, playPoison } from './sounds'
import { type CoinState, createCoinState, step } from './step'

// コイン集めの1ラウンド分の画面。流れ（カウントダウン・FINISH・音・全画面）は共通の枠 RoundShell が受け持つ
// ここでは「状態の作り方・1コマの進め方・絵・決着・鳴らす音」だけを決める
const GAME: RoundGame<CoinState> = {
  // コインと足場の並びはラウンドごとに変える
  create: (players) =>
    createCoinState(
      players.map((p) => p.playerId),
      Math.floor(Math.random() * 2 ** 31),
    ),
  step: (state, inputs, dt) => step(state, inputs, dt),
  render: (ctx, state, players, frozen) => render(ctx, state, looksOf(players), frozen),
  isFinished: (state) => state.finished,
  winners: (state) => state.winners,
  events: (prev, next) => {
    const events: string[] = []
    // ジャンプした瞬間
    if (next.runners.some((r, i) => r.vy < 0 && prev.runners[i].vy >= 0 && prev.runners[i].standingOn !== null)) events.push('jump')
    // 弾かれた瞬間
    if (next.runners.some((r, i) => r.stunTime > 0 && prev.runners[i].stunTime === 0)) events.push('bounce')
    // コインを取った瞬間
    if (next.pops.some((p) => p.age === 0 && !p.poison)) events.push('coin')
    // 毒キノコに触れた瞬間
    if (next.pops.some((p) => p.age === 0 && p.poison)) events.push('poison')
    return events
  },
  sfx: { coin: playCoin, poison: playPoison },
}

function looksOf(players: MiniGamePlayer[]): Record<string, PlayerLook> {
  return Object.fromEntries(players.map((p) => [p.playerId, { color: p.color, name: p.name }]))
}

export default function CoinCollectRound(props: RoundProps) {
  return <RoundShell game={GAME} {...props} />
}
