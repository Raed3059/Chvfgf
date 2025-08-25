import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } from '@discordjs/voice';
import ytdl from 'ytdl-core';
import dotenv from 'dotenv';
dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN;
const VOICE_CHANNEL_ID = '1407816906270048378';
const GUILD_ID = '1404149751548612722';
const YOUTUBE_URL = 'https://youtu.be/3pRZhacxc-Q?si=hrEGGWaVuxOEPgDB';

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
    const stream = ytdl(YOUTUBE_URL, { filter: 'audioonly', highWaterMark: 1 << 25 });
    const resource = createAudioResource(stream);
    player.play(resource);

    player.on(AudioPlayerStatus.Idle, () => {
        playQuran(); // يعيد التشغيل بعد ما يخلص
    });
}

client.on('voiceStateUpdate', (oldState, newState) => {
    if (oldState.channelId === VOICE_CHANNEL_ID && newState.channelId !== VOICE_CHANNEL_ID && newState.member.user.id === client.user.id) {
        connectBot();
    }
});

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    connectBot();
});

client.login(TOKEN);