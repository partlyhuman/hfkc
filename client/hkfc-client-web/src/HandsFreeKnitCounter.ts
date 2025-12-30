const SERVICE_HKFC = "49feaff1-039c-4702-b544-6d50dde1e1a1"
const CHARACTERISTIC_ROW_STITCH = "13be5c7d-bc86-43a4-8a54-f7ff294389fb"
const DEVICE_NAME = "Hands-Free Knit Counter";

export class HandsFreeKnitCounter implements EventTarget {
    private device: BluetoothDevice | undefined;
    private service: BluetoothRemoteGATTService | undefined;
    private countCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;
    private eventMap: Map<string, Set<EventListenerOrEventListenerObject>> = new Map();

    private _stitchCount = 0;
    private _rowCount = 0;
    public get stitchCount() {
        return this._stitchCount;
    }
    public get rowCount() {
        return this._rowCount;
    }

    constructor() {
        this.onDisconnected = this.onDisconnected.bind(this);
        this.onCharacteristicValueChanged = this.onCharacteristicValueChanged.bind(this);
        // Try and disconnect cleanly
        window.addEventListener("beforeunload", () => {
            this.disconnect();
        });
    }

    public async pair() {
        this.device = await navigator.bluetooth.requestDevice({
            filters: [{name: DEVICE_NAME}],
            optionalServices: [SERVICE_HKFC],
        });
        if (!this.device) {
            throw "No device selected";
        }
        this.device.addEventListener('gattserverdisconnected', this.onDisconnected);
    }

    public async connect() {
        if (!this.device || !this.device.gatt) {
            throw new Error("Device not found, try pairing");
        }
        await this.device.gatt.connect();
        this.device.addEventListener('gattserverdisconnected', this.onDisconnected);
        this.service = await this.device.gatt.getPrimaryService(SERVICE_HKFC);
        this.countCharacteristic = await this.service.getCharacteristic(CHARACTERISTIC_ROW_STITCH);

        await this.countCharacteristic.startNotifications();
        this.countCharacteristic.addEventListener('characteristicvaluechanged', this.onCharacteristicValueChanged);

        await this.readCount();
    }

    public async resetCount() {
        const zeroCount = new Uint16Array(2);
        this.countCharacteristic?.writeValue(zeroCount);
    }

    private unpackCombinedCount(value:DataView) {
        this._rowCount = value.getInt16(0, true);
        this._stitchCount = value.getInt16(2, true);
    }

    private async readCount() {
        if (!this.countCharacteristic) {
            throw new Error("Not initialized");
        }
        this.unpackCombinedCount(await this.countCharacteristic.readValue());
        this.dispatchUpdate();
    }

    private dispatchUpdate() {
        this.dispatchEvent(new CustomEvent('update', {
            detail: {
                rowCount: this._rowCount,
                stitchCount: this._stitchCount,
            }
        }));
    }

    private onCharacteristicValueChanged(event: Event) {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        if (!target || !target.value) return;
        switch (target.uuid) {
            case CHARACTERISTIC_ROW_STITCH:
                this.unpackCombinedCount(target.value);
                this.dispatchUpdate();
                break;
            default:
                throw new Error("Unrecognized uuid");
        }
    }

    disconnect() {
        // await this.countCharacteristic?.stopNotifications();
        // this.countCharacteristic?.removeEventListener('characteristicvaluechanged', this.onCharacteristicValueChanged);
        this.device?.gatt?.disconnect();
        this.device = undefined;
    }

    private onDisconnected() {
        console.log('Device disconnected.');
    }

    addEventListener(type: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
        this.eventMap.set(type, (this.eventMap.get(type) ?? new Set()).add(callback));
    }

    dispatchEvent(event: Event): boolean {
        this.eventMap.get(event.type)?.forEach(x => {
            if ('handleEvent' in x) {
                x.handleEvent(event);
            } else {
                x(event);
            }
        });
        return true;
    }

    removeEventListener(type: string, callback: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void {
        this.eventMap.get(type)?.delete(callback);
    }
}