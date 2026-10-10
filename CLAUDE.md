# CLAUDE.md

このリポジトリで作業する Claude Code 向けの指示書。2人の開発者が共有する。

## プロジェクト概要

スマホをコントローラー、PCをゲーム画面にする対戦ゲーム（ハッカソン、3日間）。最初のゲームは「Jump the highest」。

- 仕様：[初期構想.md](初期構想.md)
- タスクと担当：[タスク.md](タスク.md)

仕様書・タスク一覧は補助資料。コード本体とそのコメントを正とし、両者がずれたらコードに合わせて資料を直す。

## コマンド

```sh
npm install      # 依存パッケージの導入（初回・package.json 更新後）
npm run dev      # 開発サーバー（http://localhost:5173）。同じWi-Fiのスマホからも開ける
npm run build    # 型チェック＋本番ビルド。push 前に通ることを確認する
npm run lint     # oxlint
npm test         # Vitest（物理処理・勝敗判定の自動テスト）
```

環境構築の手順は [README.md](README.md) を参照。

## 技術スタック

Vite＋React＋TypeScript、react-router、Tailwind CSS v4（DotGothic16 フォント、`font-dot`）、Supabase Realtime（Broadcast＋Presence）、Vitest、HTML5 Canvas、物理処理は自作。公開先は Vercel（`main` への push で自動デプロイ）。すべて無料枠で運用する。

## ディレクトリ構成

```
src/
  main.tsx                 # ルーティング：/ → PC画面、/controller → スマホ画面
  pages/
    HostPage.tsx           # PC：ホーム・ゲーム・リザルト
    ControllerPage.tsx     # スマホ：コントローラー（?room=ABCD でルーム指定）
  lib/
    supabase.ts            # Supabase クライアント（環境変数が未設定なら起動時にエラー）
  shared/
    messages.ts            # スマホ⇔PC間のメッセージの型（通信の取り決め）
```

<!-- 機能が増えたら追記する（例：src/game/ に物理・描画、src/realtime/ に Supabase 接続） -->

## 開発方針

1. **まず端から端までつなぐ。** 1日目のゴールは「スマホのボタンでPC上の四角が動く」。見た目の作り込みは2日目以降。
2. **物理処理と勝敗判定は純粋な関数にし、Vitest でテストする。** `step(state, inputs, dt) => 次の state` の形で、React・Canvas・通信に触らない。テストファイルは対象と同じ場所に `*.test.ts` で置く。画面・通信・スマホ操作は自動テストせず、実機で確認する。
3. **小さく頻繁に push する。** 動く単位ができたらすぐ push し、コンフリクトを小さく保つ。
4. **時間が足りないときは次の順に削る**：効果音 → 演出 → リザルト画面の作り込み。積み重なり（T8）と横衝突（T9）はゲームの核なので削らない。

## 設計ルール

- **PCが審判、スマホはリモコン。** 物理演算・勝敗判定・プレイヤーの色と番号の割り当てはPCだけが行う。スマホはボタンの状態を送り、PCから届いた状態を表示するだけ。
- **通信の型は `src/shared/messages.ts` に集約する。** 変更するときは、もう1人の開発者と合意してから。任意項目（`?`）の追加は影響が小さく、名前の変更・削除は両側の修正が必要になる。
- **送信の頻度**：ボタンが変化したときに送信し、ゲーム中のみ0.5秒ごとに送り直す。Supabase 無料枠（毎秒100件）を超えないこと。
- **ゲームループ**：`requestAnimationFrame` は `useEffect` 内で起動し、クリーンアップで必ず止める（StrictMode で二重に起動するため）。

## 注意点

- **秘密情報**：公開リポジトリ。Supabase のキーは `.env.local`（Git 管理外）に `VITE_` で始まる名前で書く。見本は `.env.example`。使うのは publishable キー（`sb_publishable_`）のみ。secret キー（旧 `service_role`）はコードにもリポジトリにも絶対に入れない。旧 `anon` キーは2026年末で廃止予定のため使わない。
- **`crypto.randomUUID()` を使わない**：https 以外（`http://192.168...` での開発）のスマホでは使えない。
- **スマホ対応**：iPhone・Android の両方で動くこと。ボタンには `touch-action: none` を付ける。iPhone の Safari は横向き固定に非対応のため、縦向きのときは案内を表示する。
- **URL の直接アクセス**：`vercel.json` の rewrites で全パスを `index.html` に返している。消さないこと。

## Git の運用

- ハッカソン期間中は `main` へ直接 push する。push 前に `git pull` で最新を取り込み、`npm run build` と `npm test` が通ることを確認する。
- パッケージを追加したら `package.json` と `package-lock.json` を両方コミットする。
- コミットメッセージは日本語で、先頭に種類を付ける（`feat:` 機能、`fix:` 修正、`docs:` 資料、`chore:` 設定など）。

## コーディング規約

- コメントは日本語で、「なぜそうしたか」を書く。
