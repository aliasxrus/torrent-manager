const log = require('../middleware/log');
const {autoDownloadTimeOut, autoDownloadDeleteTorrentFile} = require('../../config');
const {setTorrentLabel, controlTorrent, requestWithToken} = require('../middleware/api/torrent');
const WebTorrent = require('webtorrent-hybrid');
WebTorrent.setMaxListeners(Infinity);
const client = new WebTorrent({
    utp: false,
});

client.on('error', function (error) {
    log.info(error);
})

const addTorrent = async ({hash, downloadDir, name}) => {
    if (client.get(hash)) {
        return refreshTorrentInfo(hash);
    }

    await downloadTorrent(hash, downloadDir, name);
};

const downloadTorrent = async (hash, downloadDir, name = '') => {
    if (downloadDir.endsWith(name)) {
        downloadDir = downloadDir.substring(0, downloadDir.length - name.length);
    }

    const {settings} = await requestWithToken(`/gui/?action=getsettings`);
    const path = settings.find(key => key[0] === 'dir_active_download')[2] || downloadDir;

    log.info(`Preparing to download:`, name, hash, path);
    client.add(`magnet:?xt=urn:btih:${hash}`, {
        // announce: [String],        // Torrent trackers to use (added to list in .torrent or magnet uri)
        // getAnnounceOpts: Function, // Custom callback to allow sending extra parameters to the tracker
        // maxWebConns: Number,       // Max number of simultaneous connections per web seed [default=4]
        path,            // Folder to download files to (default=`/tmp/webtorrent/`)
        // path: './wt_tmp',              // Folder to download files to (default=`/tmp/webtorrent/`)
        // private: Boolean,          // If true, client will not share the hash with the DHT nor with PEX (default is the privacy of the parsed torrent)
        // store: Function            // Custom chunk store (must follow [abstract-chunk-store](https://www.npmjs.com/package/abstract-chunk-store) API)
        // destroyStoreOnDestroy: Boolean // If truthy, client will delete the torrent's chunk store (e.g. files on disk) when the torrent is destroyed
    }, (torrent) => {
        if (!torrent.startTime) torrent.startTime = new Date();
        log.info(`Torrent downloading:`, torrent.name, torrent.infoHash, torrent.path);
        setTorrentLabel(torrent.infoHash, `TM: Начинаем скачивание... [${new Date().toLocaleTimeString()}]`);
    });
};

const refreshTorrentInfo = async (hash) => {
    const torrent = client.get(hash);

    if (torrent.done) {
        return finishDownloadTorrent(torrent);
    }

    if (!torrent.startTime) torrent.startTime = new Date();
    if (new Date().getTime() - torrent.startTime.getTime() > autoDownloadTimeOut * 60 * 1000) {
        client.remove(torrent.infoHash, {destroyStore: true}, () => {
            log.info(`Download timeout, torrent destroyed:`, torrent.name, torrent.infoHash, torrent.path);
        });
        await controlTorrent(torrent.infoHash, autoDownloadDeleteTorrentFile ? 'removedatatorrent' : 'removedata');
    }

    if (!torrent.ready) {
        return setTorrentLabel(torrent.infoHash, `TM: Подготовка к скачиванию... [${new Date().toLocaleTimeString()}]`);
    }

    const progress = (torrent.progress * 100).toFixed(2);
    const speed = Math.round(torrent.downloadSpeed / 1024);
    await setTorrentLabel(torrent.infoHash, `TM: Скачивание ${progress}%, ${torrent.numPeers} peers, ${speed} Kb [${new Date().toLocaleTimeString()}]`);
};

const finishDownloadTorrent = async (torrent) => {
    await setTorrentLabel(torrent.infoHash, `TM: Downloaded. Загружен, обработка... [${new Date().toLocaleTimeString()}]`);

    await controlTorrent(torrent.infoHash, 'recheck');
    await controlTorrent(torrent.infoHash, 'start');

    client.remove(torrent.infoHash, {destroyStore: false}, () => {
        log.info(`Downloaded:`, torrent.name, torrent.infoHash, torrent.path);
    });
};

const checkTorrentsOnClient = async (uTorrents) => {
    client.torrents.forEach(wTorrent => {
        const uTorrent = uTorrents.find(el => el.hash.toLowerCase() === wTorrent.infoHash.toLowerCase());

        if (!uTorrent) {
            client.remove(wTorrent.infoHash, {destroyStore: true}, () => {
                log.info(`Torrent not found, torrent destroyed:`, wTorrent.name, wTorrent.infoHash, wTorrent.path);
            });
        }
    });
};

module.exports = {
    addTorrent,
    checkTorrentsOnClient,
};
