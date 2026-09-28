// © 2026 Mathew. All rights reserved.
import 'dotenv/config';
import { readFileSync } from 'fs';

const T = process.env.DISCORD_TOKEN;
const g = process.env.GUILD_ID.trim();
const API = 'https://discord.com/api/v10';
const h = { Authorization: `Bot ${T}`, 'Content-Type': 'application/json' };

const buf = readFileSync('art/bloodsplat.gif');
const dataUri = `data:image/gif;base64,${buf.toString('base64')}`;
console.log('gif bytes', buf.length);

let emojis = await (
  await fetch(`${API}/guilds/${g}/emojis`, { headers: { Authorization: `Bot ${T}` } })
).json();
for (const name of ['bloodsplat', 'killsplat']) {
  const old = emojis.find((e) => e.name === name);
  if (old) {
    await fetch(`${API}/guilds/${g}/emojis/${old.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bot ${T}` },
    });
    console.log('deleted', name);
  }
}

const up = await fetch(`${API}/guilds/${g}/emojis`, {
  method: 'POST',
  headers: h,
  body: JSON.stringify({ name: 'bloodsplat', image: dataUri }),
});
const ut = await up.text();
console.log('upload', up.status, ut.slice(0, 200));
if (!up.ok) process.exit(1);
const emoji = JSON.parse(ut);
console.log('emoji', emoji.id, 'animated', emoji.animated);

const chans = await (
  await fetch(`${API}/guilds/${g}/channels`, { headers: { Authorization: `Bot ${T}` } })
).json();
const ch = chans.find((c) => /killcam|warlord/i.test(c.name) && c.type === 0);
const cat = chans.find((c) => c.type === 4 && /KILL CAM/i.test(c.name));
console.log('channel', ch?.name, ch?.id);

const r = await fetch(`${API}/channels/${ch.id}`, {
  method: 'PATCH',
  headers: h,
  body: JSON.stringify({ icon_emoji: { id: emoji.id, name: 'bloodsplat' } }),
});
console.log('channel icon try', r.status, (await r.text()).slice(0, 220));

// Keep impact unicode on category (names can't host custom animated emojis)
if (cat) {
  const cr = await fetch(`${API}/channels/${cat.id}`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({ name: '💥 KILL CAM' }),
  });
  console.log('cat', cr.status);
}

// Put animated splat on pin message in channel
const msg = await fetch(`${API}/channels/${ch.id}/messages`, {
  method: 'POST',
  headers: h,
  body: JSON.stringify({
    content:
      `<a:bloodsplat:${emoji.id}> **KILL CAM** <a:bloodsplat:${emoji.id}>\n` +
      `Animated bloodsplat is live as server emoji \`:bloodsplat:\``,
  }),
});
console.log('msg', msg.status, (await msg.text()).slice(0, 100));
console.log('DONE');
