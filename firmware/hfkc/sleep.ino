#include "esp_sleep.h"

static const unsigned long SLEEP_AFTER_MS = 1000 * 30;

void sleepSetup() {
  // Sleep config
  // Internal pullup YES, pulldown NO, trigger on LOW
  //esp_err_t esp_deep_sleep_enable_gpio_wakeup(uint64_t gpio_pin_mask, esp_deepsleep_gpio_wake_up_mode_t mode);
  esp_deep_sleep_enable_gpio_wakeup((1 << BUTTON_PIN), ESP_GPIO_WAKEUP_GPIO_LOW);
  // rtc_gpio_pullup_en(BUTTON_PIN);
  // rtc_gpio_pulldown_dis(BUTTON_PIN);
}

void sleepUpdate() {
  if (millis() - lastActivityMs > SLEEP_AFTER_MS && btleIdle()) {
    log_i("No clients connected, no activity in %d, going to sleep", SLEEP_AFTER_MS);
    Serial.flush();
    displayTeardown();
    btleTeardown();
    prefsTeardown();
    delay(100);

    esp_deep_sleep_start();
  }
}