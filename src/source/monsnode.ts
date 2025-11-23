import { load } from 'cheerio';
import type { Video } from '../types.js';

export async function fetchMonsode(): Promise<Video[]> {
    const html = await fetch('https://monsnode.com/').then((res) => res.text());
    return parseMonsode(html);
}

export function parseMonsode(html: string): Video[] {
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
        );

    return videos;
}
