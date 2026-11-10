# heros 仕様

動画のリンクとサムネイルを集め、アップローダーで再ホストして、Discord のチャンネルに Webhook で定期送信する Cloudflare Workers の Bot(Discord Hono)。
Discord のコマンドで、アップローダー([heros-uploader](https://github.com/NaeCqde/heros-uploader))を直接使うこともできる。
仕様を変えたときは、このファイルも必ず更新する。

## 構成

| ファイル | 役割 |
|---|---|
| `src/index.ts` | Bot の定義、cron の処理(取得・抽出・アップロード・送信) |
| `src/cmd/image.ts`, `src/cmd/video.ts` | スラッシュコマンド `image`, `video` |
| `src/source/monsnode.ts`, `src/source/twivideo.ts` | 一覧ページの取得と解析(cheerio) |
| `src/uploader/*` | Catbox / GoFile へのアップロード(アップローダー本体は別リポジトリ) |
| `src/schema.ts` | Drizzle のテーブル定義(D1) |
| `src/consts.ts`, `src/headers.ts`, `src/types.d.ts` | 定数、ブラウザ風ヘッダー、型 |
| `src/register.ts` | スラッシュコマンドの登録(`pnpm`/`tsx` で実行) |
| `wrangler.jsonc`, `drizzle/migrations/` | Workers の設定、D1 の移行 |

## 設定

`wrangler.jsonc` の `vars`: `UPLOADER`(アップローダーの URL)、`APPLICATION_ID`、`PUBLIC_KEY`。cron は毎分 `* * * * *`。D1 のバインディングは `DB`。
シークレット(`.dev.vars`、本番は wrangler secret): `BOT_TOKEN`、`WEBHOOK_URL`(送信先の Webhook)。

## データ(D1)

| テーブル | 列 | 意味 |
|---|---|---|
| `monsnodes` | `src`(主キー), `thumbnail` | Monsnode から集めた、動画の実体をまだ調べていないもの |
| `pendings` | `src`(主キー), `thumbnail` | アップロード待ち |
| `eros` | `thumbnail`(主キー), `src`, `timestamp`(null 可) | アップロード済み。`timestamp` が null なら未送信、日時があれば送信済み |

挿入は `onConflictDoNothing`(重複は無視)。

## cron(毎分)

起動した時刻の「分」(UTC)で、1 回の起動につき 1 つの工程だけを行う。上から順に当てはまったもの。

| 条件 | 工程 |
|---|---|
| 分が 30 の倍数(0, 30) | **取得**。Monsnode の一覧と TwiVideo の一覧を取得して、`monsnodes`(最大 100 件)と `pendings`(最大 50 件)に入れる。送信済みで 24 時間たった `eros` を最大 50 件消す |
| 分が 5 の倍数 | **送信**。`eros` の未送信を 20 件まで取り、Webhook に 1 件ずつ送る(埋め込み: タイトル「動画を開く」、リンク=動画、画像=サムネイル)。3 件目以降は 2 件ごとに 10 秒待つ。送ったものの `timestamp` を現在時刻にする |
| 分が 3 の倍数 | **抽出**。`monsnodes` から 10 件を取り出して削除し、各ページの `<script>` 内の `atob("...")` を調べ、デコードした結果が `https://video.twimg.com` で始まるものを動画の URL にして `pendings` へ移す |
| それ以外 | **アップロード**。`pendings` から 5 件を取り出して削除し、`UPLOADER` に `{thumbnail, src}` を POST する。成功したものを `eros` に入れる |

- 1 回の起動のサブリクエストには上限(50)があり、それに収まる件数にしてある。
- 待ち時間は `setTimeout` が使えないため、`httpbin.org/delay/N` への fetch で代用している。
- TwiVideo の一覧は、リンクの `?` 以降を捨てる。

## スラッシュコマンド

どちらもギルドとユーザーのインストールに対応。省略可能な `public`(真偽)が偽なら、応答は本人にだけ見える(EPHEMERAL)。

| コマンド | 動作 |
|---|---|
| `/image file:<画像>` | 添付が `image/` で始まる種類のときだけ受ける。`UPLOADER` に `{thumbnail: 添付のproxy_url}` を POST し、返ってきた `thumbnail`(Catbox の URL)を返信する |
| `/video file:<ファイル>` | `UPLOADER` に `{src: 添付のproxy_url}` を POST し、返ってきた `src`(GoFile の URL)を返信する |

アップローダーが 400 を返したら「提供されたリソースにアクセスできません」、それ以外の失敗は「エラーが発生しました」。メンションは許可しない(`allowed_mentions.parse = []`)。

## アップロード(`src/uploader`)

- サムネイル: Catbox の `urlupload` で URL から取り込み、返った URL を使う。
- 動画: すでに `https://cdn.discord` で始まる URL ならそのまま。そうでなければ取得し、`Content-Length` が 500 未満ならそのまま返す。GoFile のアカウントを作ってフォルダー(公開)を作り、アップロードして `downloadPage` を返す。失敗したら例外。
- 大きなファイルはメモリ上限で失敗しうる(作業中の機能)。

## セキュリティ上の注意

- 受け取る HTTP は、Discord の署名つきのやり取りだけ(`PUBLIC_KEY` で検証。Discord Hono が行う)。
- トークンと Webhook の URL はシークレットに置き、コードやログに出さない。
- 取得した一覧のリンクを、そのまま `fetch` している(抽出工程とアップロード工程)。接続先は外部サイトのデータで決まる。
- コマンドの `UPLOADER` へ渡す URL は Discord の添付(`proxy_url`)だけ。
