import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const username = 'samd.llano95';
const publicHtml = execFileSync('git', ['ls-files', '*.html'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((path) => !path.startsWith('admin/'));
const publicRuntimeJs = ['script.js', 'showday-edge.js', 'availability-status.js'];

test('public HTML never exposes the owner phone number in links, schema, or copy', () => {
  for (const path of publicHtml) {
    const html = fs.readFileSync(path, 'utf8');
    assert.doesNotMatch(html, /https:\/\/wa\.me\/\d{7,}/, `${path} contains a numeric WhatsApp link`);
    assert.doesNotMatch(html, /"telephone"\s*:\s*"\+?\d{7,}"/, `${path} contains public telephone structured data`);
    assert.doesNotMatch(html, /573192473948|319\s*247\s*3948/, `${path} contains the owner phone number as public copy`);
  }
});

test('public JavaScript and edge HTML templates never reintroduce the owner phone number', () => {
  for (const path of publicRuntimeJs) {
    const source = fs.readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /https:\/\/wa\.me\/\d{7,}/, `${path} contains a numeric WhatsApp link`);
    assert.doesNotMatch(source, /573192473948|319\s*247\s*3948/, `${path} contains the owner phone number`);
  }
});

test('Home contact and floating WhatsApp use the username direct link', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const href = `https://wa.me/${username}`;
  assert.match(html, new RegExp(`id="contactWhatsapp"[^>]*href="${href.replace('.', '\\.') }"|href="${href.replace('.', '\\.')}"[^>]*id="contactWhatsapp"`));
  assert.match(html, new RegExp(`id="whatsappFloat"[^>]*href="${href.replace('.', '\\.') }"|href="${href.replace('.', '\\.')}"[^>]*id="whatsappFloat"`));
});

test('browser config stores only the WhatsApp username, not a phone contact target', () => {
  const script = fs.readFileSync('script.js', 'utf8');
  assert.match(script, /whatsappUsername:\s*"samd\.llano95"/);
  assert.doesNotMatch(script, /whatsapp:\s*"\d+"/);
  assert.doesNotMatch(script, /SITE_CONFIG\.contact\.whatsapp(?!Username)/);
  assert.match(script, /wa\.me\/\$\{SITE_CONFIG\.contact\.whatsappUsername\.replace/);
});

test('edge-injected WhatsApp uses the public username', () => {
  const edge = fs.readFileSync('showday-edge.js', 'utf8');
  assert.match(edge, /href="https:\/\/wa\.me\/samd\.llano95"/);
});

test('Availability spec makes username-only public identity an invariant', () => {
  const spec = fs.readFileSync('docs/roadmap/availability-aware-contact-widget.md', 'utf8');
  assert.match(spec, /Public WhatsApp identity \/ phone privacy/);
  assert.match(spec, /must not embed the owner phone number in HTML, JavaScript, structured data or visible copy/);
});
