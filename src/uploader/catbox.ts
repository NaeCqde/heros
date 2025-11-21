import { makeHeaders } from '../headers.js';

export async function catbox(url: string): Promise<string> {
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
