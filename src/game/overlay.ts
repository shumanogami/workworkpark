import { GROUND_HEIGHT, STAGE_HEIGHT, STAGE_WIDTH, WALL_WIDTH } from './constants'
import { PALETTE } from './render'

// 試合の前後の演出（カウントダウン・FINISH・高さのバー）を、ゲーム画面の上に重ねて描く

// 太い縁取りの付いた大きな文字（背景が明るい空でも読めるように）
function drawBigText(ctx: CanvasRenderingContext2D, text: string, y: number, size: number, color: string) {
  ctx.font = `${size}px "DotGothic16", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = size / 6
  ctx.strokeStyle = PALETTE.navy
  ctx.strokeText(text, STAGE_WIDTH / 2, y)
  ctx.fillStyle = color
  ctx.fillText(text, STAGE_WIDTH / 2, y)
}

// カウントダウン中は画面を少し暗くして、数字を目立たせる。START! のときは暗くしない（もう動けるため）
// 暗転は真っ黒だと空がくすむため、輪郭と同じ濃紺を半透明で重ねる
export function drawCountdown(ctx: CanvasRenderingContext2D, label: string) {
  const isStart = label === 'START!'
  if (!isStart) {
    ctx.fillStyle = 'rgba(26, 26, 64, 0.45)'
    ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)
  }
  drawBigText(ctx, label, STAGE_HEIGHT / 2, isStart ? 120 : 180, isStart ? PALETTE.gold : PALETTE.white)
}

// FINISH の文字と、一番高い人の頭まで上がっていくバー
// barHeight：バーの高さ（地面からの高さ）。まだ出さないときは null
export function drawFinish(ctx: CanvasRenderingContext2D, barHeight: number | null) {
  if (barHeight !== null) {
    const y = STAGE_HEIGHT - GROUND_HEIGHT - barHeight
    // バーの下を薄く塗って、「ここまで上がった」ことを分かりやすくする
    // 黄色だと青い空と混ざって濁るため、白の半透明にした
    ctx.fillStyle = 'rgba(252, 252, 252, 0.25)'
    ctx.fillRect(WALL_WIDTH, y, STAGE_WIDTH - WALL_WIDTH * 2, barHeight)
    ctx.fillStyle = PALETTE.navy
    ctx.fillRect(WALL_WIDTH, y - 4, STAGE_WIDTH - WALL_WIDTH * 2, 8)
    ctx.fillStyle = PALETTE.gold
    ctx.fillRect(WALL_WIDTH, y - 2, STAGE_WIDTH - WALL_WIDTH * 2, 4)
  }
  // バーが出たら、文字は上の方に寄せてバーとプレイヤーを見やすくする
  if (barHeight === null) drawBigText(ctx, 'FINISH', STAGE_HEIGHT / 2, 160, PALETTE.finish)
  else drawBigText(ctx, 'FINISH', 130, 90, PALETTE.finish)
}
