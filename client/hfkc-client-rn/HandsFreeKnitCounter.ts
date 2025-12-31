import {
  BleError,
  BleManager,
  Characteristic,
  Device,
  Subscription,
} from "react-native-ble-plx";
import { EventEmitter } from "expo";
import {
  fromBase64,
  packCounts,
  packMode,
  toBase64,
  unpackCounts,
  unpackMode,
} from "./binaryUtils";

const DEVICE_NAME = "Hands-Free Knit Counter";
const SERVICE_HKFC = "49feaff1-039c-4702-b544-6d50dde1e1a1";
const CHARACTERISTIC_ROW_STITCH = "13be5c7d-bc86-43a4-8a54-f7ff294389fb";
const CHARACTERISTIC_MODE = "5a3b0882-fde0-45f5-9f41-58ab846c0132";

export enum Mode {
  MODE_COUNT_ROW_STITCH = 0,
  MODE_COUNT_ROW = 1,
}

type EventMap = {
  countUpdate: (count: number[]) => void;
  modeUpdate: (mode: Mode) => void;
};

export class HandsFreeKnitCounter {
  public readonly manager = new BleManager();
  public readonly events = new EventEmitter<EventMap>();

  private device: Device | undefined;
  private subscription: Subscription | undefined;
  private counts: number[] = [];

  private _mode: Mode = Mode.MODE_COUNT_ROW_STITCH;
  public get mode() {
    return this._mode;
  }

  public async scanAndConnect() {
    console.log("scanning...");
    await this.manager.startDeviceScan(
      [SERVICE_HKFC],
      null,
      async (error, device) => {
        console.log("found", device);
        if (error || !device) {
          console.error(error);
          return;
        }
        this.manager.stopDeviceScan().then();
        this.connectToDevice(device).then();
      },
    );
  }

  private async connectToDevice(device: Device) {
    console.log("connecting...");
    this.device = await device.connect();
    await this.device.discoverAllServicesAndCharacteristics(); // necessary?
    this.subscription = this.device.monitorCharacteristicForService(
      SERVICE_HKFC,
      CHARACTERISTIC_ROW_STITCH,
      this.onCharacteristicUpdate.bind(this),
    );
    // Read current count & mode once at startup
    this.readCount().then();
    this.readMode().then();
  }

  private onCharacteristicUpdate(
    error: BleError | null,
    characteristic: Characteristic | null,
  ): void {
    if (error || !characteristic || !characteristic.value) {
      console.error(error);
      return;
    }

    console.log(characteristic.value);
    const value = fromBase64(characteristic.value);
    this.counts = unpackCounts(new DataView(value));
    this.events.emit("countUpdate", this.counts);
  }

  public async readCount() {
    const c = await this.device?.readCharacteristicForService(
      SERVICE_HKFC,
      CHARACTERISTIC_ROW_STITCH,
    );
    if (c) {
      this.onCharacteristicUpdate(null, c);
    }
  }

  public async resetCount() {
    await this.device?.writeCharacteristicWithResponseForService(
      SERVICE_HKFC,
      CHARACTERISTIC_ROW_STITCH,
      toBase64(packCounts([0, 0])),
    );
  }

  public async resetRow() {
    await this.device?.writeCharacteristicWithResponseForService(
      SERVICE_HKFC,
      CHARACTERISTIC_ROW_STITCH,
      toBase64(packCounts([this.counts[0], 0])),
    );
  }

  public async readMode() {
    const c = await this.device?.readCharacteristicForService(
      SERVICE_HKFC,
      CHARACTERISTIC_MODE,
    );
    if (c?.value) {
      const value = fromBase64(c.value);
      this._mode = unpackMode(new DataView(value));
      this.events.emit("modeUpdate", this._mode);
    }
  }

  public async setMode(newMode: Mode) {
    if (newMode === this._mode) {
      return;
    }
    this._mode = newMode;
    await this.device?.writeCharacteristicWithResponseForService(
      SERVICE_HKFC,
      CHARACTERISTIC_MODE,
      toBase64(packMode(newMode)),
    );
    this.events.emit("modeUpdate", this._mode);
  }

  public async disconnect() {
    console.log("disconnecting...");
    this.subscription?.remove();
    this.device?.cancelConnection().then();
  }
}

export const hfkc = new HandsFreeKnitCounter();
