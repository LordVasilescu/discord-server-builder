// © 2026 Mathew. All rights reserved.
// Rebrand singular: GAMING WARLORD (not warlords)
import 'dotenv/config';
import { readFileSync } from 'fs';

const TOKEN = process.env.DISCORD_TOKEN;
const gid = process.env.GUILD_ID.trim();
const API = 'https://discord.com/api/v10';

async function api(method, path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${TOKEN}`,
      ...(opts.json ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const chans = await api('GET', `/guilds/${gid}/channels`);
const clips = chans.find(
  (c) =>
    c.type === 0 &&
    /gaming.?warlord|warlord.?gaming|warlord.?clip|gaming-warlords-clips/i.test(c.name),
);
if (!clips) {
  console.error('clips channel not found');
  process.exit(1);
}

await api('PATCH', `/channels/${clips.id}`, {
  json: true,
  body: JSON.stringify({
    name: 'gaming-warlord-clips',
    topic: 'KILL CAM // GAMING WARLORD. Badass clips only. No bullshit.',
  }),
});
console.log(`${clips.name} -> gaming-warlord-clips`);

const roles = await api('GET', `/guilds/${gid}/roles`);
const role = roles.find((r) => /warlord/i.test(r.name));
if (role && role.name !== 'GAMING WARLORD') {
  await api('PATCH', `/guilds/${gid}/roles/${role.id}`, {
    json: true,
    body: JSON.stringify({ name: 'GAMING WARLORD', color: 0xff2a00, hoist: true }),
  });
  console.log(`${role.name} -> GAMING WARLORD`);
} else {
  console.log('role OK:', role?.name);
}

const warlords = (await api('GET', `/guilds/${gid}/channels`)).find(
  (c) => c.name === 'warlords' && c.type === 0,
);
if (warlords) {
  await api('PATCH', `/channels/${warlords.id}`, {
    json: true,
    body: JSON.stringify({
      topic: 'GAMING WARLORD // LFG for killers. no casuals. no tourists.',
    }),
  });
  console.log('updated #warlords topic');
}

const pins = await api('GET', `/channels/${clips.id}/pins`);
for (const p of pins || []) {
  await api('DELETE', `/channels/${clips.id}/pins/${p.id}`);
  try {
    await api('DELETE', `/channels/${clips.id}/messages/${p.id}`);
  } catch {
    /* ignore */
  }
  console.log('removed pin', p.id);
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

const res = await fetch(`${API}/channels/${clips.id}/messages`, {
  method: 'POST',
  headers: {
    Authorization: `Bot ${TOKEN}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  },
  body,
});
const text = await res.text();
if (!res.ok) {
  console.error(text);
  process.exit(1);
}
const msg = JSON.parse(text);
await api('PUT', `/channels/${clips.id}/pins/${msg.id}`);
console.log('PINNED', msg.id);
console.log('DONE — singular WARLORD');
