// © 2026 Mathew. All rights reserved.
import 'dotenv/config';
import { readFileSync, copyFileSync } from 'fs';

const TOKEN = process.env.DISCORD_TOKEN;
const CH = process.env.WARLORD_CHANNEL_ID?.trim();
const API = 'https://discord.com/api/v10';

// Use art/warlord_banner.jpg already on disk (do not overwrite with an old path).

async function api(method, path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${TOKEN}`,
      ...(opts.json ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {}),
    },
    body: opts.body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

// topic (Discord may filter extreme words — keep hard but safe for topic field)
try {
  await api('PATCH', `/channels/${CH}`, {
    json: true,
    body: JSON.stringify({
      topic: 'KILL CAM // GAMING WARLORD. Badass clips only. No bullshit.',
    }),
  });
  console.log('topic ok');
} catch (e) {
  console.warn('topic failed:', e.message);
}

// unpin + delete old KILL CAM pins
const pins = await api('GET', `/channels/${CH}/pins`);
for (const p of pins || []) {
  await api('DELETE', `/channels/${CH}/pins/${p.id}`);
  console.log('unpinned', p.id);
  try {
    await api('DELETE', `/channels/${CH}/messages/${p.id}`);
    console.log('deleted old pin msg', p.id);
  } catch (e) {
    console.warn('delete msg', e.message);
  }
}

const img = readFileSync('art/warlord_banner.jpg');
const boundary = `----Grillonia${Date.now()}`;
const payload = {
  embeds: [
    {
      title: 'KILL CAM',
      description: [
        '**GAMING WARLORD.**',
        '',
        'Badass clips or get the fuck outta here.',
        'No bullshit. No bomboclat. No filler. No tourist reels.',
        '',
        'Cook. Or leave.',
      ].join('\n'),
      color: 0x8b0000,
      image: { url: 'attachment://warlord_banner.jpg' },
      footer: { text: 'GRILLONIA PRIME // KILL CAM // GAMING WARLORD' },
    },
  ],
  attachments: [{ id: 0, filename: 'warlord_banner.jpg' }],
};

const json = JSON.stringify(payload);
const pre = Buffer.from(
  `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="payload_json"\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${json}\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="files[0]"; filename="warlord_banner.jpg"\r\n` +
    `Content-Type: image/jpeg\r\n\r\n`,
);
const post = Buffer.from(`\r\n--${boundary}--\r\n`);
const body = Buffer.concat([pre, img, post]);

const res = await fetch(`${API}/channels/${CH}/messages`, {
  method: 'POST',
  headers: {
    Authorization: `Bot ${TOKEN}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  },
  body,
});
const text = await res.text();
console.log('msg', res.status, text.slice(0, 180));
if (!res.ok) process.exit(1);
const msg = JSON.parse(text);
await api('PUT', `/channels/${CH}/pins/${msg.id}`);
console.log('PINNED', msg.id);
