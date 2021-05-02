const {version: programVersion} = require('../package.json');
const config = require('../config');
const apiTorrent = require('./middleware/api/torrent');
const log = require('./middleware/log');
const {scan} = require('./middleware/filter');

const scanning = async () => {
    try {
        await scan();
    } catch (error) {
        log.info(error);
    } finally {
        setTimeout(scanning, config.interval);
    }
};

const run = async () => {
    log.info('VERSION:', programVersion, '\n');

    await apiTorrent.getToken();

    log.info(`Manager started! Scan interval: ${config.interval}`);
    scanning();
};

run();
