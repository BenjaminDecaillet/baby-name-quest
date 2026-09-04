import { inflateRawSync } from 'node:zlib';

/**
 * Minimal ZIP archive reader based on the central directory.
 * Supports the two methods used by the official statistical files: "stored" (0) and "deflate" (8).
 * ZIP64 archives are not supported (the source files are only a few megabytes).
 */
export interface ZipEntry {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  method: number;
  localHeaderOffset: number;
}

const SIG_END_OF_CENTRAL_DIR = 0x06054b50;
const SIG_CENTRAL_FILE_HEADER = 0x02014b50;
const SIG_LOCAL_FILE_HEADER = 0x04034b50;

export function listZipEntries(archive: Buffer): ZipEntry[] {
  const eocd = findEndOfCentralDirectory(archive);
  const entryCount = archive.readUInt16LE(eocd + 10);
  const centralDirOffset = archive.readUInt32LE(eocd + 16);

  const entries: ZipEntry[] = [];
  let cursor = centralDirOffset;
  for (let i = 0; i < entryCount; i++) {
    if (archive.readUInt32LE(cursor) !== SIG_CENTRAL_FILE_HEADER) {
      throw new Error(`Invalid ZIP central directory entry at offset ${cursor}`);
    }
    const method = archive.readUInt16LE(cursor + 10);
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const uncompressedSize = archive.readUInt32LE(cursor + 24);
    const nameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    const localHeaderOffset = archive.readUInt32LE(cursor + 42);
    const flags = archive.readUInt16LE(cursor + 8);
    const nameBytes = archive.subarray(cursor + 46, cursor + 46 + nameLength);
    // Bit 11 of the general purpose flags marks UTF-8 file names; otherwise CP437 (ASCII in practice).
    const name = (flags & 0x0800) !== 0 ? nameBytes.toString('utf8') : nameBytes.toString('latin1');
    entries.push({ name, compressedSize, uncompressedSize, method, localHeaderOffset });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

export function readZipEntry(archive: Buffer, entry: ZipEntry): Buffer {
  const offset = entry.localHeaderOffset;
  if (archive.readUInt32LE(offset) !== SIG_LOCAL_FILE_HEADER) {
    throw new Error(`Invalid ZIP local header for ${entry.name}`);
  }
  const nameLength = archive.readUInt16LE(offset + 26);
  const extraLength = archive.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + nameLength + extraLength;
  const data = archive.subarray(dataStart, dataStart + entry.compressedSize);

  switch (entry.method) {
    case 0:
      return Buffer.from(data);
    case 8:
      return inflateRawSync(data);
    default:
      throw new Error(`Unsupported ZIP compression method ${entry.method} for ${entry.name}`);
  }
}

/** Convenience helper: extract the first entry whose name matches the predicate. */
export function extractZipEntry(
  archive: Buffer,
  predicate: (name: string) => boolean,
): { name: string; data: Buffer } {
  const entries = listZipEntries(archive);
  const entry = entries.find((e) => predicate(e.name));
  if (!entry) {
    throw new Error(
      `No matching entry in ZIP archive (entries: ${entries.map((e) => e.name).join(', ')})`,
    );
  }
  return { name: entry.name, data: readZipEntry(archive, entry) };
}

function findEndOfCentralDirectory(archive: Buffer): number {
  // The EOCD record is at least 22 bytes and may be followed by a comment of up to 65535 bytes.
  const minOffset = Math.max(0, archive.length - 22 - 0xffff);
  for (let i = archive.length - 22; i >= minOffset; i--) {
    if (archive.readUInt32LE(i) === SIG_END_OF_CENTRAL_DIR) {
      return i;
    }
  }
  throw new Error('Not a ZIP archive: end of central directory not found');
}
