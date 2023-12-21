const path = require('path');

const allowedExtensions = ['ogg', 'mp3'];

async function getFileExtension(file) {
    const extension = file.split('.').pop()
    if (!allowedExtensions.includes(extension)) {
        return false;
    }
    return extension;
}

async function getBaseFilename(file, ext) {
    return baseFilename = path.basename(file, ext);
}

module.exports = { 
    getFileExtension, 
    getBaseFilename
};
