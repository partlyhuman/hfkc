import { Alert, Button, Linking, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { ConnectionState, HandsFreeKnitCounter, Mode } from "./HandsFreeKnitCounter";
import { useEventListener } from "expo";
import SegmentedControl from "@react-native-segmented-control/segmented-control";

export default function App() {
  const hfkc = HandsFreeKnitCounter.instance;
  const [connectionState, setConnectionState] = useState<ConnectionState>();
  useEventListener(hfkc.events, "connectionStateChanged", setConnectionState);
  const [mode, setMode] = useState(hfkc.mode);
  useEventListener(hfkc.events, "modeUpdate", setMode);
  const [count, setCount] = useState<number[]>([]);
  useEventListener(hfkc.events, "countUpdate", setCount);

  function onResetPressed() {
    Alert.alert("Reset?", "Resetting will clear the counter all the way back to zero. Are you sure?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => hfkc.resetCount(),
      },
    ]);
  }

  if (!connectionState || connectionState === "disconnected") {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Connecting...</Text>
      </View>
    );
  }

  if (connectionState === "bluetoothDisabled") {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Bluetooth not enabled.</Text>
        <Text>
          Bluetooth is required to connect to the device. Check your device settings including the Control Center.
        </Text>
        <Button title={"Go to Settings"} onPress={() => Linking.openSettings()} />
      </View>
    );
  }

  const modeSegments = [
    { value: Mode.MODE_COUNT_ROW_STITCH, label: "Row & Stitch" },
    { value: Mode.MODE_COUNT_ROW, label: "Row" },
  ];

  if (connectionState === "connected") {
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
          style={styles.modeSegmentedControl}
          values={modeSegments.map((o) => o.label)}
          selectedIndex={modeSegments.findIndex((o) => o.value === mode)}
          onChange={(event) => {
            const index = event.nativeEvent.selectedSegmentIndex;
            const newMode = modeSegments[index].value;
            hfkc.setMode(newMode).then();
          }}
        />
      </View>
    );
  }
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
  modeSegmentedControl: {
    width: "80%",
  },
});
