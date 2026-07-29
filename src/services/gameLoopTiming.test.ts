import assert from "node:assert/strict";
import test from "node:test";
import { arcadeFrameIntervalMs, isIosSafariBrowser } from "./gameLoopTiming.ts";

test("throttles iPhone and touch iPad Safari arcade loops to thirty frames per second", () => {
  const iphoneSafari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1";
  const ipadDesktopSafari = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.5 Safari/605.1.15";

  assert.equal(isIosSafariBrowser(iphoneSafari), true);
  assert.equal(isIosSafariBrowser(ipadDesktopSafari, 5), true);
  assert.equal(arcadeFrameIntervalMs(iphoneSafari), 1000 / 30);
});

test("leaves desktop Safari and iOS Chrome at the normal frame rate", () => {
  const desktopSafari = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.5 Safari/605.1.15";
  const iosChrome = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 CriOS/137.0 Mobile/15E148 Safari/604.1";

  assert.equal(isIosSafariBrowser(desktopSafari), false);
  assert.equal(isIosSafariBrowser(iosChrome), false);
  assert.equal(arcadeFrameIntervalMs(desktopSafari), 0);
});
