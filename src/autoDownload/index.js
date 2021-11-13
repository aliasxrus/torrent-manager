const fetch = require('node-fetch');
const log = require('../middleware/log');
const path = require('path');
const {
    qBitTorrent: {
        qBitTorrentApiUrl,
        port,
        username,
        password,
        scanInterval,
        downloadTimeOut,
        recheckTimeOut,
        maxSize,
        minSize,
        autoConfig,
        config,
        seedPeer,
        sort,
        sortInterval,
		rename,
    }
} = require('../../config');

let sid;
let torrents = {};
let sizeMb;
let sp;


var transliterate = function(text) {

    text = text
		.replace(/\u0020/g, '_')
        .replace(/\u0401/g, 'YO')
        .replace(/\u0419/g, 'I')
        .replace(/\u0426/g, 'TS')
        .replace(/\u0423/g, 'U')
        .replace(/\u041A/g, 'K')
        .replace(/\u0415/g, 'E')
        .replace(/\u041D/g, 'N')
        .replace(/\u0413/g, 'G')
        .replace(/\u0428/g, 'SH')
        .replace(/\u0429/g, 'SCH')
        .replace(/\u0417/g, 'Z')
        .replace(/\u0425/g, 'H')
        .replace(/\u042A/g, '')
        .replace(/\u0451/g, 'yo')
        .replace(/\u0439/g, 'i')
        .replace(/\u0446/g, 'ts')
        .replace(/\u0443/g, 'u')
        .replace(/\u043A/g, 'k')
        .replace(/\u0435/g, 'e')
        .replace(/\u043D/g, 'n')
        .replace(/\u0433/g, 'g')
        .replace(/\u0448/g, 'sh')
        .replace(/\u0449/g, 'sch')
        .replace(/\u0437/g, 'z')
        .replace(/\u0445/g, 'h')
        .replace(/\u044A/g, "'")
        .replace(/\u0424/g, 'F')
        .replace(/\u042B/g, 'I')
        .replace(/\u0412/g, 'V')
        .replace(/\u0410/g, 'a')
        .replace(/\u041F/g, 'P')
        .replace(/\u0420/g, 'R')
        .replace(/\u041E/g, 'O')
        .replace(/\u041B/g, 'L')
        .replace(/\u0414/g, 'D')
        .replace(/\u0416/g, 'ZH')
        .replace(/\u042D/g, 'E')
        .replace(/\u0444/g, 'f')
        .replace(/\u044B/g, 'i')
        .replace(/\u0432/g, 'v')
        .replace(/\u0430/g, 'a')
        .replace(/\u043F/g, 'p')
        .replace(/\u0440/g, 'r')
        .replace(/\u043E/g, 'o')
        .replace(/\u043B/g, 'l')
        .replace(/\u0434/g, 'd')
        .replace(/\u0436/g, 'zh')
        .replace(/\u044D/g, 'e')
        .replace(/\u042F/g, 'Ya')
        .replace(/\u0427/g, 'CH')
        .replace(/\u0421/g, 'S')
        .replace(/\u041C/g, 'M')
        .replace(/\u0418/g, 'I')
        .replace(/\u0422/g, 'T')
        .replace(/\u042C/g, "'")
        .replace(/\u0411/g, 'B')
        .replace(/\u042E/g, 'YU')
        .replace(/\u044F/g, 'ya')
        .replace(/\u0447/g, 'ch')
        .replace(/\u0441/g, 's')
        .replace(/\u043C/g, 'm')
        .replace(/\u0438/g, 'i')
        .replace(/\u0442/g, 't')
        .replace(/\u044C/g, "'")
        .replace(/\u0431/g, 'b')
        .replace(/\u044E/g, 'yu');

    return text;
};


const isAuth = () => {
    return fetch(`${qBitTorrentApiUrl}:${port}/api/v2/app/version`, {
        headers: {
            Cookie: sid,
        }
    })
        .then(res => res.status === 200);
}

const auth = async () => {
    const result = await fetch(`${qBitTorrentApiUrl}:${port}/api/v2/auth/login`, {
        headers: {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: `username=${username}&password=${password}`,
        method: 'POST',
    })
        .then(res => {
            if (res.headers.raw()['set-cookie'] && res.headers.raw()['set-cookie'].find(el => el.startsWith('SID='))) {
                sid = res.headers.raw()['set-cookie'].find(el => el.startsWith('SID=')).split(';')[0];
            }
            return res.text();
        });

    if (result !== 'Ok.') {
        log.info('Error qBitTorrent auth!');
    }
};

const qBitRequest = async (path, body, method = 'GET', contentType) => {
    if (!sid || !await isAuth) {
        await auth();
    }

    const opts = {
        headers: {
            Cookie: sid,
        },
        method,
    };

    if (body) opts.body = body;
    if (contentType) opts.headers['content-type'] = contentType;

    return fetch(`${qBitTorrentApiUrl}:${port}${path}`, opts)
        .then(res => res.text());
};

const configuration = async () => {
    const body = `json=${encodeURIComponent(JSON.stringify(config))}`;
    await qBitRequest('/api/v2/app/setPreferences', body, 'POST', 'application/x-www-form-urlencoded; charset=UTF-8');

    let newConfig = JSON.parse(await qBitRequest('/api/v2/app/preferences'));

    for (const configKey in config) {
        if (config[configKey] !== newConfig[configKey]) {
            log.info('ERROR qBitTorrent: configuration does not match',
                configKey,
                config[configKey],
                newConfig[configKey]);
            process.exit(1);
        }
    }

    log.info('qBitTorrent CONFIG: OK!');
};

const sortTorrents = async () => {
	let torrents=JSON.parse(await qBitRequest('/api/v2/torrents/info?filter=downloading,queuedDL&sort=size&reverse=true'));
	if ( torrents.length > 0) {
		for (let i = 0; i < torrents.length; i++) {
			await qBitRequest('/api/v2/torrents/topPrio', `hashes=${torrents[i].hash}`, 'POST', 'application/x-www-form-urlencoded; charset=UTF-8');
		}
    }
};


const checkTorrents = async () => {
	const {torrents: qBitTorrents} = JSON.parse(await qBitRequest('/api/v2/sync/maindata'));
	
    for (const key in torrents) {
        if (!qBitTorrents[key]) delete torrents[key];
    }

    for (const key in qBitTorrents) {

        if (!torrents[key]) {
            torrents[key] = qBitTorrents[key];
            continue;
        }
		
        sizeMb = 0;
        if (qBitTorrents[key].size > 0) sizeMb = Math.floor (qBitTorrents[key].size / 1024 / 1024);
		
        if (sizeMb > 0) {
            if ((maxSize > 0 && sizeMb > maxSize) || sizeMb < minSize) {
               await qBitRequest('/api/v2/torrents/delete', `hashes=${key}&deleteFiles=true`, 'POST', 'application/x-www-form-urlencoded; charset=UTF-8');
               log.info('qBitTorrent delete:', qBitTorrents[key].name, `; Size: ${sizeMb} Mb is out of range ${minSize} - ${maxSize} Mb`);
               continue;
            }
        }
		
        if (rename) {
            var contentPath = qBitTorrents[key].content_path.replace(qBitTorrents[key].save_path, '');
            if ( path.parse(contentPath).dir !='') contentPath=path.parse(contentPath).dir;
            contentPath = contentPath.replace('.!qB', '');
            if ( contentPath != '' && contentPath != qBitTorrents[key].name) {
                var add_torrent=`urls=${encodeURIComponent(qBitTorrents[key].magnet_uri)}&rename=${encodeURIComponent(contentPath)}&category=${encodeURIComponent(qBitTorrents[key].category)}&savepath=${encodeURIComponent(qBitTorrents[key].save_path)}`;
                await qBitRequest('/api/v2/torrents/delete', `hashes=${key}&deleteFiles=true`, 'POST', 'application/x-www-form-urlencoded; charset=UTF-8');
                await qBitRequest('/api/v2/torrents/add', add_torrent, 'POST', 'application/x-www-form-urlencoded; charset=UTF-8');
                log.info(`Rename "${qBitTorrents[key].name}" to "${contentPath}`);
            }
        }

        if (seedPeer > 0) {
            seed = qBitTorrents[key].num_complete;
            peer = qBitTorrents[key].num_incomplete;
            if ( peer == 0 ) peer = 1;
            sp = seed / peer;
            sp = parseFloat(sp.toFixed(2));
            if ( sp > seedPeer ) {
                await qBitRequest('/api/v2/torrents/delete', `hashes=${key}&deleteFiles=true`, 'POST', 'application/x-www-form-urlencoded; charset=UTF-8');
                log.info('qBitTorrent delete:', qBitTorrents[key].name, `; Seed/Peer: ${sp}`);
            }
        }

        if (downloadTimeOut > 0 && (qBitTorrents[key].state == "stalledDL" || qBitTorrents[key].state == "metaDL") && new Date().getTime() - qBitTorrents[key].last_activity * 1000 > downloadTimeOut * 60 * 1000) {
            await qBitRequest('/api/v2/torrents/delete', `hashes=${key}&deleteFiles=true`, 'POST', 'application/x-www-form-urlencoded; charset=UTF-8');
            log.info('qBitTorrent delete:', qBitTorrents[key].name, `; Download TimeOut > ${downloadTimeOut} min`);
            continue;
        }

        if (recheckTimeOut > 0 && !torrents[key].rechecked && new Date().getTime() - qBitTorrents[key].added_on * 1000 > recheckTimeOut * 60 * 1000) {
            await qBitRequest('/api/v2/torrents/recheck', `hashes=${key}`, 'POST', 'application/x-www-form-urlencoded; charset=UTF-8');
            log.info('qBitTorrent recheck:', key, qBitTorrents[key].name);
            torrents[key].rechecked = true;
        }
    }
};

const autoDownload = async () => {

}

const scan = async () => {
    await checkTorrents();
};

const scanning = async () => {
    try {
        await scan();
    } catch (error) {
        log.info(error);
    } finally {
        setTimeout(scanning, scanInterval);
    }
};

const sortTor = async () => {
    await sortTorrents();
};

const sorting = async () => {
    try {
        await sortTor();
    } catch (error) {
        log.info(error);
    } finally {
        setTimeout(sorting, sortInterval);
    }
};

const run = async () => {
    if (autoConfig) await configuration();
	if (sort) sorting ();
    scanning();
};
log.info("QBittorrent manager started.");
run();

// let oldConf;
// function compare(objOld, objNew) {
//     for (const objOldKey in objOld) {
//         if (objNew[objOldKey] === undefined) {
//             console.log('NOT FOUND:', objOldKey);
//             continue;
//         }
//
//         if (objOld[objOldKey] !== objNew[objOldKey]) {
//             if (objOldKey === 'scan_dirs') continue;
//             console.log('Key:', objOldKey);
//             console.log('Old:', objOld[objOldKey]);
//             console.log('New:', objNew[objOldKey]);
//         }
//     }
// }
//
// const data = await qBitRequest('/api/v2/app/preferences');
//
// if (oldConf && data) {
//     compare(oldConf, data);
// }
//
// oldConf = data;
