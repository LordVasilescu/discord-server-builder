// © 2026 Mathew. All rights reserved.
// Lily Prime — GRILLONIA PRIME gateway bot
// HOLO-DECK movie night (/movie, /willis) via TMDB
// Run: node bot.mjs
import 'dotenv/config';
import {
  Client, GatewayIntentBits, SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID?.trim();
const TMDB = process.env.TMDB_API_KEY?.trim();
const REGION = (process.env.WATCH_REGION || 'US').trim();

const IMG = 'https://image.tmdb.org/t/p';
const NEON = { cyan: 0x05d9e8, pink: 0xff2a6d, purple: 0xb026ff };
const BRUCE_WILLIS_ID = 62;

// ---- TMDB helpers --------------------------------------------------------
async function tmdb(path, params = {}) {
  if (!TMDB) throw new Error('NO_TMDB_KEY');
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set('api_key', TMDB);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status} ${await res.text()}`);
  return res.json();
}

async function searchMovie(title) {
  const data = await tmdb('/search/movie', { query: title, include_adult: 'false' });
  return data.results?.[0] ?? null;
}

async function movieDetails(id) {
  return tmdb(`/movie/${id}`, {});
}

async function watchProviders(id) {
  const data = await tmdb(`/movie/${id}/watch/providers`, {});
  const r = data.results?.[REGION];
  if (!r) return { free: [], sub: [], rentBuy: [], link: null };
  const names = (arr) => (arr ?? []).map((p) => p.provider_name);
  const free = [...new Set([...names(r.free), ...names(r.ads)])];
  const sub = names(r.flatrate);
  const rentBuy = [...new Set([...names(r.rent), ...names(r.buy)])];
  return { free, sub, rentBuy, link: r.link ?? null };
}

function fmtRuntime(min) {
  if (!min) return '—';
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

async function buildMovieEmbed(movie, { accent = NEON.cyan, header = '🎬  NOW SHOWING' } = {}) {
  const d = await movieDetails(movie.id);
  let wp = { free: [], sub: [], rentBuy: [], link: null };
  try { wp = await watchProviders(movie.id); } catch {}

  const year = (d.release_date || '').slice(0, 4) || '—';
  const genres = d.genres?.map((g) => g.name).slice(0, 3).join(' · ') || '—';
  const rating = d.vote_average ? `⭐ ${d.vote_average.toFixed(1)}` : '—';

  const lines = [];
  if (wp.free.length) lines.push(`🟢 **Free (ads):** ${wp.free.slice(0, 4).join(', ')}`);
  if (wp.sub.length) lines.push(`📺 **Ad-free (sub):** ${wp.sub.slice(0, 4).join(', ')}`);
  if (wp.rentBuy.length) lines.push(`💲 **Rent/Buy:** ${wp.rentBuy.slice(0, 4).join(', ')}`);
  if (!lines.length) lines.push(`❔ no ${REGION} streaming listed — screen-share it in **HOLO-DECK**`);
  if (wp.link) lines.push(`[full options ↗](${wp.link})`);
  const watch = lines.join('\n');

  const e = new EmbedBuilder()
    .setColor(accent)
    .setAuthor({ name: header })
    .setTitle(`${d.title}  (${year})`)
    .setDescription(d.overview?.slice(0, 600) || '_no synopsis on file_')
    .addFields(
      { name: 'runtime', value: fmtRuntime(d.runtime), inline: true },
      { name: 'rating', value: rating, inline: true },
      { name: 'genre', value: genres, inline: true },
      { name: 'where to watch', value: watch, inline: false },
    )
    .setFooter({ text: 'GRILLONIA PRIME · HOLO-DECK' });
  if (d.poster_path) e.setThumbnail(`${IMG}/w500${d.poster_path}`);
  if (d.backdrop_path) e.setImage(`${IMG}/w780${d.backdrop_path}`);
  return e;
}

async function randomWillisMovie() {
  const credits = await tmdb(`/person/${BRUCE_WILLIS_ID}/movie_credits`, {});
  const pool = (credits.cast ?? [])
    .filter((m) => m.poster_path && m.release_date && m.vote_count > 50)
    .filter((m) => !/documentary/i.test(m.character || ''));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---- commands ------------------------------------------------------------
const commands = [
  new SlashCommandBuilder()
    .setName('movie')
    .setDescription('Look up a movie — poster, info, and where to watch it free')
    .addStringOption((o) => o.setName('title').setDescription('movie title').setRequired(true)),
  new SlashCommandBuilder()
    .setName('willis')
    .setDescription('Summon a random Bruce Willis movie for the channel'),
].map((c) => c.toJSON());

// ---- client --------------------------------------------------------------
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', async () => {
  console.log(`+ logged in as ${client.user.tag}`);
  await client.application.commands.set(commands, GUILD_ID);
  console.log(`+ registered ${commands.length} guild commands in ${GUILD_ID}`);
  if (!TMDB) console.log('! WARNING: TMDB_API_KEY not set — /movie and /willis need it');
});

client.on('interactionCreate', async (i) => {
  if (!i.isChatInputCommand()) return;
  try {
    if (!TMDB) {
      await i.reply({
        content: '🎬 movie lookups need a TMDB API key. ask the architect to set `TMDB_API_KEY` in .env.',
        ephemeral: true,
      });
      return;
    }
    if (i.commandName === 'movie') {
      await i.deferReply();
      const title = i.options.getString('title');
      const hit = await searchMovie(title);
      if (!hit) { await i.editReply(`❔ no match for **${title}**.`); return; }
      const embed = await buildMovieEmbed(hit, { accent: NEON.cyan, header: '🎬  NOW SHOWING' });
      await i.editReply({ embeds: [embed] });
    } else if (i.commandName === 'willis') {
      await i.deferReply();
      const pick = await randomWillisMovie();
      if (!pick) { await i.editReply('❔ the Willis archive is offline.'); return; }
      const embed = await buildMovieEmbed(pick, { accent: NEON.pink, header: '💥  YIPPEE-KI-YAY · BRUCE WILLIS' });
      await i.editReply({ embeds: [embed] });
    }
  } catch (err) {
    console.error(err);
    const msg = err.message === 'NO_TMDB_KEY'
      ? '🎬 TMDB key missing.'
      : '⚠️ the holo-deck glitched. try again.';
    if (i.deferred || i.replied) await i.editReply(msg).catch(() => {});
    else await i.reply({ content: msg, ephemeral: true }).catch(() => {});
  }
});

client.login(TOKEN);
