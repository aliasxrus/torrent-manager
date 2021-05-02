const path = require('path');
const childProcess = require('child_process');
const {torrentClientPath} = require('../../config');
const log = require('./log');

const getIpFilterPath = async () => {
    let torrentClientPath = torrentClientPath;

    if (!torrentClientPath) {
        torrentClientPath = await getProcessPath();
    }

    const ipFilterPath = path.join(torrentClientPath, '..', 'ipfilter.dat');
    log.info(`IP FILTER DIRECTORY: ${ipFilterPath}`);

    return ipFilterPath;
};

const getProcessPath = async () => {
    try {
        childProcess.execSync(`chcp 65001`);
        const allProcess = childProcess.execSync(`wmic process get executablepath`).toString();

        const processPath = allProcess
            .split('\n')
            .map(str => str.trim())
            .find(str => str.endsWith('uTorrent') || str.endsWith('BitTorrent'));

        if (!processPath) throw Error('Process uTorrent or BitTorrent not found');

        return processPath;
    } catch (error) {
        log.info(error);
        log.info('ERROR: Process not found.\nВНИМАНИЕ!!!\nПроцесс uTorrent или BitTorrent не найден, запустите торрент клиент и повторите попытку. Если это не поможет то укажите путь до клиента в config.js');
        process.exit(1);
    }
};

module.exports = {
    getIpFilterPath,
};
