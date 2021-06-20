const fetch = require('node-fetch');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const {unescape} = require('html-escaper');
const log = require('../log');
const config = require('../../../config');
const webTorrent = require('../../webTorrent');

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

const setTorrentLabel = async (hash, label) => {
    // Удаление старой метки
    await requestWithToken(`${config.apiTorrentUrl}:${config.port}/gui/?action=setprops&s=label&hash=${hash}&v=`);
    // Добавление новой метки
    await requestWithToken(`${config.apiTorrentUrl}:${config.port}/gui/?action=setprops&s=label&hash=${hash}&v=${encodeURIComponent(label)}`);
};

const controlTorrent = async (hash, action) => {
    // action: start, pause, stop
    await requestWithToken(`${config.apiTorrentUrl}:${config.port}/gui/?action=${action}&list=1&hash=${hash}`);
};

const stopActiveDownloads = async (torrents) => {
    const seedingTorrents = [];

    for (let i = 0; i < torrents.length; i++) {
        if (torrents[i].statusText.startsWith('Seeding')) {
            seedingTorrents.push(torrents[i]);
            continue;
        }

        if (torrents[i].statusText.startsWith('Downloading')) {
            await controlTorrent(torrents[i].hash, 'stop');
            await setTorrentLabel(torrents[i].hash, `TM: Остановлен! [${new Date().toLocaleTimeString()}]`);
            continue;
        }

        if (config.autoDownload && torrents[i].statusText.startsWith('Stopped')) {
            await webTorrent.addTorrent(torrents[i]);
            await setTorrentLabel(torrents[i].hash, `TM: В обработке... [${new Date().toLocaleTimeString()}]`);
        }
    }

    return seedingTorrents;
}

const getTorrents = async () => {
    const {torrents: torrentsArray} = await requestWithToken(`${config.apiTorrentUrl}:${config.port}/gui/?list=1`);

    let torrents = torrentsArray.map(el => {
        return {
            hash: el[0], // string
            status: el[1], // integer: 1 = Started, 2 = Checking, 4 = Start after check, 8 = Checked, 16 = Error, 32 = Paused, 64 = Queued, 128 = Loaded
            name: el[2], // string
            size: el[3], // integer in bytes
            percentProgress: el[4], // integer in per mils (100% = 1000)
            downloaded: el[5], // integer in bytes
            uploaded: el[6], // integer in bytes
            ratio: el[7], // integer in per mils
            uploadSpeed: el[8], // integer in bytes per second
            downloadSpeed: el[9], // integer in bytes per second
            eta: el[10], // integer in seconds
            label: el[11], // string
            peersConnected: el[12], // integer
            peersInSwarm: el[13], // integer
            seedsConnected: el[14], // integer
            seedsInSwarm: el[15], // integer
            availability: el[16], // integer in 1/65536ths - доступность
            torrentQueueOrder: el[17], // integer - место в очереди на закачку
            remaining: el[18], // integer in bytes - сколько осталось

            u19: el[19], // string
            u20: el[20], // string
            statusText: el[21], // string (Downloading 8.6 %)
            u22: el[22], // string - порядковый номер?
            u23: el[23], // integer - время?
            u24: el[24], // integer - время?
            u25: el[25], // integer
            downloadDir: el[26], // string
            u27: el[27], // integer
            u28: el[28], // string - хеш?
        };
    });

    // Останавливаем загружающиеся и начинаем закачку сами
    if (config.stopActiveDownloads) {
        torrents = await stopActiveDownloads(torrents);
    }

    return torrents;
};

const getPeers = async () => {
    const torrents =  await getTorrents();

    const allPeers = [];
    while (torrents.length) {
        const hashArray = torrents.splice(0, 20).map(value => `&hash=${value.hash}`).join('');
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


/*
Country         string
  IP              string
  Hostname        string
  UTP             int
  Port            int
  Client          string
  Flags           string
  PercentProgress int
  DownloadSpeed   int
  UploadSpeed     int
  ReqsOut         int
  ReqsIn          int
  Waited          int
  Uploaded        int
  Downloaded      int
  Hasherr         int
  Peerdl          int
  Maxup           int
  Maxdown         int
  Queued          int
  Inactive        int
  Relevance       int
* */
