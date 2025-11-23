import { makeHeaders } from '../headers.js';

export async function gofile(url: string): Promise<string> {
    // TODO Deno Deployでcdnミラーを作る
    if (url.startsWith('https://cdn.discord')) return url;

    const resp = await fetch(url, { headers: makeHeaders({}) });
    if (Number(resp.headers.get('Content-Length') || 0) < 500) return url;
    console.log('file was fetched');

    let fileName = 'video.mp4';
    // やる気ゼロクソコード
    const splited = url.split('/');
    if (splited.length) {
        if (splited[splited.length - 1].includes('.')) {
            fileName = splited[splited.length - 1];
            if (!(fileName.indexOf('?') === -1)) fileName = fileName.split('?')[0];
        }
    }

    const acc: any = await fetch('https://api.gofile.io/accounts', {
        method: 'POST',
        headers: makeHeaders({}),
    }).then((res) => res.json());
    const token = acc['data']['token'];

    const folder: any = await fetch('https://api.gofile.io/contents/createfolder', {
        method: 'POST',
        headers: {
            ...makeHeaders({}),
            authorization: 'Bearer ' + token,
            'content-type': 'application/json',
        },
        body: JSON.stringify({ parentFolderId: acc['data']['rootFolder'], public: true }),
    }).then((res) => res.json());

    const form = new FormData();
    form.append('token', token);
    form.append('folderId', folder['data']['id']);
    form.append('file', await resp.blob(), fileName);

    const result: any = await fetch('https://upload.gofile.io/uploadfile', {
        method: 'POST',
        headers: makeHeaders({}),
        body: form,
    }).then((res) => res.json());

    if (!result['data']['downloadPage']) throw Error('upload failure');
    return result['data']['downloadPage'];
}
