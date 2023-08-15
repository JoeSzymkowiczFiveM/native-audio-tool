const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
var ffprobe = require('ffprobe')
var ffprobeStatic = require('ffprobe-static');
const fs = require('fs');
const { construct54XML, constructAWCXML } = require('./utils/xmlConstructor.js')

const trackData = []
const sides = ['left', 'right']

const fileList = process.env.npm_config_file.split(",");
const samplerate = process.env.npm_config_samplerate
const initialTrackId = process.env.npm_config_trackid

function constructFileArray() {
    let newTrackId = Number(initialTrackId)
    fileList.forEach((file) => {
        let fileData = {}
        let tracks = []
        fileData.track = file.split('.').slice(0, -1).join('.')
        sides.forEach(async (side) => {
            try {
                tracks[side] = fileData.track+'_'+side+'.wav'
            } catch(e) {
                console.log('ERROR: ', e)
            }
        });
        fileData.tracks = tracks
        fileData.trackid = newTrackId
        fileData.filename = file
        trackData[file] = fileData
        newTrackId++
    })
}

async function constructWav(track, filename, channel) {
    return new Promise((resolve,reject)=>{
        if (!fs.existsSync(track)){
            fs.mkdirSync(track);
        }

        const side = channel === 'left' ? '0.0.0' : '0.0.1'
        ffmpeg()
        .input(filename)
        .inputFormat('mp3')
        .outputOption('-map_channel ' + side)
        .audioChannels(1)
        .outputOption('-map_metadata -1')
        .outputOption('-map 0:a')
        .outputOptions('-ar '+Number(samplerate))
        .outputOption('-fflags +bitexact')
        .outputOption('-flags:v +bitexact')
        .outputOption('-flags:a +bitexact')
        .format('wav')

        .on('error', (err) => {
            console.log('An error occurred: ' + err.message);
            return reject(new Error(err))
        })
        .on('progress', (progress) => {
            console.log('Processing: ' + progress.targetSize + ' KB converted');
        })
        .on('end', () => {
            //console.log('Processing finished !');
            console.log('Generated ', './'+track+'/'+track+'_'+channel+'.wav')
            resolve()
        })
        .save('./'+track+'/'+track+'_'+channel+'.wav')
    })
}

function getWavData(file, filename, channel) {
    ffprobe('./'+file+'/'+file+'_'+channel+'.wav', { path: ffprobeStatic.path }, function(err, metadata) {
        trackData[filename].duration = Number(metadata.streams[0].duration).toFixed(3)*1000;
        trackData[filename].samples = metadata.streams[0].duration_ts;
        trackData[filename].sample_rate = metadata.streams[0].sample_rate;
    })
}

async function main() {
    await constructFileArray()
    for (const [filename, fileData] of Object.entries(trackData)) {
        const tracks = fileData['tracks']
        for (const [side, track] of Object.entries(tracks)) {
            await constructWav(fileData.track, filename, side)
            await getWavData(fileData.track, filename, side)
        }
        await constructAWCXML(fileData)
    }
    await construct54XML(trackData)
}

main();