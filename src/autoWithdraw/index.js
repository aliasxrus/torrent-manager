const fetch = require('node-fetch');
const config = require('../../config');
const log = require('../middleware/log');

const lastData = {
    BtfsWalletBalance: 0,
    BttWalletBalance: 0,
    balance: 0,
}

const scan = async () => {
    const {port, url, amountLimit, minAmount, logBalance, btfsPassword} = config.autoBttTransfer;

    const {
        BtfsWalletBalance,
        BttWalletBalance
    } = await fetch(`http://127.0.0.1:${port}/api/v1/wallet/balance`, {method: 'POST'})
        .then(res => res.json());

    if (logBalance && (lastData.BtfsWalletBalance !== BtfsWalletBalance || lastData.BttWalletBalance !== BttWalletBalance)) {
        lastData.BtfsWalletBalance = BtfsWalletBalance;
        lastData.BttWalletBalance = BttWalletBalance;
        log.info(`${new Date().toLocaleString()}:\tIN-APP:`, BtfsWalletBalance, 'ON-CHAIN:', BttWalletBalance);
    }
    // Проверка баланса, он должен быть больше 1001000000
    if (BtfsWalletBalance < 1001000000) return;

    // Получаем баланс на шлюзе
    const {tokenBalances} = await fetch(url || 'https://apiasia.tronscan.io:5566/api/account?address=TA1EHWb1PymZ1qpBNfNj9uTaxd18ubrC7a').then(text => text.json());
    let {balance} = tokenBalances.find(token => token.tokenId === '1002000');

    if (logBalance && lastData.balance !== balance) {
        lastData.balance = balance;
        log.info(`${new Date().toLocaleString()}:\tAdmin BTT:`, balance);
    }
    if (balance < minAmount || balance < 1001000000) return;

    let withdrawSum = Math.min(amountLimit, BtfsWalletBalance, balance);
    withdrawSum += 102;

    log.info(`WITHDRAW: ${withdrawSum} (${Math.floor(withdrawSum / 1000000)})`)
    const result = await fetch(`http://127.0.0.1:${port}/api/v1/wallet/withdraw?arg=${withdrawSum}&p=${btfsPassword}`, {method: 'POST'}).then(text => text.text());
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
