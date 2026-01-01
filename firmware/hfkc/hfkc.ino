#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <AceButton.h>

using namespace ace_button;

const int BUTTON_PIN = 0;
static AceButton button(BUTTON_PIN);
unsigned long lastActivityMs = ULONG_MAX;

static BLEUUID SERVICE_HKFC("49feaff1-039c-4702-b544-6d50dde1e1a1");
static BLEUUID CHARACTERISTIC_ROW_STITCH("13be5c7d-bc86-43a4-8a54-f7ff294389fb");
static BLEUUID CHARACTERISTIC_MODE("5a3b0882-fde0-45f5-9f41-58ab846c0132");
static BLEUUID CHARACTERISTIC_USER_DESCRIPTION((uint16_t)0x2901);
static BLEServer *server;
static BLECharacteristic *countCharacteristic;
static BLECharacteristic *modeCharacteristic;

enum Mode : uint16_t {
  // Starting at 0 yields degenerate base64 values
  MODE_COUNT_ROW_STITCH = 1,
  MODE_COUNT_ROW = 2,
};
Mode mode;

typedef struct _CombinedCount {
  uint16_t row;
  uint16_t stitch;
} CombinedCount;
CombinedCount count;


void flashLED(int count = 1, int dur = 150) {
  for (int i = 0; i < count; i++) {
    digitalWrite(LED_BUILTIN, LOW);
    delay(dur);
    digitalWrite(LED_BUILTIN, HIGH);
    delay(dur);
  }
}

void countCharacteristicUpdate() {
  countCharacteristic->setValue((uint8_t *)&count, sizeof(CombinedCount));
  countCharacteristic->notify();
}

void updateAll() {
  countCharacteristicUpdate();
  displayUpdate();
  prefsUpdateCount();
}

void handleButtonEvent(AceButton *_button, uint8_t eventType, uint8_t buttonState) {
  lastActivityMs = millis();
  switch (eventType) {
    case AceButton::kEventPressed:
      digitalWrite(LED_BUILTIN, LOW);
      break;
    case AceButton::kEventReleased:
      digitalWrite(LED_BUILTIN, HIGH);
      break;
    case AceButton::kEventClicked:
      if (mode == MODE_COUNT_ROW_STITCH) {
        count.stitch++;
      } else if (mode == MODE_COUNT_ROW) {
        count.row++;
      }
      updateAll();
      break;
    case AceButton::kEventLongPressed:
      if (mode == MODE_COUNT_ROW_STITCH) {
        count.stitch = 0;
        count.row++;
      } else if (mode == MODE_COUNT_ROW) {
        // do the same as a short press
        count.row++;
      }
      updateAll();
      break;
  }
}

BLEDescriptor *userDescription(const char *str) {
  BLEDescriptor *desc = new BLEDescriptor(CHARACTERISTIC_USER_DESCRIPTION);
  desc->setValue(str);
  return desc;
}

// Could combine callback classes and check UUID but this is more flexible
class ModeCharacteristicCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    BLECharacteristicCallbacks::onWrite(c);  // super
    mode = *(Mode *)(c->getData());
    log_i("Set mode %d", mode);

    // This is the only place mode gets updated so save it manually
    prefsUpdateMode();
    // probably best to reset too
    count = {};
    updateAll();
  }
};

class CountCharacteristicCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    BLECharacteristicCallbacks::onWrite(c);  // super
    count = *(CombinedCount *)(c->getData());
    // CombinedCount *value = (CombinedCount*)(c->getData());
    // count.row = value->row;
    // count.stitch = value->stitch;
    updateAll();
  }
};

class ServerCallbacks : public BLEServerCallbacks {
  void onDisconnect(BLEServer *s) override {
    BLEServerCallbacks::onDisconnect(s);  // super
    BLEDevice::startAdvertising();
  }
};

bool btleIdle() {
  return server->getConnectedCount() <= 0;
}

void btleTeardown() {
  // service->stop();
  BLEDevice::stopAdvertising();
  BLEDevice::deinit(true);
}

void setup() {
  Serial.begin(115200);
  delay(100);

  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);  // ESP32 uses low for on
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  bool bootedWithButtonPressed = digitalRead(BUTTON_PIN) == LOW;

  ButtonConfig *buttonConfig = button.getButtonConfig();
  buttonConfig->setDebounceDelay(1);
  buttonConfig->setClickDelay(999);
  buttonConfig->setLongPressDelay(1000);
  buttonConfig->setFeature(ButtonConfig::kFeatureClick);
  buttonConfig->setFeature(ButtonConfig::kFeatureLongPress);
  buttonConfig->setEventHandler(handleButtonEvent);

  sleepSetup();
  displaySetup();
  prefsSetup();
  if (bootedWithButtonPressed) {
    // Reset if booting with pedal held
    count = {};
  }

  BLEDevice::init("Hands-Free Knit Counter");

  server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService *service = server->createService(SERVICE_HKFC);

  countCharacteristic = service->createCharacteristic(
    CHARACTERISTIC_ROW_STITCH,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY);
  countCharacteristic->addDescriptor(userDescription("Row/Stitch Count"));
  countCharacteristic->setCallbacks(new CountCharacteristicCallbacks());
  countCharacteristic->setValue((uint8_t *)&count, sizeof(CombinedCount));

  modeCharacteristic = service->createCharacteristic(
    CHARACTERISTIC_MODE,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE);
  modeCharacteristic->addDescriptor(userDescription("Mode"));
  modeCharacteristic->setCallbacks(new ModeCharacteristicCallbacks());
  modeCharacteristic->setValue((uint16_t)mode);

  service->start();

  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_HKFC);
  advertising->setScanResponse(true);
  // functions that help with iPhone connections issue
  advertising->setMinPreferred(0x06);
  advertising->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();

  updateAll();
  lastActivityMs = millis();
  log_i("Setup complete");
}

void loop() {
  button.check();
  sleepUpdate();
}
