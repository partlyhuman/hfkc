import { Alert, Button, StyleSheet, Text, View } from "react-native";
import { useEffect } from "react";
import { BleController } from "./BleController";
import { useCountCharacteristic } from "./useCountCharacteristic";

export default function App() {
  const [rowCount, stitchCount] = useCountCharacteristic();
  const connected = !Number.isNaN(stitchCount);

  // Wait for bluetooth to be available. Probably need to ask permissions too.
  useEffect(() => {
    const sub = BleController.instance.manager.onStateChange((state) => {
      if (state === "PoweredOn") {
        sub.remove();
        BleController.instance.scanAndConnect().then();
      }
    }, true);
    return () => {
      sub.remove();
      BleController.instance.disconnect().then();
    };
  }, []);

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
          onPress: () => BleController.instance.resetCount(),
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
      <Text style={[styles.text, styles.rowCount]}>Row {rowCount}</Text>
      <Text style={[styles.text, styles.stitchCount]}>
        Stitch {stitchCount}
      </Text>
      <View style={{ height: 50 }} />
      <Button title={"Undo"} />
      <Button
        title={"Restart Row"}
        onPress={() => BleController.instance.resetRow()}
      />
      <Button title={"Reset"} color={"red"} onPress={onResetPressed} />
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
