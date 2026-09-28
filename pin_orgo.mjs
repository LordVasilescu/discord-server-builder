// © 2026 Mathew. All rights reserved.
// Pin professional Orgo branding on #orgo — official logo loop + simple signup board.
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const TOKEN = process.env.DISCORD_TOKEN;
const gid = process.env.GUILD_ID?.trim();
const REFERRAL = (process.env.ORGO_REFERRAL_CODE || 'GRILLONIA').trim();
const SIGNUP = 'https://www.orgo.ai/start';
const DOCS = 'https://docs.orgo.ai';
const API = 'https://discord.com/api/v10';
const ROOT = dirname(fileURLToPath(import.meta.url));
const ART = join(ROOT, 'art');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rest(method, path, body, rawHeaders) {
  for (let i = 0; i < 12; i++) {
    const headers = {
      Authorization: `Bot ${TOKEN}`,
      ...(rawHeaders || { 'Content-Type': 'application/json' }),
    };
    const res = await fetch(`${API}${path}`, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : Buffer.isBuffer(body)
            ? body
            : JSON.stringify(body),
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

function multipart(fields, files) {
  const boundary = `----Orgo${Date.now()}`;
  const chunks = [];
  for (const [name, value] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\nContent-Type: application/json\r\n\r\n${value}\r\n`,
      ),
    );
  }
  files.forEach((f, i) => {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="files[${i}]"; filename="${f.name}"\r\nContent-Type: ${f.type}\r\n\r\n`,
      ),
    );
    chunks.push(f.buf);
    chunks.push(Buffer.from('\r\n'));
  });
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

const chans = await rest('GET', `/guilds/${gid}/channels`);
const ch = chans.find((c) => (c.name === 'orgo' || c.name === 'orgo-gate') && c.type === 0);
if (!ch) {
  console.error('#orgo not found — run setup_orgo.mjs first');
  process.exit(1);
}
console.log(`channel #${ch.name} ${ch.id}`);

// clear pins + messages
try {
  const pins = await rest('GET', `/channels/${ch.id}/pins`);
  for (const p of pins || []) {
    await rest('DELETE', `/channels/${ch.id}/pins/${p.id}`);
    try {
      await rest('DELETE', `/channels/${ch.id}/messages/${p.id}`);
    } catch {
      /* ignore */
    }
  }
} catch (e) {
  console.warn('pins', e.message);
}

for (let pass = 0; pass < 10; pass++) {
  const msgs = await rest('GET', `/channels/${ch.id}/messages?limit=100`);
  if (!msgs?.length) break;
  const ids = msgs.map((m) => m.id);
  if (ids.length >= 2) await rest('POST', `/channels/${ch.id}/messages/bulk-delete`, { messages: ids });
  else await rest('DELETE', `/channels/${ch.id}/messages/${ids[0]}`);
  if (msgs.length < 100) break;
}

const gif = readFileSync(join(ART, 'orgo_logo.gif'));
const mp4 = readFileSync(join(ART, 'orgo_logo_spin.mp4'));
const banner = readFileSync(join(ART, 'orgo_banner.png'));
const mark = readFileSync(join(ART, 'orgo_logo_mark.png'));

// 1) Animated logo pin (warlord-style primary visual)
const loopPayload = JSON.stringify({
  content: [
    '**orgo**',
    'Cloud computers for AI agents.',
    '',
    `_Official mark · seamless loop_`,
  ].join('\n'),
});
const loopMp = multipart(
  { payload_json: loopPayload },
  [
    { name: 'orgo_logo.gif', type: 'image/gif', buf: gif },
    { name: 'orgo_logo_spin.mp4', type: 'video/mp4', buf: mp4 },
  ],
);
const loopMsg = await rest('POST', `/channels/${ch.id}/messages`, loopMp.body, {
  'Content-Type': loopMp.contentType,
});
console.log('loop msg', loopMsg.id);
await rest('PUT', `/channels/${ch.id}/pins/${loopMsg.id}`);
console.log('pinned loop');

// 2) Info board + banner + logo thumbnail
const boardPayload = JSON.stringify({
  embeds: [
    {
      author: { name: 'orgo.ai', icon_url: 'attachment://orgo_logo_mark.png' },
      title: 'What is Orgo?',
      description: [
        '**Cloud computers for AI agents.**',
        '',
        'Orgo gives you a full Linux desktop in the cloud that an AI can drive — browser, mouse, keyboard, terminal. Launch in seconds. Leave agents running 24/7.',
        '',
        '**Sign up:** https://www.orgo.ai/start',
        '',
        `**Use this referral code when you sign up:**`,
        `\`\`\`${REFERRAL}\`\`\``,
      ].join('\n'),
      color: 0x111111,
      image: { url: 'attachment://orgo_banner.png' },
      thumbnail: { url: 'attachment://orgo_logo_mark.png' },
      footer: { text: 'orgo.ai · referred from Grillonia Prime' },
    },
  ],
  components: [
    {
      type: 1,
      components: [
        { type: 2, style: 5, label: 'Sign up on Orgo', url: SIGNUP },
        { type: 2, style: 5, label: 'Docs', url: DOCS },
      ],
    },
  ],
});
const boardMp = multipart(
  { payload_json: boardPayload },
  [
    { name: 'orgo_banner.png', type: 'image/png', buf: banner },
    { name: 'orgo_logo_mark.png', type: 'image/png', buf: mark },
  ],
);
const boardMsg = await rest('POST', `/channels/${ch.id}/messages`, boardMp.body, {
  'Content-Type': boardMp.contentType,
});
console.log('board msg', boardMsg.id);
await rest('PUT', `/channels/${ch.id}/pins/${boardMsg.id}`);
console.log('pinned board');

writeFileSync(
  join(ROOT, 'orgo_gate_meta.json'),
  JSON.stringify(
    {
      guild_id: gid,
      channel_id: ch.id,
      loop_message_id: loopMsg.id,
      board_message_id: boardMsg.id,
      referral_code: REFERRAL,
      updated_at: new Date().toISOString(),
    },
    null,
    2,
  ),
);

console.log('DONE — professional Orgo branding live on #orgo');
