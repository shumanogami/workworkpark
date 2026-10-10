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

// ---- 物理の調整値（遊び心地は T14 で調整する） ----

// 重力（ピクセル/秒²）
export const GRAVITY = 2000

// ジャンプの初速（ピクセル/秒）。最高到達点は JUMP_SPEED² / (2 × GRAVITY) ≒ 140px（キャラ約3.5個分）
export const JUMP_SPEED = 750

// 横移動の最高速度（ピクセル/秒）
export const MOVE_SPEED = 260

// 横方向の加速度（ピクセル/秒²）。空中は地上より操作が効きにくくする
export const GROUND_ACCEL = 3000
export const AIR_ACCEL = 1500

// 着地の少し前にジャンプを押しても受け付ける猶予（秒）。押したのに跳ばない、という不満を減らす
export const JUMP_BUFFER_TIME = 0.1

// 横からぶつかったときに弾かれる速さ（ピクセル/秒）。横と上の組み合わせで「斜め上」に飛ぶ
export const BOUNCE_VX = 450
export const BOUNCE_VY = 450

// 弾かれた後、操作が効かない時間（秒）。すぐに踏みとどまれると弾かれた感じが出ないため
export const KNOCKBACK_TIME = 0.35

// 「動いている」とみなす横方向の速さ（ピクセル/秒）。これ以下同士で重なったときは弾かずに押し離すだけ
export const MOVING_THRESHOLD = 20
