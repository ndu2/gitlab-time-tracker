import fs from 'fs';
import zlib from 'zlib';

const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;

/**
 * convert a JS Date to DOS date/time fields used by the zip format
 */
function dosDateTime(date) {
    const time = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() >> 1) & 0x1f);
    const day = (((Math.max(date.getFullYear(), 1980) - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0xf) << 5) | (date.getDate() & 0x1f);

    return {time, day};
}

/**
 * reverse of dosDateTime
 */
function dosToDate(day, time) {
    const year = ((day >> 9) & 0x7f) + 1980;
    const month = ((day >> 5) & 0xf) - 1;
    const date = day & 0x1f;
    const hours = (time >> 11) & 0x1f;
    const minutes = (time >> 5) & 0x3f;
    const seconds = (time & 0x1f) * 2;

    return new Date(year, month, date, hours, minutes, seconds);
}

/**
 * minimal zip (deflate) writer, so archiving does not require
 * an external dependency.
 */
class Zip {
    constructor() {
        this.entries = [];
    }

    /**
     * add a file to the archive
     * @param name path of the file inside the archive, e.g. "01/abc.json"
     * @param data Buffer with the file's contents
     * @param date last modified date of the entry
     */
    addFile(name, data, date = new Date()) {
        const compressed = zlib.deflateRawSync(data);
        const useCompressed = compressed.length < data.length;

        this.entries.push({
            name,
            data,
            payload: useCompressed ? compressed : data,
            method: useCompressed ? METHOD_DEFLATE : METHOD_STORE,
            crc: zlib.crc32(data),
            date
        });

        return this;
    }

    /**
     * build the zip file as a Buffer
     * @returns {Buffer}
     */
    toBuffer() {
        const localParts = [];
        const centralParts = [];
        let offset = 0;

        for (const entry of this.entries) {
            const nameBuf = Buffer.from(entry.name, 'utf8');
            const {time, day} = dosDateTime(entry.date);

            const localHeader = Buffer.alloc(30);
            localHeader.writeUInt32LE(0x04034b50, 0);
            localHeader.writeUInt16LE(20, 4);
            localHeader.writeUInt16LE(0x0800, 6);
            localHeader.writeUInt16LE(entry.method, 8);
            localHeader.writeUInt16LE(time, 10);
            localHeader.writeUInt16LE(day, 12);
            localHeader.writeUInt32LE(entry.crc, 14);
            localHeader.writeUInt32LE(entry.payload.length, 18);
            localHeader.writeUInt32LE(entry.data.length, 22);
            localHeader.writeUInt16LE(nameBuf.length, 26);
            localHeader.writeUInt16LE(0, 28);

            localParts.push(localHeader, nameBuf, entry.payload);

            const centralHeader = Buffer.alloc(46);
            centralHeader.writeUInt32LE(0x02014b50, 0);
            centralHeader.writeUInt16LE(20, 4);
            centralHeader.writeUInt16LE(20, 6);
            centralHeader.writeUInt16LE(0x0800, 8);
            centralHeader.writeUInt16LE(entry.method, 10);
            centralHeader.writeUInt16LE(time, 12);
            centralHeader.writeUInt16LE(day, 14);
            centralHeader.writeUInt32LE(entry.crc, 16);
            centralHeader.writeUInt32LE(entry.payload.length, 20);
            centralHeader.writeUInt32LE(entry.data.length, 24);
            centralHeader.writeUInt16LE(nameBuf.length, 28);
            centralHeader.writeUInt16LE(0, 30);
            centralHeader.writeUInt16LE(0, 32);
            centralHeader.writeUInt16LE(0, 34);
            centralHeader.writeUInt32LE(0, 38);
            centralHeader.writeUInt32LE(offset, 42);

            centralParts.push(centralHeader, nameBuf);

            offset += localHeader.length + nameBuf.length + entry.payload.length;
        }

        const centralSize = centralParts.reduce((n, b) => n + b.length, 0);
        const centralOffset = offset;

        const end = Buffer.alloc(22);
        end.writeUInt32LE(0x06054b50, 0);
        end.writeUInt16LE(0, 4);
        end.writeUInt16LE(0, 6);
        end.writeUInt16LE(this.entries.length, 8);
        end.writeUInt16LE(this.entries.length, 10);
        end.writeUInt32LE(centralSize, 12);
        end.writeUInt32LE(centralOffset, 16);
        end.writeUInt16LE(0, 20);

        return Buffer.concat([...localParts, ...centralParts, end]);
    }

    /**
     * write the zip archive to disk atomically
     * @param file
     */
    write(file) {
        const tmpFile = `${file}.tmp`;

        fs.writeFileSync(tmpFile, this.toBuffer());
        fs.renameSync(tmpFile, file);
    }

    /**
     * read an existing zip archive (as produced by this class) back into
     * a Zip instance, so new files can be appended to it. Returns an
     * empty Zip if the file does not exist.
     * @param file
     * @returns {Zip}
     */
    static fromFile(file) {
        const zip = new Zip();

        if (!fs.existsSync(file)) return zip;

        const buffer = fs.readFileSync(file);
        let offset = 0;

        while (offset < buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
            const method = buffer.readUInt16LE(offset + 8);
            const time = buffer.readUInt16LE(offset + 10);
            const day = buffer.readUInt16LE(offset + 12);
            const crc = buffer.readUInt32LE(offset + 14);
            const compressedSize = buffer.readUInt32LE(offset + 18);
            const nameLength = buffer.readUInt16LE(offset + 26);
            const extraLength = buffer.readUInt16LE(offset + 28);

            const nameStart = offset + 30;
            const name = buffer.toString('utf8', nameStart, nameStart + nameLength);
            const dataStart = nameStart + nameLength + extraLength;
            const payload = buffer.subarray(dataStart, dataStart + compressedSize);
            const data = method === METHOD_DEFLATE ? zlib.inflateRawSync(payload) : Buffer.from(payload);

            zip.entries.push({name, data, payload: Buffer.from(payload), method, crc, date: dosToDate(day, time)});

            offset = dataStart + compressedSize;
        }

        return zip;
    }
}

export default Zip;
