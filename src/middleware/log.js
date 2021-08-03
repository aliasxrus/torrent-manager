const {debugLog, autoBttWithdraw: {logBalance}} = require('../../config');

const info = (...str) => {
    console.log(`${new Date().toLocaleString()}:\t`, ...str);
};

const debug = (...str) => {
    if (debugLog) {
        info(...str);
    }
};

const balance = (...str) => {
    if (logBalance) {
        info(...str);
    }
};

module.exports = {
    info,
    debug,
    balance,
};
