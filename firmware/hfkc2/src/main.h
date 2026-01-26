#pragma once
#include <Arduino.h>

enum Mode {
  // Starting at 0 yields degenerate base64 values
  MODE_COUNT_ROW_STITCH = 1,
  MODE_COUNT_ROW = 2,
};
extern Mode mode;

struct CombinedCount {
  uint16_t row;
  uint16_t stitch;
};
extern CombinedCount count;

void flashLED(int count = 1, int dur = 150);
void countCharacteristicUpdate();
void updateAll();
unsigned long idleFor();
void btleTeardown();