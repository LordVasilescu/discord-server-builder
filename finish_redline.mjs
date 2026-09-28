// © 2026 Mathew. All rights reserved.
import dotenv from "dotenv";
dotenv.config();
const TOKEN = process.env.DISCORD_TOKEN;
const gid = process.env.GUILD_ID.trim();
const API = "https://discord.com/api/v10";
const CH = process.env.REDLINE_CHANNEL_ID?.trim(); // redline-radio
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rest(method, path, body) {
  console.log(">", method, path);
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: "Bot " + TOKEN, "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  console.log("<", res.status, text.slice(0, 200));
  if (res.status === 429) {
    const d = JSON.parse(text);
    await sleep((d.retry_after || 1) * 1000 + 500);
    return rest(method, path, body);
  }
  if (!res.ok) throw new Error(res.status + " " + text);
  await sleep(400);
  return text ? JSON.parse(text) : null;
}

await rest("PATCH", "/channels/" + CH, {
  topic: "REDLINE RADIO // Iron Talon requests. Join a voice channel. /play or /p",
});
console.log("topic ok");

const msg = await rest("POST", "/channels/" + CH + "/messages", {
  embeds: [{
    title: "REDLINE RADIO",
    description: [
      "**Iron Talon request line.**",
      "Drop songs here. He plays them in voice.",
      "",
      "**1.** Join **AFTERLIFE-BAR** or **PLAZA**",
      "**2.** Type `/play` or `/p` + link or search",
      "YouTube and Spotify work.",
      "",
      "**Controls**",
      "`/skip` `/queue` `/np` `/pause` `/resume`",
      "`/volume` `/shuffle` `/stop`",
      "",
      "Playlists shuffle by default.",
    ].join("\n"),
    color: 0xff2a00,
    footer: { text: "GRILLONIA PRIME // REDLINE RADIO" },
  }],
});
console.log("message", msg.id);
await rest("PUT", "/channels/" + CH + "/pins/" + msg.id);
console.log("PINNED OK");
