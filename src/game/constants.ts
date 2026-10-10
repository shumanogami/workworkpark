// ゲームの定数。座標の単位は「ステージ上のピクセル」（画面の大きさに合わせて拡大・縮小して表示する）

// ステージの大きさ（16:9）
export const STAGE_WIDTH = 960
export const STAGE_HEIGHT = 540

// 地面の厚み（画面下端からの高さ）。プレイヤーの高さ 0 ＝ 地面の上面
export const GROUND_HEIGHT = 40

// 左右の壁の厚み。プレイヤーは壁の内側だけを動ける
export const WALL_WIDTH = 20

// プレイヤーの大きさ（正方形）
export const PLAYER_SIZE = 40

// 制限時間（秒）
export const GAME_DURATION = 10

// 物理の計算間隔（秒）。画面の更新頻度に関わらず1/60秒ずつ進め、結果が端末によって変わらないようにする
export const FIXED_DT = 1 / 60
