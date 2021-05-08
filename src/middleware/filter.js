const config = require('../../config');
const apiTorrent = require('./api/torrent');
const {findIpFilterPath} = require('./child_process');
const {setIpFilterPath, getIpFilterPath} = require('./fs');
const {addIpToFilter} = require('./fs');
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
const muMac = config.filters.muMac;
const libtorrent = config.filters.libtorrent;
const unknown = config.filters.unknown;
const filterMuMac = peer => peer.client.startsWith('μTorrent Mac') && peer.version[0] >= muMac.major && peer.version[1] >= muMac.minor;
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
            !filterMuMac(peer) &&
            !filterLibtorrent(peer) &&
            !filterUnknown(peer) &&
            !blockedIp.includes(peer.ip)
        ) {
            log.info(`${new Date().toLocaleString()}:\tBlock`, peer.ip, peer.client);
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

const scan = async () => {
    if (!await getIpFilterPath()) {
        const ipFilterPath = await findIpFilterPath();
        await setIpFilterPath(ipFilterPath);
    }

    const peersArray = await apiTorrent.getPeers();
    const peers = await parsePeersArray(peersArray);
    await blockPeers(peers);
}

module.exports = {
    scan,
};
