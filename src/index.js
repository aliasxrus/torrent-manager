const childProcess = require('child_process');
const fetch = require('node-fetch');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const config = require('../config');

const getToken = async () => {
    const html = await fetch(`http://127.0.0.1:${config.port}/gui/token.html`,
        {
            headers: {
                Authorization: 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64'),
            }
        })
        .then(res => res.text());

    const dom = new JSDOM(html);

    return dom.window.document.querySelector('div').textContent;
};

const requestWithToken = (url) => {
    return fetch(url + `&token=${config.token}`,
        {
            headers: {
                Authorization: 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64'),
            }
        })
        .then(res => res.json());
};

const getPeers = async () => {
    const {torrents} = await requestWithToken(`http://127.0.0.1:${config.port}/gui/?list=1`);

    const hashArray = torrents.map(value => `&hash=${value[0]}`).join('');

    const {peers: peersData} = await requestWithToken(`http://127.0.0.1:${config.port}/gui/?action=getpeers${hashArray}`);

    return peersData.filter(Array.isArray).flat().map(peer => ({ip: peer[1], client: peer[5].trim()}));
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
            const result = childProcess.execSync(`netsh advfirewall firewall add rule name="BLOCK IP ADDRESS - ${peer.ip}" dir=in action=block remoteip=${peer.ip}`).toString();
            console.log(result);
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
    config.token = await getToken();

    console.log(`Manager started! Scan interval: ${config.interval}`);
    setInterval(  async () => {
        const peers = await getPeers();
        blockPeers(peers);
    }, config.interval);
};

run();
