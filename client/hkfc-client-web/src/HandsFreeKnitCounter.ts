const SERVICE_HKFC = "49feaff1-039c-4702-b544-6d50dde1e1a1"
const CHARACTERISTIC_STITCH = "13be5c7d-bc86-43a4-8a54-f7ff294389fb"
const CHARACTERISTIC_ROW = "569c944a-3623-4126-9b58-f03277c5879c"

export class HandsFreeKnitCounter implements EventTarget {
    private device: BluetoothDevice | undefined;
    private service: BluetoothRemoteGATTService | undefined;
    private stitchCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;
    private rowCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;

    private _stitchCount = 0;
    private _rowCount = 0;
    private eventMap: Map<string, Set<EventListenerOrEventListenerObject>> = new Map();

    public get stitchCount() {
        return this._stitchCount;
    }

    public get rowCount() {
        return this._rowCount;
    }

    constructor() {
        this.onDisconnected = this.onDisconnected.bind(this);
        this.onCharacteristicValueChanged = this.onCharacteristicValueChanged.bind(this);
    }

    async request() {
        this.device = await navigator.bluetooth.requestDevice({
            "filters": [{"name": "Hands-Free Knit Counter"}],
            "optionalServices": [SERVICE_HKFC]
        });
        if (!this.device) {
            throw "No device selected";
        }
        this.device.addEventListener('gattserverdisconnected', this.onDisconnected);
    }

    async connect() {
        if (!this.device) {
            return Promise.reject('Device is not connected.');
        }
        await this.device.gatt?.connect();
        this.service = await this.device.gatt?.getPrimaryService(SERVICE_HKFC);
        this.stitchCharacteristic = await this.service?.getCharacteristic(CHARACTERISTIC_STITCH);
        this.rowCharacteristic = await this.service?.getCharacteristic(CHARACTERISTIC_ROW);
        await this.subscribe();
        await this.readStitchCount();
        await this.readRowCount();
        this.dispatchUpdate();
    }

    async readStitchCount() {
        if (!this.stitchCharacteristic) {
            throw new Error("Not initialized");
        }
        const data = await this.stitchCharacteristic.readValue();
        this._stitchCount = data.getInt16(0, true);
        return this._stitchCount;
    }

    async readRowCount() {
        if (!this.rowCharacteristic) {
            throw new Error("Not initialized");
        }
        const data = await this.rowCharacteristic.readValue();
        this._rowCount = data.getInt16(0, true);
        return this._rowCount;
    }

    private dispatchUpdate() {
        this.dispatchEvent(new CustomEvent('update', {
            detail: {
                rowCount: this._rowCount,
                stitchCount: this._stitchCount,
            }
        }));
    }

    private async subscribe() {
        if (!this.rowCharacteristic || !this.stitchCharacteristic) {
            throw new Event("Not initialized");
        }
        await this.stitchCharacteristic.startNotifications();
        this.stitchCharacteristic.addEventListener('characteristicvaluechanged', this.onCharacteristicValueChanged);
        await this.rowCharacteristic.startNotifications();
        this.rowCharacteristic.addEventListener('characteristicvaluechanged', this.onCharacteristicValueChanged);
    }

    private onCharacteristicValueChanged(event: Event) {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        if (!target || !target.value) return;
        switch (target.uuid) {
            case CHARACTERISTIC_STITCH:
                this._stitchCount = target.value.getInt16(0, true);
                break;
            case CHARACTERISTIC_ROW:
                this._rowCount = target.value.getInt16(0, true);
                break;
            default:
                throw new Error("Unrecognized uuid");

        }
        this.dispatchUpdate();
    }

    private async unsubscribe() {
        await this.stitchCharacteristic?.stopNotifications();
        this.stitchCharacteristic?.removeEventListener('characteristicvaluechanged', this.onCharacteristicValueChanged);
        await this.rowCharacteristic?.stopNotifications();
        this.rowCharacteristic?.removeEventListener('characteristicvaluechanged', this.onCharacteristicValueChanged);
    }

    disconnect() {
        if (!this.device) {
            throw new Error('Device is not connected.');
        }
        return this.device.gatt?.disconnect();
    }

    onDisconnected() {
        console.log('Device is disconnected.');
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