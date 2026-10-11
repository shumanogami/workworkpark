// 見た目の値（色・大きさ・フォント）の部品箱。ルールの説明は リポジトリ直下の DESIGN.md にある
// 色コードはこのファイルにだけ書く。画面のコードに色コードを直接書くと、色を変えるときに直し漏れが出るため
// DESIGN.md の色の一覧は説明用の写し。値を変えたら DESIGN.md も直す

// 使う色の元。ファミコンで出せる色から選び、レトロなドット絵の見た目にそろえる
// 役割（空・草など）ではなく色そのものの名前にしておき、同じ色を複数の役割で使い回す
const famicom = {
  skyBlue: '#5c94fc', // マリオの空の色
  white: '#fcfcfc',
  paleBlue: '#a4e4fc',
  lightBlue: '#3cbcfc',
  cream: '#fce0a8',
  gold: '#f8b800', // 山吹色
  vermilion: '#f83800', // 朱色
  green: '#00a800',
  brown: '#881400',
  indigo: '#3c3c78',
  crimson: '#e40058',
  blue: '#0058f8',
  lime: '#b8f818',
  pink: '#f878f8',
  salmon: '#f87858',
  violet: '#9878f8',
  cyan: '#00e8d8',
  ochre: '#ac7c00',
} as const

// 輪郭・文字の「黒」。真っ黒だと青い空から浮くため、空に合わせて青寄りの濃紺にした（ファミコンの色ではない）
const navy = '#1a1a40'

export const colors = {
  // 空。なめらかなグラデーションはドット絵と合わないため単色
  sky: { main: famicom.skyBlue },
  cloud: { main: famicom.white, shadow: famicom.paleBlue },
  // 太陽は光の色（山吹色）がプレイヤーの色とかぶらないよう、プレイヤーには黄色を使わない
  sun: { main: famicom.cream, ray: famicom.gold },
  grass: { main: famicom.green },
  // 地面の土。マリオの地面色（#c84c0c）は目立ちすぎるため暗めにした
  dirt: { main: famicom.brown },
  wall: { main: famicom.indigo },
  // 輪郭・文字の色。dim はカウントダウン中に画面を暗くする幕（真っ黒だと空がくすむため濃紺の半透明）
  ink: { main: navy, dim: 'rgba(26, 26, 64, 0.45)' },
  // TIME・Round などの箱。白地に濃紺の枠
  frame: { fill: famicom.white, border: navy },
  // キャラクターの体以外の色（体はプレイヤーの色）。輪郭を濃紺にそろえるかは未決定（DESIGN.md の「未決定」）
  character: { outline: '#1a1a1a', eyeWhite: '#ffffff', eye: '#1a1a1a', mouth: '#8a2a2a' },
  ui: {
    countdown: famicom.white, // 3・2・1 の数字
    start: famicom.gold, // START! の文字
    finish: famicom.vermilion, // FINISH の文字（1P の赤と区別するため朱色）
    heightBar: famicom.gold, // FINISH のあと上がっていく高さのバー
    heightFill: 'rgba(252, 252, 252, 0.25)', // バーの下の塗り（黄色だと青い空と混ざって濁るため白の半透明）
    text: famicom.white, // ホーム・リザルトの文字（背景が暗い間の色）
    retry: famicom.crimson, // リザルトの「もう一度プレイ」（赤）
    home: famicom.lightBlue, // リザルトの「ホームへ戻る」（青）。2P の青は暗い背景で読みにくいため明るい青にした
  },
} as const

// プレイヤーの色（1P から順に）。どの色も空・雲・太陽・草・地面・壁・FINISH の文字と見分けられるものを選んだ
// 背景の色との差（色差 ΔE）が 28 以上、プレイヤー同士も 28 以上離れている（前の8色は 4P 黄と太陽の光が 10 しかなかった）
export const playerColors = [
  famicom.crimson, // 1P 赤
  famicom.blue, // 2P 青（空より濃い青）
  famicom.lime, // 3P 黄緑（草の緑より明るく黄色寄り）
  famicom.pink, // 4P 桃（黄色は太陽とかぶるため使わない）
  famicom.salmon, // 5P 橙
  famicom.violet, // 6P 紫
  famicom.cyan, // 7P 水色
  famicom.ochre, // 8P 黄土
] as const

// 大きさの基準。デザインは 480×270 のドットの升目で考え、1ドット＝論理 1px とする
// 物理の座標（src/game/constants.ts の 960×540）と描画の canvas は、その整数倍で拡大する
export const layout = {
  logicalWidth: 480,
  logicalHeight: 270,
  stagePxPerDot: 2, // 物理の座標（960×540）での1ドットの大きさ
  canvasPxPerDot: 4, // 全画面の描画（1920×1080）での1ドットの大きさ
  characterDots: 20, // キャラクターの大きさ（20×20 ドット）。すべての大きさの基準
  minButtonPx: 72, // スマホのボタンの1辺の最小（CSS の px）
} as const

export const fonts = {
  // Canvas で使うときの指定。CSS 側（src/index.css の --font-dot）とそろえる
  dot: '"DotGothic16", sans-serif',
} as const
