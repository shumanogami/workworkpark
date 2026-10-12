import RoundShell, { type RoundGame } from '../../platform/RoundShell'
import type { MiniGamePlayer, RoundProps } from '../../platform/types'
import { render, type PlayerLook } from './render'
import { playCoin, playPoison } from './sounds'
import { createFallingState, type FallingState, step } from './step'

// 落下物避けの1ラウンド分の画面。流れ（カウントダウン・FINISH・音・全画面）は共通の枠 RoundShell が受け持つ
// ここでは「状態の作り方・1コマの進め方・絵・決着・鳴らす音」だけを決める
const GAME: RoundGame<FallingState> = {
  // 物の降り方はラウンドごとに変える
  create: (players) =>
    createFallingState(
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
    // 弾かれた瞬間（弾かれて操作できない時間が始まった）
    if (next.runners.some((r, i) => r.stunTime > 0 && prev.runners[i].stunTime === 0)) events.push('bounce')
    // コインを取った・毒キノコに当たった瞬間
    if (next.pickups.some((p) => p.kind === 'coin')) events.push('coin')
    if (next.pickups.some((p) => p.kind === 'poison')) events.push('poison')
    return events
  },
  sfx: { coin: playCoin, poison: playPoison },
}

function looksOf(players: MiniGamePlayer[]): Record<string, PlayerLook> {
  return Object.fromEntries(players.map((p) => [p.playerId, { color: p.color, name: p.name }]))
}

export default function FallingItemsRound(props: RoundProps) {
  return <RoundShell game={GAME} {...props} />
}
