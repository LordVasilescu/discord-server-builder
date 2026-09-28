// © 2026 Mathew. All rights reserved.
// Rename 3 categories + their channels to technical-codepath x Cyberpunk2077 names.
import 'dotenv/config';
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

// current name -> new name  (categories + channels)
const RENAMES = {
  // NEON DISTRICT  ->  sys://afterlife   (the social commons = Afterlife, the legendary bar)
  '░░ ⟨ NEON DISTRICT ⟩ ░░': '░░ ⟨ sys://afterlife ⟩ ░░',
  'the-street': 'the-strip',
  'NEON-LOUNGE': 'AFTERLIFE-BAR',
  // THE FOUNDRY  ->  /dev/forge   (dev / build / code directory)
  '░░ ⟨ THE FOUNDRY ⟩ ░░': '░░ ⟨ /dev/forge ⟩ ░░',
  'in-construction': 'dev-branch',
  'source': 'repo',
  // THE UNDERCITY  ->  //blackwall   (forbidden beyond-the-wall zone; nsfw)
  '░░ ⟨ THE UNDERCITY ⟩ ░░': '░░ ⟨ //blackwall ⟩ ░░',
  'after-hours': 'jig-jig',
};

const chans = await rest('GET', `/guilds/${gid}/channels`);
for (const [oldName, newName] of Object.entries(RENAMES)) {
  const c = chans.find(x => x.name === oldName);
  if (!c) { console.log(`  ? not found: ${oldName}`); continue; }
  await rest('PATCH', `/channels/${c.id}`, { name: newName });
  console.log(`  ${oldName}  ->  ${newName}`);
}
console.log('\nrename complete.');
