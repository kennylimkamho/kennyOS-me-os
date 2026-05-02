import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  addRawEvent,
  addDecision,
  addPerson,
  getPeople,
  getDecisions,
  getSemanticFacts,
  getGameState,
  addXP,
  updatePersonInteraction,
  addKnowledgeArticle,
  searchKnowledge,
  getEpisodicLogs,
} from '../database/index.js';

// MCP Server for KennyOS
// Exposes tools to Claude Code and other agents

const server = new Server(
  {
    name: 'kennyos-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'me_capture',
        description: 'Capture any input to KennyOS inbox (L4 raw event)',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'The content to capture' },
            source: { type: 'string', enum: ['whatsapp', 'lark', 'email', 'meeting', 'manual', 'article'], description: 'Source of the input' },
            type: { type: 'string', enum: ['message', 'note', 'idea', 'link'], description: 'Type of content' },
            metadata: { type: 'object', description: 'Additional metadata (sender, participants, etc.)' }
          },
          required: ['content', 'source']
        }
      },
      {
        name: 'me_status',
        description: 'Get current game state (XP, level, HP, MP, stats)',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'me_search',
        description: 'Search across all knowledge (decisions, people, research, articles)',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            category: { type: 'string', enum: ['all', 'decisions', 'people', 'research', 'articles'], description: 'Category to search' }
          },
          required: ['query']
        }
      },
      {
        name: 'me_decisions_list',
        description: 'Get recent decisions',
        inputSchema: { type: 'object', properties: { limit: { type: 'number', default: 20 } } }
      },
      {
        name: 'me_people_list',
        description: 'Get all people in the system',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'me_add_decision',
        description: 'Add a new decision record',
        inputSchema: {
          type: 'object',
          properties: {
            topic: { type: 'string', description: 'Decision topic' },
            decision: { type: 'string', description: 'What was decided' },
            rationale: { type: 'string', description: 'Why this decision was made' },
            stakeholders: { type: 'array', items: { type: 'string' }, description: 'People involved' }
          },
          required: ['topic', 'decision']
        }
      },
      {
        name: 'me_add_person',
        description: 'Add a new person to the system',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Person name' },
            role: { type: 'string', description: 'Their role' },
            company: { type: 'string', description: 'Their company' },
            access: { type: 'string', enum: ['public', 'restricted', 'confidential'], default: 'restricted' }
          },
          required: ['name']
        }
      },
      {
        name: 'me_interaction',
        description: 'Record an interaction with a person',
        inputSchema: {
          type: 'object',
          properties: {
            person_slug: { type: 'string', description: 'Person slug (URL-friendly name)' },
            type: { type: 'string', enum: ['meeting', 'call', 'message', 'project', 'milestone'], description: 'Interaction type' },
            description: { type: 'string', description: 'What happened' }
          },
          required: ['person_slug', 'type', 'description']
        }
      },
      {
        name: 'me_article_save',
        description: 'Save an article to knowledge base',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Article URL' },
            title: { type: 'string', description: 'Article title' },
            summary: { type: 'string', description: 'Key summary' },
            insights: { type: 'array', items: { type: 'string' }, description: 'Key insights' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' }
          },
          required: ['url', 'title']
        }
      },
      {
        name: 'me_episodic_get',
        description: 'Get episodic logs (daily/weekly summaries)',
        inputSchema: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['daily', 'weekly'], default: 'weekly' },
            limit: { type: 'number', default: 10 }
          }
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'me_capture': {
        const { content, source, type = 'note', metadata } = args;
        const id = addRawEvent(source, type, content, metadata);
        addXP(1); // 1 XP for capturing
        return {
          content: [{ type: 'text', text: `Captured to inbox: ${id}` }]
        };
      }

      case 'me_status': {
        const state = getGameState();
        return {
          content: [{
            type: 'text',
            text: `🎮 KennyOS Status\n\nLevel: ${state.player_level}\nXP: ${state.total_xp}\nHP: ${state.hp}/100\nMP: ${state.mp}/100\nStats: ${JSON.stringify(state.stats)}`
          }]
        };
      }

      case 'me_search': {
        const { query, category = 'all' } = args;
        const results = searchKnowledge(query);

        // Also search decisions and people
        const decisions = getDecisions(5).filter(d =>
          d.topic?.toLowerCase().includes(query.toLowerCase()) ||
          d.decision?.toLowerCase().includes(query.toLowerCase())
        );

        const people = getPeople().filter(p =>
          p.name?.toLowerCase().includes(query.toLowerCase()) ||
          p.company?.toLowerCase().includes(query.toLowerCase())
        );

        return {
          content: [{
            type: 'text',
            text: `Search results for "${query}":\n\n` +
              `📄 Articles (${results.length}):\n` + results.map(r => `  - ${r.title}`).join('\n') + '\n\n' +
              `📋 Decisions (${decisions.length}):\n` + decisions.map(d => `  - ${d.topic}`).join('\n') + '\n\n' +
              `👥 People (${people.length}):\n` + people.map(p => `  - ${p.name} (${p.company})`).join('\n')
          }]
        };
      }

      case 'me_decisions_list': {
        const decisions = getDecisions(args.limit || 20);
        return {
          content: [{
            type: 'text',
            text: `📋 Recent Decisions:\n\n` +
              decisions.map(d => `**${d.date}: ${d.topic}**\n${d.decision}\n`).join('\n')
          }]
        };
      }

      case 'me_people_list': {
        const people = getPeople();
        return {
          content: [{
            type: 'text',
            text: `👥 People (${people.length}):\n\n` +
              people.map(p => `${p.name} - ${p.role || 'N/A'} @ ${p.company || 'N/A'} (Bond: ${p.bond_level}/10)`).join('\n')
          }]
        };
      }

      case 'me_add_decision': {
        const { topic, decision, rationale, stakeholders } = args;
        const id = addDecision(topic, decision, rationale, stakeholders);
        addXP(20); // 20 XP for recording a decision
        return {
          content: [{ type: 'text', text: `Decision recorded: ${id}` }]
        };
      }

      case 'me_add_person': {
        const { name, role, company, access = 'restricted' } = args;
        const slug = name.toLowerCase().replace(/\s+/g, '-');
        const id = addPerson(name, slug, role, company);
        addXP(10); // 10 XP for adding a contact
        return {
          content: [{ type: 'text', text: `Person added: ${name} (${slug})` }]
        };
      }

      case 'me_interaction': {
        const { person_slug, type, description } = args;
        updatePersonInteraction(person_slug, type, description);
        addXP(5); // 5 XP for maintaining a relationship
        return {
          content: [{ type: 'text', text: `Interaction with ${person_slug} recorded` }]
        };
      }

      case 'me_article_save': {
        const { url, title, summary, insights, tags } = args;
        const id = addKnowledgeArticle(url, title, summary, insights, tags);
        addXP(15); // 15 XP for saving knowledge
        return {
          content: [{ type: 'text', text: `Article saved: ${title}` }]
        };
      }

      case 'me_episodic_get': {
        const logs = getEpisodicLogs(args.period || 'weekly', args.limit || 10);
        return {
          content: [{
            type: 'text',
            text: `📅 ${args.period || 'weekly'} episodic logs (${logs.length}):\n\n` +
              logs.map(l => `**${l.period_start}:** ${l.content.slice(0, 100)}...`).join('\n\n')
          }]
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('KennyOS MCP Server running...');
}

main().catch(console.error);