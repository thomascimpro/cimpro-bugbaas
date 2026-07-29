import assert from "node:assert/strict";
import test from "node:test";
import { createResponsiveLayout } from "./responsiveLayoutModel.ts";

test("compact phones keep tight gutters and safe touch targets", () => {
  const layout = createResponsiveLayout(360, 800);

  assert.equal(layout.tier, "compact");
  assert.equal(layout.gutter, 10);
  assert.equal(layout.touchTarget, 44);
  assert.equal(layout.isTablet, false);
  assert.equal(layout.contentMaxWidth, 360);
});

test("normal phones keep the default mobile density", () => {
  const layout = createResponsiveLayout(412, 915);

  assert.equal(layout.tier, "phone");
  assert.equal(layout.gutter, 12);
  assert.equal(layout.bottomNavHeight, 72);
  assert.equal(layout.uiScale, 1);
});

test("portrait tablets get wider content and larger controls", () => {
  const layout = createResponsiveLayout(800, 1280);

  assert.equal(layout.tier, "tablet");
  assert.equal(layout.isTablet, true);
  assert.equal(layout.isLandscape, false);
  assert.equal(layout.contentMaxWidth, 800);
  assert.equal(layout.touchTarget, 52);
  assert.equal(layout.bottomNavMaxWidth, 720);
  assert.equal(layout.bottomNavInset, 40);
});

test("wide landscape tablets cap readable content without shrinking the shell", () => {
  const layout = createResponsiveLayout(1280, 800);

  assert.equal(layout.tier, "wide");
  assert.equal(layout.isTablet, true);
  assert.equal(layout.isLandscape, true);
  assert.equal(layout.shellMaxWidth, 1180);
  assert.equal(layout.contentMaxWidth, 960);
  assert.equal(layout.gutter, 24);
  assert.equal(layout.bottomNavInset, 24);
  assert.equal(layout.navigationMode, "rail");
  assert.equal(layout.contentColumns, 3);
});
