import test from "node:test";
import assert from "node:assert/strict";
import { classifyWebRunnerGesture } from "./webRunnerGesture.ts";

test("tap triggers jump", () => {
  assert.equal(classifyWebRunnerGesture(0, 0), "jump");
});

test("upward swipe triggers jump", () => {
  assert.equal(classifyWebRunnerGesture(4, -40), "jump");
});

test("horizontal swipes move left and right", () => {
  assert.equal(classifyWebRunnerGesture(-42, -5), "left");
  assert.equal(classifyWebRunnerGesture(42, -5), "right");
});
