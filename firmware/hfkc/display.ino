#include <Wire.h>
#include <Adafruit_SSD1306.h>
// #include <Fonts/FreeSansBold18pt7b.h>

static Adafruit_SSD1306 display(128, 32, &Wire, -1);

void displayUpdate() {
  display.clearDisplay();

  display.setTextSize(1);               // Normal 1:1 pixel scale
  display.setTextColor(SSD1306_WHITE);  // Draw white text
  display.cp437(true);                  // Use full 256 char 'Code Page 437' font

  static char string[64] = "";

  sprintf(string, "Row %d", count.row);
  display.setCursor(0, 0);
  display.println(string);

  if (mode == MODE_COUNT_ROW_STITCH) {
    sprintf(string, "Stitch %d", count.stitch);
    display.setCursor(64, 0);
    display.println(string);
  }

  display.display();
}

void displayTeardown() {
  display.clearDisplay();
  display.display();
  display.dim(true);
  Wire.end();
}

void displaySetup() {
  // Default pin 8 overlaps with LED pin, use custom pins
  Wire.setPins(1, 2);
  Wire.begin();
  // See datasheet for Address; 0x3D for 128x64, 0x3C for 128x32
  const uint8_t SCREEN_ADDRESS = 0x3C;
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    log_e("Display begin fail");
    flashLED(10);
  }
  // Too big?
  // display.setFont(&FreeSansBold18pt7b);
}