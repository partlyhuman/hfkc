#include "display.h"
//
#include <Arduino.h>

#include "U8g2lib.h"
#include "main.h"

// static const unsigned char image_Bluetooth_Idle_bits[] = {
// 0x04, 0x0d, 0x16, 0x0c, 0x0c, 0x16, 0x0d, 0x04};
static const unsigned char image_connected_bits[] = {0x07, 0x35, 0x47, 0x40,
                                                     0x01, 0x71, 0x56, 0x70};

U8G2_SSD1306_72X40_ER_F_HW_I2C u8g2(U8G2_R2, U8X8_PIN_NONE, 6, 5);

void displaySetup() { u8g2.begin(); }

void displayUpdate() {
  u8g2.clearBuffer();
  u8g2.setFontMode(1);
  u8g2.setBitmapMode(1);

  // count
  u8g2.setFont(u8g2_font_spleen32x64_mf);
  u8g2.setCursor(0, 40);
  u8g2.print(mode == MODE_COUNT_ROW ? count.row : count.stitch);

  // connected
  if (connected) {
    u8g2.drawXBM(65, 0, 7, 8, image_connected_bits);
  }

  u8g2.sendBuffer();
}

void displayTeardown() {
  u8g2.clearDisplay();
  u8g2.clearBuffer();
  u8g2.sleepOn();
}
