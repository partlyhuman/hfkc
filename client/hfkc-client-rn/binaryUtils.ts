import { Mode } from "./HandsFreeKnitCounter";

export function fromBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function toBase64(data: ArrayBuffer): string {
  const arr = new Uint8Array(data);
  return btoa(String.fromCharCode(...arr));
}

export function unpackCounts(value: DataView): number[] {
  return [value.getInt16(0, true), value.getInt16(2, true)];
}

export function packCounts([row, stitch]: number[]): ArrayBuffer {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setInt16(0, row, true);
  view.setInt16(2, stitch, true);
  return buf;
}

export function unpackMode(value: DataView): Mode {
  return value.getInt8(0) as Mode;
}

export function packMode(mode: Mode): ArrayBuffer {
  return new Uint8Array([mode]).buffer;
}
