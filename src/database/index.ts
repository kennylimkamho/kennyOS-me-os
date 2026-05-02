import { Database } from 'bun:sqlite';

// Database path
const DB_PATH = './database/kennyos.db';

// Create database directory if needed
import { mkdirSync, existsSync } from 'fs';
if (!existsSync('./database')) {
  mkdirSync('./database', { recursive: true });
}

const db = new Database(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');

// Initialize schema (ignore if already exists)
const schema = await Bun.file('./src/database/schema.sql').text();
try {
  db.exec(schema);
} catch (e) {
  // Tables may already exist, ignore error
}

export default db;

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function now(): string {
  return new Date().toISOString();
}

// L4: Raw Event
export function addRawEvent(source: string, type: string, content: string, metadata?: object): string {
  const id = generateId();
  db.prepare(`
    INSERT INTO raw_events (id, source, type, content, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, source, type, content, JSON.stringify(metadata));
  return id;
}

// L3: Semantic Facts
export function getSemanticFacts(category?: string): object[] {
  if (category) {
    return db.prepare('SELECT * FROM semantic_facts WHERE category = ? ORDER BY updated_at DESC').all(category);
  }
  return db.prepare('SELECT * FROM semantic_facts ORDER BY updated_at DESC').all();
}

// L3: Decisions
export function addDecision(topic: string, decision: string, rationale?: string, stakeholders?: string[]): string {
  const id = generateId();
  db.prepare(`
    INSERT INTO decisions (id, date, topic, decision, rationale, stakeholders)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, now().split('T')[0], topic, decision, rationale, JSON.stringify(stakeholders));
  return id;
}

export function getDecisions(limit = 20): object[] {
  return db.prepare('SELECT * FROM decisions ORDER BY date DESC LIMIT ?').all(limit);
}

// L3: People
export function addPerson(name: string, role?: string, company?: string): string {
  const id = generateId();
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  db.prepare(`
    INSERT INTO people (id, slug, name, role, company, static_info)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, slug, name, role, company, JSON.stringify({ role, company }));
  return slug;
}

export function getPeople(): object[] {
  return db.prepare('SELECT * FROM people ORDER BY bond_level DESC').all();
}

export function updatePersonInteraction(slug: string, type: string, description: string): void {
  const id = generateId();
  db.prepare(`
    INSERT INTO people_timeline (id, person_slug, event_date, event_type, description)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, slug, now().split('T')[0], type, description);
  db.prepare('UPDATE people SET last_interaction = ? WHERE slug = ?').run(now(), slug);
}

// L3: Knowledge Articles
export function addKnowledgeArticle(url: string, title: string, summary?: string, keyInsights?: string[], tags?: string[]): string {
  const id = generateId();
  db.prepare(`
    INSERT INTO knowledge_articles (id, url, title, summary, key_insights, tags)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, url, title, summary, JSON.stringify(keyInsights), JSON.stringify(tags));
  return id;
}

export function searchKnowledge(query: string): object[] {
  const pattern = `%${query}%`;
  return db.prepare(`
    SELECT * FROM knowledge_articles
    WHERE title LIKE ? OR summary LIKE ? OR tags LIKE ?
    ORDER BY created_at DESC
  `).all(pattern, pattern, pattern);
}

// Game State
export function getGameState(): object {
  const row = db.prepare("SELECT * FROM game_state WHERE id = 'kenny'").get();
  return row || {
    id: 'kenny',
    player_level: 1,
    total_xp: 0,
    hp: 100,
    mp: 100,
    stats: { knowledge: 1, connections: 1, building: 1, strategy: 1, fitness: 1 },
    streak_days: 0
  };
}

export function addXP(amount: number): void {
  const state = getGameState() as any;
  const newXP = state.total_xp + amount;
  const newLevel = Math.floor(newXP / 1000) + 1;
  db.prepare('UPDATE game_state SET total_xp = ?, player_level = ?, updated_at = ? WHERE id = ?')
    .run(newXP, newLevel, now(), 'kenny');
}

// Episodic
export function getEpisodicLogs(periodType: string, limit = 10): object[] {
  return db.prepare('SELECT * FROM episodic_logs WHERE period_type = ? ORDER BY period_start DESC LIMIT ?').all(periodType, limit);
}

export { db };