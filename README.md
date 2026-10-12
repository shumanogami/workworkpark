# workworkpark

石巻ハッカソン。スマホをコントローラー、PCをゲーム画面にする対戦ゲーム。

- 仕様：[docs/初期構想.md](docs/初期構想.md)
- タスク：[docs/タスク.md](docs/タスク.md)
- 開発環境の確認：[docs/環境確認.md](docs/環境確認.md)
- 公開URL：https://workworkpark.vercel.app （PC画面）／ https://workworkpark.vercel.app/controller （スマホ）

## 前提条件

| 必要なもの | バージョン・内容 | 確認方法 |
|---|---|---|
| Node.js | **24系（LTS）**。`.nvmrc` と `package.json` の `engines` で指定 | `node -v` → `v24.x.x` |
| Git | 任意の最新版 | `git --version` |
| GitHub | このリポジトリの Collaborator 権限 | ― |
| Supabase | プロジェクト（東京リージョン、無料プラン）の URL と publishable キー | ダッシュボード > Project Settings > API Keys |
| Vercel | リポジトリと連携済みのプロジェクト（Hobby・無料） | ― |

## 初回セットアップ

```sh
git clone https://github.com/shumanogami/workworkpark.git
cd workworkpark
npm ci                       # package-lock.json どおりの版で依存パッケージを導入
cp .env.example .env.local   # PowerShell の場合：Copy-Item .env.example .env.local
```

`.env.local` を開いて値を入れる（このファイルは Git に含まれない）。

| 変数名 | 値 |
|---|---|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` 形式のプロジェクト URL |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_` で始まるキー（変数名は ANON_KEY だが、旧 `anon` キーは2026年末で廃止予定のため値には使わない） |

```sh
npm run dev   # http://localhost:5173 で起動
```

## 外部サービスの設定

### Supabase

- リージョン：東京（Northeast Asia (Tokyo)）
- Realtime の「Allow public access」は**有効のまま**にする（初期値は有効）。チャンネルを公開で使うため。
- 無料プランは1週間使わないと一時停止する。止まっていたらダッシュボードから再開する。

### Vercel

- Project Settings > Environment Variables に、`.env.local` と**同じ名前・同じ値**の2つを登録する（Production・Preview の両方）。
- 環境変数を追加・変更したら、再デプロイしないと反映されない。
- `main` に push すると自動でデプロイされる。

## よく使うコマンド

```sh
npm run dev     # 開発サーバー
npm run build   # 型チェック＋本番ビルド（push 前に確認）
npm test        # 自動テスト（Vitest）
npm run lint    # lint（oxlint）
```

## スマホからの確認

- **会場や外出先**：Vercel の URL（https）を開く。会場の共有 Wi-Fi は端末同士の通信が遮断されていることがあるため。スマホはモバイル回線でもよい。
- **自宅など**：PC と同じ Wi-Fi で、`npm run dev` 実行時に表示される `Network: http://192.168.x.x:5173` を開く。つながらなければ Windows ファイアウォールで Node.js の通信（プライベートネットワーク）を許可する。

## QRコード（ルームコード）を固定する

- PC画面のルームコードは、**そのPCのブラウザに保存**される。同じPC・同じブラウザなら、タブを閉じても開き直しても同じQRコードになる
- 決まったコードにしたいとき（QRを印刷して貼っておくなど）は、PC画面を `https://workworkpark.vercel.app/?room=WORK` のように**英字4文字**を付けて開く。そのコードも保存され、次からは付けなくても同じになる
- 公開サイトなので、ほかのグループが同じコードを使うと同じ部屋に混ざる。思いつきにくいコードにする
- 同じブラウザで PC 画面を2つ開くと、2つとも同じ部屋になるので注意

### 本番の投影（ルーム PARK）

- 投影するPCは、最初に一度 https://workworkpark.vercel.app/?room=PARK を開く（以降はそのPCに保存される）
- 参加用のQRは、iPadで https://workworkpark.vercel.app/ipad-qr.html を開いて出しっぱなしにする（印刷不要）。QRの中身は `/controller?room=PARK`
- ルームコードを変えるときは `public/ipad-qr.html` のQRと文字を作り直す

## トラブルシューティング

| 症状 | 原因と対処 |
|---|---|
| 起動時に「Supabase の環境変数が未設定です」 | `.env.local` がない、または変数名が違う。変更後は `npm run dev` を再起動する |
| Vercel 上だけ通信できない | Vercel の環境変数が未登録、または登録後に再デプロイしていない |
| `git pull` 後に動かない | 依存パッケージが増えている。`npm ci` を実行する |
| スマホの操作が急に効かなくなった | デプロイ前から開きっぱなしで古いコードが動いている。スマホのページを再読み込みする |
