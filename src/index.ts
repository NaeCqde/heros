import { load } from 'cheerio';
import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';

import { inArray, isNull, lt } from 'drizzle-orm';
import { eros, monsnodes, pendings } from './schema.js';
import { fetchMonsode } from './source/monsnode.js';
import { fetchTwiVideo } from './source/twivideo.js';
import { Video } from './types.js';

export default {
    async scheduled(
        controller: ScheduledController,
        env: Env,
        ctx: ExecutionContext
    ): Promise<void> {
        const minutes = new Date(controller.scheduledTime).getUTCMinutes();
        const db = drizzle(env.DB);

        switch (true) {
            case minutes % 30 === 0:
                console.log('Fetching monsode and twivideo videos');

                const mon = await fetchMonsode();
                console.log('Fetched monsode videos:', mon.length);
                //console.log(pen);
                if (mon.length) {
                    await db.insert(monsnodes).values(mon.slice(0, 50)).onConflictDoNothing();
                    if (mon.length > 50)
                        await db.insert(monsnodes).values(mon.slice(50, 100)).onConflictDoNothing();
                }

                const pen = await fetchTwiVideo();
                console.log('Fetched twivideo videos:', pen.length);
                //console.log(videos);
                if (pen.length) {
                    await db.insert(pendings).values(pen.slice(0, 50)).onConflictDoNothing();
                }

                console.log('Complete');

                await db
                    .delete(eros)
                    .where(lt(eros.timestamp, new Date(Date.now() - 1000 * 60 * 60 * 24)))
                    .limit(50);
                return;

            case minutes % 5 === 0:
                console.log('Send to discord');
                const videos = await db.select().from(eros).where(isNull(eros.timestamp)).limit(20);

                for (const [i, v] of Object.entries(videos)) {
                    console.log(v);
                    //send to discord channel
                    await sendToDiscord(env.WEBHOOK_URL, v);
                    //2回に1度10秒スリープ
                    if (Number(i) && Number(i) % 2 == 0) {
                        await sleep(10);
                    }
                }

                await db
                    .update(eros)
                    .set({ timestamp: new Date() })
                    .where(
                        inArray(
                            eros.thumbnail,
                            videos.map((v) => v.thumbnail)
                        )
                    );

                console.log('used ' + videos.length);
                console.log('Complete');
                return;
            case minutes % 3 === 0:
                console.log('Running extract task');
                await workMonsode(db);
                console.log('Complete');
                return;
            default:
                console.log('Running upload task');
                await workUpload(env.UPLOADER, db);
                console.log('Complete');
                return;
        }
    },
    /*
    async fetch(request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);
        if (url.pathname === '/upload') {
            const thumbnail = infinityDecode(url.searchParams.get('thumbnail') || '');
            if (!thumbnail) {
                return new Response('?thumbnail=<thumbnail> is required', { status: 400 });
            }

            const src = infinityDecode(url.searchParams.get('src') || '');
            if (!src) {
                return new Response('?src=<src> is required', { status: 400 });
            }

            const video = await upload(thumbnail, src);

            return Response.json(video);
        } else {
            return new Response('not found', { status: 404 });
        }
    },*/
} satisfies ExportedHandler<Env>;

/*
function infinityDecode(text: string) {
    if (text.includes('%')) {
        text = decodeURIComponent(text);
        infinityDecode(text);
    }

    return text;
}
*/

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

export async function workMonsode(db: DrizzleD1Database): Promise<void> {
    //サブリクエスト 最大50 -2query = 48
    const videos = await db.delete(monsnodes).limit(10).returning();
    console.log('get ' + videos.length);
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
async function workUpload(uploader: string, db: DrizzleD1Database): Promise<void> {
    //サブリクエスト 5*9 = 45
    const videos = await db.delete(pendings).limit(5).returning();
    console.log('get ' + videos.length);
    if (!videos.length) return;

    let completed = 0;
    for (const [i, v] of Object.entries(videos)) {
        const resp = await fetch(uploader + '/upload', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify(v),
        });
        if (!resp.ok) {
            console.error(resp.status + ': ' + (await resp.text()));
            continue;
        }

        videos[Number(i)] = await resp.json();
        completed++;
    }

    await db.insert(eros).values(videos).onConflictDoNothing();
    console.log(completed + ' completed');
}

// Cloudflare WorkersはsetTimeoutを使えないためhttpbin様様の力を借りてスリープする
async function sleep(seconds: number = 0): Promise<void> {
    if (!seconds) return;

    // @ts-expect-error
    await fetch(`https://httpbin.org/delay/${seconds}`, { cacheTtl: 0 });
}
