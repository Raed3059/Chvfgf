import {
  Client,
  GatewayIntentBits,
  Partials,
  Events
} from "discord.js";

import { spawn } from "child_process";
import { config } from "dotenv";

config();
const TOKEN = process.env.DISCORD_TOKEN;

// إعداد الـ Intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// إعداد الروم الصوتي والملف الصامت
const VOICE_CHANNEL_ID = "1311282768847704064"; // ← غيره حسب الروم
const SILENT_AUDIO_FILE = "./silence.mp3";     // ← لازم يكون موجود بنفس المجلد

// خريطة لتخزين voice connections
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from "@discordjs/voice";

const players = new Map();

// دالة تشغيل ملف صامت
function playSilent(connection) {
  try {
    const resource = createAudioResource(SILENT_AUDIO_FILE);
    const player = createAudioPlayer();
    player.play(resource);
    connection.subscribe(player);

    players.set(connection.joinConfig.guildId, player);
  } catch (e) {
    console.error("❌ Silent play error:", e);
  }
}

// جاهزية البوت
client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot ${client.user.tag} is ready!`);

  const channel = await client.channels.fetch(VOICE_CHANNEL_ID);
  if (channel?.isVoiceBased()) {
    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator
      });
      playSilent(connection);
      console.log("🎧 Joined voice channel and playing silent audio.");
    } catch (e) {
      console.error("❌ Error connecting to voice channel:", e);
    }
  }
});

// مراقبة خروج/سحب البوت
client.on(Events.VoiceStateUpdate, async (before, after) => {
  const me = client.user.id;
  if (before.id !== me && after.id !== me) return;

  const channel = await client.channels.fetch(VOICE_CHANNEL_ID);

  // إذا انقطع البوت
  if (before.channelId && !after.channelId) {
    console.log("⚠️ Bot disconnected. Reconnecting...");
    setTimeout(() => {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator
      });
      playSilent(connection);
      console.log("✅ Rejoined after being disconnected.");
    }, 1000);
  }

  // إذا انسحب لروم ثاني
  if (after.channelId && after.channelId !== VOICE_CHANNEL_ID) {
    console.log("⚠️ Bot moved. Returning...");
    setTimeout(() => {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator
      });
      playSilent(connection);
      console.log("✅ Returned to main channel.");
    }, 1000);
  }
});

// أوامر بسيطة (prefix 1)
client.on(Events.MessageCreate, async (msg) => {
  if (!msg.content.startsWith("1") || msg.author.bot) return;
  const args = msg.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (cmd === "join") {
    if (!msg.member.voice.channel) return msg.reply("❌ You are not in a voice channel.");
    const connection = joinVoiceChannel({
      channelId: msg.member.voice.channel.id,
      guildId: msg.guild.id,
      adapterCreator: msg.guild.voiceAdapterCreator
    });
    playSilent(connection);
    msg.reply("✅ Joined and playing silent audio.");
  }

  if (cmd === "leave") {
    const player = players.get(msg.guild.id);
    if (player) {
      player.stop();
      players.delete(msg.guild.id);
    }
    msg.guild.members.me.voice.disconnect();
    msg.reply("👋 Left the voice channel.");
  }

  if (cmd === "play") {
    const query = args.join(" ");
    if (!query) return msg.reply("❌ Provide a song name or URL.");

    if (!msg.member.voice.channel) return msg.reply("❌ You must be in a voice channel.");
    const connection = joinVoiceChannel({
      channelId: msg.member.voice.channel.id,
      guildId: msg.guild.id,
      adapterCreator: msg.guild.voiceAdapterCreator
    });

    // yt-dlp استخراج الرابط
    let url;
    try {
      const ytdlp = spawn("yt-dlp", ["-f", "bestaudio", "-g", query]);
      let data = "";
      ytdlp.stdout.on("data", (chunk) => (data += chunk));
      ytdlp.on("close", () => {
        url = data.trim();
        if (!url) return msg.reply("❌ Failed to get audio.");

        const resource = createAudioResource(url, {
          inputType: "arbitrary",
          inlineVolume: true
        });
        const player = createAudioPlayer();

        player.on(AudioPlayerStatus.Idle, () => playSilent(connection));
        player.play(resource);
        connection.subscribe(player);

        players.set(msg.guild.id, player);
        msg.reply(`🎶 Now playing: **${query}**`);
      });
    } catch (e) {
      msg.reply(`❌ Error: ${e}`);
    }
  }

  if (cmd === "pause") {
    const player = players.get(msg.guild.id);
    if (player) {
      player.pause();
      msg.reply("⏸️ Paused.");
    } else {
      msg.reply("❌ Nothing is playing.");
    }
  }

  if (cmd === "resume") {
    const player = players.get(msg.guild.id);
    if (player) {
      player.unpause();
      msg.reply("▶️ Resumed.");
    } else {
      msg.reply("❌ Nothing to resume.");
    }
  }

  if (cmd === "stop") {
    const player = players.get(msg.guild.id);
    if (player) {
      player.stop();
      const connection = joinVoiceChannel({
        channelId: msg.member.voice.channel.id,
        guildId: msg.guild.id,
        adapterCreator: msg.guild.voiceAdapterCreator
      });
      playSilent(connection);
      msg.reply("⏹️ Stopped. Resumed silent audio.");
    } else {
      msg.reply("❌ Nothing is playing.");
    }
  }
});

client.login(TOKEN);