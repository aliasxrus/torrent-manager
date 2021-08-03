const {version: programVersion} = require('../package.json');
const config = require('../config');
const log = require('./middleware/log');
const {scan} = require('./middleware/filter');
const {creatVerDat} = require('./middleware/fs');

if (config.setSetting) {
    require('./autoConfig');
}

if (config.autoBttWithdraw.autoWithdraw) {
    require('./autoWithdraw');
}

if (config.qBitTorrent.qBitTorrent) {
    require('./autoDownload');
}

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
    
    creatVerDat(programVersion);
    
    log.info(`Manager started! Scan interval: ${config.interval}`);
    scanning();
};

run();
