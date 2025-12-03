# エロ動画 スクレイパー for Cloudflare Workers

### [This project uses Discord Hono](https://discord-hono.luis.fun/)

## 機能

・定期的に、エロ動画を Discord チャンネルに送信します！

・[ファイルアップローダー](https://github.com/NaeCqde/heros-uploader)を、Discord コマンドから使えるようにします！

## フローチャート

中身はシンプル！

以下の工程を、1 回の cron 召喚あたり 1 工程で進めます。

cron 召喚を跨いでデータの受け渡しをするために Drizzle ORM で DB を使用しています。

1. [TwiVideo](https://twivideo.net/?realtime)と[Monsnode](https://monsnode.com/)から、
   たくさんのサムネイル,動画リンクのセットを取得
2. Monsnode から取得した動画リンク`/twjn.php?v=`を踏み、
   `https://video.twimg.com/`から始まるリンクを取得する
   ※TwiVideo はやる必要がない
3. [ファイルアップローダー](https://github.com/NaeCqde/heros-uploader)を用いて、
   サムネイルを[Catbox](https://catbox.moe/)、
   動画を[GoFile](https://gofile.io/)にアップロード
4. Webhook で送信！

### ※Discord-Hono を使い始めようと思ってる開発者に注意

僕みたいに JavaScript を雰囲気で使っている人は、[`index.ts`の最後](https://github.com/NaeCqde/heros/blob/main/src/index.ts#L166)を絶対に変えないでください。

変えると`Cannot read private member #discord from an object whose class did not declare it`というエラーが発生します。

なぜこうなるかの説明は、省略します。
