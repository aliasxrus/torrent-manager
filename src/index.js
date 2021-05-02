const {version: programVersion} = require('../package.json');
const config = require('../config');
const apiTorrent = require('./middleware/api/torrent');
const log = require('./middleware/log');
const {getIpFilterPath} = require('./middleware/child_process');
const {setIpFilterPath, addIpToFilter} = require('./middleware/fs');
const {scan} = require('./middleware/filter');

const scanCycle = async () => {
    try {
        await scan();
        new Promise(resolve => setTimeout(resolve, config.interval));
    } catch (error) {
        log.info(error);
    } finally {
        scanCycle();
    }
};

const run = async () => {
    log.info('VERSION:', programVersion, '\n');

    const ipFilterPath = await getIpFilterPath();
    await setIpFilterPath(ipFilterPath);

    await apiTorrent.getToken();

    log.info(`Manager started! Scan interval: ${config.interval}`);
    scanCycle();
};

run();
