import { GROUND_HEIGHT, STAGE_HEIGHT, STAGE_WIDTH, WALL_WIDTH } from './constants'

// 試合の前後の演出（カウントダウン・FINISH・高さのバー）を、ゲーム画面の上に重ねて描く

// 太い縁取りの付いた大きな文字（背景が明るい空でも読めるように）
function drawBigText(ctx: CanvasRenderingContext2D, text: string, y: number, size: number, color: string) {
  ctx.font = `${size}px "DotGothic16", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = size / 6
  ctx.strokeStyle = '#1c1c28'
  ctx.strokeText(text, STAGE_WIDTH / 2, y)
  ctx.fillStyle = color
  ctx.fillText(text, STAGE_WIDTH / 2, y)
}

// カウントダウン中は画面を少し暗くして、数字を目立たせる。START! のときは暗くしない（もう動けるため）
export function drawCountdown(ctx: CanvasRenderingContext2D, label: string) {
  const isStart = label === 'START!'
  if (!isStart) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)
  }
  drawBigText(ctx, label, STAGE_HEIGHT / 2, isStart ? 120 : 180, isStart ? '#ffcc33' : '#ffffff')
}

// FINISH の文字と、一番高い人の頭まで上がっていくバー
// barHeight：バーの高さ（地面からの高さ）。まだ出さないときは null
export function drawFinish(ctx: CanvasRenderingContext2D, barHeight: number | null) {
  if (barHeight !== null) {
    const y = STAGE_HEIGHT - GROUND_HEIGHT - barHeight
    // バーの下を薄く塗って、「ここまで上がった」ことを分かりやすくする
    ctx.fillStyle = 'rgba(255, 204, 51, 0.18)'
    ctx.fillRect(WALL_WIDTH, y, STAGE_WIDTH - WALL_WIDTH * 2, barHeight)
    ctx.fillStyle = '#1c1c28'
    ctx.fillRect(WALL_WIDTH, y - 4, STAGE_WIDTH - WALL_WIDTH * 2, 8)
    ctx.fillStyle = '#ffcc33'
    ctx.fillRect(WALL_WIDTH, y - 2, STAGE_WIDTH - WALL_WIDTH * 2, 4)
  }
  // バーが出たら、文字は上の方に寄せてバーとプレイヤーを見やすくする
  if (barHeight === null) drawBigText(ctx, 'FINISH', STAGE_HEIGHT / 2, 160, '#ff5555')
  else drawBigText(ctx, 'FINISH', 130, 90, '#ff5555')
}
