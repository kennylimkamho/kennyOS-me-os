import { serve } from 'bun';
import index from './index.html';
import { getGameState, getDecisions, getPeople, searchKnowledge, addRawEvent, addXP } from '../database/index.ts';

const PORT = process.env.PORT || 3000;

serve({
  port: Number(PORT),
  routes: {
    '/': index,

    'GET /api/status': () => Response.json(getGameState()),

    'GET /api/decisions': () => Response.json(getDecisions(20)),

    'GET /api/people': () => Response.json(getPeople()),

    'GET /api/search': (req) => {
      const url = new URL(req.url);
      const query = url.searchParams.get('q') || '';
      return Response.json(searchKnowledge(query));
    },

    'POST /api/chat': async (req) => {
      const { message } = await req.json();
      const lowerMsg = message.toLowerCase();
      let response = '';

      if (lowerMsg.includes('status') || lowerMsg.includes('狀態')) {
        const state = getGameState() as any;
        response = `🎮 遊戲狀態\n\nLevel: ${state.player_level}\nXP: ${state.total_xp}\nHP: ${state.hp}/100\nMP: ${state.mp}/100`;
      }
      else if (lowerMsg.includes('decision') || lowerMsg.includes('決策')) {
        const decisions = getDecisions(5);
        response = '📋 最近決策：\n\n' + decisions.map((d: any) =>
          `**${d.date}**: ${d.topic}\n   ${d.decision.slice(0, 100)}...`
        ).join('\n\n');
      }
      else if (lowerMsg.includes('dr.baba') || lowerMsg.includes('drbaba')) {
        response = 'Dr.BaBa 係你嘅 AI 醫療助手項目。目標係 70% 準確率，WhatsApp-native。';
      }
      else if (lowerMsg.includes('chatdaddy')) {
        response = 'ChatDaddy: HKD 10M+ ARR，Kenny 持股 56.37%。係 WhatsApp CRM SaaS 龍頭。';
      }
      else {
        response = `我收到：「${message}」\n\n試下問我：「status」「decisions」或者「search AI」`;
      }

      return Response.json({ response });
    },

    'POST /api/capture': async (req) => {
      const { content, source = 'manual', type = 'note' } = await req.json();
      const id = addRawEvent(source, type, content, {});
      addXP(1);
      return Response.json({ success: true, id, xp: 1 });
    }
  },

  websocket: {
    open(ws) { console.log('Client connected'); },
    message(ws, message) { console.log('Message:', message); },
    close(ws) { console.log('Client disconnected'); }
  },

  development: { hmr: true }
});

console.log(`🚀 KennyOS running at http://localhost:${PORT}`);