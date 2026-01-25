#include <Arduino.h>

#include "U8g2lib.h"

U8G2_SSD1306_72X40_ER_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE, 6, 5);

// #include "Adafruit_SSD1306.h"

// Adafruit_SSD1306 display;

// void setup() {
//   Serial.begin(115200);
//   delay(250);

//   Serial.println("STARTING");
//   if (!Wire.begin(SCREEN_I2C_SDA, SCREEN_I2C_SCL)) {
//     Serial.println("WIRE FAIL");
//   }
//   display = Adafruit_SSD1306(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
//   if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
//     Serial.println("DISPLAY FAIL");
//   }

//   Serial.printf("Using %dx%d\n", SCREEN_WIDTH, SCREEN_HEIGHT);

//   // Wait for display
//   delay(500);

//   display.clearDisplay();
//   display.display();
//   delay(1000);
//   display.setFont(NULL);
//   display.setTextColor(WHITE);
//   display.setCursor(0, 20);
//   display.println("Woohoo");
//   display.display();
// }

void setup() {
  Serial.begin(115200);
  delay(250);
  Serial.println("STARTING");

  u8g2.begin();
  u8g2.setFontMode(1);
  u8g2.setBitmapMode(1);
  u8g2.setFont(u8g2_font_4x6_tr);
  u8g2.drawStr(1, 6, "What uppp!!");
  u8g2.drawStr(40, 39, "Yoooooo!");
  u8g2.drawFrame(1, 7, 69, 26);
  u8g2.drawLine(4, 25, 42, 11);
  u8g2.drawLine(19, 14, 57, 26);
  u8g2.sendBuffer();
}

void loop() {
  // put your main code here, to run repeatedly:
}
