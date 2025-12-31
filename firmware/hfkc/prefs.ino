#include <Preferences.h>

static Preferences prefs;

void prefsUpdateCount() {
  prefs.putBytes("count", &count, sizeof(CombinedCount));
}

void prefsUpdateMode() {
  prefs.putUChar("mode", mode);
}

void prefsSetup() {
  if (!prefs.begin("hfkc")) {
    log_e("prefs init fail");
    // flashLED(5);
    return;
  }
  // Read initial state from prefs
  // when uninitialized looks like this logs an error and does nothing
  prefs.getBytes("count", &count, sizeof(CombinedCount));
  mode = (Mode)prefs.getUChar("mode", (uint8_t)MODE_COUNT_ROW_STITCH);
  // Possibly wrap everything with begin/end
  // prefs.end();
}
