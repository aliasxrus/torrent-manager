const {version: programVersion} = require('../package.json');
const config = require('../config');
const apiTorrent = require('./middleware/api/torrent');
const log = require('./middleware/log');
const {getIpFilterPath} = require('./middleware/child_process');
const {setIpFilterPath, addIpToFilter} = require('./middleware/fs');

const version = (clientName) => {
    const reg = clientName.match(/(\d{1,2})\.(\d{1,2})\.(\d{1,2})/g);
    if (!reg) return [0, 0];
    const mm = Array.from(reg)[0].split('.').map(e => parseInt(e));
    return [mm[0], mm[1]];
}

let blockedIp = [];

const mu = config.filters.mu;
const bit = config.filters.bit;
const muMac = config.filters.muMac;
const filterMuMac = peer => peer.client.startsWith('μTorrent Mac') && peer.version[0] >= muMac.major && peer.version >= muMac.minor;
const filterMu = peer => (peer.client.startsWith('μTorrent') || peer.client.startsWith('µTorrent')) && peer.version[0] >= mu.major && peer.version[1] >= mu.minor;
const filterBit = peer => peer.client.startsWith('BitTorrent') && peer.version[0] >= bit.major && peer.version[1] >= bit.minor;
// const filterFake = peer => peer.client.startsWith('[FAKE]');

const blockPeers = async (peers) => {
    if (blockedIp.length > 100000) blockedIp = [];

    peers.forEach(peer => {
        if (!filterMu(peer) &&
            !filterBit(peer) &&
            !filterMuMac(peer) &&
            // !filterFake(peer) &&
            !blockedIp.includes(peer.ip)
        ) {
            log.info(`${new Date().toLocaleString()}:\tBlock`, peer.ip, peer.client);
            addIpToFilter(peer.ip);
            blockedIp.push(peer.ip);
        }
    });

    await apiTorrent.requestWithToken(`${config.apiTorrentUrl}:${config.port}/gui/?action=setsetting&s=ipfilter.enable&v=1`);
};

const run = async () => {
    log.info('VERSION:', programVersion, '\n');

    const ipFilterPath = await getIpFilterPath();
    console.log(setIpFilterPath)
    console.log(ipFilterPath)

    await setIpFilterPath(ipFilterPath);

    try {
        await apiTorrent.getToken();
    } catch (error) {
        log.info(`Something wrong with WebUI. Check port in config.js.\nПроизошла ошибка, нет доступа до ${config.apiTorrentUrl}:${config.port}/gui\nПроверьте правильность ввода данных в config.js, попробуйте сменить порт.`);
        process.exit(404);
    }

    log.info(`Manager started! Scan interval: ${config.interval}`);
    setInterval(async () => {
        let peers = await apiTorrent.getPeers();
        peers = peers.filter(Array.isArray).flat().map(peer => {
            const client = peer[5].trim();
            return {ip: peer[1], utp: peer[3], client, version: version(client)}
        });
        await blockPeers(peers);
    }, config.interval);
};

run();
