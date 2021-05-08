const fetch = require('node-fetch');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const {unescape} = require('html-escaper');
const log = require('../log');
const config = require('../../../config');

let token;

const getToken = async () => {
    try {
        if (config.authToken) return config.authToken;

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

        return dom.window.document.querySelector('div').textContent;
    } catch (error) {
        token = null;
        log.info(`Something wrong with WebUI. Check port in config.js.\nПроизошла ошибка, нет доступа до ${config.apiTorrentUrl}:${config.port}/gui\nПроверьте правильность ввода данных в config.js, попробуйте сменить порт.`);
    }
};

const requestWithToken = async (url) => {
    if (!token) {
        token = await getToken();
    }

    try {
        return fetch(url + `&token=${token}`,
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
    } catch (error) {
        token = null;
        log.info('Request error. Ошибка получения данных!');
        throw error;
    }
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
