import { useSyncExternalStore } from "react";
import { AppState } from "react-native";

export function useAppState() {
  function subscribe(notify: () => void) {
    const sub = AppState.addEventListener("change", notify);
    return () => sub.remove();
  }
  return useSyncExternalStore(subscribe, () => AppState.currentState);
}
