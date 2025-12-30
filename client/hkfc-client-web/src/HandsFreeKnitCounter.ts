const SERVICE_HKFC = "49feaff1-039c-4702-b544-6d50dde1e1a1"
const CHARACTERISTIC_ROW_STITCH = "13be5c7d-bc86-43a4-8a54-f7ff294389fb"
const DEVICE_NAME = "Hands-Free Knit Counter";
const HISTORY_MAX = 100;

function unpack(value: DataView): number[] {
    return [value.getInt16(0, true), value.getInt16(2, true)];
}

function pack([row, stitch]: number[]): ArrayBuffer {
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    view.setInt16(0, row, true);
    view.setInt16(2, stitch, true);
    return buf;
}

export class HandsFreeKnitCounter implements EventTarget {
    private device: BluetoothDevice | undefined;
    private service: BluetoothRemoteGATTService | undefined;
    private countCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;
    private eventMap: Map<string, Set<EventListenerOrEventListenerObject>> = new Map();
    private history: number[] = [];

    private _stitchCount = 0;
    public get stitchCount() {
        return this._stitchCount;
    }

    private _rowCount = 0;
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
        await this.countCharacteristic?.writeValue(pack([0, 0]));
    }

    public async resetRow() {
        await this.countCharacteristic?.writeValue(pack([this._rowCount, 0]));
    }

    public async undo() {
        // front of history should be the current value, so pop two (pairs) off
        const [, , row, stitch] = this.history.splice(0, 4);
        if (row !== undefined && stitch !== undefined) {
            await this.countCharacteristic?.writeValue(pack([row, stitch]));
        } else if (this._stitchCount > 0) {
            // in absence of history we can just undo to the beginning of the row
            await this.countCharacteristic?.writeValue(pack([this._rowCount, this._stitchCount - 1]));
        }
    }

    private appendToHistory(arr: number[]) {
        if (this.history.length >= arr.length && arr.every((value, i) => value === this.history[i])) {
            // duplicate, do nothing
            // console.debug(arr, "Already current in history");
        } else {
            if (this.history.unshift(...arr) > HISTORY_MAX) {
                this.history.splice(HISTORY_MAX, this.history.length - HISTORY_MAX);
            }
        }
        // console.debug(this.history);
        return arr;
    }

    private async readCount() {
        if (!this.countCharacteristic) {
            throw new Error("Not initialized");
        }
        [this._rowCount, this._stitchCount] = unpack(await this.countCharacteristic.readValue());
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
        if (!target || !target.value || target.uuid !== CHARACTERISTIC_ROW_STITCH) {
            console.log("skipping update", event);
            return;
        }
        [this._rowCount, this._stitchCount] = this.appendToHistory(unpack(target.value));
        this.dispatchUpdate();
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
        this.eventMap.get(event.type)?.forEach(listener => {
            if ('handleEvent' in listener) {
                listener.handleEvent(event);
            } else if (typeof listener === 'function') {
                listener(event);
            }
        });
        return true;
    }

    removeEventListener(type: string, callback: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void {
        this.eventMap.get(type)?.delete(callback);
    }
}