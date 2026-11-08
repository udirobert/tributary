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
  .live.replay { background: rgba(167,139,250,0.08); color: var(--violet); border-color: rgba(167,139,250,0.3); }
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

  /* Replay bar — scrub the persisted event log. */
  .replaybar {
    display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
    margin: 0 0 20px; padding: 12px 16px;
    border: 1px solid rgba(167,139,250,0.35); border-radius: 12px;
    background: rgba(167,139,250,0.06);
  }
  .replaybar[hidden] { display: none; }
  .replaybar input[type="range"] { flex: 1 1 240px; min-width: 160px; accent-color: #a78bfa; }
  .rp-meta { font-size: 12px; color: var(--ink-dim); font-variant-numeric: tabular-nums; }
  .rp-meta b { color: var(--ink); font-weight: 600; }
  .rp-link {
    font-size: 12px; color: var(--violet); text-decoration: none;
    border-bottom: 1px dotted var(--violet); white-space: nowrap;
  }

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

  /* Live river — agents as streams converging into the trunk. */
  .river { margin: 0 0 20px; }
  .river svg { width: 100%; height: auto; display: block; }
  .river-cap {
    text-align: center; margin-top: 4px; font-size: 10.5px; letter-spacing: 1.4px;
    text-transform: uppercase; color: var(--ink-dim);
  }
  .rv-plate { fill: rgba(11, 16, 32, 0.35); }
  .rv-gate { stroke: var(--line); stroke-width: 1; stroke-dasharray: 4 6; }
  .rv-stream {
    fill: none; stroke: url(#rvStream); stroke-width: 2.5; stroke-linecap: round;
    stroke-dasharray: 6 10; animation: rvFlow 6s linear infinite;
  }
  .rv-wait {
    fill: none; stroke: var(--amber); stroke-width: 2.5; stroke-linecap: round;
    stroke-dasharray: 2 7; opacity: 0.85;
  }
  .rv-trunk-halo { fill: none; stroke: url(#rvTrunk); stroke-width: 18; stroke-linecap: round; opacity: 0.14; }
  .rv-trunk { fill: none; stroke: url(#rvTrunk); stroke-width: 7; stroke-linecap: round; }
  .rv-hub { fill: #a78bfa; opacity: 0.25; }
  .rv-hub-core { fill: #0b1020; stroke: #a78bfa; stroke-width: 2.5; }
  .rv-commit { fill: var(--green); }
  .rv-label {
    fill: var(--ink-dim); font-size: 10px; letter-spacing: 1.4px;
    font-family: inherit;
  }
  @keyframes rvFlow { to { stroke-dashoffset: -160; } }

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
  .muted { color: var(--ink-dim); }
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

  /* Composer — dispatch a goal to the built-in agent. */
  .composer {
    display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 20px; padding: 16px 18px;
    border: 1px solid var(--line); border-radius: 14px;
    background: linear-gradient(180deg, var(--panel), var(--panel-2));
  }
  .composer-main { flex: 1 1 360px; }
  .composer textarea {
    width: 100%; min-height: 56px; resize: vertical; font: inherit; font-size: 13.5px;
    background: rgba(0,0,0,0.3); color: var(--ink); border: 1px solid var(--line);
    border-radius: 10px; padding: 10px 12px;
  }
  .composer textarea:focus { outline: 2px solid var(--blue); outline-offset: 1px; border-color: var(--blue); }
  .composer-side { display: flex; flex-direction: column; gap: 8px; justify-content: flex-end; }
  .composer details { margin-top: 10px; font-size: 12px; color: var(--ink-dim); }
  .composer details summary { cursor: pointer; }
  .composer .adv { margin-top: 8px; display: grid; gap: 8px; }
  .composer .adv input, .composer .adv textarea {
    width: 100%; min-height: 34px; font: inherit; font-size: 12.5px;
    background: rgba(0,0,0,0.3); color: var(--ink); border: 1px solid var(--line);
    border-radius: 8px; padding: 8px 10px;
  }
  .btn.dispatch {
    color: var(--blue); background: rgba(56,189,248,0.12);
    border-color: rgba(56,189,248,0.35); font-size: 13px; padding: 10px 16px;
  }
  .btn.dispatch:hover:not(:disabled) { background: rgba(56,189,248,0.2); }
  .composer-err { color: var(--red); font-size: 12px; margin-top: 6px; min-height: 14px; }

  /* Task cards — the product's primary objects. */
  .tasks {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 12px; margin-bottom: 20px;
  }
  .task-card {
    background: linear-gradient(180deg, var(--panel), var(--panel-2));
    border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px;
    cursor: pointer; transition: border-color 150ms ease;
  }
  .task-card:hover { border-color: var(--blue); }
  .task-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .task-goal {
    font-size: 13px; line-height: 1.45; color: var(--ink);
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .task-meta { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 11px; color: var(--ink-dim); }
  .st {
    display: inline-flex; padding: 2px 8px; border-radius: 999px; font-size: 10px;
    font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; white-space: nowrap;
  }
  .st.planning, .st.resolving { background: rgba(167,139,250,0.15); color: var(--violet); }
  .st.claiming, .st.working, .st.merging { background: rgba(56,189,248,0.15); color: var(--blue); }
  .st.queued { background: rgba(245,158,11,0.15); color: var(--amber); }
  .st.landed { background: rgba(34,197,94,0.15); color: var(--green); }
  .st.rejected, .st.failed { background: rgba(239,68,68,0.15); color: var(--red); }
  .gate-mark { margin-left: auto; font-size: 11px; white-space: nowrap; }
  .gate-mark.ok { color: var(--green); }
  .gate-mark.bad { color: var(--red); }
  .tag.task { background: rgba(45,212,191,0.15); color: #2dd4bf; }

  /* Drawer — task detail with the containment evidence. */
  .drawer-veil {
    position: fixed; inset: 0; background: rgba(5,8,18,0.6);
    backdrop-filter: blur(2px); z-index: 40;
  }
  .drawer {
    position: fixed; top: 0; right: 0; bottom: 0; width: min(560px, 92vw); z-index: 50;
    background: var(--panel); border-left: 1px solid var(--line); overflow-y: auto;
    padding: 20px 22px; box-shadow: -20px 0 60px rgba(0,0,0,0.45);
  }
  .drawer[hidden], .drawer-veil[hidden] { display: none; }
  .drawer-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
  .drawer h3 { margin: 0; font-size: 15px; line-height: 1.4; font-weight: 600; }
  .drawer-x {
    font: inherit; background: none; border: 1px solid var(--line); color: var(--ink-dim);
    border-radius: 8px; padding: 4px 10px; cursor: pointer; flex: 0 0 auto;
  }
  .drawer-x:hover { color: var(--ink); border-color: var(--blue); }
  .dsec { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line); }
  .dsec h4 {
    margin: 0 0 8px; font-size: 11px; text-transform: uppercase;
    letter-spacing: 1.2px; color: var(--ink-dim); font-weight: 600;
  }
  .dsec p { margin: 0; font-size: 13px; line-height: 1.55; }
  .dsec code {
    background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;
    font-family: ui-monospace, Menlo, monospace; font-size: 12px;
  }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    font-size: 11px; padding: 3px 8px; border-radius: 6px; background: rgba(0,0,0,0.3);
    border: 1px solid var(--line); font-family: ui-monospace, Menlo, monospace;
  }
  .specgrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
  .spec {
    font-size: 11.5px; padding: 6px 8px; border-radius: 8px;
    background: rgba(0,0,0,0.25); border: 1px solid var(--line);
  }
  .spec b {
    display: block; color: var(--ink-dim); font-weight: 600; font-size: 10px;
    text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 2px;
  }
  .gate-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
  .gate-head .verdict { font-weight: 700; font-size: 13px; }
  .gate-head .verdict.ok { color: var(--green); }
  .gate-head .verdict.bad { color: var(--red); }
  .dsec pre {
    margin: 8px 0 0; padding: 10px 12px; background: rgba(0,0,0,0.35);
    border: 1px solid var(--line); border-radius: 8px; font-size: 11.5px;
    line-height: 1.5; overflow-x: auto; white-space: pre-wrap; word-break: break-word;
    max-height: 220px; overflow-y: auto;
  }
  .dsec details { margin-top: 6px; }
  .dsec details summary {
    cursor: pointer; font-size: 12px; color: var(--ink-dim);
    font-family: ui-monospace, Menlo, monospace;
  }
  .dsec details summary:hover { color: var(--ink); }
  .tl { display: flex; flex-direction: column; gap: 8px; }
  .tl-row { display: flex; gap: 10px; align-items: baseline; font-size: 12.5px; }
  .tl-row .k { color: var(--ink-dim); flex: 0 0 88px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; }

  /* Runtime badges — which providers are actually live. */
  .cfg { display: flex; gap: 6px; align-items: center; }
  .cfgb {
    font-size: 11px; padding: 4px 9px; border-radius: 999px; white-space: nowrap;
    border: 1px solid var(--line); color: var(--ink-dim); background: rgba(0,0,0,0.25);
    font-family: ui-monospace, Menlo, monospace;
  }
  .cfgb.on { color: var(--green); border-color: rgba(34,197,94,0.3); }

  /* Task filter tabs. */
  .tf { display: flex; gap: 6px; margin-bottom: 10px; }
  .tfb {
    font: inherit; font-size: 11px; padding: 4px 10px; border-radius: 999px; cursor: pointer;
    border: 1px solid var(--line); color: var(--ink-dim); background: rgba(0,0,0,0.2);
  }
  .tfb.on { color: var(--blue); border-color: rgba(56,189,248,0.4); background: rgba(56,189,248,0.1); }

  /* Repo browser. */
  .rb-files { margin-top: 10px; }
  .rb-files details { margin-top: 4px; }
  .rb-files summary { cursor: pointer; font-size: 12px; font-family: ui-monospace, Menlo, monospace; color: var(--ink-dim); }
  .rb-files summary:hover { color: var(--ink); }
  .rb-repo.on { border-color: var(--blue); color: var(--blue); }
  #taskSearch {
    background: rgba(0,0,0,0.3); border: 1px solid var(--line); color: var(--ink);
    border-radius: 999px; padding: 4px 12px; font-size: 11px; margin-left: auto; min-width: 150px;
  }
  .tfb .n { opacity: 0.65; margin-left: 3px; }

  /* Unified diff in the drawer. */
  .dl {
    margin-top: 8px; padding: 10px 12px; background: rgba(0,0,0,0.35);
    border: 1px solid var(--line); border-radius: 8px; font-size: 11.5px;
    line-height: 1.55; overflow-x: auto; white-space: pre-wrap; word-break: break-word;
    max-height: 260px; overflow-y: auto; font-family: ui-monospace, Menlo, monospace;
  }
  .dl span { display: block; }
  .dl .add { background: rgba(34,197,94,0.13); color: #86efac; }
  .dl .del { background: rgba(239,68,68,0.13); color: #fca5a5; }
  .dl .ctx { color: var(--ink-dim); }

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
    <div style="display:flex;align-items:center;gap:10px">
      <div class="cfg" id="cfgBadges"></div>
      <div class="live" id="livePill"><span class="dot"></span><span id="liveText">Connecting…</span></div>
    </div>
  </header>

  <main class="wrap">
    <p class="thesis">
      <strong>Thesis:</strong> conflicts are a scheduling problem first, and a negotiation problem last.
      Each agent&rsquo;s change is a <strong>tributary</strong> — declared at the watershed, joined to the
      trunk at the confluence, and only the residual ever reaches the rapids. The LLM resolver is a safety
      net, not the spine.
    </p>

    <section class="replaybar" id="replaybar" hidden>
      <button class="btn" id="rpPlay" type="button">▶ Play</button>
      <input type="range" id="rpSeek" min="0" max="0" value="0" aria-label="Scrub the recorded run" />
      <span class="rp-meta" id="rpTime">0:00</span>
      <span class="rp-meta" id="rpCount">0 / 0 events</span>
      <a class="rp-link" href="/">Exit replay · live</a>
    </section>

    <section class="onboard" id="onboard" hidden>
      <div class="onboard-icon">▶</div>
      <div class="onboard-body">
        <div class="onboard-title">Nothing has happened yet</div>
        <div class="onboard-sub">
          Start five concurrent agents in a second terminal — two of them will declare the same file.
          Or trigger a single resolver beat to see the rapids on their own.
          Add <code>?replay</code> to the URL to watch a recorded run back.
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
        <div class="stage-help">Integrate · Three-way merges that passed the test gate and landed on the trunk.<span id="qDepth"></span></div>
      </div>
      <div class="stage s3">
        <div class="stage-head"><span class="stage-num">3</span><span class="stage-name">Rapids</span></div>
        <div class="stage-value" id="cRes" aria-live="polite">0</div>
        <div class="stage-help">Negotiate · Residual conflicts that survived both gates. This number should stay small.</div>
      </div>
    </section>

    <section class="composer" id="composer">
      <div class="composer-main">
        <textarea id="goalInput" placeholder="Dispatch a goal — e.g. bump the package version to 3.1.11 and note it in the README"></textarea>
        <details>
          <summary>Advanced — footprint &amp; direct edits</summary>
          <div class="adv">
            <input id="fpInput" placeholder="footprint override: src/index.js, README.md (optional)" />
            <textarea id="editsInput" rows="3" placeholder='direct edits JSON — skips the planner: {"src/index.js": "exports.render = ..."}'></textarea>
          </div>
        </details>
        <div class="composer-err" id="composerErr"></div>
      </div>
      <div class="composer-side">
        <button class="btn dispatch" id="dispatchBtn" type="button">Dispatch agent ↗</button>
        <button class="btn" id="demoPackBtn" type="button" title="Three preset tasks: clean, conflicting, broken">Run demo pack ↗</button>
      </div>
    </section>

    <div class="tf" id="taskFilter">
      <button class="tfb on" data-f="all" type="button">all</button>
      <button class="tfb" data-f="active" type="button">active</button>
      <button class="tfb" data-f="landed" type="button">landed</button>
      <button class="tfb" data-f="rejected" type="button">rejected</button>
      <input id="taskSearch" placeholder="search tasks…" />
    </div>
    <section class="tasks" id="tasks" aria-label="Dispatched tasks"></section>

    <section class="river" aria-label="Live river of active changes">
      <svg id="riverSvg" viewBox="0 0 1000 220" role="img" focusable="false" aria-label="Active changes converging into the trunk at the confluence">
        <g id="riverLayer"></g>
      </svg>
      <div class="river-cap" id="riverCap">Many tributaries · one trunk — the confluence is where they join</div>
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

    <section class="panel" style="margin-top:20px">
      <h2>Repos · verified trees</h2>
      <div class="chips" id="repoList"><span class="empty">Loading…</span></div>
      <div class="rb-files" id="repoFiles"></div>
    </section>

    <div class="drawer-veil" id="drawerVeil" hidden></div>
    <aside class="drawer" id="drawer" hidden aria-label="Task detail">
      <div class="drawer-head">
        <h3 id="dGoal"></h3>
        <button class="drawer-x" id="drawerX" type="button" aria-label="Close task detail">✕</button>
      </div>
      <div id="dBody"></div>
    </aside>
  </main>

  <footer>
    Tributary spike · many tributaries, one trunk · <a href="/registry/status">/registry/status</a> · <a href="/registry/replay">/registry/replay</a> · built for the Cloudflare “Build the next GitHub” challenge
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
  var mmss = function (ms) {
    var t = Math.max(0, Math.round(ms / 1000));
    return Math.floor(t / 60) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60);
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
  var setPill = function (state, text) {
    var pill = $('livePill');
    pill.className = 'live' + (state === 'live' ? '' : state === 'replay' ? ' replay' : ' stale');
    $('liveText').textContent = text;
  };
  var filesCell = function (files) {
    if (!files || !files.length) return '<span class="muted">—</span>';
    return files.map(function (f) { return '<code>' + esc(f) + '</code>'; }).join(' ');
  };

  var renderClaims = function (claims) {
    var tb = $('claims').querySelector('tbody');
    if (!claims.length) {
      tb.innerHTML = '<tr><td colspan="3" class="empty">No active claims.</td></tr>';
      return;
    }
    tb.innerHTML = claims.map(function (c) {
      var exp = c.expiresAt
        ? esc(ago(c.expiresAt).replace(' ago', ' from now'))
        : '<span class="muted">—</span>';
      return '<tr><td><span class="agent">' + esc(c.agentId) + '</span></td><td>' + filesCell(c.files) +
             '</td><td>' + exp + '</td></tr>';
    }).join('');
  };

  var renderWaitlist = function (q) {
    var tb = $('waitlist').querySelector('tbody');
    if (!q.length) {
      tb.innerHTML = '<tr><td colspan="3" class="empty">No waitlisted agents.</td></tr>';
      return;
    }
    tb.innerHTML = q.map(function (w) {
      return '<tr><td><span class="agent">' + esc(w.agentId) + '</span></td><td>' + filesCell(w.files) +
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

  // ---- tasks: the product surface ---------------------------------------
  var tasksById = {};
  var openTaskId = null;

  var taskFilter = 'all';
  var taskQuery = '';
  var renderTasks = function (tasks) {
    var host = $('tasks');
    if (!tasks || !tasks.length) { host.innerHTML = ''; tasksById = {}; return; }
    tasksById = {};
    var counts = { all: tasks.length, active: 0, landed: 0, rejected: 0 };
    tasks.forEach(function (t) {
      tasksById[t.id] = t;
      if (['landed','rejected','failed'].indexOf(t.status) === -1) counts.active++;
      if (t.status === 'landed') counts.landed++;
      if (t.status === 'rejected' || t.status === 'failed') counts.rejected++;
    });
    $('taskFilter').querySelectorAll('.tfb').forEach(function (b) {
      var f = b.getAttribute('data-f');
      b.innerHTML = esc(f) + '<span class="n">' + (counts[f] || 0) + '</span>';
    });
    var shown = tasks.filter(function (t) {
      var match = !taskQuery ||
        (t.goal + ' ' + t.agentId).toLowerCase().indexOf(taskQuery) !== -1;
      if (!match) return false;
      if (taskFilter === 'all') return true;
      if (taskFilter === 'active') return ['landed','rejected','failed'].indexOf(t.status) === -1;
      if (taskFilter === 'landed') return t.status === 'landed';
      return t.status === 'rejected' || t.status === 'failed';
    });
    host.innerHTML = shown.map(function (t) {
      tasksById[t.id] = t;
      var gateMark = '';
      if (t.gate && t.gate.provider) {
        gateMark = '<span class="gate-mark ' + (t.gate.exitCode === 0 ? 'ok' : 'bad') + '">' +
          (t.gate.exitCode === 0 ? 'sandbox ✓' : 'sandbox ✗') + '</span>';
      }
      return '<div class="task-card" data-task="' + esc(t.id) + '">' +
        '<div class="task-top"><span class="st ' + esc(t.status) + '">' + esc(t.status) + '</span>' +
        '<span class="agent">' + esc(t.agentId) + '</span>' + gateMark + '</div>' +
        '<div class="task-goal">' + esc(t.goal) + '</div>' +
        '<div class="task-meta"><span>' + esc(ago(t.createdAt)) + '</span>' +
        (t.reason ? '<span>· ' + esc(t.reason.slice(0, 60)) + '</span>' : '') +
        '</div></div>';
    }).join('');
    host.querySelectorAll('.task-card').forEach(function (el) {
      el.addEventListener('click', function () { openDrawer(el.getAttribute('data-task')); });
    });
    if (openTaskId && tasksById[openTaskId]) renderDrawer(tasksById[openTaskId]);
  };

  var sec = function (title, html) {
    return '<div class="dsec"><h4>' + title + '</h4>' + html + '</div>';
  };
  var trow = function (k, v) {
    return '<div class="tl-row"><div class="k">' + k + '</div><div>' + v + '</div></div>';
  };

  // Minimal LCS diff — task trees are small, so a DP table is fine.
  var diffLines = function (oldText, newText) {
    var a = String(oldText || '').split('\n');
    var b = String(newText || '').split('\n');
    var n = a.length, m = b.length, dp = [], i, j;
    for (i = 0; i <= n; i++) { dp[i] = []; for (j = 0; j <= m; j++) dp[i][j] = 0; }
    for (i = n - 1; i >= 0; i--) {
      for (j = m - 1; j >= 0; j--) {
        dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    var out = []; i = 0; j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { out.push('  ' + a[i]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push('- ' + a[i]); i++; }
      else { out.push('+ ' + b[j]); j++; }
    }
    while (i < n) out.push('- ' + a[i++]);
    while (j < m) out.push('+ ' + b[j++]);
    return out;
  };
  var diffHtml = function (oldT, newT) {
    return diffLines(oldT, newT).map(function (l) {
      var c = l.charAt(0) === '+' ? 'add' : l.charAt(0) === '-' ? 'del' : 'ctx';
      return '<span class="' + c + '">' + esc(l) + '</span>';
    }).join('');
  };

  var renderDrawer = function (t) {
    $('dGoal').textContent = t.goal;
    var parts = [];
    parts.push('<div class="tl">' +
      trow('status', '<span class="st ' + esc(t.status) + '">' + esc(t.status) + '</span>') +
      trow('agent', '<span class="agent">' + esc(t.agentId) + '</span>') +
      trow('created', esc(clock(t.createdAt)) + ' · ' + esc(ago(t.createdAt))) +
      (t.repo ? trow('repo', '<code>' + esc(t.repo) + '</code>') : '') +
      (t.commit ? trow('commit', '<code>' + esc(String(t.commit).slice(0, 10)) + '</code>') : '') +
      (t.reason ? trow('reason', esc(t.reason)) : '') +
      '</div>');

    if (t.history && t.history.length) {
      parts.push(sec('lifecycle', '<div class="tl">' + t.history.map(function (h) {
        return trow(esc(clock(h.at)),
          '<span class="st ' + esc(h.status) + '">' + esc(h.status) + '</span>' +
          (h.reason ? ' <span class="muted">' + esc(h.reason.slice(0, 60)) + '</span>' : ''));
      }).join('') + '</div>'));
    }

    if (t.plan && t.plan.rationale) {
      parts.push(sec('plan', '<p>' + esc(t.plan.rationale) + '</p>'));
    }
    if (t.footprint && t.footprint.length) {
      parts.push(sec('declared footprint', '<div class="chips">' +
        t.footprint.map(function (f) { return '<span class="chip">' + esc(f) + '</span>'; }).join('') +
        '</div>'));
    }
    if (t.edits && Object.keys(t.edits).length) {
      parts.push(sec('diff', Object.keys(t.edits).map(function (f) {
        var body = (t.before && f in t.before)
          ? '<div class="dl">' + diffHtml(t.before[f] || '', t.edits[f]) + '</div>'
          : '<pre>' + esc(t.edits[f]) + '</pre>';
        return '<details open><summary>' + esc(f) + '</summary>' + body + '</details>';
      }).join('')));
    }

    if (t.gate) {
      var g = t.gate;
      var spec = g.spec ? '<div class="specgrid">' + Object.keys(g.spec).map(function (k) {
        return '<div class="spec"><b>' + esc(k) + '</b>' + esc(String(g.spec[k])) + '</div>';
      }).join('') + '</div>' : '';
      var verifyHtml = '';
      if (g.verification) {
        var v = g.verification;
        verifyHtml = '<div class="gate-head" style="margin-top:10px">' +
          '<span class="verdict ' + (v.skipped ? '' : (v.exitCode === 0 ? 'ok' : 'bad')) + '">' +
          (v.skipped ? '⊘ verify skipped' : (v.exitCode === 0 ? '✓ verify passed' : '✗ verify failed')) + '</span>' +
          '<span class="muted" style="font-size:11px"><code>' + esc(v.command) + '</code> · exit ' +
          esc(String(v.exitCode)) + ' · ' + esc(String(v.durationMs)) + 'ms' +
          (v.timedOut ? ' · timed out' : '') + '</span></div>' +
          (v.reason ? '<p class="muted" style="font-size:11.5px">' + esc(v.reason) + '</p>' : '') +
          (v.stdout ? '<pre>' + esc(v.stdout) + '</pre>' : '') +
          (v.stderr ? '<pre style="border-color: rgba(239,68,68,0.45); color: #fca5a5">' + esc(v.stderr) + '</pre>' : '');
      }
      parts.push('<div class="dsec"><h4>Sandbox gate — the containment boundary</h4>' +
        '<div class="gate-head"><span class="verdict ' + (g.exitCode === 0 ? 'ok' : 'bad') + '">' +
        (g.exitCode === 0 ? '✓ passed' : '✗ rejected') + '</span>' +
        '<span class="muted" style="font-size:11px">' + esc(g.provider) + ' · exit ' +
        esc(String(g.exitCode)) + ' · ' + esc(String(g.durationMs)) + 'ms</span></div>' +
        spec + verifyHtml + (g.output ? '<pre>' + esc(g.output) + '</pre>' : '') + '</div>');
    }

    if (t.resolution) {
      var r = t.resolution;
      parts.push(sec('rapids · resolution',
        '<p>status: <b>' + esc(r.status || '—') + '</b>' +
        (r.via ? ' · via <code>' + esc(r.via) + '</code>' : '') +
        (r.files && r.files.length
          ? ' · files: ' + r.files.map(function (f) { return '<code>' + esc(f) + '</code>'; }).join(' ')
          : '') +
        '</p>'));
    }
    $('dBody').innerHTML = parts.join('');
  };

  var openDrawer = function (id) {
    var t = tasksById[id];
    if (!t) return;
    openTaskId = id;
    $('drawer').hidden = false;
    $('drawerVeil').hidden = false;
    renderDrawer(t);
  };
  var closeDrawer = function () {
    openTaskId = null;
    $('drawer').hidden = true;
    $('drawerVeil').hidden = true;
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

  // ---- the live river -----------------------------------------------------
  // Agents are streams; the waitlist parks before the watershed gate; the
  // trunk carries landed commits. Rebuilt only when its shape actually
  // changes, so the flow animation is not restarted on every heartbeat.
  var riverSig = null;
  var renderRiver = function (s) {
    var claims = s.activeClaims || [];
    var queued = s.waitlist || [];
    var merges = (s.stats && s.stats.totalMerges) || 0;
    var sig = claims.map(function (c) { return c.agentId; }).join(',') + '|' +
              queued.map(function (w) { return w.agentId; }).join(',') + '|' + merges;
    if (sig === riverSig) return;
    riverSig = sig;

    var W = 1000, H = 220, cx = 620, cy = 110, gateX = 180;
    var out = [];
    out.push(
      '<defs>' +
        '<linearGradient id="rvStream" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="' + cx + '" y2="0">' +
          '<stop offset="0" stop-color="#38bdf8" stop-opacity="0.15"/>' +
          '<stop offset="0.65" stop-color="#38bdf8" stop-opacity="0.7"/>' +
          '<stop offset="1" stop-color="#38bdf8" stop-opacity="1"/>' +
        '</linearGradient>' +
        '<linearGradient id="rvTrunk" gradientUnits="userSpaceOnUse" x1="' + cx + '" y1="0" x2="' + W + '" y2="0">' +
          '<stop offset="0" stop-color="#a78bfa"/>' +
          '<stop offset="1" stop-color="#38bdf8"/>' +
        '</linearGradient>' +
      '</defs>'
    );
    out.push('<rect class="rv-plate" x="0" y="0" width="' + W + '" height="' + H + '" rx="14"/>');
    out.push('<line class="rv-gate" x1="' + gateX + '" y1="14" x2="' + gateX + '" y2="' + (H - 20) + '"/>');
    out.push('<text class="rv-label" x="' + (gateX - 10) + '" y="' + (H - 6) + '" text-anchor="end">WATERSHED</text>');

    // waitlisted agents pool before the gate
    var wlTop = 18, wlBottom = 54;
    queued.forEach(function (w, i) {
      var y = queued.length === 1
        ? (wlTop + wlBottom) / 2
        : wlTop + (wlBottom - wlTop) * (i / (queued.length - 1));
      out.push('<path class="rv-wait" d="M0,' + y.toFixed(1) + ' L' + (gateX - 14) + ',' + y.toFixed(1) + '"/>');
    });

    // granted agents flow through the gate into the confluence
    var top = 74, bottom = H - 26;
    claims.forEach(function (c, i) {
      var y = claims.length === 1
        ? (top + bottom) / 2
        : top + (bottom - top) * (i / (claims.length - 1));
      out.push('<path class="rv-stream" d="M0,' + y.toFixed(1) + ' C 300,' + y.toFixed(1) +
               ' 470,' + cy + ' ' + cx + ',' + cy + '"/>');
    });

    out.push('<path class="rv-trunk-halo" d="M' + cx + ',' + cy + ' L' + W + ',' + cy + '"/>');
    out.push('<path class="rv-trunk" d="M' + cx + ',' + cy + ' L' + W + ',' + cy + '"/>');
    out.push('<circle class="rv-hub" cx="' + cx + '" cy="' + cy + '" r="12"/>');
    out.push('<circle class="rv-hub-core" cx="' + cx + '" cy="' + cy + '" r="6"/>');

    var nodes = Math.min(merges, 6);
    for (var n = 0; n < nodes; n++) {
      var x = cx + 70 + (W - 70 - cx) * ((n + 1) / (nodes + 1));
      out.push('<circle class="rv-commit" cx="' + x.toFixed(1) + '" cy="' + cy + '" r="4"/>');
    }

    out.push('<text class="rv-label" x="' + cx + '" y="' + (cy + 34) + '" text-anchor="middle">CONFLUENCE</text>');
    out.push('<text class="rv-label" x="' + (W - 14) + '" y="' + (cy - 18) + '" text-anchor="end">VERIFIED TRUNK</text>');

    var layer = $('riverLayer');
    if (layer) layer.innerHTML = out.join('');

    $('riverCap').textContent = (!claims.length && !queued.length && !merges)
      ? 'The trunk is quiet — no changes in flight'
      : (claims.length + ' in flight · ' + queued.length + ' queued · ' + merges + ' landed');
  };

  // ---- one render path for both live and replay --------------------------
  var applyState = function (s) {
    var ts = s.stats || {};
    var light = $('trunkLight');
    var label = $('trunkLabel');
    var green = ts.trunkStatus !== 'red';
    light.className = 'trunk-light ' + (green ? 'green' : 'red');
    light.textContent = green ? '✓' : '!';
    label.className = 'value ' + (green ? 'green' : 'red');
    label.textContent = green ? 'GREEN' : 'RED';

    tick($('cMerges'), ts.totalMerges || 0);
    tick($('cPrev'), ts.conflictsPrevented || 0);
    tick($('cRes'), ts.resolverInvocations || 0);

    renderClaims(s.activeClaims || []);
    renderWaitlist(s.waitlist || []);
    renderFeed(s.events);
    renderLastMerge(ts.lastMerge);
    renderRiver(s);
    if (s.tasks) renderTasks(s.tasks);
    var inflight = (s.tasks || []).filter(function (t) {
      return ['landed','rejected','failed'].indexOf(t.status) === -1;
    }).length;
    $('qDepth').textContent = inflight ? ' ' + inflight + ' in flight.' : '';
    if (ts.totalMerges !== lastMerges) { lastMerges = ts.totalMerges; loadRepos(); }

    var any = (ts.totalMerges || 0) + (ts.conflictsPrevented || 0) + (ts.resolverInvocations || 0);
    $('onboard').hidden = any > 0 || s.mode === 'replay';
  };

  var refreshNow = function () {
    return fetch('/registry/status', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) { applyState(data); })
      .catch(function () {});
  };

  // ---- live transport: SSE first, polling as the fallback -----------------
  var source = null;
  var pollTimer = null;
  var firstFrame = null;

  var stopPolling = function () {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  };

  var startPolling = function (reason) {
    if (pollTimer) return;
    setPill('stale', reason || 'Polling…');
    var poll = function () {
      fetch('/registry/status', { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (data) { applyState(data); setPill('stale', 'Polling · ' + clock(Date.now())); })
        .catch(function () { setPill('stale', 'Reconnecting…'); });
    };
    poll();
    pollTimer = setInterval(poll, 1500);
  };

  var startStream = function () {
    if (typeof EventSource === 'undefined') { startPolling('Polling (no SSE)…'); return; }
    try {
      source = new EventSource('/registry/events');
    } catch (e) {
      startPolling('Polling…');
      return;
    }
    var onData = function (ev) {
      if (firstFrame) { clearTimeout(firstFrame); firstFrame = null; }
      try {
        var data = JSON.parse(ev.data);
        applyState(data);
        setPill('live', 'Live · ' + clock(Date.now()));
      } catch (e) { /* ignore a malformed frame; the next one will land */ }
    };
    source.addEventListener('snapshot', onData);
    source.addEventListener('update', onData);
    source.addEventListener('open', function () {
      stopPolling();
      setPill('live', 'Live · ' + clock(Date.now()));
    });
    source.onerror = function () {
      setPill('stale', 'Reconnecting…');
      // EventSource retries on its own; only give up (readyState CLOSED) and
      // fall back to polling when the stream is genuinely finished.
      if (source && source.readyState === 2) {
        try { source.close(); } catch (e) {}
        source = null;
        startPolling('Polling…');
      }
    };
    // If nothing arrives soon, the endpoint is not usable — poll instead.
    firstFrame = setTimeout(function () {
      if (firstFrame) {
        firstFrame = null;
        if (source) { try { source.close(); } catch (e) {} source = null; }
        startPolling('Polling…');
      }
    }, 4000);
  };

  // ---- replay: reconstruct a run from the persisted event log ------------
  var replay = { events: [], idx: 0, timer: null };

  var derive = function (events, k) {
    var counters = {
      totalMerges: 0, conflictsPrevented: 0, resolverInvocations: 0, rejections: 0,
      trunkStatus: 'green', lastMerge: null
    };
    var active = {}, queued = {};
    for (var i = 0; i <= k && i < events.length; i++) {
      var e = events[i];
      if (e.kind === 'merge') {
        counters.totalMerges++;
        counters.lastMerge = { agentId: e.agentId, at: e.at };
        if (e.agentId) delete queued[e.agentId];
      } else if (e.kind === 'queued') {
        counters.conflictsPrevented++;
        if (e.agentId) queued[e.agentId] = true;
      } else if (e.kind === 'resolver') {
        counters.resolverInvocations++;
      } else if (e.kind === 'conflict') {
        counters.rejections++;
      } else if (e.kind === 'claim') {
        if (e.agentId) { active[e.agentId] = true; delete queued[e.agentId]; }
      } else if (e.kind === 'release') {
        if (e.agentId) delete active[e.agentId];
      }
    }
    return {
      mode: 'replay',
      stats: counters,
      activeClaims: Object.keys(active).map(function (a) { return { agentId: a, files: null }; }),
      waitlist: Object.keys(queued).map(function (a) { return { agentId: a, files: null }; }),
      events: events.slice(0, k + 1).slice(-40).reverse()
    };
  };

  var renderReplayFrame = function () {
    var k = replay.idx;
    applyState(derive(replay.events, k));
    var base = replay.events.length ? replay.events[0].at : 0;
    var at = replay.events[k] ? replay.events[k].at : base;
    $('rpTime').textContent = mmss(at - base);
    $('rpCount').innerHTML = '<b>' + (replay.events.length ? k + 1 : 0) + '</b> / ' + replay.events.length + ' events';
    $('rpSeek').value = String(k);
    setPill('replay', 'Replay · ' + (replay.events.length ? k + 1 : 0) + '/' + replay.events.length);
  };

  var stopPlay = function () {
    if (replay.timer) { clearInterval(replay.timer); replay.timer = null; }
    $('rpPlay').textContent = '▶ Play';
  };

  var togglePlay = function () {
    if (replay.timer) { stopPlay(); return; }
    if (replay.idx >= replay.events.length - 1) replay.idx = 0;
    $('rpPlay').textContent = '❚❚ Pause';
    replay.timer = setInterval(function () {
      if (replay.idx >= replay.events.length - 1) { stopPlay(); return; }
      replay.idx++;
      renderReplayFrame();
    }, 350);
  };

  var startReplay = function () {
    setPill('replay', 'Loading replay…');
    fetch('/registry/replay', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        replay.events = data.events || [];
        replay.idx = 0;
        var seek = $('rpSeek');
        seek.max = String(Math.max(0, replay.events.length - 1));
        seek.value = '0';
        $('replaybar').hidden = false;
        $('onboard').hidden = true;
        renderReplayFrame();
        if (replay.events.length > 1) togglePlay();
      })
      .catch(function () { setPill('stale', 'Replay unavailable'); });
  };

  // ---- controls -----------------------------------------------------------
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

  $('demoBtn').addEventListener('click', function () {
    var btn = this;
    btn.disabled = true;
    btn.textContent = 'Triggering…';
    fetch('/demo/conflict', { method: 'POST' })
      .then(function () { return pollTimer ? refreshNow() : null; })
      .catch(function () {})
      .then(function () { btn.disabled = false; btn.textContent = 'Trigger resolver beat'; });
  });

  $('dispatchBtn').addEventListener('click', function () {
    var err = $('composerErr');
    var goal = $('goalInput').value.trim();
    if (!goal) { err.textContent = 'describe the task first'; return; }
    var payload = { goal: goal };
    var fp = $('fpInput').value.trim();
    if (fp) {
      payload.footprint = fp.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }
    var ed = $('editsInput').value.trim();
    if (ed) {
      try { payload.edits = JSON.parse(ed); }
      catch (e) { err.textContent = 'edits must be valid JSON'; return; }
    }
    err.textContent = '';
    var btn = this;
    btn.disabled = true;
    btn.textContent = 'Dispatching…';
    fetch('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (!res.ok) {
          err.textContent = (res.body && res.body.error) || 'dispatch failed';
        } else {
          $('goalInput').value = '';
          $('editsInput').value = '';
        }
        if (pollTimer) refreshNow();
      })
      .catch(function () { err.textContent = 'dispatch failed — network'; })
      .then(function () { btn.disabled = false; btn.textContent = 'Dispatch agent ↗'; });
  });

  $('demoPackBtn').addEventListener('click', function () {
    var btn = this;
    btn.disabled = true;
    btn.textContent = 'Running…';
    fetch('/demo/pack', { method: 'POST' })
      .then(function () { return pollTimer ? refreshNow() : null; })
      .catch(function () {})
      .then(function () { btn.disabled = false; btn.textContent = 'Run demo pack ↗'; });
  });

  $('drawerX').addEventListener('click', closeDrawer);
  $('drawerVeil').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openTaskId) closeDrawer();
  });

  $('rpPlay').addEventListener('click', togglePlay);
  $('rpSeek').addEventListener('input', function () {
    stopPlay();
    replay.idx = parseInt(this.value, 10) || 0;
    renderReplayFrame();
  });

  // ---- repo browser ------------------------------------------------------
  var lastMerges = null, openRepo = null;
  var loadRepos = function () {
    fetch('/repos', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var repos = d.repos || [];
        $('repoList').innerHTML = repos.length
          ? repos.map(function (r) {
              return '<button class="tfb chip rb-repo' + (r === openRepo ? ' on' : '') +
                '" data-r="' + esc(r) + '" type="button">' + esc(r) + '</button>';
            }).join('')
          : '<span class="empty">No repos yet — dispatch a task.</span>';
        $('repoList').querySelectorAll('.rb-repo').forEach(function (el) {
          el.addEventListener('click', function () { openTree(el.getAttribute('data-r')); });
        });
      })
      .catch(function () { $('repoList').innerHTML = '<span class="empty">repo list unavailable</span>'; });
  };
  var openTree = function (name) {
    openRepo = name;
    loadRepos();
    $('repoFiles').innerHTML = '<div class="empty">Loading ' + esc(name) + '…</div>';
    fetch('/repos/' + encodeURIComponent(name), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var files = d.files || {};
        $('repoFiles').innerHTML = Object.keys(files).sort().map(function (f) {
          return '<details><summary>' + esc(f) + '</summary><pre>' + esc(files[f]) + '</pre></details>';
        }).join('') || '<div class="empty">empty tree</div>';
      })
      .catch(function () { $('repoFiles').innerHTML = '<div class="empty">tree unavailable</div>'; });
  };
  loadRepos();

  $('taskFilter').querySelectorAll('.tfb').forEach(function (el) {
    el.addEventListener('click', function () {
      taskFilter = el.getAttribute('data-f');
      $('taskFilter').querySelectorAll('.tfb').forEach(function (b) { b.classList.remove('on'); });
      el.classList.add('on');
      renderTasks(Object.keys(tasksById).map(function (k) { return tasksById[k]; }));
    });
  });
  $('taskSearch').addEventListener('input', function () {
    taskQuery = this.value.trim().toLowerCase();
    renderTasks(Object.keys(tasksById).map(function (k) { return tasksById[k]; }));
  });

  // Runtime badges: which providers are actually live on this deployment.
  fetch('/config', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (c) {
      $('cfgBadges').innerHTML =
        '<span class="cfgb">' + esc(c.mode || 'unknown') + '</span>' +
        '<span class="cfgb' + (c.sandbox === 'docker' ? ' on' : '') + '">sandbox: ' +
          esc(c.sandbox || 'in-process') + '</span>' +
        '<span class="cfgb' + (c.ai ? ' on' : '') + '">inference: ' +
          esc(c.ai ? c.ai.provider + '/' + c.ai.model : 'off') + '</span>';
    })
    .catch(function () {});

  // Boot: replay when asked, otherwise live over SSE.
  if (location.search.indexOf('replay') !== -1) {
    startReplay();
  } else {
    startStream();
  }
})();
</script>
</body>
</html>`;
