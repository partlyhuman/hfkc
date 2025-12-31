import { Alert, Button, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";
import { hfkc, Mode } from "./HandsFreeKnitCounter";
import { useAppState } from "./useAppState";
import { useEventListener } from "expo";
import SegmentedControl from "@react-native-segmented-control/segmented-control";

export default function App() {
  // Wait for bluetooth to be available. Probably need to ask permissions too.
  useEffect(() => {
    const sub = hfkc.manager.onStateChange((state) => {
      if (state === "PoweredOn") {
        sub.remove();
        hfkc.scanAndConnect().then();
      }
    }, true);
    return () => {
      sub.remove();
      hfkc.disconnect().then();
    };
  }, []);

  // Re-fetch on foreground
  const appState = useAppState();
  useEffect(() => {
    if (appState === "active") {
      hfkc.readCount().then();
    }
  }, [appState]);

  // Map update events to states
  const [mode, setMode] = useState(hfkc.mode);
  useEventListener(hfkc.events, "modeUpdate", setMode);
  const [count, setCount] = useState<number[]>([]);
  useEventListener(hfkc.events, "countUpdate", setCount);
  const connected = count.length === 2;

  function onResetPressed() {
    Alert.alert(
      "Reset?",
      "Resetting will clear the counter all the way back to zero. Are you sure?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => hfkc.resetCount(),
        },
      ],
    );
  }

  if (!connected) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Connecting...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.text, styles.rowCount]}>Row {count[0]}</Text>
      {mode === Mode.MODE_COUNT_ROW_STITCH && (
        <Text style={[styles.text, styles.stitchCount]}>Stitch {count[1]}</Text>
      )}
      <View style={{ height: 50 }} />
      <Button title={"Undo"} />
      <Button title={"Restart Row"} onPress={() => hfkc.resetRow()} />
      <Button title={"Reset"} color={"red"} onPress={onResetPressed} />
      <SegmentedControl
        values={["Row & Stitch", "Row"]}
        selectedIndex={mode}
        onChange={(event) => {
          const newMode = event.nativeEvent.selectedSegmentIndex as Mode;
          hfkc.setMode(newMode).then();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 40,
  },
  rowCount: {},
  stitchCount: {},
});
