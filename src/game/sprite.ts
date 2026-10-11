// キャラクター（羽のある子）のドット絵。ラフ画をもとに 20×20 マスで描き、プレイヤーの色で塗り分ける
// 画像ファイルを使わず文字で持つのは、8色に塗り分けるのが簡単で、読み込み待ちも起きないため
//
// 記号：. 透明／O 輪郭／B 体（プレイヤーの色）／D 羽・ヒレ（体の色を暗く）／L おなか（体の色を明るく）
//       W 白目／K 黒目／M 口
// 右を向いた姿で描く（黒目が右寄り）。左を向くときは左右反転する
export const CHARACTER_SPRITE = [
  '.....OO......OO.....',
  '....OBBO....OBBO....',
  '....OBBBOOOOBBBO....',
  '...OBBBBBBBBBBBBO...',
  '..OBBBBBBBBBBBBBBO..',
  '..OBBWWBBBBBBWWBBO..',
  '.DOBBWKBBBBBBWKBBOD.',
  'DDOBBWKBBBBBBWKBBODD',
  '..OBBBBBMMMMBBBBBO..',
  '...OBBBBBMMBBBBBO...',
  '....OOBBBBBBBBOO....',
  'D..OBBBBBBBBBBBBO..D',
  'DD.OBBBBLLLLBBBBO.DD',
  'DDDOBBBLLLLLLBBBODDD',
  '.DDOBBBLLLLLLBBBODD.',
  '..DOBBBBLLLLBBBBOD..',
  '.OOOBBBBBBBBBBBBO...',
  '...OBBBBBBBBBBBBO...',
  '...OBBBO....OBBBO...',
  '...OOOOO....OOOOO...',
] as const

export const SPRITE_SIZE = 20

const FIXED_COLORS: Record<string, string> = {
  O: '#1a1a1a',
  W: '#ffffff',
  K: '#1a1a1a',
  M: '#8a2a2a',
}

// 色を明るく（amount > 0）または暗く（amount < 0）する。amount は -1〜1
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const mixed = channels.map((c) => {
    const target = amount > 0 ? 255 : 0
    return Math.round(c + (target - c) * Math.abs(amount))
  })
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

// 弾かれている間は目を閉じた顔（横線）にする。目の行（5〜7行目）の白目・黒目を置き換える
function cellAt(row: number, col: number, stunned: boolean): string {
  const cell = CHARACTER_SPRITE[row][col]
  if (stunned && (cell === 'W' || cell === 'K')) return row === 6 ? 'K' : 'B'
  return cell
}

// キャラクターを (x, top) を左上として size×size の大きさで描く
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  size: number,
  color: string,
  facing: 1 | -1 = 1,
  stunned = false,
) {
  const px = size / SPRITE_SIZE
  const palette: Record<string, string> = {
    ...FIXED_COLORS,
    B: color,
    D: shade(color, -0.35),
    L: shade(color, 0.55),
  }
  for (let row = 0; row < SPRITE_SIZE; row++) {
    for (let col = 0; col < SPRITE_SIZE; col++) {
      const cell = cellAt(row, col, stunned)
      if (cell === '.') continue
      ctx.fillStyle = palette[cell]
      const drawCol = facing === 1 ? col : SPRITE_SIZE - 1 - col
      // 隙間ができないよう、少しだけ大きめに塗る
      ctx.fillRect(x + drawCol * px, top + row * px, px + 0.5, px + 0.5)
    }
  }
}
