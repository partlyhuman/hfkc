#include "esp_sleep.h"

// Will go to sleep after this long with no clients connected
// Fine to keep a few sec for testing, but this should be in the order of minutes for production builds
static const unsigned long SLEEP_AFTER_MS = 1000 * 30;

void sleepSetup() {
  esp_deep_sleep_enable_gpio_wakeup((1 << BUTTON_PIN), ESP_GPIO_WAKEUP_GPIO_LOW);
}

void sleepUpdate() {
  if (idleFor() > SLEEP_AFTER_MS) {
    log_i("No clients connected, no activity in %d, going to sleep", SLEEP_AFTER_MS);
    Serial.flush();
    displayTeardown();
    btleTeardown();
    prefsTeardown();
    flashLED(1);

    esp_deep_sleep_start();
  }
}