#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <AceButton.h>
#include <Wire.h>
#include <Adafruit_SSD1306.h>
// #include <Fonts/FreeSansBold18pt7b.h>

using namespace ace_button;

const int BUTTON_PIN = 0;
static AceButton button(BUTTON_PIN);

static BLEUUID SERVICE_HKFC("49feaff1-039c-4702-b544-6d50dde1e1a1");
static BLEUUID CHARACTERISTIC_ROW("569c944a-3623-4126-9b58-f03277c5879c");
static BLEUUID CHARACTERISTIC_STITCH("13be5c7d-bc86-43a4-8a54-f7ff294389fb");
// static BLEUUID CHARACTERISTIC_COUNT16((uint16_t)0x2AEA);
static BLEUUID CHARACTERISTIC_USER_DESCRIPTION((uint16_t)0x2901);

static BLECharacteristic *rowCharacteristic;
static BLECharacteristic *stitchCharacteristic;

uint16_t rowCount = 0;
uint16_t stitchCount = 0;

Adafruit_SSD1306 display(128, 32, &Wire, -1);

void updateDisplay() {
  display.clearDisplay();

  display.setTextSize(1);               // Normal 1:1 pixel scale
  display.setTextColor(SSD1306_WHITE);  // Draw white text
  display.cp437(true);                  // Use full 256 char 'Code Page 437' font

  static char string[64] = "";

  sprintf(string, "Row %d", rowCount);
  display.setCursor(0, 0);
  display.println(string);

  sprintf(string, "Stitch %d", stitchCount);
  display.setCursor(64, 0);
  display.println(string);

  display.display();
}

void handleEvent(AceButton *_button, uint8_t eventType, uint8_t buttonState) {
  switch (eventType) {
    case AceButton::kEventPressed:
      digitalWrite(LED_BUILTIN, LOW);
      break;
    case AceButton::kEventReleased:
      digitalWrite(LED_BUILTIN, HIGH);
      break;
    case AceButton::kEventClicked:
      stitchCharacteristic->setValue(++stitchCount);
      stitchCharacteristic->notify();
      updateDisplay();
      break;
    case AceButton::kEventLongPressed:
      stitchCount = 0;
      rowCount++;
      stitchCharacteristic->setValue(stitchCount);
      stitchCharacteristic->notify();
      rowCharacteristic->setValue(rowCount);
      rowCharacteristic->notify();
      updateDisplay();
      break;
  }
}

BLEDescriptor *userDescription(const char *str) {
  BLEDescriptor *desc = new BLEDescriptor(CHARACTERISTIC_USER_DESCRIPTION);
  desc->setValue(str);
  return desc;
}

void setup() {
  // Serial.begin(115200);
  // Serial.println("Starting BLE work!");

  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);  // ESP32 uses low for on
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  ButtonConfig *buttonConfig = button.getButtonConfig();
  buttonConfig->setDebounceDelay(1);
  buttonConfig->setClickDelay(999);
  buttonConfig->setLongPressDelay(1000);
  buttonConfig->setFeature(ButtonConfig::kFeatureClick);
  buttonConfig->setFeature(ButtonConfig::kFeatureLongPress);
  buttonConfig->setEventHandler(handleEvent);

  // Default pin 8 overlaps with LED pin, use custom pins
  Wire.setPins(1, 2);
  Wire.begin();
  // See datasheet for Address; 0x3D for 128x64, 0x3C for 128x32
  const uint8_t SCREEN_ADDRESS = 0x3C; 
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    // Serial.println(F("SSD1306 allocation failed"));
    digitalWrite(LED_BUILTIN, LOW);
  }
  // Too big?
  // display.setFont(&FreeSansBold18pt7b);
  updateDisplay();

  BLEDevice::init("Hands-Free Knit Counter");
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_HKFC);

  stitchCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_STITCH,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY);
  stitchCharacteristic->setValue((uint16_t)0);
  stitchCharacteristic->addDescriptor(userDescription("Stitch Count"));

  rowCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_ROW,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY);
  rowCharacteristic->setValue((uint16_t)0);
  rowCharacteristic->addDescriptor(userDescription("Row Count"));

  pService->start();
  // BLEAdvertising *pAdvertising = pServer->getAdvertising();  // this still is working for backward compatibility
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_HKFC);
  pAdvertising->setScanResponse(true);
  // functions that help with iPhone connections issue
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();
}

void loop() {
  button.check();
}
