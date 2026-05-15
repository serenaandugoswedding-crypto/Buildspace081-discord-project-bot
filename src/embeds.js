const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')

const STAGE_EMOJI = {
    Idea: '🌱',
    MVP: '🟡',
    Beta: '🔵',
    Live: '🟢',
}

const TAG_EMOJI = {
    idea: '💡',
    bug: '🐛',
    opinione: '💬',
}

/**
 * Builds the main project embed + action row buttons
 */
function buildProjectEmbed(project, commentCounts = {}) {
    const total = (commentCounts.idea || 0) + (commentCounts.bug || 0) + (commentCounts.opinione || 0)
    const stage = STAGE_EMOJI[project.stage] || '❓'

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${stage} ${project.name}`)
        .setDescription(`> ${project.problem}`)
        .addFields(
            { name: '⚙️ Stack', value: project.stack, inline: true },
            { name: '📊 Stage', value: project.stage, inline: true },
        )
        .setFooter({ text: `by @${project.username}` })
        .setTimestamp(new Date(project.created_at))

    if (project.link) {
        embed.addFields({ name: '🔗 Link', value: project.link, inline: true })
    }

    if (total > 0) {
        const breakdown = [
            commentCounts.idea ? `💡 ${commentCounts.idea}` : null,
            commentCounts.bug ? `🐛 ${commentCounts.bug}` : null,
            commentCounts.opinione ? `💬 ${commentCounts.opinione}` : null,
        ].filter(Boolean).join('  ')
        embed.addFields({ name: `🗣️ ${total} commenti`, value: breakdown })
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`comment_idea_${project.id}`)
            .setLabel('💡 Idea')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`comment_bug_${project.id}`)
            .setLabel('🐛 Bug')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`comment_opinione_${project.id}`)
            .setLabel('💬 Opinione')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`view_comments_${project.id}`)
            .setLabel('🧵 Commenti')
            .setStyle(ButtonStyle.Secondary),
    )

    return { embed, row }
}

/**
 * Builds the pinned "board header" message
 */
function buildBoardEmbed() {
    const embed = new EmbedBuilder()
        .setColor(0x23272A)
        .setTitle('🏗️ Buildspace081 — Project Board')
        .setDescription(
            'Tutti i progetti della community.\n\n' +
            'Aggiungi il tuo progetto, lascia un\'idea, segnala un bug, condividi la tua opinione.'
        )

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('new_project')
            .setLabel('🚀 Nuovo progetto')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('list_projects')
            .setLabel('📋 Vedi tutti')
            .setStyle(ButtonStyle.Secondary),
    )

    return { embed, row }
}

module.exports = { buildProjectEmbed, buildBoardEmbed, TAG_EMOJI }
