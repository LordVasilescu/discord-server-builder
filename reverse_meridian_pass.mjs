// © 2026 Mathew. All rights reserved.
// Undo structural changes from meridian_pass.mjs.
// Keeps the new Meridian art (icon + hero banners); restores names, roles,
// description, and original embed copy. Removes channels we created.
import 'dotenv/config';
import { readFileSync } from 'node:fs';

const TOKEN = process.env.DISCORD_TOKEN;
const gid = process.env.GUILD_ID?.trim();
const API = 'https://discord.com/api/v10';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const auth = { Authorization: `Bot ${TOKEN}` };

async function rest(method, path, body) {
  for (let i = 0; i < 8; i++) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      const d = await res.json().catch(() => ({}));
      await sleep((d.retry_after ?? 1) * 1000 + 300);
      continue;
    }
    if (res.status >= 500) { await sleep(1000); continue; }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
    await sleep(280);
    return res.status === 204 ? null : res.json();
  }
  throw new Error(`${method} ${path} failed`);
}

const hex = (h) => parseInt(h.replace('#', ''), 16);

let channels = await rest('GET', `/guilds/${gid}/channels`);
let roles = await rest('GET', `/guilds/${gid}/roles`);
const ch = (n) => channels.find((c) => c.name === n);
const cat = (n) => channels.find((c) => c.type === 4 && c.name === n);
const role = (n) => roles.find((r) => r.name === n);

async function renameChannel(from, to, topic) {
  const c = ch(from) || ch(to);
  if (!c) { console.log(`  ? channel missing: ${from}`); return; }
  const body = {};
  if (c.name !== to) body.name = to;
  if (topic !== undefined) body.topic = topic;
  if (!Object.keys(body).length) { console.log(`  = #${to}`); return; }
  const updated = await rest('PATCH', `/channels/${c.id}`, body);
  Object.assign(c, updated);
  console.log(`  + #${from} → #${to}`);
}

async function renameRole(from, to, colorHex) {
  const r = role(from) || role(to);
  if (!r) { console.log(`  ? role missing: ${from}`); return; }
  const updated = await rest('PATCH', `/guilds/${gid}/roles/${r.id}`, {
    name: to,
    color: hex(colorHex),
  });
  Object.assign(r, updated);
  console.log(`  + role → ${to}`);
}

// ---- 1. description (pre-meridian) ------------------------------------------
console.log('— description —');
await rest('PATCH', `/guilds/${gid}`, {
  description:
    'a neon ecumenopolis — ten billion lights, from the orbital spire down to the undercity. read the code. get chipped. descend.',
});
console.log('  + restored');

// ---- 2. roles ---------------------------------------------------------------
console.log('— roles —');
// cyberpunk palette from CYBERPUNK_THEME.md / pre-pass names
await renameRole('PRIME ARCHITECT', 'PRIME ARCHITECT', '#FF006E');
await renameRole('NETRUNNER', 'NETRUNNER', '#00F0FF');
await renameRole('ICE', 'ICE', '#B026FF');
await renameRole('DAEMON', 'DAEMON', '#39FF14');
await renameRole('CIRCUIT', 'STREET SAMURAI', '#FF6E00');
await renameRole('STREET SAMURAI', 'STREET SAMURAI', '#FF6E00');
await renameRole('HOLO-PASS', 'HOLO-PASS', '#FF10F0');
await renameRole('FIXER', 'FIXER', '#4D4DFF');
await renameRole('PRIME CITIZEN', 'PRIME CITIZEN', '#E0E0FF');
await renameRole('OFFWORLDER', 'OFFWORLDER', '#4A4A55');
await renameRole('AFTERLIGHT', 'UNDERCITY', '#AD1457');
await renameRole('UNDERCITY', 'UNDERCITY', '#AD1457');
roles = await rest('GET', `/guilds/${gid}/roles`);

// ---- 3. categories ----------------------------------------------------------
console.log('— categories —');
const CAT_BACK = [
  { from: 'ARRIVAL', to: 'ORBITAL DOCK' },
  { from: 'HEARTLIGHT', to: 'AFTERLIFE' },
  { from: 'THE CIRCUIT', to: 'COMBAT' },
  { from: 'FAMEWORKS', to: 'THE FORGE' },
  { from: 'BROADCAST MILE', to: 'HOLO-DECK' },
  { from: 'AFTERLIGHT', to: 'BLACKWALL' },
  { from: 'SPIRE OPS', to: 'THE SPIRE' },
];
for (const { from, to } of CAT_BACK) {
  const c = cat(from) || cat(to);
  if (!c) { console.log(`  ? cat missing ${from}`); continue; }
  if (c.name === to) { console.log(`  = ${to}`); continue; }
  const updated = await rest('PATCH', `/channels/${c.id}`, { name: to });
  Object.assign(c, updated);
  console.log(`  + ${from} → ${to}`);
}
channels = await rest('GET', `/guilds/${gid}/channels`);

// ---- 4. channel renames + original topics -----------------------------------
console.log('— channels —');
await renameChannel('boot-sequence', 'boot-sequence', '▸ planetfall. read the code. get chipped. descend.');
await renameChannel('the-code', 'the-code', '▸ planetary law. break it = deportation. ICE has final call.');
await renameChannel('augments', 'augments', '▸ react to install mod-chips. remove to uninstall.');
await renameChannel('heartlight', 'the-game-strip', '▸ street level. open frequency. say something, choomba.');
await renameChannel('the-game-strip', 'the-game-strip', '▸ street level. open frequency. say something, choomba.');
await renameChannel('data-cache', 'data-cache', '▸ pics. clips. tracks. cool links.');
await renameChannel('HEARTLIGHT-PLAZA', 'AFTERLIFE-BAR');
await renameChannel('AFTERLIFE-BAR', 'AFTERLIFE-BAR');
await renameChannel('ON.STREAM', '-ON.STREAM');
await renameChannel('-ON.STREAM', '-ON.STREAM');
await renameChannel('afterlight', 'jig-jig', '▸ the undercity — lowest levels of the planet. 18+.');
await renameChannel('jig-jig', 'jig-jig', '▸ the undercity — lowest levels of the planet. 18+.');
await renameChannel('game-grid', 'game-grid', '▸ all arenas — wow, blockworld, everything.');
await renameChannel('terminal', 'terminal', '▸ spire command line. run bot commands. // is prefix.');
await renameChannel('LANDING-PAD', 'LANDING-PAD');
await renameChannel('ROOFTOP', 'ROOFTOP');
await renameChannel('ARENA-01', 'ARENA-01');
await renameChannel('ARENA-02', 'ARENA-02');
await renameChannel('CREATION', 'CREATION');

// ---- 5. delete channels we created ------------------------------------------
console.log('— delete added channels —');
const CREATED = [
  'jack-in', 'signal-noise', 'the-void', 'off-topic', 'squad-up',
  'in-construction', 'gallery', 'source', 'peer-review',
  'signal-feed', 'queue', 'sync-up', 'watch-log', 'sysadmin',
  'SYNC-CHAMBER', 'OFFLINE',
];
channels = await rest('GET', `/guilds/${gid}/channels`);
for (const name of CREATED) {
  const c = ch(name);
  if (!c) { console.log(`  = #${name} already gone`); continue; }
  await rest('DELETE', `/channels/${c.id}`);
  channels = channels.filter((x) => x.id !== c.id);
  console.log(`  - deleted #${name}`);
}

// reparent core channels to original categories
console.log('— reparent —');
channels = await rest('GET', `/guilds/${gid}/channels`);
const PARENTS = {
  'boot-sequence': 'ORBITAL DOCK',
  'the-code': 'ORBITAL DOCK',
  'augments': 'ORBITAL DOCK',
  'LANDING-PAD': 'ORBITAL DOCK',
  'the-game-strip': 'AFTERLIFE',
  'data-cache': 'AFTERLIFE',
  'AFTERLIFE-BAR': 'AFTERLIFE',
  'ROOFTOP': 'AFTERLIFE',
  'game-grid': 'COMBAT',
  'ARENA-01': 'COMBAT',
  'ARENA-02': 'COMBAT',
  'CREATION': 'THE FORGE',
  '-ON.STREAM': 'HOLO-DECK',
  'jig-jig': 'BLACKWALL',
  'terminal': 'THE SPIRE',
};
for (const [name, parentName] of Object.entries(PARENTS)) {
  const c = ch(name);
  const p = cat(parentName);
  if (!c || !p) continue;
  if (c.parent_id === p.id) continue;
  await rest('PATCH', `/channels/${c.id}`, { parent_id: p.id });
  console.log(`  + moved #${name} → ${parentName}`);
}

// ---- 6. original embed copy + NEW art files ---------------------------------
console.log('— orientation embeds (old copy, new art) —');
channels = await rest('GET', `/guilds/${gid}/channels`);
const id = (n) => ch(n)?.id;
const codeId = id('the-code');
const augId = id('augments');
const stripId = id('the-game-strip');
const jigId = id('jig-jig');

const EMBEDS = {
  'boot-sequence': {
    file: 'hero_boot.png',
    reactions: [],
    embed: {
      title: 'PLANETFALL CONFIRMED',
      description:
        '**GRILLONIA PRIME** — a neon ecumenopolis. ten billion lights, from the orbital spire down to the undercity.\n\n' +
        'you just touched down, offworlder. boot sequence:',
      color: 0xff2a6d,
      fields: [
        { name: '01 · read', value: codeId ? `planetary law → <#${codeId}>` : 'planetary law', inline: true },
        { name: '02 · get chipped', value: augId ? `install augments → <#${augId}>` : 'install augments', inline: true },
        { name: '03 · hit the street', value: stripId ? `say something → <#${stripId}>` : 'the-game-strip', inline: true },
        { name: '04 · tune in', value: 'the feed never sleeps → join **-ON.STREAM**', inline: false },
      ],
      image: { url: 'attachment://hero_boot.png' },
      footer: { text: 'descend when ready_' },
    },
  },
  'the-code': {
    file: 'hero_code.png',
    reactions: ['✅'],
    embed: {
      title: 'THE CODE — PLANETARY LAW',
      description: 'break it = deportation. ICE has final call.',
      color: 0xff003c,
      fields: [
        { name: '01', value: '**respect the crew.**' },
        { name: '02', value: '**no hate signal** — slurs / harassment / doxxing = instant deportation.' },
        { name: '03', value: '**tag spoilers** — ||like this||.' },
        {
          name: '04',
          value: jigId
            ? `**nsfw stays below** — keep it in <#${jigId}>, opt in via <#${augId}>.`
            : '**nsfw stays below** — undercity only, opt in via augments.',
        },
        { name: '05', value: '**ICE has final call** — DM a **PRIME ARCHITECT** for sysadmin issues.' },
      ],
      image: { url: 'attachment://hero_code.png' },
      footer: { text: 'react ✅ to clear customs and descend into the city' },
    },
  },
  'augments': {
    file: 'hero_augments.png',
    reactions: ['✅', '⚔️', '🎬', '🛠️', '🔴'],
    embed: {
      title: 'AUGMENT INSTALLATION',
      description: 'react to install mod-chips and unlock the planet. remove a reaction to uninstall.',
      color: 0xb026ff,
      fields: [
        { name: '✅  PRIME CITIZEN', value: 'clear customs, descend into the city' },
        { name: '⚔️  STREET SAMURAI', value: 'combat-sector pings' },
        { name: '🎬  HOLO-PASS', value: 'broadcast / movie nights' },
        { name: '🛠️  FIXER', value: 'the forge peer-review pings' },
        { name: '🔴  UNDERCITY', value: 'unlocks the lower levels (18+)' },
      ],
      image: { url: 'attachment://hero_augments.png' },
      footer: { text: "chip installs go live once the netrunner's online" },
    },
  },
};

for (const [chName, spec] of Object.entries(EMBEDS)) {
  const channelId = id(chName);
  if (!channelId) { console.log(`  ? #${chName} missing`); continue; }
  const pins = await rest('GET', `/channels/${channelId}/pins`).catch(() => []);
  for (const p of pins) {
    await rest('DELETE', `/channels/${channelId}/messages/${p.id}`).catch(() => {});
  }
  const form = new FormData();
  form.append('payload_json', JSON.stringify({
    embeds: [spec.embed],
    attachments: [{ id: 0, filename: spec.file }],
  }));
  const buf = readFileSync(`art/${spec.file}`);
  form.append('files[0]', new Blob([buf], { type: 'image/png' }), spec.file);
  const res = await fetch(`${API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: auth,
    body: form,
  });
  if (!res.ok) {
    console.log(`  ! #${chName} ${res.status} ${await res.text()}`);
    continue;
  }
  const msg = await res.json();
  await sleep(400);
  await rest('PUT', `/channels/${channelId}/pins/${msg.id}`).catch(() => {});
  for (const e of spec.reactions) {
    await rest('PUT', `/channels/${channelId}/messages/${msg.id}/reactions/${encodeURIComponent(e)}/@me`).catch(() => {});
  }
  console.log(`  + restored embed in #${chName} (new art kept)`);
}

// Keep new icon (user wanted pictures). If they want old icon: art/legacy_retrowave/server_icon.png
console.log('\n✅ Reversed structure. New Meridian art kept on icon + hero banners.');
console.log('   Old art still in art/legacy_retrowave/ if you want that back too.');
