const fetch = require('node-fetch');
const config = require('../../config');
const log = require('../middleware/log');

const scan = async () => {
    const {port, url, amountLimit, minAmount, logBalance} = config.autoBttTransfer;

    const token = fetch(`http://127.0.0.1:${port}/api/token`).then(res => res.text());
    const balance = fetch(`http://127.0.0.1:${port}/api/status?t=${token}`)
        .then(res => res.json())
        .then(({balance}) => balance / 1000000);
    if (logBalance) log.info('BTT:', balance);
    if (amountLimit < 1001 || amountLimit < balance) return;

    const {tokenBalances} = await fetch(url).then(text => text.json());
    const {amount} = tokenBalances.find(token => token.tokenAbbr === 'BTT');
    if (logBalance) log.info('Amount:', amount);
    if (amount < minAmount || amount < 1001) return;

    let withdrawSum = Math.min(amountLimit, balance, amount);
    withdrawSum = (Math.floor(withdrawSum) - 1) * 1000000;
    withdrawSum += 101;

    log.info(`WITHDRAW: ${withdrawSum}, BTT: ${Math.floor(withdrawSum / 1000000)}`)
    const result = await fetch(`http://127.0.0.1:${port}/api/exchange/withdrawal?t=${token}&amount=${withdrawSum}`, {method: 'POST'}).then(text => text.text());
    log.info('RESULT:', result);
};

const scanning = async () => {
    try {
        await scan();
    } catch (error) {
        log.info(error);
    } finally {
        setTimeout(scanning, config.autoBttTransfer.interval);
    }
};

const run = async () => {
    log.info(`AUTO WITHDRAW: ON\nSCAN INTERVAL: ${config.autoBttTransfer.interval} ms\n`);

    scanning();
};

run();
