const path = require('path');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const {ungzip} = require('node-gzip');
const parser = require('xml2json');
const mapId = require('./epgMap.json');
const iptv = require('./iptv.json');

module.exports = (async () => {
    const url = 'https://iptvx.one/EPG_LITE';
    const XMLdata = await fetch(url).then(a => a.blob()).then(a => a.arrayBuffer())
    const xml = (await ungzip(XMLdata)).toString();
    let jObj = parser.toJson(xml);

    const res = JSON.parse(jObj);

    res.tv.channel = res.tv.channel.filter(({id}) => {
        if(Object.values(mapId).some(a => a === id)){
            return true
        }
        return !!iptv.some(a => a.id === id);
    })

    res.tv.programme = res.tv.programme.filter(({channel}) => {
        if(Object.values(mapId).some(a => a === channel)){
            return true
        }
        return !!iptv.some(a => a.id === channel);
    })


    console.log('done');
    const startStr = '<?xml version="1.0" encoding="utf-8"?>\n' +
        '<!DOCTYPE tv SYSTEM "https://iptvx.one/xmltv.dtd">'
    fs.writeFileSync(path.join(__dirname, './epg.xml') , startStr + parser.toXml(res))
})()
