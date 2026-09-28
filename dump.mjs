// © 2026 Mathew. All rights reserved.
// Read-only: dump current live server state (roles, categories, channels, topics).
import 'dotenv/config';
const TOKEN = process.env.DISCORD_TOKEN;
const API = 'https://discord.com/api/v10';
const h = { Authorization: `Bot ${TOKEN}` };

async function get(path) {
  const r = await fetch(`${API}${path}`, { headers: h });
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${await r.text()}`);
  return r.json();
}

const gid = process.env.GUILD_ID?.trim() || (await get('/users/@me/guilds'))[0].id;
const guild = await get(`/guilds/${gid}`);
console.log(`GUILD: ${guild.name} (${gid})\n`);

const roles = await get(`/guilds/${gid}/roles`);
console.log('ROLES (high→low by position):');
roles.sort((a, b) => b.position - a.position).forEach(r => {
  if (r.name === '@everyone') return;
  console.log(`  [${r.position}] ${r.name}  #${r.color.toString(16).padStart(6,'0')}  hoist=${r.hoist}`);
});

const chans = await get(`/guilds/${gid}/channels`);
const cats = chans.filter(c => c.type === 4).sort((a,b)=>a.position-b.position);
console.log('\nCHANNELS:');
for (const cat of cats) {
  console.log(`\n▣ ${cat.name}`);
  chans.filter(c => c.parent_id === cat.id).sort((a,b)=>a.position-b.position).forEach(c => {
    const kind = c.type === 2 ? 'VC ' : c.type === 0 ? 'TXT' : `t${c.type}`;
    console.log(`   ${kind} #${c.name}${c.nsfw?' [nsfw]':''}\n        topic: ${c.topic || '(none)'}`);
  });
}
const orphans = chans.filter(c => c.type !== 4 && !c.parent_id);
if (orphans.length) { console.log('\n▣ (no category)'); orphans.forEach(c=>console.log(`   #${c.name}`)); }
console.log(`\nicon: ${guild.icon ? 'SET' : 'NOT SET'}`);
