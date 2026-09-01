import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const username = 'samd.llano95';
const usernameHref = `https://wa.me/${username}`;
const legacyPhoneDigits = '573192473948';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content, 'utf8');
}

const publicHtml = execFileSync('git', ['ls-files', '*.html'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((path) => !path.startsWith('admin/'));

for (const path of publicHtml) {
  let html = read(path);

  html = html.replaceAll(`https://wa.me/${legacyPhoneDigits}`, usernameHref);
  html = html.replace(new RegExp(`\\n\\s*\\"telephone\\"\\s*:\\s*\\"\\+?${legacyPhoneDigits}\\"\\s*,?`, 'g'), '');
  html = html.replaceAll(`tel:+${legacyPhoneDigits}`, '#contact');
  html = html.replaceAll(`tel:${legacyPhoneDigits}`, '#contact');

  write(path, html);
}

const scriptPath = 'script.js';
let script = read(scriptPath);
script = script.replace(/\n\s*whatsapp:\s*"\d+",\s*\/\/ digits only: country code \+ number, no \+ or spaces/, '');
script = script.replaceAll('`https://wa.me/${SITE_CONFIG.contact.whatsapp}`', '`https://wa.me/${SITE_CONFIG.contact.whatsappUsername.replace(/^@/, "")}`');
write(scriptPath, script);

const specPath = 'docs/roadmap/availability-aware-contact-widget.md';
let spec = read(specPath);
const marker = '## Frontend behavior\n';
if (!spec.includes(marker)) throw new Error('Availability spec frontend marker not found');
if (!spec.includes('### Public WhatsApp identity / phone privacy')) {
  const privacySection = `### Public WhatsApp identity / phone privacy\n\n- Public pages use the WhatsApp username as the contact identity and direct-link target; they must not embed the owner phone number in HTML, JavaScript, structured data or visible copy.\n- If WhatsApp username linking is unavailable for a visitor, fall back to Contact/Rental rather than exposing the phone number.\n- A phone number may exist only in server-side configuration when required for authenticated WhatsApp provider/webhook operations. It is not a public Availability field.\n- Availability changes CTA priority/status; it never changes this privacy boundary.\n\n`;
  spec = spec.replace(marker, `${privacySection}${marker}`);
}
write(specPath, spec);

console.log(`Patched ${publicHtml.length} public HTML files plus script.js and Availability spec.`);
