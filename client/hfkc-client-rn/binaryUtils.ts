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
  return [value.getUint16(0, true), value.getUint16(2, true)];
}

export function packCounts([row, stitch]: number[]): ArrayBuffer {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setUint16(0, row, true);
  view.setUint16(2, stitch, true);
  return buf;
}

export function unpackMode(value: DataView): Mode {
  return value.getUint16(0, true) as Mode;
}

export function packMode(mode: Mode): ArrayBuffer {
  return new Uint16Array([mode]).buffer;
}
