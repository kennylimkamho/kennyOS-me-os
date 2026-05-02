import { db, generateId } from '../database/index.js';

// Generate morning brief for Kenny
// Run after daily consolidation

async function generateBrief() {
  console.log('Generating morning brief...');

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  let brief = `# Morning Brief - ${dateStr}\n\n`;

  // 1. Yesterday's activity
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const yesterdayEvents = db.prepare(`
    SELECT COUNT(*) as count FROM raw_events
    WHERE date(timestamp) = ?
  `).get(yesterdayStr) as any;

  brief += `## 📊 Yesterday (${yesterdayStr})\n`;
  brief += `- Events captured: ${yesterdayEvents.count}\n\n`;

  // 2. Pending cards
  const pendingCards = db.prepare(`
    SELECT * FROM cards WHERE action_taken = 'pending'
    ORDER BY created_at DESC LIMIT 5
  `).all();

  brief += `## 🎴 Pending Actions\n`;
  if (pendingCards.length) {
    pendingCards.forEach((c: any) => {
      brief += `- [${c.type}] ${c.title}\n`;
    });
  } else {
    brief += `- No pending actions\n`;
  }
  brief += '\n';

  // 3. People needing attention
  const stale = db.prepare(`
    SELECT name, last_interaction,
           julianday('now') - julianday(last_interaction) as days
    FROM people
    WHERE last_interaction IS NOT NULL
    ORDER BY days DESC
    LIMIT 5
  `).all();

  brief += `## 👥 People to Connect\n`;
  stale.forEach((p: any) => {
    brief += `- ${p.name}: ${Math.floor(p.days)} days since last contact\n`;
  });

  // 4. Recent decisions
  const recentDecisions = db.prepare(`
    SELECT date, topic FROM decisions
    ORDER BY date DESC LIMIT 3
  `).all();

  brief += `## 📋 Recent Decisions\n`;
  recentDecisions.forEach((d: any) => {
    brief += `- ${d.date}: ${d.topic}\n`;
  });

  // 5. Game state
  const state = db.prepare("SELECT * FROM game_state WHERE id = 'kenny'").get() as any;
  brief += `\n## 🎮 Game State\n`;
  brief += `Level: ${state?.player_level || 1}\n`;
  brief += `XP: ${state?.total_xp || 0}\n`;
  brief += `HP: ${state?.hp || 100}/100\n`;
  brief += `MP: ${state?.mp || 100}/100\n`;

  console.log(brief);

  // Save to file
  await Bun.write('./morning-brief.md', brief);

  console.log('Morning brief generated!');

  return brief;
}

generateBrief();