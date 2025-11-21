import { load } from 'cheerio';

import { makeHeaders } from '../headers.js';
import { Video } from '../types.js';

export async function fetchTwiVideo(): Promise<Video[]> {
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

export function parseTwiVideo(html: string): Video[] {
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
