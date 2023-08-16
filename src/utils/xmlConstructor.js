const fs = require('fs');
const { create } = require('xmlbuilder2');

async function constructAWCXML(fileData) {
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

async function construct54XML(trackData) {
    if (!fs.existsSync('data')){
        fs.mkdirSync('data');
    }

    var containerPaths = { Item: [] };
    for (const [_, value] of Object.entries(trackData)) {
        let containerPathsTrack = 'songdirectory\\'+value.track
        containerPaths['Item'].push(containerPathsTrack)
    }

    const trackInfo = []
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
                    Flags: {
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
        trackInfo.push(streamingSound)
        const simpleSound1 = {Item: {
                '@type': 'SimpleSound',
                Name: value.track+'_left_simple',
                Header: {
                    Flags: {
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
                WaveSlotNum: {
                    '@value': '0',
                },
            }
        }
        trackInfo.push(simpleSound1)
        const simpleSound2 = {Item: {
                '@type': 'SimpleSound',
                Name: value.track+'_right_simple',
                Header: {
                    Flags: {
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
                WaveSlotNum: {
                    '@value': '0',
                },
            }
        }
        trackInfo.push(simpleSound2)
    }

    const obj = {
        Dat54: {
            Version: {
                '@value': '6353779',
            },
            ContainerPaths: containerPaths,
            Items: {
                Item: trackInfo.map(a => a.Item),
            },
            
        }
    };
        
    const doc = create(obj);
    const xml = doc.end({ prettyPrint: true });
    // console.log(xml)
    fs.writeFile('./data/dlccustomsongs_sound.dat54.rel.xml', xml, err => {
        if (err) {
            console.error(err);
        }
    });
}

exports.construct54XML = construct54XML;
exports.constructAWCXML = constructAWCXML;