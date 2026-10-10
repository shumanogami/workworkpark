# CLAUDE.md

石巻ハッカソンのチーム開発リポジトリ（workworkpark）。複数のメンバーがそれぞれのClaude Codeで同時に作業する前提のルール。

## プロジェクト概要

- テーマ：「仲間の結束をふかめるゲームを作ろう！！」
- PC画面がゲーム本体、各自のスマホがコントローラーになる2〜8人用ゲーム
- 最初に作るゲーム：「Jump the highest」
- **仕様の正は [初期構想.md](初期構想.md)**。実装前に必ず読む。仕様を変えるときは `初期構想.md` も同じPRで更新する

## 技術スタック

- TypeScript ＋ Vite ＋ React
- 描画：HTML5 Canvas／物理処理：自作（ライブラリなし）
- 通信：Supabase Realtime（Broadcastで操作送信、Presenceで参加人数管理）
- 公開：Vercel（mainにpushすると自動公開）
- すべて無料枠で構築する。有料サービスや新しいライブラリを足すときは、PRの説明に理由を書く

## 基本的な振る舞い

- 回答・コミットメッセージ・PRの説明は日本語で書く
- メンバーには非エンジニアもいる。技術用語には一言で補足を添える
- 作業の前に「何をするか」を一言伝えてから実行する

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

### 作業を終えるとき

1. `gh pr create` でPull Request（変更の提案）を作る。説明には「何を・なぜ・どう確認したか」を書く
2. 他のメンバーが確認してからmainにマージする。急ぎのときはチャットで一声かけてからマージする
3. マージ後はmainに戻って `git pull` する

### 禁止事項

- **mainへの直接push、force push（`git push --force`）はしない**。mainは常に動く状態を保つ
- 他の人のブランチを勝手に書き換えない
- コンフリクトが自分で判断できないときは、勝手に片方を消さず、メンバーに確認する

## 秘密情報の扱い（公開リポジトリ）

- SupabaseのURLと`anon key`は `.env.local` に `VITE_` で始まる名前で書く（例：`VITE_SUPABASE_URL`）。`.env.local` は `.gitignore` で除外し、絶対にコミットしない
- **`service_role` キーはコード・リポジトリ・PRの説明に一切書かない**
- コミット前に `git diff --staged` で、キーやパスワードが混ざっていないか確認する

## 実装ルール

細かい実装ルール（送信間隔、`vercel.json`、スマホのボタン設定、ゲームループの止め方など）は [初期構想.md](初期構想.md) の「実装ルール」に従う。
