const fetch = require('node-fetch');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const {unescape} = require('html-escaper');
const config = require('../../../config');

const getToken = async () => {
    const html = await fetch(`${config.apiTorrentUrl}:${config.port}/gui/token.html`,
        {
            headers: {
                Authorization: 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64'),
            }
        })
        .then(res => {
            if (res.headers.raw()['set-cookie'] && res.headers.raw()['set-cookie'].find(el => el.startsWith('GUID='))) {
                config.guid = res.headers.raw()['set-cookie'].find(el => el.startsWith('GUID=')).split(';')[0];
            }
            return res.text();
        });

    const dom = new JSDOM(html);
    const divTag = dom.window.document.querySelector('div');
    if (!divTag) throw Error('Token not found');

    config.token = dom.window.document.querySelector('div').textContent;
};

const requestWithToken = (url) => {
    return fetch(url + `&token=${config.token}`,
        {
            headers: {
                Cookie: config.guid,
                Authorization: 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64'),
            }
        })
        .then(res => {
            if (res.headers.raw()['set-cookie'] && res.headers.raw()['set-cookie'].find(el => el.startsWith('GUID='))) {
                config.guid = res.headers.raw()['set-cookie'].find(el => el.startsWith('GUID=')).split(';')[0];
            }
            return res.text();
        })
        .then(unescape)
        .then(JSON.parse);
};

const getPeers = async () => {
    const {torrents} = await requestWithToken(`${config.apiTorrentUrl}:${config.port}/gui/?list=1`);

    const allPeers = [];

    while (torrents.length) {
        const hashArray = torrents.splice(0, 20).map(value => `&hash=${value[0]}`).join('');
        const {peers: peersData} = await requestWithToken(`${config.apiTorrentUrl}:${config.port}/gui/?action=getpeers${hashArray}`);
        allPeers.push(...peersData);
    }

    return allPeers;
};

module.exports = {
    getToken,
    getPeers,
    requestWithToken,
};
