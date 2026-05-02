import { db, generateId, now } from '../database/index.js';

// Daily consolidation script
// Run by cron job to update memory

async function consolidate() {
  console.log('Starting daily consolidation...');

  // 1. Check for unprocessed inbox items
  const unprocessed = db.prepare('SELECT * FROM raw_events WHERE processed = 0').all();

  console.log(`Found ${unprocessed.length} unprocessed events`);

  // 2. Process each event
  for (const event of unprocessed) {
    console.log(`Processing: ${event.id} - ${event.type}`);

    // Mark as processed
    db.prepare('UPDATE raw_events SET processed = 1 WHERE id = ?').run(event.id);

    // Based on type, do different actions
    switch (event.source) {
      case 'meeting':
        // Extract to episodic log
        createEpisodicLog(event);
        break;
      case 'article':
        // Already processed in capture
        break;
      default:
        break;
    }
  }

  // 3. Generate daily summary
  generateDailySummary();

  // 4. Check for stale relationships
  checkStaleRelationships();

  console.log('Consolidation complete!');
}

function createEpisodicLog(event: any) {
  // Create or update daily episodic log
  const today = new Date().toISOString().split('T')[0];
  const existing = db.prepare('SELECT * FROM episodic_logs WHERE period_type = ? AND period_start = ?')
    .get('daily', today);

  if (existing) {
    // Append to existing
    const content = JSON.parse(existing.content || '{}');
    content.events = content.events || [];
    content.events.push({
      timestamp: event.timestamp,
      source: event.source,
      type: event.type,
      preview: event.content.slice(0, 200)
    });
    db.prepare('UPDATE episodic_logs SET content = ? WHERE id = ?')
      .run(JSON.stringify(content), existing.id);
  } else {
    // Create new
    const id = generateId();
    db.prepare(`
      INSERT INTO episodic_logs (id, period_type, period_start, content, key_events)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, 'daily', today, JSON.stringify({
      events: [{
        timestamp: event.timestamp,
        source: event.source,
        type: event.type,
        preview: event.content.slice(0, 200)
      }]
    }), JSON.stringify([]));
  }
}

function generateDailySummary() {
  const today = new Date().toISOString().split('T')[0];

  // Count today's events
  const events = db.prepare(`
    SELECT COUNT(*) as count, source,
           GROUP_CONCAT(type) as types
    FROM raw_events
    WHERE date(timestamp) = ?
    GROUP BY source
  `).all(today);

  console.log(`Today's summary for ${today}:`, events);
}

function checkStaleRelationships() {
  // Find people who haven't been contacted in 14+ days
  const stale = db.prepare(`
    SELECT slug, name, last_interaction,
           julianday('now') - julianday(last_interaction) as days_since
    FROM people
    WHERE last_interaction IS NOT NULL
    HAVING days_since > 14
  `).all();

  if (stale.length > 0) {
    console.log('⚠️ Stale relationships (14+ days):');
    stale.forEach((p: any) => {
      console.log(`  - ${p.name}: ${Math.floor(p.days_since)} days`);
    });

    // Create proactive card
    const id = generateId();
    db.prepare(`
      INSERT INTO cards (id, type, title, content, generated_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, 'relationship',
      `Time to contact ${stale[0].name}?`,
      JSON.stringify({ people: stale, action: 'Schedule follow-up' }),
      'consolidation-agent'
    );
  }
}

// Run
consolidate();