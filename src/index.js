const childProcess = require('child_process');
const fetch = require('node-fetch');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const {unescape} = require('html-escaper');
const config = require('../config');

const URL = 'http://127.0.0.1';

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

    const dom = new JSDOM(html);
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
    const {torrents} = await requestWithToken(`${URL}:${config.port}/gui/?list=1`);

    const hashArray = torrents.map(value => `&hash=${value[0]}`).join('');

    const {peers: peersData} = await requestWithToken(`${URL}:${config.port}/gui/?action=getpeers${hashArray}`);

    return peersData.filter(Array.isArray).flat().map(peer => ({ip: peer[1], utp: peer[3], client: peer[5].trim()}));
};

let blockedIp = [];
const blockPeers = (peers) => {
    if (blockedIp.length > 100000) blockedIp = [];

    peers.forEach(peer => {
        if (!peer.client.startsWith('μTorrent') &&
            !peer.client.startsWith('BitTorrent') &&
            !blockedIp.includes(peer.ip)
        ) {
            console.log('Block:', peer.ip, peer.client);
            const ruleName = `BLOCK IP ADDRESS - ${peer.ip}`;
            const resultIn = childProcess.execSync(`netsh advfirewall firewall add rule name="${ruleName}" dir=in action=block remoteip=${peer.ip}`).toString();
            const resultOut = childProcess.execSync(`netsh advfirewall firewall add rule name="${ruleName}" dir=out action=block remoteip=${peer.ip}`).toString();
            console.log(`In: ${resultIn.trim()}, Out: ${resultOut.trim()}`);
            blockedIp.push(peer.ip);
        }
    });
};

// https://techexpert.tips/windows/windows-block-ip-address/
const blockConfig = () => {
    const mpssvcConfig = childProcess.execSync(`sc qc mpssvc`).toString();
    console.log(mpssvcConfig);

    // Вроде и без этого должно работать, посмотрим.
    // if (!mpssvcConfig.toLowerCase().includes('auto_start')) {
    //     childProcess.execSync('sc config mpssvc start=auto');
    //     console.log('sc config mpssvc start=auto');
    //
    //     childProcess.execSync('net stop mpssvc && net start mpssvc');
    //     console.log('net stop mpssvc && net start mpssvc');
    // }

    const mpssvcRunning = childProcess.execSync(`sc query mpssvc`).toString();
    console.log(mpssvcRunning);

    if (!mpssvcRunning.toLowerCase().includes('running')) {
        childProcess.execSync('net stop mpssvc && net start mpssvc');
        console.log('net stop mpssvc && net start mpssvc');
    }

    childProcess.execSync('netsh advfirewall set allprofiles state on');
    // netsh advfirewall show allprofiles state
}

const run = async () => {
    blockConfig();
    await getToken();

    console.log(`Manager started! Scan interval: ${config.interval}`);
    setInterval(  async () => {
        const peers = await getPeers();
        blockPeers(peers);
    }, config.interval);
};

run();
