export const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Tributary · River Ops</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
<style>
  :root {
    --bg: #04060c;
    --bg2: #070b16;
    --panel: rgba(13, 20, 38, 0.74);
    --panel2: rgba(18, 28, 54, 0.82);
    --line: rgba(122, 162, 255, 0.14);
    --line2: rgba(122, 162, 255, 0.28);
    --ink: #eaf2ff;
    --dim: #8ea3c8;
    --faint: #5d6f96;
    --cyan: #38e1ff;
    --blue: #4f8cff;
    --green: #3dffb0;
    --green-bg: rgba(61, 255, 176, 0.10);
    --amber: #ffb648;
    --amber-bg: rgba(255, 182, 72, 0.10);
    --red: #ff5d73;
    --red-bg: rgba(255, 93, 115, 0.10);
    --violet: #b18cff;
    --violet-bg: rgba(177, 140, 255, 0.12);
    --pink: #ff7ad9;
    --teal: #2dd4bf;
    --font-ui: "Inter", ui-sans-serif, system-ui, -apple-system, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
    --font-display: "Space Grotesk", "Inter", ui-sans-serif, system-ui, sans-serif;
    --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    background:
      radial-gradient(1100px 700px at 12% -10%, rgba(56, 225, 255, 0.10), transparent 60%),
      radial-gradient(900px 700px at 88% 8%, rgba(79, 140, 255, 0.12), transparent 55%),
      radial-gradient(1000px 800px at 50% 115%, rgba(177, 140, 255, 0.10), transparent 60%),
      linear-gradient(180deg, var(--bg2), var(--bg));
    color: var(--ink);
    font-family: var(--font-ui);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    overflow: hidden;
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }

  .app { position: relative; z-index: 1; display: flex; flex-direction: column; height: 100vh; }
  .ambient {
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background:
      radial-gradient(760px 520px at 18% 8%, rgba(56, 225, 255, 0.13), transparent 62%),
      radial-gradient(680px 520px at 84% 4%, rgba(79, 140, 255, 0.14), transparent 58%),
      radial-gradient(820px 620px at 52% 112%, rgba(177, 140, 255, 0.12), transparent 60%),
      radial-gradient(520px 420px at 8% 78%, rgba(45, 212, 191, 0.08), transparent 60%);
    animation: ambientDrift 22s ease-in-out infinite alternate;
  }
  .ambient::after {
    content: ""; position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(122,162,255,0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(122,162,255,0.045) 1px, transparent 1px);
    background-size: 44px 44px;
    mask-image: radial-gradient(ellipse 90% 80% at 50% 42%, #000 20%, transparent 78%);
    -webkit-mask-image: radial-gradient(ellipse 90% 80% at 50% 42%, #000 20%, transparent 78%);
  }
  @keyframes ambientDrift {
    0% { transform: translate3d(0, 0, 0) scale(1); }
    50% { transform: translate3d(18px, -12px, 0) scale(1.04); }
    100% { transform: translate3d(-14px, 10px, 0) scale(1.02); }
  }
  :focus-visible { outline: 2px solid rgba(56, 225, 255, 0.75); outline-offset: 2px; border-radius: 8px; }

  /* ---------- top bar ---------- */
  .topbar {
    display: flex; align-items: center; justify-content: space-between; gap: 14px;
    padding: 12px 18px; border-bottom: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(4,6,12,0.85), rgba(4,6,12,0.55));
    backdrop-filter: blur(10px); z-index: 20; flex: 0 0 auto;
  }
  .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .brand-mark { width: 34px; height: 34px; flex: 0 0 34px; }
  .brand-mark path { fill: none; stroke: url(#brandGrad); stroke-width: 2.4; stroke-linecap: round; }
  .brand-mark .dot { fill: var(--cyan); }
  .brand-title { font-size: 15px; font-weight: 700; letter-spacing: 0.2px; }
  .brand-sub { font-size: 11px; color: var(--dim); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .brand-title, .stage-head h1, .counter span, .trunk-pill .value, .onboard-title, .task-goal { font-family: var(--font-display); }
  .top-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
  .cfg { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .cfgb {
    font-size: 10.5px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase;
    padding: 4px 8px; border-radius: 999px; color: var(--dim);
    background: rgba(255,255,255,0.04); border: 1px solid var(--line);
  }
  .cfgb.on { color: var(--cyan); border-color: rgba(56,225,255,0.4); background: rgba(56,225,255,0.08); }
  .live {
    display: inline-flex; align-items: center; gap: 8px; padding: 6px 11px;
    border-radius: 999px; font-size: 11.5px; font-weight: 600; white-space: nowrap;
    background: rgba(61,255,176,0.08); color: var(--green); border: 1px solid rgba(61,255,176,0.3);
  }
  .live.stale { background: rgba(255,182,72,0.08); color: var(--amber); border-color: rgba(255,182,72,0.35); }
  .live.replay { background: var(--violet-bg); color: var(--violet); border-color: rgba(177,140,255,0.4); }
  .live .dot { width: 8px; height: 8px; border-radius: 999px; background: currentColor; box-shadow: 0 0 0 0 rgba(61,255,176,0.55); animation: pulse 1.6s ease-out infinite; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(61,255,176,0.55); } 70% { box-shadow: 0 0 0 9px rgba(61,255,176,0); } 100% { box-shadow: 0 0 0 0 rgba(61,255,176,0); } }

  /* ---------- layout ---------- */
  .layout {
    flex: 1 1 auto; min-height: 0; display: grid; gap: 12px; padding: 12px;
    grid-template-columns: 292px minmax(0, 1fr) 372px;
  }
  @media (max-width: 1180px) { .layout { grid-template-columns: 260px minmax(0,1fr) 330px; } }
  @media (max-width: 980px) { .layout { grid-template-columns: 1fr; overflow: auto; } .rail { max-height: none; } }
  .rail { display: flex; flex-direction: column; gap: 12px; min-height: 0; overflow: auto; padding-right: 2px; }
  .rail::-webkit-scrollbar, .feed::-webkit-scrollbar, .tasks::-webkit-scrollbar { width: 8px; }
  .rail::-webkit-scrollbar-thumb, .feed::-webkit-scrollbar-thumb, .tasks::-webkit-scrollbar-thumb { background: rgba(122,162,255,0.18); border-radius: 8px; }

  .panel {
    position: relative; overflow: hidden;
    background: linear-gradient(180deg, var(--panel), var(--panel2));
    border: 1px solid var(--line); border-radius: 18px; padding: 14px 15px;
    box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset, 0 20px 44px rgba(0,0,0,0.32);
    backdrop-filter: blur(10px); flex: 0 0 auto;
  }
  .panel::before {
    content: ""; position: absolute; inset: 0 0 auto; height: 1px; pointer-events: none;
    background: linear-gradient(90deg, transparent, rgba(140,190,255,0.28), transparent);
  }
  .panel:hover { border-color: rgba(122,162,255,0.22); }
  .panel h2 {
    margin: 0 0 12px; font-size: 10.5px; text-transform: uppercase; letter-spacing: 1.5px;
    color: var(--dim); font-weight: 700; display: flex; align-items: center; gap: 8px;
  }
  .panel h2::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, var(--line2), transparent); }

  /* ---------- composer ---------- */
  .composer label { display: block; font-size: 11px; color: var(--dim); margin: 10px 0 5px; letter-spacing: 0.4px; }
  .composer input, .composer textarea, .composer select {
    width: 100%; font: inherit; font-size: 12.5px; color: var(--ink);
    background: rgba(0,0,0,0.35); border: 1px solid var(--line); border-radius: 10px;
    padding: 9px 11px; outline: none; resize: vertical;
  }
  .composer input:focus, .composer textarea:focus { border-color: rgba(56,225,255,0.55); box-shadow: 0 0 0 3px rgba(56,225,255,0.10); }
  .composer textarea { min-height: 58px; font-family: var(--font-mono); font-size: 12px; }
  .composer details { margin-top: 10px; }
  .composer summary { cursor: pointer; font-size: 11.5px; color: var(--dim); }
  .composer-actions { display: flex; gap: 8px; margin-top: 12px; }
  .btn {
    font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; padding: 9px 12px;
    border-radius: 10px; border: 1px solid var(--line2); color: var(--ink);
    background: rgba(255,255,255,0.05); transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
  }
  .btn:hover:not(:disabled) { transform: translateY(-1px); background: rgba(255,255,255,0.09); border-color: rgba(56,225,255,0.5); }
  .btn:disabled { opacity: 0.55; cursor: progress; }
  .btn.primary { color: #04121a; background: linear-gradient(135deg, var(--cyan), var(--blue)); border-color: transparent; }
  .btn.ghost { color: var(--violet); border-color: rgba(177,140,255,0.4); background: var(--violet-bg); }
  .err { color: var(--red); font-size: 11.5px; margin-top: 8px; min-height: 14px; }
  .cmd {
    font-family: var(--font-mono); font-size: 12px;
    background: rgba(0,0,0,0.4); border: 1px solid var(--line); color: var(--ink);
    padding: 8px 10px; border-radius: 9px; cursor: pointer; white-space: nowrap;
  }
  .cmd:hover { border-color: var(--cyan); }
  .cmd.copied { color: var(--green); border-color: rgba(61,255,176,0.5); }

  .onboard { border: 1px dashed rgba(56,225,255,0.4); background: linear-gradient(180deg, rgba(56,225,255,0.07), rgba(56,225,255,0.02)); }
  .onboard[hidden] { display: none; }
  .onboard-icon { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: rgba(56,225,255,0.14); color: var(--cyan); font-size: 13px; }
  .onboard-body { flex: 1 1 200px; }
  .onboard-title { font-weight: 700; font-size: 13px; }
  .onboard-sub { color: var(--dim); font-size: 12px; margin-top: 3px; line-height: 1.5; }
  .onboard-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  /* ---------- tables ---------- */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; color: var(--faint); font-size: 10px; text-transform: uppercase; letter-spacing: 1px; padding: 0 0 8px; font-weight: 700; }
  td { padding: 8px 0; border-top: 1px solid rgba(122,162,255,0.08); vertical-align: top; }
  td:first-child { padding-right: 10px; }
  .agent { color: var(--cyan); font-weight: 700; }
  .muted { color: var(--faint); }
  .empty { color: var(--faint); font-size: 12px; padding: 10px 0; }
  code { font-family: var(--font-mono); font-size: 11px; color: #bfe9ff; background: rgba(56,225,255,0.08); padding: 1px 5px; border-radius: 6px; }
  .pill { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.6px; }
  .pill.queued { color: var(--amber); background: var(--amber-bg); border: 1px solid rgba(255,182,72,0.35); }

  /* ---------- river stage ---------- */
  .river-stage {
    display: flex; flex-direction: column; min-height: 0; border-radius: 18px; overflow: hidden;
    border: 1px solid var(--line);
    background:
      radial-gradient(900px 500px at 70% 20%, rgba(56,225,255,0.07), transparent 60%),
      linear-gradient(180deg, rgba(7,11,22,0.9), rgba(4,6,12,0.95));
    box-shadow: 0 24px 60px rgba(0,0,0,0.45);
  }
  .stage-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 16px 18px 10px; }
  .stage-head h1 { margin: 0; font-size: 20px; letter-spacing: 0.3px; }
  .stage-head p { margin: 4px 0 0; color: var(--dim); font-size: 12.5px; }
  .trunk-pill { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 14px; background: rgba(255,255,255,0.04); border: 1px solid var(--line); }
  .trunk-light { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-size: 14px; transition: all 200ms ease; }
  .trunk-light.green { background: var(--green-bg); color: var(--green); box-shadow: 0 0 0 1px rgba(61,255,176,0.4), 0 0 22px rgba(61,255,176,0.25); }
  .trunk-light.red { background: var(--red-bg); color: var(--red); box-shadow: 0 0 0 1px rgba(255,93,115,0.5), 0 0 22px rgba(255,93,115,0.3); animation: blink 1.1s ease-in-out infinite; }
  @keyframes blink { 50% { opacity: 0.55; } }
  .trunk-pill .label { font-size: 9.5px; color: var(--faint); text-transform: uppercase; letter-spacing: 1.4px; }
  .trunk-pill .value { font-size: 16px; font-weight: 800; letter-spacing: 0.4px; }
  .value.green { color: var(--green); } .value.red { color: var(--red); }
  .river-wrap { position: relative; flex: 1 1 auto; min-height: 320px; padding: 6px 10px 0; }
  .river-wrap svg { position: relative; z-index: 1; width: 100%; height: 100%; display: block; }
  .flow-canvas { position: absolute; inset: 0; z-index: 3; width: 100%; height: 100%; pointer-events: none; }
  .rive-hero { position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0.92; }
  @media (prefers-reduced-motion: reduce) { .flow-canvas, .rive-hero { display: none; } }
  .river-cap { text-align: center; padding: 6px 0 12px; font-size: 10.5px; letter-spacing: 1.6px; text-transform: uppercase; color: var(--faint); }
  .stage-counters { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 0 16px 16px; }
  .counter { background: rgba(255,255,255,0.035); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; }
  .counter span { display: block; font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .counter span.tick { transform: scale(1.08); transition: transform 200ms ease; }
  .counter label { font-size: 10px; color: var(--faint); text-transform: uppercase; letter-spacing: 1px; }
  @media (max-width: 720px) { .stage-counters { grid-template-columns: repeat(2,1fr); } }

  /* river svg classes */
  .rv-label { fill: var(--faint); font-size: 10px; letter-spacing: 1.8px; text-transform: uppercase; font-weight: 700; }
  .rv-label.strong { fill: var(--dim); }
  .rv-wait { fill: none; stroke: var(--amber); stroke-width: 2; stroke-linecap: round; stroke-dasharray: 3 8; opacity: 0.75; }
  .rv-stream { fill: none; stroke-linecap: round; }
  .rv-stream-halo { fill: none; stroke-linecap: round; opacity: 0.18; filter: blur(4px); }
  .rv-trunk-halo { fill: none; stroke: url(#rvTrunkGrad); stroke-width: 26; stroke-linecap: round; opacity: 0.16; filter: blur(6px); }
  .rv-trunk { fill: none; stroke: url(#rvTrunkGrad); stroke-width: 9; stroke-linecap: round; }
  .rv-trunk-core { fill: none; stroke: #dff6ff; stroke-width: 2.2; stroke-linecap: round; opacity: 0.7; stroke-dasharray: 3 16; animation: rvTrunkFlow 5.5s linear infinite; }
  .rv-ripple { fill: none; stroke: #b18cff; stroke-width: 1.4; opacity: 0.75; transform-box: fill-box; transform-origin: center; animation: rvRipple 2.8s ease-out infinite; }
  .rv-gate { stroke: rgba(255,182,72,0.5); stroke-width: 1.2; stroke-dasharray: 5 7; }
  .rv-node { fill: var(--green); }
  .rv-node-halo { fill: var(--green); opacity: 0.22; }
  .rv-hub { fill: rgba(177,140,255,0.28); }
  .rv-hub-core { fill: #0a0f1e; stroke: var(--violet); stroke-width: 2.4; }
  .rv-rapids { fill: none; stroke: var(--violet); stroke-width: 2; stroke-dasharray: 4 6; opacity: 0.8; }
  .rv-rapid-dot { fill: var(--violet); }
  .rv-flow { fill: none; stroke: #eaf7ff; stroke-width: 1.6; stroke-linecap: round; opacity: 0.9; }
  @keyframes rvFlow { to { stroke-dashoffset: -36; } }
  @keyframes rvTrunkFlow { to { stroke-dashoffset: -38; } }
  @keyframes rvRipple { 0% { transform: scale(0.45); opacity: 0.8; } 100% { transform: scale(2.8); opacity: 0; } }

  /* ---------- tasks ---------- */
  .tf { display: flex; gap: 6px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
  .tfb {
    font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; padding: 5px 9px;
    border-radius: 999px; border: 1px solid var(--line); color: var(--dim); background: rgba(255,255,255,0.03);
  }
  .tfb.on { color: var(--cyan); border-color: rgba(56,225,255,0.5); background: rgba(56,225,255,0.08); }
  .tfb .n { opacity: 0.7; margin-left: 4px; }
  #taskSearch { background: rgba(0,0,0,0.35); border: 1px solid var(--line); color: var(--ink); border-radius: 999px; padding: 5px 11px; font-size: 11.5px; margin-left: auto; min-width: 130px; }
  .tasks { display: flex; flex-direction: column; gap: 8px; max-height: 46vh; overflow: auto; padding-right: 2px; }
  .task-card {
    position: relative; border: 1px solid var(--line); border-radius: 13px; padding: 11px 12px 11px 15px;
    background: linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02));
    cursor: pointer; transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
  }
  .task-card::before { content: ""; position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px; border-radius: 3px; background: var(--faint); }
  .task-card:hover { transform: translateY(-1px); border-color: rgba(56,225,255,0.5); }
  .task-card[data-status="landed"]::before { background: var(--green); }
  .task-card[data-status="rejected"]::before, .task-card[data-status="failed"]::before { background: var(--red); }
  .task-card[data-status="working"]::before, .task-card[data-status="merging"]::before, .task-card[data-status="claiming"]::before { background: var(--cyan); }
  .task-card[data-status="queued"]::before { background: var(--amber); }
  .task-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .st { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; padding: 2px 7px; border-radius: 999px; }
  .st.planning, .st.claiming, .st.working, .st.merging, .st.resolving { background: rgba(56,225,255,0.12); color: var(--cyan); }
  .st.queued { background: var(--amber-bg); color: var(--amber); }
  .st.landed { background: var(--green-bg); color: var(--green); }
  .st.rejected, .st.failed { background: var(--red-bg); color: var(--red); }
  .task-goal { font-size: 13px; font-weight: 600; line-height: 1.35; }
  .task-meta { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 11px; color: var(--dim); flex-wrap: wrap; }
  .gate-mark { font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 999px; }
  .gate-mark.ok { color: var(--green); background: var(--green-bg); }
  .gate-mark.bad { color: var(--red); background: var(--red-bg); }
  .tag { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .tag.claim { background: rgba(56,225,255,0.12); color: var(--cyan); }
  .tag.release { background: rgba(61,255,176,0.12); color: var(--green); }
  .tag.merge { background: var(--violet-bg); color: var(--violet); }
  .tag.conflict, .tag.task { background: rgba(255,93,115,0.12); color: var(--red); }
  .tag.resolver, .tag.queued { background: var(--amber-bg); color: var(--amber); }

  /* ---------- feed ---------- */
  .feed { display: flex; flex-direction: column; gap: 7px; max-height: 34vh; overflow: auto; }
  .feed-row { display: grid; grid-template-columns: 58px 1fr; gap: 8px; font-size: 11.5px; }
  .feed-row .t { color: var(--faint); font-variant-numeric: tabular-nums; padding-top: 1px; }
  .feed-row .b { color: var(--dim); line-height: 1.45; }
  .feed-row .who { color: var(--cyan); font-weight: 700; }

  /* ---------- last merge / repos ---------- */
  .last-merge { font-size: 12px; color: var(--dim); line-height: 1.5; }
  .repo-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .rb-repo.on { color: var(--cyan); border-color: rgba(56,225,255,0.55); background: rgba(56,225,255,0.08); }
  .repo-files details { border: 1px solid var(--line); border-radius: 10px; margin-top: 7px; background: rgba(0,0,0,0.22); }
  .repo-files summary { cursor: pointer; padding: 8px 10px; font-size: 12px; color: var(--ink); }
  .repo-files pre { margin: 0; padding: 10px; overflow: auto; font-size: 11px; color: #bfe9ff; max-height: 220px; }

  /* ---------- drawer ---------- */
  .veil { position: fixed; inset: 0; background: rgba(2,4,10,0.55); backdrop-filter: blur(3px); z-index: 40; }
  .drawer {
    position: fixed; top: 0; right: 0; height: 100vh; width: min(600px, 94vw); z-index: 50;
    background: linear-gradient(180deg, rgba(10,15,30,0.96), rgba(6,10,20,0.98));
    border-left: 1px solid var(--line2); box-shadow: -30px 0 80px rgba(0,0,0,0.55);
    display: flex; flex-direction: column; }
  .drawer[hidden] { display: none; }
  .drawer-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 18px 20px 12px; border-bottom: 1px solid var(--line); }
  .drawer-head h2 { margin: 0; font-size: 16px; line-height: 1.35; }
  .drawer-x { font: inherit; font-size: 14px; cursor: pointer; color: var(--dim); background: rgba(255,255,255,0.05); border: 1px solid var(--line); border-radius: 9px; width: 32px; height: 32px; }
  .drawer-x:hover { color: var(--ink); border-color: rgba(56,225,255,0.5); }
  .drawer-body { flex: 1 1 auto; overflow: auto; padding: 16px 20px 28px; }
  .dsec { margin-bottom: 18px; }
  .dsec h4 { margin: 0 0 10px; font-size: 10.5px; text-transform: uppercase; letter-spacing: 1.4px; color: var(--dim); }
  .tl { display: flex; flex-direction: column; gap: 6px; }
  .tl-row { display: grid; grid-template-columns: 92px 1fr; gap: 10px; font-size: 12px; }
  .tl-row .k { color: var(--faint); font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; padding-top: 2px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { font-size: 11px; color: #bfe9ff; background: rgba(56,225,255,0.08); border: 1px solid rgba(56,225,255,0.22); padding: 3px 8px; border-radius: 8px; }
  .dl { font-family: var(--font-mono); font-size: 11.5px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
  .dl .add { color: var(--green); } .dl .del { color: var(--red); } .dl .ctx { color: var(--dim); }
  pre { background: rgba(0,0,0,0.4); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; overflow: auto; font-size: 11.5px; color: #d7e9ff; margin: 8px 0 0; }
  details summary { cursor: pointer; color: var(--cyan); font-size: 12.5px; font-weight: 700; padding: 4px 0; }
  .gate-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
  .verdict { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; padding: 3px 9px; border-radius: 999px; }
  .verdict.ok { color: var(--green); background: var(--green-bg); }
  .verdict.bad { color: var(--red); background: var(--red-bg); }
  .specgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px,1fr)); gap: 7px; margin: 10px 0; }
  .spec { background: rgba(255,255,255,0.04); border: 1px solid var(--line); border-radius: 9px; padding: 7px 9px; font-size: 11px; }
  .spec b { display: block; color: var(--faint); font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px; }

  /* ---------- replay ---------- */
  .replaybar {
    position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 60;
    display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 14px;
    background: rgba(10,14,28,0.92); border: 1px solid rgba(177,140,255,0.45); box-shadow: 0 18px 50px rgba(0,0,0,0.55);
    backdrop-filter: blur(10px); max-width: min(760px, 94vw);
  }
  .replaybar[hidden] { display: none; }
  .replaybar input[type="range"] { flex: 1 1 220px; min-width: 140px; accent-color: var(--violet); }
  .rp-meta { font-size: 11.5px; color: var(--dim); font-variant-numeric: tabular-nums; }
  .rp-meta b { color: var(--ink); }
  .rp-link { font-size: 11.5px; color: var(--violet); text-decoration: none; border-bottom: 1px dotted var(--violet); white-space: nowrap; }

  /* ---------- craft pass: denser, glossier ops console ---------- */
  :root {
    --panel: rgba(10, 16, 31, 0.68);
    --panel2: rgba(14, 22, 43, 0.8);
    --line: rgba(148, 178, 255, 0.13);
    --line2: rgba(148, 178, 255, 0.26);
    --ink: #f2f7ff;
    --dim: #9db1d6;
    --faint: #64769c;
    --cyan: #5ee7ff;
    --blue: #6f9dff;
    --green: #52ffc4;
    --green-bg: rgba(82, 255, 196, 0.1);
    --amber: #ffc46b;
    --amber-bg: rgba(255, 196, 107, 0.1);
    --red: #ff7185;
    --red-bg: rgba(255, 113, 133, 0.1);
    --violet: #c4a6ff;
    --violet-bg: rgba(196, 166, 255, 0.12);
    --pink: #ff8ae0;
    --teal: #3ee6c4;
    --radius: 22px;
    --shadow: 0 1px 0 rgba(255,255,255,0.05) inset, 0 24px 70px rgba(0,0,0,0.42), 0 0 0 1px rgba(122,162,255,0.05);
  }
  html { color-scheme: dark; }
  body {
    background:
      radial-gradient(1200px 800px at 8% -12%, rgba(94,231,255,0.15), transparent 55%),
      radial-gradient(1000px 760px at 92% 4%, rgba(111,157,255,0.17), transparent 52%),
      radial-gradient(1100px 900px at 50% 118%, rgba(196,166,255,0.13), transparent 58%),
      linear-gradient(180deg, #070b18, #04060d 55%, #03040a);
    font-feature-settings: "ss01", "cv11";
  }
  body::after {
    content: ""; position: fixed; inset: 0; z-index: 2; pointer-events: none; opacity: 0.045;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
  }
  .ambient {
    background:
      radial-gradient(820px 560px at 14% 6%, rgba(94,231,255,0.14), transparent 60%),
      radial-gradient(720px 560px at 86% 0%, rgba(111,157,255,0.16), transparent 58%),
      radial-gradient(900px 680px at 50% 116%, rgba(196,166,255,0.14), transparent 62%),
      radial-gradient(560px 460px at 4% 80%, rgba(62,230,196,0.08), transparent 60%);
    animation-duration: 26s;
  }
  .ambient::after {
    background-size: 56px 56px;
    opacity: 0.55;
    mask-image: radial-gradient(ellipse 96% 86% at 50% 44%, #000 12%, transparent 82%);
    -webkit-mask-image: radial-gradient(ellipse 96% 86% at 50% 44%, #000 12%, transparent 82%);
  }

  .topbar {
    padding: 14px 22px;
    background: linear-gradient(180deg, rgba(7,11,20,0.86), rgba(7,11,20,0.58));
    backdrop-filter: blur(14px) saturate(1.15);
    box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 14px 44px rgba(0,0,0,0.28);
  }
  .topbar::after {
    content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(94,231,255,0.4), rgba(196,166,255,0.32), transparent);
    pointer-events: none;
  }
  .brand-mark { filter: drop-shadow(0 0 10px rgba(94,231,255,0.35)); }
  .brand-title { font-size: 16px; letter-spacing: 0.4px; }
  .brand-sub { letter-spacing: 0.2px; }
  .cfgb {
    background: rgba(255,255,255,0.035); border: 1px solid rgba(148,178,255,0.15);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
  }
  .cfgb.on {
    color: #d9fbff; border-color: rgba(94,231,255,0.45);
    background: linear-gradient(180deg, rgba(94,231,255,0.14), rgba(111,157,255,0.08));
    box-shadow: 0 0 18px rgba(94,231,255,0.12), inset 0 1px 0 rgba(255,255,255,0.08);
  }
  .live {
    box-shadow: 0 0 0 1px rgba(82,255,196,0.18), 0 0 22px rgba(82,255,196,0.1);
  }
  .live.stale { box-shadow: 0 0 0 1px rgba(255,196,107,0.2), 0 0 22px rgba(255,196,107,0.1); }
  .live.replay { box-shadow: 0 0 0 1px rgba(196,166,255,0.22), 0 0 22px rgba(196,166,255,0.12); }

  .layout { gap: 14px; padding: 14px; grid-template-columns: 304px minmax(0, 1fr) 384px; }
  @media (max-width: 1180px) { .layout { grid-template-columns: 272px minmax(0,1fr) 344px; } }
  @media (max-width: 980px) { .layout { grid-template-columns: 1fr; } }
  .rail { gap: 14px; }

  .panel {
    border: 1px solid transparent; border-radius: var(--radius); padding: 18px;
    background:
      linear-gradient(180deg, var(--panel), var(--panel2)) padding-box,
      linear-gradient(135deg, rgba(94,231,255,0.24), rgba(111,157,255,0.1) 42%, rgba(196,166,255,0.2)) border-box;
    box-shadow: var(--shadow);
    backdrop-filter: blur(14px) saturate(1.08);
    animation: panelIn 0.55s cubic-bezier(0.2, 0.75, 0.2, 1) both;
  }
  .rail .panel:nth-child(2) { animation-delay: 0.05s; }
  .rail .panel:nth-child(3) { animation-delay: 0.1s; }
  .rail .panel:nth-child(4) { animation-delay: 0.15s; }
  .rail .panel:nth-child(5) { animation-delay: 0.2s; }
  .panel::before {
    background: linear-gradient(90deg, transparent, rgba(150,205,255,0.4), transparent);
    opacity: 0.75;
  }
  .panel:hover {
    border-color: rgba(148,178,255,0.18);
    box-shadow: var(--shadow), 0 0 0 1px rgba(94,231,255,0.06), 0 28px 80px rgba(0,0,0,0.5);
  }
  .panel h2 {
    font-size: 11px; letter-spacing: 1.9px; color: #b9c8e8; margin-bottom: 14px;
  }
  .panel h2::after { background: linear-gradient(90deg, rgba(148,178,255,0.28), transparent); }
  .panel h2::before {
    content: ""; width: 7px; height: 7px; border-radius: 2px; flex: 0 0 7px;
    background: linear-gradient(135deg, var(--cyan), var(--violet));
    box-shadow: 0 0 12px rgba(94,231,255,0.38);
  }
  @keyframes panelIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: none; }
  }

  .composer label { font-size: 10.5px; letter-spacing: 0.9px; text-transform: uppercase; color: #8ea3c8; margin: 12px 0 6px; }
  .composer input, .composer textarea, .composer select {
    background: rgba(2, 6, 16, 0.58); border: 1px solid rgba(148,178,255,0.15);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), inset 0 10px 28px rgba(0,0,0,0.28);
  }
  .composer input:focus, .composer textarea:focus {
    border-color: rgba(94,231,255,0.6); box-shadow: 0 0 0 3px rgba(94,231,255,0.12), inset 0 1px 0 rgba(255,255,255,0.04);
  }
  .btn {
    border-radius: 12px; padding: 10px 14px; letter-spacing: 0.2px;
    border: 1px solid rgba(148,178,255,0.24); background: rgba(255,255,255,0.055);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 24px rgba(0,0,0,0.22);
  }
  .btn:hover:not(:disabled) {
    transform: translateY(-1px); background: rgba(255,255,255,0.1);
    border-color: rgba(94,231,255,0.55); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 32px rgba(0,0,0,0.3), 0 0 20px rgba(94,231,255,0.08);
  }
  .btn.primary {
    color: #04121f; border: 0;
    background: linear-gradient(135deg, #5ee7ff 0%, #3f7dff 52%, #7c5cff 100%);
    box-shadow: 0 14px 34px rgba(63,125,255,0.32), inset 0 1px 0 rgba(255,255,255,0.28);
  }
  .btn.primary:hover:not(:disabled) { filter: brightness(1.06); }
  .btn.ghost { color: #d7c8ff; border-color: rgba(196,166,255,0.4); background: linear-gradient(180deg, rgba(196,166,255,0.14), rgba(196,166,255,0.06)); }
  .cmd {
    border-radius: 10px; border: 1px solid rgba(148,178,255,0.2);
    background: rgba(2,6,16,0.55); box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
  }
  .cmd:hover { border-color: rgba(94,231,255,0.6); box-shadow: 0 0 18px rgba(94,231,255,0.1); }
  .onboard {
    border: 1px dashed rgba(94,231,255,0.45);
    background: linear-gradient(135deg, rgba(94,231,255,0.1), rgba(111,157,255,0.05) 55%, rgba(196,166,255,0.08));
    box-shadow: 0 0 34px rgba(94,231,255,0.07), var(--shadow);
  }

  table { font-size: 12.5px; }
  th { color: #7f92b8; font-size: 10px; letter-spacing: 1.2px; }
  td { border-top-color: rgba(148,178,255,0.09); }
  tbody tr { transition: background 140ms ease; }
  tbody tr:hover td { background: rgba(94,231,255,0.035); }
  code {
    font-family: var(--font-mono); font-size: 10.5px; color: #c8f4ff;
    background: linear-gradient(180deg, rgba(94,231,255,0.12), rgba(94,231,255,0.06));
    border: 1px solid rgba(94,231,255,0.16); padding: 1px 6px; border-radius: 7px;
  }
  .pill.queued { box-shadow: 0 0 14px rgba(255,196,107,0.08); }

  .river-stage {
    border: 1px solid transparent; border-radius: 26px; overflow: hidden;
    background:
      radial-gradient(900px 520px at 72% 18%, rgba(94,231,255,0.1), transparent 58%),
      linear-gradient(180deg, rgba(8,12,24,0.94), rgba(4,6,12,0.97)) padding-box,
      linear-gradient(135deg, rgba(94,231,255,0.26), rgba(63,125,255,0.12) 45%, rgba(196,166,255,0.24)) border-box;
    box-shadow: 0 34px 96px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06);
    animation: panelIn 0.6s cubic-bezier(0.2, 0.75, 0.2, 1) both;
  }
  .stage-head { padding: 20px 22px 10px; }
  .stage-head h1 {
    font-size: 30px; letter-spacing: 0.6px; line-height: 1.05;
    background: linear-gradient(92deg, #f4fbff 0%, #a8dcff 42%, #c9b4ff 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent;
    -webkit-text-fill-color: transparent;
  }
  .stage-head p { max-width: 680px; font-size: 13px; line-height: 1.55; }
  .trunk-pill {
    border-radius: 16px; padding: 10px 14px;
    background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
    border: 1px solid rgba(148,178,255,0.18);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), 0 12px 30px rgba(0,0,0,0.25);
  }
  .trunk-light { width: 34px; height: 34px; font-size: 15px; }
  .river-wrap { padding: 8px 14px 0; }
  .river-cap {
    padding: 10px 0 14px; font-size: 10.5px; letter-spacing: 2px;
    color: #7f92b8; text-transform: uppercase;
  }
  .stage-counters { gap: 12px; padding: 0 18px 18px; }
  .counter {
    border-radius: 15px; padding: 13px 14px;
    background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
    border: 1px solid rgba(148,178,255,0.14);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 30px rgba(0,0,0,0.22);
  }
  .counter span { font-family: var(--font-display); font-size: 27px; letter-spacing: 0.5px; }
  .counter label { font-size: 9.5px; letter-spacing: 1.4px; color: #7f92b8; }

  .tfb {
    border-radius: 999px; border: 1px solid rgba(148,178,255,0.16);
    background: rgba(255,255,255,0.035); box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
  }
  .tfb.on {
    color: #d9fbff; border-color: rgba(94,231,255,0.55);
    background: linear-gradient(180deg, rgba(94,231,255,0.16), rgba(111,157,255,0.08));
    box-shadow: 0 0 18px rgba(94,231,255,0.12), inset 0 1px 0 rgba(255,255,255,0.08);
  }
  #taskSearch {
    background: rgba(2,6,16,0.55); border: 1px solid rgba(148,178,255,0.15);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), inset 0 8px 22px rgba(0,0,0,0.24);
  }
  .tasks { gap: 10px; max-height: 48vh; }
  .task-card {
    border-radius: 15px; padding: 13px 14px 13px 17px;
    border: 1px solid rgba(148,178,255,0.14);
    background: linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025));
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 28px rgba(0,0,0,0.2);
  }
  .task-card::before { top: 12px; bottom: 12px; width: 3px; }
  .task-card:hover {
    transform: translateY(-2px); border-color: rgba(94,231,255,0.5);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 42px rgba(0,0,0,0.32), 0 0 26px rgba(94,231,255,0.08);
  }
  .task-card[data-status="landed"] { box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 28px rgba(0,0,0,0.2), 0 0 24px rgba(82,255,196,0.08); }
  .task-card[data-status="rejected"], .task-card[data-status="failed"] { box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 28px rgba(0,0,0,0.2), 0 0 24px rgba(255,113,133,0.09); }
  .task-card[data-status="planning"], .task-card[data-status="working"], .task-card[data-status="merging"], .task-card[data-status="claiming"], .task-card[data-status="resolving"] { box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 28px rgba(0,0,0,0.2), 0 0 24px rgba(94,231,255,0.08); }
  .task-card[data-status="queued"] { box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 28px rgba(0,0,0,0.2), 0 0 24px rgba(255,196,107,0.08); }
  .task-top { margin-bottom: 8px; }
  .st { letter-spacing: 0.9px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.06); }
  .task-goal { font-size: 13.5px; line-height: 1.45; }
  .task-meta { font-size: 11px; color: #8ea3c8; }
  .gate-mark { box-shadow: inset 0 1px 0 rgba(255,255,255,0.06); }

  .feed { gap: 9px; max-height: 36vh; }
  .feed-row { grid-template-columns: 64px 1fr; gap: 10px; padding: 6px 8px; margin: 0 -8px; border-radius: 10px; transition: background 140ms ease; }
  .feed-row:hover { background: rgba(94,231,255,0.04); }
  .feed-row .t { font-family: var(--font-mono); font-size: 10.5px; color: #64769c; }
  .feed-row .b { color: #a9badb; line-height: 1.5; }
  .feed-row .who { color: #5ee7ff; }
  .tag { box-shadow: inset 0 1px 0 rgba(255,255,255,0.05); }

  .last-merge { font-size: 12.5px; color: #a9badb; line-height: 1.6; }
  .repo-chips .tfb { font-family: var(--font-mono); font-size: 11px; }
  .repo-files details { border-radius: 12px; background: rgba(2,6,16,0.45); border: 1px solid rgba(148,178,255,0.14); }
  .repo-files summary { padding: 9px 12px; font-family: var(--font-mono); font-size: 11.5px; }
  .repo-files pre { border-top: 1px solid rgba(148,178,255,0.1); }

  .drawer {
    background: linear-gradient(180deg, rgba(9,14,28,0.98), rgba(5,8,18,0.99));
    border-left: 1px solid rgba(148,178,255,0.2);
    box-shadow: -40px 0 100px rgba(0,0,0,0.6), inset 1px 0 0 rgba(255,255,255,0.04);
  }
  .drawer-head { padding: 20px 22px 14px; }
  .drawer-head h2 { font-size: 17px; }
  .drawer-body { padding: 18px 22px 30px; }
  .dsec { margin-bottom: 20px; }
  .dsec h4 { font-size: 10.5px; letter-spacing: 1.7px; color: #8ea3c8; }
  .tl-row { grid-template-columns: 96px 1fr; }
  .chip {
    background: rgba(94,231,255,0.08); border: 1px solid rgba(94,231,255,0.22);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
  }
  pre {
    background: rgba(2,6,16,0.62); border: 1px solid rgba(148,178,255,0.14);
    box-shadow: inset 0 10px 30px rgba(0,0,0,0.3);
  }
  .spec { border-radius: 11px; background: rgba(255,255,255,0.045); border: 1px solid rgba(148,178,255,0.13); box-shadow: inset 0 1px 0 rgba(255,255,255,0.05); }
  .verdict { box-shadow: inset 0 1px 0 rgba(255,255,255,0.07); }

  .replaybar {
    border: 1px solid rgba(196,166,255,0.5); border-radius: 16px;
    background: linear-gradient(180deg, rgba(12,17,34,0.94), rgba(8,11,24,0.96));
    box-shadow: 0 22px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 40px rgba(196,166,255,0.08);
  }
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <linearGradient id="brandGrad" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#38e1ff"/><stop offset="1" stop-color="#4f8cff"/>
    </linearGradient>
  </defs>
</svg>
<div class="ambient" aria-hidden="true"></div>
<div class="app">
  <header class="topbar">
    <div class="brand">
      <svg class="brand-mark" viewBox="0 0 34 34" aria-hidden="true">
        <path d="M3 22 C 9 20, 12 26, 17 22 S 27 16, 31 12"/>
        <path d="M3 27 C 10 25, 14 30, 18 27 S 26 22, 31 18" opacity="0.55"/>
        <circle class="dot" cx="26" cy="13" r="2.4"/>
      </svg>
      <div>
        <div class="brand-title">Tributary</div>
        <div class="brand-sub">many agents · one trunk · zero blast radius</div>
      </div>
    </div>
    <div class="top-right">
      <div class="cfg" id="cfgBadges"></div>
      <div class="live" id="livePill"><span class="dot"></span><span id="liveText">Connecting…</span></div>
    </div>
  </header>

  <main class="layout">
    <aside class="rail">
      <section class="panel composer">
        <h2>Dispatch</h2>
        <label for="goalInput">Goal</label>
        <textarea id="goalInput" placeholder="bump the package version line to 3.1.11"></textarea>
        <label for="fpInput">Footprint (comma-separated)</label>
        <input id="fpInput" placeholder="src/index.js, src/auth.js" />
        <details>
          <summary>Direct edits JSON — skips the planner</summary>
          <textarea id="editsInput" rows="3" placeholder='{"src/index.js":"exports.render = ..."}'></textarea>
        </details>
        <div class="composer-actions">
          <button class="btn primary" id="dispatchBtn" type="button">Dispatch agent</button>
          <button class="btn ghost" id="demoPackBtn" type="button" title="Three preset tasks: clean, conflicting, broken">Demo pack</button>
        </div>
        <div class="err" id="composerErr"></div>
      </section>

      <section class="panel onboard" id="onboard" hidden>
        <div class="onboard-icon">▶</div>
        <div class="onboard-body">
          <div class="onboard-title">Nothing has happened yet</div>
          <div class="onboard-sub">Dispatch a task above, run the demo pack, or start five concurrent agents with <code>npm run simulate</code>.</div>
        </div>
        <div class="onboard-actions">
          <button class="cmd" id="cmdBtn" type="button" title="Copy to clipboard">npm run simulate</button>
          <button class="btn ghost" id="demoBtn" type="button">Resolver beat</button>
        </div>
      </section>

      <section class="panel">
        <h2>Watershed · claims</h2>
        <table id="claims">
          <thead><tr><th>agent</th><th>files</th><th>expires</th></tr></thead>
          <tbody><tr><td colspan="3" class="empty">No active claims.</td></tr></tbody>
        </table>
      </section>

      <section class="panel">
        <h2>Waitlist</h2>
        <table id="waitlist">
          <thead><tr><th>agent</th><th>files</th><th>state</th></tr></thead>
          <tbody><tr><td colspan="3" class="empty">No waitlisted agents.</td></tr></tbody>
        </table>
      </section>
    </aside>

    <section class="river-stage">
      <div class="stage-head">
        <div>
          <h1>Confluence</h1>
          <p>Serial speculative merges onto the verified trunk — conflicts are scheduled before they are negotiated.</p>
        </div>
        <div class="trunk-pill">
          <span class="trunk-light green" id="trunkLight">✓</span>
          <div><div class="label">trunk</div><div class="value green" id="trunkLabel">GREEN</div></div>
        </div>
      </div>
      <div class="river-wrap">
        <canvas id="riveHero" class="rive-hero" aria-hidden="true"></canvas>
        <svg id="river" viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Live river of agent changes converging into the trunk">
          <defs>
            <linearGradient id="rvTrunkGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1000" y2="0">
              <stop offset="0" stop-color="#b18cff" stop-opacity="0.9"/>
              <stop offset="0.45" stop-color="#4f8cff" stop-opacity="0.95"/>
              <stop offset="1" stop-color="#38e1ff" stop-opacity="1"/>
            </linearGradient>
            <linearGradient id="rvBgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="rgba(56,225,255,0.05)"/>
              <stop offset="1" stop-color="rgba(4,6,12,0)"/>
            </linearGradient>
            <linearGradient id="rvBasin" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#4f8cff" stop-opacity="0.14"/>
              <stop offset="1" stop-color="#38e1ff" stop-opacity="0.05"/>
            </linearGradient>
            <radialGradient id="rvPool" cx="50%" cy="50%" r="50%">
              <stop offset="0" stop-color="#b18cff" stop-opacity="0.34"/>
              <stop offset="0.65" stop-color="#4f8cff" stop-opacity="0.16"/>
              <stop offset="1" stop-color="#38e1ff" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="rvEstuary" cx="50%" cy="50%" r="50%">
              <stop offset="0" stop-color="#38e1ff" stop-opacity="0.30"/>
              <stop offset="0.7" stop-color="#4f8cff" stop-opacity="0.12"/>
              <stop offset="1" stop-color="#4f8cff" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="1000" height="620" fill="url(#rvBgGrad)"/>
          <g fill="none" stroke="rgba(122,162,255,0.08)" stroke-width="1">
            <path d="M-30,140 C 160,90 340,190 560,150 S 860,80 1040,150"/>
            <path d="M-30,260 C 180,210 380,320 620,280 S 900,210 1040,280"/>
            <path d="M-30,420 C 200,470 420,390 660,450 S 920,520 1040,470"/>
            <path d="M-30,540 C 220,590 460,520 700,570 S 940,610 1040,560"/>
          </g>
          <g id="riverLayer"></g>
        </svg>
        <canvas id="flowCanvas" class="flow-canvas" aria-hidden="true"></canvas>
      </div>
      <div class="river-cap" id="riverCap">The trunk is quiet — no changes in flight</div>
      <div class="stage-counters">
        <div class="counter"><span id="cMerges">0</span><label>merges landed</label></div>
        <div class="counter"><span id="cPrev">0</span><label>conflicts prevented</label></div>
        <div class="counter"><span id="cRes">0</span><label>resolver runs</label></div>
        <div class="counter"><span id="qDepth"></span><label>queue depth</label></div>
      </div>
    </section>

    <aside class="rail">
      <section class="panel">
        <h2>Tasks</h2>
        <div class="tf" id="taskFilter">
          <button class="tfb on" data-f="all" type="button">all<span class="n">0</span></button>
          <button class="tfb" data-f="active" type="button">active<span class="n">0</span></button>
          <button class="tfb" data-f="landed" type="button">landed<span class="n">0</span></button>
          <button class="tfb" data-f="rejected" type="button">rejected<span class="n">0</span></button>
        </div>
        <input id="taskSearch" placeholder="search tasks…" />
        <div class="tasks" id="tasks" aria-label="Dispatched tasks"></div>
      </section>

      <section class="panel">
        <h2>Last merge</h2>
        <div class="last-merge" id="lastMerge">No merge yet — trunk has not moved.</div>
      </section>

      <section class="panel">
        <h2>Repos</h2>
        <div class="repo-chips" id="repoList"></div>
        <div class="repo-files" id="repoFiles"></div>
      </section>

      <section class="panel">
        <h2>Current</h2>
        <div class="feed" id="feed"></div>
      </section>
    </aside>
  </main>
</div>

<div class="veil" id="drawerVeil" hidden></div>
<aside class="drawer" id="drawer" hidden>
  <div class="drawer-head">
    <h2 id="dGoal"></h2>
    <button class="drawer-x" id="drawerX" type="button" aria-label="Close task detail">✕</button>
  </div>
  <div class="drawer-body" id="dBody"></div>
</aside>

<div class="replaybar" id="replaybar" hidden>
  <button class="btn ghost" id="rpPlay" type="button">▶ Play</button>
  <input id="rpSeek" type="range" min="0" max="0" value="0" />
  <div class="rp-meta"><span id="rpTime">0:00</span> · <span id="rpCount"><b>0</b> / 0 events</span></div>
  <a class="rp-link" href="/">Exit replay · live</a>
</div>

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
      var exp = c.expiresAt ? esc(clock(c.expiresAt)) : '<span class="muted">—</span>';
      return '<tr><td><span class="agent">' + esc(c.agentId) + '</span></td><td>' + filesCell(c.files) + '</td><td>' + exp + '</td></tr>';
    }).join('');
  };

  var renderWaitlist = function (q) {
    var tb = $('waitlist').querySelector('tbody');
    if (!q.length) {
      tb.innerHTML = '<tr><td colspan="3" class="empty">No waitlisted agents.</td></tr>';
      return;
    }
    tb.innerHTML = q.map(function (w) {
      return '<tr><td><span class="agent">' + esc(w.agentId) + '</span></td><td>' + filesCell(w.files) + '</td><td><span class="pill queued">queued</span></td></tr>';
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
        '<div class="b"><span class="tag ' + esc(e.kind) + '">' + esc(e.kind) + '</span> ' + who + esc(e.detail) + '</div></div>';
    }).join('');
  };

  // ---- tasks -------------------------------------------------------------
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
      var n = b.querySelector('.n');
      if (n) n.textContent = String(counts[f] || 0);
    });
    var shown = tasks.filter(function (t) {
      var match = !taskQuery || (t.goal + ' ' + t.agentId).toLowerCase().indexOf(taskQuery) !== -1;
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
        var gok = t.gate.exitCode === 0;
        gateMark = '<span class="gate-mark ' + (gok ? 'ok' : 'bad') + '">' + (gok ? 'sandbox ✓' : 'sandbox ✗') + '</span>';
      }
      return '<div class="task-card" data-task="' + esc(t.id) + '" data-status="' + esc(t.status) + '">' +
        '<div class="task-top"><span class="st ' + esc(t.status) + '">' + esc(t.status) + '</span>' +
        '<span class="agent">' + esc(t.agentId) + '</span>' + gateMark + '</div>' +
        '<div class="task-goal">' + esc(t.goal) + '</div>' +
        '<div class="task-meta"><span>' + esc(ago(t.createdAt)) + '</span>' +
        (t.reason ? '<span>· ' + esc(String(t.reason).slice(0, 70)) + '</span>' : '') + '</div></div>';
    }).join('');
    host.querySelectorAll('.task-card').forEach(function (el) {
      el.addEventListener('click', function () { openDrawer(el.getAttribute('data-task')); });
    });
    if (openTaskId && tasksById[openTaskId]) renderDrawer(tasksById[openTaskId]);
  };

  var sec = function (title, html) { return '<div class="dsec"><h4>' + title + '</h4>' + html + '</div>'; };
  var trow = function (k, v) { return '<div class="tl-row"><div class="k">' + k + '</div><div>' + v + '</div></div>'; };

  var diffLines = function (oldText, newText) {
    var a = String(oldText || '').split(String.fromCharCode(10));
    var b = String(newText || '').split(String.fromCharCode(10));
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
      (t.reason ? trow('reason', esc(t.reason)) : '') + '</div>');

    if (t.history && t.history.length) {
      parts.push(sec('lifecycle', '<div class="tl">' + t.history.map(function (h) {
        return trow(esc(clock(h.at)), '<span class="st ' + esc(h.status) + '">' + esc(h.status) + '</span>' +
          (h.reason ? ' <span class="muted">' + esc(String(h.reason).slice(0, 70)) + '</span>' : ''));
      }).join('') + '</div>'));
    }
    if (t.plan && t.plan.rationale) parts.push(sec('plan', '<p>' + esc(t.plan.rationale) + '</p>'));
    if (t.footprint && t.footprint.length) {
      parts.push(sec('declared footprint', '<div class="chips">' + t.footprint.map(function (f) { return '<span class="chip">' + esc(f) + '</span>'; }).join('') + '</div>'));
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
          '<span class="muted" style="font-size:11px"><code>' + esc(v.command) + '</code> · exit ' + esc(String(v.exitCode)) +
          ' · ' + esc(String(v.durationMs)) + 'ms' + (v.timedOut ? ' · timed out' : '') + '</span></div>' +
          (v.reason ? '<p class="muted" style="font-size:11.5px">' + esc(v.reason) + '</p>' : '') +
          (v.stdout ? '<pre>' + esc(v.stdout) + '</pre>' : '') +
          (v.stderr ? '<pre style="border-color: rgba(255,93,115,0.45); color: #ffb3bf">' + esc(v.stderr) + '</pre>' : '');
      }
      parts.push('<div class="dsec"><h4>Sandbox gate — the containment boundary</h4>' +
        '<div class="gate-head"><span class="verdict ' + (g.exitCode === 0 ? 'ok' : 'bad') + '">' +
        (g.exitCode === 0 ? '✓ passed' : '✗ rejected') + '</span>' +
        '<span class="muted" style="font-size:11px">' + esc(g.provider) + ' · exit ' + esc(String(g.exitCode)) + ' · ' + esc(String(g.durationMs)) + 'ms</span></div>' +
        spec + verifyHtml + (g.output ? '<pre>' + esc(g.output) + '</pre>' : '') + '</div>');
    }

    if (t.resolution) {
      var r = t.resolution;
      parts.push(sec('rapids · resolution', '<p>status: <b>' + esc(r.status || '—') + '</b>' +
        (r.via ? ' · via <code>' + esc(r.via) + '</code>' : '') +
        (r.files && r.files.length ? ' · files: ' + r.files.map(function (f) { return '<code>' + esc(f) + '</code>'; }).join(' ') : '') + '</p>'));
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
    if (!lm) { el.innerHTML = 'No merge yet — trunk has not moved.'; return; }
    var parts = [];
    if (lm.agentId) parts.push('<span class="agent">' + esc(lm.agentId) + '</span>');
    if (lm.repo) parts.push(esc(lm.repo));
    if (lm.commit) parts.push('<code>' + esc(String(lm.commit).slice(0, 8)) + '</code>');
    parts.push(esc(ago(lm.at)));
    el.innerHTML = 'Last landed: ' + parts.join(' · ');
  };

  // ---- river -------------------------------------------------------------
  var hash = function (s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  };
  var PALETTE = ['#38e1ff', '#4f8cff', '#ffb648', '#3dffb0', '#b18cff', '#ff7ad9', '#2dd4bf', '#ff5d73'];
  var colorFor = function (name, i) { return PALETTE[(hash(String(name || 'x')) + i) % PALETTE.length]; };
  var trunkY = function (x) { var t = x / 1000; return 470 - t * 130 + Math.sin(t * Math.PI) * 16 - Math.sin(t * Math.PI * 2) * 8; };

  // ---- flow field: canvas particles over the river ------------------------
  var flow = {
    data: null, emitters: [], byKey: {}, particles: [], bursts: [], ripples: [], sprites: {},
    raf: null, last: 0, time: 0, lastMerges: -1, w: 0, h: 0, dpr: 1, burstAcc: 0
  };
  var makeSprite = function (color) {
    if (flow.sprites[color]) return flow.sprites[color];
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.28, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    flow.sprites[color] = c;
    return c;
  };
  var makePath = function (pts) {
    var cum = [0], len = 0;
    for (var i = 1; i < pts.length; i++) {
      var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
      len += Math.sqrt(dx * dx + dy * dy);
      cum.push(len);
    }
    return { pts: pts, cum: cum, len: len };
  };
  var pointAt = function (path, dist) {
    if (dist <= 0) { var f0 = path.pts[0]; return { x: f0[0], y: f0[1], a: 0 }; }
    if (dist >= path.len) { var l = path.pts.length - 1, fl = path.pts[l]; return { x: fl[0], y: fl[1], a: 0 }; }
    var lo = 0, hi = path.cum.length - 1;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (path.cum[mid] < dist) lo = mid + 1; else hi = mid; }
    var i = Math.max(1, lo), d0 = path.cum[i - 1], d1 = path.cum[i];
    var f = (dist - d0) / Math.max(0.0001, d1 - d0);
    var x = path.pts[i - 1][0] + (path.pts[i][0] - path.pts[i - 1][0]) * f;
    var y = path.pts[i - 1][1] + (path.pts[i][1] - path.pts[i - 1][1]) * f;
    var a = Math.atan2(path.pts[i][1] - path.pts[i - 1][1], path.pts[i][0] - path.pts[i - 1][0]);
    return { x: x, y: y, a: a };
  };
  var sampleCubic = function (p0, p1, p2, p3, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, u = 1 - t;
      pts.push([
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
      ]);
    }
    return pts;
  };
  var trunkDistForX = function (path, x) {
    var best = 0, bd = 1e9;
    for (var i = 0; i < path.pts.length; i++) {
      var d = Math.abs(path.pts[i][0] - x);
      if (d < bd) { bd = d; best = path.cum[i]; }
    }
    return best;
  };
  var updateFlow = function (fd) {
    flow.data = fd || flow.data;
    var d = flow.data;
    if (!d || !d.trunk) return;
    flow.emitters = [];
    flow.byKey = {};
    var claims = d.claims || [];
    var add = function (e) { flow.emitters.push(e); flow.byKey[e.key] = e; e.acc = 0; };
    add({ key: 'trunk', path: d.trunk, rate: 9 + (d.merges || 0) * 1.6 + claims.length * 2.2, color: '#8ff0ff', size: 7, alpha: 0.5, speed: 155, wobble: 5, freq: 1.1, hold: false });
    claims.forEach(function (c) {
      add({ key: 'claim:' + c.agentId, path: c.path, rate: 6, color: c.color, size: 8, alpha: 0.9, speed: 195, wobble: 8, freq: 1.7, hold: false, nextKey: 'trunk', nextDist: trunkDistForX(d.trunk, c.endX || 0) });
    });
    (d.waitlist || []).forEach(function (w) {
      add({ key: 'wait:' + w.agentId, path: w.path, rate: 3, color: '#ffb648', size: 7, alpha: 0.7, speed: 82, wobble: 4, freq: 2.1, hold: true });
    });
    var m = d.merges || 0;
    if (flow.lastMerges >= 0 && m > flow.lastMerges) {
      flow.ripples.push({ x: d.confluence.x, y: d.confluence.y, r: 8, vr: 58, a: 0.75, color: '#b18cff' });
      flow.ripples.push({ x: d.outflow.x, y: d.outflow.y, r: 8, vr: 66, a: 0.7, color: '#38e1ff' });
    }
    flow.lastMerges = m;
  };
  var spawnFor = function (e) {
    var start = e.hold ? Math.random() * e.path.len : Math.random() * Math.min(42, e.path.len * 0.22);
    return {
      em: e, dist: start, dir: 1,
      speed: e.speed * (0.78 + Math.random() * 0.5),
      wobble: e.wobble * (0.6 + Math.random() * 0.8),
      freq: e.freq * (0.7 + Math.random() * 0.8),
      phase: Math.random() * 6.283,
      size: e.size * (0.75 + Math.random() * 0.6),
      alpha: e.alpha * (0.7 + Math.random() * 0.5)
    };
  };
  var stepFlow = function (dt) {
    flow.time += dt;
    for (var ei = 0; ei < flow.emitters.length; ei++) {
      var e = flow.emitters[ei];
      e.acc += e.rate * dt;
      while (e.acc >= 1) {
        e.acc -= 1;
        flow.particles.push(spawnFor(e));
        if (flow.particles.length > 460) flow.particles.splice(0, flow.particles.length - 460);
      }
    }
    var rapids = flow.data ? (flow.data.rapids || []) : [];
    if (rapids.length) {
      flow.burstAcc += rapids.length * 9 * dt;
      while (flow.burstAcc >= 1 && flow.bursts.length < 140) {
        flow.burstAcc -= 1;
        var rp = rapids[Math.floor(Math.random() * rapids.length)];
        flow.bursts.push({
          x: rp.x + (Math.random() - 0.5) * 44, y: rp.y + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 70, vy: (Math.random() - 0.5) * 50 - 24,
          life: 1, decay: 1.1 + Math.random() * 0.9, size: 3 + Math.random() * 4
        });
      }
    }
    for (var i = flow.particles.length - 1; i >= 0; i--) {
      var p = flow.particles[i], path = p.em.path;
      if (p.em.hold) {
        p.dist += p.dir * p.speed * dt;
        if (p.dist >= path.len) { p.dist = path.len; p.dir = -1; }
        if (p.dist <= 0) { p.dist = 0; p.dir = 1; }
      } else {
        p.dist += p.speed * dt;
        if (p.dist >= path.len) {
          var nx = p.em.nextKey ? flow.byKey[p.em.nextKey] : null;
          if (nx) {
            var nd = p.em.nextDist || 0;
            p.em = nx;
            p.dist = nd;
            p.speed = nx.speed * (0.8 + Math.random() * 0.45);
          } else {
            p.dist = 0;
            p.speed = p.em.speed * (0.8 + Math.random() * 0.5);
            p.phase = Math.random() * 6.283;
          }
        }
      }
    }
    for (var b = flow.bursts.length - 1; b >= 0; b--) {
      var bu = flow.bursts[b];
      bu.x += bu.vx * dt; bu.y += bu.vy * dt;
      bu.vx *= 0.985; bu.vy = bu.vy * 0.985 - 12 * dt;
      bu.life -= bu.decay * dt;
      if (bu.life <= 0) flow.bursts.splice(b, 1);
    }
    for (var r = flow.ripples.length - 1; r >= 0; r--) {
      var rp2 = flow.ripples[r];
      rp2.r += rp2.vr * dt;
      rp2.a -= dt * 0.75;
      if (rp2.a <= 0) flow.ripples.splice(r, 1);
    }
  };
  var drawFlow = function () {
    var cvs = $('flowCanvas');
    if (!cvs) return;
    var ctx = cvs.getContext('2d');
    resizeFlow();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    var w = flow.w || 1, h = flow.h || 1;
    var scale = Math.min(w / 1000, h / 620);
    var ox = (w - 1000 * scale) / 2, oy = (h - 620 * scale) / 2;
    ctx.setTransform(flow.dpr * scale, 0, 0, flow.dpr * scale, flow.dpr * ox, flow.dpr * oy);
    ctx.globalCompositeOperation = 'lighter';
    for (var r = 0; r < flow.ripples.length; r++) {
      var rp = flow.ripples[r];
      ctx.globalAlpha = Math.max(0, rp.a);
      ctx.strokeStyle = rp.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, 6.2832);
      ctx.stroke();
    }
    for (var b = 0; b < flow.bursts.length; b++) {
      var bu = flow.bursts[b];
      ctx.globalAlpha = Math.max(0, bu.life) * 0.85;
      var bs = bu.size * 3.2;
      ctx.drawImage(makeSprite('#b18cff'), bu.x - bs / 2, bu.y - bs / 2, bs, bs);
    }
    for (var i = 0; i < flow.particles.length; i++) {
      var p = flow.particles[i], path = p.em.path;
      var pt = pointAt(path, p.dist);
      var nx = -Math.sin(pt.a), ny = Math.cos(pt.a);
      var off = Math.sin(flow.time * p.freq + p.phase) * p.wobble;
      var x = pt.x + nx * off, y = pt.y + ny * off + Math.sin(flow.time * 0.8 + p.phase) * 1.6;
      var fade = 1;
      if (!p.em.hold) {
        if (p.dist < 10) fade = p.dist / 10;
        else if (p.dist > path.len - 12) fade = Math.max(0, (path.len - p.dist) / 12);
      }
      ctx.globalAlpha = Math.max(0, p.alpha * fade);
      var s = p.size * 2.5 * (0.85 + 0.25 * Math.sin(flow.time * 3 + p.phase));
      ctx.drawImage(makeSprite(p.em.color), x - s / 2, y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };
  var resizeFlow = function () {
    var cvs = $('flowCanvas');
    if (!cvs || !cvs.parentElement) return;
    var parent = cvs.parentElement;
    var w = parent.clientWidth, h = parent.clientHeight;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w !== flow.w || h !== flow.h || dpr !== flow.dpr) {
      flow.w = w; flow.h = h; flow.dpr = dpr;
      cvs.width = Math.max(1, Math.round(w * dpr));
      cvs.height = Math.max(1, Math.round(h * dpr));
      cvs.style.width = w + 'px';
      cvs.style.height = h + 'px';
    }
  };
  var frameFlow = function (ts) {
    var dt = Math.min(0.05, (ts - flow.last) / 1000 || 0.016);
    flow.last = ts;
    stepFlow(dt);
    drawFlow();
    flow.raf = requestAnimationFrame(frameFlow);
  };
  var initFlow = function () {
    var cvs = $('flowCanvas');
    if (!cvs || !cvs.getContext) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    resizeFlow();
    if (window.ResizeObserver && cvs.parentElement) new ResizeObserver(resizeFlow).observe(cvs.parentElement);
    window.addEventListener('resize', resizeFlow);
    flow.last = performance.now();
    flow.raf = requestAnimationFrame(frameFlow);
  };

  var riveHero = null, riveMode = -1;
  var setRiveMode = function (mode) {
    if (mode === riveMode) return;
    riveMode = mode;
    if (!riveHero) return;
    try {
      var inputs = riveHero.stateMachineInputs('Hero');
      for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].name === 'mode') { inputs[i].value = mode; break; }
      }
    } catch (e) {}
  };
  var initRive = function () {
    var cvs = $('riveHero');
    if (!cvs || !cvs.getContext) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { cvs.style.display = 'none'; return; }
    import('https://esm.sh/@rive-app/webgl2@2.49.4')
      .then(function (m) {
        var lib = m.Rive ? m : m.default;
        if (!lib || !lib.Rive || riveHero) return;
        lib.Rive.suppressDeprecationWarnings = (lib.Rive.suppressDeprecationWarnings || []).concat(['state-machine-inputs']);
        riveHero = new lib.Rive({
          src: '/hero.riv',
          canvas: cvs,
          stateMachine: 'Hero',
          autoplay: true,
          layout: new lib.Layout({ fit: lib.Fit.Contain, alignment: lib.Alignment.Center }),
          onLoad: function () {
            try { riveHero.resizeDrawingSurfaceToCanvas(); } catch (e) {}
            setRiveMode(riveMode < 0 ? 0 : riveMode);
          },
          onLoadError: function () { cvs.style.display = 'none'; }
        });
        if (window.ResizeObserver && cvs.parentElement) {
          new ResizeObserver(function () {
            try { riveHero && riveHero.resizeDrawingSurfaceToCanvas(); } catch (e) {}
          }).observe(cvs.parentElement);
        }
        window.addEventListener('resize', function () {
          try { riveHero.resizeDrawingSurfaceToCanvas(); } catch (e) {}
        });
      })
      .catch(function () { cvs.style.display = 'none'; });
  };
  var heroModeFor = function (s) {
    var counts = {};
    (s.tasks || []).forEach(function (t) { counts[t.status] = (counts[t.status] || 0) + 1; });
    if (counts.resolving) return 3;
    if ((s.waitlist || []).length) return 2;
    if ((s.activeClaims || []).length || counts.claiming || counts.working || counts.merging) return 1;
    if (((s.stats || {}).totalMerges) || 0) return 4;
    return 0;
  };

  var riverSig = null;
  var renderRiver = function (s) {
    var claims = s.activeClaims || [];
    var queued = s.waitlist || [];
    var merges = (s.stats && s.stats.totalMerges) || 0;
    var rapids = (s.stats && s.stats.resolverInvocations) || 0;
    var sig = claims.map(function (c) { return c.agentId; }).join(',') + '|' +
      queued.map(function (w) { return w.agentId; }).join(',') + '|' + merges + '|' + rapids;
    if (sig === riverSig) return;
    riverSig = sig;

    var out = [];
    var W = 1000, H = 620, gateX = 92, confluenceX = 600;
    var pts = [], trunkPts = [];
    for (var tx = 0; tx <= 1000; tx += 80) { var ty = trunkY(tx); trunkPts.push([tx, ty]); pts.push(tx + ',' + ty.toFixed(1)); }
    var trunkD = 'M' + pts.join(' L');
    var fd = { claims: [], waitlist: [], rapids: [], trunk: makePath(trunkPts), confluence: { x: confluenceX, y: trunkY(confluenceX) }, outflow: { x: 984, y: trunkY(984) }, merges: merges };
    out.push('<path d="M0,70 C 140,130 250,250 92,360 L92,570 C 320,540 520,500 720,440 L1000,360 L1000,620 L0,620 Z" fill="url(#rvBasin)" opacity="0.55"/>');

    // basin grid + watershed gate
    for (var gx = 80; gx < W; gx += 100) {
      out.push('<line x1="' + gx + '" y1="0" x2="' + gx + '" y2="' + H + '" stroke="rgba(122,162,255,0.045)" stroke-width="1"/>');
    }
    for (var gy = 80; gy < H; gy += 100) {
      out.push('<line x1="0" y1="' + gy + '" x2="' + W + '" y2="' + gy + '" stroke="rgba(122,162,255,0.035)" stroke-width="1"/>');
    }
    out.push('<line class="rv-gate" x1="' + gateX + '" y1="34" x2="' + gateX + '" y2="' + (H - 30) + '"/>');
    out.push('<text class="rv-label strong" x="' + (gateX - 12) + '" y="' + (H - 14) + '" text-anchor="end">watershed</text>');

    // waitlist — amber dashed channels held before the gate
    queued.forEach(function (w, i) {
      var y = queued.length === 1 ? 150 : 52 + (i * 34);
      var d = 'M0,' + y.toFixed(1) + ' L' + (gateX - 10) + ',' + y.toFixed(1);
      fd.waitlist.push({ agentId: w.agentId, path: makePath([[0, y], [gateX - 10, y]]) });
      out.push('<path class="rv-wait" d="' + d + '"/>');
      out.push('<text class="rv-label" x="8" y="' + (y - 7).toFixed(1) + '">' + esc(String(w.agentId).slice(0, 18)) + '</text>');
    });

    // active claims — colored tributaries converging into the trunk
    var slots = [];
    claims.forEach(function (c, i) {
      var color = colorFor(c.agentId, i);
      var startY = 110 + ((i * 53) % 300);
      var cx = confluenceX + ((i % 4) - 1.5) * 66;
      var cy = trunkY(cx);
      var d = 'M0,' + startY.toFixed(1) + ' C 180,' + startY.toFixed(1) + ' 390,' + (cy - 46).toFixed(1) + ' ' + cx.toFixed(1) + ',' + cy.toFixed(1);
      fd.claims.push({ agentId: c.agentId, color: color, endX: cx, path: makePath(sampleCubic([0, startY], [180, startY], [390, cy - 46], [cx, cy], 36)) });
      out.push('<path class="rv-stream-halo" d="' + d + '" stroke="' + color + '" stroke-width="7"/>');
      out.push('<path class="rv-stream" d="' + d + '" stroke="' + color + '" stroke-width="2.6" stroke-dasharray="7 11" style="animation: rvFlow 5.5s linear infinite"/>');
      for (var p = 0; p < 2; p++) {
        out.push('<circle r="' + (p ? 2.2 : 3.4) + '" fill="' + color + '" opacity="' + (p ? 0.65 : 1) + '"><animateMotion dur="' + (3.9 + p * 1.4).toFixed(1) + 's" begin="' + ((i * 0.7 + p * 1.9) % 5).toFixed(1) + 's" repeatCount="indefinite" path="' + d + '"/></circle>');
      }
      out.push('<text class="rv-label" x="8" y="' + (startY - 8).toFixed(1) + '" fill="' + color + '">' + esc(String(c.agentId).slice(0, 18)) + '</text>');
      slots.push({ x: cx, y: cy, color: color });
    });

    // rapids — violet turbulence where residual conflicts surface
    if (rapids > 0) {
      for (var r = 0; r < Math.min(rapids, 5); r++) {
        var rx = confluenceX + 34 + r * 46;
        var ry = trunkY(rx) - 34 - (r % 2) * 20;
        fd.rapids.push({ x: rx, y: ry });
        var rd = 'M' + (rx - 30) + ',' + ry.toFixed(1) + ' C ' + (rx - 11) + ',' + (ry - 13).toFixed(1) + ' ' + (rx + 11) + ',' + (ry + 13).toFixed(1) + ' ' + (rx + 30) + ',' + ry.toFixed(1);
        out.push('<path class="rv-rapids" d="' + rd + '"/>');
        out.push('<circle class="rv-rapid-dot" cx="' + rx.toFixed(1) + '" cy="' + ry.toFixed(1) + '" r="3.2"/>');
      }
      out.push('<text class="rv-label strong" x="' + (confluenceX + 150) + '" y="132" fill="' + PALETTE[4] + '">rapids · resolver</text>');
    }

    // trunk + confluence hub + landed nodes + outflow
    out.push('<path class="rv-trunk-halo" d="' + trunkD + '"/>');
    out.push('<path class="rv-trunk" d="' + trunkD + '"/>');
    out.push('<path class="rv-trunk-core" d="' + trunkD + '" opacity="0.5"/>');
    slots.forEach(function (p) {
      out.push('<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="7" fill="' + p.color + '" opacity="0.28"/>');
      out.push('<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3" fill="' + p.color + '"/>');
    });
    var hubY = trunkY(confluenceX);
    out.push('<ellipse cx="' + confluenceX + '" cy="' + hubY.toFixed(1) + '" rx="132" ry="80" fill="url(#rvPool)" opacity="0.9"/>');
    if (merges > 0) {
      out.push('<circle class="rv-ripple" cx="' + confluenceX + '" cy="' + hubY.toFixed(1) + '" r="12"/>');
      out.push('<circle class="rv-ripple" cx="' + confluenceX + '" cy="' + hubY.toFixed(1) + '" r="12" style="animation-delay:.9s"/>');
      var ex = 936, ey = trunkY(ex);
      out.push('<ellipse cx="' + ex + '" cy="' + ey.toFixed(1) + '" rx="190" ry="96" fill="url(#rvEstuary)" opacity="0.75"/>');
      out.push('<circle class="rv-ripple" cx="' + ex + '" cy="' + ey.toFixed(1) + '" r="10" style="animation-delay:.45s"/>');
    }
    out.push('<circle class="rv-hub" cx="' + confluenceX + '" cy="' + hubY.toFixed(1) + '" r="14"/>');
    out.push('<circle class="rv-hub-core" cx="' + confluenceX + '" cy="' + hubY.toFixed(1) + '" r="6"/>');
    out.push('<text class="rv-label strong" x="' + confluenceX + '" y="' + (hubY - 24).toFixed(1) + '" text-anchor="middle">confluence</text>');

    var nodes = Math.min(merges, 9);
    for (var n = 0; n < nodes; n++) {
      var x = 812 + n * 18;
      var y = trunkY(x);
      out.push('<circle class="rv-node-halo" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="7"/>');
      out.push('<circle class="rv-node" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.4"/>');
    }
    if (merges > 0) {
      var fx = 984, fy = trunkY(fx);
      out.push('<path class="rv-flow" d="M' + (fx - 16) + ',' + fy.toFixed(1) + ' L' + (fx - 2) + ',' + (fy - 5).toFixed(1) + ' M' + (fx - 2) + ',' + (fy - 5).toFixed(1) + ' L' + (fx + 8) + ',' + fy.toFixed(1) + ' M' + (fx - 2) + ',' + (fy - 5).toFixed(1) + ' L' + (fx + 2) + ',' + (fy + 5).toFixed(1) + ' L' + (fx + 8) + ',' + fy.toFixed(1) + '"/>');
      out.push('<text class="rv-label strong" x="988" y="' + (fy - 18).toFixed(1) + '" text-anchor="end">verified trunk</text>');
    }

    updateFlow(fd);
    var layer = $('riverLayer');
    if (layer) layer.innerHTML = out.join('');
    $('riverCap').textContent = (!claims.length && !queued.length && !merges)
      ? 'The trunk is quiet — no changes in flight'
      : (claims.length + ' in flight · ' + queued.length + ' queued · ' + merges + ' landed' + (rapids ? ' · ' + rapids + ' rapids' : ''));
  };

  // ---- state -------------------------------------------------------------
  var lastMerges = null;
  var applyState = function (s) {
    var ts = s.stats || {};
    var green = ts.trunkStatus !== 'red';
    var light = $('trunkLight');
    light.className = 'trunk-light ' + (green ? 'green' : 'red');
    light.textContent = green ? '✓' : '!';
    var label = $('trunkLabel');
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
    setRiveMode(heroModeFor(s));
    if (s.tasks) renderTasks(s.tasks);
    var inflight = (s.tasks || []).filter(function (t) {
      return ['landed','rejected','failed'].indexOf(t.status) === -1;
    }).length;
    $('qDepth').textContent = inflight ? String(inflight) : '0';
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

  // ---- transport ---------------------------------------------------------
  var source = null, pollTimer = null, firstFrame = null;
  var stopPolling = function () { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } };
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
    try { source = new EventSource('/registry/events'); } catch (e) { startPolling('Polling…'); return; }
    var onData = function (ev) {
      if (firstFrame) { clearTimeout(firstFrame); firstFrame = null; }
      try {
        var data = JSON.parse(ev.data);
        applyState(data);
        setPill('live', 'Live · ' + clock(Date.now()));
      } catch (e) {}
    };
    source.addEventListener('snapshot', onData);
    source.addEventListener('update', onData);
    source.addEventListener('open', function () { stopPolling(); setPill('live', 'Live · ' + clock(Date.now())); });
    source.onerror = function () {
      setPill('stale', 'Reconnecting…');
      if (source && source.readyState === 2) {
        try { source.close(); } catch (e) {}
        source = null;
        startPolling('Polling…');
      }
    };
    firstFrame = setTimeout(function () {
      if (firstFrame) {
        firstFrame = null;
        if (source) { try { source.close(); } catch (e) {} source = null; }
        startPolling('Polling…');
      }
    }, 4000);
  };

  // ---- replay ------------------------------------------------------------
  var replay = { events: [], idx: 0, timer: null };
  var derive = function (events, k) {
    var counters = { totalMerges: 0, conflictsPrevented: 0, resolverInvocations: 0, rejections: 0, trunkStatus: 'green', lastMerge: null };
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
      mode: 'replay', stats: counters,
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
  var stopPlay = function () { if (replay.timer) { clearInterval(replay.timer); replay.timer = null; } $('rpPlay').textContent = '▶ Play'; };
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

  // ---- controls ----------------------------------------------------------
  $('cmdBtn').addEventListener('click', function () {
    var btn = this;
    var done = function () {
      var t = btn.textContent;
      btn.classList.add('copied');
      btn.textContent = 'copied ✓';
      setTimeout(function () { btn.textContent = t; btn.classList.remove('copied'); }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText('npm run simulate').then(done, done); else done();
  });
  $('demoBtn').addEventListener('click', function () {
    var btn = this; btn.disabled = true; btn.textContent = 'Triggering…';
    fetch('/demo/conflict', { method: 'POST' })
      .then(function () { return pollTimer ? refreshNow() : null; })
      .catch(function () {})
      .then(function () { btn.disabled = false; btn.textContent = 'Resolver beat'; });
  });
  $('dispatchBtn').addEventListener('click', function () {
    var err = $('composerErr');
    var goal = $('goalInput').value.trim();
    if (!goal) { err.textContent = 'describe the task first'; return; }
    var payload = { goal: goal };
    var fp = $('fpInput').value.trim();
    if (fp) payload.footprint = fp.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var ed = $('editsInput').value.trim();
    if (ed) {
      try { payload.edits = JSON.parse(ed); }
      catch (e) { err.textContent = 'edits must be valid JSON'; return; }
    }
    err.textContent = '';
    var btn = this; btn.disabled = true; btn.textContent = 'Dispatching…';
    fetch('/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (!res.ok) err.textContent = (res.body && res.body.error) || 'dispatch failed';
        else { $('goalInput').value = ''; $('editsInput').value = ''; }
        if (pollTimer) refreshNow();
      })
      .catch(function () { err.textContent = 'dispatch failed — network'; })
      .then(function () { btn.disabled = false; btn.textContent = 'Dispatch agent'; });
  });
  $('demoPackBtn').addEventListener('click', function () {
    var btn = this; btn.disabled = true; btn.textContent = 'Running…';
    fetch('/demo/pack', { method: 'POST' })
      .then(function () { return pollTimer ? refreshNow() : null; })
      .catch(function () {})
      .then(function () { btn.disabled = false; btn.textContent = 'Demo pack'; });
  });

  $('drawerX').addEventListener('click', closeDrawer);
  $('drawerVeil').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openTaskId) closeDrawer(); });
  $('rpPlay').addEventListener('click', togglePlay);
  $('rpSeek').addEventListener('input', function () {
    stopPlay();
    replay.idx = parseInt(this.value, 10) || 0;
    renderReplayFrame();
  });

  // ---- repos -------------------------------------------------------------
  var openRepo = null;
  var loadRepos = function () {
    fetch('/repos', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var repos = d.repos || [];
        $('repoList').innerHTML = repos.length
          ? repos.map(function (r) {
              return '<button class="tfb chip rb-repo' + (r === openRepo ? ' on' : '') + '" data-r="' + esc(r) + '" type="button">' + esc(r) + '</button>';
            }).join('')
          : '<span class="empty">No repos yet — dispatch a task.</span>';
        $('repoList').querySelectorAll('.rb-repo').forEach(function (el) {
          el.addEventListener('click', function () { openTree(el.getAttribute('data-r')); });
        });
      })
      .catch(function () { $('repoList').innerHTML = '<span class="empty">repo list unavailable</span>'; });
  };
  var openTree = function (name) {
    openRepo = name; loadRepos();
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

  fetch('/config', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (c) {
      $('cfgBadges').innerHTML =
        '<span class="cfgb">' + esc(c.mode || 'unknown') + '</span>' +
        '<span class="cfgb' + (c.sandbox === 'docker' ? ' on' : '') + '">sandbox: ' + esc(c.sandbox || 'in-process') + '</span>' +
        '<span class="cfgb' + (c.ai ? ' on' : '') + '">inference: ' + esc(c.ai ? c.ai.provider + '/' + c.ai.model : 'off') + '</span>';
    })
    .catch(function () {});

  initFlow();
  initRive();
  if (location.search.indexOf('replay') !== -1) startReplay(); else startStream();
})();
</script>
</body>
</html>`;
