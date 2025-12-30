#include <Preferences.h>

static Preferences prefs;

void prefsUpdate() {
  // prefs.begin("hfkc");
  prefs.putBytes("count", &count, sizeof(CombinedCount));
  // prefs.putUShort(NV_ADDR_ROW, rowCount);
  // prefs.putUShort(NV_ADDR_STITCH, stitchCount);
  // prefs.end();
}

void prefsSetup(bool loadFromPrefs) {
  if (!prefs.begin("hfkc")) {
    log_e("prefs init fail");
    // flashLED(5);
    return;
  }
  if (loadFromPrefs && prefs.isKey("count")) {
    prefs.getBytes("count", &count, sizeof(CombinedCount));
  }
  // prefs.end();
}
