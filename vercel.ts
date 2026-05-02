import { serve } from 'bun';
import index from './src/web/index.html';
import { getGameState, getDecisions, getPeople, searchKnowledge, addRawEvent, addXP } from './src/database/index.ts';

const PORT = process.env.PORT || 3000;

serve({
  port: Number(PORT),

  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Static HTML
    if (path === '/' || path === '/index.html') {
      return new Response(index, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // API Routes
    if (path === '/api/status' && req.method === 'GET') {
      const state = getGameState() as any;
      return Response.json({
        player_level: state?.player_level || 1,
        total_xp: state?.total_xp || 0,
        hp: state?.hp || 100,
        mp: state?.mp || 100
      });
    }

    if (path === '/api/decisions' && req.method === 'GET') {
      return Response.json(getDecisions(20));
    }

    if (path === '/api/people' && req.method === 'GET') {
      return Response.json(getPeople());
    }

    if (path === '/api/search' && req.method === 'GET') {
      const query = url.searchParams.get('q') || '';
      return Response.json(searchKnowledge(query));
    }

    if (path === '/api/chat' && req.method === 'POST') {
      return req.json().then(async ({ message }: { message: string }) => {
        const lowerMsg = message.toLowerCase();
        let response = '';

        if (lowerMsg.includes('status') || lowerMsg.includes('狀態')) {
          const state = getGameState() as any;
          response = `🎮 遊戲狀態\n\nLevel: ${state.player_level}\nXP: ${state.total_xp}\nHP: ${state.hp}/100\nMP: ${state.mp}/100`;
        }
        else if (lowerMsg.includes('decision') || lowerMsg.includes('決策')) {
          const decisions = getDecisions(5);
          response = '📋 最近決策：\n\n' + decisions.map((d: any) =>
            `**${d.date}**: ${d.topic}\n   ${d.decision?.slice(0, 100)}...`
          ).join('\n\n');
        }
        else if (lowerMsg.includes('people') || lowerMsg.includes('人')) {
          const people = getPeople();
          response = '👥 People:\n\n' + people.map((p: any) =>
            `${p.name} - ${p.role || 'N/A'} @ ${p.company || 'N/A'}`
          ).join('\n');
        }
        else if (lowerMsg.includes('dr.baba') || lowerMsg.includes('drbaba')) {
          response = 'Dr.BaBa 係你嘅 AI 醫療助手項目。目標係 70% 準確率，WhatsApp-native。';
        }
        else if (lowerMsg.includes('chatdaddy')) {
          response = 'ChatDaddy: HKD 10M+ ARR，Kenny 持股 56.37%。係 WhatsApp CRM SaaS 龍頭。';
        }
        else {
          response = `我收到：「${message}」\n\n試下問我：「status」「decisions」或者「人」`;
        }

        return Response.json({ response });
      });
    }

    if (path === '/api/capture' && req.method === 'POST') {
      return req.json().then(({ content, source = 'manual', type = 'note' }: any) => {
        const id = addRawEvent(source, type, content, {});
        addXP(1);
        return Response.json({ success: true, id, xp: 1 });
      });
    }

    return new Response('Not Found', { status: 404 });
  }
});

console.log(`🚀 KennyOS running`);