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
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
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
    border: 1px solid rgba(34, 197, 94, 0.25);
  }
  .live .dot {
    width: 8px; height: 8px; border-radius: 999px; background: var(--green);
    box-shadow: 0 0 0 0 rgba(34,197,94,0.6);
    animation: pulse 1.6s ease-out infinite;
  }
  @keyframes pulse {
    0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.55); }
    70%  { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  }

  .wrap { max-width: 1200px; margin: 0 auto; padding: 28px; }
  .grid {
    display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px;
  }
  @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }

  .panel {
    background: linear-gradient(180deg, var(--panel), var(--panel-2));
    border: 1px solid var(--line); border-radius: 14px;
    padding: 18px 20px; box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset;
  }
  .panel h3 {
    margin: 0 0 14px; font-size: 12px; text-transform: uppercase;
    letter-spacing: 1.4px; color: var(--ink-dim); font-weight: 600;
  }

  /* Trunk */
  .trunk { display: flex; align-items: center; gap: 16px; }
  .trunk-light {
    width: 56px; height: 56px; border-radius: 50%;
    display: grid; place-items: center; font-size: 22px;
    transition: all 200ms ease;
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

  /* Counters */
  .counters { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 18px; }
  .counter {
    background: rgba(255,255,255,0.03); border: 1px solid var(--line);
    border-radius: 12px; padding: 14px;
  }
  .counter .k { font-size: 11px; color: var(--ink-dim); text-transform: uppercase; letter-spacing: 1px; }
  .counter .v {
    font-size: 30px; font-weight: 700; margin-top: 6px; letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
    transition: transform 200ms ease;
  }
  .counter .v.tick { transform: scale(1.08); }
  .counter.merges .v { color: var(--blue); }
  .counter.prevented .v { color: var(--amber); }
  .counter.resolver .v { color: var(--violet); }
  .counter .help { font-size: 11px; color: var(--ink-dim); margin-top: 4px; line-height: 1.4; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 8px 10px; text-align: left; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px; color: var(--ink-dim); font-weight: 600; border-bottom: 1px solid var(--line); }
  td { border-bottom: 1px solid rgba(35,48,107,0.4); }
  td code {
    background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;
    font-family: ui-monospace, "JetBrains Mono", Menlo, monospace; font-size: 12px;
  }
  .empty { color: var(--ink-dim); font-style: italic; padding: 12px 0; font-size: 13px; }
  .pill {
    display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 999px;
    font-size: 11px; font-weight: 600;
  }
  .pill.queued { background: var(--amber-bg); color: var(--amber); border: 1px solid rgba(245,158,11,0.25); }
  .pill.granted { background: var(--green-bg); color: var(--green); border: 1px solid rgba(34,197,94,0.25); }

  /* Event feed */
  .feed {
    font-family: ui-monospace, "JetBrains Mono", Menlo, monospace; font-size: 12.5px;
    max-height: 280px; overflow-y: auto;
  }
  .feed-row { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px dashed rgba(35,48,107,0.4); }
  .feed-row .t { color: var(--ink-dim); flex: 0 0 90px; }
  .feed-row .b { flex: 1; }
  .feed-row .tag {
    display: inline-block; padding: 1px 6px; border-radius: 4px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
    margin-right: 6px;
  }
  .tag.claim   { background: rgba(56,189,248,0.15); color: var(--blue); }
  .tag.queued  { background: rgba(245,158,11,0.15); color: var(--amber); }
  .tag.merge   { background: rgba(34,197,94,0.15); color: var(--green); }
  .tag.fail    { background: rgba(239,68,68,0.15); color: var(--red); }
  .tag.resolver { background: rgba(167,139,250,0.15); color: var(--violet); }
  .tag.rel     { background: rgba(149,161,207,0.15); color: var(--ink-dim); }

  footer {
    margin-top: 28px; padding: 18px 28px; color: var(--ink-dim); font-size: 12px;
    border-top: 1px solid var(--line); text-align: center;
  }
  footer a { color: var(--ink); text-decoration: none; border-bottom: 1px dotted var(--ink-dim); }
  .thesis {
    margin: 0 auto 22px; max-width: 760px; text-align: center;
    color: var(--ink-dim); font-size: 14px; line-height: 1.55;
  }
  .thesis strong { color: var(--ink); }
</style>
</head>
<body>
  <div class="topbar">
    <div class="brand">
      <div class="brand-logo">🌊</div>
      <div>
        <div class="brand-title">Tributary · Coordination Console</div>
        <div class="brand-sub">Conflict prevention · Speculative merge queue · LLM resolver of last resort</div>
      </div>
    </div>
    <div class="live"><span class="dot"></span><span id="liveText">Live · polling /registry/status</span></div>
  </div>

  <div class="wrap">
    <p class="thesis">
      <strong>Thesis:</strong> conflicts are a scheduling problem first, and a negotiation problem last.
      Tributary inverts the PR model — agents declare a file footprint, work in isolated forks, and only
      land changes when the speculative merge queue proves them clean. The LLM resolver is a safety net,
      not the spine.
    </p>

    <div class="grid">
      <div class="panel">
        <h3>Trunk status</h3>
        <div class="trunk">
          <div id="trunkLight" class="trunk-light green">✓</div>
          <div class="trunk-meta">
            <div class="label">Main branch</div>
            <div class="value green" id="trunkLabel">GREEN</div>
          </div>
        </div>

        <div class="counters">
          <div class="counter merges">
            <div class="k">Total merges</div>
            <div class="v" id="cMerges">0</div>
            <div class="help">Tasks that landed cleanly via the speculative merge queue.</div>
          </div>
          <div class="counter prevented">
            <div class="k">Conflicts prevented</div>
            <div class="v" id="cPrev">0</div>
            <div class="help">Overlapping claims refused before any work started.</div>
          </div>
          <div class="counter resolver">
            <div class="k">Resolver runs</div>
            <div class="v" id="cRes">0</div>
            <div class="help">Residual conflicts the scheduler couldn't avoid — last-resort LLM mediation.</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <h3>Live event feed</h3>
        <div class="feed" id="feed"><div class="empty">Waiting for activity…</div></div>
      </div>
    </div>

    <div class="grid" style="margin-top:20px">
      <div class="panel">
        <h3>Active claims</h3>
        <table id="claims">
          <thead><tr><th>Agent</th><th>Files</th><th>Expires</th></tr></thead>
          <tbody><tr><td colspan="3" class="empty">No active claims.</td></tr></tbody>
        </table>
      </div>
      <div class="panel">
        <h3>Waitlist</h3>
        <table id="waitlist">
          <thead><tr><th>Agent</th><th>Files</th><th>Status</th></tr></thead>
          <tbody><tr><td colspan="3" class="empty">No waitlisted agents.</td></tr></tbody>
        </table>
      </div>
    </div>
  </div>

  <footer>
    Tributary spike · <a href="/registry/status">/registry/status</a> · built for the Cloudflare “Build the next GitHub” challenge
  </footer>

<script>
(() => {
  const $ = (id) => document.getElementById(id);
  const fmtTime = (ms) => {
    const d = new Date(ms);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  const tick = (el, v) => {
    const cur = el.textContent;
    const next = String(v);
    if (cur !== next) {
      el.textContent = next;
      el.classList.add('tick');
      setTimeout(() => el.classList.remove('tick'), 220);
    }
  };
  const renderClaims = (claims) => {
    const tb = $('claims').querySelector('tbody');
    if (!claims.length) {
      tb.innerHTML = '<tr><td colspan="3" class="empty">No active claims.</td></tr>';
      return;
    }
    tb.innerHTML = claims.map(c => \`
      <tr>
        <td><code>\${c.agentId}</code></td>
        <td>\${c.files.map(f => \`<code>\${f}</code>\`).join(' ')}</td>
        <td>\${fmtTime(c.expiresAt)}</td>
      </tr>\`).join('');
  };
  const renderWaitlist = (q) => {
    const tb = $('waitlist').querySelector('tbody');
    if (!q.length) {
      tb.innerHTML = '<tr><td colspan="3" class="empty">No waitlisted agents.</td></tr>';
      return;
    }
    tb.innerHTML = q.map(w => \`
      <tr>
        <td><code>\${w.agentId}</code></td>
        <td>\${w.files.map(f => \`<code>\${f}</code>\`).join(' ')}</td>
        <td><span class="pill queued">queued</span></td>
      </tr>\`).join('');
  };
  const feed = $('feed');
  const feedHistory = [];
  const pushFeed = (tag, text) => {
    feedHistory.unshift({ tag, text, t: Date.now() });
    if (feedHistory.length > 40) feedHistory.pop();
    feed.innerHTML = feedHistory.map(r => \`
      <div class="feed-row">
        <div class="t">\${fmtTime(r.t)}</div>
        <div class="b"><span class="tag \${r.tag}">\${r.tag}</span>\${r.text}</div>
      </div>\`).join('') || '<div class="empty">Waiting for activity…</div>';
  };
  // Synthesize feed events from state diffs (the DO is the source of truth).
  let prev = null;
  const render = async () => {
    let data;
    try {
      data = await fetch('/registry/status', { cache: 'no-store' }).then(r => r.json());
    } catch (e) {
      $('liveText').textContent = 'Reconnecting…';
      return;
    }
    $('liveText').textContent = 'Live · polling /registry/status';

    const ts = data.stats;
    const light = $('trunkLight');
    const label = $('trunkLabel');
    if (ts.trunkStatus === 'green') {
      light.className = 'trunk-light green'; light.textContent = '✓';
      label.className = 'value green'; label.textContent = 'GREEN';
    } else {
      light.className = 'trunk-light red'; light.textContent = '!';
      label.className = 'value red'; label.textContent = 'RED';
    }
    tick($('cMerges'), ts.totalMerges);
    tick($('cPrev'),   ts.conflictsPrevented);
    tick($('cRes'),    ts.resolverInvocations);

    renderClaims(data.activeClaims);
    renderWaitlist(data.waitlist);

    if (prev) {
      // Emit synthetic feed events from state deltas.
      if (ts.totalMerges > (prev.stats.totalMerges || 0))
        pushFeed('merge', 'speculative merge landed → trunk advanced');
      if (ts.conflictsPrevented > (prev.stats.conflictsPrevented || 0))
        pushFeed('queued', 'overlapping claim detected → queued to waitlist');
      if (ts.resolverInvocations > (prev.stats.resolverInvocations || 0))
        pushFeed('resolver', 'residual conflict routed to LLM resolver');
      const prevActive = new Set(prev.activeClaims.map(c => c.agentId));
      for (const c of data.activeClaims)
        if (!prevActive.has(c.agentId)) pushFeed('claim', \`\${c.agentId} granted claim for \${c.files.join(', ')}\`);
      const prevWL = new Set(prev.waitlist.map(w => w.agentId));
      for (const w of data.waitlist)
        if (!prevWL.has(w.agentId)) pushFeed('queued', \`\${w.agentId} queued (overlap with active claim)\`);
      const curActive = new Set(data.activeClaims.map(c => c.agentId));
      for (const c of prev.activeClaims)
        if (!curActive.has(c.agentId)) pushFeed('rel', \`\${c.agentId} released claim\`);
    }
    prev = data;
  };
  render();
  setInterval(render, 1500);
})();
</script>
</body>
</html>`;
