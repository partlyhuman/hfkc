#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <AceButton.h>

using namespace ace_button;

const int BUTTON_PIN = 0;
static AceButton button(BUTTON_PIN);

static BLEUUID SERVICE_HKFC("49feaff1-039c-4702-b544-6d50dde1e1a1");  // Unique
static BLEUUID CHARACTERISTIC_STITCH("13be5c7d-bc86-43a4-8a54-f7ff294389fb");
static BLEUUID CHARACTERISTIC_ROW("569c944a-3623-4126-9b58-f03277c5879c");
static BLEUUID CHARACTERISTIC_COUNT16((uint16_t)0x2AEA);
static BLEUUID CHARACTERISTIC_USER_DESCRIPTION((uint16_t)0x2901);

static BLECharacteristic *rowCharacteristic;
static BLECharacteristic *knitCharacteristic;

uint16_t rowCount = 0;
uint16_t knitCount = 0;


void handleEvent(AceButton *_button, uint8_t eventType, uint8_t buttonState) {
  switch (eventType) {
    case AceButton::kEventPressed:
      digitalWrite(LED_BUILTIN, LOW);
      break;
    case AceButton::kEventReleased:
      digitalWrite(LED_BUILTIN, HIGH);
      break;
    case AceButton::kEventClicked:
      knitCharacteristic->setValue(++knitCount);
      knitCharacteristic->notify();
      break;
    case AceButton::kEventLongPressed:
      knitCount = 0;
      rowCount++;
      knitCharacteristic->setValue(knitCount);
      knitCharacteristic->notify();
      rowCharacteristic->setValue(rowCount);
      rowCharacteristic->notify();
      break;
  }
}

BLEDescriptor *userDescription(const char *str) {
  BLEDescriptor *desc = new BLEDescriptor(CHARACTERISTIC_USER_DESCRIPTION);
  desc->setValue(str);
  return desc;
}

void setup() {
  Serial.begin(115200);
  Serial.println("Starting BLE work!");

  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH); // ESP32 uses low for on
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  ButtonConfig *buttonConfig = button.getButtonConfig();
  buttonConfig->setDebounceDelay(1);
  buttonConfig->setClickDelay(999);
  buttonConfig->setLongPressDelay(1000);
  buttonConfig->setFeature(ButtonConfig::kFeatureClick);
  buttonConfig->setFeature(ButtonConfig::kFeatureLongPress);
  buttonConfig->setEventHandler(handleEvent);

  BLEDevice::init("Hands-Free Knit Counter");
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_HKFC);

  // These should be writeable so the client can perform undo, next line, restart
  knitCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_STITCH,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY);
  knitCharacteristic->setValue((uint16_t)0);
  knitCharacteristic->addDescriptor(userDescription("Stitch Count"));

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

  Serial.println("Characteristic defined! Now you can read it in your phone!");
}

void loop() {
  button.check();
}
