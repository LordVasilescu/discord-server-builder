// © 2026 Mathew. All rights reserved.
// Upload generated emoji PNGs to the guild. Idempotent: skips existing names.
import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOKEN = process.env.DISCORD_TOKEN;
const API = 'https://discord.com/api/v10';
const gid = process.env.GUILD_ID.trim();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const dir = join(dirname(fileURLToPath(import.meta.url)), 'emoji');

async function rest(method, path, body) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${API}${path}`, {
      method, headers: { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) { const d = await res.json().catch(() => ({})); await sleep((d.retry_after ?? 1) * 1000 + 250); continue; }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
    await sleep(400);
    return res.status === 204 ? null : res.json();
  }
}

const existing = await rest('GET', `/guilds/${gid}/emojis`);
const have = new Set(existing.map(e => e.name));
const files = readdirSync(dir).filter(f => f.endsWith('.png'));
for (const f of files) {
  const name = basename(f, '.png');
  if (have.has(name)) { console.log(`  = :${name}: exists`); continue; }
  const b64 = readFileSync(join(dir, f)).toString('base64');
  await rest('POST', `/guilds/${gid}/emojis`, { name, image: `data:image/png;base64,${b64}` });
  console.log(`  + :${name}:`);
}
console.log('\nemoji upload complete.');
