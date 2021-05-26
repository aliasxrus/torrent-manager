const fetch = require('node-fetch');
const config = require('../../config');
const log = require('../middleware/log');

const lastData = {
    amount: 0,
    balance: 0,
}

const scan = async () => {
    const {port, url, amountLimit, minAmount, logBalance} = config.autoBttTransfer;

    const token = await fetch(`http://127.0.0.1:${port}/api/token`).then(res => res.text());
    const balance = await fetch(`http://127.0.0.1:${port}/api/status?t=${token}`)
        .then(res => res.json())
        .then(({balance}) => Math.floor(balance / 1000000));

    if (logBalance && lastData.balance !== balance) {
        lastData.balance = balance;
        log.info(`${new Date().toLocaleString()}:\tBTT:`, balance);
    }
    // Проверка баланса, он должен быть больше 1001
    if (balance < 1001) return;

    // Получаем баланс на шлюзе
    const {tokenBalances} = await fetch(url || 'https://apiasia.tronscan.io:5566/api/account?address=TA1EHWb1PymZ1qpBNfNj9uTaxd18ubrC7a').then(text => text.json());
    let {balance: amount} = tokenBalances.find(token => token.tokenId === '1002000');
    amount = Math.floor(amount / 1000000)

    if (logBalance && lastData.amount !== amount) {
        lastData.amount = amount;
        log.info(`${new Date().toLocaleString()}:\tAmount:`, amount);
    }
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
