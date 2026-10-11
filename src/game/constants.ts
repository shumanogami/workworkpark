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

// 横移動の最高速度（ピクセル/秒）。遊んでみて速すぎたため 260 から 0.8 倍に下げた（2026-10-11）
export const MOVE_SPEED = 208

// 横方向の加速度（ピクセル/秒²）。空中は地上より操作が効きにくくする
export const GROUND_ACCEL = 3000
export const AIR_ACCEL = 1500

// 着地の少し前にジャンプを押しても受け付ける猶予（秒）。押したのに跳ばない、という不満を減らす
export const JUMP_BUFFER_TIME = 0.1

// 横からぶつかったときに弾かれる速さ（ピクセル/秒）。横と上の組み合わせで「斜め上」に飛ぶ
// 横は飛びすぎたため 450 から下げた（横に飛ぶ距離 約210px → 約130px。2026-10-11）
export const BOUNCE_VX = 350
export const BOUNCE_VY = 450

// 弾かれた後、操作が効かない時間（秒）。すぐに踏みとどまれると弾かれた感じが出ないため
// 長すぎたため 0.35 から短くした（2026-10-11）
export const KNOCKBACK_TIME = 0.25

// 「動いている」とみなす横方向の速さ（ピクセル/秒）。これ以下同士で重なったときは弾かずに押し離すだけ
export const MOVING_THRESHOLD = 20

// 上昇中の人の頭からジャンプしたとき、下の人の上昇速度を何割上乗せするか（未決定仕様 U6）
// そのまま足すと画面の外まで飛び出すため、割合を抑える
export const SUPPORT_JUMP_BONUS = 0.4

// 頭の上に立つのに必要な、横方向の重なりの最小幅（ピクセル）
// これより浅く頭の端にかかっただけだと、宙に浮いて立っているように見えるため、滑り落とす（U5）
export const MIN_STAND_OVERLAP = PLAYER_SIZE / 4

// 足元の高さの上限＝画面の上端（未決定仕様 U10）。これより上に行くと画面に映らなくなるため、見えない天井で止める
export const CEILING_Y = STAGE_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE
