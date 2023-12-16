const fs = require('fs');
const { create } = require('xmlbuilder2');
const { buildWeapons151, weapon54Data } = require('./weaponHashes');

async function constructAWCXMLWeapon(trackData) {
    if (!fs.existsSync('./output/data')) {
        fs.mkdirSync('./output/data');
    }

    var containerPaths = { Item: [] };
    for (const [_, value] of Object.entries(trackData)) {
        let containerPathsTrack = './output/\\'+value.track
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
                Samples: { '@value': value.samples },
                SampleRate: { '@value': value.sample_rate },
                Headroom: { '@value': '-199' },
                PlayBegin: { '@value': '0' },
                PlayEnd: { '@value': '0' },
                LoopBegin: { '@value': '0' },
                LoopEnd: { '@value': '0' },
                LoopPoint: { '@value': '-1' },
                Peak: { '@unk': '0' }
            },
        }
        simpleInfo.push(simpleItem1)
        simpleInfo.push(simpleItem2)
        simpleInfo.push(simpleItem3)
        const streamingSound = {
            Item: {
                Name: value.track,
                FileName: value.tracks['left'],
                Chunks: {
                    Item: simpleInfo.map(a => a.Item),
                },
            },
        }
        trackInfo.push(streamingSound)

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
        fs.writeFile('./output/audiodirectory/custom_weapon_sounds.awc.xml', xml, err => {
            if (err) {
                console.error(err);
            }
        });
    }
}

async function construct54XMLWeapon(trackData, gun) {
    if (!fs.existsSync('./output/data')){
        fs.mkdirSync('./output/data');
    }

    var containerPaths = { Item: [] };
    for (const [_, value] of Object.entries(trackData)) {
        const containerPathsTrack = 'audiodirectory\\'+value.track
        containerPaths['Item'].push(containerPathsTrack)
    }

    const trackInfo = []
    for (const [key, value] of Object.entries(trackData)) {
        const weap54DataItems = { Item: [] }
        const gun54Data = await weapon54Data(gun, value.track+'_stereo')
        for (const [_, values] of Object.entries(gun54Data)) {
            
            weap54DataItems['Item'].push(values)
        }
        const multitracksound = {Item: {
                '@type': 'MultitrackSound',
                Name: value.track+'_master',
                Header: {
                    Flags: {
                        '@value': '0x00008001',
                    },
                    Flags2: {
                        '@value': '0xAAA09AA2',
                    },
                    Category: 'hash_80722AAA',
                },
                ChildSounds: weap54DataItems
            },
        }
        trackInfo.push(multitracksound)

        const simpleInfo = { Item: [] }
        simpleInfo['Item'].push(value.track+'_hi_l',)
        simpleInfo['Item'].push(value.track+'_hi_r',)
        const multitracksound2 = {Item: {
                '@type': 'MultitrackSound',
                Name: value.track+'_stereo',
                Header: {
                    Flags: {
                        '@value': '0x00008035',
                    },
                    Flags2: {
                        '@value': '0xAAA0AAAA',
                    },
                    Volume: {
                        '@value': '200',
                    },
                    Pitch: {
                        '@value': '600',
                    },
                    PitchVariance: {
                        '@value': '100',
                    },
                    Category: 'hash_80722AAA',
                },
                ChildSounds: simpleInfo
            },
        }
        trackInfo.push(multitracksound2)
        
        const simpleSound1 = {Item: {
                '@type': 'SimpleSound',
                Name: value.track+'_hi_l',
                Header: {
                    Flags: {
                        '@value': '0x00800040',
                    },
                    Pan: {
                        '@value': '315',
                    },
                },
                ContainerName: 'dlccustomweaponsounds/custom_weapon_sounds',
                FileName: value.track,
                WaveSlotNum: {
                    '@value': '0',
                },
            }
        }
        trackInfo.push(simpleSound1)
        const simpleSound2 = {Item: {
                '@type': 'SimpleSound',
                Name: value.track+'_hi_r',
                Header: {
                    Flags: {
                        '@value': '0x00800040',
                    },
                    Pan: {
                        '@value': '45',
                    },
                },
                ContainerName: 'dlccustomweaponsounds/custom_weapon_sounds',
                FileName: value.track,
                WaveSlotNum: {
                    '@value': '0',
                },
            }
        }
        trackInfo.push(simpleSound2)

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
    
        fs.writeFile('./output/data/'+value.track+'_game.dat54.rel.xml', xml, err => {
            if (err) {
                console.error(err);
            }
        });
    }
}

async function construct151XMLWeapon(trackData, gun) {
    if (!fs.existsSync('./output/data')){
        fs.mkdirSync('./output/data');
    }
    let u23
    let playerFire
    let name
    let masterName

    const trackInfo = []
    const simpleInfo = { Item: [] }
    for (const [key, value] of Object.entries(trackData)) {
        const itemObj = {Hash0: {}, Hash1: value.track+'_song'}
        simpleInfo['Item'].push(itemObj)
        u23 = value.track+'_hi_l'
        playerFire = value.track+'_master'
        audioItemName = 'audio_item_'+value.track
        masterName = value.track+'_master'
        name = value.track+'_player'

        const itemInfo = []

        const info1 = {Item: {
            '@type': 'WeaponAudioItem', '@ntOffset': '0',
            Name: audioItemName,
            FallBackWeapon: name,
            Weapons: {
                Item: {
                    Category: 'player',
                    Weapon: name,
                },
            },
        }}
        itemInfo.push(info1)

        const weaponData = await buildWeapons151(gun, name, playerFire, u23)
        console.log(weaponData)
        const info2 = {Item: weaponData}
        itemInfo.push(info2)
        
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

        fs.writeFile('./output/data/'+value.track+'_game.dat151.rel.xml', xml, err => {
            if (err) {
                console.error(err);
            }
        });
    }

    
}

module.exports = {
    constructAWCXMLWeapon,
    construct54XMLWeapon,
    construct151XMLWeapon
}