const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
var ffprobe = require('ffprobe')
var ffprobeStatic = require('ffprobe-static');
const fs = require('fs');
const mm = require('music-metadata');
const { constructAWCXML, construct54XML, construct151XML } = require('./utils/xmlConstructor')
const { constructAWCXMLSimple, construct54XMLSimple } = require('./utils/xmlConstructorSimple')
const { constructAWCXMLWeapon, construct54XMLWeapon, construct151XMLWeapon } = require('./utils/xmlConstructorWeapon')
const logger = require('./utils/logger')
const fileUtil = require('./utils/fileUtil')

const trackData = []

const constructFileArray = async (fileList, initialTrackId, type) => {
    let newTrackId = Number(initialTrackId)
    fileList.forEach(async file => {
        let fileData = {}
        fileData.trackid = newTrackId
        let tracks = []
        fileData.extension = fileUtil.getFileExtension(file)
        if (!fileData.extension) {
            const metaLog = `File ${file} does not have a valid extension.`
            logger.addToLog(metaLog)
            return
        }
        fileData.track = fileUtil.getBaseFilename(file, '.'+fileData.extension)
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
        trackData[file] = fileData

        mm.parseFile(`./${file}`).then(metadata => {
            const metaLog = `Track ID: ${fileData.trackid || 'Not Found'} | Title: ${metadata?.common?.title || 'Not Found'} | Artist: ${metadata?.common?.artist || 'Not Found'}`
            logger.addToLog(metaLog)
        }).catch(err => {
            console.log('An error occurred: ' + err.message);
        })

        newTrackId++
    })
}

const constructWav = async (track, filename, channel, sampleRate, type, audioBankName, extension) => {
    let filepath;
    if (type === 'simple') {
        const customSoundsDir = `./output/audiodirectory/${audioBankName}/`;
        if (!fs.existsSync(customSoundsDir)) {
            fs.mkdirSync(customSoundsDir);
        }
        filepath = `${customSoundsDir}${track}_${channel}.wav`;
    } else if (type === 'weapon') {
        const customSoundsDir = './output/audiodirectory/custom_weapon_sounds/';
        if (!fs.existsSync(customSoundsDir)) {
            fs.mkdirSync(customSoundsDir);
        }
        filepath = `${customSoundsDir}${track}_${channel}.wav`;
    } else if (type === 'radio') {
        const customMusicDir = `./output/audiodirectory/${track}/`
        if (!fs.existsSync(customMusicDir)) {
            fs.mkdirSync(customMusicDir);
        }
        filepath = `${customMusicDir}${track}_${channel}.wav`;
    }
    const side = channel === 'left' ? '0.0.0' : '0.0.1';
    return new Promise((resolve, reject)=>{
        let ff = ffmpeg()
        ff.input(filename)
        ff.inputFormat(extension)
        ff.outputOption('-map_channel ' + side)
        ff.audioChannels(1)
        ff.outputOption('-map_metadata -1')
        ff.outputOption('-map 0:a')
        ff.outputOptions('-ar ' + Number(sampleRate))
        ff.outputOption('-fflags +bitexact')
        ff.outputOption('-flags:v +bitexact')
        ff.outputOption('-flags:a +bitexact')
        if (type === 'simple') {
            ff.withAudioFilter('loudnorm=I=-15')
        }
        ff.format('wav')
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
    const fileList = process.env.npm_config_file?.split(",");
    const folder = process.env.npm_config_folder;
    const sampleRate = process.env.npm_config_samplerate;
    const initialTrackId = process.env.npm_config_trackid;
    const generationType = process.env.npm_config_type;
    const gun = process.env.npm_config_gun;
    const audioBankName = process.env.npm_config_audiobank != null ? process.env.npm_config_audiobank : 'custom_sounds';

    if (!fs.existsSync('./output/')) {
        fs.mkdirSync('./output/');
    };
    
    if (!fs.existsSync('./output/audiodirectory/')) {
        fs.mkdirSync('./output/audiodirectory/');
    }
    let filteredFileList = [];
    if (!fileList && folder) {
        fs.readdirSync(folder).forEach(file => {
            filteredFileList.push(`./${folder}/${file}`);
        });
    }
    
    try {
        await constructFileArray(filteredFileList, initialTrackId, generationType)
        console.log(trackData)
        for (const [filename, fileData] of Object.entries(trackData)) {
            const tracks = fileData['tracks'];
            for (const [side, track] of Object.entries(tracks)) {
                await constructWav(fileData.track, filename, side, sampleRate, generationType, audioBankName, fileData.extension);
            };
            
            if (generationType === 'radio') {
                await constructAWCXML(fileData);
            };
        }

        if (generationType === 'radio') {
            construct54XML(trackData);
            construct151XML(trackData);
        } else if (generationType === 'simple') {
            constructAWCXMLSimple(trackData, audioBankName);
            construct54XMLSimple(trackData, audioBankName);
        } else if (generationType === 'weapon') {
            constructAWCXMLWeapon(trackData);
            construct54XMLWeapon(trackData, gun);
            construct151XMLWeapon(trackData, gun);
        }
        if (!fs.existsSync('./output/audiodirectory')){
            fs.mkdirSync('./output/audiodirectory');
        }

        await logger.writeLog();
    } catch(e) {
        console.log(e)
        return {operation: false, message: e}
    }
}

main();