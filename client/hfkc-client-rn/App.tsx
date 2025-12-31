import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { useEffect } from "react";
import { BleController } from "./BleController";
import { useCountCharacteristic } from "./useCountCharacteristic";

export default function App() {
  // Wait for bluetooth to be available. Probably need to ask permissions too.
  useEffect(() => {
    const sub = BleController.instance.manager.onStateChange((state) => {
      console.log("bt", state);
      if (state === "PoweredOn") {
        console.log("powered on");
        sub.remove();
        BleController.instance.scanAndConnect().then();
      }
    }, true);
    return () => {
      sub.remove();
      BleController.instance.disconnect().then();
    };
  }, []);

  const [rowCount, stitchCount] = useCountCharacteristic();

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={[styles.text, styles.rowCount]}>Row {rowCount}</Text>
      <Text style={[styles.text, styles.stitchCount]}>
        Stitch {stitchCount}
      </Text>
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
    fontSize: 20,
  },
  rowCount: {},
  stitchCount: {},
});
