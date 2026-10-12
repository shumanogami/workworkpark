import RoundShell, { type RoundGame } from '../../platform/RoundShell'
import type { MiniGamePlayer, RoundProps } from '../../platform/types'
import { render, type PlayerLook } from './render'
import { createCloudState, type CloudState, step } from './step'
import { playBirdHit, playFall, playThunderStrike, playWarning, playZap } from './sounds'
import { thunderPhase } from '../../engine/objects'

// 雲のぼりの1ラウンド分の画面。流れ（カウントダウン・FINISH・音・全画面）は共通の枠 RoundShell が受け持つ
const GAME: RoundGame<CloudState> = {
  create: (players) =>
    createCloudState(
      players.map((p) => p.playerId),
      Math.floor(Math.random() * 2 ** 31),
    ),
  step: (state, inputs, dt) => step(state, inputs, dt),
  render: (ctx, state, players, frozen) => render(ctx, state, looksOf(players), frozen),
  isFinished: (state) => state.finished,
  winners: (state) => state.winners,
  events: (prev, next) => {
    const events: string[] = []
    if (next.climbers.some((r, i) => r.vy < 0 && prev.climbers[i].vy >= 0 && prev.climbers[i].standingOn !== null)) events.push('jump')
    if (next.climbers.some((r, i) => r.stunTime > 0 && prev.climbers[i].stunTime === 0)) events.push('bounce')
    // 雷・鳥の予告が始まった瞬間
    if (next.hazards.thunders.length + next.hazards.birds.length > prev.hazards.thunders.length + prev.hazards.birds.length) events.push('warn')
    // 雷が落ちた瞬間
    const now = next.scroll.elapsed
    if (next.hazards.thunders.some((t) => thunderPhase(t.startedAt, now) === 'strike' && thunderPhase(t.startedAt, prev.scroll.elapsed) === 'warning')) events.push('strike')
    // 脱落した瞬間（原因ごとに別の音）
    for (const e of next.survival.eliminated.slice(prev.survival.eliminated.length)) events.push(e.cause)
    return events
  },
  sfx: { warn: playWarning, strike: playThunderStrike, thunder: playZap, bird: playBirdHit, fall: playFall },
}

function looksOf(players: MiniGamePlayer[]): Record<string, PlayerLook> {
  return Object.fromEntries(players.map((p) => [p.playerId, { color: p.color, name: p.name }]))
}

export default function CloudClimbRound(props: RoundProps) {
  return <RoundShell game={GAME} {...props} />
}
