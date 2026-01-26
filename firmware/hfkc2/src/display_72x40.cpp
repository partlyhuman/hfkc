#include <Arduino.h>

#include "U8g2lib.h"
#include "config.h"
#include "main.h"

U8G2_SSD1306_72X40_ER_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE, 6, 5);

void displaySetup() { u8g2.begin(); }

void displayUpdate() {
  u8g2.clearBuffer();
  u8g2.setFontMode(1);
  u8g2.setBitmapMode(1);
  u8g2.setFont(u8g2_font_4x6_tr);
  u8g2.drawStr(1, 6, "What uppp!!");

  u8g2.drawStr(40, 39, "Yoooooo!");

  u8g2.drawFrame(1, 7, 69, 26);

  u8g2.setFont(u8g2_font_profont29_tr);
  u8g2.setCursor(4, 29);
  u8g2.print(count.stitch);

  u8g2.sendBuffer();
}

void displayTeardown() {}
