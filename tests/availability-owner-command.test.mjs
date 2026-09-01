import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AVAILABILITY_OWNER_COMMAND_LIMITS,
  parseAvailabilityOwnerCommand
} from '../availability-owner-command.js';

const now = new Date('2026-09-01T15:00:00.000Z');

test('owner commands translate relative timers into the canonical temporary override payload', () => {
  assert.deepEqual(parseAvailabilityOwnerCommand('away 4h', { now, timeZone: 'America/Bogota' }), {
    ok: true,
    type: 'override',
    payload: { action: 'override', mode: 'away', durationMinutes: 240 },
    timeZone: 'America/Bogota'
  });
  assert.deepEqual(parseAvailabilityOwnerCommand('limited 1h 30m', { now }), {
    ok: true,
    type: 'override',
    payload: { action: 'override', mode: 'limited', durationMinutes: 90 },
    timeZone: 'America/Bogota'
  });
  assert.deepEqual(parseAvailabilityOwnerCommand('disponible 45 min', { now }), {
    ok: true,
    type: 'override',
    payload: { action: 'override', mode: 'available', durationMinutes: 45 },
    timeZone: 'America/Bogota'
  });
});

test('until commands calculate a bounded timer in the active Availability timezone', () => {
  assert.deepEqual(parseAvailabilityOwnerCommand('away until 23:00', { now, timeZone: 'America/Bogota' }), {
    ok: true,
    type: 'override',
    payload: { action: 'override', mode: 'away', durationMinutes: 780 },
    timeZone: 'America/Bogota'
  });
  const madrid = parseAvailabilityOwnerCommand('ausente hasta 23:00', { now, timeZone: 'Europe/Madrid' });
  assert.equal(madrid.ok, true);
  assert.equal(madrid.payload.durationMinutes, 360);
});

test('back clears only the temporary override and status is read-only', () => {
  assert.deepEqual(parseAvailabilityOwnerCommand('back', { now }), {
    ok: true,
    type: 'override',
    payload: { action: 'override', mode: 'auto' }
  });
  assert.deepEqual(parseAvailabilityOwnerCommand('estado', { now }), { ok: true, type: 'status' });
});

test('owner commands never create indefinite or out-of-bounds temporary states', () => {
  assert.deepEqual(AVAILABILITY_OWNER_COMMAND_LIMITS, {
    minDurationMinutes: 15,
    maxDurationMinutes: 1440
  });
  assert.equal(parseAvailabilityOwnerCommand('away', { now }).ok, false);
  assert.equal(parseAvailabilityOwnerCommand('away 5m', { now }).ok, false);
  assert.equal(parseAvailabilityOwnerCommand('away 25h', { now }).ok, false);
});
