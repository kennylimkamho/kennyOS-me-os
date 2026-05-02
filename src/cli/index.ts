#!/usr/bin/env bun

import { db, generateId, addRawEvent, getGameState, addXP } from '../database/index.js';

const command = Bun.argv[2] || 'help';
const args = Bun.argv.slice(3);

async function showHelp() {
  console.log(`
🎮 KennyOS CLI

Usage: me <command> [options]

Commands:
  capture <text>      Capture text to inbox
  status              Show game state (XP, level, HP, MP)
  search <query>      Search knowledge base
  decisions            List recent decisions
  people              List all people
  article <url>       Fetch and save article
  help                Show this help

Examples:
  me capture "Quick idea about Dr.BaBa pricing"
  me status
  me search "蘇醫生"
  me article https://sequoiacap.com/article/services-the-new-software/

XP Rewards:
  Capture: +1 XP
  Add decision: +20 XP
  Add person: +10 XP
  Record interaction: +5 XP
  Save article: +15 XP
`);
}

async function capture(text: string) {
  const id = addRawEvent('manual', 'note', text, {});
  addXP(1);
  console.log(`✅ Captured: ${id}`);
  console.log(`   +1 XP`);
}

async function status() {
  const state = getGameState() as any;
  const xpToNext = 1000 - (state.total_xp % 1000);

  console.log(`
╔══════════════════════════════════════════╗
║  KENNY                            Lv.${String(state.player_level).padStart(2)} ║
╠══════════════════════════════════════════╣
║                                          ║
║  HP  ██████████████████████████████████  ${state.hp}/100
║  MP  ██████████████████████████████████  ${state.mp}/100
║  XP  ████████████████████████░░░░  ${state.total_xp} / ${state.total_xp + xpToNext}
║                                          ║
║  🔥 Streak: ${state.streak_days} days
║                                          ║
║  STATS                                  ║
║  🧠 Knowledge    ███░░░  Lv.${state.stats?.knowledge || 1}
║  🤝 Connections  █████░░░░░░  Lv.${state.stats?.connections || 1}
║  🏗️  Building     ██████░░░  Lv.${state.stats?.building || 1}
║  📊 Strategy     ████░░░░░░  Lv.${state.stats?.strategy || 1}
║                                          ║
╚══════════════════════════════════════════╝
`);
}

async function search(query: string) {
  const { searchKnowledge } = await import('../database/index.js');

  const articles = searchKnowledge(query);

  console.log(`\n🔍 Search results for "${query}":\n`);

  if (articles.length) {
    console.log(`📄 Articles (${articles.length}):`);
    articles.forEach((a: any) => console.log(`   • ${a.title}`));
  } else {
    console.log('No results found.');
  }
}

async function decisions() {
  const { getDecisions } = await import('../database/index.js');
  const list = getDecisions(20);

  console.log('\n📋 Recent Decisions:\n');
  list.forEach((d: any) => {
    console.log(`**${d.date}** - ${d.topic}`);
    console.log(`   ${d.decision}`);
    console.log();
  });
}

async function people() {
  const { getPeople } = await import('../database/index.js');
  const list = getPeople();

  console.log(`\n👥 People (${list.length}):\n`);
  list.forEach((p: any) => {
    const bond = '█'.repeat(Math.floor(p.bond_level / 2)) + '░'.repeat(5 - Math.floor(p.bond_level / 2));
    console.log(`${p.name}`);
    console.log(`   ${p.role || 'N/A'} @ ${p.company || 'N/A'}`);
    console.log(`   Bond: ${bond} (${p.bond_level}/10)`);
    if (p.last_interaction) {
      console.log(`   Last: ${p.last_interaction}`);
    }
    console.log();
  });
}

async function article(url: string) {
  if (!url) {
    console.log('❌ Please provide a URL');
    return;
  }

  console.log(`Fetching article: ${url}...`);

  try {
    const response = await fetch(url);
    const html = await response.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

    const { addKnowledgeArticle } = await import('../database/index.js');
    const id = addKnowledgeArticle(url, title, '', [], ['article']);

    addXP(15);

    console.log(`✅ Article saved: ${title}`);
    console.log(`   +15 XP`);
  } catch (error) {
    console.log(`❌ Error fetching article: ${error.message}`);
  }
}

// Main
switch (command) {
  case 'capture':
    await capture(args.join(' '));
    break;
  case 'status':
    await status();
    break;
  case 'search':
    await search(args.join(' '));
    break;
  case 'decisions':
    await decisions();
    break;
  case 'people':
    await people();
    break;
  case 'article':
    await article(args[0]);
    break;
  default:
    await showHelp();
}