# Adult video scraper for Cloudflare Workers

[日本語](README.md) | English

### [This project uses Discord Hono](https://discord-hono.luis.fun/)

## Features

- Sends adult videos to a Discord channel on a schedule.
- Makes the [file uploader](https://github.com/NaeCqde/heros-uploader) usable from Discord commands.

## Flow

The inside is simple.

One step of the following is done per cron invocation.

A database (Drizzle ORM) carries the data across cron invocations.

1. Get many sets of thumbnails and video links from [TwiVideo](https://twivideo.net/?realtime) and [Monsnode](https://monsnode.com/).
2. Follow the video link `/twjn.php?v=` from Monsnode and get the link that starts with `https://video.twimg.com/`.
   (Not needed for TwiVideo.)
3. With the [file uploader](https://github.com/NaeCqde/heros-uploader), upload the thumbnails to [Catbox](https://catbox.moe/)
   and the videos to [GoFile](https://gofile.io/).
4. Send it with a webhook.

### Note for developers who want to start with Discord-Hono

If you use JavaScript by feel, as I do, never change [the end of `index.ts`](https://github.com/NaeCqde/heros/blob/main/src/index.ts#L166).

If you do, you get the error `Cannot read private member #discord from an object whose class did not declare it`.

I leave out the explanation of why.
