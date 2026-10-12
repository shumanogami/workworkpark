import { useEffect, useState } from 'react'
import CharacterIcon from '../game/CharacterIcon'
import { colors } from '../theme'
import { STEPS_TO_WIN } from './match'
import { STAIRS, standingSpots, stepsBefore } from './stairsLayout'
import type { MiniGamePlayer } from './types'

type Props = {
  gameTitle: string // 勝者が決まったミニゲームの名前
  players: MiniGamePlayer[] // 試合の参加者（番号順）
  steps: Record<string, number> // 上がった後の段数
  gameWinners: string[] // 今回1段上がる人（複数なら同時に上がる）
}

// 画面を開いてから勝者が跳ぶまでの時間。最初に「上がる前」を見せ、だれが上がるのかを分かるようにする
const HOP_DELAY_MS = 1000
// 跳んで次の段へ移るのにかける時間
const HOP_MS = 700

// リザルト（タスク M8）：ミニゲームの勝者が決まった後に出す。1つの階段にキャラを並べ、勝者が1段上がる
// 並べ方の計算は stairsLayout.ts。見た目のルールは DESIGN.md の「リザルト（階段）画面」
export default function ResultStairs({ gameTitle, players, steps, gameWinners }: Props) {
  const [hopped, setHopped] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setHopped(true), HOP_DELAY_MS)
    return () => clearTimeout(id)
  }, [])

  const ids = players.map((p) => p.playerId)
  const before = standingSpots(ids, stepsBefore(steps, gameWinners))
  const spots = hopped ? standingSpots(ids, steps) : before
  const winnerNames = players.filter((p) => gameWinners.includes(p.playerId)).map((p) => p.name)

  return (
    // 画面いっぱいに 16:9 の舞台を置き、中の位置は舞台に対する % で決める（画面の大きさが変わっても形が崩れない）
    <main className="flex h-full items-center justify-center" style={{ containerType: 'size' }}>
      <div
        className="relative overflow-hidden"
        style={{ width: 'min(100cqw, calc(100cqh * 16 / 9))', aspectRatio: '16 / 9', containerType: 'inline-size' }}
      >
        <div className="absolute inset-x-0 top-[4%] text-center">
          <p className="text-neutral-400" style={{ fontSize: '1.6cqw' }}>
            {gameTitle}
          </p>
          {/* 勝者がいないのは開発用ページを開いた直後だけ（試合では必ずだれかが勝ってからこの画面になる） */}
          {winnerNames.length > 0 && (
            <h1 style={{ fontSize: '3.6cqw', color: colors.ui.text }}>{winnerNames.join('・')} が1段上がった！</h1>
          )}
        </div>

        {/* 階段のブロック。左から 地面（0段）・1段目・…・一番上 */}
        {Array.from({ length: STEPS_TO_WIN + 1 }, (_, step) => (
          <div
            key={step}
            className="absolute bottom-0"
            style={{
              left: `${STAIRS.left + STAIRS.columnWidth * step}%`,
              width: `${STAIRS.columnWidth}%`,
              height: `${STAIRS.baseHeight + STAIRS.stepHeight * step}%`,
              backgroundColor: colors.dirt.main,
              borderTop: `0.8cqw solid ${colors.grass.main}`,
            }}
          />
        ))}
        <p
          className="absolute text-center"
          style={{
            left: `${STAIRS.left + STAIRS.columnWidth * STEPS_TO_WIN}%`,
            width: `${STAIRS.columnWidth}%`,
            bottom: `${STAIRS.baseHeight + STAIRS.stepHeight * STEPS_TO_WIN + 22}%`,
            fontSize: '1.8cqw',
            color: colors.ui.goal,
          }}
        >
          ★ 総合優勝 ★
        </p>

        {players.map((p) => {
          const spot = spots[p.playerId]
          const hopping = hopped && gameWinners.includes(p.playerId)
          // 跳ぶ前の位置との差（舞台の幅 1% = 1cqw 単位。縦は高さの % を幅に直すため 9/16 を掛ける）
          const dx = before[p.playerId].left - spot.left
          const dy = ((spot.bottom - before[p.playerId].bottom) * 9) / 16
          return (
            <div
              key={p.playerId}
              className="absolute"
              style={{
                left: `${spot.left}%`,
                bottom: `${spot.bottom}%`,
                width: `${STAIRS.characterSize}%`,
                // 横は一定の速さで進み、縦は別の入れ物（下の div）で山なりに動かす。ひとつの動きにすると「にゅるっ」と滑って見える
                animation: hopping ? `stairs-hop-x ${HOP_MS}ms linear 1` : undefined,
                ['--dx' as string]: `${dx}cqw`,
                ['--dy' as string]: `${dy}cqw`,
              }}
            >
              {/* 名前は頭上。5人以上で並ぶときは1人おきに1行上へずらす（stairsLayout.ts の nameRaised） */}
              <p
                className="absolute left-1/2 -translate-x-1/2 font-bold whitespace-nowrap"
                style={{
                  // 上の段は1行分（文字の大きさ 1.2cqw ＋ 行間）だけ上げる。離しすぎると、だれの名前か分かりにくい
                  bottom: spot.nameRaised ? 'calc(110% + 1.5cqw)' : '110%',
                  fontSize: '1.2cqw',
                  color: p.color,
                }}
              >
                {p.name}
              </p>
              {/* flex にするのは、canvas の下にできる文字のすき間で足もとが浮かないようにするため */}
              <div className="flex" style={{ animation: hopping ? `stairs-hop-y ${HOP_MS}ms linear 1` : undefined }}>
                <CharacterIcon color={p.color} size="100%" />
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
