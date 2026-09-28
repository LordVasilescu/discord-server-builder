// © 2026 Mathew. All rights reserved.
import 'dotenv/config';
import { readFileSync } from 'fs';

const T = process.env.DISCORD_TOKEN;
const API = 'https://discord.com/api/v10';
const CH = process.env.WARLORD_CHANNEL_ID?.trim();
const auth = { Authorization: `Bot ${T}` };
const BLOOD = process.env.BLOODSPLAT_EMOJI_ID?.trim(); // bloodsplat animated emoji

// Remove pins
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

// Clean leftover bot spam (bloodsplat "live" messages etc.)
const recent = await (
  await fetch(`${API}/channels/${CH}/messages?limit=30`, { headers: auth })
).json();
for (const m of recent || []) {
  const c = m.content || '';
  if (
    c.includes('Animated bloodsplat') ||
    c.includes('bloodsplat emoji live') ||
    c.includes('aura loop') ||
    c.includes('Channel blast emoji')
  ) {
    await fetch(`${API}/channels/${CH}/messages/${m.id}`, { method: 'DELETE', headers: auth });
    console.log('deleted spam', m.id);
  }
}

const buf = readFileSync('art/warlord_aura_15s.mp4');
const boundary = `----V${Date.now()}`;

// Text above video only — no "15s loop" caption line
const text = [
  '**KILL CAM**',
  '**GAMING WARLORD.**',
  '',
  'Badass clips or get the fuck outta here.',
  'No bullshit. No bomboclat. No filler.',
].join('\n');

const payload = JSON.stringify({ content: text });
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
console.log('msg', r.status, t.slice(0, 160));
if (!r.ok) process.exit(1);
const msg = JSON.parse(t);

// Bloodsplat UNDER the whole message (including video) as reactions — no caption spam
await fetch(`${API}/channels/${CH}/messages/${msg.id}/reactions/bloodsplat:${BLOOD}/@me`, {
  method: 'PUT',
  headers: auth,
});
console.log('reacted bloodsplat');

// Second message: just the animated bloodsplats (appears under pin in channel; also pin stack)
// User asked: text → video → bloodsplat. Discord can't put content under attachments in one msg,
// so post pure bloodsplat line and leave unpinned under the pin, OR put in follow-up.
// Put bloodsplat-only as content under by editing... can't.
// Follow-up message with only emojis (not the "live" bullshit):
const splat = await fetch(`${API}/channels/${CH}/messages`, {
  method: 'POST',
  headers: { ...auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: `<a:bloodsplat:${BLOOD}> <a:bloodsplat:${BLOOD}> <a:bloodsplat:${BLOOD}>`,
  }),
});
const splatMsg = await splat.json();
console.log('splat msg', splat.status, splatMsg.id);

// Pin only the main text+video message so the pin is clean
const pin = await fetch(`${API}/channels/${CH}/pins/${msg.id}`, {
  method: 'PUT',
  headers: auth,
});
console.log('pin', pin.status, msg.id);
console.log('DONE');
