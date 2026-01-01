#include <Preferences.h>

static Preferences prefs;

void prefsUpdateCount() {
  prefs.putBytes("count", &count, sizeof(CombinedCount));
}

void prefsUpdateMode() {
  prefs.putUShort("mode", mode);
}

void prefsTeardown() {
  prefs.end();
}

void prefsSetup() {
  if (!prefs.begin("hfkc")) {
    log_e("prefs init fail");
    flashLED(5);
    return;
  }
  // Read initial state from prefs
  // when uninitialized, default values are set
  prefs.getBytes("count", &count, sizeof(CombinedCount));
  mode = (Mode)prefs.getUShort("mode", (uint16_t)MODE_COUNT_ROW_STITCH);
  // Possibly wrap everything with begin/end
  // prefs.end();
}
