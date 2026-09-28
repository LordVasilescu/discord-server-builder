// © 2026 Mathew. All rights reserved.
// Grillonia Prime v2 — kill dead onboarding, streamer + warlord + music layout.
// Safe: renames by id where possible, deletes only named dead channels, creates missing.
import 'dotenv/config';
import { ChannelType } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;
const gid = process.env.GUILD_ID?.trim();
const API = 'https://discord.com/api/v10';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!TOKEN || !gid) {
  console.error('Missing DISCORD_TOKEN or GUILD_ID in .env');
  process.exit(1);
}

async function rest(method, path, body) {
  for (let i = 0; i < 8; i++) {
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
    if (res.status >= 500) {
      await sleep(1000);
      continue;
    }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
    await sleep(350);
    return res.status === 204 ? null : res.json();
  }
  throw new Error(`${method} ${path} failed after retries`);
}

function find(chans, name, type) {
  const n = name.toLowerCase();
  return chans.find((c) => c.name.toLowerCase() === n && (type === undefined || c.type === type));
}

async function ensureCategory(chans, name, position) {
  let cat = find(chans, name, ChannelType.GuildCategory);
  if (cat) {
    if (cat.position !== position || cat.name !== name) {
      cat = await rest('PATCH', `/channels/${cat.id}`, { name, position });
      console.log(`  ~ category ${name} (pos ${position})`);
    } else {
      console.log(`  = category ${name}`);
    }
  } else {
    cat = await rest('POST', `/guilds/${gid}/channels`, {
      name,
      type: ChannelType.GuildCategory,
      position,
    });
    console.log(`  + category ${name}`);
  }
  // refresh list entry
  const idx = chans.findIndex((c) => c.id === cat.id);
  if (idx >= 0) chans[idx] = cat;
  else chans.push(cat);
  return cat;
}

async function ensureChannel(chans, { name, type, parentId, topic, position, nsfw }) {
  // Prefer same parent + type match by old names via caller rename first
  let ch = chans.find(
    (c) => c.name.toLowerCase() === name.toLowerCase() && c.type === type,
  );
  if (ch) {
    const patch = {};
    if (ch.parent_id !== parentId) patch.parent_id = parentId;
    if (topic !== undefined && ch.topic !== topic) patch.topic = topic;
    if (position !== undefined && ch.position !== position) patch.position = position;
    if (nsfw !== undefined && ch.nsfw !== nsfw) patch.nsfw = nsfw;
    if (ch.name !== name) patch.name = name;
    if (Object.keys(patch).length) {
      ch = await rest('PATCH', `/channels/${ch.id}`, patch);
      console.log(`  ~ #${name}`);
    } else {
      console.log(`  = #${name}`);
    }
  } else {
    ch = await rest('POST', `/guilds/${gid}/channels`, {
      name,
      type,
      parent_id: parentId,
      topic: topic ?? undefined,
      position,
      nsfw: nsfw ?? false,
    });
    console.log(`  + #${name}`);
  }
  const idx = chans.findIndex((c) => c.id === ch.id);
  if (idx >= 0) chans[idx] = ch;
  else chans.push(ch);
  return ch;
}

async function renameIfExists(chans, fromNames, toName, type) {
  for (const from of fromNames) {
    const ch = find(chans, from, type);
    if (!ch) continue;
    if (ch.name === toName) return ch;
    const updated = await rest('PATCH', `/channels/${ch.id}`, { name: toName });
    console.log(`  rename ${from} -> ${toName}`);
    const idx = chans.findIndex((c) => c.id === ch.id);
    if (idx >= 0) chans[idx] = updated;
    return updated;
  }
  return null;
}

async function deleteNames(chans, names) {
  for (const name of names) {
    const matches = chans.filter((c) => c.name.toLowerCase() === name.toLowerCase() && c.type !== ChannelType.GuildCategory);
    for (const ch of matches) {
      await rest('DELETE', `/channels/${ch.id}`);
      console.log(`  - deleted ${ch.name} (${ch.id})`);
      const idx = chans.findIndex((c) => c.id === ch.id);
      if (idx >= 0) chans.splice(idx, 1);
    }
  }
}

async function deleteCategoryIfEmpty(chans, name) {
  const cat = find(chans, name, ChannelType.GuildCategory);
  if (!cat) return;
  const kids = chans.filter((c) => c.parent_id === cat.id);
  if (kids.length) {
    console.log(`  ! category ${name} still has ${kids.length} children — skip delete`);
    return;
  }
  await rest('DELETE', `/channels/${cat.id}`);
  console.log(`  - deleted category ${name}`);
  const idx = chans.findIndex((c) => c.id === cat.id);
  if (idx >= 0) chans.splice(idx, 1);
}

console.log('GRILLONIA PRIME v2 — applying structure\n');

let chans = await rest('GET', `/guilds/${gid}/channels`);

// ── 1. Delete dead channels first ──────────────────────────────────────────
console.log('— purge dead —');
await deleteNames(chans, [
  'boot-sequence',
  'the-code',
  'augments',
  'ROOFTOP',
  'rooftop',
  '-ON.STREAM',
  'on.stream',
  'ON.STREAM',
  'terminal',
  'game-grid',
  'LANDING-PAD',
  'landing-pad',
  'jack-in',
  'CREATION',
  'creation',
  'FORGE-FLOOR',
]);

// Delete empty HOLO-DECK / THE SPIRE categories after children gone
chans = await rest('GET', `/guilds/${gid}/channels`);
for (const deadCat of ['HOLO-DECK', 'THE SPIRE', 'ORBITAL DOCK']) {
  const cat = find(chans, deadCat, ChannelType.GuildCategory);
  if (!cat) continue;
  const kids = chans.filter((c) => c.parent_id === cat.id);
  for (const k of kids) {
    // leftover children from orbital dock — delete non-kept
    if (['boot-sequence', 'the-code', 'augments', 'LANDING-PAD', 'landing-pad', 'jack-in'].includes(k.name)) {
      await rest('DELETE', `/channels/${k.id}`);
      console.log(`  - deleted leftover ${k.name}`);
    }
  }
}
chans = await rest('GET', `/guilds/${gid}/channels`);
for (const deadCat of ['HOLO-DECK', 'THE SPIRE', 'ORBITAL DOCK']) {
  await deleteCategoryIfEmpty(chans, deadCat);
  // force-delete category even with orphans moved later
  const cat = find(chans, deadCat, ChannelType.GuildCategory);
  if (cat) {
    const kids = chans.filter((c) => c.parent_id === cat.id);
    for (const k of kids) {
      await rest('DELETE', `/channels/${k.id}`);
      console.log(`  - force child ${k.name}`);
    }
    chans = await rest('GET', `/guilds/${gid}/channels`);
    await deleteCategoryIfEmpty(chans, deadCat);
  }
}

chans = await rest('GET', `/guilds/${gid}/channels`);

// ── 2. Categories ──────────────────────────────────────────────────────────
console.log('\n— categories —');
// Rename existing where possible
await renameIfExists(chans, ['AFTERLIFE', 'NEON DISTRICT'], 'MAIN SECTOR', ChannelType.GuildCategory);
chans = await rest('GET', `/guilds/${gid}/channels`);
await renameIfExists(chans, ['COMBAT', 'COMBAT SECTOR'], 'THE WARGRID', ChannelType.GuildCategory);
chans = await rest('GET', `/guilds/${gid}/channels`);
await renameIfExists(chans, ['THE FORGE', '/dev/forge'], 'THE FORGE', ChannelType.GuildCategory);
chans = await rest('GET', `/guilds/${gid}/channels`);
await renameIfExists(chans, ['BLACKWALL', '//blackwall'], 'BLACKWALL', ChannelType.GuildCategory);
chans = await rest('GET', `/guilds/${gid}/channels`);

const main = await ensureCategory(chans, 'MAIN SECTOR', 0);
chans = await rest('GET', `/guilds/${gid}/channels`);
const war = await ensureCategory(chans, 'THE WARGRID', 1);
chans = await rest('GET', `/guilds/${gid}/channels`);
const forge = await ensureCategory(chans, 'THE FORGE', 2);
chans = await rest('GET', `/guilds/${gid}/channels`);
const black = await ensureCategory(chans, 'BLACKWALL', 3);
chans = await rest('GET', `/guilds/${gid}/channels`);

// ── 3. Renames into target names ───────────────────────────────────────────
console.log('\n— renames —');
// Main hang text was "the-game-strip" (street chat) → prime
await renameIfExists(chans, ['the-game-strip', 'the-street', 'signal', 'heartlight'], 'prime', ChannelType.GuildText);
chans = await rest('GET', `/guilds/${gid}/channels`);
// Music board
await renameIfExists(chans, ['data-cache', 'music'], 'frequency', ChannelType.GuildText);
chans = await rest('GET', `/guilds/${gid}/channels`);

// ── 4. MAIN SECTOR channels ────────────────────────────────────────────────
console.log('\n— MAIN SECTOR —');
await ensureChannel(chans, {
  name: 'prime',
  type: ChannelType.GuildText,
  parentId: main.id,
  topic: 'main hang. talk. stay dangerous.',
  position: 0,
});
chans = await rest('GET', `/guilds/${gid}/channels`);
await ensureChannel(chans, {
  name: 'warlord-clips',
  type: ChannelType.GuildText,
  parentId: main.id,
  topic: 'WARLORDS ONLY. god-tier clips. no trash. no filler. cook or get out.',
  position: 1,
});
chans = await rest('GET', `/guilds/${gid}/channels`);
await ensureChannel(chans, {
  name: 'frequency',
  type: ChannelType.GuildText,
  parentId: main.id,
  topic: 'music drops. links. play this. Grillonia radio board.',
  position: 2,
});
chans = await rest('GET', `/guilds/${gid}/channels`);
await ensureChannel(chans, {
  name: 'PLAZA',
  type: ChannelType.GuildVoice,
  parentId: main.id,
  position: 3,
});
chans = await rest('GET', `/guilds/${gid}/channels`);
await ensureChannel(chans, {
  name: 'AFTERLIFE-BAR',
  type: ChannelType.GuildVoice,
  parentId: main.id,
  position: 4,
});
chans = await rest('GET', `/guilds/${gid}/channels`);

// ── 5. THE WARGRID ─────────────────────────────────────────────────────────
console.log('\n— THE WARGRID —');
await ensureChannel(chans, {
  name: 'warlords',
  type: ChannelType.GuildText,
  parentId: war.id,
  topic: 'WARLORDS ONLY. LFG for killers. no casuals. no tourists.',
  position: 0,
});
chans = await rest('GET', `/guilds/${gid}/channels`);
await ensureChannel(chans, {
  name: 'ARENA-01',
  type: ChannelType.GuildVoice,
  parentId: war.id,
  position: 1,
});
chans = await rest('GET', `/guilds/${gid}/channels`);
await ensureChannel(chans, {
  name: 'ARENA-02',
  type: ChannelType.GuildVoice,
  parentId: war.id,
  position: 2,
});
chans = await rest('GET', `/guilds/${gid}/channels`);

// ── 6. THE FORGE (streamer HQ) ─────────────────────────────────────────────
console.log('\n— THE FORGE —');
await ensureChannel(chans, {
  name: 'going-live',
  type: ChannelType.GuildText,
  parentId: forge.id,
  topic: 'stream links. schedule. I am live.',
  position: 0,
});
chans = await rest('GET', `/guilds/${gid}/channels`);
await ensureChannel(chans, {
  name: 'chat-raid',
  type: ChannelType.GuildText,
  parentId: forge.id,
  topic: 'stream chat overflow. VODs. stream clips. raid energy.',
  position: 1,
});
chans = await rest('GET', `/guilds/${gid}/channels`);
await ensureChannel(chans, {
  name: 'STAGE',
  type: ChannelType.GuildVoice,
  parentId: forge.id,
  position: 2,
});
chans = await rest('GET', `/guilds/${gid}/channels`);
await ensureChannel(chans, {
  name: 'BACKSTAGE',
  type: ChannelType.GuildVoice,
  parentId: forge.id,
  position: 3,
});
chans = await rest('GET', `/guilds/${gid}/channels`);

// ── 7. BLACKWALL ───────────────────────────────────────────────────────────
console.log('\n— BLACKWALL —');
await ensureChannel(chans, {
  name: 'jig-jig',
  type: ChannelType.GuildText,
  parentId: black.id,
  topic: 'undercity. 18+. lowest level of the planet.',
  position: 0,
  nsfw: true,
});
chans = await rest('GET', `/guilds/${gid}/channels`);

// ── 8. Role polish: STREET SAMURAI → WARLORD ───────────────────────────────
console.log('\n— roles —');
const roles = await rest('GET', `/guilds/${gid}/roles`);
const sam = roles.find((r) => /street samurai|samurai/i.test(r.name));
if (sam) {
  await rest('PATCH', `/guilds/${gid}/roles/${sam.id}`, {
    name: 'WARLORD',
    color: 0xff2a00, // blood orange
    hoist: true,
  });
  console.log(`  ${sam.name} -> WARLORD`);
} else if (!roles.find((r) => r.name === 'WARLORD')) {
  console.log('  ? STREET SAMURAI not found — skip');
}

// ── 9. Final purge of any leftover junk categories ─────────────────────────
chans = await rest('GET', `/guilds/${gid}/channels`);
for (const deadCat of ['HOLO-DECK', 'THE SPIRE', 'ORBITAL DOCK', 'AFTERLIFE', 'COMBAT']) {
  const cat = find(chans, deadCat, ChannelType.GuildCategory);
  if (!cat) continue;
  const kids = chans.filter((c) => c.parent_id === cat.id);
  for (const k of kids) {
    // move nothing — delete stragglers only if wrong cat
    console.log(`  leftover under ${deadCat}: ${k.name}`);
  }
  if (kids.length === 0) {
    await rest('DELETE', `/channels/${cat.id}`);
    console.log(`  - category ${deadCat}`);
  }
}

console.log('\n✓ Grillonia Prime v2 structure applied.');
console.log('Run: node dump.mjs');
