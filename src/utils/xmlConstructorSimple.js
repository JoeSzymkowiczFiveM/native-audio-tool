const fs = require("fs");
const path = require("path");
const { create } = require("xmlbuilder2");

async function constructAWCXMLSimple(
  trackData,
  audioBankName,
  audioCodec = "PCM",
) {
  fs.mkdirSync("./output/audiodirectory", { recursive: true });

  var containerPaths = { Item: [] };
  for (const [_, value] of Object.entries(trackData)) {
    let containerPathsTrack = "./output/\\" + value.track;
    containerPaths["Item"].push(containerPathsTrack);
  }

  const trackInfo = [];
  for (const [key, value] of Object.entries(trackData)) {
    const simpleInfo = [];
    const peakItem = {
      Item: {
        Type: "peak",
      },
    };
    const dataItem = {
      Item: {
        Type: "data",
      },
    };
    const formatItem = {
      Item: {
        Type: "format",
        Codec: audioCodec,
        Samples: {
          "@value": value.samples,
        },
        SampleRate: {
          "@value": value.sample_rate,
        },
        Headroom: {
          "@value": "-100",
        },
        PlayBegin: {
          "@value": "0",
        },
        PlayEnd: {
          "@value": "0",
        },
        LoopBegin: {
          "@value": "0",
        },
        LoopEnd: {
          "@value": "0",
        },
        LoopPoint: {
          "@value": "-1",
        },
        Peak: {
          "@unk": "0",
        },
      },
    };
    simpleInfo.push(peakItem);
    simpleInfo.push(dataItem);
    simpleInfo.push(formatItem);
    const streamingSound = {
      Item: {
        Name: path.parse(value.tracks["left"]).name,
        FileName: value.tracks["left"],
        Chunks: {
          Item: simpleInfo.map((a) => a.Item),
        },
      },
    };
    trackInfo.push(streamingSound);
  }

  const obj = {
    AudioWaveContainer: {
      Version: {
        "@value": "1",
      },
      ChunkIndices: {
        "@value": "True",
      },
      Streams: {
        Item: trackInfo.map((a) => a.Item),
      },
    },
  };

  const doc = create(obj);
  const xml = doc.end({ prettyPrint: true });
  fs.writeFile(
    `./output/audiodirectory/${audioBankName}.awc.xml`,
    xml,
    (err) => {
      if (err) {
        console.error(err);
      }
    },
  );
}

async function construct54XMLSimple(
  trackData,
  audioBankName,
  soundSetName = "special_soundset",
) {
  fs.mkdirSync("./output/data", { recursive: true });

  var containerPaths = { Item: [] };
  for (const [_, value] of Object.entries(trackData)) {
    let containerPathsTrack = "audiodirectory\\" + value.track;
    containerPaths["Item"].push(containerPathsTrack);
  }

  const trackInfo = [];
  const soundSetInfo = [];
  for (const [key, value] of Object.entries(trackData)) {
    const simpleSound1 = {
      Item: {
        "@type": "SimpleSound",
        Name: value.track + "_sp",
        Header: {
          Flags: {
            "@value": "0x00008004",
          },
          Volume: {
            "@value": "255",
          },
          Category: "scripted",
        },
        ContainerName: `audiodirectory/${audioBankName}`,
        FileName: value.track + "_sp",
        WaveSlotIndex: {
          "@value": "0",
        },
      },
    };
    trackInfo.push(simpleSound1);

    const soundSets = {
      Item: {
        ScriptName: value.track,
        ChildSound: value.track + "_sp",
      },
    };
    soundSetInfo.push(soundSets);
  }

  const simpleSound2 = {
    Item: {
      "@type": "SoundSet",
      Name: soundSetName,
      Header: {
        Flags: {
          "@value": "0xAAAAAAAA",
        },
      },
      SoundSets: {
        Item: soundSetInfo.map((a) => a.Item),
      },
    },
  };
  trackInfo.push(simpleSound2);

  const obj = {
    Dat54: {
      Version: {
        "@value": "7314721",
      },
      ContainerPaths: {
        Item: `audiodirectory\\${audioBankName}`,
      },
      Items: {
        Item: trackInfo.map((a) => a.Item),
      },
    },
  };

  const doc = create(obj);
  const xml = doc.end({ prettyPrint: true });

  fs.rmSync("./output/data/audioexample_sounds.dat54.rel.xml", { force: true });
  fs.writeFile(`./output/data/${audioBankName}.dat54.rel.xml`, xml, (err) => {
    if (err) {
      console.error(err);
    }
  });
}

module.exports = {
  constructAWCXMLSimple,
  construct54XMLSimple,
};
