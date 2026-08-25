import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Finance exposes the LiventX signing portal from the ready-to-sign workflow", async () => {
  const [html, script, styles] = await Promise.all([
    readFile(new URL("../admin/finance/index.html", import.meta.url), "utf8"),
    readFile(new URL("../admin/finance-liventx-portal-link.js", import.meta.url), "utf8"),
    readFile(new URL("../admin/finance-liventx-portal-link.css", import.meta.url), "utf8")
  ]);

  assert.match(html, /finance-liventx-portal-link\.css\?v=\d{8}-\d+/);
  assert.match(html, /finance-liventx-portal-link\.js\?v=\d{8}-\d+/);
  assert.match(script, /https:\/\/proveedores\.aoscentral\.com/);
  assert.match(script, /financeLiventXSigningCard/);
  assert.match(script, /financeActionTitle/);
  assert.match(script, /target = "_blank"/);
  assert.match(script, /noopener noreferrer/);
  assert.match(script, /stopPropagation/);
  assert.match(styles, /finance-liventx-portal-link--card/);
  assert.match(styles, /finance-liventx-portal-link--dialog/);
});