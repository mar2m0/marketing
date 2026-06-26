(function () {
  'use strict';

  // ── Brand tokens ──────────────────────────────────────────────
  var CLAY        = '#8B5E3C';
  var SAND        = '#D4A97A';
  var CREAM       = '#F5EDE0';
  var IVORY       = '#FDFAF6';
  var DARK        = '#2C2825';
  var STONE       = '#6B6560';
  var LIGHT       = '#EDE8E3';
  var MID_GRAY    = '#A09890';

  // ── State ─────────────────────────────────────────────────────
  var isOpen    = false;
  var isLoading = false;
  var history   = []; // {role, content} — max 10 kept

  // ── Inject styles ─────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#jys-chatbot *{box-sizing:border-box;font-family:"Pretendard",system-ui,sans-serif;margin:0;padding:0}',

    /* Toggle button */
    '#jys-toggle{position:fixed;bottom:28px;right:28px;width:58px;height:58px;border-radius:50%;',
    'background:' + CLAY + ';border:none;cursor:pointer;',
    'box-shadow:0 4px 16px rgba(139,94,60,.38);',
    'display:flex;align-items:center;justify-content:center;z-index:9999;',
    'transition:transform .2s,box-shadow .2s}',
    '#jys-toggle:hover{transform:scale(1.08);box-shadow:0 6px 24px rgba(139,94,60,.48)}',

    /* Unread badge */
    '#jys-badge{position:absolute;top:-3px;right:-3px;width:16px;height:16px;',
    'background:#ff385c;border-radius:50%;border:2px solid #fff;',
    'display:none}',

    /* Chat window */
    '#jys-window{position:fixed;bottom:100px;right:28px;width:380px;',
    'max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 120px);',
    'background:' + IVORY + ';border-radius:20px;',
    'box-shadow:0 8px 40px rgba(44,40,37,.18);',
    'display:flex;flex-direction:column;overflow:hidden;z-index:9998;',
    'transform:translateY(16px) scale(.97);opacity:0;pointer-events:none;',
    'transition:transform .25s cubic-bezier(.4,0,.2,1),opacity .25s}',
    '#jys-window.open{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}',

    /* Header */
    '#jys-header{background:' + CLAY + ';padding:14px 18px;',
    'display:flex;align-items:center;gap:10px;flex-shrink:0}',
    '#jys-avatar{width:36px;height:36px;border-radius:50%;background:' + CREAM + ';',
    'display:flex;align-items:center;justify-content:center;',
    'font-weight:700;font-size:14px;color:' + CLAY + ';flex-shrink:0}',
    '#jys-header-info{flex:1}',
    '#jys-header-name{color:#fff;font-weight:700;font-size:15px}',
    '#jys-header-sub{color:rgba(255,255,255,.65);font-size:12px;margin-top:2px}',
    '#jys-close{background:none;border:none;cursor:pointer;',
    'color:rgba(255,255,255,.75);display:flex;align-items:center;justify-content:center;',
    'padding:4px;border-radius:6px;transition:color .15s}',
    '#jys-close:hover{color:#fff}',

    /* Messages */
    '#jys-messages{flex:1;overflow-y:auto;padding:14px 14px 8px;',
    'display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}',
    '#jys-messages::-webkit-scrollbar{width:4px}',
    '#jys-messages::-webkit-scrollbar-thumb{background:' + LIGHT + ';border-radius:2px}',

    '.jys-row{display:flex;align-items:flex-end;gap:7px;max-width:86%}',
    '.jys-row.bot{align-self:flex-start}',
    '.jys-row.user{align-self:flex-end;flex-direction:row-reverse}',

    '.jys-row-avatar{width:26px;height:26px;border-radius:50%;background:' + CLAY + ';',
    'display:flex;align-items:center;justify-content:center;',
    'font-size:10px;font-weight:700;color:' + CREAM + ';flex-shrink:0}',

    '.jys-bubble{padding:10px 13px;border-radius:16px;',
    'font-size:14px;line-height:1.65;word-break:break-word;white-space:pre-wrap}',
    '.bot .jys-bubble{background:#fff;color:' + DARK + ';',
    'border:1px solid ' + LIGHT + ';border-bottom-left-radius:4px}',
    '.user .jys-bubble{background:' + CLAY + ';color:#fff;border-bottom-right-radius:4px}',
    '.jys-bubble.error{background:#fff5f5;color:#b91c1c;',
    'border-color:#fecaca;font-size:13px}',

    /* Loading dots */
    '.jys-dots{display:flex;gap:5px;padding:3px 1px;align-items:center}',
    '.jys-dot{width:7px;height:7px;border-radius:50%;background:' + MID_GRAY + ';',
    'animation:jys-bounce .85s infinite ease-in-out}',
    '.jys-dot:nth-child(2){animation-delay:.17s}',
    '.jys-dot:nth-child(3){animation-delay:.34s}',
    '@keyframes jys-bounce{0%,80%,100%{transform:translateY(0);opacity:.45}',
    '40%{transform:translateY(-6px);opacity:1}}',

    /* Input area */
    '#jys-input-area{padding:10px 14px;border-top:1px solid ' + LIGHT + ';',
    'display:flex;gap:8px;align-items:center;background:#fff;flex-shrink:0}',
    '#jys-input{flex:1;border:1px solid ' + LIGHT + ';border-radius:9999px;',
    'padding:9px 15px;font-size:14px;color:' + DARK + ';',
    'background:' + IVORY + ';outline:none;',
    'font-family:"Pretendard",system-ui,sans-serif;',
    'transition:border-color .15s}',
    '#jys-input:focus{border-color:' + CLAY + '}',
    '#jys-input::placeholder{color:' + MID_GRAY + '}',
    '#jys-send{width:36px;height:36px;border-radius:50%;',
    'background:' + CLAY + ';border:none;cursor:pointer;',
    'display:flex;align-items:center;justify-content:center;flex-shrink:0;',
    'transition:background .15s,transform .15s}',
    '#jys-send:hover{background:#7a5232;transform:scale(1.06)}',
    '#jys-send:disabled{background:' + MID_GRAY + ';cursor:not-allowed;transform:none}',
  ].join('');
  document.head.appendChild(style);

  // ── Build DOM ─────────────────────────────────────────────────
  var root = document.createElement('div');
  root.id = 'jys-chatbot';
  root.innerHTML =
    '<button id="jys-toggle" aria-label="챗봇 열기">' +
      '<div id="jys-badge"></div>' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="white">' +
        '<path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>' +
      '</svg>' +
    '</button>' +

    '<div id="jys-window" role="dialog" aria-modal="true" aria-label="JYS 마케팅 상담봇">' +
      '<div id="jys-header">' +
        '<div id="jys-avatar">J</div>' +
        '<div id="jys-header-info">' +
          '<div id="jys-header-name">JYS 마케팅 상담봇</div>' +
          '<div id="jys-header-sub">서비스 · 패키지 · 문의 안내</div>' +
        '</div>' +
        '<button id="jys-close" aria-label="닫기">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">' +
            '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>' +
          '</svg>' +
        '</button>' +
      '</div>' +

      '<div id="jys-messages" aria-live="polite"></div>' +

      '<div id="jys-input-area">' +
        '<input id="jys-input" type="text" placeholder="궁금한 점을 물어보세요..." maxlength="500" autocomplete="off">' +
        '<button id="jys-send" aria-label="전송" disabled>' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="white">' +
            '<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>' +
          '</svg>' +
        '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(root);

  var toggleBtn  = document.getElementById('jys-toggle');
  var badge      = document.getElementById('jys-badge');
  var win        = document.getElementById('jys-window');
  var closeBtn   = document.getElementById('jys-close');
  var msgList    = document.getElementById('jys-messages');
  var inputEl    = document.getElementById('jys-input');
  var sendBtn    = document.getElementById('jys-send');

  // ── Open / close ──────────────────────────────────────────────
  function openChat() {
    isOpen = true;
    win.classList.add('open');
    badge.style.display = 'none';
    toggleBtn.setAttribute('aria-label', '챗봇 닫기');
    setTimeout(function () { inputEl.focus(); }, 260);
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('open');
    toggleBtn.setAttribute('aria-label', '챗봇 열기');
  }

  toggleBtn.addEventListener('click', function () {
    isOpen ? closeChat() : openChat();
  });
  closeBtn.addEventListener('click', closeChat);

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) closeChat();
  });

  // ── Helpers ───────────────────────────────────────────────────
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function scrollBottom() {
    msgList.scrollTop = msgList.scrollHeight;
  }

  function addBubble(role, text, isError) {
    var row  = document.createElement('div');
    row.className = 'jys-row ' + role;

    var bub = document.createElement('div');
    bub.className = 'jys-bubble' + (isError ? ' error' : '');
    bub.innerHTML = esc(text).replace(/\n/g, '<br>');

    if (role === 'bot') {
      var av = document.createElement('div');
      av.className = 'jys-row-avatar';
      av.textContent = 'J';
      row.appendChild(av);
    }
    row.appendChild(bub);
    msgList.appendChild(row);
    scrollBottom();
    return row;
  }

  function showDots() {
    var row = document.createElement('div');
    row.className = 'jys-row bot';
    row.id = 'jys-loading';
    row.innerHTML =
      '<div class="jys-row-avatar">J</div>' +
      '<div class="jys-bubble">' +
        '<div class="jys-dots">' +
          '<div class="jys-dot"></div>' +
          '<div class="jys-dot"></div>' +
          '<div class="jys-dot"></div>' +
        '</div>' +
      '</div>';
    msgList.appendChild(row);
    scrollBottom();
  }

  function hideDots() {
    var el = document.getElementById('jys-loading');
    if (el) el.remove();
  }

  // ── Send ──────────────────────────────────────────────────────
  function send() {
    var text = inputEl.value.trim();
    if (!text || isLoading) return;

    inputEl.value = '';
    sendBtn.disabled = true;
    isLoading = true;

    addBubble('user', text);
    history.push({ role: 'user', content: text });
    if (history.length > 10) history = history.slice(-10);

    showDots();

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        hideDots();
        if (!result.ok) {
          addBubble('bot', result.data.error || '오류가 발생했습니다. 잠시 후 다시 시도해주세요.', true);
          history.pop();
        } else {
          var reply = result.data.reply;
          addBubble('bot', reply);
          history.push({ role: 'assistant', content: reply });
          if (history.length > 10) history = history.slice(-10);
        }
      })
      .catch(function () {
        hideDots();
        addBubble('bot', '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.', true);
        history.pop();
      })
      .finally(function () {
        isLoading = false;
        sendBtn.disabled = inputEl.value.trim() === '';
        inputEl.focus();
      });
  }

  sendBtn.addEventListener('click', send);
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  inputEl.addEventListener('input', function () {
    sendBtn.disabled = inputEl.value.trim() === '' || isLoading;
  });

  // ── Welcome message (1 s after load) ─────────────────────────
  setTimeout(function () {
    var welcome = '안녕하세요! JYS 마케팅 상담봇입니다.\n서비스, 패키지, 프로세스 등 궁금한 점이 있으시면 편하게 물어보세요!';
    history.push({ role: 'assistant', content: welcome });
    addBubble('bot', welcome);
    if (!isOpen) {
      badge.style.display = 'block';
    }
  }, 1000);
})();
