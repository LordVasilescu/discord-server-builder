// © 2026 Mathew. All rights reserved.
// ORGO — simple info board. What it is + use the Architect's referral code on signup.
import 'dotenv/config';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const TOKEN = process.env.DISCORD_TOKEN;
const gid = process.env.GUILD_ID?.trim();
// Put your real Orgo referral / promo code here (or ORGO_REFERRAL_CODE in .env)
const REFERRAL = (process.env.ORGO_REFERRAL_CODE || 'GRILLONIA').trim();
const SIGNUP = 'https://www.orgo.ai/start';
const DOCS = 'https://docs.orgo.ai';

const API = 'https://discord.com/api/v10';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ROOT = dirname(fileURLToPath(import.meta.url));

if (!TOKEN || !gid) {
  console.error('Missing DISCORD_TOKEN or GUILD_ID');
  process.exit(1);
}

async function rest(method, path, body) {
  for (let i = 0; i < 12; i++) {
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
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
    await sleep(280);
    return res.status === 204 ? null : res.json();
  }
  throw new Error(`${method} ${path} failed`);
}

console.log('ORGO board — simple\n');

const chans = await rest('GET', `/guilds/${gid}/channels`);
const main = chans.find((c) => c.name === 'MAIN SECTOR' && c.type === 4);
if (!main) {
  console.error('MAIN SECTOR not found');
  process.exit(1);
}

let ch = chans.find((c) => c.name === 'orgo-gate' && c.type === 0);
const topic = `ORGO // cloud computers for AI agents. Sign up at orgo.ai — use referral code ${REFERRAL}`;

if (ch) {
  ch = await rest('PATCH', `/channels/${ch.id}`, {
    name: 'orgo',
    parent_id: main.id,
    topic,
  });
  console.log(`~ #orgo ${ch.id}`);
} else {
  // also accept already-renamed #orgo
  ch = chans.find((c) => c.name === 'orgo' && c.type === 0);
  if (ch) {
    ch = await rest('PATCH', `/channels/${ch.id}`, { parent_id: main.id, topic });
    console.log(`~ #orgo ${ch.id}`);
  } else {
    ch = await rest('POST', `/guilds/${gid}/channels`, {
      name: 'orgo',
      type: 0,
      parent_id: main.id,
      topic,
    });
    console.log(`+ #orgo ${ch.id}`);
  }
}

// unpin all
try {
  const pins = await rest('GET', `/channels/${ch.id}/pins`);
  for (const p of pins || []) {
    await rest('DELETE', `/channels/${ch.id}/pins/${p.id}`);
    console.log(`  unpinned ${p.id}`);
  }
} catch (e) {
  console.warn('pins:', e.message);
}

// wipe recent messages so only the simple board remains
let deleted = 0;
for (let pass = 0; pass < 10; pass++) {
  const msgs = await rest('GET', `/channels/${ch.id}/messages?limit=100`);
  if (!msgs?.length) break;
  const bulk = msgs.map((m) => m.id);
  if (bulk.length >= 2) {
    await rest('POST', `/channels/${ch.id}/messages/bulk-delete`, { messages: bulk });
    deleted += bulk.length;
  } else {
    await rest('DELETE', `/channels/${ch.id}/messages/${bulk[0]}`);
    deleted++;
  }
  if (msgs.length < 100) break;
}
console.log(`cleared ${deleted} messages`);

const board = await rest('POST', `/channels/${ch.id}/messages`, {
  embeds: [
    {
      title: 'ORGO',
      description: [
        '**Cloud computers for AI agents.**',
        '',
        'Orgo gives you a real Linux desktop in the cloud that an AI can drive — browser, mouse, keyboard, terminal. Spin one up in seconds and leave agents running 24/7.',
        '',
        '**Sign up here:**',
        SIGNUP,
        '',
        `**Use this referral code when you sign up:**`,
        `\`\`\`${REFERRAL}\`\`\``,
      ].join('\n'),
      color: 0x00ff9c,
      footer: { text: 'GRILLONIA PRIME · orgo.ai' },
    },
  ],
  components: [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 5,
          label: 'Sign up on Orgo',
          url: SIGNUP,
        },
        {
          type: 2,
          style: 5,
          label: 'Docs',
          url: DOCS,
        },
      ],
    },
  ],
});

await rest('PUT', `/channels/${ch.id}/pins/${board.id}`);
console.log(`pinned board ${board.id}`);

writeFileSync(
  join(ROOT, 'orgo_gate_meta.json'),
  JSON.stringify(
    {
      guild_id: gid,
      channel_id: ch.id,
      board_message_id: board.id,
      referral_code: REFERRAL,
      updated_at: new Date().toISOString(),
    },
    null,
    2,
  ),
);

console.log(`\ndone — referral code shown: ${REFERRAL}`);
console.log('Change it: set ORGO_REFERRAL_CODE in .env and re-run this script.');
