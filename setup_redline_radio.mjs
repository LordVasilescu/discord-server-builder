// © 2026 Mathew. All rights reserved.
// Wipe #redline-radio and pin Iron Talon request board.
import 'dotenv/config';

const TOKEN = process.env.DISCORD_TOKEN;
const gid = process.env.GUILD_ID?.trim();
const API = 'https://discord.com/api/v10';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rest(method, path, body) {
  for (let i = 0; i < 12; i++) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bot ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      const d = await res.json().catch(() => ({}));
      await sleep((d.retry_after ?? 1) * 1000 + 300);
      continue;
    }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
    await sleep(280);
    return res.status === 204 ? null : res.json();
  }
  throw new Error(`${method} ${path} failed`);
}

const chans = await rest('GET', `/guilds/${gid}/channels`);
const ch = chans.find((c) => c.name === 'redline-radio' && c.type === 0);
if (!ch) {
  console.error('redline-radio not found');
  process.exit(1);
}
console.log(`channel ${ch.id}`);

// Unpin everything first
try {
  const pins = await rest('GET', `/channels/${ch.id}/pins`);
  for (const p of pins || []) {
    await rest('DELETE', `/channels/${ch.id}/pins/${p.id}`);
    console.log(`unpinned ${p.id}`);
  }
} catch (e) {
  console.warn('pins:', e.message);
}

// Delete messages
let deleted = 0;
for (let pass = 0; pass < 25; pass++) {
  const msgs = await rest('GET', `/channels/${ch.id}/messages?limit=100`);
  if (!msgs?.length) break;

  const now = Date.now();
  const bulk = [];
  const old = [];
  for (const m of msgs) {
    const age = now - new Date(m.timestamp).getTime();
    if (age < 13 * 24 * 3600 * 1000) bulk.push(m.id);
    else old.push(m.id);
  }

  if (bulk.length >= 2) {
    await rest('POST', `/channels/${ch.id}/messages/bulk-delete`, { messages: bulk });
    deleted += bulk.length;
    console.log(`bulk ${bulk.length}`);
  } else if (bulk.length === 1) {
    await rest('DELETE', `/channels/${ch.id}/messages/${bulk[0]}`);
    deleted++;
  }
  for (const id of old) {
    await rest('DELETE', `/channels/${ch.id}/messages/${id}`);
    deleted++;
  }
  if (msgs.length < 100) break;
}
console.log(`deleted ${deleted} messages`);

await rest('PATCH', `/channels/${ch.id}`, {
  name: 'redline-radio',
  topic: 'REDLINE RADIO // Iron Talon request line. Join VC. /play or /p. Spotify + YouTube. /skip /queue /stop',
});
console.log('topic set');

const msg = await rest('POST', `/channels/${ch.id}/messages`, {
  embeds: [
    {
      title: 'REDLINE RADIO',
      description: [
        '**Iron Talon request line.**',
        'Drop songs here. He plays them in voice.',
        '',
        '**1.** Join **AFTERLIFE-BAR** or **PLAZA** (or any voice channel)',
        '**2.** Request:',
        '`/play` or `/p` + YouTube/Spotify link or search',
        '',
        '**Controls**',
        '`/skip` · `/queue` · `/np` · `/pause` · `/resume`',
        '`/volume` · `/shuffle` · `/stop`',
        '',
        'Playlists shuffle by default.',
        'Post requests. No spam dumps.',
      ].join('\n'),
      color: 0xff2a00,
      footer: { text: 'GRILLONIA PRIME // REDLINE RADIO // IRON TALON' },
    },
  ],
});
console.log(`posted ${msg.id}`);
await rest('PUT', `/channels/${ch.id}/pins/${msg.id}`);
console.log('pinned');
console.log('done');
