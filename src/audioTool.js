const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
var ffprobe = require('ffprobe')
var ffprobeStatic = require('ffprobe-static');
const fs = require('fs');
const { construct54XML, constructAWCXML, construct151XML } = require('./utils/xmlConstructor.js')

const trackData = []
const sides = ['left', 'right']

function constructFileArray(fileList, initialTrackId) {
    let newTrackId = Number(initialTrackId)
    Array.from(fileList).forEach(file => {
        let fileData = {}
        let tracks = []
        fileData.track = file.name.split('.').slice(0, -1).join('.')
        sides.forEach(async (side) => {
            try {
                tracks[side] = fileData.track+'_'+side+'.wav'
            } catch(e) {
                throw new Error(e)
            }
        });
        fileData.tracks = tracks
        fileData.trackid = newTrackId
        fileData.filename = file.name
        fileData.path = file.path
        trackData[file.name] = fileData
        newTrackId++
    })
}

async function constructWav(track, filePath, channel, sampleRate) {
    return new Promise((resolve,reject)=>{
        if (!fs.existsSync(track)){
            fs.mkdirSync(track);
        }

        const side = channel === 'left' ? '0.0.0' : '0.0.1'
        ffmpeg()
        .input(filePath)
        .inputFormat('mp3')
        .outputOption('-map_channel ' + side)
        .audioChannels(1)
        .outputOption('-map_metadata -1')
        .outputOption('-map 0:a')
        .outputOptions('-ar '+Number(sampleRate))
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

async function getWavData(file, filename, channel) {
    ffprobe('./'+file+'/'+file+'_'+channel+'.wav', { path: ffprobeStatic.path }, function(err, metadata) {
        trackData[filename].duration = Number(metadata.streams[0].duration).toFixed(3)*1000;
        trackData[filename].samples = metadata.streams[0].duration_ts;
        trackData[filename].sample_rate = metadata.streams[0].sample_rate;
    })
}

async function main(fileList, sampleRate, initialTrackId, outputPath) {
    try {
        await constructFileArray(fileList, initialTrackId)
        for (const [filename, fileData] of Object.entries(trackData)) {
            const tracks = fileData['tracks']
            for (const [side, track] of Object.entries(tracks)) {
                await constructWav(fileData.track, fileData.path, side, sampleRate)
                await getWavData(fileData.track, filename, side)
            }
            await constructAWCXML(fileData)
        }
        await construct54XML(trackData)
        await construct151XML(trackData)
        if (!fs.existsSync('audiodirectory')){
            fs.mkdirSync('audiodirectory');
        }
        return {operation: true, message: 'Audio data constructed'}
    } catch(e) {
        console.log(e)
        return {operation: false, message: e}
    }
}

exports.main = main;