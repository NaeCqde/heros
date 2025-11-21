import { load } from 'cheerio';
import { inArray } from 'drizzle-orm';
import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';

import { eros, monsnode, pendings } from './schema.js';

export default {
    async scheduled(
        controller: ScheduledController,
        env: Env,
        ctx: ExecutionContext
    ): Promise<void> {
        const minutes = new Date(controller.scheduledTime).getUTCMinutes();
        const db = drizzle(env.DB);

        switch (true) {
            case minutes % 15 === 0:
                console.log('Fetching monsode and twivideo videos');

                const mon = await fetchMonsode();
                console.log('Fetched monsode videos:', mon.length);
                //console.log(pen);
                if (mon.length)
                    await db.insert(monsnode).values(mon.slice(0, 50)).onConflictDoNothing();

                const pen = await fetchTwiVideo();
                console.log('Fetched twivideo videos:', pen.length);
                //console.log(videos);
                if (pen.length)
                    await db.insert(pendings).values(pen.slice(0, 50)).onConflictDoNothing();
                return;
            case minutes % 5 === 0:
                console.log('Send to discord');
                const all = await db.select().from(eros);

                const count = Object.keys(all).length;
                const used = [];

                for (let i: number = 0; i < 45; i++) {
                    if (count <= i) break;
                    const video = all[i];
                    console.log(video);
                    //send to discord channel
                    await sendToDiscord(env.WEBHOOK_URL, video);
                    used.push(video.src);

                    //5回に一度15秒スリープ
                    if (i && i % 5 == 0) {
                        await sleep(15);
                    }
                }
                await db.delete(eros).where(inArray(eros.src, used));
                return;
            case minutes % 3 === 0:
                console.log('Running extract task');
                await workMonsode(db);
                return;
            default:
                console.log('Running upload task');
                await workUpload(db);
                return;
        }
    },
    async fetch(request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);
        if (url.pathname === '/upload') {
            const thumbnail = url.searchParams.get('thumbnail');
            if (!thumbnail) {
                return new Response('?thumbnail=<thumbnail> is required', { status: 400 });
            }

            const src = url.searchParams.get('src');
            if (!src) {
                return new Response('?src=<src> is required', { status: 400 });
            }

            const video = await upload(thumbnail, src);

            return Response.json(video);
        } else {
            return new Response('not found', { status: 404 });
        }
    },
} satisfies ExportedHandler<Env>;

async function sendToDiscord(webhook: string, video: Video) {
    const resp = await fetch(webhook, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(genBody(video.thumbnail, video.src)),
    });
    await resp.text().then((text) => console.log(text));
}

function genBody(thumbnail: string, src: string) {
    return {
        content: '🎬 新動画発見',
        embeds: [
            {
                title: '動画を開く',
                url: src,
                image: {
                    url: thumbnail,
                },
                color: 45300,
            },
        ],
    };
}

async function workMonsode(db: DrizzleD1Database): Promise<void> {
    //サブリクエスト 最大50 -2query = 48
    const videos = await db.delete(monsnode).limit(48).returning();
    if (!videos.length) return;

    for (const [i, v] of Object.entries(videos)) {
        const html = await fetch(v.src).then((res) => res.text());
        const $ = load(html);

        let url = $('a').attr('href');
        // @ts-ignore
        if (!(url.indexOf('?') === -1)) url = url.split('?')[0];

        // @ts-ignore
        videos[Number(i)].src = url;
    }

    await db.insert(pendings).values(videos).onConflictDoNothing();
}

async function workUpload(db: DrizzleD1Database): Promise<void> {
    //サブリクエスト 5*9 = 45
    const videos = await db.delete(pendings).limit(9).returning();
    if (!videos.length) return;

    for (const [i, v] of Object.entries(videos)) {
        videos[Number(i)] = await upload(v.thumbnail, v.src);
    }

    await db.insert(eros).values(videos).onConflictDoNothing();
}

async function fetchMonsode(): Promise<Video[]> {
    const html = await fetch('https://monsnode.com/').then((res) => res.text());
    return parseMonsode(html);
}

function parseMonsode(html: string): Video[] {
    const $ = load(html);

    // @ts-ignore
    const videos: Video[] = $('.listn > a')
        .toArray()
        .map(
            // @ts-ignore
            (el) => ({
                thumbnail: $(el).children('img').attr('src'),
                src: $(el).attr('href'),
            })
        )
        .filter((v) => v.thumbnail && v.src);

    return videos;
}

async function fetchTwiVideo(): Promise<Video[]> {
    const html = await fetch('https://twivideo.net/templates/view_lists.php', {
        method: 'POST',
        headers: {
            ...makeHeaders({ PHPSESSID: 'a' }),
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },

        body: 'offset=0&limit=50&tag=null&type=0&order=post_date&le=1000&ty=p4',
    }).then((res) => res.text());
    return parseTwiVideo(html);
}

function parseTwiVideo(html: string): Video[] {
    const $ = load(html);
    // @ts-ignore
    const videos: Video[] = $('.item_clk')
        .toArray()
        .map((el) => ({
            thumbnail: $(el).children('img').attr('src'),
            src: $(el).attr('href'),
        }))
        .filter((v) => v.thumbnail && v.src);

    for (const [i, v] of Object.entries(videos)) {
        if (!(v.src.indexOf('?') === -1)) videos[Number(i)].src = v.src.split('?')[0];
    }

    return videos;
}

// サブリクエストコスト：５
async function upload(thumbnail: string, src: string): Promise<Video> {
    thumbnail = await catbox(thumbnail);
    console.log(thumbnail);

    src = await gofile(src);
    console.log(src);

    return { thumbnail, src };
}

async function gofile(url: string): Promise<string> {
    const resp = await fetch(url, { headers: makeHeaders({}) });
    if (Number(resp.headers.get('content-length') || 0) < 500) return url;
    const blob = await resp.blob();

    const acc: any = await fetch('https://api.gofile.io/accounts', {
        method: 'POST',
        headers: makeHeaders({}),
    }).then((res) => res.json());
    const token = acc['data']['token'];
    console.log(acc);

    const folder: any = await fetch('https://api.gofile.io/contents/createfolder', {
        method: 'POST',
        headers: {
            ...makeHeaders({}),
            authorization: 'Bearer ' + token,
            'content-type': 'application/json',
        },
        body: JSON.stringify({ parentFolderId: acc['data']['rootFolder'], public: true }),
    }).then((res) => res.json());
    console.log(folder);

    const form = new FormData();
    form.append('token', token);
    form.append('folderId', folder['data']['id']);
    form.append('file', blob, 'video.mp4');
    console.log('video is fetched');

    const result: any = await fetch('https://upload.gofile.io/uploadfile', {
        method: 'POST',
        headers: makeHeaders({}),
        body: form,
    }).then((res) => res.json());

    return result['data']['downloadPage'];
}

async function catbox(url: string): Promise<string> {
    return await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        headers: {
            ...makeHeaders({}),
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: new URLSearchParams({
            reqtype: 'urlupload',
            userhash: '',
            url,
        }),
    }).then((res) => res.text());
}

// Cloudflare WorkersはsetTimeoutを使えないためhttpbin様様の力を借りてスリープする
async function sleep(seconds: number = 0): Promise<void> {
    if (!seconds) return;

    // @ts-expect-error
    await fetch(`https://httpbin.org/delay/${seconds}`, { cacheTtl: 0 });
}

interface Video {
    thumbnail: string;
    src: string;
}

function makeHeaders(cookies: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'ja',
        Cookie: Object.entries(cookies)
            .map(([k, v]) => `${k}=${v}`)
            .join(';'),
        Dnt: '1',
        Downlink: '10',
        Preferanonymous: '1',
        Priority: 'u=0, i',
        Rtt: '50',
        'Sec-Ch-Prefers-Color-Scheme': 'dark',
        'Sec-Ch-Ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Microsoft Edge";v="134"',
        'Sec-Ch-Ua-Arch': '"arm"',
        'Sec-Ch-Ua-Bitness': '"64"',
        'Sec-Ch-Ua-Form-Factors': '"Desktop"',
        'Sec-Ch-Ua-Full-Version': '"134.0.3124.68"',
        'Sec-Ch-Ua-Full-Version-List':
            '"Chromium";v="134.0.6998.89", "Not:A-Brand";v="24.0.0.0", "Microsoft Edge";v="134.0.3124.68"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-ch-Ua-Model': '""',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Ch-Ua-Platform-Version': '"15.4.0"',
        'Sec-Ch-Ua-Wow64': '?0',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0',
    };

    return headers;
}
