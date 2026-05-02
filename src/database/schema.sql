-- KennyOS Database Schema
-- Using SQLite for local, Turso for cloud sync

-- L4: Raw Event Log (append-only source of truth)
CREATE TABLE raw_events (
  id TEXT PRIMARY KEY,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source TEXT NOT NULL,           -- 'whatsapp', 'lark', 'email', 'meeting', 'manual'
  type TEXT NOT NULL,             -- 'message', 'event', 'note', 'commit'
  content TEXT,                    -- raw content
  metadata JSON,                   -- source-specific (sender, participants, etc.)
  processed BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_raw_events_timestamp ON raw_events(timestamp);
CREATE INDEX idx_raw_events_source ON raw_events(source);
CREATE INDEX idx_raw_events_processed ON raw_events(processed);

-- L3: Semantic Memory (structured facts)
CREATE TABLE semantic_facts (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,         -- 'decision', 'person', 'research', 'project'
  entity_id TEXT,                  -- link to person/project if applicable
  content TEXT NOT NULL,
  confidence INTEGER DEFAULT 50,   -- 0-100, how confident
  last_confirmed DATETIME,
  source_event_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_event_id) REFERENCES raw_events(id)
);

CREATE INDEX idx_semantic_category ON semantic_facts(category);
CREATE INDEX idx_semantic_entity ON semantic_facts(entity_id);

-- L2: Compressed Episodic (summarized segments)
CREATE TABLE episodic_logs (
  id TEXT PRIMARY KEY,
  period_type TEXT NOT NULL,      -- 'daily', 'weekly', 'monthly'
  period_start DATE NOT NULL,
  content TEXT NOT NULL,           -- summarized content
  key_events JSON,                 -- [{date, event, people}]
  decisions_made JSON,
  people_interactions JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_episodic_period ON episodic_logs(period_type, period_start);

-- L0: Eternal (identity-defining facts)
CREATE TABLE eternal_facts (
  id TEXT PRIMARY KEY,
  fact_type TEXT NOT NULL,        -- 'identity', 'value', 'preference', 'constraint'
  content TEXT NOT NULL,
  source TEXT,                     -- 'explicit', 'inferred', 'learned'
  confirmed BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Game State (for Me OS gamification)
CREATE TABLE game_state (
  id TEXT PRIMARY KEY DEFAULT 'kenny',
  player_level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  hp INTEGER DEFAULT 100,
  mp INTEGER DEFAULT 100,
  stats JSON DEFAULT '{"knowledge":1,"connections":1,"building":1,"strategy":1,"fitness":1}',
  streak_days INTEGER DEFAULT 0,
  last_active DATE,
  achievements JSON DEFAULT '[]',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Quests
CREATE TABLE quests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'side',       -- 'main', 'side', 'daily'
  status TEXT DEFAULT 'active',   -- 'active', 'completed', 'abandoned'
  xp_reward INTEGER,
  linked_plan TEXT,
  started_at DATETIME,
  completed_at DATETIME
);

-- Cards (Insight/Quest/Relationship)
CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,             -- 'insight', 'quest', 'relationship'
  title TEXT,
  content JSON,
  action_taken TEXT DEFAULT 'pending',  -- 'pending', 'acted', 'dismissed', 'snoozed'
  xp_if_acted INTEGER,
  generated_by TEXT,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- People (L3 Empathetic Memory)
CREATE TABLE people (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,       -- URL-friendly name
  name TEXT NOT NULL,
  role TEXT,
  company TEXT,
  bond_level INTEGER DEFAULT 5,    -- 1-10
  access_level TEXT DEFAULT 'restricted',  -- 'public', 'restricted', 'confidential'
  static_info JSON,               -- role, company, location, etc.
  communication_prefs JSON,
  tags JSON,
  last_interaction DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- People Timeline (L2 Episodic for each person)
CREATE TABLE people_timeline (
  id TEXT PRIMARY KEY,
  person_slug TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL,        -- 'meeting', 'call', 'message', 'project', 'milestone'
  description TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (person_slug) REFERENCES people(slug)
);

CREATE INDEX idx_people_timeline_slug ON people_timeline(person_slug);
CREATE INDEX idx_people_timeline_date ON people_timeline(event_date);

-- Decisions
CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  topic TEXT NOT NULL,
  decision TEXT NOT NULL,
  rationale TEXT,
  alternatives JSON,
  impact TEXT,
  review_date DATE,
  stakeholders JSON,
  status TEXT DEFAULT 'active',    -- 'active', 'superseded', 'reversed'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',    -- 'active', 'paused', 'completed', 'archived'
  owner TEXT,
  external_links JSON,            -- Notion, Trello, CRM URLs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Articles (from web fetching)
CREATE TABLE knowledge_articles (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  key_insights JSON,
  access_level TEXT DEFAULT 'restricted',
  tags JSON,
  source TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_articles_tags ON knowledge_articles(tags);
CREATE INDEX idx_articles_access ON knowledge_articles(access_level);

-- MCP Integration (external tool configs)
CREATE TABLE mcp_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,              -- 'github', 'notion', 'lark', 'supabase'
  config JSON,                     -- encrypted credentials
  status TEXT DEFAULT 'active',
  last_sync DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sync Log (for tracking what changed when)
CREATE TABLE sync_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,            -- 'created', 'updated', 'deleted'
  source TEXT,                     -- 'local', 'remote', 'agent'
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trigger: Update updated_at on semantic_facts
CREATE TRIGGER update_semantic_timestamp
AFTER UPDATE ON semantic_facts
BEGIN
  UPDATE semantic_facts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_people_timestamp
AFTER UPDATE ON people
BEGIN
  UPDATE people SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_decisions_timestamp
AFTER UPDATE ON decisions
BEGIN
  UPDATE decisions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;