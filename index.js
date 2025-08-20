import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  REST,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType
} from "discord.js";

import { DisTube } from "distube";
import { joinVoiceChannel } from "@discordjs/voice";

// ====== متغيرات من Railway ======
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ====== تشغيل العميل ======
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ====== مكتبة DisTube ======
const distube = new DisTube(client, {
  searchSongs: 5,
  emitNewSongOnly: true,
  leaveOnEmpty: true,
  leaveOnStop: true
});

// ====== تسجيل أمر السلاش ======
const commands = [
  new SlashCommandBuilder()
    .setName("setmenu1")
    .setDescription("إرسال لوحة تحكم البوت")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("🔄 جاري تسجيل أوامر السلاش...");
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands
    });
    console.log("✅ تم تسجيل الأوامر بنجاح");
  } catch (err) {
    console.error(err);
  }
})();

client.once("ready", () => {
  console.log(`✅ ${client.user.tag} شغال!`);
});

// ====== أمر /setmenu1 ======
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "setmenu1") {
    const embed = new EmbedBuilder()
      .setTitle("🎶 لوحة تحكم الموسيقى")
      .setDescription("تحكم في تشغيل الأغاني والفيديوهات من هنا")
      .setColor("Blue");

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("join")
        .setLabel("🎙️ دخول البوت")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("search")
        .setLabel("🔎 بحث يوتيوب")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setLabel("رائد المطيري 👑")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.com/users/1079022798523093032"),

      new ButtonBuilder()
        .setCustomId("leave")
        .setLabel("🚪 خروج")
        .setStyle(ButtonStyle.Danger)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("volDown").setLabel("🔉").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("prev").setLabel("⏮️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("playpause").setLabel("⏯️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("stop").setLabel("⏹️").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("next").setLabel("⏭️").setStyle(ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("volUp").setLabel("🔊").setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row1, row2, row3]
    });
  }
});

// ====== التعامل مع الأزرار ======
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  const vc = interaction.member.voice.channel;
  if (!vc && interaction.customId !== "dev") {
    return interaction.reply({
      content: "🎙️ لازم تكون في روم صوتي أول",
      ephemeral: true
    });
  }

  switch (interaction.customId) {
    case "join":
      joinVoiceChannel({
        channelId: vc.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator
      });
      interaction.reply({
        content: `✅ دخلت روم: ${vc.name}`,
        ephemeral: true
      });
      break;

    case "search":
      const modal = new ModalBuilder()
        .setCustomId("searchModal")
        .setTitle("🔎 بحث يوتيوب");
      const input = new TextInputBuilder()
        .setCustomId("song")
        .setLabel("اكتب اسم أو رابط الأغنية")
        .setStyle(TextInputStyle.Short);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
      break;

    case "volDown":
      distube.setVolume(vc, 50);
      interaction.reply({ content: "🔉 قللت الصوت", ephemeral: true });
      break;

    case "volUp":
      distube.setVolume(vc, 100);
      interaction.reply({ content: "🔊 رفعت الصوت", ephemeral: true });
      break;

    case "playpause":
      const queue = distube.getQueue(vc);
      if (!queue)
        return interaction.reply({ content: "❌ ما في شي شغال", ephemeral: true });
      if (queue.paused) {
        queue.resume();
        interaction.reply({ content: "▶️ تشغيل", ephemeral: true });
      } else {
        queue.pause();
        interaction.reply({ content: "⏸️ إيقاف مؤقت", ephemeral: true });
      }
      break;

    case "stop":
      distube.stop(vc);
      interaction.reply({ content: "⏹️ أوقفت التشغيل", ephemeral: true });
      break;

    case "next":
      distube.skip(vc);
      interaction.reply({ content: "⏭️ تخطيت للأغنية التالية", ephemeral: true });
      break;

    case "prev":
      distube.previous(vc);
      interaction.reply({ content: "⏮️ رجعت للأغنية السابقة", ephemeral: true });
      break;

    case "leave":
      distube.voices.get(vc)?.leave();
      interaction.reply({ content: "🚪 خرجت من الروم", ephemeral: true });
      break;
  }
});

// ====== المودال للبحث ======
client.on("interactionCreate", async interaction => {
  if (interaction.type !== InteractionType.ModalSubmit) return;
  if (interaction.customId === "searchModal") {
    const query = interaction.fields.getTextInputValue("song");
    const vc = interaction.member.voice.channel;
    if (!vc)
      return interaction.reply({
        content: "🎙️ لازم تكون في روم",
        ephemeral: true
      });

    await distube.play(vc, query, {
      member: interaction.member,
      textChannel: interaction.channel
    });
    await interaction.reply({
      content: `🔎 شغلت: ${query}`,
      ephemeral: true
    });
  }
});

client.login(TOKEN);