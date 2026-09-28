// © 2026 Mathew. All rights reserved.
// #music-spotlight — under redline-radio. Architect posts song of the day.
import 'dotenv/config';

const TOKEN = process.env.DISCORD_TOKEN;
const gid = process.env.GUILD_ID?.trim();
const API = 'https://discord.com/api/v10';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!TOKEN || !gid) {
  console.error('Missing DISCORD_TOKEN or GUILD_ID');
  process.exit(1);
}

async function rest(method, path, body) {
  for (let i = 0; i < 14; i++) {
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
      await sleep((d.retry_after ?? 1) * 1000 + 400);
      continue;
    }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
    await sleep(300);
    return res.status === 204 ? null : res.json();
  }
  throw new Error(`${method} ${path} failed`);
}

console.log('MUSIC SPOTLIGHT\n');

const chans = await rest('GET', `/guilds/${gid}/channels`);
const main = chans.find((c) => c.name === 'MAIN SECTOR' && c.type === 4);
const redline = chans.find((c) => c.name === 'redline-radio' && c.type === 0);
if (!main || !redline) {
  console.error('MAIN SECTOR or redline-radio missing');
  process.exit(1);
}

const topic =
  'MUSIC SPOTLIGHT // Architect drops one favorite song a day. Discover it. Queue it on REDLINE if it hits.';

let ch = chans.find(
  (c) =>
    (c.name === 'music-spotlight' || c.name === 'musicspotlight') && c.type === 0,
);

// Sit right under redline-radio in the category list
const targetPos = (redline.position ?? 2) + 1;

if (ch) {
  ch = await rest('PATCH', `/channels/${ch.id}`, {
    name: 'music-spotlight',
    parent_id: main.id,
    topic,
    position: targetPos,
  });
  console.log(`~ #music-spotlight ${ch.id} pos ${targetPos}`);
} else {
  ch = await rest('POST', `/guilds/${gid}/channels`, {
    name: 'music-spotlight',
    type: 0,
    parent_id: main.id,
    topic,
    position: targetPos,
  });
  console.log(`+ #music-spotlight ${ch.id}`);
}

// Free unicode sidebar icon (music)
try {
  ch = await rest('PATCH', `/channels/${ch.id}`, {
    icon_emoji: { name: '🎵' },
  });
  console.log('icon 🎵');
} catch (e) {
  console.warn('icon skip:', e.message);
  try {
    ch = await rest('PATCH', `/channels/${ch.id}`, {
      icon_emoji: { name: '🎧' },
    });
    console.log('icon 🎧');
  } catch (e2) {
    console.warn('no music icon:', e2.message);
  }
}

// light slowmode so the drop stays readable (30s)
try {
  await rest('PATCH', `/channels/${ch.id}`, { rate_limit_per_user: 15 });
  console.log('slowmode 15s');
} catch (e) {
  console.warn('slowmode:', e.message);
}

// clear old pins
try {
  const pins = await rest('GET', `/channels/${ch.id}/pins`);
  for (const p of pins || []) {
    await rest('DELETE', `/channels/${ch.id}/pins/${p.id}`);
  }
} catch {
  /* ignore */
}

const board = await rest('POST', `/channels/${ch.id}/messages`, {
  embeds: [
    {
      title: 'MUSIC SPOTLIGHT',
      description: [
        '**One song. Every day.**',
        '',
        'The Architect drops a favorite track here for the city to discover.',
        '',
        '**How it works**',
        '• Check this channel for the song of the day',
        '• Hit the link · listen · form your own take',
        '• Want it on the air? Request it in **#redline-radio**',
        '',
        'No spam dumps. React. Talk about the track. Keep it about the music.',
      ].join('\n'),
      color: 0xff2a00,
      footer: { text: 'GRILLONIA PRIME · MUSIC SPOTLIGHT · under REDLINE' },
    },
  ],
});
await rest('PUT', `/channels/${ch.id}/pins/${board.id}`);
console.log(`pinned ${board.id}`);

// re-check order under MAIN SECTOR
const after = await rest('GET', `/guilds/${gid}/channels`);
const kids = after
  .filter((c) => c.parent_id === main.id)
  .sort((a, b) => a.position - b.position);
console.log('\nMAIN SECTOR order:');
for (const c of kids) console.log(`  ${c.position}  #${c.name}`);

console.log('\ndone');
