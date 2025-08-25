import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } from '@discordjs/voice';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN;
const VOICE_CHANNEL_ID = '1407816906270048378';
const GUILD_ID = '1404149751548612722';
const AUDIO_FILE = 'silence.mp3'; // حط مسار ملف القرآن

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

let connection;
let player;

async function connectBot() {
    const guild = await client.guilds.fetch(GUILD_ID);
    const channel = guild.channels.cache.get(VOICE_CHANNEL_ID);

    connection = joinVoiceChannel({
        channelId: VOICE_CHANNEL_ID,
        guildId: GUILD_ID,
        adapterCreator: guild.voiceAdapterCreator
    });

    player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Play
        }
    });

    connection.subscribe(player);

    playQuran();
}

function playQuran() {
    const resource = createAudioResource(fs.createReadStream(AUDIO_FILE));
    player.play(resource);

    player.on(AudioPlayerStatus.Idle, () => {
        // لما يخلص الملف يرجع يشغله تلقائي
        playQuran();
    });
}

client.on('voiceStateUpdate', (oldState, newState) => {
    // اذا تم سحب البوت او طرده من الروم
    if (oldState.channelId === VOICE_CHANNEL_ID && newState.channelId !== VOICE_CHANNEL_ID && newState.member.user.id === client.user.id) {
        // يرجع يربط نفسه تلقائي
        connectBot();
    }
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    connectBot();
});

client.login(TOKEN);