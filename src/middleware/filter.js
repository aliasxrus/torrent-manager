const config = require('../../config');
const apiTorrent = require('./api/torrent');
const {findIpFilterPath} = require('./child_process');
const {setIpFilterPath, getIpFilterPath} = require('./fs');
const {addIpToFilter} = require('./fs');
const webTorrent = require('../webTorrent');
const log = require('./log');

const version = (clientName) => {
    const reg = clientName.match(/(\d{1,2})\.(\d{1,2})\.(\d{1,2})/g);
    if (!reg) return [0, 0, 0];
    const mm = Array.from(reg)[0].split('.').map(e => parseInt(e));
    return [mm[0], mm[1], mm[2]];
}

let blockedIp = [];

const mu = config.filters.mu;
const bit = config.filters.bit;
const libtorrent = config.filters.libtorrent;
const unknown = config.filters.unknown;
const filterMu = peer => (peer.client.startsWith('μTorrent') || peer.client.startsWith('µTorrent')) && peer.version[0] >= mu.major && peer.version[1] >= mu.minor;
const filterBit = peer => peer.client.startsWith('BitTorrent') && peer.version[0] >= bit.major && peer.version[1] >= bit.minor;
const filterLibtorrent = peer => peer.client.startsWith('libtorrent') && peer.version[0] >= libtorrent.major && peer.version[1] >= libtorrent.minor && peer.version[2] >= libtorrent.micro;
const filterUnknown = peer => peer.client.startsWith('Unknown') && peer.version[0] >= unknown.major && peer.version[1] >= unknown.minor;

const blockPeers = async (peers) => {
    if (blockedIp.length > 100000) blockedIp = [];

    for (let i = 0; i < peers.length; i++) {
        const peer = peers[i];
        if (!filterMu(peer) &&
            !filterBit(peer) &&
            !filterLibtorrent(peer) &&
            !filterUnknown(peer) &&
            !blockedIp.includes(peer.ip)
        ) {
            log.info('Block', peer.ip, peer.client);
            await addIpToFilter(peer.ip);
            blockedIp.push(peer.ip);
        }
    }

    await apiTorrent.requestWithToken(`${config.apiTorrentUrl}:${config.port}/gui/?action=setsetting&s=ipfilter.enable&v=1`);
};

const parsePeersArray = async (peersArray) => {
    const peers = peersArray.filter(Array.isArray).flat().map(peer => {
        const client = peer[5].trim();
        return {ip: peer[1], utp: peer[3], client, version: version(client)}
    });

    return peers;
};

const checkTorrents = async (torrents) => {
    const seedingTorrents = [];

    for (let i = 0; i < torrents.length; i++) {
        const {status, state, forced} = torrents[i].status;
        log.info(status, state, forced, torrents[i].statusText);
        // todo Отсеивать уже скачанное, сейчас идёт оставновка
        if (torrents[i].statusText.startsWith('Downloading metadata')) continue;

        if (state === 'SEEDING') {
            seedingTorrents.push(torrents[i]);
            continue;
        }

        if (state === 'DOWNLOADING') {
            await apiTorrent.controlTorrent(torrents[i].hash, 'stop');
            await apiTorrent.setTorrentLabel(torrents[i].hash, `TM: Остановлен! [${new Date().toLocaleTimeString()}]`);
            await apiTorrent.requestWithToken(`${config.apiTorrentUrl}:${config.port}/gui/?action=setsetting&s=torrents_start_stopped&v=1`);
            continue;
        }

        if (config.autoDownload && state === 'STOPPED') {
            await webTorrent.addTorrent(torrents[i]);
        }
    }

    return seedingTorrents;
}

const scan = async () => {
    if (!await getIpFilterPath()) {
        const ipFilterPath = await findIpFilterPath();
        await setIpFilterPath(ipFilterPath);
    }

    let torrents =  await apiTorrent.getTorrents();

    // Останавливаем загружающиеся и начинаем закачку сами
    if (config.stopActiveDownloads) {
        torrents = await checkTorrents(torrents);
    }

    const peersArray = await apiTorrent.getPeers(torrents);
    const peers = await parsePeersArray(peersArray);
    await blockPeers(peers);
}

module.exports = {
    scan,
};
