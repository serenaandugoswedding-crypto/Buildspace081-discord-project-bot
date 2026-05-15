require('dotenv').config()

const { REST, Routes, SlashCommandBuilder } = require('discord.js')

const commands = [
    new SlashCommandBuilder()
        .setName('setup-board')
        .setDescription('📌 Posta il messaggio board nel canale corrente (solo admin)')
        .toJSON(),

    new SlashCommandBuilder()
        .setName('progetti')
        .setDescription('📋 Mostra tutti i progetti')
        .toJSON(),
]

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN)

    ; (async () => {
        try {
            console.log('Registering slash commands...')
            await rest.put(
                Routes.applicationGuildCommands(
                    process.env.DISCORD_CLIENT_ID,
                    process.env.GUILD_ID
                ),
                { body: commands }
            )
            console.log('✅ Comandi registrati!')
        } catch (err) {
            console.error('❌ Errore registrazione:', err)
        }
    })()
