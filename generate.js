const mapId = require('./epgMap.json');
const iptv = require('./iptv.json');
const {M3uPlaylist, M3uMedia} = require("m3u-parser-generator");
const cliProgress = require('cli-progress');
const path = require('path');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const parseSearch = [
    'BCU',
    'amedia',
    'tv1000',
    'Hollywood',
    'футбол',
    '2x2',
    '.red',
    '.black',
    '.sci-fi',
    'cineman',
    'vip',
    'fox',
    'paramount',
    'setanta',
    'Шокирующее',
    'кино',
    'eurosport 2',
    'DAZN'
]

const disabled = [
    '[PL]',
    '[US]'
]

const unstable = [
    'Setanta Sports Ukraine HD',
    '2x2 HD'
]

module.exports = (async () => {
    const playlist = new M3uPlaylist();
    const playlist2 = new M3uPlaylist();
    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    for (const s of iptv) {
        const media1 = new M3uMedia(s.url);
        media1.name = s.name;
        media1.attributes = {"tvg-id": s.id}
        playlist.medias.push(media1);
        playlist2.medias.push(media1)
    }
    bar1.start(parseSearch.length, 0);
    for (const s of parseSearch) {
        const html = await fetch('https://acestreamsearch.net/?q=' + s).then(s => s.blob()).then(s => s.text());
        const m = html.matchAll(/<a href="acestream:(.*?)<\/a>/gm);
        for (const result of m) {
            const url = result[0].match(/href="(.*?)"/)[1];
            const title = result[0].match(/>(.*?)</)[1]
                .replace('[RU]', '').trim();
            if (!disabled.some(a => title.indexOf(a) !== -1)) {

                if (result[0].indexOf('<small>') !== -1 || unstable.some(a => a === title)) {
                    if (!playlist.medias.some(({name}) => name === title)) {
                        const media1 = new M3uMedia(url);
                        media1.name = title;
                        if (mapId[title]) {
                            media1.attributes = {"tvg-id": mapId[title]}
                        } else {
                            mapId[title] = '';
                        }
                        playlist.medias.push(media1);
                        const location = `http://127.0.0.1:6878/ace/getstream?id=${url.replace('acestream://', '')}&hlc=1&spv=0`;
                        playlist2.medias.push({
                            ...media1,
                            location
                        });
                    }
                }

            }

        }
        bar1.increment();
    }

    bar1.stop();

    playlist2.medias.sort((a, b) => a.name < b.name ? -1 : 1);

    fs.writeFileSync(path.join(__dirname, './epgMap.json'), JSON.stringify(mapId))
    fs.writeFileSync(path.join(__dirname, '/acestream2.m3u'), playlist2.getM3uString()
        .replace('#EXTM3U', '#EXTM3U url-tvg="https://iptvx.one/EPG_NOARCH"')
    );
    fs.writeFileSync(path.join(__dirname, '/acestream.m3u'), playlist.getM3uString()
        .replace('#EXTM3U', '#EXTM3U url-tvg="https://iptvx.one/EPG_NOARCH"')
    );
})()
