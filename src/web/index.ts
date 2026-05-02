import index from './index.html';
import { getGameState, getDecisions, getPeople, searchKnowledge, addRawEvent, addXP } from '../database/index.ts';

const PORT = process.env.PORT || 3000;

Bun.serve({
  port: Number(PORT),

  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Static files
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
        mp: state?.mp || 100,
        stats: state?.stats || {}
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
            `${p.name} - ${p.role || 'N/A'} @ ${p.company || 'N/A'} (Bond: ${p.bond_level}/10)`
          ).join('\n');
        }
        else if (lowerMsg.includes('dr.baba') || lowerMsg.includes('drbaba')) {
          response = 'Dr.BaBa 係你嘅 AI 醫療助手項目。\n\n📊 最新狀態：\n- 蘇醫生係 Medical Advisor（腫瘤科）\n- 目標：70% 準確率\n- 定位：WhatsApp-native AI 健康助手\n\n你有關於 Dr.BaBa 嘅問題？';
        }
        else if (lowerMsg.includes('chatdaddy')) {
          response = 'ChatDaddy / TNT 係你嘅旗艦產品：\n\n📊 狀態：\n- Revenue: HKD 10M+ ARR\n- Kenny 持股: 56.37%\n- David Ooi 係 CS/Growth Lead\n- 主要對手: 不適用（係龍頭）\n\n你想知更多？';
        }
        else if (lowerMsg.includes('search') || lowerMsg.includes('搵')) {
          const query = message.replace(/search|搵|searching/gi, '').trim();
          if (query) {
            const results = searchKnowledge(query);
            response = `🔍 搵到 "${query}" 相關嘅結果：\n\n`;
            if (results.length) {
              results.forEach((r: any) => {
                response += `📄 ${r.title}\n   ${r.summary || 'No summary'}\n\n`;
              });
            } else {
              response += '冇搵到任何結果。';
            }
          } else {
            response = '你想搵咩？試下話 "search AI strategy"';
          }
        }
        else {
          response = `我收到咗你嘅訊息：「${message}」\n\n`;
          response += '我係 KennyOS，你嘅 Personal AI Brain。我可以幫你：\n\n';
          response += '• 查詢 decisions、people、projects\n';
          response += '• 搜索 knowledge base\n';
          response += '• 顯示遊戲狀態（XP、Level）\n\n';
          response += '試下問我：「我的 decisions 有幾多？」或者「搵 AI」';
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
  },

  websocket: {
    open(ws) { console.log('Client connected'); },
    message(ws, message) { console.log('Message:', message); },
    close(ws) { console.log('Client disconnected'); }
  }
});

console.log(`🚀 KennyOS running at http://localhost:${PORT}`);