const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require('discord.js')

function newProjectModal() {
    const modal = new ModalBuilder()
        .setCustomId('modal_new_project')
        .setTitle('🚀 Nuovo progetto')

    const name = new TextInputBuilder()
        .setCustomId('field_name')
        .setLabel('Nome del progetto')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('es. LabFlow')
        .setRequired(true)
        .setMaxLength(80)

    const problem = new TextInputBuilder()
        .setCustomId('field_problem')
        .setLabel('Problema che risolve')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('es. Digitalizza le SOPs per laboratori clinici...')
        .setRequired(true)
        .setMaxLength(300)

    const stack = new TextInputBuilder()
        .setCustomId('field_stack')
        .setLabel('Stack tecnologico')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('es. React, Supabase, Vercel')
        .setRequired(true)
        .setMaxLength(100)

    const stage = new TextInputBuilder()
        .setCustomId('field_stage')
        .setLabel('Stage attuale (Idea / MVP / Beta / Live)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('MVP')
        .setRequired(true)
        .setMaxLength(10)

    const link = new TextInputBuilder()
        .setCustomId('field_link')
        .setLabel('Link presentazione Google Slides')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://docs.google.com/presentation/...')
        .setRequired(false)
        .setMaxLength(200)

    modal.addComponents(
        new ActionRowBuilder().addComponents(name),
        new ActionRowBuilder().addComponents(problem),
        new ActionRowBuilder().addComponents(stack),
        new ActionRowBuilder().addComponents(stage),
        new ActionRowBuilder().addComponents(link),
    )

    return modal
}

function commentModal(tag, projectId, projectName) {
    const labels = {
        idea: { title: '💡 Aggiungi un\'idea', placeholder: 'La tua idea...' },
        bug: { title: '🐛 Segnala un bug', placeholder: 'Descrivi il bug...' },
        opinione: { title: '💬 Lascia un\'opinione', placeholder: 'La tua opinione...' },
    }

    const { title, placeholder } = labels[tag]

    const modal = new ModalBuilder()
        .setCustomId(`modal_comment_${tag}_${projectId}`)
        .setTitle(`${title} — ${projectName.slice(0, 30)}`)

    const content = new TextInputBuilder()
        .setCustomId('field_content')
        .setLabel('Il tuo messaggio')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(placeholder)
        .setRequired(true)
        .setMaxLength(500)

    modal.addComponents(new ActionRowBuilder().addComponents(content))

    return modal
}

module.exports = { newProjectModal, commentModal }
