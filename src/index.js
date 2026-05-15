const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js')

const supabase = require('./db')
const { buildProjectEmbed, buildBoardEmbed, TAG_EMOJI } = require('./embeds')
const { newProjectModal, commentModal } = require('./modals')

// ─── Client ───────────────────────────────────────────────────────────────────

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ],
    partials: [Partials.Channel],
})

// ─── Ready ────────────────────────────────────────────────────────────────────

client.once('ready', () => {
    console.log(`✅ Bot online: ${client.user.tag}`)
})

// ─── Slash commands ───────────────────────────────────────────────────────────

client.on('interactionCreate', async (interaction) => {
    try {
        // SLASH: /setup-board
        if (interaction.isChatInputCommand() && interaction.commandName === 'setup-board') {
            return handleSetupBoard(interaction)
        }

        // SLASH: /progetti
        if (interaction.isChatInputCommand() && interaction.commandName === 'progetti') {
            return handleListProjects(interaction, { ephemeral: false })
        }

        // BUTTON
        if (interaction.isButton()) {
            return handleButton(interaction)
        }

        // MODAL SUBMIT
        if (interaction.isModalSubmit()) {
            return handleModalSubmit(interaction)
        }

    } catch (err) {
        console.error('Interaction error:', err)
        const msg = { content: '❌ Errore interno. Riprova.', ephemeral: true }
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(msg)
        } else {
            await interaction.reply(msg)
        }
    }
})

// ─── /setup-board ─────────────────────────────────────────────────────────────

async function handleSetupBoard(interaction) {
    await interaction.deferReply({ ephemeral: true })

    const { embed, row } = buildBoardEmbed()
    await interaction.channel.send({ embeds: [embed], components: [row] })

    await interaction.editReply({ content: '✅ Board creata!' })
}

// ─── BUTTON ROUTER ────────────────────────────────────────────────────────────

async function handleButton(interaction) {
    const id = interaction.customId

    if (id === 'new_project') {
        return interaction.showModal(newProjectModal())
    }

    if (id === 'list_projects') {
        return handleListProjects(interaction, { ephemeral: true })
    }

    if (id.startsWith('comment_')) {
        // comment_idea_<projectId>  |  comment_bug_<projectId>  |  comment_opinione_<projectId>
        const parts = id.split('_')
        const tag = parts[1]                    // idea | bug | opinione
        const projectId = parts.slice(2).join('_')    // uuid

        const { data: project } = await supabase
            .from('projects')
            .select('name')
            .eq('id', projectId)
            .single()

        if (!project) return interaction.reply({ content: '❌ Progetto non trovato.', ephemeral: true })

        return interaction.showModal(commentModal(tag, projectId, project.name))
    }

    if (id.startsWith('view_comments_')) {
        const projectId = id.replace('view_comments_', '')
        return handleViewComments(interaction, projectId)
    }

    if (id.startsWith('page_')) {
        // page_<offset>
        const offset = parseInt(id.replace('page_', ''), 10)
        return handleListProjects(interaction, { ephemeral: true, offset, update: true })
    }
}

// ─── MODAL SUBMIT ROUTER ──────────────────────────────────────────────────────

async function handleModalSubmit(interaction) {
    const id = interaction.customId

    if (id === 'modal_new_project') {
        return handleNewProject(interaction)
    }

    if (id.startsWith('modal_comment_')) {
        // modal_comment_<tag>_<projectId>
        const withoutPrefix = id.replace('modal_comment_', '')
        const tagEnd = withoutPrefix.indexOf('_')
        const tag = withoutPrefix.slice(0, tagEnd)
        const projectId = withoutPrefix.slice(tagEnd + 1)
        return handleNewComment(interaction, tag, projectId)
    }
}

// ─── NEW PROJECT ──────────────────────────────────────────────────────────────

async function handleNewProject(interaction) {
    await interaction.deferReply({ ephemeral: true })

    const rawStage = interaction.fields.getTextInputValue('field_stage').trim()
    const STAGES = ['Idea', 'MVP', 'Beta', 'Live']
    const stage = STAGES.find(s => s.toLowerCase() === rawStage.toLowerCase()) || 'Idea'

    const projectData = {
        discord_user_id: interaction.user.id,
        username: interaction.user.username,
        name: interaction.fields.getTextInputValue('field_name').trim(),
        problem: interaction.fields.getTextInputValue('field_problem').trim(),
        stack: interaction.fields.getTextInputValue('field_stack').trim(),
        stage,
        link: interaction.fields.getTextInputValue('field_link').trim() || null,
    }

    const { data: project, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single()

    if (error) {
        console.error('Insert error:', error)
        return interaction.editReply({ content: '❌ Errore salvataggio. Riprova.' })
    }

    // Post embed nel canale progetti
    const channel = await client.channels.fetch(process.env.PROJECTS_CHANNEL_ID)
    const { embed, row } = buildProjectEmbed(project, {})

    const message = await channel.send({ embeds: [embed], components: [row] })

    // Crea thread
    const thread = await message.startThread({
        name: `💬 ${project.name}`,
        autoArchiveDuration: 10080, // 7 giorni
    })

    await thread.send(`🧵 Thread dedicato a **${project.name}** — commenti, idee e bug qui!`)

    // Salva message_id e thread_id
    await supabase
        .from('projects')
        .update({ message_id: message.id, thread_id: thread.id })
        .eq('id', project.id)

    await interaction.editReply({ content: `✅ Progetto **${project.name}** pubblicato!` })
}

// ─── NEW COMMENT ──────────────────────────────────────────────────────────────

async function handleNewComment(interaction, tag, projectId) {
    await interaction.deferReply({ ephemeral: true })

    const content = interaction.fields.getTextInputValue('field_content').trim()

    // Salva commento
    const { error } = await supabase.from('comments').insert({
        project_id: projectId,
        author_id: interaction.user.id,
        author_username: interaction.user.username,
        tag,
        content,
    })

    if (error) {
        console.error('Comment insert error:', error)
        return interaction.editReply({ content: '❌ Errore salvataggio commento.' })
    }

    // Fetch progetto per aggiornare embed
    const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

    if (project) {
        // Conta commenti per tag
        const { data: counts } = await supabase
            .from('comments')
            .select('tag')
            .eq('project_id', projectId)

        const commentCounts = { idea: 0, bug: 0, opinione: 0 }
        counts?.forEach(c => { commentCounts[c.tag] = (commentCounts[c.tag] || 0) + 1 })

        // Aggiorna embed originale
        try {
            const channel = await client.channels.fetch(process.env.PROJECTS_CHANNEL_ID)
            const message = await channel.messages.fetch(project.message_id)
            const { embed, row } = buildProjectEmbed(project, commentCounts)
            await message.edit({ embeds: [embed], components: [row] })
        } catch (e) {
            console.error('Embed update error:', e)
        }

        // Posta nel thread
        if (project.thread_id) {
            try {
                const thread = await client.channels.fetch(project.thread_id)
                const emoji = TAG_EMOJI[tag]
                await thread.send(`${emoji} **[${tag.toUpperCase()}]** @${interaction.user.username}\n${content}`)
            } catch (e) {
                console.error('Thread post error:', e)
            }
        }
    }

    await interaction.editReply({ content: `✅ ${TAG_EMOJI[tag]} Commento pubblicato!` })
}

// ─── LIST PROJECTS ────────────────────────────────────────────────────────────

async function handleListProjects(interaction, { ephemeral = true, offset = 0, update = false } = {}) {
    if (!update) await interaction.deferReply({ ephemeral })

    const PAGE_SIZE = 5

    const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

    if (error || !projects?.length) {
        const msg = { content: '📭 Nessun progetto trovato.', ephemeral: true }
        return update ? interaction.update(msg) : interaction.editReply(msg)
    }

    // Fetch comment counts per progetto
    const ids = projects.map(p => p.id)
    const { data: allComments } = await supabase
        .from('comments')
        .select('project_id, tag')
        .in('project_id', ids)

    const countMap = {}
    allComments?.forEach(c => {
        if (!countMap[c.project_id]) countMap[c.project_id] = { idea: 0, bug: 0, opinione: 0 }
        countMap[c.project_id][c.tag]++
    })

    // Costruisci embed lista
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📋 Progetti Buildspace081')
        .setDescription(`Pagina ${Math.floor(offset / PAGE_SIZE) + 1}`)

    projects.forEach(p => {
        const counts = countMap[p.id] || { idea: 0, bug: 0, opinione: 0 }
        const total = counts.idea + counts.bug + counts.opinione
        embed.addFields({
            name: `${p.name} — ${p.stage}`,
            value: `by @${p.username}${total ? `  •  🗣️ ${total} commenti` : ''}${p.link ? `  •  [link](${p.link})` : ''}`,
        })
    })

    // Paginazione
    const navRow = new ActionRowBuilder()
    if (offset > 0) {
        navRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`page_${offset - PAGE_SIZE}`)
                .setLabel('◀ Precedenti')
                .setStyle(ButtonStyle.Secondary)
        )
    }
    if (projects.length === PAGE_SIZE) {
        navRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`page_${offset + PAGE_SIZE}`)
                .setLabel('Successivi ▶')
                .setStyle(ButtonStyle.Secondary)
        )
    }

    const payload = {
        embeds: [embed],
        components: navRow.components.length ? [navRow] : [],
        ephemeral,
    }

    return update ? interaction.update(payload) : interaction.editReply(payload)
}

// ─── VIEW COMMENTS ────────────────────────────────────────────────────────────

async function handleViewComments(interaction, projectId) {
    await interaction.deferReply({ ephemeral: true })

    const { data: project } = await supabase
        .from('projects')
        .select('name, thread_id')
        .eq('id', projectId)
        .single()

    const { data: comments } = await supabase
        .from('comments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10)

    if (!comments?.length) {
        return interaction.editReply({ content: '📭 Nessun commento ancora.' })
    }

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🧵 Commenti — ${project?.name || 'Progetto'}`)

    comments.forEach(c => {
        embed.addFields({
            name: `${TAG_EMOJI[c.tag]} [${c.tag.toUpperCase()}] @${c.author_username}`,
            value: c.content,
        })
    })

    if (project?.thread_id) {
        embed.setFooter({ text: `Vedi il thread completo nel canale` })
    }

    await interaction.editReply({ embeds: [embed] })
}

// ─── Login ────────────────────────────────────────────────────────────────────

client.login(process.env.DISCORD_TOKEN)
