const fs = require('fs');
const { create } = require('xmlbuilder2');

async function constructAWCXML(fileData) {
    const chunksInfo = []
    const streamFormatItem = {
        Item: {
            Type: 'streamformat',
            BlockSize: { '@value': "524288" },
        },
    };
    chunksInfo.push(streamFormatItem);

    const dataItem = {
        Item: {
            Type: 'data',
        },
    };
    chunksInfo.push(dataItem);

    const seektableItem = {
        Item: {
            Type: 'seektable',
        },
    };
    chunksInfo.push(seektableItem);

    const trackInfo = []
    
    const streamingSound = {
        Item: {
            Chunks: {
                Item: chunksInfo.map(a => a.Item),
            },
        },
    };
    trackInfo.push(streamingSound);

    const leftTrackData = {
        Item: {
            Name: fileData.track+'_left',
            FileName: fileData.tracks['left'],
            StreamFormat: {
                Codec: 'ADPCM',
                Samples: { '@value': fileData.samples },
                SampleRate: { '@value': fileData.sample_rate },
                Headroom: { '@value': "-170" },
            },
            Chunks: {
                Item: {
                    Type: 'markers',
                    Markers: {
                        Item: {
                            Name: 'trackid',
                            Value: { '@value': fileData.trackid },
                            SampleOffset: { '@value': "500" },
                        }
                    }
                },
            }
        },
    };
    trackInfo.push(leftTrackData);

    const rightTrackData = {
        Item: {
            Name: fileData.track+'_right',
            FileName: fileData.tracks['right'],
            StreamFormat: {
                Codec: 'ADPCM',
                Samples: { '@value': fileData.samples },
                SampleRate: { '@value': fileData.sample_rate },
                Headroom: { '@value': "-170" },
            }
        },
    };
    trackInfo.push(rightTrackData);

    const obj = {
        AudioWaveContainer: {
            Version: {
                '@value': '1',
            },
            ChunkIndices: { '@value': 'True' },
            MultiChannel: { '@value': 'True' },
            Streams: {
                Item: trackInfo.map(a => a.Item),
            },
            
        }
    };
        
    const doc = create({ encoding: "UTF-8" }, obj);
    const xml = doc.end({ prettyPrint: true });

    if (!fs.existsSync('audiodirectory')){
        fs.mkdirSync('audiodirectory');
    }

    fs.writeFile('./audiodirectory/'+fileData.track+'.awc.xml', xml, err => {
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
        const containerPathsTrack = 'audiodirectory\\'+value.track
        containerPaths['Item'].push(containerPathsTrack)
    }

    const trackInfo = []
    for (const [key, value] of Object.entries(trackData)) {
        const simpleInfo = { Item: [] }
        for (const [channelKey, channelFileName] of Object.entries(trackData[key].tracks)) {
            const simpleTrackName = value.track+'_'+channelKey+'_simple'
            simpleInfo['Item'].push(simpleTrackName)
        }
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
        const itemObj = {Hash0: {}, Hash1: value.track+'_song'}
        simpleInfo['Item'].push(itemObj)
    }

    const itemInfo = []

    const info1 = {Item: {
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
    itemInfo.push(info1)

    const info2 = {Item: {
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
    itemInfo.push(info2)

    const info3 = {Item: {
        '@type': 'RadioStationList', '@ntOffset': '0',
        Name: 'radio_stations_dlc',
        Stations: { Item: 'gmm_test_radio_station' }
    }}
    itemInfo.push(info3)

    const info4 = {Items: {
        Item: trackInfo.map(a => a.Item),
    }}
    itemInfo.push(info4)
    
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

    fs.writeFile('./data/dlccustomsongs_game.dat151.rel.xml', xml, err => {
        if (err) {
            console.error(err);
        }
    });
}

exports.construct54XML = construct54XML;
exports.constructAWCXML = constructAWCXML;
exports.construct151XML = construct151XML; 