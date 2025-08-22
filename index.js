const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require("discord.js");
const { DisTube } = require("distube");
const { YtDlpPlugin } = require("@distube/yt-dlp");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});

const distube = new DisTube(client, {
  leaveOnEmpty: true,
  leaveOnFinish: true,
  emitNewSongOnly: true,
  plugins: [new YtDlpPlugin()]
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// /setmenu1
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  // أمر القائمة
  if (interaction.isChatInputCommand() && interaction.commandName === "setmenu1") {
    const embed = new EmbedBuilder()
      .setTitle("🎶 لوحة تحكم البوت")
      .setDescription("اختر من الأزرار بالأسفل للتحكم")
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("join").setLabel("🎧 دخول").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("leave").setLabel("❌ خروج").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("pause").setLabel("⏸️ إيقاف").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("resume").setLabel("▶️ تشغيل").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("skip").setLabel("⏭️ تخطي").setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  // الأزرار
  if (interaction.isButton()) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) return interaction.reply({ content: "⚠️ لازم تدخل روم صوتي أول", ephemeral: true });

    try {
      if (interaction.customId === "join") {
        return interaction.reply({ content: "✅ دخلت الروم الصوتي", ephemeral: true });
      }
      if (interaction.customId === "leave") {
        distube.voices.leave(interaction.guild);
        return interaction.reply({ content: "👋 طلعت من الروم", ephemeral: true });
      }
      if (interaction.customId === "pause") {
        distube.pause(interaction);
        return interaction.reply({ content: "⏸️ تم الإيقاف", ephemeral: true });
      }
      if (interaction.customId === "resume") {
        distube.resume(interaction);
        return interaction.reply({ content: "▶️ تم التشغيل", ephemeral: true });
      }
      if (interaction.customId === "skip") {
        distube.skip(interaction);
        return interaction.reply({ content: "⏭️ تخطيت الأغنية", ephemeral: true });
      }
    } catch (err) {
      console.error(err);
      interaction.reply({ content: "❌ صار خطأ", ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);