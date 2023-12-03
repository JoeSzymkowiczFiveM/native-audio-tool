const fs = require('fs');
let logger = []

async function addToLog(entry) {
    if (typeof(entry) !== 'string') {
        entry = JSON.stringify(entry);
    }
    var isodate = new Date().toISOString()
    logger.push(isodate + ' | ' + entry);
}

async function writeLog() {
    try {
        fs.writeFileSync('logfile.log', logger.join('\n'));
    } catch (err) {
        console.log(err);
    }
}

module.exports = { 
    addToLog, 
    writeLog
};
