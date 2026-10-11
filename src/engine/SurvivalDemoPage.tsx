import { useEffect, useRef, useState } from 'react'
import { DEV_KEY_BINDINGS, useKeyboardInputs } from '../game/keyboard'
import type { Rect } from './rect'
import { applyPickups, collectItems, createScores, type Item, type Scores } from './score'
import { createScroll, DEFAULT_HORIZONTAL, stepScroll, toScreen, visibleRange } from './scroll'
import {
  createSurvival,
  eliminate,
  type Hazard,
  isAlive,
  isOutside,
  judgeSurvivor,
  ranking,
  type SurvivalState,
  touchingHazards,
} from './survival'

// 開発用：ポイント・脱落・勝敗の部品を、横スクロールと組み合わせて確かめるページ（/dev/survival）
// 「右へスクロールする画面から逃げる」試作。見た目・キャラの動きはこのページだけの仮のもの
// - 毒の沼に触れる、または画面の左端に置いていかれると脱落（画面から消え、操作できなくなる）
// - コインで +10、毒キノコで -5（0 未満にはならない）
// - 最後の1人になったら勝ち

const WIDTH = 960
const HEIGHT = 540
const GROUND_Y = 480 // 地面の上面（ワールド座標）
const SIZE = 36
const GRAVITY = 2000
const JUMP_SPEED = 720
const MOVE_SPEED = 260

const PLAYERS = [
  { playerId: 'p1', label: '1P', color: '#ff5555', keys: 'A / D / W' },
  { playerId: 'p2', label: '2P', color: '#55aaff', keys: '← / → / ↑' },
  { playerId: 'p3', label: '3P', color: '#55dd55', keys: 'J / L / I' },
]

type Runner = Rect & { playerId: string; vx: number; vy: number; grounded: boolean; jumpHeld: boolean }

// コースは区画（幅 400）ごとに、番号から決まった配置にする（何度遊んでも同じコース。どこまででも続く）
const SECTION = 400
function pitsIn(section: number): Hazard[] {
  if (section < 2) return [] // 最初の2区画は安全
  const width = 60 + (section % 3) * 15
  return [{ id: `pit-${section}`, x: section * SECTION + 180, y: GROUND_Y - 10, width, height: 30, cause: 'poison' }]
}
function itemsIn(section: number): Item[] {
  if (section < 1) return []
  const items: Item[] = [{ id: `coin-${section}`, x: section * SECTION + 60, y: GROUND_Y - 110, width: 22, height: 22, points: 10, kind: 'coin' }]
  if (section % 2 === 0) {
    items.push({ id: `mush-${section}`, x: section * SECTION + 320, y: GROUND_Y - 24, width: 24, height: 24, points: -5, kind: 'poison' })
  }
  return items
}
function inRange<T>(from: number, to: number, make: (section: number) => T[]): T[] {
  const result: T[] = []
  for (let s = Math.max(0, Math.floor(from / SECTION) - 1); s <= Math.floor(to / SECTION) + 1; s++) result.push(...make(s))
  return result
}

function startRunners(): Runner[] {
  return PLAYERS.map((p, i) => ({
    playerId: p.playerId,
    x: 200 + i * 70,
    y: GROUND_Y - SIZE,
    width: SIZE,
    height: SIZE,
    vx: 0,
    vy: 0,
    grounded: true,
    jumpHeld: false,
  }))
}

type View = { elapsed: number; speed: number; scores: Scores; survival: SurvivalState; decided: boolean; winners: string[] }

export default function SurvivalDemoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const getInputs = useKeyboardInputs(DEV_KEY_BINDINGS)
  const [round, setRound] = useState(0)
  const ids = PLAYERS.map((p) => p.playerId)
  const [view, setView] = useState<View>({
    elapsed: 0,
    speed: 0,
    scores: createScores(ids),
    survival: createSurvival(ids),
    decided: false,
    winners: [],
  })

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const config = DEFAULT_HORIZONTAL
    let scroll = createScroll(config)
    let runners = startRunners()
    let scores = createScores(PLAYERS.map((p) => p.playerId))
    let survival = createSurvival(PLAYERS.map((p) => p.playerId))
    const taken = new Set<string>() // 取られたアイテム（コースは番号から作り直すので、取ったものを覚えておく）
    let last: number | null = null
    let rafId = 0
    let hudTimer = 0

    const frame = (time: number) => {
      const dt = last === null ? 0 : Math.min((time - last) / 1000, 1 / 30)
      last = time
      const result = judgeSurvivor(survival)

      if (!result.decided) {
        scroll = stepScroll(scroll, config, dt)
        const range = visibleRange(config, scroll, WIDTH)
        const screen: Rect = { x: range.from, y: 0, width: WIDTH, height: HEIGHT }
        const inputs = getInputs()

        // 生きている人だけ動かす（脱落した人は操作を受け付けない）
        runners = runners.map((r) => {
          if (!isAlive(survival, r.playerId)) return r
          const input = inputs[r.playerId]
          const dir = (input?.right ? 1 : 0) - (input?.left ? 1 : 0)
          const pressed = !!input?.jump && !r.jumpHeld
          let vy = r.vy + GRAVITY * dt
          if (pressed && r.grounded) vy = -JUMP_SPEED
          // 右端より先には行けない（画面の外へ逃げられないように）
          const x = Math.min(r.x + dir * MOVE_SPEED * dt, range.to - SIZE)
          let y = r.y + vy * dt
          let grounded = false
          if (y >= GROUND_Y - SIZE) {
            y = GROUND_Y - SIZE
            vy = 0
            grounded = true
          }
          return { ...r, x, y, vy, vx: dir * MOVE_SPEED, grounded, jumpHeld: !!input?.jump }
        })
        const alive = runners.filter((r) => isAlive(survival, r.playerId))

        // アイテム（ポイントの部品）
        const items = inRange(range.from, range.to, itemsIn).filter((i) => !taken.has(i.id))
        const { pickups } = collectItems(alive, items)
        for (const p of pickups) taken.add(p.itemId)
        scores = applyPickups(scores, pickups)

        // 脱落（脱落の部品）：毒の沼に触れた人、画面の左端に置いていかれた人
        for (const hit of touchingHazards(alive, inRange(range.from, range.to, pitsIn))) {
          survival = eliminate(survival, [hit.playerId], scroll.elapsed, hit.cause)
        }
        const behind = alive.filter((r) => isOutside(r, screen)).map((r) => r.playerId)
        survival = eliminate(survival, behind, scroll.elapsed, 'out')
      }

      draw(ctx, config, scroll, runners, survival, taken)
      hudTimer += dt
      const decidedNow = judgeSurvivor(survival)
      if (hudTimer >= 0.1 || decidedNow.decided) {
        hudTimer = 0
        setView({ elapsed: scroll.elapsed, speed: scroll.speed, scores, survival, ...decidedNow })
      }
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [getInputs, round])

  const ranks = ranking(view.survival)
  const label = (id: string) => PLAYERS.find((p) => p.playerId === id)!
  return (
    <main className="flex h-full flex-col items-center justify-center gap-3 p-4">
      <div className="relative">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="block aspect-video max-h-[75vh] max-w-full" />
        {view.decided && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
            <p className="text-6xl">
              {view.winners.length === 1 ? `${label(view.winners[0]).label} WIN!!` : 'DRAW!!'}
            </p>
            <ul className="text-xl">
              {ranks.map((r) => (
                <li key={r.playerId} style={{ color: label(r.playerId).color }}>
                  {r.rank}位 {label(r.playerId).label}（{view.scores[r.playerId]} 点）
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {PLAYERS.map((p) => {
          const out = view.survival.eliminated.find((e) => e.playerId === p.playerId)
          return (
            <span key={p.playerId} style={{ color: p.color }} className={out ? 'line-through opacity-50' : ''}>
              {p.label}（{p.keys}）{view.scores[p.playerId]} 点{out ? ` 脱落：${out.cause === 'out' ? '置いていかれた' : '毒の沼'}` : ''}
            </span>
          )
        })}
        <button
          className="border-2 border-white px-3 py-1"
          onClick={(e) => {
            e.currentTarget.blur()
            setRound((r) => r + 1)
          }}
        >
          最初から
        </button>
      </div>
      <p className="text-neutral-400">
        経過 {view.elapsed.toFixed(1)} 秒 ／ スクロール {Math.round(view.speed)} px/秒（キャラの走る速さは {MOVE_SPEED}）
      </p>
    </main>
  )
}

function draw(
  ctx: CanvasRenderingContext2D,
  config: typeof DEFAULT_HORIZONTAL,
  scroll: ReturnType<typeof createScroll>,
  runners: Runner[],
  survival: SurvivalState,
  taken: Set<string>,
) {
  const range = visibleRange(config, scroll, WIDTH)
  const at = (x: number, y: number) => toScreen(config, scroll, x, y)

  ctx.fillStyle = '#7ec8f0'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.fillStyle = '#7a5a3a'
  ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y)
  ctx.fillStyle = '#5cbf4a'
  ctx.fillRect(0, GROUND_Y, WIDTH, 6)

  // 毒の沼（仮：紫の帯）
  for (const p of inRange(range.from, range.to, pitsIn)) {
    const s = at(p.x, p.y)
    ctx.fillStyle = '#8a3fbf'
    ctx.fillRect(s.x, s.y, p.width, p.height)
    ctx.fillStyle = '#b06ae0'
    ctx.fillRect(s.x, s.y, p.width, 4)
  }
  // アイテム（仮：コインは黄色の丸、毒キノコは紫の丸）
  for (const i of inRange(range.from, range.to, itemsIn)) {
    if (taken.has(i.id)) continue
    const s = at(i.x, i.y)
    ctx.fillStyle = i.kind === 'coin' ? '#ffcc33' : '#9b4dca'
    ctx.beginPath()
    ctx.arc(s.x + i.width / 2, s.y + i.height / 2, i.width / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1c1c28'
    ctx.font = '14px "DotGothic16", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(i.points > 0 ? `+${i.points}` : String(i.points), s.x + i.width / 2, s.y - 6)
  }
  // キャラ（脱落した人は描かない）
  for (const r of runners) {
    if (!isAlive(survival, r.playerId)) continue
    const s = at(r.x, r.y)
    const p = PLAYERS.find((x) => x.playerId === r.playerId)!
    ctx.fillStyle = p.color
    ctx.fillRect(s.x, s.y, r.width, r.height)
    ctx.fillStyle = '#ffffff'
    ctx.font = '14px "DotGothic16", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(p.label, s.x + r.width / 2, s.y - 6)
  }
  // 左端の危険ゾーン（ここより左に置いていかれると脱落）
  ctx.fillStyle = 'rgba(255, 60, 60, 0.25)'
  ctx.fillRect(0, 0, 6, HEIGHT)
}
