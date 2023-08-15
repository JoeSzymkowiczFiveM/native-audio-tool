const ffmpeg = require('fluent-ffmpeg');
let track = './mynameis.mp3';//your path to source file

ffmpeg(track)
.toFormat('wav')
.on('error', (err) => {
    console.log('An error occurred: ' + err.message);
})
.on('progress', (progress) => {
    // console.log(JSON.stringify(progress));
    console.log('Processing: ' + progress.targetSize + ' KB converted');
})
.on('end', () => {
    console.log('Processing finished !');
})
.save('./hello.wav');//path where you want to save your file

ffmpeg.ffprobe('./hello.wav', function(err, metadata) {
    console.log(metadata)
})