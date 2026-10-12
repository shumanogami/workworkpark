import { playMagmaDeath } from '../../audio/sfx'
import RoundShell, { type RoundGame } from '../../platform/RoundShell'
import type { MiniGamePlayer, RoundProps } from '../../platform/types'
import { type PlayerLook, render } from './render'
import { createPushOutState, type PushOutState, step } from './step'

// おしくらまんじゅうの1ラウンド分の画面。流れ（カウントダウン・FINISH・音・全画面）は共通の枠 RoundShell が受け持つ
const GAME: RoundGame<PushOutState> = {
  create: (players) => createPushOutState(players.map((p) => p.playerId)),
  step: (state, inputs, dt) => step(state, inputs, dt),
  render: (ctx, state, players, frozen) => render(ctx, state, looksOf(players), frozen),
  isFinished: (state) => state.finished,
  winners: (state) => state.winners,
  events: (prev, next) => {
    const events: string[] = []
    if (next.runners.some((r, i) => r.vy < 0 && prev.runners[i].vy >= 0 && prev.runners[i].standingOn !== null)) events.push('jump')
    if (next.runners.some((r, i) => r.stunTime > 0 && prev.runners[i].stunTime === 0)) events.push('bounce')
    if (next.survival.eliminated.length > prev.survival.eliminated.length) events.push('magma')
    return events
  },
  sfx: { magma: playMagmaDeath },
}

function looksOf(players: MiniGamePlayer[]): Record<string, PlayerLook> {
  return Object.fromEntries(players.map((p) => [p.playerId, { color: p.color, name: p.name }]))
}

export default function PushOutRound(props: RoundProps) {
  return <RoundShell game={GAME} {...props} />
}
