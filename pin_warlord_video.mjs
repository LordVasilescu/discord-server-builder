// © 2026 Mathew. All rights reserved.
import 'dotenv/config';
import { readFileSync } from 'fs';

const T = process.env.DISCORD_TOKEN;
const API = 'https://discord.com/api/v10';
const CH = process.env.WARLORD_CHANNEL_ID?.trim();
const auth = { Authorization: `Bot ${T}` };

const pins = await (await fetch(`${API}/channels/${CH}/pins`, { headers: auth })).json();
for (const p of pins || []) {
  await fetch(`${API}/channels/${CH}/pins/${p.id}`, { method: 'DELETE', headers: auth });
  try {
    await fetch(`${API}/channels/${CH}/messages/${p.id}`, { method: 'DELETE', headers: auth });
  } catch {
    /* ignore */
  }
  console.log('removed pin', p.id);
}

const buf = readFileSync('art/warlord_aura_15s.mp4');
console.log('upload bytes', buf.length);

const boundary = `----Warlord${Date.now()}`;
const payload = JSON.stringify({
  content: '**KILL CAM // WARLORD GAMING** — 15s aura loop',
  embeds: [
    {
      title: 'KILL CAM',
      description: [
        '**GAMING WARLORD.**',
        'Badass clips or get the fuck outta here.',
        'No bullshit. No bomboclat.',
        '',
        '_15s seamless aura loop — him + the red void._',
      ].join('\n'),
      color: 0x8b0000,
      footer: { text: 'GRILLONIA PRIME // KILL CAM // GAMING WARLORD' },
    },
  ],
});

const pre = Buffer.from(
  `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="payload_json"\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${payload}\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="files[0]"; filename="warlord_aura_15s.mp4"\r\n` +
    `Content-Type: video/mp4\r\n\r\n`,
);
const post = Buffer.from(`\r\n--${boundary}--\r\n`);
const body = Buffer.concat([pre, buf, post]);

const r = await fetch(`${API}/channels/${CH}/messages`, {
  method: 'POST',
  headers: {
    Authorization: `Bot ${T}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  },
  body,
});
const t = await r.text();
console.log('msg', r.status, t.slice(0, 200));
if (!r.ok) process.exit(1);
const msg = JSON.parse(t);
const pin = await fetch(`${API}/channels/${CH}/pins/${msg.id}`, {
  method: 'PUT',
  headers: auth,
});
console.log('pin', pin.status, 'id', msg.id);
console.log('DONE');
