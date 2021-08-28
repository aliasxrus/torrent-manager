const config = require('../../config');
const apiTorrent = require('./api/torrent');
const {findIpFilterPath} = require('./child_process');
const {setIpFilterPath, getIpFilterPath} = require('./fs');
const {addIpToFilter} = require('./fs');
const log = require('./log');

let blockedIp = [];

const block = async (peer) =>{
    log.info('Block', peer.ip, peer.client);
    await addIpToFilter(peer.ip);
    blockedIp.push(peer.ip);
};

const blockPeers = async (peers) => {
    if (blockedIp.length > 100000) blockedIp = [];

    for (let i = 0; i < peers.length; i++) {
        const peer = peers[i];
        if (blockedIp.includes(peer.ip)) continue;

        const isUtVersion = peer.client.includes('3.5.5') && config.filters.uTorrent;
        const isBtVersion = peer.client.includes('7.10.5') && config.filters.BitTorrent;
        const isLtVersion = peer.client.includes('1.2.2') && config.filters.LibTorrent;
        const withBttVersion = isUtVersion || isBtVersion || isLtVersion;
        if (!withBttVersion) {
            await block(peer);
            continue;
        }

        const clientWhiteList = peer.client.startsWith('μTorrent') ||
            peer.client.startsWith('BitTorrent') ||
            peer.client.startsWith('libtorrent') ||
            peer.client.startsWith('Unknown');

        if (!clientWhiteList) {
            await block(peer);
        }
    }

    await apiTorrent.requestWithToken(`/gui/?action=setsetting&s=ipfilter.enable&v=1`);
};

const parsePeersArray = async (peersArray) => {
    const peers = peersArray.filter(Array.isArray).flat().map(peer => {
        const client = peer[5].trim();
        return {ip: peer[1], utp: peer[3], client}
    });

    return peers;
};

const checkTorrents = async (torrents) => {
    const seedingTorrents = [];

    for (let i = 0; i < torrents.length; i++) {
        const {status, state, forced} = torrents[i].status;

        if (state === 'SEEDING') {
            seedingTorrents.push(torrents[i]);
            continue;
        }

        if (
            ['CHECKED'].includes(state) ||
            torrents[i].statusText.startsWith('Downloading metadata') ||
            torrents[i].statusText.startsWith('Connecting to peers')
        ) continue;

        if (state === 'DOWNLOADING') {
            await apiTorrent.controlTorrent(torrents[i].hash, 'stop');
            await apiTorrent.setTorrentLabel(torrents[i].hash, `TM: Остановлен! [${new Date().toLocaleTimeString()}]`);
            continue;
        }
    }

    return seedingTorrents;
}

const scan = async () => {
    if (!await getIpFilterPath()) {
        const ipFilterPath = await findIpFilterPath();
        await setIpFilterPath(ipFilterPath);
    }

    let torrents = await apiTorrent.getTorrents();

    // Останавливаем загружающиеся и начинаем закачку сами
    if (config.stopActiveDownloads) {
        torrents = await checkTorrents(torrents);
    }

    // Не блокировать/блокировать если 100%, условие в конфиг
    // Блокировать uTorrent если там 100%
    // Не блокируем если скорость отдачи меньше ххх, в конфиг

    const peersArray = await apiTorrent.getPeers(torrents);
    const peers = await parsePeersArray(peersArray);
    await blockPeers(peers);
}

module.exports = {
    scan,
};
