const path = require("path");

const allowedExtensions = new Set(["ogg", "mp3", "wav"]);

function getFileExtension(file) {
  const extension = path.extname(file).replace(".", "").toLowerCase();
  return allowedExtensions.has(extension) ? extension : false;
}

function getBaseFilename(file, extension) {
  return path.basename(file, extension);
}

module.exports = {
  getFileExtension,
  getBaseFilename,
};
