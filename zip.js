/**
 * Minimal ZIP reader/writer for Action Hub bundles.
 *
 * The plugin deliberately has no runtime dependencies, and Node's stdlib has no
 * zip container. This module implements only what a bundle needs: store/deflate
 * entries, UTF-8 names, no ZIP64 and no encryption. It is not a general-purpose
 * zip library; unknown features are rejected instead of guessed.
 *
 * @module dsh-action-hub/zip
 */
import zlib from 'node:zlib';

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;
const MAX_ENTRIES = 2048;
const MAX_UNCOMPRESSED = 128 * 1024 * 1024;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const value = date instanceof Date ? date : new Date();
  const year = Math.max(1980, value.getFullYear());
  const dosTime = (value.getHours() << 11) | (value.getMinutes() << 5) | Math.floor(value.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((value.getMonth() + 1) << 5) | value.getDate();
  return { dosTime: dosTime & 0xffff, dosDate: dosDate & 0xffff };
}

/**
 * Create a ZIP buffer.
 *
 * @param {Array<{ name: string, data: Buffer | Uint8Array, mtime?: Date }>} entries
 * @returns {Buffer}
 */
export function createZip(entries) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const entry of entries) {
    if (entries.length > MAX_ENTRIES) throw new Error('ZIP 条目过多');
    const name = Buffer.from(String(entry.name), 'utf8');
    const data = Buffer.from(entry.data);
    const method = data.length === 0 ? 0 : 8;
    const compressed = method === 8 ? zlib.deflateRawSync(data) : data;
    const crc = crc32(data);
    const { dosTime, dosDate } = dosDateTime(entry.mtime);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_SIG, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, compressed);

    const header = Buffer.alloc(46);
    header.writeUInt32LE(CENTRAL_SIG, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(method, 10);
    header.writeUInt16LE(dosTime, 12);
    header.writeUInt16LE(dosDate, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(compressed.length, 20);
    header.writeUInt32LE(data.length, 24);
    header.writeUInt16LE(name.length, 28);
    header.writeUInt16LE(0, 30);
    header.writeUInt16LE(0, 32);
    header.writeUInt16LE(0, 34);
    header.writeUInt16LE(0, 36);
    header.writeUInt32LE(0, 38);
    header.writeUInt32LE(offset, 42);
    central.push(header, name);
    offset += local.length + name.length + compressed.length;
  }
  const centralBuffer = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIG, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, centralBuffer, eocd]);
}

/**
 * Read a ZIP buffer created by `createZip` (or a compatible ordinary zip).
 *
 * @param {Buffer} buffer
 * @returns {Map<string, Buffer>} entry name → bytes.
 */
export function readZip(buffer) {
  const input = Buffer.from(buffer);
  let eocd = -1;
  const start = Math.max(0, input.length - 65557);
  for (let index = input.length - 22; index >= start; index -= 1) {
    if (input.readUInt32LE(index) === EOCD_SIG) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) throw new Error('不是有效的 ZIP 文件');
  const count = input.readUInt16LE(eocd + 10);
  const centralSize = input.readUInt32LE(eocd + 12);
  const centralOffset = input.readUInt32LE(eocd + 16);
  if (count === 0xffff || centralOffset === 0xffffffff) throw new Error('不支持 ZIP64');
  if (count > MAX_ENTRIES) throw new Error('ZIP 条目过多');
  if (centralOffset + centralSize > input.length) throw new Error('ZIP 中央目录损坏');
  const entries = new Map();
  let cursor = centralOffset;
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    if (input.readUInt32LE(cursor) !== CENTRAL_SIG) throw new Error('ZIP 中央目录损坏');
    const flags = input.readUInt16LE(cursor + 8);
    const method = input.readUInt16LE(cursor + 10);
    const compressedSize = input.readUInt32LE(cursor + 20);
    const uncompressedSize = input.readUInt32LE(cursor + 24);
    const nameLength = input.readUInt16LE(cursor + 28);
    const extraLength = input.readUInt16LE(cursor + 30);
    const commentLength = input.readUInt16LE(cursor + 32);
    const localOffset = input.readUInt32LE(cursor + 42);
    const name = input.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    cursor += 46 + nameLength + extraLength + commentLength;
    if ((flags & 0x0001) !== 0) throw new Error('不支持加密 ZIP');
    if (method !== 0 && method !== 8) throw new Error(`不支持的压缩方式：${method}`);
    if (localOffset + 30 > input.length) throw new Error('ZIP 条目越界');
    if (input.readUInt32LE(localOffset) !== LOCAL_SIG) throw new Error('ZIP 本地头损坏');
    const localNameLength = input.readUInt16LE(localOffset + 26);
    const localExtraLength = input.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    if (dataStart + compressedSize > input.length) throw new Error('ZIP 条目越界');
    const raw = input.subarray(dataStart, dataStart + compressedSize);
    const data = method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw);
    if (data.length !== uncompressedSize) throw new Error(`ZIP 条目大小不符：${name}`);
    total += data.length;
    if (total > MAX_UNCOMPRESSED) throw new Error('ZIP 解压后过大');
    if (name.endsWith('/')) continue;
    entries.set(name, data);
  }
  return entries;
}
