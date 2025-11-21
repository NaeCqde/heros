export function makeHeaders(cookies: Record<string, string>): Record<string, string> {
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
