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

const blockPeers = (peers) => {
    peers.forEach(peer => {
        if (!peer.client.startsWith('μTorrent')) {
            console.log('Block:', peer.ip, peer.client);
            const result = childProcess.execSync(`netsh advfirewall firewall add rule name="BLOCK IP ADDRESS - ${peer.ip}" dir=in action=block remoteip=${peer.ip}`).toString();
            console.log(result);
        }
    });
};

const run = async () => {
    config.token = await getToken();
    // https://techexpert.tips/windows/windows-block-ip-address/
    childProcess.execSync('sc config mpssvc start=auto');
    childProcess.execSync('net stop mpssvc && net start mpssvc');
    childProcess.execSync('netsh advfirewall set allprofiles state on');

    setInterval(  async () => {
        const peers = await getPeers();
        blockPeers(peers);
    }, config.interval);
};

run();
