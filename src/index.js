const childProcess = require('child_process');
const fsPromises = require('fs/promises');
const {version: programVersion} = require('../package.json');
const path = require('path');
const Shell = require('node-powershell');
const fetch = require('node-fetch');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const {unescape} = require('html-escaper');
const config = require('../config');

const ps = new Shell({
    executionPolicy: 'Bypass',
    noProfile: true
});

const URL = 'http://127.0.0.1';

const log = (...str) => {
    console.log(...str);
}

const debug = (...str) => {
    if (config.debugLog) {
        log(...str);
    }
}

const getToken = async () => {
    const html = await fetch(`${URL}:${config.port}/gui/token.html`,
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
    debug('html', html);

    const dom = new JSDOM(html);
    const divTag = dom.window.document.querySelector('div');
    if (!divTag) throw Error('dibTag is null');

    debug('Get config.token')
    config.token = dom.window.document.querySelector('div').textContent;
    debug('config.token:', config.token);
};

const requestWithToken = (url) => {
    debug('requestWithToken url:', url);
    debug('requestWithToken config.guid:', config.guid);
    debug('url + `&token=${config.token}:', url + `&token=${config.token}`);
    return fetch(url + `&token=${config.token}`,
        {
            headers: {
                Cookie: config.guid,
                Authorization: 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64'),
            }
        })
        .then(res => {
            if (res.headers.raw()['set-cookie'] && res.headers.raw()['set-cookie'].find(el => el.startsWith('GUID='))) {
                debug('config.guid');
                config.guid = res.headers.raw()['set-cookie'].find(el => el.startsWith('GUID=')).split(';')[0];
                debug('config.guid:', config.guid);
            }
            return res.text();
        })
        .then(unescape)
        .then(text => {
            debug('text =>', text);
            return JSON.parse(text);
        });
};

const version = (clientName) => {
    const reg = clientName.match(/(\d{1,2})\.(\d{1,2})\.(\d{1,2})/g);
    if (!reg) return [0, 0];
    const mm = Array.from(reg)[0].split('.').map(e => parseInt(e));
    return [mm[0], mm[1]];
}

const getPeers = async () => {
    const {torrents} = await requestWithToken(`${URL}:${config.port}/gui/?list=1`);
    debug('torrents:', torrents);

    const allPeers = [];

    while (torrents.length) {
        const hashArray = torrents.splice(0, 20).map(value => `&hash=${value[0]}`).join('');
        const {peers: peersData} = await requestWithToken(`${URL}:${config.port}/gui/?action=getpeers${hashArray}`);
        allPeers.push(...peersData);
    }

    try {
        return allPeers.filter(Array.isArray).flat().map(peer => {
            const client = peer[5].trim();
            return {ip: peer[1], utp: peer[3], client, version: version(client)}
        });
    } catch (error) {
        log(error);
        log('torrents', torrents);
        log('peersData', peersData);
    }

    return [];
};

config.blockIp = async (ip) => {
    debug('blockIp:', ip);
    await fsPromises.appendFile(
        path.join(config.dir, '..', 'ipfilter.dat'),
        `${ip}\n`,
        {flag: 'a'}
    );
}

const blockIpFirewall = async (ip) => {
    debug('blockIpFirewall:', ip);
    const ruleName = `BLOCK IP ADDRESS - ${ip}`;
    const resultIn = childProcess.execSync(`netsh advfirewall firewall add rule name="${ruleName}" dir=in action=block remoteip=${ip}`).toString();
    const resultOut = childProcess.execSync(`netsh advfirewall firewall add rule name="${ruleName}" dir=out action=block remoteip=${ip}`).toString();
    log(`In: ${resultIn.trim()}, Out: ${resultOut.trim()}`);
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
    debug('blockPeers:', peers);
    if (blockedIp.length > 100000) blockedIp = [];

    peers.forEach(peer => {
        if (!filterMu(peer) &&
            !filterBit(peer) &&
            !filterMuMac(peer) &&
            // !filterFake(peer) &&
            !blockedIp.includes(peer.ip)
        ) {
            log(`${new Date().toLocaleString()}:\tBlock`, peer.ip, peer.client);
            config.blockIp(peer.ip);
            blockedIp.push(peer.ip);
        }
    });

    await requestWithToken(`${URL}:${config.port}/gui/?action=setsetting&s=ipfilter.enable&v=1`);
};

// https://techexpert.tips/windows/windows-block-ip-address/
const blockConfig = () => {
    debug('blockConfig');
    const mpssvcConfig = childProcess.execSync(`sc qc mpssvc`).toString();
    log(mpssvcConfig);

    // Вроде и без этого должно работать, посмотрим.
    // if (!mpssvcConfig.toLowerCase().includes('auto_start')) {
    //     childProcess.execSync('sc config mpssvc start=auto');
    //     log('sc config mpssvc start=auto');
    //
    //     childProcess.execSync('net stop mpssvc && net start mpssvc');
    //     log('net stop mpssvc && net start mpssvc');
    // }

    const mpssvcRunning = childProcess.execSync(`sc query mpssvc`).toString();
    log(mpssvcRunning);

    if (!mpssvcRunning.toLowerCase().includes('running')) {
        childProcess.execSync('net stop mpssvc && net start mpssvc');
        log('net stop mpssvc && net start mpssvc');
    }

    childProcess.execSync('netsh advfirewall set allprofiles state on');
    // netsh advfirewall show allprofiles state
}

const run = async () => {
    log('Version:', programVersion);
    debug(config);

    try {
        debug('Start getToken()');
        await getToken();
    } catch (error) {
        log(`Something wrong with WebUI. Check port in config.js.\nПроизошла ошибка, нет доступа до ${URL}:${config.port}/gui\nПроверьте правильность ввода данных в config.js, попробуйте сменить порт.`);
        process.exit(404);
    }

    if (!config.dir) {
        try {
            debug('Start get dir');
            // await ps.addCommand('(Get-Process uTorrent, BitTorrent).Path');
            await ps.addCommand('(get-process | where {$_.ProcessName -in \'uTorrent\', \'BitTorrent\'}).Path');
            const dir = await ps.invoke();
            debug('Get dir:', dir);
            config.dir = dir.split('\r\n')[0].trim();
            debug('config.dir:', config.dir);
            await ps.dispose();
        } catch (error) {
            log('ERROR: Process not found. Процесс uTorrent или BitTorrent не найден, запустите торрент клиент и повторите попытку. Если это не поможет то укажите путь до клиента в config.js');
            process.exit(1);
        }
    }
    log(`Dir: ${config.dir}`);

    if (config.blockMethod === 1) {
        blockConfig();
        config.blockIp = blockIpFirewall;
    }

    if (config.flagClearIpFilter) {
        debug('Start clear filter');
        await fsPromises.appendFile(path.join(config.dir, '..', 'ipfilter.dat'), ``, {flag: 'w'});
    }

    log(`Manager started! Scan interval: ${config.interval}`);
    setInterval(async () => {
        debug('Scan..., getPeers()');
        const peers = await getPeers();
        debug('peers:', peers);
        await blockPeers(peers);
    }, config.interval);
};

run();
