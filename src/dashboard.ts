export const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Tributary · Coordination Console</title>
<style>
  :root {
    --bg: #0b1020;
    --panel: #121935;
    --panel-2: #182149;
    --line: #23306b;
    --ink: #e7ecff;
    --ink-dim: #95a1cf;
    --green: #22c55e;
    --green-bg: #052e1a;
    --amber: #f59e0b;
    --amber-bg: #3a2305;
    --red: #ef4444;
    --red-bg: #3b0a0a;
    --blue: #38bdf8;
    --violet: #a78bfa;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    background: radial-gradient(1200px 800px at 20% -10%, #1a2360 0%, transparent 60%),
                radial-gradient(900px 700px at 110% 110%, #2a1063 0%, transparent 55%),
                var(--bg);
    color: var(--ink);
    font-family: ui-sans-serif, system-ui, -apple-system, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }

  .topbar {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    padding: 18px 28px; border-bottom: 1px solid var(--line);
    background: rgba(11, 16, 32, 0.6); backdrop-filter: blur(8px);
    position: sticky; top: 0; z-index: 10;
  }
  .brand { display: flex; align-items: center; gap: 12px; font-weight: 600; letter-spacing: 0.2px; }
  .brand-logo {
    width: 28px; height: 28px; border-radius: 8px;
    background: linear-gradient(135deg, #38bdf8, #a78bfa);
    display: grid; place-items: center; color: #0b1020; font-size: 16px;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 8px 30px rgba(56,189,248,0.25);
  }
  .brand-title { font-size: 16px; }
  .brand-sub { font-size: 12px; color: var(--ink-dim); margin-top: 2px; }
  .live {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 10px; border-radius: 999px; font-size: 12px;
    background: rgba(34, 197, 94, 0.08); color: var(--green);
    border: 1px solid rgba(34, 197, 94, 0.25); white-space: nowrap;
  }
  .live.stale { background: rgba(245,158,11,0.08); color: var(--amber); border-color: rgba(245,158,11,0.3); }
  .live .dot {
    width: 8px; height: 8px; border-radius: 999px; background: currentColor;
    box-shadow: 0 0 0 0 rgba(34,197,94,0.6);
    animation: pulse 1.6s ease-out infinite;
  }
  @keyframes pulse {
    0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.55); }
    70%  { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  }

  .wrap { max-width: 1200px; margin: 0 auto; padding: 28px; }

  .thesis {
    margin: 0 auto 22px; max-width: 780px; text-align: center;
    color: var(--ink-dim); font-size: 14px; line-height: 1.55;
  }
  .thesis strong { color: var(--ink); }

  /* Onboarding — the page is never a dead end. */
  .onboard {
    display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
    margin: 0 auto 22px; padding: 16px 18px;
    border: 1px dashed rgba(56,189,248,0.45); border-radius: 14px;
    background: linear-gradient(180deg, rgba(56,189,248,0.08), rgba(56,189,248,0.02));
  }
  .onboard[hidden] { display: none; }
  .onboard-icon {
    width: 36px; height: 36px; border-radius: 10px; flex: 0 0 36px;
    display: grid; place-items: center; font-size: 14px;
    background: rgba(56,189,248,0.15); color: var(--blue);
  }
  .onboard-body { flex: 1 1 320px; }
  .onboard-title { font-weight: 600; font-size: 14px; }
  .onboard-sub { color: var(--ink-dim); font-size: 13px; margin-top: 3px; line-height: 1.45; }
  .onboard-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .cmd {
    font-family: ui-monospace, "JetBrains Mono", Menlo, monospace; font-size: 12.5px;
    background: rgba(0,0,0,0.4); border: 1px solid var(--line); color: var(--ink);
    padding: 8px 10px; border-radius: 8px; cursor: pointer; white-space: nowrap;
  }
  .cmd:hover { border-color: var(--blue); }
  .cmd.copied { color: var(--green); border-color: rgba(34,197,94,0.5); }

  .btn {
    font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
    padding: 8px 12px; border-radius: 8px; white-space: nowrap;
    color: var(--violet); background: rgba(167,139,250,0.12);
    border: 1px solid rgba(167,139,250,0.35);
  }
  .btn:hover:not(:disabled) { background: rgba(167,139,250,0.2); }
  .btn:focus-visible, .cmd:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
  .btn:disabled { opacity: 0.55; cursor: progress; }

  /* Pipeline — the three stages of the thesis, always visible. */
  .pipeline { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
  @media (max-width: 900px) { .pipeline { grid-template-columns: 1fr; } }
  .stage {
    position: relative;
    background: linear-gradient(180deg, var(--panel), var(--panel-2));
    border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px;
  }
  .stage-head { display: flex; align-items: center; gap: 8px; }
  .stage-num {
    width: 20px; height: 20px; border-radius: 6px; font-size: 11px; font-weight: 700;
    display: grid; place-items: center; background: rgba(255,255,255,0.06); color: var(--ink-dim);
  }
  .stage-name { font-size: 12px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600; }
  .stage.s1 .stage-name { color: var(--amber); }
  .stage.s2 .stage-name { color: var(--blue); }
  .stage.s3 .stage-name { color: var(--violet); }
  .stage-value {
    font-size: 30px; font-weight: 700; margin-top: 8px; letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums; transition: transform 200ms ease;
  }
  .stage-value.tick { transform: scale(1.08); }
  .stage-help { font-size: 11.5px; color: var(--ink-dim); margin-top: 4px; line-height: 1.45; }
  @media (min-width: 901px) {
    .stage + .stage::before {
      content: "→"; position: absolute; left: -13px; top: 50%; transform: translateY(-50%);
      color: var(--line); font-size: 14px;
    }
  }

  /* Tributary band — streams converging into the trunk at the confluence. */
  .flowbar { margin: 0 0 22px; }
  .flowbar svg { width: 100%; height: auto; display: block; }
  .flowbar .stream {
    fill: none; stroke: url(#streamGrad); stroke-width: 2; stroke-linecap: round;
    stroke-dasharray: 5 11; animation: flow 7s linear infinite;
  }
  .flowbar .trunkline { fill: none; stroke: url(#trunkGrad); stroke-width: 7; stroke-linecap: round; }
  .flowbar .node { fill: #a78bfa; }
  @keyframes flow { to { stroke-dashoffset: -160; } }
  .flowbar-cap {
    text-align: center; margin-top: 4px; font-size: 10.5px; letter-spacing: 1.4px;
    text-transform: uppercase; color: var(--ink-dim);
  }

  .grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; }
  @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  .grid + .grid { margin-top: 20px; }

  .panel {
    background: linear-gradient(180deg, var(--panel), var(--panel-2));
    border: 1px solid var(--line); border-radius: 14px;
    padding: 18px 20px; box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset;
  }
  .panel h2 {
    margin: 0 0 14px; font-size: 12px; text-transform: uppercase;
    letter-spacing: 1.4px; color: var(--ink-dim); font-weight: 600;
  }

  .trunk { display: flex; align-items: center; gap: 16px; }
  .trunk-light {
    width: 56px; height: 56px; border-radius: 50%; flex: 0 0 56px;
    display: grid; place-items: center; font-size: 22px; transition: all 200ms ease;
  }
  .trunk-light.green {
    background: var(--green-bg); color: var(--green);
    box-shadow: 0 0 0 1px rgba(34,197,94,0.35), 0 0 24px rgba(34,197,94,0.25);
  }
  .trunk-light.red {
    background: var(--red-bg); color: var(--red);
    box-shadow: 0 0 0 1px rgba(239,68,68,0.35), 0 0 24px rgba(239,68,68,0.25);
    animation: blink 1.2s ease-in-out infinite;
  }
  @keyframes blink { 50% { opacity: 0.55; } }
  .trunk-meta .label { font-size: 12px; color: var(--ink-dim); }
  .trunk-meta .value { font-size: 22px; font-weight: 600; margin-top: 4px; letter-spacing: 0.2px; }
  .trunk-meta .value.green { color: var(--green); }
  .trunk-meta .value.red { color: var(--red); }
  .last-merge { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line); font-size: 12.5px; color: var(--ink-dim); }
  .last-merge code {
    background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;
    font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: var(--ink);
  }

  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 8px 10px; text-align: left; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px; color: var(--ink-dim); font-weight: 600; border-bottom: 1px solid var(--line); }
  td { border-bottom: 1px solid rgba(35,48,107,0.4); }
  td code, .agent {
    background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;
    font-family: ui-monospace, "JetBrains Mono", Menlo, monospace; font-size: 12px;
  }
  .empty { color: var(--ink-dim); font-style: italic; padding: 12px 0; font-size: 13px; font-weight: 400; text-transform: none; letter-spacing: 0; }
  .pill {
    display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 999px;
    font-size: 11px; font-weight: 600;
  }
  .pill.queued { background: var(--amber-bg); color: var(--amber); border: 1px solid rgba(245,158,11,0.25); }
  .pill.granted { background: var(--green-bg); color: var(--green); border: 1px solid rgba(34,197,94,0.25); }

  /* Event feed */
  .feed {
    font-family: ui-monospace, "JetBrains Mono", Menlo, monospace; font-size: 12.5px;
    max-height: 320px; overflow-y: auto;
  }
  .feed-row { display: flex; gap: 10px; padding: 7px 0; border-bottom: 1px dashed rgba(35,48,107,0.4); align-items: baseline; }
  .feed-row:first-child { animation: slideIn 320ms ease; }
  @keyframes slideIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  .feed-row .t { color: var(--ink-dim); flex: 0 0 76px; }
  .feed-row .b { flex: 1; line-height: 1.5; }
  .tag {
    display: inline-block; padding: 1px 6px; border-radius: 4px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
    margin-right: 6px;
  }
  .tag.claim    { background: rgba(56,189,248,0.15); color: var(--blue); }
  .tag.queued   { background: rgba(245,158,11,0.15); color: var(--amber); }
  .tag.merge    { background: rgba(34,197,94,0.15); color: var(--green); }
  .tag.conflict { background: rgba(239,68,68,0.15); color: var(--red); }
  .tag.resolver { background: rgba(167,139,250,0.15); color: var(--violet); }
  .tag.release  { background: rgba(149,161,207,0.15); color: var(--ink-dim); }
  .feed .who { color: var(--ink); }

  footer {
    margin-top: 28px; padding: 18px 28px; color: var(--ink-dim); font-size: 12px;
    border-top: 1px solid var(--line); text-align: center;
  }
  footer a { color: var(--ink); text-decoration: none; border-bottom: 1px dotted var(--ink-dim); }
</style>
</head>
<body>
  <header class="topbar">
    <div class="brand">
      <div class="brand-logo">🌊</div>
      <div>
        <div class="brand-title">Tributary · Coordination Console</div>
        <div class="brand-sub">Every change is a tributary · the confluence joins it to the trunk · the rapids are the last resort</div>
      </div>
    </div>
    <div class="live" id="livePill"><span class="dot"></span><span id="liveText">Connecting…</span></div>
  </header>

  <main class="wrap">
    <p class="thesis">
      <strong>Thesis:</strong> conflicts are a scheduling problem first, and a negotiation problem last.
      Each agent&rsquo;s change is a <strong>tributary</strong> — declared at the watershed, joined to the
      trunk at the confluence, and only the residual ever reaches the rapids. The LLM resolver is a safety
      net, not the spine.
    </p>

    <section class="onboard" id="onboard" hidden>
      <div class="onboard-icon">▶</div>
      <div class="onboard-body">
        <div class="onboard-title">Nothing has happened yet</div>
        <div class="onboard-sub">
          Start five concurrent agents in a second terminal — two of them will declare the same file.
          Or trigger a single resolver beat to see the rapids on their own.
        </div>
      </div>
      <div class="onboard-actions">
        <button class="cmd" id="cmdBtn" type="button" title="Copy to clipboard">npm run simulate</button>
        <button class="btn" id="demoBtn" type="button">Trigger resolver beat</button>
      </div>
    </section>

    <section class="pipeline" aria-label="The three stages: watershed, confluence, rapids">
      <div class="stage s1">
        <div class="stage-head"><span class="stage-num">1</span><span class="stage-name">Watershed</span></div>
        <div class="stage-value" id="cPrev" aria-live="polite">0</div>
        <div class="stage-help">Prevent · Overlapping claims refused and queued before any work starts.</div>
      </div>
      <div class="stage s2">
        <div class="stage-head"><span class="stage-num">2</span><span class="stage-name">Confluence</span></div>
        <div class="stage-value" id="cMerges" aria-live="polite">0</div>
        <div class="stage-help">Integrate · Three-way merges that passed the test gate and landed on the trunk.</div>
      </div>
      <div class="stage s3">
        <div class="stage-head"><span class="stage-num">3</span><span class="stage-name">Rapids</span></div>
        <div class="stage-value" id="cRes" aria-live="polite">0</div>
        <div class="stage-help">Negotiate · Residual conflicts that survived both gates. This number should stay small.</div>
      </div>
    </section>

    <section class="flowbar" aria-hidden="true">
      <svg viewBox="0 0 1000 90" role="img" focusable="false">
        <defs>
          <linearGradient id="streamGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#38bdf8" stop-opacity="0.12" />
            <stop offset="0.62" stop-color="#38bdf8" stop-opacity="0.85" />
          </linearGradient>
          <linearGradient id="trunkGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#a78bfa" stop-opacity="0.9" />
            <stop offset="1" stop-color="#38bdf8" stop-opacity="0.9" />
          </linearGradient>
        </defs>
        <path class="stream" d="M0,8 C 300,8 430,43 620,45" />
        <path class="stream" d="M0,27 C 300,27 440,43 620,45" />
        <path class="stream" d="M0,45 C 320,45 460,45 620,45" />
        <path class="stream" d="M0,63 C 300,63 440,47 620,45" />
        <path class="stream" d="M0,82 C 300,82 430,47 620,45" />
        <path class="trunkline" d="M620,45 L1000,45" />
        <circle class="node" cx="620" cy="45" r="4" />
      </svg>
      <div class="flowbar-cap">Many tributaries · one trunk — the confluence is where they join</div>
    </section>

    <div class="grid">
      <section class="panel">
        <h2>Trunk state</h2>
        <div class="trunk">
          <div id="trunkLight" class="trunk-light green" aria-hidden="true">✓</div>
          <div class="trunk-meta">
            <div class="label">main · verified trunk</div>
            <div class="value green" id="trunkLabel">GREEN</div>
          </div>
        </div>
        <div class="last-merge" id="lastMerge">No merge yet — trunk has not moved.</div>
      </section>

      <section class="panel">
        <h2>Live flow</h2>
        <div class="feed" id="feed" aria-live="polite"><div class="empty">Waiting for activity…</div></div>
      </section>
    </div>

    <div class="grid">
      <section class="panel">
        <h2>Watershed · claims</h2>
        <table id="claims">
          <thead><tr><th>Agent</th><th>Declared footprint</th><th>Expires</th></tr></thead>
          <tbody><tr><td colspan="3" class="empty">No active claims.</td></tr></tbody>
        </table>
      </section>
      <section class="panel">
        <h2>Watershed · waitlist</h2>
        <table id="waitlist">
          <thead><tr><th>Agent</th><th>Declared footprint</th><th>Status</th></tr></thead>
          <tbody><tr><td colspan="3" class="empty">No waitlisted agents.</td></tr></tbody>
        </table>
      </section>
    </div>
  </main>

  <footer>
    Tributary spike · many tributaries, one trunk · <a href="/registry/status">/registry/status</a> · built for the Cloudflare “Build the next GitHub” challenge
  </footer>

<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var clock = function (ms) {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  var ago = function (ms) {
    var s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 2) return 'just now';
    if (s < 60) return s + 's ago';
    var m = Math.floor(s / 60);
    if (m < 60) return m + 'm ago';
    return Math.floor(m / 60) + 'h ago';
  };
  var tick = function (el, v) {
    var next = String(v);
    if (el.textContent !== next) {
      el.textContent = next;
      el.classList.add('tick');
      setTimeout(function () { el.classList.remove('tick'); }, 220);
    }
  };

  var renderClaims = function (claims) {
    var tb = $('claims').querySelector('tbody');
    if (!claims.length) {
      tb.innerHTML = '<tr><td colspan="3" class="empty">No active claims.</td></tr>';
      return;
    }
    tb.innerHTML = claims.map(function (c) {
      var files = c.files.map(function (f) { return '<code>' + esc(f) + '</code>'; }).join(' ');
      return '<tr><td><span class="agent">' + esc(c.agentId) + '</span></td><td>' + files +
             '</td><td>' + ago(c.expiresAt).replace(' ago', ' from now') + '</td></tr>';
    }).join('');
  };

  var renderWaitlist = function (q) {
    var tb = $('waitlist').querySelector('tbody');
    if (!q.length) {
      tb.innerHTML = '<tr><td colspan="3" class="empty">No waitlisted agents.</td></tr>';
      return;
    }
    tb.innerHTML = q.map(function (w) {
      var files = w.files.map(function (f) { return '<code>' + esc(f) + '</code>'; }).join(' ');
      return '<tr><td><span class="agent">' + esc(w.agentId) + '</span></td><td>' + files +
             '</td><td><span class="pill queued">queued</span></td></tr>';
    }).join('');
  };

  var renderFeed = function (events) {
    var feed = $('feed');
    if (!events || !events.length) {
      feed.innerHTML = '<div class="empty">Waiting for activity…</div>';
      return;
    }
    feed.innerHTML = events.map(function (e) {
      var who = e.agentId ? '<span class="who">' + esc(e.agentId) + '</span> · ' : '';
      return '<div class="feed-row"><div class="t">' + clock(e.at) + '</div>' +
             '<div class="b"><span class="tag ' + esc(e.kind) + '">' + esc(e.kind) + '</span>' +
             who + esc(e.detail) + '</div></div>';
    }).join('');
  };

  var renderLastMerge = function (lm) {
    var el = $('lastMerge');
    if (!lm) {
      el.innerHTML = 'No merge yet — trunk has not moved.';
      return;
    }
    var parts = [];
    if (lm.agentId) parts.push('<span class="agent">' + esc(lm.agentId) + '</span>');
    if (lm.repo) parts.push(esc(lm.repo));
    if (lm.commit) parts.push('<code>' + esc(String(lm.commit).slice(0, 8)) + '</code>');
    parts.push(esc(ago(lm.at)));
    el.innerHTML = 'Last landed: ' + parts.join(' · ');
  };

  var setLive = function (ok, text) {
    var pill = $('livePill');
    pill.className = ok ? 'live' : 'live stale';
    $('liveText').textContent = text;
  };

  var render = function () {
    return fetch('/registry/status', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var ts = data.stats;
        var light = $('trunkLight');
        var label = $('trunkLabel');
        if (ts.trunkStatus === 'green') {
          light.className = 'trunk-light green'; light.textContent = '✓';
          label.className = 'value green'; label.textContent = 'GREEN';
        } else {
          light.className = 'trunk-light red'; light.textContent = '!';
          label.className = 'value red'; label.textContent = 'RED';
        }

        tick($('cMerges'), ts.totalMerges);
        tick($('cPrev'), ts.conflictsPrevented);
        tick($('cRes'), ts.resolverInvocations);

        renderClaims(data.activeClaims || []);
        renderWaitlist(data.waitlist || []);
        renderFeed(data.events);
        renderLastMerge(ts.lastMerge);

        var any = (ts.totalMerges || 0) + (ts.conflictsPrevented || 0) + (ts.resolverInvocations || 0);
        $('onboard').hidden = any > 0;

        setLive(true, 'Live · updated ' + clock(Date.now()));
      })
      .catch(function () { setLive(false, 'Reconnecting…'); });
  };

  // Copy-to-clipboard on the command chip — a small kindness for the reader.
  $('cmdBtn').addEventListener('click', function () {
    var btn = this;
    var done = function () {
      var t = btn.textContent;
      btn.classList.add('copied');
      btn.textContent = 'copied ✓';
      setTimeout(function () { btn.textContent = t; btn.classList.remove('copied'); }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText('npm run simulate').then(done, done);
    } else {
      done();
    }
  });

  // Resolver beat, on demand — no curl required.
  $('demoBtn').addEventListener('click', function () {
    var btn = this;
    btn.disabled = true;
    btn.textContent = 'Triggering…';
    fetch('/demo/conflict', { method: 'POST' })
      .then(function () { return render(); })
      .catch(function () {})
      .then(function () { btn.disabled = false; btn.textContent = 'Trigger resolver beat'; });
  });

  render();
  setInterval(render, 1500);
})();
</script>
</body>
</html>`;
