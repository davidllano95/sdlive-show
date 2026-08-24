import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../script.js", import.meta.url), "utf8");

test("rental quote drawer script parses as browser JavaScript", () => {
  assert.doesNotThrow(() => new Function(source));
});

test("rental drawer is framed as a quote request instead of checkout", () => {
  assert.match(source, /drawerEyebrow: "Rental quote"/);
  assert.match(source, /drawerTitle: "Build your request"/);
  assert.match(source, /drawerEyebrow: "Cotización de alquiler"/);
  assert.match(source, /drawerTitle: "Arma tu solicitud"/);
  assert.match(source, /submit: "Request rental quote"/);
  assert.match(source, /submit: "Solicitar cotización"/);
  assert.match(source, /This estimate is not a payment and does not confirm availability or a reservation\./);
  assert.match(source, /Este estimado no es un pago ni confirma disponibilidad o reserva\./);
  assert.doesNotMatch(source, /cartTitle: "Rental cart"/);
  assert.doesNotMatch(source, /cartTitle: "Carrito de alquiler"/);
});

test("rental submission contract remains on the existing endpoint", () => {
  assert.match(source, /const RENTAL_PRICING = \{/);
  assert.match(source, /fetch\("\/api\/rental"/);
  assert.match(source, /estimatedTotalCop:/);
  assert.match(source, /customQuote: configuration\.customQuote/);
  assert.match(source, /turnstileToken,/);
});
