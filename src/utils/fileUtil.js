const path = require('path');
const allowedExtensions = ['ogg', 'mp3', 'wav'];

function getFileExtension(file) {
    const extension = file.split('.').pop()
    if (!allowedExtensions.includes(extension)) {
        return false;
    }
    return extension;
}

function getBaseFilename(file, ext) {
    const asdf = path.basename(file, ext);
    return asdf
}

module.exports = { 
    getFileExtension, 
    getBaseFilename
};
