const childProcess = require('child_process');
const fsPromises = require('fs/promises');
const {version: programVersion} = require('../package.json');
const path = require('path');
const Shell = require('node-powershell');
const config = require('../config');
const apiTorrent = require('./middleware/api/torrent');
const log = require('./middleware/log');

const ps = new Shell({
    executionPolicy: 'Bypass',
    noProfile: true
});

const version = (clientName) => {
    const reg = clientName.match(/(\d{1,2})\.(\d{1,2})\.(\d{1,2})/g);
    if (!reg) return [0, 0];
    const mm = Array.from(reg)[0].split('.').map(e => parseInt(e));
    return [mm[0], mm[1]];
}

config.blockIp = async (ip) => {
    await fsPromises.appendFile(
        path.join(config.dir, '..', 'ipfilter.dat'),
        `${ip}\n`,
        {flag: 'a'}
    );
}

const blockIpFirewall = async (ip) => {
    const ruleName = `BLOCK IP ADDRESS - ${ip}`;
    const resultIn = childProcess.execSync(`netsh advfirewall firewall add rule name="${ruleName}" dir=in action=block remoteip=${ip}`).toString();
    const resultOut = childProcess.execSync(`netsh advfirewall firewall add rule name="${ruleName}" dir=out action=block remoteip=${ip}`).toString();
    log.info(`In: ${resultIn.trim()}, Out: ${resultOut.trim()}`);
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
            config.blockIp(peer.ip);
            blockedIp.push(peer.ip);
        }
    });

    await apiTorrent.requestWithToken(`${config.apiTorrentUrl}:${config.port}/gui/?action=setsetting&s=ipfilter.enable&v=1`);
};

// https://techexpert.tips/windows/windows-block-ip-address/
const blockConfig = () => {
    const mpssvcConfig = childProcess.execSync(`sc qc mpssvc`).toString();
    log.info(mpssvcConfig);

    // Вроде и без этого должно работать, посмотрим.
    // if (!mpssvcConfig.toLowerCase().includes('auto_start')) {
    //     childProcess.execSync('sc config mpssvc start=auto');
    //     log.info('sc config mpssvc start=auto');
    //
    //     childProcess.execSync('net stop mpssvc && net start mpssvc');
    //     log.info('net stop mpssvc && net start mpssvc');
    // }

    const mpssvcRunning = childProcess.execSync(`sc query mpssvc`).toString();
    log.info(mpssvcRunning);

    if (!mpssvcRunning.toLowerCase().includes('running')) {
        childProcess.execSync('net stop mpssvc && net start mpssvc');
        log.info('net stop mpssvc && net start mpssvc');
    }

    childProcess.execSync('netsh advfirewall set allprofiles state on');
    // netsh advfirewall show allprofiles state
}

const run = async () => {
    log.info('Version:', programVersion);

    try {
        await apiTorrent.getToken();
    } catch (error) {
        log.info(`Something wrong with WebUI. Check port in config.js.\nПроизошла ошибка, нет доступа до ${config.apiTorrentUrl}:${config.port}/gui\nПроверьте правильность ввода данных в config.js, попробуйте сменить порт.`);
        process.exit(404);
    }

    if (!config.dir) {
        try {
            // await ps.addCommand('(Get-Process uTorrent, BitTorrent).Path');
            await ps.addCommand('(get-process | where {$_.ProcessName -in \'uTorrent\', \'BitTorrent\'}).Path');
            const dir = await ps.invoke();

            config.dir = dir.split('\r\n')[0].trim();

            await ps.dispose();
        } catch (error) {
            log.info('ERROR: Process not found. Процесс uTorrent или BitTorrent не найден, запустите торрент клиент и повторите попытку. Если это не поможет то укажите путь до клиента в config.js');
            process.exit(1);
        }
    }
    log.info(`Dir: ${config.dir}`);

    if (config.blockMethod === 1) {
        blockConfig();
        config.blockIp = blockIpFirewall;
    }

    if (config.flagClearIpFilter) {
        await fsPromises.appendFile(path.join(config.dir, '..', 'ipfilter.dat'), ``, {flag: 'w'});
    }

    log.info(`Manager started! Scan interval: ${config.interval}`);
    setInterval(async () => {
        const peers = await apiTorrent.getPeers();
        peers.filter(Array.isArray).flat().map(peer => {
            const client = peer[5].trim();
            return {ip: peer[1], utp: peer[3], client, version: version(client)}
        });
        await blockPeers(peers);
    }, config.interval);
};

run();
