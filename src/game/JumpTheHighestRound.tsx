import { judgeWinners } from '../lib/judge'
import type { RoundProps } from '../platform/types'
import GameScreen from './GameScreen'

// Jump the highest の1ラウンド分の画面を、ミニゲームの共通の形（src/platform/types.ts）にはめ込む
// ゲームの中身（src/game/）には手を入れず、受け渡しの形だけを合わせる：
// 終了した瞬間の高さ（Heights）から勝った人の一覧を決めて返す（一番高い人。同じ高さなら全員）
export default function JumpTheHighestRound({ players, getInputs, onRoundEnd }: RoundProps) {
  return (
    <GameScreen
      players={players.map((p) => ({ playerId: p.playerId, color: p.color, name: p.name }))}
      getInputs={getInputs}
      onFinish={(heights) => onRoundEnd(judgeWinners(heights))}
    />
  )
}
