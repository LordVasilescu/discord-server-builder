// © 2026 Mathew. All rights reserved.
// Set the guild icon to art/server_icon.png. Reads token+GUILD_ID from .env.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
const TOKEN = process.env.DISCORD_TOKEN;
const gid = process.env.GUILD_ID.trim();
const API = 'https://discord.com/api/v10';

const buf = readFileSync('art/server_icon.png');
const dataUri = `data:image/png;base64,${buf.toString('base64')}`;

const res = await fetch(`${API}/guilds/${gid}`, {
  method: 'PATCH',
  headers: { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ icon: dataUri }),
});
if (!res.ok) { console.error(`! set icon -> ${res.status} ${await res.text()}`); process.exit(1); }
console.log('  + server icon updated (neon planet).');
