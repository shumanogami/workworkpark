import CharacterIcon from '../game/CharacterIcon'
import { colors } from '../theme'
import { columnCount, lampStates, type LampState } from './miniResultLayout'
import type { MiniGamePlayer } from './types'

type Props = {
  gameTitle: string // 今のミニゲームの名前
  roundNumber: number // 何ラウンド目の結果か
  players: MiniGamePlayer[] // 試合の参加者（番号順）
  wins: Record<string, number> // ラウンドの勝ち数（ライトの数）
  roundWinners: string[] // 今回のラウンドで勝った人（ライトが点滅する）
}

// ミニリザルト（タスク M7）：毎ラウンドの後に出す。キャラを最大2列に並べ、1人に信号のようなライトを2つ（WINS_TO_CLEAR の数）。
// 勝つたびに1つずつ点き、全部点いた人がそのミニゲームの勝者になる。見た目の細部は DESIGN.md の確定後に合わせる（D1）
export default function MiniResult({ gameTitle, roundNumber, players, wins, roundWinners }: Props) {
  const columns = columnCount(players.length)
  return (
    <main className="flex h-full flex-col items-center justify-center gap-8 p-4">
      <div className="flex flex-col items-center gap-1">
        <p className="text-xl text-neutral-400">{gameTitle}</p>
        <h1 className="text-5xl">ラウンド {roundNumber} の結果</h1>
      </div>
      {/* 2列のときは左の列を上から 1P〜4P、右の列を 5P〜8P にする（番号順に縦に読めるように） */}
      <ul className={`grid gap-x-16 gap-y-4 ${columns === 2 ? 'grid-flow-col grid-rows-4' : 'grid-cols-1'}`}>
        {players.map((p) => {
          const won = roundWinners.includes(p.playerId)
          return (
            <li key={p.playerId} className="flex items-center gap-4">
              <CharacterIcon color={p.color} size={56} />
              <span className="w-40 truncate text-2xl" style={{ color: p.color }}>
                {p.name}
              </span>
              <Lamps states={lampStates(wins[p.playerId] ?? 0, won)} />
              {/* 幅を常に取っておき、勝った人がいてもいなくても列がずれないようにする */}
              <span className="w-16 text-xl" style={{ color: colors.ui.lamp.on }}>
                {won ? 'WIN!' : ''}
              </span>
            </li>
          )
        })}
      </ul>
    </main>
  )
}

// 信号機のような横長の箱に、丸いライトを WINS_TO_CLEAR の数だけ並べる
function Lamps({ states }: { states: LampState[] }) {
  return (
    <div
      className="flex gap-2 rounded-xl border-2 px-3 py-2"
      style={{ backgroundColor: colors.ui.lamp.housing, borderColor: colors.ui.lamp.border }}
      aria-label={`${states.filter((s) => s !== 'off').length}勝`}
    >
      {states.map((s, i) => (
        <span
          key={i}
          className="block size-8 rounded-full"
          style={{
            backgroundColor: s === 'off' ? colors.ui.lamp.off : colors.ui.lamp.on,
            // 今回点いたライトは3回点滅させる（src/index.css の lamp-blink）
            animation: s === 'new' ? 'lamp-blink 1.2s steps(1, end) 1' : undefined,
          }}
        />
      ))}
    </div>
  )
}
