import { useEffect, useState, type CSSProperties } from 'react'
import { startBgm, stopBgm } from '../audio/bgm'
import { VICTORY_SCORE } from '../audio/score'
import { playDrumroll, playFanfare } from '../audio/sfx'
import CharacterIcon from '../game/CharacterIcon'
import { colors, playerColors } from '../theme'
import type { MiniGamePlayer } from './types'

type Props = {
  players: MiniGamePlayer[] // 試合の参加者（番号順）
  champions: string[] // 総合優勝した人（複数なら引き分け）
  onHome: () => void
}

// 「優勝は…」とためる時間（ドラムロール）。すぐ出すより、みんなが画面に注目してから発表した方が盛り上がるため
const DRUMROLL_MS = 1800
// 発表してから「ホームへ戻る」を出すまでの時間。すぐ押されてお祝いが終わらないように少し待つ
const BUTTON_DELAY_MS = 3000
// ファンファーレ（約2秒）が鳴り終わってから、お祝いの BGM を流し始める
const BGM_DELAY_MS = 2200

// 地面と表彰台の高さ（舞台に対する %）
const GROUND_HEIGHT = 12
const PODIUM_HEIGHT = 18
const CONFETTI_COUNT = 70

// 輪郭付きの文字（明るい空の上でも読めるよう、濃紺のふちを付ける）
const outlined = (px: string): CSSProperties => ({
  WebkitTextStroke: `${px} ${colors.ink.main}`,
  paintOrder: 'stroke fill',
})

type Confetti = { left: number; size: number; color: string; duration: number; delay: number }

// 紙吹雪の1枚ずつの位置・色・落ちる速さ。優勝者の色を多めに混ぜ、だれのお祝いかが分かるようにする
function makeConfetti(championColors: string[]): Confetti[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    left: Math.random() * 100,
    size: 0.6 + Math.floor(Math.random() * 2) * 0.4,
    color:
      i % 2 === 0 && championColors.length > 0
        ? championColors[i % championColors.length]
        : [...playerColors, colors.ui.goal][Math.floor(Math.random() * (playerColors.length + 1))],
    duration: 2.5 + Math.random() * 2.5,
    delay: -Math.random() * 5, // マイナスにして、発表の瞬間から画面全体に舞っているようにする
  }))
}

// 総合優勝（F7）：ドラムロールで「優勝は…」とためてから、ファンファーレと紙吹雪で優勝者を発表する
// 優勝者は表彰台の上で跳ね、ほかの人は地面で跳ねてお祝いする。見た目のルールは DESIGN.md の「総合優勝画面」
export default function ChampionScreen({ players, champions, onHome }: Props) {
  const [revealed, setRevealed] = useState(false)
  const [showButton, setShowButton] = useState(false)
  const winners = players.filter((p) => champions.includes(p.playerId))
  // 地面に並ぶ人。発表前は優勝者も含めた全員（だれが勝ったか分からないように）、発表後は優勝者以外
  const others = revealed ? players.filter((p) => !champions.includes(p.playerId)) : players
  const [confetti] = useState(() => makeConfetti(winners.map((p) => p.color)))

  useEffect(() => {
    playDrumroll(DRUMROLL_MS / 1000)
    const timers = [
      setTimeout(() => {
        setRevealed(true)
        playFanfare()
      }, DRUMROLL_MS),
      setTimeout(() => startBgm(VICTORY_SCORE), DRUMROLL_MS + BGM_DELAY_MS),
      setTimeout(() => setShowButton(true), DRUMROLL_MS + BUTTON_DELAY_MS),
    ]
    // 画面を離れたら BGM も止める（ホームに戻っても鳴り続けないように）
    return () => {
      timers.forEach(clearTimeout)
      stopBgm()
    }
  }, [])

  // 表彰台は優勝者の人数に合わせて広げる。ほかの人は表彰台をよけて左右の地面に並べる
  const championSize = winners.length === 1 ? 10 : winners.length === 2 ? 8 : 6
  const podiumWidth = Math.max(18, winners.length * championSize + 6)
  const left = others.slice(0, Math.ceil(others.length / 2))
  const right = others.slice(left.length)
  // 発表前は表彰台がないので、真ん中も使って広く並べる
  const sideWidth = revealed ? (100 - podiumWidth) / 2 : 50
  const otherSize = Math.min(7, (sideWidth - 4) / Math.max(1, left.length))

  return (
    // ResultStairs と同じく、画面いっぱいに 16:9 の舞台を置き、中の位置は舞台に対する % で決める
    <main className="flex h-full items-center justify-center" style={{ containerType: 'size' }}>
      <div
        className="relative overflow-hidden"
        style={{
          width: 'min(100cqw, calc(100cqh * 16 / 9))',
          aspectRatio: '16 / 9',
          containerType: 'inline-size',
          backgroundColor: colors.sky.main,
        }}
      >
        {/* 紙吹雪（発表の後だけ）。キャラより奥に置き、キャラと名前を隠さない */}
        {revealed &&
          confetti.map((c, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${c.left}%`,
                top: '-4%',
                width: `${c.size}cqw`,
                height: `${c.size}cqw`,
                backgroundColor: c.color,
                // steps：ドット絵に合わせ、なめらかに落とさずコマ送りで落とす（DESIGN.md 8章）
                animation: `confetti-fall ${c.duration}s steps(${Math.round(c.duration * 8)}) ${c.delay}s infinite`,
              }}
            />
          ))}

        {/* 上の文字。発表前は「優勝は…」、発表後は「★ 優勝 ★」と名前 */}
        <div className="absolute inset-x-0 top-[6%] text-center">
          {revealed ? (
            <>
              <p
                style={{
                  fontSize: '7cqw',
                  color: colors.ui.goal,
                  ...outlined('0.3cqw'),
                  animation: 'champion-blink 0.8s steps(1) infinite',
                }}
              >
                ★ 優勝 ★
              </p>
              <p className="font-bold" style={{ fontSize: '5cqw', lineHeight: 1.3 }}>
                {winners.map((p, i) => (
                  <span key={p.playerId}>
                    {i > 0 && <span style={{ color: colors.ui.text, ...outlined('0.25cqw') }}>・</span>}
                    <span style={{ color: p.color, ...outlined('0.25cqw') }}>{p.name}</span>
                  </span>
                ))}
              </p>
              <p style={{ fontSize: '2.6cqw', color: colors.ui.text, ...outlined('0.2cqw') }}>おめでとう！</p>
            </>
          ) : (
            <p className="pt-[8%]" style={{ fontSize: '6cqw', color: colors.ui.text, ...outlined('0.3cqw') }}>
              優勝は
              <span style={{ animation: 'champion-blink 0.4s steps(1) infinite' }}>…</span>
            </p>
          )}
        </div>

        {/* 地面（ゲームと同じ草＋土） */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: `${GROUND_HEIGHT}%`,
            backgroundColor: colors.dirt.main,
            borderTop: `0.8cqw solid ${colors.grass.main}`,
          }}
        />

        {/* 表彰台と優勝者（発表の後だけ） */}
        {revealed && (
          <>
            <div
              className="absolute flex items-center justify-center"
              style={{
                left: `${(100 - podiumWidth) / 2}%`,
                width: `${podiumWidth}%`,
                bottom: `${GROUND_HEIGHT}%`,
                height: `${PODIUM_HEIGHT}%`,
                backgroundColor: colors.dirt.main,
                borderTop: `0.8cqw solid ${colors.grass.main}`,
              }}
            >
              <span style={{ fontSize: '4cqw', color: colors.ui.goal, ...outlined('0.2cqw') }}>1</span>
            </div>
            <div
              className="absolute flex justify-center"
              style={{ left: 0, right: 0, bottom: `${GROUND_HEIGHT + PODIUM_HEIGHT + 1.4}%` }}
            >
              {winners.map((p, i) => (
                <div
                  key={p.playerId}
                  className="flex"
                  style={{
                    width: `${championSize}cqw`,
                    // 2人以上なら交互に跳ねさせ、にぎやかにする
                    animation: `champion-hop 0.6s steps(6) ${i % 2 ? -0.3 : 0}s infinite`,
                  }}
                >
                  <CharacterIcon color={p.color} size="100%" />
                </div>
              ))}
            </div>
          </>
        )}

        {/* ほかの人は地面に並ぶ。発表前はそわそわと小さく、発表後は大きく跳ねてお祝いする */}
        {[left, right].map((group, side) =>
          group.map((p, i) => {
            const slot = sideWidth / group.length
            const x = side === 0 ? slot * i + (slot - otherSize) / 2 : 100 - sideWidth + slot * i + (slot - otherSize) / 2
            return (
              <div
                key={p.playerId}
                className="absolute"
                style={{ left: `${x}%`, bottom: `${GROUND_HEIGHT + 1.4}%`, width: `${otherSize}%` }}
              >
                <p
                  className="absolute left-1/2 -translate-x-1/2 font-bold whitespace-nowrap"
                  style={{ bottom: '110%', fontSize: '1.2cqw', color: p.color, ...outlined('0.1cqw') }}
                >
                  {p.name}
                </p>
                <div
                  className="flex"
                  style={{
                    animation: revealed
                      ? `champion-hop 0.5s steps(5) ${-(i % 3) * 0.15}s infinite`
                      : `champion-fidget 0.3s steps(1) ${-(i % 2) * 0.15}s infinite`,
                  }}
                >
                  <CharacterIcon color={p.color} size="100%" />
                </div>
              </div>
            )
          }),
        )}

        {showButton && (
          <button
            className="absolute right-[3%] top-[4%] border-4 px-[1.5cqw] py-[0.6cqw]"
            style={{
              fontSize: '1.8cqw',
              color: colors.ink.main,
              backgroundColor: colors.frame.fill,
              borderColor: colors.frame.border,
            }}
            onClick={onHome}
          >
            ホームへ戻る
          </button>
        )}
      </div>
    </main>
  )
}
