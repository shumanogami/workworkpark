import { playMagmaDeath } from '../../audio/sfx'
import RoundShell, { type RoundGame } from '../../platform/RoundShell'
import type { MiniGamePlayer, RoundProps } from '../../platform/types'
import { render, type PlayerLook } from './render'
import { createMagmaState, type MagmaState, step } from './step'

// マグマラッシュの1ラウンド分の画面。流れ（カウントダウン・FINISH・音・全画面）は共通の枠 RoundShell が受け持つ
// ここでは「状態の作り方・1コマの進め方・絵・決着・鳴らす音」だけを決める
const GAME: RoundGame<MagmaState> = {
  // 足場の並びはラウンドごとに変える
  create: (players) =>
    createMagmaState(
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
    // マグマに飲まれた瞬間
    if (next.survival.eliminated.length > prev.survival.eliminated.length) events.push('magma')
    return events
  },
  sfx: { magma: playMagmaDeath },
}

function looksOf(players: MiniGamePlayer[]): Record<string, PlayerLook> {
  return Object.fromEntries(players.map((p) => [p.playerId, { color: p.color, name: p.name }]))
}

export default function MagmaRushRound(props: RoundProps) {
  return <RoundShell game={GAME} {...props} />
}
