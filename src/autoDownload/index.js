const fetch = require('node-fetch');
const log = require('../middleware/log');
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
    }
} = require('../../config');

let sid;
let torrents = {};
let sizeMb;
let sp;


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
