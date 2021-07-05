const {debugLog} = require('../../config');

const info = (...str) => {
    console.log(`${new Date().toLocaleString()}:\t`, ...str);
};

const debug = (...str) => {
    if (debugLog) {
        info(...str);
    }
};

module.exports = {
    info,
    debug
};
