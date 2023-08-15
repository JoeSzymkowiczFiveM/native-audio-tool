const ffmpeg = require('fluent-ffmpeg');

ffmpeg.ffprobe('./peaches_right.wav', function(err, metadata) {
    console.log(metadata)
})