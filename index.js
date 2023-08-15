const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
var ffprobe = require('ffprobe')
var ffprobeStatic = require('ffprobe-static');
const { create } = require('xmlbuilder2');
const fs = require('fs');
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
        //.inputFormat('mp3')
        .input(filename)
        .outputOption('-map_channel ' + side)
        .audioChannels(1)
        .outputOption('-map_metadata -1')
        .outputOption('-map 0:a')
        .outputOptions('-ar '+Number(samplerate))
        .outputOption('-fflags +bitexact')
        .outputOption('-flags:v +bitexact')
        .outputOption('-flags:a +bitexact')
        //.audioFrequency(samplerate)
        //.audioCodec('pcm_u16le')//pcm_mulaw, pcm_u16le
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

async function constructXML(fileData) {
    const doc = create({ version: '1.0', encoding: "UTF-8" })
    .ele('AudioWaveContainer')
    .ele('Version').att('value', '1').up()
    .ele('ChunkIndices').att('value', 'True').up()
    .ele('MultiChannel', { 'value': 'True' }).up()
    .ele('Streams')
    .ele('Item').ele('Chunks').ele('Item').ele({'Type' : 'streamformat'}).up().ele('BlockSize', { 'value': '524288' }).up().up()
    .ele('Item').ele({'Type' : 'data'}).up().up()
    .ele('Item').ele({'Type' : 'seektable'}).up().up().up().up()
    const {track, filename, tracks, trackid} = fileData

    for (const [side, trackFileName] of Object.entries(tracks)) {
        if (side=='left') {
            doc.ele('Item').ele({'Name' : track+'_'+side}).up().ele({'FileName' : trackFileName}).up()
                .ele('StreamFormat').ele({'Codec' : 'ADPCM'}).up().ele('Samples', { 'value': fileData.samples }).up().ele('SampleRate', { 'value': fileData.sample_rate }).up().ele('Headroom', { 'value': "-170" }).up().up()
                .ele('Chunks').ele('Item').ele({'Type' : 'markers'}).up().ele('Markers').ele('Item')
                .ele({'Name' : 'trackid'}).up().ele('Value', { 'value': fileData.trackid }).up().ele('SampleOffset', { 'value': '500' }).up()
        } else if (side=='right') {
            doc.ele('Item').ele({'Name' : track+'_'+side}).up().ele({'FileName' : trackFileName}).up()
            .ele('StreamFormat').ele({'Codec' : 'ADPCM'}).up().ele('Samples', { 'value': fileData.samples }).up().ele('SampleRate', { 'value': fileData.sample_rate }).up().ele('Headroom', { 'value': "-170" }).up()
        }
    }
    
    const xml = doc.end({ prettyPrint: true });
    fs.writeFile('./'+track+'.awc.xml', xml, err => {
        if (err) {
            console.error(err);
        }
    });
}

async function main() {
    await constructFileArray()
    for (const [filename, fileData] of Object.entries(trackData)) {
        const tracks = fileData['tracks']
        for (const [side, track] of Object.entries(tracks)) {
            await constructWav(fileData.track, filename, side)
            await getWavData(fileData.track, filename, side)
        }
        await constructXML(fileData)
    }
    await construct54XML()
}

main();

async function construct54XML() {
    if (!fs.existsSync('data')){
        fs.mkdirSync('data');
    }
    // const doc = create({ version: '1.0', encoding: "UTF-8" })
    // .ele('Dat54')
    // .ele('Version', { 'value': '7314721' }).up()
    // .ele('ContainerPaths')
    // for (const [key, value] of Object.entries(trackData)) {
    //     doc.ele({'Item' : 'songdirectory\\' + value.track}).up()
    // }
    // doc.ele('Items').ele('Item')

    // for (const [key, value] of Object.entries(trackData)) {
    //     doc.ele('Item', { 'type': 'StreamingSound' }).ele({'Name' : value.track+'_song'}).up().ele('Header').ele('Flags', { 'value': '0x0180C001' }).up()
    //         .ele('Flags2', { 'type': '0xAA90AAAA' }).up().ele('DopplerFactor', { 'value': '0' }).up().ele({'Item' : 'hash_45EB536F'}).up().ele('Unk20', { 'value': '0' }).up()
    //         .ele('Unk21', { 'value': '1' }).up()
    //     .ele('Duration', { 'value': value.duration }).up()
    //     .ele('ChildSounds').ele({'Item' : value.track+'_left_simple'}).up().ele({'Item' : value.track+'_right_simple'}).up()
    //     // for (const [trackkey, trackfilename] of Object.entries(trackData[key].tracks)) {
    //     //     doc.ele('Item', { 'type': 'StreamingSound' }).ele('Header')
    //     // }
    // }

    var containerPaths = { Item: [] };
    for (const [_, value] of Object.entries(trackData)) {
        let containerPathsTrack = 'songdirectory\\'+value.track
        containerPaths['Item'].push(containerPathsTrack)
    }

    var trackInfo = [];
    const asdfItems = []
    for (const [key, value] of Object.entries(trackData)) {
        const simpleInfo = { Item: [] }
        for (const [channelKey, channelFileName] of Object.entries(trackData[key].tracks)) {
            let simpleASDF = value.track+'_'+channelKey+'_simple'
            simpleInfo['Item'].push(simpleASDF)
        }
        // const indTrack = []
        const streamingSound = {Item: {
                '@type': 'StreamingSound',
                Name: value.track+'_song',
                Header: {
                    Flag: {
                        '@value': '0x0180C001',
                    },
                    Flags2: {
                        '@value': '0xAA90AAAA',
                    },
                    DopplerFactor: {
                        '@value': '0',
                    },
                    Category: 'hash_45EB536F',
                    Unk20: {
                        '@value': '0',
                    },
                    Unk21: {
                        '@value': '1',
                    },
                },
                Duration: {
                    '@value': trackData[key].duration,
                },
                ChildSounds: simpleInfo
            },
        }
        asdfItems.push(streamingSound)
        const simpleSound1 = {Item: {
                '@type': 'SimpleSound',
                Name: value.track+'_left_simple',
                Header: {
                    Flag: {
                        '@value': '0x00800040',
                    },
                    Pan: {
                        '@value': '307',
                    },
                    Unk20: {
                        '@value': '0',
                    },
                },
                ContainerName: 'songdirectory/'+value.track,
                FileName: value.track+'_left',
                WaveSlotNum: '0',
            }
        }
        asdfItems.push(simpleSound1)
        const simpleSound2 = {Item: {
                '@type': 'SimpleSound',
                Name: value.track+'_right_simple',
                Header: {
                    Flag: {
                        '@value': '0x00800040',
                    },
                    Pan: {
                        '@value': '53',
                    },
                    Unk20: {
                        '@value': '0',
                    },
                },
                ContainerName: 'songdirectory/'+value.track,
                FileName: value.track+'_right',
                WaveSlotNum: '0',
            }
        }
        asdfItems.push(simpleSound2)
    }
    let result = asdfItems.map(a => a.Item);
    const obj = {
        Dat54: {
            Version: {
                '@value': '6353779',
            },
            ContainerPaths: containerPaths,
            Items: {
                Item: asdfItems.map(a => a.Item),
            },
            
        }
    };
        
    const doc = create(obj);
    const xml = doc.end({ prettyPrint: true });
    console.log(xml)
    fs.writeFile('./data/dlccustomsongs_sound.dat54.rel.xml', xml, err => {
        if (err) {
            console.error(err);
        }
    });
}