'use strict';

require('dotenv').config();

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT           = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('[오류] OPENAI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.');
  process.exit(1);
}

// ── Knowledge base ──────────────────────────────────────────────
function loadKnowledgeBase() {
  const dir   = path.join(__dirname, 'uploads');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  return files
    .map(f => `--- [${f}] ---\n${fs.readFileSync(path.join(dir, f), 'utf8')}`)
    .join('\n\n');
}

const KNOWLEDGE_BASE = loadKnowledgeBase();

const SYSTEM_PROMPT = `당신은 JYS 마케팅의 공식 상담봇입니다. 이름은 "JYS 상담봇"이며, JYS 마케팅의 서비스를 안내하는 역할을 합니다.

아래는 JYS 마케팅에 대한 공식 문서입니다. 이 내용만을 기반으로 답변하세요.

===== 지식 베이스 =====
${KNOWLEDGE_BASE}
========================

[답변 규칙]
1. 자기소개·대화형 질문("이름이 뭐야", "뭐 하는 봇이야" 등):
   친근하게 이름과 역할을 소개하세요. 예: "저는 JYS 마케팅 상담봇이에요. 서비스·패키지·프로세스에 대해 안내해 드립니다."

2. 서비스·정책 관련 질문:
   위 문서의 내용만 사용하세요. 문서에 없는 구체적인 가격·기간 등은 절대 창작하지 말고,
   "자세한 내용은 무료 상담을 통해 안내해 드립니다. contact@jysmarketing.co.kr 또는 02-0000-0000으로 문의해 주세요."라고 안내하세요.

3. JYS 마케팅과 무관한 질문(날씨·음식·일반 상식 등):
   "죄송해요, 저는 JYS 마케팅 서비스 관련 질문만 답변드릴 수 있어요. 서비스에 대해 궁금한 점이 있으시면 편하게 물어보세요!"라고 안내하세요.

[말투]
- 친근하고 따뜻한 존댓말 ("~해요", "~드릴게요")
- 과도한 이모지 사용 금지
- 간결하고 명확하게`;

// ── MIME map ────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.md':   'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

// ── Static file helper ──────────────────────────────────────────
function serveFile(res, filePath) {
  // Prevent directory traversal
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(__dirname))) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(resolved, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not Found');
    }
    const ext  = path.extname(resolved);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

// ── Chat handler ────────────────────────────────────────────────
async function handleChat(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;

  let parsed;
  try { parsed = JSON.parse(body); } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: '잘못된 요청 형식입니다.' }));
  }

  const { messages } = parsed;
  if (!Array.isArray(messages) || messages.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: '메시지 형식이 올바르지 않습니다.' }));
  }

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.slice(-10),
        ],
        temperature: 0.5,
        max_completion_tokens: 600,
      }),
    });

    const data = await openaiRes.json();

    if (!openaiRes.ok) {
      console.error('[OpenAI 오류]', data);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'AI 응답 오류가 발생했습니다.' }));
    }

    const reply = data.choices[0].message.content;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reply }));
  } catch (err) {
    console.error('[서버 오류]', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }));
  }
}

// ── HTTP server ─────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS (로컬 개발용)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // API
  if (req.method === 'POST' && url.pathname === '/api/chat') {
    return handleChat(req, res);
  }

  // Static files
  const rel  = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
  const file = path.join(__dirname, rel);
  serveFile(res, file);
});

server.listen(PORT, () => {
  console.log(`✅ JYS 마케팅 서버 실행 중 → http://localhost:${PORT}`);
  console.log('   종료: Ctrl+C');
});
