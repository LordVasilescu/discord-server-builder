// © 2026 Mathew. All rights reserved.
// Strip decorations from categories+roles, go lean on text, add voice channels.
import 'dotenv/config';
import { ChannelType } from 'discord.js';
const TOKEN = process.env.DISCORD_TOKEN;
const API = 'https://discord.com/api/v10';
const gid = process.env.GUILD_ID.trim();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function rest(method, path, body) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${API}${path}`, {
      method, headers: { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) { const d = await res.json().catch(() => ({})); await sleep((d.retry_after ?? 1) * 1000 + 250); continue; }
    if (res.status >= 500) { await sleep(1000); continue; }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
    await sleep(300);
    return res.status === 204 ? null : res.json();
  }
}

// ---- 1. clean role names (strip ⟨ ⟩) ----------------------------------------
console.log('— roles —');
const roles = await rest('GET', `/guilds/${gid}/roles`);
for (const r of roles) {
  const m = r.name.match(/^⟨\s*(.+?)\s*⟩$/);
  if (!m) continue;
  await rest('PATCH', `/guilds/${gid}/roles/${r.id}`, { name: m[1] });
  console.log(`  ${r.name}  ->  ${m[1]}`);
}

// ---- 2. clean category names ------------------------------------------------
console.log('— categories —');
const chans = await rest('GET', `/guilds/${gid}/channels`);
const CAT_CLEAN = {
  '▓▓ ⟨ ORBITAL DOCK ⟩ ▓▓': 'ORBITAL DOCK',
  '░░ ⟨ sys://afterlife ⟩ ░░': 'AFTERLIFE',
  '▓▓ ⟨ COMBAT SECTOR ⟩ ▓▓': 'COMBAT',
  '░░ ⟨ /dev/forge ⟩ ░░': 'THE FORGE',
  '▓▓ ⟨ HOLO-DECK ⟩ ▓▓': 'HOLO-DECK',
  '░░ ⟨ //blackwall ⟩ ░░': 'BLACKWALL',
  '▓▓ ⟨ THE SPIRE ⟩ ▓▓': 'THE SPIRE',
};
const catId = {}; // clean name -> id
for (const c of chans.filter(x => x.type === 4)) {
  const clean = CAT_CLEAN[c.name];
  if (clean) { await rest('PATCH', `/channels/${c.id}`, { name: clean }); console.log(`  ${c.name}  ->  ${clean}`); catId[clean] = c.id; }
  else catId[c.name] = c.id;
}

// ---- 3. delete lean-out text channels ---------------------------------------
console.log('— delete text —');
const DELETE = ['broadcast', 'static', 'squad-up', 'dev-branch', 'repo', 'signal-feed', 'watch-log'];
for (const name of DELETE) {
  const c = chans.find(x => x.name === name && x.type === 0);
  if (!c) { console.log(`  ? #${name} not found`); continue; }
  await rest('DELETE', `/channels/${c.id}`);
  console.log(`  - #${name}`);
}

// ---- 4. add voice channels --------------------------------------------------
console.log('— add voice —');
const VOICE = [
  ['LANDING-PAD', 'ORBITAL DOCK'],
  ['ROOFTOP', 'AFTERLIFE'],
  ['FORGE-FLOOR', 'THE FORGE'],
];
for (const [name, cat] of VOICE) {
  if (chans.find(x => x.name === name)) { console.log(`  = ${name} exists`); continue; }
  await rest('POST', `/guilds/${gid}/channels`, { name, type: ChannelType.GuildVoice, parent_id: catId[cat] });
  console.log(`  + ${name} (VC) in ${cat}`);
}
console.log('\ncleanup complete.');
