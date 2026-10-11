# CLAUDE.md

石巻ハッカソンのチーム開発リポジトリ（workworkpark）。複数のメンバーがそれぞれのClaude Codeで同時に作業する前提のルール。

## プロジェクト概要

- テーマ：「仲間の結束をふかめるゲームを作ろう！！」
- PC画面がゲーム本体、各自のスマホがコントローラーになる2〜8人用ゲーム
- 最初に作るゲーム：「Jump the highest」
- **仕様の正は [docs/初期構想.md](docs/初期構想.md)**。実装前に必ず読む。仕様を変えるときは `docs/初期構想.md` も同じPRで更新する
- タスクと担当：[docs/タスク.md](docs/タスク.md)
- 環境構築の手順：[README.md](README.md)／各メンバーの環境の確認結果：[docs/環境確認.md](docs/環境確認.md)
- 文書は `docs/` にまとめる

## 技術スタック

- TypeScript ＋ Vite ＋ React（画面の切り替えは react-router）
- 見た目：Tailwind CSS v4 ＋ DotGothic16 フォント（`font-dot`）
- 描画：HTML5 Canvas／物理処理：自作（ライブラリなし）
- 通信：Supabase Realtime（Broadcastで操作送信、Presenceで参加人数管理）
- テスト：Vitest
- 公開：Vercel（mainにpushすると自動公開）
- すべて無料枠で構築する。有料サービスや新しいライブラリを足すときは、PRの説明に理由を書く

## コマンド

```sh
npm ci           # 依存パッケージの導入（初回・git pull で package-lock.json が変わったとき）
npm run dev      # 開発サーバー（http://localhost:5173）。同じWi-Fiのスマホからも開ける
npm run build    # 型チェック＋本番ビルド
npm test         # Vitest（物理処理・勝敗判定の自動テスト）
npm run lint     # oxlint
```

## ディレクトリ構成

```
docs/
  初期構想.md              # 仕様の正
  タスク.md                # タスク一覧と担当
  環境確認.md              # メンバーごとの開発環境の確認結果
  未決定仕様（芦田）.md      # 芦田担当の開発中に出た未決定の仕様と仮の対応
src/
  main.tsx                 # ルーティング：/ → PC画面、/controller → スマホ画面
  pages/
    HostPage.tsx           # PC：ホーム・ゲーム・リザルト
    ControllerPage.tsx     # スマホ：コントローラー（?room=ABCD でルーム指定）
  game/                    # ゲームの中身（芦田担当）。通信には触らない
    GameScreen.tsx         # 1試合分のゲーム画面（players / getInputs / onFinish を受け取る）
    step.ts                # 物理：状態を1コマ進める純粋な関数
    physics.ts             # 1人分の物理（入力→速度、重力・地面・壁）
    collisions.ts          # プレイヤー同士の当たり判定（頭に乗る・横の押し合い）
    keyboard.ts            # 開発用のキーボード操作（スマホの代わり）
    state.ts               # 初期状態の生成、終了時の高さの取り出し
    render.ts              # Canvas への描画（青空・太陽・雲・TIME・Round）
    sprite.ts              # キャラクターのドット絵（20×20、プレイヤーの色で塗り分け）
    CharacterIcon.tsx      # ゲーム外（ホーム・リザルト）でキャラクターを1体表示する部品
    constants.ts           # ステージの大きさ、制限時間など
    DevGamePage.tsx        # 開発用（/dev/game）：通信なしでゲーム画面だけを確認する
  lib/
    supabase.ts            # Supabase クライアント（環境変数が未設定なら起動時にエラー）
    room.ts                # ルームコード・playerId の生成と保存（sessionStorage）
    useRoomChannel.ts      # ルームのチャンネルへの参加と Presence（接続中のスマホ一覧）
    players.ts             # 参加者への番号と色の割り当て（PCだけが行う）
    useInputSender.ts      # スマホ：ボタンの状態を送る（変化時＋ゲーム中は0.5秒ごと）
    inputBuffer.ts         # PC：届いた入力を保持し、1コマごとに取り出す（短いジャンプの予約もここ）
    judge.ts               # 勝敗判定（終了した瞬間の高さ、同じ高さは引き分け）
  shared/
    messages.ts            # スマホ⇔PC間のメッセージの型（通信の取り決め）
```

<!-- 機能が増えたら追記する（例：src/game/ に物理・描画、src/realtime/ に Supabase 接続） -->

## 基本的な振る舞い

- 回答・コミットメッセージ・PRの説明は日本語で書く
- メンバーには非エンジニアもいる。技術用語には一言で補足を添える
- 作業の前に「何をするか」を一言伝えてから実行する
- コードのコメントは日本語で、「なぜそうしたか」を書く

## 開発方針

1. **まず端から端までつなぐ。** 1日目のゴールは「スマホのボタンでPC上の四角が動く」。見た目の作り込みは2日目以降。
2. **物理処理と勝敗判定は純粋な関数にし、Vitest でテストする。** `step(state, inputs, dt) => 次の state` の形で、React・Canvas・通信に触らない。テストファイルは対象と同じ場所に `*.test.ts` で置く。画面・通信・スマホ操作は自動テストせず、実機で確認する。
3. **小さくこまめにPRを出す。** 動く単位ができたらすぐPRにし、コンフリクトを小さく保つ。
4. **時間が足りないときは次の順に削る**：効果音 → 演出 → リザルト画面の作り込み。積み重なり（T8）と横衝突（T9）はゲームの核なので削らない。

## 設計ルール

- **PCが審判、スマホはリモコン。** 物理演算・勝敗判定・プレイヤーの色と番号の割り当てはPCだけが行う。スマホはボタンの状態を送り、PCから届いた状態を表示するだけ。
- **通信の型は `src/shared/messages.ts` に集約する。** 変更するときは、他のメンバーと合意してから。任意項目（`?`）の追加は影響が小さく、名前の変更・削除は送る側・受け取る側の両方の修正が必要になる。

## Git運用ルール（共同開発）

### 作業を始めるとき

1. `git switch main` → `git pull` で最新にする
2. 作業用ブランチを作る：`git switch -c <種類>/<内容>`
   - 例：`feat/controller-buttons`、`fix/jump-collision`、`docs/update-spec`
   - 種類：`feat`（機能追加）／`fix`（不具合修正）／`docs`（文書）／`style`（見た目）／`refactor`（整理）／`chore`（設定・雑務）

### 作業中

- こまめにコミットし、作業用ブランチを `git push -u origin <ブランチ名>` でGitHubに上げる
- コミットメッセージ：`<種類>: <日本語の要約>`（例：`feat: スマホのジャンプボタンを追加`）
- 長く作業するときは `git pull origin main` でmainの変更を取り込み、衝突（コンフリクト）を早めに解消する
- パッケージを追加したら `package.json` と `package-lock.json` を両方コミットする

### 作業を終えるとき

1. `npm run build` と `npm test` が通ることを確認する
2. `gh pr create` でPull Request（変更の提案）を作る。説明には「何を・なぜ・どう確認したか」を書く
3. 他のメンバーが確認してからmainにマージする。急ぎのときはチャットで一声かけてからマージする
4. マージ後はmainに戻って `git pull` する

### 禁止事項

- **mainへの直接push、force push（`git push --force`）はしない**。mainは常に動く状態を保つ
- 他の人のブランチを勝手に書き換えない
- コンフリクトが自分で判断できないときは、勝手に片方を消さず、メンバーに確認する

## 秘密情報の扱い（公開リポジトリ）

- SupabaseのURLと **publishable キー**（`sb_publishable_` で始まる）は `.env.local` に `VITE_` で始まる名前で書く（`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`。変数名は ANON_KEY だが値は publishable キー。見本は `.env.example`）。`.env.local` は `.gitignore` で除外し、絶対にコミットしない
- 旧 `anon` キーは2026年末で廃止予定のため使わない
- **secret キー（旧 `service_role` キー）はコード・リポジトリ・PRの説明に一切書かない**
- コミット前に `git diff --staged` で、キーやパスワードが混ざっていないか確認する

## 実装ルール

細かい実装ルール（送信間隔、`vercel.json`、スマホのボタン設定、ゲームループの止め方、`crypto.randomUUID()` を使わないことなど）は [docs/初期構想.md](docs/初期構想.md) の「実装ルール」と [docs/タスク.md](docs/タスク.md) の「各タスクのメモ」に従う。
