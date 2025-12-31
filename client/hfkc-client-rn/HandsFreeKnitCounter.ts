import { BleError, BleManager, Characteristic, Device, LogLevel, State, Subscription } from "react-native-ble-plx";
import { EventEmitter } from "expo";
import { fromBase64, packCounts, packMode, toBase64, unpackCounts, unpackMode } from "./binaryUtils";
import { AppState, AppStateStatus, PermissionsAndroid, Platform } from "react-native";

const DEVICE_NAME = "Hands-Free Knit Counter";
const SERVICE_HKFC = "49feaff1-039c-4702-b544-6d50dde1e1a1";
const CHARACTERISTIC_ROW_STITCH = "13be5c7d-bc86-43a4-8a54-f7ff294389fb";
const CHARACTERISTIC_MODE = "5a3b0882-fde0-45f5-9f41-58ab846c0132";

export enum Mode {
  MODE_COUNT_ROW_STITCH = 1,
  MODE_COUNT_ROW = 2,
}

export type ConnectionState = undefined | "bluetoothDisabled" | "disconnected" | "connected";

type EventMap = {
  countUpdate: (count: number[]) => void;
  modeUpdate: (mode: Mode) => void;
  connectionStateChanged: (state: ConnectionState) => void;
};

// The idea of this is to survive dev reloads
const SINGLETON_KEY = Symbol.for("HandsFreeKnitCounter Singleton");
const globalThisExt = globalThis as typeof globalThis & {
  [SINGLETON_KEY]?: HandsFreeKnitCounter;
};

export class HandsFreeKnitCounter {
  public readonly events = new EventEmitter<EventMap>();

  private readonly manager = new BleManager();
  private device: Device | undefined;
  private subscriptions: Subscription[] = [];
  private counts: number[] = [];
  private _connectionState: ConnectionState;
  public get connectionState() {
    return this._connectionState;
  }

  private _mode: Mode = Mode.MODE_COUNT_ROW_STITCH;
  public get mode() {
    return this._mode;
  }

  static get instance() {
    return (globalThisExt[SINGLETON_KEY] ??= new HandsFreeKnitCounter());
  }

  constructor() {
    console.log("----------------------");
    this.onDisconnected = this.onDisconnected.bind(this);
    this.onCharacteristicUpdate = this.onCharacteristicUpdate.bind(this);
    this.manager.setLogLevel(LogLevel.Verbose).then();
    this.events.addListener("connectionStateChanged", (c) => (this._connectionState = c));
    this.getPermission().then(() => this.subscribeToHardwareStates());
  }

  private async subscribeToHardwareStates() {
    // TODO perhaps these should be combined, and the state should be richer, split into multiple states, or simply expose both states as-is
    //  also perhaps BT state should be re-queried at foreground? No - seems to do this already
    let lastBluetoothState: State | undefined;
    this.manager.onStateChange((state) => {
      console.log("BT state", lastBluetoothState, "->", state);
      if (state === lastBluetoothState) return;
      if (state === "PoweredOn") {
        this.events.emit("connectionStateChanged", "disconnected");
        this.scanAndConnect().then();
      } else {
        this.events.emit("connectionStateChanged", "bluetoothDisabled");
      }
      lastBluetoothState = state;
    }, true);
    let lastAppState: AppStateStatus | undefined;
    AppState.addEventListener("change", (appState) => {
      console.log("app state", lastAppState, "->", appState);
      if (appState === lastAppState) return;
      if (lastAppState === "background" && appState === "active") {
        if (this.connectionState === "connected") {
          console.log("connected - refetching on foreground");
          this.readCount().then();
        } else if (this.connectionState === "disconnected") {
          console.log("not connected - connecting");
          this.scanAndConnect().then();
        }
      }
      lastAppState = appState;
    });
  }

  public async getPermission() {
    if (Platform.OS === "ios") {
      // I guess not needed for BTLE?
      return true;
    }
    if (Platform.OS === "android" && PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
      const apiLevel = parseInt(Platform.Version.toString(), 10);
      if (apiLevel < 31) {
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
      if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN && PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return Object.values(result).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
      }
    }
    return false;
  }

  public async scanAndConnect() {
    if (this.device && (await this.device.isConnected())) {
      console.log("already connected.");
      return;
    }

    console.log("scanning....");
    await this.manager.startDeviceScan([SERVICE_HKFC], null, async (error, device) => {
      console.log("found", device);
      if (error || !device) {
        console.error(error);
        return;
      }

      console.log("no more scanning");
      await this.manager.stopDeviceScan();
      await this.connectToDevice(device);
    });
  }

  private async connectToDevice(device: Device) {
    console.log("connecting...");
    this.device = await device.connect();
    this.subscriptions.push(this.device.onDisconnected(this.onDisconnected));
    // this is necessary even if we think we know everything by ID
    await this.device.discoverAllServicesAndCharacteristics();
    this.subscriptions.push(
      this.device.monitorCharacteristicForService(SERVICE_HKFC, CHARACTERISTIC_ROW_STITCH, this.onCharacteristicUpdate),
    );
    // Read current count & mode once at startup
    await Promise.allSettled([this.readMode(), this.readCount()]);
    this.events.emit("connectionStateChanged", "connected");
    console.log("connected!");
  }

  private onCharacteristicUpdate(error: BleError | null, characteristic: Characteristic | null): void {
    if (error || !characteristic || !characteristic.value) {
      console.error(error);
      return;
    }

    switch (characteristic.uuid) {
      case CHARACTERISTIC_ROW_STITCH: {
        console.log("Updated counts: ", characteristic.value);
        const value = fromBase64(characteristic.value);
        this.counts = unpackCounts(new DataView(value));
        this.events.emit("countUpdate", this.counts);
        break;
      }
      case CHARACTERISTIC_MODE: {
        console.log("Updated mode: ", characteristic.value);
        const value = fromBase64(characteristic.value);
        this._mode = unpackMode(new DataView(value));
        this.events.emit("modeUpdate", this._mode);
      }
    }
  }

  public async readCount() {
    const c = await this.device?.readCharacteristicForService(SERVICE_HKFC, CHARACTERISTIC_ROW_STITCH);
    this.onCharacteristicUpdate(null, c ?? null);
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
    const c = await this.device?.readCharacteristicForService(SERVICE_HKFC, CHARACTERISTIC_MODE);
    this.onCharacteristicUpdate(null, c ?? null);
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

  private async onDisconnected() {
    console.log("disconnected...");
    this.subscriptions.splice(0).map((s) => s.remove());
    this.device = undefined;
    // reconnect automatically, but only if BT is on - we could have cut off bt
    if ((await this.manager.state()) === "PoweredOn") {
      this.events.emit("connectionStateChanged", "disconnected");
      console.log("reconnecting...");
      this.scanAndConnect().then();
    }
  }

  public async dispose() {
    console.log("Disposing");
    this.subscriptions.splice(0).map((s) => s.remove());
    if (this.device) {
      await this.manager.cancelDeviceConnection(this.device.id);
    }
    await this.manager.destroy();
  }
}
