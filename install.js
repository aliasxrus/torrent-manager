const packageData = require('./package.json');

if (packageData.modulesVersion && packageData.modulesVersion === packageData.version) {
    console.log('Start...\nVersion:', packageData.version);
    process.exit(0);
}

const fs = require('fs');
const childProcess = require('child_process');

console.log('Updating and reinstalling npm packages...\nVersion:', packageData.version);

const result = childProcess.execSync(`npm install`).toString();
console.log(result);

packageData.modulesVersion = packageData.version;
fs.appendFileSync(
    './package.json',
    JSON.stringify(packageData, null, '  '),
    {flag: 'w'}
)

console.log('Installed. Start...\nVersion:', packageData.version);
