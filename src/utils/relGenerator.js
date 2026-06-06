const fs = require("fs");
const path = require("path");

const REL_TYPES = {
  Dat54: 54,
  Dat151: 151,
};

const DAT54_TYPES = {
  StreamingSound: 8,
  SimpleSound: 12,
  SoundSet: 32,
};

const DAT151_TYPES = {
  RadioStationList: 24,
  RadioStationSettings: 25,
  RadioStationTrackList: 26,
};

function uint32(value) {
  return value >>> 0;
}

function jenkHash(text) {
  if (!text) return 0;
  if (typeof text === "string" && text.startsWith("hash_")) {
    return Number.parseInt(text.slice(5), 16) >>> 0;
  }

  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = uint32(h + (text.charCodeAt(i) & 0xff));
    h = uint32(h + uint32(h << 10));
    h = uint32(h ^ (h >>> 6));
  }
  h = uint32(h + uint32(h << 3));
  h = uint32(h ^ (h >>> 11));
  h = uint32(h + uint32(h << 15));
  return h;
}

class BinaryWriter {
  constructor() {
    this.chunks = [];
    this.length = 0;
  }

  get position() {
    return this.length;
  }

  writeBuffer(buffer) {
    if (!buffer || buffer.length === 0) return;
    this.chunks.push(buffer);
    this.length += buffer.length;
  }

  writeUInt8(value) {
    const buffer = Buffer.allocUnsafe(1);
    buffer.writeUInt8(value & 0xff, 0);
    this.writeBuffer(buffer);
  }

  writeInt16(value) {
    const buffer = Buffer.allocUnsafe(2);
    buffer.writeInt16LE(value, 0);
    this.writeBuffer(buffer);
  }

  writeUInt16(value) {
    const buffer = Buffer.allocUnsafe(2);
    buffer.writeUInt16LE(value & 0xffff, 0);
    this.writeBuffer(buffer);
  }

  writeUInt32(value) {
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeUInt32LE(uint32(value), 0);
    this.writeBuffer(buffer);
  }

  padTo(alignment) {
    const padding = (alignment - (this.position % alignment)) % alignment;
    if (padding > 0) this.writeBuffer(Buffer.alloc(padding));
  }

  toBuffer() {
    return Buffer.concat(this.chunks, this.length);
  }
}

function masked(flags, mask) {
  return uint32(flags & mask);
}

function bit(flags, bitIndex) {
  return (flags & (2 ** bitIndex)) !== 0;
}

function writeRelSoundHeader(writer, header = {}) {
  const flags = uint32(header.flags ?? 0xaaaaaaaa);
  writer.writeUInt32(flags);

  if (masked(flags, 0xff) !== 0xaa) {
    if (bit(flags, 0)) writer.writeUInt32(header.flags2 ?? 0);
    if (bit(flags, 1)) writer.writeUInt16(header.maxHeaderSize ?? 0);
    if (bit(flags, 2)) writer.writeInt16(header.volume ?? 0);
    if (bit(flags, 3)) writer.writeUInt16(header.volumeVariance ?? 0);
    if (bit(flags, 4)) writer.writeInt16(header.pitch ?? 0);
    if (bit(flags, 5)) writer.writeUInt16(header.pitchVariance ?? 0);
    if (bit(flags, 6)) writer.writeUInt16(header.pan ?? 0);
    if (bit(flags, 7)) writer.writeUInt16(header.panVariance ?? 0);
  }
  if (masked(flags, 0xff00) !== 0xaa00) {
    if (bit(flags, 8)) writer.writeInt16(header.preDelay ?? 0);
    if (bit(flags, 9)) writer.writeUInt16(header.preDelayVariance ?? 0);
    if (bit(flags, 10)) writer.writeUInt32(header.startOffset ?? 0);
    if (bit(flags, 11)) writer.writeUInt32(header.startOffsetVariance ?? 0);
    if (bit(flags, 12)) writer.writeUInt16(header.attackTime ?? 0);
    if (bit(flags, 13)) writer.writeUInt16(header.releaseTime ?? 0);
    if (bit(flags, 14)) writer.writeUInt16(header.dopplerFactor ?? 0);
    if (bit(flags, 15)) writer.writeUInt32(header.category ?? 0);
  }
  if (masked(flags, 0xff0000) !== 0xaa0000) {
    if (bit(flags, 16)) writer.writeUInt16(header.lpfCutoff ?? 0);
    if (bit(flags, 17)) writer.writeUInt16(header.lpfCutoffVariance ?? 0);
    if (bit(flags, 18)) writer.writeUInt16(header.hpfCutoff ?? 0);
    if (bit(flags, 19)) writer.writeUInt16(header.hpfCutoffVariance ?? 0);
    if (bit(flags, 20)) writer.writeUInt32(header.volumeCurve ?? 0);
    if (bit(flags, 21)) writer.writeInt16(header.volumeCurveScale ?? 0);
    if (bit(flags, 22)) writer.writeUInt8(header.volumeCurvePlateau ?? 0);
    if (bit(flags, 23)) writer.writeUInt8(header.speakerMask ?? 0);
  }
  if (masked(flags, 0xff000000) !== 0xaa000000) {
    if (bit(flags, 24)) writer.writeUInt8(header.effectRoute ?? 0);
    if (bit(flags, 25)) writer.writeUInt32(header.preDelayVariable ?? 0);
    if (bit(flags, 26)) writer.writeUInt32(header.startOffsetVariable ?? 0);
    if (bit(flags, 27)) writer.writeUInt16(header.smallReverbSend ?? 0);
    if (bit(flags, 28)) writer.writeUInt16(header.mediumReverbSend ?? 0);
    if (bit(flags, 29)) writer.writeUInt16(header.largeReverbSend ?? 0);
    if (bit(flags, 30)) writer.writeUInt16(header.unk25 ?? 0);
    if (bit(flags, 31)) writer.writeUInt16(header.unk26 ?? 0);
  }
}

function getRelSoundHeaderLength(header = {}) {
  const writer = new BinaryWriter();
  writeRelSoundHeader(writer, header);
  return writer.position;
}

function writeDat54RecordPayload(writer, record) {
  writer.writeUInt8(record.typeId);
  writeRelSoundHeader(writer, record.header);

  if (record.kind === "simple") {
    writer.writeUInt32(jenkHash(record.containerName));
    writer.writeUInt32(jenkHash(record.fileName));
    writer.writeUInt8(record.waveSlotIndex ?? 0);
    return;
  }

  if (record.kind === "streaming") {
    writer.writeUInt32(record.duration ?? 0);
    writer.writeUInt8(record.childSounds.length);
    record.childSounds.forEach((sound) => writer.writeUInt32(jenkHash(sound)));
    return;
  }

  if (record.kind === "soundSet") {
    const soundSets = [...record.soundSets].sort(
      (a, b) => jenkHash(a.scriptName) - jenkHash(b.scriptName),
    );
    writer.writeUInt32(soundSets.length);
    soundSets.forEach((item) => {
      writer.writeUInt32(jenkHash(item.scriptName));
      writer.writeUInt32(jenkHash(item.childSound));
    });
  }
}

function writeDat151TypeAndOffset(writer, typeId, nameTableOffset = 0) {
  writer.writeUInt32(((nameTableOffset & 0xffffff) << 8) | (typeId & 0xff));
}

function writeDat151RecordPayload(writer, record) {
  writeDat151TypeAndOffset(writer, record.typeId, record.nameTableOffset ?? 0);

  if (record.kind === "radioTrackList") {
    writer.writeUInt32(record.flags ?? 0xaaaaaaa4);
    writer.writeUInt8(record.category ?? 2);
    writer.writeUInt32(0);
    writer.writeUInt32(0);
    writer.writeUInt8(record.numHistorySpaceElems ?? 0);
    writer.writeUInt32(0);
    for (let i = 0; i < 10; i++) writer.writeUInt32(0);
    writer.writeUInt32(record.tracks.length);
    writer.writeUInt16(0);
    writer.writeUInt32(record.tracks.length);
    record.tracks.forEach((track) => {
      writer.writeUInt32(jenkHash(track.context));
      writer.writeUInt32(jenkHash(track.soundRef));
    });
    return;
  }

  if (record.kind === "radioStation") {
    writer.writeUInt32(record.flags ?? 0xaa9009aa);
    writer.writeUInt32(record.wheelPosition ?? 28000);
    writer.writeUInt32(0);
    writer.writeUInt8(record.genre ?? 1);
    writer.writeUInt8(record.ambientRadioVol ?? 0);
    const radioName = Buffer.alloc(32);
    radioName.write(
      record.radioName ?? "",
      0,
      Math.min((record.radioName ?? "").length, 32),
      "ascii",
    );
    writer.writeBuffer(radioName);
    writer.writeUInt16(0);
    writer.writeUInt32(record.trackList.length);
    record.trackList.forEach((trackListName) =>
      writer.writeUInt32(jenkHash(trackListName)),
    );
    return;
  }

  if (record.kind === "radioStationList") {
    writer.writeUInt32(record.stations.length);
    record.stations.forEach((station) => writer.writeUInt32(jenkHash(station)));
  }
}

function rotateRight8(value) {
  return ((value >>> 8) | (value << 24)) >>> 0;
}

function buildNameTable(nameTable) {
  const names = nameTable ?? [];
  const offsets = [];
  let offset = 0;
  for (const name of names) {
    offsets.push(offset);
    offset += Buffer.byteLength(name, "ascii") + 1;
  }

  return {
    names,
    length: names.length > 0 ? 4 + offsets.length * 4 + offset : 4,
    offsets,
  };
}

function validateRelTableOffsets(rel, offsets, tableName) {
  for (const offset of offsets) {
    if (offset < 8 || offset + 4 > rel.length) {
      throw new Error(
        `Generated REL ${tableName} table contains invalid offset ${offset} for file size ${rel.length}.`,
      );
    }
  }
}

function buildRelFile({
  relType,
  version,
  nameTable = [],
  records,
  writerForRecord,
  hashOffsetsForRecord,
  packOffsetsForRecord,
}) {
  const dataWriter = new BinaryWriter();
  dataWriter.writeUInt32(version);

  const recordsWithData = records.map((record) => {
    const offset = dataWriter.position;
    writerForRecord(dataWriter, record);
    const length = dataWriter.position - offset;
    return { ...record, offset, length };
  });

  const dataBlock = dataWriter.toBuffer();
  const nameTableInfo = buildNameTable(nameTable);
  const indexRecords = [...recordsWithData].sort(
    (a, b) => rotateRight8(a.nameHash) - rotateRight8(b.nameHash),
  );

  const hashTableOffsets = [];
  const packTableOffsets = [];
  for (const record of recordsWithData) {
    const hashOffsets = hashOffsetsForRecord?.(record) ?? [];
    hashOffsets.forEach((offset) =>
      hashTableOffsets.push(record.offset + 8 + offset),
    );

    const packOffsets = packOffsetsForRecord?.(record) ?? [];
    packOffsets.forEach((offset) =>
      packTableOffsets.push(record.offset + 8 + offset),
    );
  }

  const writer = new BinaryWriter();
  writer.writeUInt32(relType);
  writer.writeUInt32(dataBlock.length);
  writer.writeBuffer(dataBlock);

  writer.writeUInt32(nameTableInfo.length);
  writer.writeUInt32(nameTableInfo.names.length);
  if (nameTableInfo.names.length > 0) {
    nameTableInfo.offsets.forEach((offset) => writer.writeUInt32(offset));
    nameTableInfo.names.forEach((name) => {
      writer.writeBuffer(Buffer.from(name, "ascii"));
      writer.writeUInt8(0);
    });
  }

  writer.writeUInt32(indexRecords.length);
  indexRecords.forEach((record) => {
    writer.writeUInt32(record.nameHash);
    writer.writeUInt32(record.offset);
    writer.writeUInt32(record.length);
  });

  writer.writeUInt32(hashTableOffsets.length);
  hashTableOffsets.forEach((offset) => writer.writeUInt32(offset));

  writer.writeUInt32(packTableOffsets.length);
  packTableOffsets.forEach((offset) => writer.writeUInt32(offset));

  const rel = writer.toBuffer();
  validateRelTableOffsets(rel, hashTableOffsets, "hash");
  validateRelTableOffsets(rel, packTableOffsets, "pack");
  return rel;
}

function dat54HeaderOffset(record) {
  return 1 + getRelSoundHeaderLength(record.header);
}

function getDat54HashOffsets(record) {
  const base = dat54HeaderOffset(record);
  if (record.kind === "streaming") {
    return record.childSounds.map((_, index) => base + 4 + 1 + index * 4);
  }
  if (record.kind === "soundSet") {
    return record.soundSets.map((_, index) => base + 8 + index * 8);
  }
  return [];
}

function getDat54PackOffsets(record) {
  if (record.kind === "simple") {
    return [dat54HeaderOffset(record)];
  }
  return [];
}

function createSimpleDat54Records(trackData, audioBankName, soundSetName) {
  const records = [];
  const soundSets = [];

  for (const value of Object.values(trackData)) {
    const simpleName = `${value.track}_sp`;
    records.push({
      kind: "simple",
      typeId: DAT54_TYPES.SimpleSound,
      name: simpleName,
      nameHash: jenkHash(simpleName),
      header: {
        flags: 0x00008004,
        volume: 255,
        category: jenkHash("scripted"),
      },
      containerName: `audiodirectory/${audioBankName}`,
      fileName: simpleName,
      waveSlotIndex: 0,
    });
    soundSets.push({ scriptName: value.track, childSound: simpleName });
  }

  records.push({
    kind: "soundSet",
    typeId: DAT54_TYPES.SoundSet,
    name: soundSetName,
    nameHash: jenkHash(soundSetName),
    header: { flags: 0xaaaaaaaa },
    soundSets,
  });

  return records;
}

function createRadioDat54Records(trackData) {
  const records = [];

  for (const value of Object.values(trackData)) {
    records.push({
      kind: "streaming",
      typeId: DAT54_TYPES.StreamingSound,
      name: `${value.track}_song`,
      nameHash: jenkHash(`${value.track}_song`),
      header: {
        flags: 0x0180c001,
        flags2: 0xaa90aaaa,
        dopplerFactor: 0,
        category: jenkHash("hash_45EB536F"),
        speakerMask: 0,
        effectRoute: 0,
      },
      duration: value.duration ?? 0,
      childSounds: [
        `${value.track}_left_simple`,
        `${value.track}_right_simple`,
      ],
    });

    records.push({
      kind: "simple",
      typeId: DAT54_TYPES.SimpleSound,
      name: `${value.track}_left_simple`,
      nameHash: jenkHash(`${value.track}_left_simple`),
      header: { flags: 0x00800040, pan: 307, speakerMask: 0 },
      containerName: `audiodirectory/${value.track}`,
      fileName: `${value.track}_left`,
      waveSlotIndex: 0,
    });

    records.push({
      kind: "simple",
      typeId: DAT54_TYPES.SimpleSound,
      name: `${value.track}_right_simple`,
      nameHash: jenkHash(`${value.track}_right_simple`),
      header: { flags: 0x00800040, pan: 53, speakerMask: 0 },
      containerName: `audiodirectory/${value.track}`,
      fileName: `${value.track}_right`,
      waveSlotIndex: 0,
    });
  }

  return records;
}

function createRadioDat151Records(trackData) {
  const tracks = Object.values(trackData).map((value) => ({
    context: "",
    soundRef: `${value.track}_song`,
  }));

  return [
    {
      kind: "radioTrackList",
      typeId: DAT151_TYPES.RadioStationTrackList,
      name: "customsongs_radiotrack01",
      nameHash: jenkHash("customsongs_radiotrack01"),
      flags: 0xaaaaaaa4,
      category: 2,
      numHistorySpaceElems: 0,
      tracks,
    },
    {
      kind: "radioStation",
      typeId: DAT151_TYPES.RadioStationSettings,
      name: "gmm_test_radio_station",
      nameHash: jenkHash("gmm_test_radio_station"),
      flags: 0xaa9009aa,
      wheelPosition: 28000,
      genre: 1,
      ambientRadioVol: 0,
      radioName: "RADIO_49_COMMUNITYSLOT",
      trackList: ["customsongs_radiotrack01"],
    },
    {
      kind: "radioStationList",
      typeId: DAT151_TYPES.RadioStationList,
      name: "radio_stations_dlc",
      nameHash: jenkHash("radio_stations_dlc"),
      stations: ["gmm_test_radio_station"],
    },
  ];
}

function getDat151HashOffsets(record) {
  if (record.kind === "radioStationList") {
    return record.stations.map((_, index) => 4 + index * 4);
  }
  if (record.kind === "radioStation") {
    return record.trackList.map((_, index) => 52 + index * 4);
  }
  return [];
}

function deleteIfExists(filepath) {
  fs.rmSync(filepath, { force: true });
}

function writeRelFile(filepath, buffer) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

async function generateRelResources(trackData, generationType, options = {}) {
  const generated = [];

  if (generationType === "simple") {
    const audioBankName = options.audioBankName ?? "custom_sounds";
    const soundSetName = options.soundSetName ?? "special_soundset";
    deleteIfExists(
      path.join("output", "data", "audioexample_sounds.dat54.rel"),
    );
    const records = createSimpleDat54Records(
      trackData,
      audioBankName,
      soundSetName,
    );
    const dat54 = buildRelFile({
      relType: REL_TYPES.Dat54,
      version: 7314721,
      nameTable: [`audiodirectory\\${audioBankName}`],
      records,
      writerForRecord: writeDat54RecordPayload,
      hashOffsetsForRecord: getDat54HashOffsets,
      packOffsetsForRecord: getDat54PackOffsets,
    });
    generated.push(
      writeRelFile(
        path.join("output", "data", `${audioBankName}.dat54.rel`),
        dat54,
      ),
    );
    return generated;
  }

  if (generationType === "radio") {
    const dat54Records = createRadioDat54Records(trackData);
    const dat54NameTable = Object.values(trackData).map(
      (value) => `audiodirectory\\${value.track}`,
    );
    const dat54 = buildRelFile({
      relType: REL_TYPES.Dat54,
      version: 6353779,
      nameTable: dat54NameTable,
      records: dat54Records,
      writerForRecord: writeDat54RecordPayload,
      hashOffsetsForRecord: getDat54HashOffsets,
      packOffsetsForRecord: getDat54PackOffsets,
    });
    generated.push(
      writeRelFile(
        path.join("output", "data", "dlccustomsongs_sound.dat54.rel"),
        dat54,
      ),
    );

    const dat151Records = createRadioDat151Records(trackData);
    const dat151 = buildRelFile({
      relType: REL_TYPES.Dat151,
      version: 6353781,
      nameTable: [],
      records: dat151Records,
      writerForRecord: writeDat151RecordPayload,
      hashOffsetsForRecord: getDat151HashOffsets,
      packOffsetsForRecord: () => [],
    });
    generated.push(
      writeRelFile(
        path.join("output", "data", "dlccustomsongs_game.dat151.rel"),
        dat151,
      ),
    );
  }

  return generated;
}

module.exports = {
  generateRelResources,
};
