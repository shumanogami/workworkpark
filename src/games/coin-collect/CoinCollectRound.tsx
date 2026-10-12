import RoundShell, { type RoundGame, ROUND_HEIGHT, ROUND_WIDTH } from '../../platform/RoundShell'
import type { RoundProps } from '../../platform/types'
import { colors, fonts } from '../../theme'

// コイン集めの1ラウンド分の画面。いまは仮（3秒で終わり、1人目が勝つ）。本物のゲームに置き換える
// 流れ（カウントダウン・FINISH・音・全画面）は共通の枠 RoundShell が受け持つ。見本は src/games/magma-rush/MagmaRushRound.tsx
type State = { t: number; ids: string[] }

const GAME: RoundGame<State> = {
  create: (players) => ({ t: 0, ids: players.map((p) => p.playerId) }),
  step: (state, _inputs, dt) => ({ ...state, t: state.t + dt }),
  render: (ctx) => {
    ctx.fillStyle = colors.sky.main
    ctx.fillRect(0, 0, ROUND_WIDTH, ROUND_HEIGHT)
    ctx.fillStyle = colors.ink.main
    ctx.font = `24px ${fonts.dot}`
    ctx.textAlign = 'center'
    ctx.fillText('コイン集め（作成中）', ROUND_WIDTH / 2, ROUND_HEIGHT / 2)
  },
  isFinished: (state) => state.t >= 3,
  winners: (state) => state.ids.slice(0, 1),
}

export default function CoinCollectRound(props: RoundProps) {
  return <RoundShell game={GAME} {...props} />
}
