const config = require('../../config');
const log = require('../middleware/log');
const apiTorrent = require('../middleware/api/torrent');

const autoConfig = async () => {
    for (const key in config.autoConfig) {
        log.info(`Set ${key}=${config.autoConfig[key]}`);
        const result = await apiTorrent.requestWithToken(`${config.apiTorrentUrl}:${config.port}/gui/?action=setsetting&s=${key}&v=${config.autoConfig[key]}`);
        log.info(`Result ${key}=${config.autoConfig[key]}:`, result);
    }
};

autoConfig();
