const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
var ffprobe = require('ffprobe')
var ffprobeStatic = require('ffprobe-static');
const fs = require('fs');
const { constructAWCXML, construct54XML, construct151XML } = require('./utils/xmlConstructor.js')
const { constructAWCXMLSimple, construct54XMLSimple } = require('./utils/xmlConstructorSimple.js')

const trackData = []
const constructFileArray = async (fileList, initialTrackId, type) => {
    let newTrackId = Number(initialTrackId)
    fileList.forEach(file => {
        let fileData = {}
        let tracks = []
        fileData.track = path.basename(file, '.mp3')
        const sides = ['left']
        if (type === 'radio') {
            sides.push('right')
        }
        sides.forEach((side) => {
            try {
                tracks[side] = fileData.track+'_'+side+'.wav'
            } catch(e) {
                throw new Error(e)
            }
        });
        fileData.tracks = tracks
        fileData.trackid = newTrackId
        // fileData.filename = file
        trackData[file] = fileData
        newTrackId++
    })
}

const constructWav = async (track, filename, channel, sampleRate, type) => {
    let filepath;
    if (type === 'simple') {
        const customSoundsDir = './audiodirectory/custom_sounds/';
        if (!fs.existsSync(customSoundsDir)) {
            fs.mkdirSync(customSoundsDir);
        }
        filepath = `${customSoundsDir}${track}_${channel}.wav`;
    } else if (type === 'radio') {
        if (!fs.existsSync(track)) {
            fs.mkdirSync(track);
        }
        filepath = `./${track}/${track}_${channel}.wav`;
    }
    const side = channel === 'left' ? '0.0.0' : '0.0.1';
    return new Promise((resolve, reject)=>{
        ffmpeg()
            .input(filename)
            .inputFormat('mp3')
            .outputOption('-map_channel ' + side)
            .audioChannels(1)
            .outputOption('-map_metadata -1')
            .outputOption('-map 0:a')
            .outputOptions('-ar ' + Number(sampleRate))
            .outputOption('-fflags +bitexact')
            .outputOption('-flags:v +bitexact')
            .outputOption('-flags:a +bitexact')
            .format('wav')
            .on('error', (err) => {
                console.log('An error occurred: ' + err.message);
                return reject(new Error(err));
            })
            .on('progress', (progress) => {
                console.log('Processing: ' + progress.targetSize + ' KB converted');
            })
            .on('end', async () => {
                console.log('Processing finished !');
                console.log('Generated ', filepath);

                ffprobe(filepath, { path: ffprobeStatic.path }, function(err, metadata) {
                    trackData[filename].duration = Number(metadata.streams[0].duration).toFixed(3)*1000;
                    trackData[filename].samples = metadata.streams[0].duration_ts;
                    trackData[filename].sample_rate = metadata.streams[0].sample_rate;
                    resolve();
                });
            })
            .save(filepath);
    })
};

const main = async () => {
    let fileList = process.env.npm_config_file?.split(",");
    const folder = process.env.npm_config_folder;
    const sampleRate = process.env.npm_config_samplerate;
    const initialTrackId = process.env.npm_config_trackid;
    const generationType = process.env.npm_config_type;
    if (!fs.existsSync('./audiodirectory/')) {
        fs.mkdirSync('./audiodirectory/');
    };

    if (!fileList && folder) {
        fileList = [];
        fs.readdirSync(folder).forEach(file => {
            fileList.push(`./${folder}/${file}`);
        });
    }
    
    try {
        await constructFileArray(fileList, initialTrackId, generationType)
        for (const [filename, fileData] of Object.entries(trackData)) {
            const tracks = fileData['tracks'];
            for (const [side, track] of Object.entries(tracks)) {
                await constructWav(fileData.track, filename, side, sampleRate, generationType);
            };
            
            if (generationType === 'radio') {
                await constructAWCXML(fileData);
            };
        }
        if (generationType === 'radio') {
            construct54XML(trackData);
            construct151XML(trackData);
        } else if (generationType === 'simple') {
            constructAWCXMLSimple(trackData);
            construct54XMLSimple(trackData);
        }
        if (!fs.existsSync('audiodirectory')){
            fs.mkdirSync('audiodirectory');
        }
    } catch(e) {
        console.log(e)
        return {operation: false, message: e}
    }
}

main();