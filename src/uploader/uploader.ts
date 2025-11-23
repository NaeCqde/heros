// ファイルサイズが一定以上になるとメモリサイズ上限突破のエラーが出るためWIP
import type { Video } from '../types.js';
import { catbox } from './catbox.js';
import { gofile } from './gofile.js';

// サブリクエストコスト：５
export async function upload(thumbnail: string, src: string): Promise<Video> {
    thumbnail = await catbox(thumbnail);
    console.log(thumbnail);

    src = await gofile(src);
    console.log(src);

    return { thumbnail, src };
}
