// © 2026 Mathew. All rights reserved.
// Read-only: dump pinned messages in the orientation channels.
import 'dotenv/config';
const TOKEN = process.env.DISCORD_TOKEN;
const API = 'https://discord.com/api/v10';
const h = { Authorization: `Bot ${TOKEN}` };
const get = async (p) => { const r = await fetch(`${API}${p}`, { headers: h }); if (!r.ok) throw new Error(`${p} -> ${r.status}`); return r.json(); };

const gid = process.env.GUILD_ID.trim();
const chans = await get(`/guilds/${gid}/channels`);
const targets = ['boot-sequence', 'the-code', 'augments'];
for (const name of targets) {
  const ch = chans.find(c => c.name === name);
  if (!ch) { console.log(`\n#${name}: NOT FOUND`); continue; }
  const pins = await get(`/channels/${ch.id}/pins`);
  console.log(`\n========== #${name} (${pins.length} pinned) ==========`);
  for (const m of pins) {
    console.log(m.content || '(no text / embed only)');
    if (m.reactions) console.log('  reactions:', m.reactions.map(r => `${r.emoji.name}×${r.count}`).join(' '));
  }
}
