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
        log.info('IN-APP:', BtfsWalletBalance, `[${Math.floor(BtfsWalletBalance / 1000000)}]`,
                 'ON-CHAIN:', BttWalletBalance, `[${Math.floor(BttWalletBalance / 1000000)}]`);
    }
    // Проверка баланса, он должен быть больше 1001000000
    if (BtfsWalletBalance < 1001000000) return;

    // Получаем баланс на шлюзе
    let tokenBalances;
    try {
        const result = await fetch(url || 'https://apiasia.tronscan.io:5566/api/account?address=TA1EHWb1PymZ1qpBNfNj9uTaxd18ubrC7a').then(text => text.json());
        tokenBalances = result.tokenBalances;
    } catch (error) {
        log.info('ERROR: Ошибка получения баланса шлюза');
        return;
    }
    const {balance} = tokenBalances.find(token => token.tokenId === '1002000');

    if (logBalance && lastData.balance !== balance) {
        lastData.balance = balance;
        log.info('SMART CONTRACT BTT:', balance, `[${Math.floor(balance / 1000000)}]`);
    }
    if (balance < (minAmount * 1000000) || balance < 1001000000) return;

    let withdrawSum = Math.min(amountLimit * 1000000, BtfsWalletBalance, balance);
    withdrawSum = Math.floor((withdrawSum - 1000000) / 1000000) * 1000000;
    withdrawSum += 102;

    log.info(`WITHDRAW: ${withdrawSum} [${Math.floor(withdrawSum / 1000000)}]`)
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
