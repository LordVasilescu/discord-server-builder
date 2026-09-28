// © 2026 Mathew. All rights reserved.
// Replace orientation pins (boot-sequence, the-code, augments) with rich embeds
// + attached synthwave hero banners. Idempotent: deletes old pins first.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
const TOKEN = process.env.DISCORD_TOKEN;
const API = 'https://discord.com/api/v10';
const gid = process.env.GUILD_ID.trim();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const auth = { Authorization: `Bot ${TOKEN}` };

async function rest(method, path, body) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${API}${path}`, {
      method, headers: { ...auth, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) { const d = await res.json().catch(() => ({})); await sleep((d.retry_after ?? 1) * 1000 + 250); continue; }
    if (res.status >= 500) { await sleep(1000); continue; }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
    await sleep(300);
    return res.status === 204 ? null : res.json();
  }
}

const chans = await rest('GET', `/guilds/${gid}/channels`);
const id = (n) => chans.find(c => c.name === n)?.id;
const M = { code: id('the-code'), aug: id('augments'), strip: id('the-strip'), jig: id('jig-jig') };

const EMBEDS = {
  'boot-sequence': {
    file: 'hero_boot.png', reactions: [],
    embed: {
      title: 'PLANETFALL CONFIRMED',
      description: `**GRILLONIA PRIME** — a neon ecumenopolis. ten billion lights, from the orbital spire down to the undercity.\n\nyou just touched down, offworlder. boot sequence:`,
      color: 0xff2a6d,
      fields: [
        { name: '01 · read', value: `planetary law → <#${M.code}>`, inline: true },
        { name: '02 · get chipped', value: `install augments → <#${M.aug}>`, inline: true },
        { name: '03 · hit the street', value: `say something → <#${M.strip}>`, inline: true },
        { name: '04 · tune in', value: `the feed never sleeps → join **ALWAYS-ON.FEED**`, inline: false },
      ],
      image: { url: 'attachment://hero_boot.png' },
      footer: { text: 'descend when ready_' },
    },
  },
  'the-code': {
    file: 'hero_code.png', reactions: ['✅'],
    embed: {
      title: 'THE CODE — PLANETARY LAW',
      description: 'break it = deportation. ICE has final call.',
      color: 0xff003c,
      fields: [
        { name: '01', value: '**respect the crew.**' },
        { name: '02', value: '**no hate signal** — slurs / harassment / doxxing = instant deportation.' },
        { name: '03', value: '**tag spoilers** — ||like this||.' },
        { name: '04', value: `**nsfw stays below** — keep it in <#${M.jig}>, opt in via <#${M.aug}>.` },
        { name: '05', value: '**ICE has final call** — DM a **PRIME ARCHITECT** for sysadmin issues.' },
      ],
      image: { url: 'attachment://hero_code.png' },
      footer: { text: 'react ✅ to clear customs and descend into the city' },
    },
  },
  'augments': {
    file: 'hero_augments.png', reactions: ['✅', '⚔️', '🎬', '🛠️', '🔴'],
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
  const ch = id(chName);
  if (!ch) { console.log(`? #${chName} missing`); continue; }
  // wipe old pins
  const pins = await rest('GET', `/channels/${ch}/pins`).catch(() => []);
  for (const p of pins) { await rest('DELETE', `/channels/${ch}/messages/${p.id}`).catch(() => {}); }

  // multipart post: embed + hero image attachment
  const form = new FormData();
  form.append('payload_json', JSON.stringify({
    embeds: [spec.embed],
    attachments: [{ id: 0, filename: spec.file }],
  }));
  const buf = readFileSync(`art/${spec.file}`);
  form.append('files[0]', new Blob([buf], { type: 'image/png' }), spec.file);
  const res = await fetch(`${API}/channels/${ch}/messages`, { method: 'POST', headers: auth, body: form });
  if (!res.ok) { console.log(`  ! #${chName} post ${res.status} ${await res.text()}`); continue; }
  const msg = await res.json();
  await sleep(400);
  await rest('PUT', `/channels/${ch}/pins/${msg.id}`).catch(() => {});
  for (const e of spec.reactions) {
    await rest('PUT', `/channels/${ch}/messages/${msg.id}/reactions/${encodeURIComponent(e)}/@me`).catch(() => {});
  }
  console.log(`  + embed posted + pinned in #${chName} (${spec.reactions.length} reactions)`);
}
console.log('\nembed orientation complete.');
