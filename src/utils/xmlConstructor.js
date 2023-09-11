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
        let containerPathsTrack = 'audiodirectory\\'+value.track
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
                ContainerName: 'audiodirectory/'+value.track,
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
                ContainerName: 'audiodirectory/'+value.track,
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

async function construct151XML(trackData) {
    if (!fs.existsSync('data')){
        fs.mkdirSync('data');
    }

    const trackInfo = []
    const simpleInfo = { Item: [] }
    for (const [key, value] of Object.entries(trackData)) {
        
        let simpleASDF = value.track+'_song'
        let itemObj = {Hash0: {}, Hash1: simpleASDF}
        simpleInfo['Item'].push(itemObj)
        // Item: trackInfo.map(a => a.Item),
    }

    const itemInfo = []

    const asdf1 = {Item: {
        '@type': 'RadioTrack', '@ntOffset': '0',
        Name: 'customsongs_radiotrack01',
        Unk00: { '@value': '0xAAAAAAA4' },
        TrackType: { '@value': '2' },
        Unk01: { '@value': '0' },
        Unk02: { '@value': '0' },
        Unk03: { '@value': '10' },
        Unk04: { '@value': '0' },
        Unk05: { '@value': '0' },
        Unk06: { '@value': '0' },
        Unk07: { '@value': '0' },
        Unk08: { '@value': '0' },
        Unk09: { '@value': '0' },
        Unk10: { '@value': '0' },
        Unk11: { '@value': '0' },
        Unk12: { '@value': '0' },
        Unk13: { '@value': '0' },
        Unk14: { '@value': '0' },
        Unk15: { '@value': '0' },
        Unk16: { '@value': '0' },
        Tracks: simpleInfo,
    }}
    itemInfo.push(asdf1)

    const asdf2 = {Item: {
        '@type': 'RadioStation', '@ntOffset': '0',
        Name: 'gmm_test_radio_station',
        Unk00: { '@value': '0xAA9009AA' },
        WheelPosition: { '@value': '28000' },
        Unk02: { '@value': '0' },
        MusicGenre: { '@value': '1' },
        RadioName: 'RADIO_49_COMMUNITYSLOT',
        Unk04: { '@value': '0' },
        MusicList: { Item: 'customsongs_radiotrack01' }
    }}
    itemInfo.push(asdf2)
    const asdf3 = {Item: {
        '@type': 'RadioStationList', '@ntOffset': '0',
        Name: 'radio_stations_dlc',
        Stations: { Item: 'gmm_test_radio_station' }
    }}
    itemInfo.push(asdf3)

    const asdf4 = {Items: {
        Item: trackInfo.map(a => a.Item),
    }}
    itemInfo.push(asdf4)
    
    const obj = {
        Dat151: {
            Version: {
                '@value': '6353781',
            },
            Items: {
                Item: itemInfo.map(a => a.Item),
            },
            
        }
    };
        
    const doc = create(obj);
    const xml = doc.end({ prettyPrint: true });
    // console.log(xml)
    fs.writeFile('./data/dlccustomsongs_game.dat151.rel.xml', xml, err => {
        if (err) {
            console.error(err);
        }
    });
}

exports.construct54XML = construct54XML;
exports.constructAWCXML = constructAWCXML;
exports.construct151XML = construct151XML; 