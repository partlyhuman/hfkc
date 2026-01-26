#include "main.h"

#include <AceButton.h>
#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <esp_log.h>

#include "config.h"
#include "display.h"
#include "prefs.h"
#include "sleep.h"

using namespace ace_button;

static AceButton button(BUTTON_PIN);
static unsigned long lastActivityMs;

static BLEServer *server;
static BLECharacteristic *countCharacteristic;
static BLECharacteristic *modeCharacteristic;

Mode mode;
CombinedCount count;
bool connected;

void flashLED(int count, int dur) {
  for (int i = 0; i < count; i++) {
    digitalWrite(PIN_LED, LED_ON);
    delay(dur);
    digitalWrite(PIN_LED, LED_OFF);
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

void handleButtonEvent(AceButton *_button, uint8_t eventType,
                       uint8_t buttonState) {
  lastActivityMs = millis();
  switch (eventType) {
    case AceButton::kEventPressed:
      digitalWrite(PIN_LED, LED_ON);
      break;
    case AceButton::kEventReleased:
      digitalWrite(PIN_LED, LED_OFF);
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
    auto connectedCount = s->getConnectedCount();
    log_i("DISCONNECTED! OLD count=%d", connectedCount);
    if (connectedCount <= 1) {
      log_d("All clients disconnected, going back to advertise");
      lastActivityMs = millis();
      BLEDevice::startAdvertising();
      connected = false;
      displayUpdate();
    }
  }
  void onConnect(BLEServer *s) override {
    BLEServerCallbacks::onConnect(s);
    auto connectedCount = s->getConnectedCount();
    log_i("CONNECTED! OLD count=%d", connectedCount);
    connected = true;
    displayUpdate();
    lastActivityMs = millis();
  }
};

unsigned long idleFor() {
  if (server->getConnectedCount() > 0 || lastActivityMs == 0) {
    return 0;
  }
  return millis() - lastActivityMs;
}

void btleTeardown() {
  // service->stop();
  BLEDevice::stopAdvertising();
  BLEDevice::deinit(true);
}

void setup() {
  Serial.begin(115200);
  delay(100);

  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LED_OFF);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  bool bootedWithButtonPressed = digitalRead(BUTTON_PIN) == LOW;

  ButtonConfig *buttonConfig = button.getButtonConfig();
  buttonConfig->setDebounceDelay(1);
  buttonConfig->setClickDelay(999);
  buttonConfig->setLongPressDelay(1000);
  buttonConfig->setFeature(ButtonConfig::kFeatureClick);
  buttonConfig->setFeature(ButtonConfig::kFeatureLongPress);
  buttonConfig->setEventHandler(handleButtonEvent);

  displaySetup();
  prefsSetup();
  // Sleep setup after prefs setup so we can increment if waking from sleep by
  // tap
  if (sleepSetup()) {
    // DISABLED - I'm not sure this is a good idea. I think you don't want to
    // have to guess whether it just went up or not. If you've left it for like
    // 15 minutes on end, you're going to glance at the counter before tapping
    // and see it's asleep. If we try and increment when waking up, I feel like
    // users will be in a guessing game.

    // log_i("Woke from sleep by GPIO - counting this as a button press and
    // incrementing"); flashLED(1); if (mode == MODE_COUNT_ROW_STITCH) {
    //   count.stitch++;
    // } else if (mode == MODE_COUNT_ROW) {
    //   count.row++;
    // }
  }
  // else if (bootedWithButtonPressed) {
  //   // Reset if booting with pedal held
  //   count = {};
  // }

  BLEDevice::init("Hands-Free Knit Counter");

  server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService *service = server->createService(SERVICE_HKFC);

  countCharacteristic = service->createCharacteristic(
      CHARACTERISTIC_ROW_STITCH, BLECharacteristic::PROPERTY_READ |
                                     BLECharacteristic::PROPERTY_WRITE |
                                     BLECharacteristic::PROPERTY_NOTIFY);
  // Notify does not work without the addition of this descriptor!
  countCharacteristic->addDescriptor(new BLE2902());
  countCharacteristic->addDescriptor(userDescription("Row/Stitch Count"));
  countCharacteristic->setCallbacks(new CountCharacteristicCallbacks());
  countCharacteristic->setValue((uint8_t *)&count, sizeof(CombinedCount));

  modeCharacteristic = service->createCharacteristic(
      CHARACTERISTIC_MODE,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE);
  modeCharacteristic->addDescriptor(userDescription("Mode"));
  modeCharacteristic->setCallbacks(new ModeCharacteristicCallbacks());
  uint16_t modeValue = static_cast<uint16_t>(mode);
  modeCharacteristic->setValue(modeValue);

  service->start();

  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_HKFC);
  advertising->setScanResponse(true);
  // functions that help with iPhone connections issue
  advertising->setMinPreferred(0x06);
  advertising->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();

  lastActivityMs = millis();
  updateAll();
  Serial.println("Setup complete");
}

void loop() {
  button.check();
  sleepUpdate();
}
