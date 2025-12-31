import {
  BleError,
  BleManager,
  Characteristic,
  Device,
  Subscription,
} from "react-native-ble-plx";
import { EventEmitter } from "expo";
import { fromBase64, pack, toBase64, unpack } from "./binaryUtils";

const SERVICE_HKFC = "49feaff1-039c-4702-b544-6d50dde1e1a1";
const CHARACTERISTIC_ROW_STITCH = "13be5c7d-bc86-43a4-8a54-f7ff294389fb";
const DEVICE_NAME = "Hands-Free Knit Counter";

type BleControllerEvents = {
  countUpdate: (count: number[]) => void;
};

export class BleController {
  public static instance: BleController;

  public readonly manager = new BleManager();
  public readonly eventEmitter = new EventEmitter<BleControllerEvents>();

  private device: Device | undefined;
  private subscription: Subscription | undefined;
  private counts: number[] = [];

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
    // Read current value once at startup
    const c = await this.device.readCharacteristicForService(
      SERVICE_HKFC,
      CHARACTERISTIC_ROW_STITCH,
    );
    this.onCharacteristicUpdate(null, c);
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
    this.counts = unpack(new DataView(value));
    this.eventEmitter.emit("countUpdate", this.counts);
  }

  public async resetCount() {
    await this.device?.writeCharacteristicWithResponseForService(
      SERVICE_HKFC,
      CHARACTERISTIC_ROW_STITCH,
      toBase64(pack([0, 0])),
    );
  }

  public async resetRow() {
    await this.device?.writeCharacteristicWithResponseForService(
      SERVICE_HKFC,
      CHARACTERISTIC_ROW_STITCH,
      toBase64(pack([this.counts[0], 0])),
    );
  }

  public async disconnect() {
    console.log("disconnecting...");
    this.subscription?.remove();
    this.device?.cancelConnection().then();
  }
}

BleController.instance = new BleController();
