const fs = require('fs');
const { create } = require('xmlbuilder2');

async function constructAWCXMLSimple(trackData) {
    if (!fs.existsSync('data')) {
        fs.mkdirSync('data');
    }

    var containerPaths = { Item: [] };
    for (const [_, value] of Object.entries(trackData)) {
        let containerPathsTrack = 'audiodirectory\\'+value.track
        containerPaths['Item'].push(containerPathsTrack)
    }

    const trackInfo = []
    for (const [key, value] of Object.entries(trackData)) {
        const simpleInfo = []
        let simpleItem1 = {
            Item: {
                Type: 'peak',
            },
        }
        let simpleItem2 = {
            Item: {
                Type: 'data',
            },
        }
        let simpleItem3 = {
            Item: {
                Type: 'peak',
            },
            Item: {
                Type: 'data',
            },
            Item: {
                Type: 'format',
                Codec: 'ADPCM',
                Samples: {
                    '@value': value.samples,
                },
                SampleRate: {
                    '@value': value.sample_rate,
                },
                Headroom: {
                    '@value': '-100',
                },
                PlayBegin: {
                    '@value': '0',
                },
                PlayEnd: {
                    '@value': '0',
                },
                LoopBegin: {
                    '@value': '0',
                },
                LoopEnd: {
                    '@value': '0',
                },
                LoopPoint: {
                    '@value': '-1',
                },
                Peak: {
                    '@unk': '0',
                }
            },
        }
        simpleInfo.push(simpleItem1)
        simpleInfo.push(simpleItem2)
        simpleInfo.push(simpleItem3)
        const streamingSound = {
            Item: {
                Name: value.track,
                FileName: value.tracks['left'],
                // Chunks: simpleInfo,
                Chunks: {
                    Item: simpleInfo.map(a => a.Item),
                },
            },
        }
        trackInfo.push(streamingSound)
    }

    const obj = {
        AudioWaveContainer: {
            Version: {
                '@value': '1',
            },
            ChunkIndices: {
                '@value': 'True',
            },
            Streams: {
                Item: trackInfo.map(a => a.Item),
            },
            
        }
    };
        
    const doc = create(obj);
    const xml = doc.end({ prettyPrint: true });
    // console.log(xml)
    fs.writeFile('./audiodirectory/custom_sounds.awc.xml', xml, err => {
        if (err) {
            console.error(err);
        }
    });
}

async function construct54XMLSimple(trackData) {
    if (!fs.existsSync('data')){
        fs.mkdirSync('data');
    }

    var containerPaths = { Item: [] };
    for (const [_, value] of Object.entries(trackData)) {
        let containerPathsTrack = 'audiodirectory\\'+value.track
        containerPaths['Item'].push(containerPathsTrack)
    }

    const trackInfo = []
    const soundSetInfo = []
    for (const [key, value] of Object.entries(trackData)) {
        const simpleSound1 = {Item: {
                '@type': 'SimpleSound',
                Name: value.track+'_sp',
                Header: {
                    Flags: {
                        '@value': '0x00008004',
                    },
                    Volume: {
                        '@value': '200',
                    },
                    Category: "scripted",
                },
                ContainerName: 'audiodirectory/custom_sounds',
                FileName: value.track,
                WaveSlotNum: {
                    '@value': '0',
                },
            }
        }
        trackInfo.push(simpleSound1)

        const soundSets = {
            Item: {
                ScriptName: value.track,
                ChildSound: value.track+'_sp',
            },
        }
        soundSetInfo.push(soundSets)
    }

    let soundset = process.env.soundset;

    if (soundset === null) {
        soundset = 'special_soundset'
    }

    const simpleSound2 = {Item: {
        '@type': 'SoundSet',
        Name: soundset,
        Header: {
            Flags: {
                '@value': '0xAAAAAAAA',
            },
        },
        SoundSets: {
            Item: soundSetInfo.map(a => a.Item),
        },
    }}
    trackInfo.push(simpleSound2)

    const obj = {
        Dat54: {
            Version: {
                '@value': '7314721',
            },
            ContainerPaths: {
                Item: 'audiodirectory\\custom_sounds',
            },
            Items: {
                Item: trackInfo.map(a => a.Item),
            },
            
        }
    };

    const doc = create(obj);
    const xml = doc.end({ prettyPrint: true });
    // console.log(xml)
    fs.writeFile('./data/audioexample_sounds.dat54.rel.xml', xml, err => {
        if (err) {
            console.error(err);
        }
    });
}

exports.constructAWCXMLSimple = constructAWCXMLSimple;
exports.construct54XMLSimple  = construct54XMLSimple;