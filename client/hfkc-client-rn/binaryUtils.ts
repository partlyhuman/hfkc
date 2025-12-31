export function parseBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function unpack(value: DataView): number[] {
  return [value.getInt16(0, true), value.getInt16(2, true)];
}

export function pack([row, stitch]: number[]): ArrayBuffer {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setInt16(0, row, true);
  view.setInt16(2, stitch, true);
  return buf;
}
