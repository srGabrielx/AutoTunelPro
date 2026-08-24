/**
 * Lightweight, zero-dependency ZIP archive generator for client and worker environments.
 * Follows the standard PKZIP format (Store method, no compression overhead for MIDI files).
 */

function numToBytes(num: number, bytes: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < bytes; i++) {
    result.push((num >> (i * 8)) & 0xff);
  }
  return result;
}

function stringToBytes(str: string): number[] {
  return Array.from(str, (c) => c.charCodeAt(0));
}

// Precomputed CRC32 table
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

function calculateCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFileInput {
  filename: string;
  data: Uint8Array;
}

export function createZipArchive(files: ZipFileInput[]): Uint8Array {
  const fileRecords: Array<{
    filenameBytes: number[];
    crc32: number;
    size: number;
    offset: number;
    data: Uint8Array;
  }> = [];

  const localHeaders: number[][] = [];
  let currentOffset = 0;

  for (const file of files) {
    const filenameBytes = stringToBytes(file.filename);
    const crc = calculateCrc32(file.data);
    const size = file.data.byteLength;

    const localHeader = [
      0x50, 0x4b, 0x03, 0x04, // Local file header signature
      0x14, 0x00,             // Version needed to extract (2.0)
      0x00, 0x00,             // General purpose bit flag
      0x00, 0x00,             // Compression method (0 = store)
      0x00, 0x00,             // Last mod file time
      0x00, 0x00,             // Last mod file date
      ...numToBytes(crc, 4),  // CRC-32
      ...numToBytes(size, 4), // Compressed size
      ...numToBytes(size, 4), // Uncompressed size
      ...numToBytes(filenameBytes.length, 2), // File name length
      0x00, 0x00,             // Extra field length
      ...filenameBytes,
    ];

    fileRecords.push({
      filenameBytes,
      crc32: crc,
      size,
      offset: currentOffset,
      data: file.data,
    });

    localHeaders.push(localHeader);
    currentOffset += localHeader.length + size;
  }

  // Build Central Directory
  const centralDirRecords: number[][] = [];
  let centralDirSize = 0;

  for (const record of fileRecords) {
    const centralHeader = [
      0x50, 0x4b, 0x01, 0x02, // Central directory file header signature
      0x14, 0x00,             // Version made by
      0x14, 0x00,             // Version needed to extract
      0x00, 0x00,             // General purpose bit flag
      0x00, 0x00,             // Compression method (0 = store)
      0x00, 0x00,             // Last mod file time
      0x00, 0x00,             // Last mod file date
      ...numToBytes(record.crc32, 4),
      ...numToBytes(record.size, 4),
      ...numToBytes(record.size, 4),
      ...numToBytes(record.filenameBytes.length, 2),
      0x00, 0x00,             // Extra field length
      0x00, 0x00,             // File comment length
      0x00, 0x00,             // Disk number start
      0x00, 0x00,             // Internal file attributes
      0x00, 0x00, 0x00, 0x00, // External file attributes
      ...numToBytes(record.offset, 4), // Relative offset of local header
      ...record.filenameBytes,
    ];

    centralDirRecords.push(centralHeader);
    centralDirSize += centralHeader.length;
  }

  // End of Central Directory Record (EOCD)
  const eocdRecord = [
    0x50, 0x4b, 0x05, 0x06, // End of central dir signature
    0x00, 0x00,             // Number of this disk
    0x00, 0x00,             // Number of the disk with the start of central directory
    ...numToBytes(fileRecords.length, 2), // Total entries on this disk
    ...numToBytes(fileRecords.length, 2), // Total entries
    ...numToBytes(centralDirSize, 4),     // Size of central directory
    ...numToBytes(currentOffset, 4),      // Offset of start of central directory
    0x00, 0x00,                           // ZIP file comment length
  ];

  const totalArchiveSize = currentOffset + centralDirSize + eocdRecord.length;
  const result = new Uint8Array(totalArchiveSize);

  let writePos = 0;
  for (let i = 0; i < fileRecords.length; i++) {
    const header = localHeaders[i];
    result.set(header, writePos);
    writePos += header.length;
    result.set(fileRecords[i].data, writePos);
    writePos += fileRecords[i].size;
  }

  for (const centralHeader of centralDirRecords) {
    result.set(centralHeader, writePos);
    writePos += centralHeader.length;
  }

  result.set(eocdRecord, writePos);
  return result;
}

export function downloadZipBlob(data: Uint8Array | ArrayBuffer, filename = "AutoTunel-Stems.zip") {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  const blob = new Blob([uint8 as unknown as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
