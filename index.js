const {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  ActivityType,
  MessageFlags,
  AttachmentBuilder,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

// ============================================================
//  CONFIG
// ============================================================
// 👉 Colle ton NOUVEAU token entre les guillemets (à la place de COLLE_TON_NOUVEAU_TOKEN_ICI).
// ⚠️ Ne montre jamais ce fichier à personne et ne le mets pas sur GitHub avec le token dedans.
const TOKEN = 'MTU1ODI1MjQ4NDk2OTg5ODAzNQ.G0DVvS.rA_v1m4EtwKKiUQ-UHnIDiHFvUOg2a2PNNZfWQ';
const CLIENT_ID = '1558252484969898035';
const GUILD_ID = '1557506967784656957';
const COLOR = 0x5865f2; // couleur des embeds

if (TOKEN === 'COLLE_TON_NOUVEAU_TOKEN_ICI') {
  console.error('❌ Aucun token : remplace COLLE_TON_NOUVEAU_TOKEN_ICI par ton token dans le fichier.');
  process.exit(1);
}

// ⚠️ GuildMembers est un intent privilégié : à activer dans le Developer Portal (Bot > Server Members Intent)
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const eph = { flags: MessageFlags.Ephemeral }; // message visible uniquement par l'auteur

// ============================================================
//  OUTILS
// ============================================================
const commands = [];
function add(category, data, execute) {
  commands.push({ category, data, execute });
}

// Vérifie que le modérateur et le bot peuvent agir sur le membre ciblé
function hierarchyError(i, member) {
  if (!member) return "Ce membre n'est pas sur le serveur.";
  if (member.id === i.user.id) return 'Tu ne peux pas faire ça sur toi-même.';
  if (member.id === i.guild.ownerId) return 'Impossible sur le propriétaire du serveur.';
  if (member.roles.highest.comparePositionTo(i.member.roles.highest) >= 0 && i.user.id !== i.guild.ownerId)
    return 'Ce membre a un rôle égal ou supérieur au tien.';
  return null;
}

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}
function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ============================================================
//  INFOS
// ============================================================
add(
  'ℹ️ Infos',
  new SlashCommandBuilder().setName('help').setDescription('Affiche la liste de toutes les commandes'),
  async (i) => {
    const cats = {};
    for (const c of commands) (cats[c.category] ??= []).push(`\`/${c.data.name}\` — ${c.data.description}`);

    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("📖 Centre d'aide")
      .setDescription('Voici toutes mes commandes. Tape `/` pour les utiliser.')
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: `${commands.length} commandes` });

    for (const [cat, lines] of Object.entries(cats)) embed.addFields({ name: cat, value: lines.join('\n') });
    await i.reply({ embeds: [embed], ...eph });
  }
);

add('ℹ️ Infos', new SlashCommandBuilder().setName('ping').setDescription('Affiche la latence du bot'), async (i) => {
  await i.reply(`🏓 Pong ! Latence : **${Math.round(client.ws.ping)} ms**`);
});

add(
  'ℹ️ Infos',
  new SlashCommandBuilder().setName('memberscount').setDescription('Affiche le nombre de membres du serveur'),
  async (i) => {
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('👥 Membres')
      .setDescription(`Le serveur **${i.guild.name}** compte **${i.guild.memberCount}** membres.`);
    await i.reply({ embeds: [embed] });
  }
);

add('ℹ️ Infos', new SlashCommandBuilder().setName('serverinfo').setDescription('Infos détaillées sur le serveur'), async (i) => {
  const g = i.guild;
  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(`📊 ${g.name}`)
    .setThumbnail(g.iconURL({ size: 256 }))
    .addFields(
      { name: '👑 Propriétaire', value: `<@${g.ownerId}>`, inline: true },
      { name: '👥 Membres', value: `${g.memberCount}`, inline: true },
      { name: '💬 Salons', value: `${g.channels.cache.size}`, inline: true },
      { name: '🎭 Rôles', value: `${g.roles.cache.size}`, inline: true },
      { name: '🚀 Boosts', value: `${g.premiumSubscriptionCount ?? 0}`, inline: true },
      { name: '📅 Créé le', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true }
    )
    .setFooter({ text: `ID : ${g.id}` });
  await i.reply({ embeds: [embed] });
});

add(
  'ℹ️ Infos',
  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Infos sur un membre')
    .addUserOption((o) => o.setName('membre').setDescription('Le membre (toi par défaut)')),
  async (i) => {
    const member = i.options.getMember('membre') ?? i.member;
    const user = member.user;
    const embed = new EmbedBuilder()
      .setColor(member.displayColor || COLOR)
      .setTitle(`👤 ${user.username}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '🆔 ID', value: user.id, inline: true },
        { name: '🤖 Bot', value: user.bot ? 'Oui' : 'Non', inline: true },
        { name: '📅 Compte créé', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
        { name: '📥 A rejoint', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : 'Inconnu', inline: true }
      );
    await i.reply({ embeds: [embed] });
  }
);

add(
  'ℹ️ Infos',
  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("Affiche l'avatar d'un membre")
    .addUserOption((o) => o.setName('membre').setDescription('Le membre (toi par défaut)')),
  async (i) => {
    const user = i.options.getUser('membre') ?? i.user;
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(`🖼️ Avatar de ${user.username}`)
      .setImage(user.displayAvatarURL({ size: 1024 }));
    await i.reply({ embeds: [embed] });
  }
);

// ============================================================
//  UTILITAIRES
// ============================================================
add(
  '🛠️ Utilitaires',
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Fait parler le bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('texte').setDescription('Le message à envoyer').setRequired(true))
    .addChannelOption((o) =>
      o.setName('salon').setDescription('Salon cible (celui-ci par défaut)').addChannelTypes(ChannelType.GuildText)
    ),
  async (i) => {
    const channel = i.options.getChannel('salon') ?? i.channel;
    await channel.send({ content: i.options.getString('texte'), allowedMentions: { parse: ['users'] } });
    await i.reply({ content: `✅ Message envoyé dans ${channel}.`, ...eph });
  }
);

add(
  '🛠️ Utilitaires',
  new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Envoie un message en embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('titre').setDescription("Titre de l'embed").setRequired(true))
    .addStringOption((o) => o.setName('description').setDescription("Contenu de l'embed").setRequired(true))
    .addStringOption((o) => o.setName('couleur').setDescription('Couleur hex, ex : #ff0000'))
    .addChannelOption((o) =>
      o.setName('salon').setDescription('Salon cible (celui-ci par défaut)').addChannelTypes(ChannelType.GuildText)
    ),
  async (i) => {
    const channel = i.options.getChannel('salon') ?? i.channel;
    const hex = parseInt((i.options.getString('couleur') ?? '').replace('#', ''), 16);
    const embed = new EmbedBuilder()
      .setColor(Number.isNaN(hex) ? COLOR : hex)
      .setTitle(i.options.getString('titre'))
      .setDescription(i.options.getString('description'));
    await channel.send({ embeds: [embed] });
    await i.reply({ content: `✅ Embed envoyé dans ${channel}.`, ...eph });
  }
);

add(
  '🛠️ Utilitaires',
  new SlashCommandBuilder()
    .setName('sondage')
    .setDescription('Crée un sondage Oui / Non')
    .addStringOption((o) => o.setName('question').setDescription('La question du sondage').setRequired(true)),
  async (i) => {
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('📊 Sondage')
      .setDescription(i.options.getString('question'))
      .setFooter({ text: `Par ${i.user.username}` });
    await i.reply({ embeds: [embed] });
    const msg = await i.fetchReply();
    await msg.react('👍');
    await msg.react('👎');
  }
);

// ============================================================
//  MODÉRATION
// ============================================================
add(
  '🛡️ Modération',
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprime des messages dans le salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((o) =>
      o.setName('nombre').setDescription('Nombre de messages (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)
    ),
  async (i) => {
    const deleted = await i.channel.bulkDelete(i.options.getInteger('nombre'), true);
    await i.reply({ content: `🧹 **${deleted.size}** message(s) supprimé(s).`, ...eph });
  }
);

add(
  '🛡️ Modération',
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulse un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((o) => o.setName('membre').setDescription('Le membre à expulser').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('La raison')),
  async (i) => {
    const member = i.options.getMember('membre');
    const raison = i.options.getString('raison') ?? 'Aucune raison';
    const err = hierarchyError(i, member);
    if (err) return i.reply({ content: `❌ ${err}`, ...eph });
    if (!member.kickable) return i.reply({ content: '❌ Je ne peux pas expulser ce membre (mon rôle est trop bas).', ...eph });

    await member.kick(`${raison} (par ${i.user.username})`);
    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('👢 Membre expulsé')
      .addFields(
        { name: 'Membre', value: `${member.user.username}`, inline: true },
        { name: 'Modérateur', value: `${i.user}`, inline: true },
        { name: 'Raison', value: raison }
      );
    await i.reply({ embeds: [embed] });
  }
);

add(
  '🛡️ Modération',
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannit un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) => o.setName('membre').setDescription('Le membre à bannir').setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('La raison')),
  async (i) => {
    const user = i.options.getUser('membre');
    const member = i.options.getMember('membre');
    const raison = i.options.getString('raison') ?? 'Aucune raison';

    if (member) {
      const err = hierarchyError(i, member);
      if (err) return i.reply({ content: `❌ ${err}`, ...eph });
      if (!member.bannable) return i.reply({ content: '❌ Je ne peux pas bannir ce membre (mon rôle est trop bas).', ...eph });
    }

    await i.guild.members.ban(user.id, { reason: `${raison} (par ${i.user.username})` });
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('🔨 Membre banni')
      .addFields(
        { name: 'Membre', value: `${user.username}`, inline: true },
        { name: 'Modérateur', value: `${i.user}`, inline: true },
        { name: 'Raison', value: raison }
      );
    await i.reply({ embeds: [embed] });
  }
);

add(
  '🛡️ Modération',
  new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Débannit un utilisateur grâce à son ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((o) => o.setName('id').setDescription("L'ID de l'utilisateur").setRequired(true)),
  async (i) => {
    const id = i.options.getString('id').trim();
    try {
      await i.guild.members.unban(id);
      await i.reply(`✅ L'utilisateur \`${id}\` a été débanni.`);
    } catch {
      await i.reply({ content: "❌ Cet ID n'est pas dans la liste des bannis.", ...eph });
    }
  }
);

add(
  '🛡️ Modération',
  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Met un membre en sourdine (timeout)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('membre').setDescription('Le membre').setRequired(true))
    .addIntegerOption((o) =>
      o.setName('minutes').setDescription('Durée en minutes (max 40320)').setMinValue(1).setMaxValue(40320).setRequired(true)
    )
    .addStringOption((o) => o.setName('raison').setDescription('La raison')),
  async (i) => {
    const member = i.options.getMember('membre');
    const minutes = i.options.getInteger('minutes');
    const raison = i.options.getString('raison') ?? 'Aucune raison';
    const err = hierarchyError(i, member);
    if (err) return i.reply({ content: `❌ ${err}`, ...eph });
    if (!member.moderatable) return i.reply({ content: '❌ Je ne peux pas mettre ce membre en timeout.', ...eph });

    await member.timeout(minutes * 60 * 1000, `${raison} (par ${i.user.username})`);
    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle('🔇 Membre en timeout')
      .addFields(
        { name: 'Membre', value: `${member.user.username}`, inline: true },
        { name: 'Durée', value: `${minutes} min`, inline: true },
        { name: 'Raison', value: raison }
      );
    await i.reply({ embeds: [embed] });
  }
);

add(
  '🛡️ Modération',
  new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription("Retire le timeout d'un membre")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('membre').setDescription('Le membre').setRequired(true)),
  async (i) => {
    const member = i.options.getMember('membre');
    if (!member) return i.reply({ content: "❌ Ce membre n'est pas sur le serveur.", ...eph });
    await member.timeout(null);
    await i.reply(`🔊 Le timeout de **${member.user.username}** a été retiré.`);
  }
);

add(
  '🛡️ Modération',
  new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Verrouille le salon (personne ne peut écrire)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async (i) => {
    await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false });
    await i.reply('🔒 Salon verrouillé.');
  }
);

add(
  '🛡️ Modération',
  new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Déverrouille le salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async (i) => {
    await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null });
    await i.reply('🔓 Salon déverrouillé.');
  }
);

add(
  '🛡️ Modération',
  new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Définit le mode lent du salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((o) =>
      o.setName('secondes').setDescription('Délai en secondes (0 pour désactiver)').setMinValue(0).setMaxValue(21600).setRequired(true)
    ),
  async (i) => {
    const s = i.options.getInteger('secondes');
    await i.channel.setRateLimitPerUser(s);
    await i.reply(s === 0 ? '⏱️ Mode lent désactivé.' : `⏱️ Mode lent réglé sur **${s}s**.`);
  }
);

// ============================================================
//  TICKETS
// ============================================================
const BRAND = 'Camyw Tweaks';
const TICKET_TITLE = 'OPEN YOUR TICKET HERE!';
const TICKET_TEXT =
  `Welcome to the ${BRAND} ticketing system.\nWhat is your problem?\n\n` +
  `Simply select the category that matches your request below.\n` +
  `A member of the ${BRAND} team will then reply to you.`;

// Catégories du menu déroulant (modifie / ajoute les tiennes ici)
const TICKET_CATEGORIES = [
  { key: 'support', label: 'Technical support', description: 'I have a problem or something is not working', emoji: '🛠️' },
  { key: 'purchase', label: 'Purchase / Payment', description: 'A question about an order or a payment', emoji: '💳' },
  { key: 'question', label: 'General question', description: 'I have a question before buying', emoji: '❓' },
  { key: 'other', label: 'Other request', description: 'Anything else', emoji: '📩' },
];

const ticketSelectRow = (staffId, catId) =>
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`ticket_select:${staffId}:${catId}`)
      .setPlaceholder('Select a category...')
      .addOptions(
        TICKET_CATEGORIES.map((c) => ({ label: c.label, description: c.description, emoji: c.emoji, value: c.key }))
      )
  );

add(
  '🎫 Tickets',
  new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Envoie le panel pour ouvrir des tickets')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((o) =>
      o.setName('salon').setDescription('Salon où poster le panel (celui-ci par défaut)').addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption((o) => o.setName('image').setDescription('Lien direct de la grande image du panel (https://...)'))
    .addRoleOption((o) => o.setName('staff').setDescription('Rôle qui pourra voir et gérer les tickets'))
    .addChannelOption((o) =>
      o.setName('categorie').setDescription('Catégorie Discord où créer les tickets').addChannelTypes(ChannelType.GuildCategory)
    ),
  async (i) => {
    const channel = i.options.getChannel('salon') ?? i.channel;
    const image = i.options.getString('image');
    const staff = i.options.getRole('staff');
    const cat = i.options.getChannel('categorie');

    if (image && !/^https?:\/\//i.test(image))
      return i.reply({ content: "❌ L'image doit être un lien qui commence par https://", ...eph });

    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(TICKET_TITLE)
      .setDescription(TICKET_TEXT)
      .setFooter({ text: BRAND })
      .setTimestamp();
    if (image) embed.setImage(image);

    await channel.send({ embeds: [embed], components: [ticketSelectRow(staff?.id ?? '0', cat?.id ?? '0')] });
    await i.reply({ content: `✅ Panel envoyé dans ${channel}.`, ...eph });
  }
);

// ============================================================
//  PANEL PRODUITS (le ticket s'ouvre dès qu'on choisit un produit)
// ============================================================
const PRODUCTS = [
  { key: 'platinum', label: 'Camyw Tweaks Platinum', description: 'Everything unlocked (270 tweaks + network tools) · €14.99', price: '€14.99' },
  { key: 'premium', label: 'Camyw Tweaks Premium', description: 'Premium rank (90 tweaks + per-game settings) · €9.99', price: '€9.99' },
  { key: 'oscustom', label: 'OS Custom', description: 'Debloated Windows · €24.99', price: '€24.99' },
];

const productRows = (staffId, catId) => [
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`prod_select:${staffId}:${catId}`)
      .setPlaceholder('Select a product to open a ticket...')
      .addOptions(PRODUCTS.map((p) => ({ label: p.label, description: p.description, value: p.key })))
  ),
];

add(
  '🎫 Tickets',
  new SlashCommandBuilder()
    .setName('productpanel')
    .setDescription('Envoie le panel produits pour ouvrir des tickets')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((o) =>
      o.setName('salon').setDescription('Salon où poster le panel (celui-ci par défaut)').addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption((o) => o.setName('image').setDescription('Lien direct de la grande image/bannière (https://...)'))
    .addRoleOption((o) => o.setName('staff').setDescription('Rôle qui pourra voir et gérer les tickets'))
    .addChannelOption((o) =>
      o.setName('categorie').setDescription('Catégorie Discord où créer les tickets').addChannelTypes(ChannelType.GuildCategory)
    ),
  async (i) => {
    const channel = i.options.getChannel('salon') ?? i.channel;
    const image = i.options.getString('image');
    const staff = i.options.getRole('staff');
    const cat = i.options.getChannel('categorie');

    if (image && !/^https?:\/\//i.test(image))
      return i.reply({ content: "❌ L'image doit être un lien qui commence par https://", ...eph });

    const embed = new EmbedBuilder()
      .setColor(0xf5c518)
      .setTitle('CAMYW TWEAKS')
      .setDescription(
        '**How it works**\n' +
          '> A clean Windows reinstall is required for OS Custom — the exact version we recommend for your hardware is given to you in your ticket when you buy. Back up your files before the installation. Allow ~15 min with the guided assistant, and staff are available live on Discord if you need help.\n\n' +
          '**How to get it**\n' +
          '> 1. Select your product in the menu below, your ticket opens automatically\n' +
          '> 2. Pick your payment method with the staff\n' +
          '> 3. Your license key is sent as soon as payment is confirmed — instant delivery'
      )
      .setFooter({ text: 'Faulty product? We swap it for another product — no cash refunds. Free follow-up for 6 months after purchase.' });
    if (image) embed.setImage(image);

    await channel.send({
      embeds: [embed],
      components: productRows(staff?.id ?? '0', cat?.id ?? '0'),
    });
    await i.reply({ content: `✅ Panel produits envoyé dans ${channel}.`, ...eph });
  }
);

// ============================================================
//  PANEL RANGS (Standard / Premium / Gold)
// ============================================================
const RANKS = [
  {
    key: 'standard',
    label: 'Standard',
    description: 'Free · 73 safe tweaks + all the tools',
    price: 'FREE',
    details:
      '**Standard — FREE**\n' +
      '73 safe tweaks (network & latency, zero input delay, PC & gaming, privacy, system) + all the tools: ' +
      'Fix it (21 repairs), automatic game detection with the best settings, driver check, Debloat, Cleaner, 108 apps, ' +
      'profiles, PC diagnostic, restore points and automatic updates.',
  },
  {
    key: 'premium',
    label: 'Premium',
    description: '€4.99 · 90 tweaks + per-game settings',
    price: '€4.99',
    details:
      '**Premium — €4.99**\n' +
      '90 tweaks + per-game settings, the Game Booster and one-click Windows Update drivers.',
  },
  {
    key: 'gold',
    label: 'Gold',
    description: '€8.99 · All 270 Tweaks + Tweaks Network',
    price: '€8.99',
    details:
      '**Gold — €8.99**\n' +
      'All 270 Tweaks + Tweaks Network (one-click network optimizer, fastest DNS finder, ping test).',
  },
];

const rankRows = (staffId, catId) => [
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`rank_details:${staffId}:${catId}`)
      .setPlaceholder('Details of Standard / Premium / Gold...')
      .addOptions(RANKS.map((r) => ({ label: r.label, description: r.description, value: r.key })))
  ),
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rank_buy:${staffId}:${catId}`).setLabel('Buy a rank').setStyle(ButtonStyle.Success)
  ),
];

add(
  '🎫 Tickets',
  new SlashCommandBuilder()
    .setName('rankpanel')
    .setDescription('Envoie le panel des rangs (Standard / Premium / Gold)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((o) =>
      o.setName('salon').setDescription('Salon où poster le panel (celui-ci par défaut)').addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption((o) => o.setName('image').setDescription('Lien direct de la grande image/bannière (https://...)'))
    .addRoleOption((o) => o.setName('staff').setDescription('Rôle qui pourra voir et gérer les tickets'))
    .addChannelOption((o) =>
      o.setName('categorie').setDescription('Catégorie Discord où créer les tickets').addChannelTypes(ChannelType.GuildCategory)
    ),
  async (i) => {
    const channel = i.options.getChannel('salon') ?? i.channel;
    const image = i.options.getString('image');
    const staff = i.options.getRole('staff');
    const cat = i.options.getChannel('categorie');

    if (image && !/^https?:\/\//i.test(image))
      return i.reply({ content: "❌ L'image doit être un lien qui commence par https://", ...eph });

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('Camyw Tweaks')
      .setDescription(
        'New application available in 3 tiers:\n\n' +
          '**Free:** 40+ tweaks\n' +
          '**Platinum:** 90+ tweaks\n' +
          '**Gold:** 270+ tweaks + registry tweaks\n\n' +
          '*(Reduces input lag, boosts FPS, boosts PC performance, and much more)*\n\n' +
          '**Premium** — €4.99 · 90 tweaks + per-game settings, Game Booster, and one-click Windows optimizations\n' +
          '**Gold** — €8.99 · All 270 tweaks + Tweaks Network (one-click network optimizer, fastest DNS finder, ping test)\n\n' +
          '**How to unlock tiers:**\n' +
          'Open a ticket below, select your Platinum or Gold tier, and proceed with payment.\n\n' +
          'A staff member will assist you with your tweaks and ensure the process is handled reliably.\n\n' +
          'Once the tier is purchased, a command will be unlocked for use with the bot:\n\n' +
          '`/rank` — this provides a key to enter into the application, unlocking everything you purchased'
      );
    if (image) embed.setImage(image);

    await channel.send({
      embeds: [embed],
      components: rankRows(staff?.id ?? '0', cat?.id ?? '0'),
    });
    await i.reply({ content: `✅ Panel des rangs envoyé dans ${channel}.`, ...eph });
  }
);

// ============================================================
//  /rankroles + /rank : clé de licence UNIQUE pour les membres Premium / Gold / Diamond
//
//  - Une RÉSERVE de clés uniques est générée à l'avance (10 000+ pour Gold).
//  - /rank attribue UNE clé de la réserve et la retire des clés libres :
//    deux membres ne peuvent JAMAIS avoir la même clé.
//  - Si le membre refait /rank, il récupère toujours SA clé.
//  - Si la réserve est vide, le bot en regénère automatiquement.
//  - L'application vérifie la clé via l'API du bot (voir "API DE VÉRIFICATION" plus bas).
// ============================================================
const RANKROLES_FILE = path.join(__dirname, 'rankroles.json'); // rôles Premium / Gold / Diamond
const KEYS_FILE = path.join(__dirname, 'keys.json');           // clé attribuée à chaque membre
const POOL_FILE = path.join(__dirname, 'keypool.json');        // réserve de clés (libres + prises)

// Nombre minimum de clés LIBRES gardées en réserve par rang
const POOL_MIN = { gold: 10000, diamond: 5000, premium: 2000 };
const RANK_NAMES = Object.keys(POOL_MIN);
const RANK_LABELS = { premium: 'Premium', gold: 'Gold', diamond: 'Diamond' };
const RANK_COLORS = { premium: 0x57f287, gold: 0xf5c518, diamond: 0x4cc9f0 };
// IDs des rôles Discord (Gold et Diamond). Premium reste défini via /rankroles.
const RANK_ROLE_IDS = { gold: '1558870331685470300', diamond: '1558212350740271135' };

// Génère une clé du type CAMYW-GOLD-A1B2C3-D4E5F6-A7B8C9
function makeKey(rank) {
  const part = () => crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CAMYW-${rank.toUpperCase()}-${part()}-${part()}-${part()}`;
}

function loadPool() {
  const pool = loadJson(POOL_FILE);
  for (const r of RANK_NAMES) {
    pool[r] ??= {};
    pool[r].free ??= []; // clés disponibles
    pool[r].taken ??= {}; // clé -> id du membre
  }
  return pool;
}
function savePool(pool) {
  saveJson(POOL_FILE, pool);
}

// Toutes les clés déjà existantes (pour éviter les doublons)
function allKeys(pool) {
  const set = new Set();
  for (const r of RANK_NAMES) {
    pool[r].free.forEach((k) => set.add(k));
    Object.keys(pool[r].taken).forEach((k) => set.add(k));
  }
  return set;
}

// Ajoute `amount` nouvelles clés uniques dans la réserve libre
function generateKeys(pool, rank, amount) {
  const existing = allKeys(pool);
  let created = 0;
  while (created < amount) {
    const key = makeKey(rank);
    if (existing.has(key)) continue; // doublon -> on refait
    existing.add(key);
    pool[rank].free.push(key);
    created++;
  }
  return created;
}

// Complète la réserve pour qu'il y ait toujours au moins POOL_MIN clés libres
function fillPool(pool) {
  let changed = false;
  for (const [rank, min] of Object.entries(POOL_MIN)) {
    const missing = min - pool[rank].free.length;
    if (missing > 0) {
      generateKeys(pool, rank, missing);
      changed = true;
    }
  }
  return changed;
}

// Attribue une clé unique à un membre (synchrone = 2 membres ne peuvent pas recevoir la même)
function claimKey(userId, rank) {
  const keys = loadJson(KEYS_FILE);
  const pool = loadPool();
  const current = keys[userId];

  // Le membre a déjà une clé de ce rang -> on la lui redonne
  if (current && current.rank === rank) {
    pool[rank].taken[current.key] ??= userId;
    savePool(pool);
    return current.key;
  }

  // Plus de clé libre -> on en génère 1000 de plus
  if (pool[rank].free.length === 0) generateKeys(pool, rank, 1000);

  // Tirage au sort d'une clé libre, puis retrait de la réserve
  const idx = crypto.randomInt(pool[rank].free.length);
  const [key] = pool[rank].free.splice(idx, 1);
  pool[rank].taken[key] = userId;

  keys[userId] = { rank, key, createdAt: Date.now() };
  savePool(pool);
  saveJson(KEYS_FILE, keys);
  return key;
}

// Admin : définit quels rôles correspondent à Premium, Gold et Diamond
add(
  '🎫 Tickets',
  new SlashCommandBuilder()
    .setName('rankroles')
    .setDescription('Définit les rôles Premium, Gold et Diamond utilisés par /rank')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((o) => o.setName('premium').setDescription('Rôle Premium').setRequired(true))
    .addRoleOption((o) => o.setName('gold').setDescription('Rôle Gold').setRequired(true))
    .addRoleOption((o) => o.setName('diamond').setDescription('Rôle Diamond')),
  async (i) => {
    const all = loadJson(RANKROLES_FILE);
    const diamond = i.options.getRole('diamond');
    all[i.guild.id] = {
      premium: i.options.getRole('premium').id,
      gold: i.options.getRole('gold').id,
      diamond: diamond?.id ?? all[i.guild.id]?.diamond ?? null,
    };
    saveJson(RANKROLES_FILE, all);
    const dRole = all[i.guild.id].diamond ? `<@&${all[i.guild.id].diamond}>` : 'non défini';
    await i.reply({
      content: `✅ Rôles enregistrés : Premium = ${i.options.getRole('premium')}, Gold = ${i.options.getRole('gold')}, Diamond = ${dRole}.`,
      allowedMentions: { parse: [] },
      ...eph,
    });
  }
);

// Membres Premium / Gold / Diamond : récupérer sa clé
add(
  '🎫 Tickets',
  new SlashCommandBuilder().setName('rank').setDescription('Get your key to enter in the app (Premium / Gold / Diamond)'),
  async (i) => {
    // Les IDs Gold et Diamond sont fixes et prioritaires sur rankroles.json
    const conf = { ...(loadJson(RANKROLES_FILE)[i.guild.id] ?? {}), ...RANK_ROLE_IDS };
    // Ancien bug : le rôle Diamond avait été enregistré comme "Premium" -> on l'ignore pour Premium
    if (conf.premium === RANK_ROLE_IDS.diamond || conf.premium === RANK_ROLE_IDS.gold) conf.premium = null;

    const roles = i.member.roles.cache;
    let rank = null;
    if (conf.diamond && roles.has(conf.diamond)) rank = 'diamond';
    else if (conf.gold && roles.has(conf.gold)) rank = 'gold';
    else if (conf.premium && roles.has(conf.premium)) rank = 'premium';

    if (!rank)
      return i.reply({ content: '❌ This command is reserved for **Premium**, **Gold** and **Diamond** members.', ...eph });

    const key = claimKey(i.user.id, rank);

    const embed = new EmbedBuilder()
      .setColor(RANK_COLORS[rank])
      .setTitle(`🔑 Your ${RANK_LABELS[rank]} key`)
      .setDescription(
        `Enter this key in the app to unlock everything:\n\n\`\`\`${key}\`\`\`\n` +
          '⚠️ This key is unique and personal. Do not share it with anyone.'
      )
      .setFooter({ text: BRAND });
    await i.reply({ embeds: [embed], ...eph });
  }
);

// Admin : générer des clés supplémentaires dans la réserve
add(
  '🎫 Tickets',
  new SlashCommandBuilder()
    .setName('genkeys')
    .setDescription('Génère des clés supplémentaires dans la réserve (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) =>
      o
        .setName('rang')
        .setDescription('Rang des clés')
        .setRequired(true)
        .addChoices({ name: 'Diamond', value: 'diamond' }, { name: 'Gold', value: 'gold' }, { name: 'Premium', value: 'premium' })
    )
    .addIntegerOption((o) =>
      o.setName('nombre').setDescription('Nombre de clés à générer (1-50000)').setMinValue(1).setMaxValue(50000).setRequired(true)
    ),
  async (i) => {
    const rank = i.options.getString('rang');
    const amount = i.options.getInteger('nombre');
    await i.deferReply(eph);

    const pool = loadPool();
    generateKeys(pool, rank, amount);
    savePool(pool);

    await i.editReply(
      `✅ **${amount}** clés ${rank.toUpperCase()} générées.\n` +
        `📦 Réserve ${rank.toUpperCase()} : **${pool[rank].free.length}** libres · **${Object.keys(pool[rank].taken).length}** déjà attribuées.`
    );
  }
);

// Admin : exporter toutes les clés (libres + attribuées) dans un fichier .txt
add(
  '🎫 Tickets',
  new SlashCommandBuilder()
    .setName('exportkeys')
    .setDescription("Exporte toutes les clés d'un rang en fichier .txt (admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) =>
      o
        .setName('rang')
        .setDescription('Rang des clés')
        .setRequired(true)
        .addChoices({ name: 'Diamond', value: 'diamond' }, { name: 'Gold', value: 'gold' }, { name: 'Premium', value: 'premium' })
    ),
  async (i) => {
    const rank = i.options.getString('rang');
    const pool = loadPool();
    const list = [...pool[rank].free, ...Object.keys(pool[rank].taken)];
    const file = new AttachmentBuilder(Buffer.from(list.join('\n'), 'utf8'), { name: `keys-${rank}.txt` });

    await i.reply({
      content:
        `📄 **${list.length}** clés ${rank.toUpperCase()} (${pool[rank].free.length} libres · ${Object.keys(pool[rank].taken).length} attribuées).\n` +
        '⚠️ Ce fichier est confidentiel.',
      files: [file],
      ...eph,
    });
  }
);

// ============================================================
//  API DE VÉRIFICATION DES CLÉS  (appelée par l'application)
//
//  POST /api/key   corps : {"key":"CAMYW-GOLD-..."}
//  Réponse         : {"valid":true,"tier":"gold"}  ou  {"valid":false}
//
//  - Aucune dépendance à installer (module http de Node).
//  - Le port est celui de l'hébergeur (variable PORT) ou 3000.
//  - Une clé est valide si elle est libre dans la réserve (vendue à la main)
//    ou si c'est la clé ACTUELLE d'un membre (keys.json).
//  - Limite : 30 requêtes par minute et par adresse IP.
// ============================================================
const API_PORT = process.env.PORT || 3000;

let keyIndex = { sig: '', map: new Map() };
const mtimeOf = (f) => {
  try {
    return fs.statSync(f).mtimeMs;
  } catch {
    return 0;
  }
};

// Retourne le rang ('premium' | 'gold' | 'diamond') d'une clé, ou null si invalide
function lookupKey(key) {
  const sig = `${mtimeOf(POOL_FILE)}|${mtimeOf(KEYS_FILE)}`;
  if (sig !== keyIndex.sig) {
    const map = new Map();
    const pool = loadPool();
    for (const r of RANK_NAMES) for (const k of pool[r].free) map.set(k, r);
    for (const e of Object.values(loadJson(KEYS_FILE))) if (e && e.key && RANK_NAMES.includes(e.rank)) map.set(e.key, e.rank);
    keyIndex = { sig, map };
  }
  return keyIndex.map.get(key) ?? null;
}

const apiHits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (apiHits.get(ip) ?? []).filter((t) => now - t < 60000);
  list.push(now);
  apiHits.set(ip, list);
  return list.length > 30;
}
setInterval(() => apiHits.clear(), 10 * 60 * 1000).unref();

function startKeyApi() {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  const send = (res, code, body) => {
    res.writeHead(code, headers);
    res.end(JSON.stringify(body));
  };

  http
    .createServer((req, res) => {
      const url = (req.url || '').split('?')[0];

      if (req.method === 'OPTIONS') {
        res.writeHead(204, headers);
        return res.end();
      }
      if (req.method === 'GET' && url === '/') return send(res, 200, { ok: true });

      if (req.method === 'POST' && url === '/api/key') {
        const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
        if (rateLimited(ip)) return send(res, 429, { valid: false, error: 'rate_limited' });

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
          if (body.length > 2048) req.destroy();
        });
        req.on('end', () => {
          let key = '';
          try {
            key = String(JSON.parse(body).key || '').trim().toUpperCase();
          } catch {}
          let tier = null;
          try {
            tier = key ? lookupKey(key) : null;
          } catch (err) {
            console.error('❌ Erreur API clés :', err);
            return send(res, 500, { valid: false, error: 'server_error' });
          }
          send(res, 200, tier ? { valid: true, tier } : { valid: false });
        });
        return;
      }

      send(res, 404, { error: 'not_found' });
    })
    .listen(API_PORT, () => console.log(`🌐 API des clés en ligne sur le port ${API_PORT} (POST /api/key)`));
}

// ============================================================
//  OUVERTURE / FERMETURE / CLAIM DES TICKETS
// ============================================================
const ticketButtons = (claimedBy) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel(claimedBy ? `Claimed by ${claimedBy}` : 'Claim')
      .setEmoji('✋')
      .setStyle(ButtonStyle.Success)
      .setDisabled(Boolean(claimedBy))
  );

async function openTicket(i) {
  const [, staffId, catId] = i.customId.split(':');
  const guild = i.guild;
  const isMenu = i.isStringSelectMenu();
  const isProduct = i.customId.startsWith('prod_select');
  const isRank = i.customId.startsWith('rank_buy');

  // Produit choisi dans le menu
  const product = isProduct ? PRODUCTS.find((p) => p.key === i.values[0]) ?? PRODUCTS[0] : null;

  const category =
    isProduct || isRank
      ? TICKET_CATEGORIES.find((c) => c.key === 'purchase')
      : TICKET_CATEGORIES.find((c) => c.key === (isMenu ? i.values[0] : 'support')) ?? TICKET_CATEGORIES[0];

  // Remet le menu à zéro pour pouvoir re-sélectionner le même choix
  if (isMenu)
    i.message
      .edit({ components: isProduct ? productRows(staffId, catId) : [ticketSelectRow(staffId, catId)] })
      .catch(() => {});

  const existing = guild.channels.cache.find((c) => c.topic === `ticket:${i.user.id}`);
  if (existing) return i.reply({ content: `❌ You already have an open ticket: ${existing}`, ...eph });

  await i.deferReply(eph);

  const allow = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.AttachFiles,
  ];
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: i.user.id, allow },
    { id: client.user.id, allow: [...allow, PermissionFlagsBits.ManageChannels] },
  ];
  if (staffId && staffId !== '0') overwrites.push({ id: staffId, allow });

  const channelPrefix = product ? product.key : isRank ? 'rank' : category.key;
  const channel = await guild.channels.create({
    name: `${channelPrefix}-${i.user.username}`.slice(0, 90),
    type: ChannelType.GuildText,
    parent: catId && catId !== '0' ? catId : null,
    topic: `ticket:${i.user.id}`,
    permissionOverwrites: overwrites,
  });

  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(product || isRank ? category.label : `${category.emoji} ${category.label}`)
    .setDescription(
      `Welcome ${i.user} to the ${BRAND} ticketing system.\nWhat is your problem?\n\n` +
        `Please describe it in as much detail as possible. A member of the team will reply soon.\n\n` +
        `🔒 Use the **Close** button when you're done.`
    )
    .setFooter({ text: BRAND })
    .setTimestamp();
  if (product) embed.addFields({ name: 'Product', value: `${product.label} — ${product.price}` });
  if (isRank) embed.addFields({ name: 'Request', value: 'Rank purchase (Premium €4.99 / Gold €8.99) — tell us which rank you want.' });

  const pingStaff = staffId && staffId !== '0';
  await channel.send({
    content: `${i.user}${pingStaff ? ` <@&${staffId}>` : ''}`,
    embeds: [embed],
    components: [ticketButtons()],
    allowedMentions: { users: [i.user.id], roles: pingStaff ? [staffId] : [] },
  });

  await i.editReply(`✅ Your ticket has been created: ${channel}`);
}

async function closeTicket(i) {
  if (!i.channel.topic?.startsWith('ticket:')) return i.reply({ content: '❌ This is not a ticket.', ...eph });
  await i.reply('🔒 Ticket closed, this channel will be deleted in **5 seconds**...');
  setTimeout(() => i.channel.delete().catch(() => {}), 5000);
}

async function claimTicket(i) {
  if (i.channel.topic === `ticket:${i.user.id}`)
    return i.reply({ content: "❌ You can't claim your own ticket.", ...eph });
  await i.update({ components: [ticketButtons(i.user.username)] });
  await i.channel.send(`✋ This ticket is being handled by ${i.user}.`);
}

// Affiche les détails d'un rang (message visible uniquement par l'utilisateur)
async function showRankDetails(i) {
  const [, staffId, catId] = i.customId.split(':');
  const rank = RANKS.find((r) => r.key === i.values[0]) ?? RANKS[0];

  // Remet le menu à zéro pour pouvoir re-sélectionner le même rang
  await i.update({ components: rankRows(staffId, catId) });
  const embed = new EmbedBuilder().setColor(0x57f287).setDescription(rank.details).setFooter({ text: BRAND });
  await i.followUp({ embeds: [embed], ...eph });
}

// ============================================================
//  ANNONCES (embed stylé, images, emojis du serveur)
// ============================================================
const pendingAnnonces = new Map();

// Remplace :nom: par l'emoji personnalisé du serveur qui porte ce nom
function parseEmojis(guild, text) {
  return text.replace(/(?<!<a?):([a-zA-Z0-9_]{2,32}):(?!\d)/g, (m, name) => {
    const e = guild.emojis.cache.find((x) => x.name === name);
    return e ? e.toString() : m;
  });
}

add(
  '🛠️ Utilitaires',
  new SlashCommandBuilder()
    .setName('annonce')
    .setDescription('Envoie une belle annonce (images, emojis, bouton)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption((o) =>
      o
        .setName('salon')
        .setDescription('Salon cible (celui-ci par défaut)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    )
    .addAttachmentOption((o) => o.setName('image').setDescription("Grande image en bas de l'annonce"))
    .addAttachmentOption((o) => o.setName('miniature').setDescription('Petite image en haut à droite (logo du serveur par défaut)'))
    .addStringOption((o) => o.setName('couleur').setDescription('Couleur hex, ex : #f5c518'))
    .addStringOption((o) =>
      o
        .setName('ping')
        .setDescription('Mention à ajouter')
        .addChoices({ name: '@everyone', value: 'everyone' }, { name: '@here', value: 'here' })
    )
    .addRoleOption((o) => o.setName('role').setDescription('Rôle à mentionner'))
    .addStringOption((o) => o.setName('lien').setDescription('Lien pour ajouter un bouton (https://...)'))
    .addStringOption((o) => o.setName('bouton').setDescription('Texte du bouton (En savoir plus par défaut)')),
  async (i) => {
    const image = i.options.getAttachment('image');
    const miniature = i.options.getAttachment('miniature');
    const lien = i.options.getString('lien');

    for (const a of [image, miniature])
      if (a && !a.contentType?.startsWith('image/'))
        return i.reply({ content: '❌ Les fichiers doivent être des images (png, jpg, gif...).', ...eph });
    if (lien && !/^https?:\/\//i.test(lien))
      return i.reply({ content: '❌ Le lien doit commencer par https://', ...eph });

    const hex = parseInt((i.options.getString('couleur') ?? '').replace('#', ''), 16);
    const ext = (a) => path.extname(a.name || '') || '.png';

    pendingAnnonces.set(i.id, {
      channelId: (i.options.getChannel('salon') ?? i.channel).id,
      color: Number.isNaN(hex) ? 0xf5c518 : hex,
      image: image ? { url: image.url, name: `image${ext(image)}` } : null,
      miniature: miniature ? { url: miniature.url, name: `miniature${ext(miniature)}` } : null,
      ping: i.options.getString('ping'),
      roleId: i.options.getRole('role')?.id ?? null,
      lien,
      bouton: i.options.getString('bouton') ?? 'En savoir plus',
    });
    setTimeout(() => pendingAnnonces.delete(i.id), 15 * 60 * 1000);

    const modal = new ModalBuilder()
      .setCustomId(`annonce:${i.id}`)
      .setTitle('Nouvelle annonce')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('titre')
            .setLabel('Titre')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(200)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('texte')
            .setLabel('Texte (retours à la ligne et :emoji: acceptés)')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(3900)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('footer')
            .setLabel('Pied de page (optionnel)')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(200)
            .setRequired(false)
        )
      );
    await i.showModal(modal);
  }
);

async function sendAnnonce(i) {
  const cfg = pendingAnnonces.get(i.customId.split(':')[1]);
  if (!cfg) return i.reply({ content: '❌ Cette annonce a expiré, refais `/annonce`.', ...eph });
  pendingAnnonces.delete(i.customId.split(':')[1]);

  await i.deferReply(eph);
  const g = i.guild;
  const channel = g.channels.cache.get(cfg.channelId);
  if (!channel) return i.editReply('❌ Le salon est introuvable.');

  const titre = parseEmojis(g, i.fields.getTextInputValue('titre'));
  const texte = parseEmojis(g, i.fields.getTextInputValue('texte'));
  const footer = i.fields.getTextInputValue('footer');
  const line = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';

  const embed = new EmbedBuilder()
    .setColor(cfg.color)
    .setAuthor({ name: g.name, iconURL: g.iconURL() ?? undefined })
    .setTitle(titre)
    .setDescription(`${line}\n\n${texte}\n\n${line}`)
    .setFooter({ text: footer ? parseEmojis(g, footer) : g.name, iconURL: g.iconURL() ?? undefined })
    .setTimestamp();

  const files = [];
  if (cfg.image) {
    files.push({ attachment: cfg.image.url, name: cfg.image.name });
    embed.setImage(`attachment://${cfg.image.name}`);
  }
  if (cfg.miniature) {
    files.push({ attachment: cfg.miniature.url, name: cfg.miniature.name });
    embed.setThumbnail(`attachment://${cfg.miniature.name}`);
  } else if (g.iconURL()) {
    embed.setThumbnail(g.iconURL({ size: 256 }));
  }

  let content = '';
  if (cfg.ping === 'everyone') content += '@everyone ';
  if (cfg.ping === 'here') content += '@here ';
  if (cfg.roleId) content += `<@&${cfg.roleId}>`;

  const components = cfg.lien
    ? [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel(cfg.bouton).setURL(cfg.lien).setStyle(ButtonStyle.Link))]
    : [];

  await channel.send({
    content: content.trim() || undefined,
    embeds: [embed],
    components,
    files,
    allowedMentions: { parse: cfg.ping ? ['everyone'] : [], roles: cfg.roleId ? [cfg.roleId] : [] },
  });
  await i.editReply(`✅ Annonce envoyée dans ${channel}.`);
}

// ============================================================
//  FUN
// ============================================================
add(
  '🎮 Fun',
  new SlashCommandBuilder()
    .setName('de')
    .setDescription('Lance un dé')
    .addIntegerOption((o) => o.setName('faces').setDescription('Nombre de faces (6 par défaut)').setMinValue(2).setMaxValue(1000)),
  async (i) => {
    const faces = i.options.getInteger('faces') ?? 6;
    await i.reply(`🎲 Dé à ${faces} faces : **${Math.floor(Math.random() * faces) + 1}**`);
  }
);

add('🎮 Fun', new SlashCommandBuilder().setName('pileouface').setDescription('Lance une pièce'), async (i) => {
  await i.reply(`🪙 **${Math.random() < 0.5 ? 'Pile' : 'Face'}** !`);
});

add(
  '🎮 Fun',
  new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Pose une question à la boule magique')
    .addStringOption((o) => o.setName('question').setDescription('Ta question').setRequired(true)),
  async (i) => {
    const reponses = ['Oui, sans aucun doute.', 'Non.', 'Peut-être...', "C'est très probable.", 'Je ne pense pas.', 'Redemande plus tard.', 'Absolument !', 'Pas du tout.'];
    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle('🎱 Boule magique')
      .addFields(
        { name: 'Question', value: i.options.getString('question') },
        { name: 'Réponse', value: reponses[Math.floor(Math.random() * reponses.length)] }
      );
    await i.reply({ embeds: [embed] });
  }
);

// ============================================================
//  BIENVENUE
// ============================================================
const WELCOME_FILE = path.join(__dirname, 'bienvenue.json');
const DEFAULT_WELCOME = 'Welcome to Cam Tweaks';

function loadWelcome() {
  return loadJson(WELCOME_FILE);
}
function saveWelcome(data) {
  saveJson(WELCOME_FILE, data);
}

function buildWelcome(member, conf) {
  const g = member.guild;
  const text = (conf.message || DEFAULT_WELCOME)
    .replaceAll('{user}', `${member}`)
    .replaceAll('{server}', g.name)
    .replaceAll('{count}', String(g.memberCount));

  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle('WELCOME TO CAM TWEAKS')
    .setDescription(text)
    .addFields({ name: 'Membres', value: `${g.memberCount}` })
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: g.name })
    .setTimestamp();
  if (conf.image) embed.setImage(conf.image);

  return { content: `${member}`, embeds: [embed], allowedMentions: { users: [member.id] } };
}

add(
  '👋 Bienvenue',
  new SlashCommandBuilder()
    .setName('bienvenue')
    .setDescription('Configure le message de bienvenue automatique')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('setup')
        .setDescription('Active et configure le message de bienvenue')
        .addChannelOption((o) =>
          o.setName('salon').setDescription('Salon des arrivées').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
        .addRoleOption((o) => o.setName('role').setDescription('Rôle donné automatiquement aux nouveaux membres (ex : Members)'))
        .addStringOption((o) => o.setName('image').setDescription("Lien direct d'une grande image (https://...)"))
        .addStringOption((o) =>
          o.setName('message').setDescription('Texte perso. Variables : {user} {server} {count}')
        )
    )
    .addSubcommand((s) => s.setName('test').setDescription('Teste le message de bienvenue avec ton profil'))
    .addSubcommand((s) => s.setName('off').setDescription('Désactive le message de bienvenue')),
  async (i) => {
    const sub = i.options.getSubcommand();
    const all = loadWelcome();

    if (sub === 'setup') {
      const channel = i.options.getChannel('salon');
      const image = i.options.getString('image');
      const message = i.options.getString('message');
      const role = i.options.getRole('role');
      if (image && !/^https?:\/\//i.test(image))
        return i.reply({ content: "❌ L'image doit être un lien qui commence par https://", ...eph });

      if (role) {
        const me = i.guild.members.me;
        if (role.managed || role.id === i.guild.id)
          return i.reply({ content: '❌ Ce rôle ne peut pas être donné automatiquement (rôle de bot ou @everyone).', ...eph });
        if (!me.permissions.has(PermissionFlagsBits.ManageRoles))
          return i.reply({ content: '❌ Il me manque la permission **Gérer les rôles**.', ...eph });
        if (me.roles.highest.comparePositionTo(role) <= 0)
          return i.reply({
            content: `❌ Mon rôle doit être **au-dessus** de ${role} dans Paramètres du serveur → Rôles.`,
            ...eph,
          });
      }

      all[i.guild.id] = { channelId: channel.id, roleId: role?.id ?? null, image: image ?? null, message: message ?? null };
      saveWelcome(all);
      await i.reply({
        content: `✅ Bienvenue activé dans ${channel}.${role ? ` Le rôle ${role} sera donné automatiquement.` : ''} Utilise \`/bienvenue test\` pour voir le rendu.`,
        allowedMentions: { parse: [] },
        ...eph,
      });
    } else if (sub === 'test') {
      const conf = all[i.guild.id];
      if (!conf) return i.reply({ content: "❌ Fais d'abord `/bienvenue setup`.", ...eph });
      const channel = i.guild.channels.cache.get(conf.channelId);
      if (!channel) return i.reply({ content: '❌ Le salon configuré est introuvable.', ...eph });
      await channel.send(buildWelcome(i.member, conf));
      await i.reply({ content: `✅ Aperçu envoyé dans ${channel}.`, ...eph });
    } else if (sub === 'off') {
      delete all[i.guild.id];
      saveWelcome(all);
      await i.reply({ content: '✅ Message de bienvenue désactivé.', ...eph });
    }
  }
);

client.on(Events.GuildMemberAdd, async (member) => {
  const conf = loadWelcome()[member.guild.id];
  if (!conf) return;

  // Rôle automatique (pas pour les bots)
  if (conf.roleId && !member.user.bot) {
    await member.roles.add(conf.roleId, "Rôle automatique à l'arrivée").catch((err) =>
      console.error('❌ Impossible de donner le rôle (permission ou hiérarchie) :', err.message)
    );
  }

  if (!conf.channelId) return;
  const channel = member.guild.channels.cache.get(conf.channelId);
  if (!channel) return;
  await channel.send(buildWelcome(member, conf)).catch(console.error);
});

// ============================================================
//  ENREGISTREMENT DES COMMANDES
//  (remplace TOUTES les anciennes commandes du serveur)
// ============================================================
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once(Events.ClientReady, async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  client.user.setPresence({
    status: 'online',
    activities: [{ name: '/help', type: ActivityType.Watching }],
  });

  // Prépare la réserve de clés (10 000+ clés Gold libres, etc.)
  try {
    const pool = loadPool();
    if (fillPool(pool)) savePool(pool);
    for (const r of RANK_NAMES)
      console.log(`🔑 Réserve ${r.toUpperCase()} : ${pool[r].free.length} libres · ${Object.keys(pool[r].taken).length} attribuées`);
  } catch (err) {
    console.error('❌ Erreur lors de la préparation des clés :', err);
  }

  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands.map((c) => c.data.toJSON()),
    });
    console.log(`✅ ${commands.length} commandes enregistrées (anciennes supprimées)`);
  } catch (err) {
    console.error("❌ Erreur à l'enregistrement des commandes :", err);
  }
});

// ============================================================
//  GESTION DES INTERACTIONS
// ============================================================
client.on(Events.InteractionCreate, async (i) => {
  try {
    if (i.isChatInputCommand()) {
      const cmd = commands.find((c) => c.data.name === i.commandName);
      if (cmd) await cmd.execute(i);
    } else if (i.isStringSelectMenu()) {
      if (i.customId.startsWith('ticket_select') || i.customId.startsWith('prod_select')) await openTicket(i);
      else if (i.customId.startsWith('rank_details')) await showRankDetails(i);
    } else if (i.isButton()) {
      if (i.customId.startsWith('ticket_open')) await openTicket(i); // anciens panels à bouton
      else if (i.customId.startsWith('rank_buy')) await openTicket(i); // panel des rangs
      else if (i.customId === 'ticket_close') await closeTicket(i);
      else if (i.customId === 'ticket_claim') await claimTicket(i);
    } else if (i.isModalSubmit()) {
      if (i.customId.startsWith('annonce:')) await sendAnnonce(i);
    }
  } catch (err) {
    console.error(err);
    const msg = { content: "❌ Une erreur est survenue (vérifie que j'ai bien les permissions nécessaires).", ...eph };
    if (i.deferred || i.replied) await i.followUp(msg).catch(() => {});
    else await i.reply(msg).catch(() => {});
  }
});

startKeyApi();
client.login(TOKEN);