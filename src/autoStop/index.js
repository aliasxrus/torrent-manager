const apiTorrent = require('../middleware/api/torrent');
const config = require('../../config');
const log = require('../middleware/log')
const si = require('systeminformation');
const rp = require('fs').realpathSync;
const execSync = require('child_process').execSync;

const maxTorrent = config.autostop.maxTorrent;
const minTime = config.autostop.minTime;
const minAvail = config.autostop.minAvail;
const minRatio = config.autostop.minRatio;
const stopMethod = config.autostop.stopMethod;
const selectMethod = config.autostop.selectMethod;
const maxSize = config.autostop.maxSize;
const minSize = config.autostop.minSize;
const seedPeer = config.autostop.seedPeer;
var pause = config.autostop.timeout;
if (pause < 120000) ( pause = 120000 );
const OS = process.platform;
var disks = config.autostop.disks.map(function(x){ return x.toUpperCase(); });
if ( !OS.includes ('win') ) disks = config.autostop.disks.map(function(x){ return x.toLowerCase(); });

const selectTorrents = async (torrents,updown,time=0,ratio=0,maxSz=0,minSz=0,sp=0) => {
    let selectedTorrents = [];
	let sizeMb;
	let peers;
	if (maxSz > 0 || minSz > 0 || sp > 0 ) {
		if (maxSz == 0) maxSz = 100000;
		if (sp == 0) sp = 100000;
		for (let i = 0; i < torrents.length; i++) {
			sizeMb = torrents[i].size / 1024 / 1024;
			peers = torrents[i].peersInSwarm;
			if ( peers == 0 ) peers=1;
		    if  ( sizeMb < minSz || sizeMb > maxSz || torrents[i].seedsInSwarm / peers > sp) {
				selectedTorrents.push(torrents[i]);
			}
		}
		return selectedTorrents;
	}
		
	let now = new Date();
	let ts = Math.floor(now.getTime() / 1000);
	for (let i = 0; i < torrents.length; i++) {
        let {status, state, forced} = torrents[i].status;
		if (updown == 'any') state=updown;
	    if (state == updown && torrents[i].ratio / 10 >=  ratio && (ts - torrents[i].begin) / 60 > time ) {
			selectedTorrents.push(torrents[i]);
        }
    }
    return selectedTorrents;
};



const selectForDiskTorrent = async (torrents,disk) => {
    const selectedDiskTorrents = [];
	for (let i = 0; i < torrents.length; i++) {
		var downDisk = torrents[i].downloadDir.slice(0, torrents[i].downloadDir.indexOf (':') + 1);

        if ( !OS.includes ('win') ) {
            var realPath = rp(process.env.HOME+'/.wine/dosdevices/'+downDisk.toLowerCase());
			downDisk = execSync('df '+ realPath + ' | tail -n +2 | cut -d " " -f1 | tr -d \'\r\n\'' , { encoding: 'utf-8' });
			}
		if ( downDisk == disk || downDisk == 'overlay' ) {
			selectedDiskTorrents.push(torrents[i]);
		}
    }
	return selectedDiskTorrents;
};

const sortTorrent = async (torrents, selectMethod) => {
	torrents.sort(function(a, b){return a.begin - b.begin});
	if (selectMethod == 2 ) {torrents.sort(function(a, b){return a.peersConnected - b.peersConnected});}
	if (selectMethod == 3 ) {torrents.sort(function(a, b){return a.peersInSwarm - b.peersInSwarm});}
	if (selectMethod == 4 ) {torrents.sort(function(a, b){return b.seedsInSwarm / b.peersInSwarm - a.seedsInSwarm / a.peersInSwarm});}
	return torrents;
};


const checkDisk = async () => {
	const disksData = await si.fsSize(function(data) {return data;})
	for (let i = 0; i < disksData.length; i++) {
		if (  disks.includes(disksData[i].fs ) ){
			var avail = Math.floor(disksData[i].available / 1024 / 1024/1024);
			if ( avail >= minAvail ) { continue; }
			await apiTorrent.requestWithToken(`/gui/?action=setsetting&s=gui.delete_to_trash&v=0`);
			let torrents = await apiTorrent.getTorrents();
			let selectedTorrents = [];
			let downTorrents =[];
			log.info("On disk", disksData[i].fs, avail,"GB free. This is less than the", minAvail,"GB limit.");
			selectedTorrents = await selectForDiskTorrent (torrents,disksData[i].fs);

			if ( selectedTorrents.length == 0) {
				log.info ("No torrents on disk", disksData[i].fs,". There is nothing to delete.");
				return;
			}
			downTorrents = await selectTorrents(selectedTorrents,'FINISHED');
			if ( downTorrents.length > 0) {
				downTorrents = await sortTorrent (downTorrents,1);
				await apiTorrent.controlTorrent(downTorrents[0].hash, 'removedatatorrent');
				log.info(`Torrent "${downTorrents[0].name.substr(0,35)}" is removed.`);
				return;
			}

			selectedTorrents = await selectTorrents(selectedTorrents,'any');
			if ( selectedTorrents.length > 0 ) {
				selectedTorrents = await sortTorrent (selectedTorrents,selectMethod);
				await apiTorrent.controlTorrent(selectedTorrents[0].hash, 'removedatatorrent');
				log.info(`Torrent "${selectedTorrents[0].name.substr(0,35)}" is removed.`);
			}
			else log.info(`No torrents found to delete`);
		}
	}
}

const checkSizeSp = async (maxSz=0,minSz=0,sp=0) => {
	let selectedTorrents = [];
	await apiTorrent.requestWithToken(`/gui/?action=setsetting&s=gui.delete_to_trash&v=0`);
	let torrents = await apiTorrent.getTorrents();
	selectedTorrents = await selectTorrents(torrents,'SEEDING',0,0,maxSz,minSz,sp);
	if ( selectedTorrents.length > 0) {
		for (let i = 0; i < selectedTorrents.length; i++) {
			await apiTorrent.controlTorrent(selectedTorrents[i].hash, 'removedatatorrent');
			log.info(`Torrent "${selectedTorrents[i].name.substr(0,35)}" is stopped/removed.`);
		}
		return;
    }
}

const stop = async (torrents) => {
	let selectedTorrents = [];
    selectedTorrents = await selectTorrents(torrents,'SEEDING');
	if ( selectedTorrents.length <= maxTorrent ) { return; }
	var waste = selectedTorrents.length - maxTorrent;
	log.info ("Found", selectedTorrents.length,"seeding torrents. Configured limit:",maxTorrent,"torrents.");
	selectedTorrents = await selectTorrents(selectedTorrents,'SEEDING',minTime,minRatio);
	if ( selectedTorrents.length == 0 ) {
		log.info ("Not found torrents matching the configured parameters." );
		return;
	}
	selectedTorrents = await sortTorrent (selectedTorrents,selectMethod);
	if ( selectedTorrents.length < waste ) { waste = selectedTorrents.length; }
	log.info ("Found",selectedTorrents.length,"torrents matching the configured parameters. Stop|remove", waste, "torrents");
	var action = 'stop';
	if ( stopMethod == 2 ) { action = 'removetorrent'; }
	else if ( stopMethod == 3 ) {
		action = 'removedatatorrent';
		await apiTorrent.requestWithToken(`/gui/?action=setsetting&s=gui.delete_to_trash&v=0`);
		}
	for (let i = 0; i < waste; i++) {
		await apiTorrent.controlTorrent(selectedTorrents[i].hash, action);
		log.info(`Torrent "${selectedTorrents[i].name.substr(0,35)}" is stopped/removed.`);
	}
};

const autostop = async () => {
	if (minAvail > 0) ( await checkDisk () );
	if (maxSize > 0 || minSize > 0 || seedPeer > 0) ( await checkSizeSp (maxSize,minSize,seedPeer) );
    let torrents = await apiTorrent.getTorrents();
    stop (torrents);
};

const scanning = async () => {
    try {
        await autostop ();
    } catch (error) {
        log.info(error);
    } finally {
        setTimeout(scanning, pause);
    }
};

log.info("Autostop started");
scanning();
