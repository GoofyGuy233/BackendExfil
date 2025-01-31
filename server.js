require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
const PORT = 3000;

// Config
const PLAYFAB_TITLE_ID = process.env.PLAYFAB_TITLE_ID;
const PLAYFAB_SECRET_KEY = process.env.PLAYFAB_SECRET_KEY;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const LINK_CODES = {}; // Stores temporary link codes { code: playFabId }

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Generate a unique link code for a player
 */
app.post("/generate-link-code", (req, res) => {
    const { playFabId } = req.body;
    if (!playFabId) return res.status(400).json({ error: "Missing PlayFab ID" });

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    LINK_CODES[code] = playFabId; // Store code temporarily

    res.json({ code });
});

/**
 * Link Discord ID to PlayFab
 */
async function linkDiscordToPlayFab(discordUserId, playFabId) {
    try {
        const response = await axios.post(
            `https://${PLAYFAB_TITLE_ID}.playfabapi.com/Client/LinkCustomID`,
            { CustomId: discordUserId, ForceLink: true },
            { headers: { "X-SecretKey": PLAYFAB_SECRET_KEY, "Content-Type": "application/json" } }
        );
        console.log(`Linked ${discordUserId} to PlayFab ${playFabId}`);
        return response.data;
    } catch (error) {
        console.error("Error linking Discord:", error.response?.data || error.message);
        return null;
    }
}

/**
 * Discord Bot
 */
const bot = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

bot.once("ready", () => {
    console.log(`🤖 Bot is online as ${bot.user.tag}`);
});

bot.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    const args = message.content.split(" ");
    if (args[0] === "?linkaccount") {
        const code = args[1];
        if (!code) return message.reply("❌ Please provide a code: `?linkaccount <code>`");

        const playFabId = LINK_CODES[code];
        if (!playFabId) return message.reply("❌ Invalid or expired code.");

        delete LINK_CODES[code]; // Remove used code

        const result = await linkDiscordToPlayFab(message.author.id, playFabId);
        if (result) {
            message.reply(`✅ Successfully linked your account!`);
        } else {
            message.reply("❌ Failed to link your account.");
        }
    }
});

// Start bot
bot.login(DISCORD_BOT_TOKEN);

// Start server
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
