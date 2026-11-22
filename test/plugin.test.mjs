import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as plugin from "../plugin.js";
import { checkScreenTree } from "../../sdk/sdk/screen.mjs";

test("Manifest valid and has required keys", () => {
  const raw = readFileSync(join(import.meta.dirname, "../kino-plugin.json"), "utf8");
  const manifest = JSON.parse(raw);
  assert.equal(manifest.id, "streambert");
  assert.equal(manifest.name, "StreamBert");
  assert.equal(manifest.version, "1.0.3");
  assert.equal(manifest.apiVersion, 20);
  assert.ok(manifest.capabilities.includes("screen"));
  assert.ok(manifest.capabilities.includes("resolve"));
  assert.ok(manifest.capabilities.includes("home"));
  assert.equal(manifest.screen.icon, "movie");
});

test("Plugin exports all required functions", () => {
  assert.equal(typeof plugin.home, "function");
  assert.equal(typeof plugin.search, "function");
  assert.equal(typeof plugin.browse, "function");
  assert.equal(typeof plugin.episodes, "function");
  assert.equal(typeof plugin.resolve, "function");
  assert.equal(typeof plugin.screen, "function");
  assert.equal(typeof plugin.screenEvent, "function");
});

test("Screen scaffold tree is fully accepted without dropped nodes", async () => {
  const tree = await plugin.screen({ state: { tab: "home" } });
  assert.equal(tree.type, "scaffold");
  assert.equal(tree.appBar.type, "appBar");
  assert.equal(tree.appBar.mergeWithKinoBar, true);
  assert.equal(tree.bottomNavigationBar.type, "navigationBar");

  const checked = checkScreenTree(tree, "es", undefined, { apiVersion: 20 });
  assert.ok(checked.tree !== null, "Scaffold tree must be valid");
  assert.equal(checked.dropped.length, 0, "No dropped nodes in tree");
});

test("Screen settings tab is accepted without dropped nodes", async () => {
  const tree = await plugin.screen({ state: { tab: "settings" } });
  assert.equal(tree.type, "scaffold");
  const checked = checkScreenTree(tree, "es", undefined, { apiVersion: 20 });
  assert.ok(checked.tree !== null, "Settings scaffold tree must be valid");
  assert.equal(checked.dropped.length, 0, "No dropped nodes in settings tree");
});

test("screenEvent handles tab change and settings change", async () => {
  const tabRes = await plugin.screenEvent({ name: "changeTab", value: "movies" });
  assert.deepEqual(tabRes, { state: { tab: "movies" } });

  const srcRes = await plugin.screenEvent({ name: "changeSource", value: "aether" });
  assert.equal(srcRes.config.default_source, "aether");
  assert.equal(srcRes.state.source, "aether");
});

test("All 4 Screen tabs produce valid trees without dropped nodes", async () => {
  for (const tab of ["home", "movies", "series", "settings"]) {
    const tree = await plugin.screen({ state: { tab } });
    assert.equal(tree.type, "scaffold");
    const checked = checkScreenTree(tree, "es", undefined, { apiVersion: 20 });
    assert.ok(checked.tree !== null, `Tab ${tab} scaffold tree must be valid`);
    assert.equal(checked.dropped.length, 0, `Tab ${tab} has no dropped nodes`);
  }
});

test("episodes and resolve accept primitive and string numeric refs safely", async () => {
  const epRes = await plugin.episodes("1399");
  assert.ok(epRes !== null);

  await assert.rejects(async () => {
    await plugin.resolve("550");
  });
});

