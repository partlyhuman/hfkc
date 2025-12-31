import { useCallback, useRef, useSyncExternalStore } from "react";
import { BleController } from "./BleController";

export function useCountCharacteristic() {
  const count = useRef([0, 0]);

  const subscribe = useCallback((onStoreChange: () => void) => {
    const sub = BleController.instance.eventEmitter.addListener(
      "countUpdate",
      (arr) => {
        console.log("count", arr);
        count.current = arr;
        onStoreChange();
      },
    );
    return () => sub.remove();
  }, []);

  return useSyncExternalStore(subscribe, () => count.current);
}
