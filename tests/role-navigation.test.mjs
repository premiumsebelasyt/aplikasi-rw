import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { navigationItemsForRole } from "../lib/navigation/role-nav.mjs";

const kasLayout = await readFile(new URL("../app/kas/layout.tsx", import.meta.url), "utf8");
const menuPage = await readFile(new URL("../app/menu/page.tsx", import.meta.url), "utf8");
const rwDashboard = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const settingsPage = await readFile(new URL("../app/pengaturan/page.tsx", import.meta.url), "utf8");

const roles = ["WARGA", "RT", "RW", "BENDAHARA", "ADMIN"];

test("each application role gets a distinct set of bottom-navigation destinations", () => {
  for (const role of roles) {
    const items = navigationItemsForRole(role);
    assert.ok(items.length >= 3 && items.length <= 5, role);
    assert.equal(new Set(items.map((item) => item.href)).size, items.length, role);
    assert.ok(items.some((item) => item.href === "/menu"), role);
  }
});

test("role navigation contains only routes intended for that role", () => {
  assert.deepEqual(navigationItemsForRole("WARGA").map((item) => item.href), [
    "/", "/surat", "/buat-surat", "/pengaturan/profil", "/menu",
  ]);
  assert.equal(navigationItemsForRole("RT").some((item) => item.href.startsWith("/kas")), false);
  assert.equal(navigationItemsForRole("RW").some((item) => item.href.startsWith("/kas")), false);
  assert.equal(navigationItemsForRole("BENDAHARA").some((item) => ["/warga", "/rw/surat"].includes(item.href)), false);
  assert.ok(navigationItemsForRole("ADMIN").some((item) => item.href === "/kas"));
  assert.ok(navigationItemsForRole("ADMIN").some((item) => item.href === "/surat"));
  assert.ok(navigationItemsForRole("ADMIN").some((item) => item.href === "/warga"));
  assert.equal(navigationItemsForRole("ADMIN").some((item) => item.href === "/rw/surat"), false);
  assert.deepEqual(navigationItemsForRole("UNKNOWN"), []);
});

test("Kas read menu includes RW while controls remain assigned to managers", () => {
  assert.match(kasLayout, /allowedRoles=\{\["RW", "BENDAHARA", "ADMIN"\]\}/);
  for (const card of ["Kas RW", "Transaksi", "IPK / Iuran", "Laporan Kas"]) {
    const start = menuPage.indexOf(`title: "${card}"`);
    assert.notEqual(start, -1, `missing ${card} menu item`);
    const end = menuPage.indexOf("},", start);
    assert.match(menuPage.slice(start, end), /roles: \["RW", "BENDAHARA", "ADMIN"\]/, `${card} should be readable by RW`);
  }
  assert.match(settingsPage, /Pengaturan Kas[\s\S]*?roles: \["BENDAHARA", "ADMIN"\]/);
});


test("RW finance is absent from the landing dashboard but retained in the full menu", () => {
  const staffMenuStart = rwDashboard.indexOf("const staffMenu = [");
  const staffMenuEnd = rwDashboard.indexOf("];", staffMenuStart);
  const landingMenu = rwDashboard.slice(staffMenuStart, staffMenuEnd);
  assert.doesNotMatch(landingMenu, /href:\s*"\/kas|title:\s*"[^"]*keuangan/i);
  assert.match(menuPage, /title: "Kas RW"[\s\S]*?roles: \["RW", "BENDAHARA", "ADMIN"\]/);
});
