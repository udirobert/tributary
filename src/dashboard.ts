export const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Tributary · Site Plan 001</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Anton&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  :root {
    --paper: #f5efe2;
    --paper2: #ece4d1;
    --paper3: #e2d8c2;
    --ink: #22304a;
    --ink2: #2c5f8a;
    --ink3: #10233f;
    --red: #c8402a;
    --red-ink: #9c2f1d;
    --green: #2f6b4f;
    --amber: #9a6a1f;
    --violet: #5b4b8a;
    --sepia: #6e4f2a;
    --line: rgba(34,48,74,0.28);
    --line2: rgba(34,48,74,0.5);
    --dim: #5d6a80;
    --faint: #8a8f9c;
    --font-display: "Anton", "Arial Narrow", "Inter", sans-serif;
    --font-mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;
    --font-ui: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    background:
      radial-gradient(1100px 720px at 8% -8%, rgba(44,95,138,0.10), transparent 58%),
      radial-gradient(900px 620px at 92% 4%, rgba(200,64,42,0.06), transparent 55%),
      linear-gradient(180deg, #efe7d5, var(--paper) 42%, #e9dfca);
    color: var(--ink);
    font-family: var(--font-ui);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    overflow: hidden;
  }
  body::after {
    content: ""; position: fixed; inset: 0; z-index: 2; pointer-events: none; opacity: 0.05;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.7'/%3E%3C/svg%3E");
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
    .plan-fx, .fx-canvas { display: none !important; }
  }
  :focus-visible { outline: 2px solid var(--ink2); outline-offset: 2px; border-radius: 4px; }

  .app { position: relative; z-index: 1; display: flex; flex-direction: column; height: 100vh; }

  /* ---------- title block / top bar ---------- */
  .topbar {
    display: flex; align-items: stretch; justify-content: space-between; gap: 14px;
    padding: 0; border-bottom: 2px solid var(--ink3); background: var(--paper);
    z-index: 20; flex: 0 0 auto;
  }
  .brand {
    display: flex; align-items: center; gap: 14px; min-width: 0; padding: 12px 18px;
    border-right: 1px solid var(--line2);
  }
  .brand-mark { width: 42px; height: 42px; flex: 0 0 42px; }
  .brand-mark path { fill: none; stroke: var(--ink3); stroke-width: 2.2; stroke-linecap: round; }
  .brand-mark .dot { fill: var(--red); }
  .brand-title { font-family: var(--font-display); font-size: 22px; letter-spacing: 0.6px; line-height: 1; color: var(--ink3); }
  .brand-sub { font-family: var(--font-mono); font-size: 10.5px; color: var(--dim); margin-top: 4px; letter-spacing: 0.4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .top-right { display: flex; align-items: stretch; gap: 0; flex-wrap: wrap; justify-content: flex-end; }
  .cfg { display: flex; align-items: stretch; }
  .cfgb {
    display: inline-flex; align-items: center; padding: 10px 12px; font-family: var(--font-mono);
    font-size: 10.5px; font-weight: 600; letter-spacing: 0.7px; text-transform: uppercase;
    color: var(--dim); border-left: 1px solid var(--line); background: rgba(255,255,255,0.18);
  }
  .cfgb:first-child { border-left: 0; }
  .cfgb.on { color: var(--ink3); background: rgba(47,107,79,0.10); box-shadow: inset 0 -3px 0 var(--green); }
  .live {
    display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px; margin-left: 10px;
    font-family: var(--font-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase;
    color: var(--green); border-left: 1px solid var(--line); background: rgba(47,107,79,0.08);
    white-space: nowrap;
  }
  .live.stale { color: var(--amber); background: rgba(154,106,31,0.10); }
  .live.replay { color: var(--violet); background: rgba(91,75,138,0.10); }
  .live .dot { width: 8px; height: 8px; border-radius: 999px; background: currentColor; box-shadow: 0 0 0 0 rgba(47,107,79,0.5); animation: pulse 1.6s ease-out infinite; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(47,107,79,0.5); } 70% { box-shadow: 0 0 0 9px rgba(47,107,79,0); } 100% { box-shadow: 0 0 0 0 rgba(47,107,79,0); } }

  /* ---------- layout ---------- */
  .layout {
    flex: 1 1 auto; min-height: 0; display: grid; gap: 0; padding: 0;
    grid-template-columns: 292px minmax(0, 1fr) 372px;
  }
  @media (max-width: 1180px) { .layout { grid-template-columns: 262px minmax(0,1fr) 340px; } }
  @media (max-width: 980px) { .layout { grid-template-columns: 1fr; overflow: auto; } .rail { max-height: none; } }
  .rail { display: flex; flex-direction: column; min-height: 0; overflow: auto; }
  .rail::-webkit-scrollbar, .feed::-webkit-scrollbar, .tasks::-webkit-scrollbar, .ledger::-webkit-scrollbar { width: 8px; }
  .rail::-webkit-scrollbar-thumb, .feed::-webkit-scrollbar-thumb, .tasks::-webkit-scrollbar-thumb, .ledger::-webkit-scrollbar-thumb { background: rgba(34,48,74,0.25); border-radius: 8px; }

  .panel {
    position: relative; padding: 14px 15px; border-bottom: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.12));
    flex: 0 0 auto;
  }
  .panel h2 {
    margin: 0 0 12px; font-family: var(--font-mono); font-size: 10.5px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 1.6px; color: var(--dim);
    display: flex; align-items: center; gap: 8px;
  }
  .panel h2::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, var(--line2), transparent); }
  .panel h2::before { content: ""; width: 8px; height: 8px; border: 1.5px solid var(--ink3); transform: rotate(45deg); flex: 0 0 8px; }

  /* ---------- field notes / composer ---------- */
  .composer label { display: block; font-family: var(--font-mono); font-size: 10px; color: var(--dim); margin: 10px 0 5px; letter-spacing: 1px; text-transform: uppercase; }
  .composer input, .composer textarea, .composer select {
    width: 100%; font: inherit; font-size: 12.5px; color: var(--ink);
    background: rgba(255,255,255,0.5); border: 1px solid var(--line2); border-radius: 3px;
    padding: 9px 11px; outline: none; resize: vertical;
  }
  .composer input:focus, .composer textarea:focus { border-color: var(--ink2); box-shadow: 0 0 0 3px rgba(44,95,138,0.12); }
  .composer textarea { min-height: 58px; font-family: var(--font-mono); font-size: 12px; }
  .composer details { margin-top: 10px; }
  .composer summary { cursor: pointer; font-family: var(--font-mono); font-size: 11px; color: var(--dim); letter-spacing: 0.4px; }
  .composer-actions { display: flex; gap: 8px; margin-top: 12px; }
  .btn {
    font: inherit; font-family: var(--font-mono); font-size: 11.5px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase;
    cursor: pointer; padding: 9px 12px; border-radius: 3px; border: 1.5px solid var(--ink3); color: var(--ink3);
    background: var(--paper); transition: transform 120ms ease, background 120ms ease, box-shadow 120ms ease;
  }
  .btn:hover:not(:disabled) { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 var(--ink3); }
  .btn:disabled { opacity: 0.55; cursor: progress; }
  .btn.primary { color: var(--paper); background: var(--ink3); }
  .btn.ghost { color: var(--violet); border-color: var(--violet); background: rgba(91,75,138,0.08); }
  .err { color: var(--red); font-family: var(--font-mono); font-size: 11px; margin-top: 8px; min-height: 14px; }
  .cmd {
    font-family: var(--font-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.5px;
    background: var(--paper); border: 1.5px solid var(--ink3); color: var(--ink3);
    padding: 7px 10px; border-radius: 3px; cursor: pointer; white-space: nowrap; text-transform: uppercase;
  }
  .cmd:hover { background: var(--paper3); }
  .cmd.copied { color: var(--green); border-color: var(--green); }

  .onboard { border: 1.5px dashed var(--ink2); background: rgba(44,95,138,0.06); }
  .onboard[hidden] { display: none; }
  .onboard-icon { width: 34px; height: 34px; display: grid; place-items: center; border: 1.5px solid var(--ink3); color: var(--ink3); font-family: var(--font-display); font-size: 16px; transform: rotate(45deg); flex: 0 0 34px; }
  .onboard-icon::after { content: ""; width: 10px; height: 10px; background: var(--red); transform: rotate(45deg); }
  .onboard-body { flex: 1 1 200px; }
  .onboard-title { font-family: var(--font-display); font-size: 14px; letter-spacing: 0.5px; color: var(--ink3); }
  .onboard-sub { color: var(--dim); font-size: 12px; margin-top: 4px; line-height: 1.5; }
  .onboard-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

  /* ---------- tables as field notes ---------- */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; font-family: var(--font-mono); font-size: 9.5px; color: var(--faint); text-transform: uppercase; letter-spacing: 1.2px; padding: 0 0 8px; font-weight: 600; border-bottom: 1px solid var(--line2); }
  td { padding: 8px 0; border-top: 1px dashed var(--line); vertical-align: top; }
  td:first-child { padding-right: 10px; }
  .agent { color: var(--ink2); font-weight: 700; font-family: var(--font-mono); }
  .muted { color: var(--faint); }
  .empty { color: var(--faint); font-size: 12px; padding: 10px 0; font-family: var(--font-mono); }
  code { font-family: var(--font-mono); font-size: 11px; color: var(--ink3); background: rgba(255,255,255,0.55); border: 1px solid var(--line); padding: 1px 5px; border-radius: 2px; }
  .pill { font-family: var(--font-mono); font-size: 9.5px; font-weight: 600; padding: 2px 7px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.8px; border: 1px solid var(--line2); }
  .pill.queued { color: var(--amber); background: rgba(154,106,31,0.10); border-color: rgba(154,106,31,0.5); }

  /* ---------- site plan stage ---------- */
  .sheet-stage {
    display: flex; flex-direction: column; min-height: 0; position: relative;
    background: linear-gradient(180deg, rgba(255,255,255,0.25), rgba(255,255,255,0.05));
    border-left: 1px solid var(--line2); border-right: 1px solid var(--line2);
  }
  .sheet-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 14px 18px 10px; border-bottom: 1px solid var(--line2); }
  .sheet-head h1 { margin: 0; font-family: var(--font-display); font-size: 26px; letter-spacing: 0.8px; color: var(--ink3); line-height: 1; }
  .sheet-head p { margin: 5px 0 0; color: var(--dim); font-size: 12px; max-width: 640px; line-height: 1.45; }
  .trunk-pill { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border: 1.5px solid var(--ink3); background: var(--paper); }
  .trunk-light { width: 30px; height: 30px; display: grid; place-items: center; font-family: var(--font-display); font-size: 15px; border: 1.5px solid var(--ink3); background: var(--paper); transform: rotate(45deg); }
  .trunk-light span { transform: rotate(-45deg); }
  .trunk-light.green { color: var(--green); }
  .trunk-light.red { color: var(--red); animation: blink 1.1s ease-in-out infinite; }
  @keyframes blink { 50% { opacity: 0.55; } }
  .trunk-pill .label { font-family: var(--font-mono); font-size: 9px; color: var(--faint); text-transform: uppercase; letter-spacing: 1.4px; }
  .trunk-pill .value { font-family: var(--font-display); font-size: 17px; letter-spacing: 0.6px; }
  .value.green { color: var(--green); } .value.red { color: var(--red); }

  .sheet-wrap { position: relative; flex: 1 1 auto; min-height: 340px; padding: 8px 12px 0; }
  .sheet-wrap svg { position: relative; z-index: 1; width: 100%; height: 100%; display: block; }
  .plan-fx { position: absolute; inset: 0; z-index: 3; width: 100%; height: 100%; pointer-events: none; }
  .fx-canvas { position: fixed; inset: 0; z-index: 70; width: 100%; height: 100%; pointer-events: none; }
  .sheet-cap { text-align: center; padding: 8px 0 10px; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 1.8px; text-transform: uppercase; color: var(--faint); border-top: 1px dashed var(--line2); }
  .revision-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-top: 1px solid var(--line2); }
  .counter { padding: 10px 14px; border-left: 1px dashed var(--line); }
  .counter:first-child { border-left: 0; }
  .counter span { display: block; font-family: var(--font-display); font-size: 24px; letter-spacing: 0.5px; color: var(--ink3); }
  .counter span.tick { transform: scale(1.08); transition: transform 200ms ease; }
  .counter label { font-family: var(--font-mono); font-size: 9.5px; color: var(--faint); text-transform: uppercase; letter-spacing: 1.1px; }
  @media (max-width: 720px) { .revision-strip { grid-template-columns: repeat(2,1fr); } .counter { border-top: 1px dashed var(--line); } }

  /* site plan svg */
  .sp-frame { fill: none; stroke: var(--ink3); stroke-width: 2; }
  .sp-grid { stroke: rgba(34,48,74,0.10); stroke-width: 1; }
  .sp-dim { stroke: var(--ink2); stroke-width: 1; }
  .sp-label { fill: var(--dim); font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.6px; text-transform: uppercase; font-weight: 600; }
  .sp-label.strong { fill: var(--ink3); font-weight: 700; }
  .sp-label.red { fill: var(--red); }
  .sp-label.green { fill: var(--green); }
  .sp-parcel { stroke: var(--ink3); stroke-width: 1.6; }
  .sp-parcel.wait { stroke-dasharray: 6 5; }
  .sp-channel { fill: none; stroke-linecap: round; }
  .sp-channel-halo { fill: none; stroke-linecap: round; opacity: 0.16; filter: blur(3px); }
  .sp-staged { stroke: var(--amber); stroke-width: 1.4; stroke-dasharray: 5 6; }
  .sp-trunk { fill: none; stroke: var(--ink2); stroke-width: 5; stroke-linecap: round; }
  .sp-trunk-core { fill: none; stroke: var(--ink3); stroke-width: 1.2; stroke-linecap: round; opacity: 0.65; stroke-dasharray: 2 10; }
  .sp-trunk.red { stroke: var(--red); }
  .sp-basin { fill: rgba(44,95,138,0.08); stroke: var(--ink2); stroke-width: 1.4; }
  .sp-stamp { fill: none; stroke: var(--green); stroke-width: 1.8; }
  .sp-stamp text { fill: var(--green); font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: 1.2px; }
  .sp-reject { stroke: var(--red); stroke-width: 1.8; }
  .sp-reject text { fill: var(--red); font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: 1px; }
  .sp-cloud { fill: none; stroke: var(--red); stroke-width: 1.6; stroke-linecap: round; }
  .sp-pending { fill: none; stroke: var(--amber); stroke-width: 1.2; stroke-dasharray: 3 5; }
  .sp-tick { stroke: var(--ink3); stroke-width: 1; }
  .sp-arrow { fill: none; stroke: var(--ink3); stroke-width: 1.6; stroke-linecap: round; }
  .draw-once { stroke-dasharray: 1400; stroke-dashoffset: 1400; animation: drawPath 2.4s ease-out forwards; }
  @keyframes drawPath { to { stroke-dashoffset: 0; } }
  .stamp-in { transform-box: fill-box; transform-origin: center; animation: stampIn 0.55s cubic-bezier(0.2,1.4,0.3,1) both; }
  @keyframes stampIn { 0% { transform: scale(1.7) rotate(-14deg); opacity: 0; } 60% { transform: scale(0.94) rotate(-7deg); opacity: 1; } 100% { transform: scale(1) rotate(-8deg); opacity: 1; } }
  .redline-in { animation: redlineIn 0.7s ease-out both; }
  @keyframes redlineIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }

  /* ---------- ledger / tasks ---------- */
  .tf { display: flex; gap: 6px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
  .tfb {
    font: inherit; font-family: var(--font-mono); font-size: 10.5px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase;
    cursor: pointer; padding: 5px 9px; border-radius: 3px; border: 1.5px solid var(--line2); color: var(--dim); background: rgba(255,255,255,0.3);
  }
  .tfb.on { color: var(--paper); background: var(--ink3); border-color: var(--ink3); }
  .tfb .n { opacity: 0.7; margin-left: 4px; }
  #taskSearch { background: rgba(255,255,255,0.55); border: 1px solid var(--line2); color: var(--ink); border-radius: 3px; padding: 5px 11px; font-family: var(--font-mono); font-size: 11px; margin-left: auto; min-width: 130px; }
  .ledger { display: flex; flex-direction: column; gap: 8px; max-height: 46vh; overflow: auto; padding: 2px; }
  .spec-row {
    position: relative; border: 1.5px solid var(--line2); border-radius: 3px; padding: 10px 11px 10px 42px;
    background: rgba(255,255,255,0.42); cursor: pointer; transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
  }
  .spec-row:hover { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 var(--ink3); border-color: var(--ink3); }
  .spec-row::before {
    content: attr(data-idx); position: absolute; left: 10px; top: 9px; font-family: var(--font-display);
    font-size: 18px; color: var(--faint); line-height: 1;
  }
  .spec-row[data-status="landed"] { border-left: 5px solid var(--green); }
  .spec-row[data-status="rejected"], .spec-row[data-status="failed"] { border-left: 5px solid var(--red); }
  .spec-row[data-status="working"], .spec-row[data-status="merging"], .spec-row[data-status="claiming"], .spec-row[data-status="resolving"], .spec-row[data-status="planning"] { border-left: 5px solid var(--ink2); }
  .spec-row[data-status="queued"] { border-left: 5px solid var(--amber); }
  .spec-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
  .st { font-family: var(--font-mono); font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.9px; padding: 2px 7px; border-radius: 2px; border: 1px solid var(--line2); }
  .st.planning, .st.claiming, .st.working, .st.merging, .st.resolving { color: var(--ink2); background: rgba(44,95,138,0.10); border-color: rgba(44,95,138,0.5); }
  .st.queued { color: var(--amber); background: rgba(154,106,31,0.10); border-color: rgba(154,106,31,0.5); }
  .st.landed { color: var(--green); background: rgba(47,107,79,0.10); border-color: rgba(47,107,79,0.5); }
  .st.rejected, .st.failed { color: var(--red); background: rgba(200,64,42,0.10); border-color: rgba(200,64,42,0.5); }
  .spec-goal { font-size: 13px; font-weight: 600; line-height: 1.35; color: var(--ink3); }
  .spec-meta { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-family: var(--font-mono); font-size: 10.5px; color: var(--dim); flex-wrap: wrap; }
  .gate-mark { font-family: var(--font-mono); font-size: 9.5px; font-weight: 700; padding: 2px 7px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.6px; }
  .gate-mark.ok { color: var(--green); background: rgba(47,107,79,0.10); border: 1px solid rgba(47,107,79,0.5); }
  .gate-mark.bad { color: var(--red); background: rgba(200,64,42,0.10); border: 1px solid rgba(200,64,42,0.5); }
  .tag { font-family: var(--font-mono); font-size: 9.5px; font-weight: 700; padding: 2px 6px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.6px; border: 1px solid var(--line); }
  .tag.claim { color: var(--ink2); background: rgba(44,95,138,0.10); }
  .tag.release { color: var(--green); background: rgba(47,107,79,0.10); }
  .tag.merge { color: var(--violet); background: rgba(91,75,138,0.10); }
  .tag.conflict, .tag.task { color: var(--red); background: rgba(200,64,42,0.10); }
  .tag.resolver, .tag.queued { color: var(--amber); background: rgba(154,106,31,0.10); }

  /* ---------- feed / notes ---------- */
  .feed { display: flex; flex-direction: column; gap: 7px; max-height: 34vh; overflow: auto; }
  .feed-row { display: grid; grid-template-columns: 58px 1fr; gap: 8px; font-size: 11.5px; padding: 5px 6px; margin: 0 -6px; border-left: 2px solid transparent; }
  .feed-row:hover { border-left-color: var(--ink2); background: rgba(44,95,138,0.06); }
  .feed-row .t { font-family: var(--font-mono); font-size: 10px; color: var(--faint); font-variant-numeric: tabular-nums; padding-top: 1px; }
  .feed-row .b { color: var(--dim); line-height: 1.45; }
  .feed-row .who { color: var(--ink2); font-weight: 700; font-family: var(--font-mono); }

  /* ---------- last merge / repos ---------- */
  .last-merge { font-size: 12px; color: var(--dim); line-height: 1.5; font-family: var(--font-mono); }
  .repo-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .rb-repo.on { color: var(--paper); background: var(--ink3); border-color: var(--ink3); }
  .repo-files details { border: 1px solid var(--line2); border-radius: 3px; margin-top: 7px; background: rgba(255,255,255,0.45); }
  .repo-files summary { cursor: pointer; padding: 8px 10px; font-family: var(--font-mono); font-size: 11.5px; color: var(--ink); }
  .repo-files pre { margin: 0; padding: 10px; overflow: auto; font-family: var(--font-mono); font-size: 11px; color: var(--ink3); max-height: 220px; background: rgba(255,255,255,0.35); }

  /* ---------- inspection drawer ---------- */
  .veil { position: fixed; inset: 0; background: rgba(34,48,74,0.35); z-index: 40; }
  .drawer {
    position: fixed; top: 0; right: 0; height: 100vh; width: min(620px, 94vw); z-index: 50;
    background: linear-gradient(180deg, var(--paper), var(--paper2));
    border-left: 2px solid var(--ink3); box-shadow: -30px 0 80px rgba(34,48,74,0.35);
    display: flex; flex-direction: column;
  }
  .drawer[hidden] { display: none; }
  .drawer-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 18px 20px 12px; border-bottom: 2px solid var(--ink3); }
  .drawer-head h2 { margin: 0; font-family: var(--font-display); font-size: 18px; letter-spacing: 0.6px; color: var(--ink3); line-height: 1.15; }
  .drawer-x { font: inherit; font-family: var(--font-mono); font-size: 12px; font-weight: 700; cursor: pointer; color: var(--ink3); background: var(--paper); border: 1.5px solid var(--ink3); border-radius: 3px; width: 34px; height: 34px; }
  .drawer-x:hover { background: var(--paper3); }
  .drawer-body { flex: 1 1 auto; overflow: auto; padding: 16px 20px 28px; }
  .dsec { margin-bottom: 18px; }
  .dsec h4 { margin: 0 0 10px; font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 1.6px; color: var(--dim); border-bottom: 1px dashed var(--line2); padding-bottom: 6px; }
  .tl { display: flex; flex-direction: column; gap: 6px; }
  .tl-row { display: grid; grid-template-columns: 96px 1fr; gap: 10px; font-size: 12px; }
  .tl-row .k { font-family: var(--font-mono); font-size: 9.5px; color: var(--faint); text-transform: uppercase; letter-spacing: 0.8px; padding-top: 2px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { font-family: var(--font-mono); font-size: 10.5px; color: var(--ink3); background: rgba(255,255,255,0.55); border: 1px solid var(--line2); padding: 3px 8px; border-radius: 2px; }
  .dl { font-family: var(--font-mono); font-size: 11.5px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
  .dl .add { color: var(--green); } .dl .del { color: var(--red); } .dl .ctx { color: var(--dim); }
  pre { background: rgba(255,255,255,0.55); border: 1px solid var(--line2); border-radius: 3px; padding: 10px 12px; overflow: auto; font-family: var(--font-mono); font-size: 11.5px; color: var(--ink3); margin: 8px 0 0; }
  details summary { cursor: pointer; color: var(--ink2); font-family: var(--font-mono); font-size: 12px; font-weight: 700; padding: 4px 0; }
  .gate-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
  .verdict { font-family: var(--font-mono); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.9px; padding: 3px 9px; border-radius: 2px; border: 1px solid var(--line2); }
  .verdict.ok { color: var(--green); background: rgba(47,107,79,0.10); border-color: rgba(47,107,79,0.55); }
  .verdict.bad { color: var(--red); background: rgba(200,64,42,0.10); border-color: rgba(200,64,42,0.55); }
  .specgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px,1fr)); gap: 7px; margin: 10px 0; }
  .spec { background: rgba(255,255,255,0.5); border: 1px solid var(--line2); border-radius: 3px; padding: 7px 9px; font-size: 11px; }
  .spec b { display: block; font-family: var(--font-mono); font-size: 9px; color: var(--faint); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px; }

  /* ---------- replay ---------- */
  .replaybar {
    position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 60;
    display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 3px;
    border: 1.5px solid var(--ink3); background: var(--paper); box-shadow: 4px 4px 0 rgba(34,48,74,0.25);
  }
  .replaybar[hidden] { display: none; }
  .replaybar input[type="range"] { flex: 1 1 220px; min-width: 140px; accent-color: var(--violet); }
  .rp-meta { font-family: var(--font-mono); font-size: 11px; color: var(--dim); font-variant-numeric: tabular-nums; }
  .rp-meta b { color: var(--ink3); }
  .rp-link { font-family: var(--font-mono); font-size: 11px; color: var(--violet); text-decoration: none; border-bottom: 1px dotted var(--violet); white-space: nowrap; text-transform: uppercase; letter-spacing: 0.6px; }
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <pattern id="hatchLight" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(34,48,74,0.18)" stroke-width="1"/>
    </pattern>
    <pattern id="hatchMid" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(34,48,74,0.32)" stroke-width="1"/>
    </pattern>
    <pattern id="hatchCross" width="6" height="6" patternUnits="userSpaceOnUse">
      <path d="M0,0 L6,6 M6,0 L0,6" stroke="rgba(200,64,42,0.28)" stroke-width="1"/>
    </pattern>
    <pattern id="hatchWait" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(154,106,31,0.28)" stroke-width="1"/>
    </pattern>
    <filter id="inkRough" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.4"/>
    </filter>
  </defs>
</svg>
<div class="app">
  <header class="topbar">
    <div class="brand">
      <svg class="brand-mark" viewBox="0 0 42 42" aria-hidden="true">
        <path d="M5 30 C 12 27, 16 34, 22 30 S 34 20, 37 15"/>
        <path d="M5 35 C 14 32, 19 39, 25 35 S 35 27, 37 22" opacity="0.55"/>
        <circle class="dot" cx="31" cy="14" r="3"/>
      </svg>
      <div>
        <div class="brand-title">Tributary</div>
        <div class="brand-sub">SITE PLAN NO. 001 · MANY AGENTS · ONE TRUNK · ZERO BLAST RADIUS</div>
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
        <div class="onboard-icon"></div>
        <div class="onboard-body">
          <div class="onboard-title">Nothing has been surveyed yet</div>
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
        <h2>Waitlist · staged</h2>
        <table id="waitlist">
          <thead><tr><th>agent</th><th>files</th><th>state</th></tr></thead>
          <tbody><tr><td colspan="3" class="empty">No waitlisted agents.</td></tr></tbody>
        </table>
      </section>
    </aside>

    <section class="sheet-stage">
      <div class="sheet-head">
        <div>
          <h1>Site plan — confluence</h1>
          <p>Claims are plotted parcels, work moves through surveyed channels, and only verified revisions reach the as-built trunk.</p>
        </div>
        <div class="trunk-pill">
          <span class="trunk-light green" id="trunkLight"><span>✓</span></span>
          <div><div class="label">trunk</div><div class="value green" id="trunkLabel">GREEN</div></div>
        </div>
      </div>
      <div class="sheet-wrap">
        <svg id="sitePlan" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Site plan of agent changes converging into the verified trunk">
          <rect class="sp-frame" x="34" y="34" width="1132" height="692"/>
          <g id="planStatic">
            <g class="sp-grid" fill="none">
              <path d="M34,150 H1166 M34,270 H1166 M34,390 H1166 M34,510 H1166 M34,630 H1166"/>
              <path d="M180,34 V726 M360,34 V726 M540,34 V726 M720,34 V726 M900,34 V726 M1080,34 V726"/>
            </g>
            <path class="sp-dim draw-once" d="M60,706 H1140"/>
            <path class="sp-tick" d="M60,700 V712 M1140,700 V712"/>
            <text class="sp-label" x="60" y="730">SCALE 1:1 · REV A</text>
            <text class="sp-label" x="1140" y="730" text-anchor="end">BLAST RADIUS: CONTAINED</text>
          </g>
          <g id="planLayer" filter="url(#inkRough)"></g>
        </svg>
        <canvas id="planFX" class="plan-fx" aria-hidden="true"></canvas>
      </div>
      <div class="sheet-cap" id="sheetCap">The site is quiet — no changes in flight</div>
      <div class="revision-strip">
        <div class="counter"><span id="cMerges">0</span><label>merges landed</label></div>
        <div class="counter"><span id="cPrev">0</span><label>conflicts prevented</label></div>
        <div class="counter"><span id="cRes">0</span><label>resolver runs</label></div>
        <div class="counter"><span id="qDepth"></span><label>queue depth</label></div>
      </div>
    </section>

    <aside class="rail">
      <section class="panel">
        <h2>Ledger · tasks</h2>
        <div class="tf" id="taskFilter">
          <button class="tfb on" data-f="all" type="button">all<span class="n">0</span></button>
          <button class="tfb" data-f="active" type="button">active<span class="n">0</span></button>
          <button class="tfb" data-f="landed" type="button">landed<span class="n">0</span></button>
          <button class="tfb" data-f="rejected" type="button">rejected<span class="n">0</span></button>
        </div>
        <input id="taskSearch" placeholder="search tasks…" />
        <div class="ledger" id="tasks" aria-label="Dispatched tasks"></div>
      </section>

      <section class="panel">
        <h2>Last revision</h2>
        <div class="last-merge" id="lastMerge">No merge yet — trunk has not moved.</div>
      </section>

      <section class="panel">
        <h2>Repos · annex</h2>
        <div class="repo-chips" id="repoList"></div>
        <div class="repo-files" id="repoFiles"></div>
      </section>

      <section class="panel">
        <h2>Survey log</h2>
        <div class="feed" id="feed"></div>
      </section>
    </aside>
  </main>
</div>

<div class="veil" id="drawerVeil" hidden></div>
<aside class="drawer" id="drawer" hidden>
  <div class="drawer-head">
    <h2 id="dGoal"></h2>
    <button class="drawer-x" id="drawerX" type="button" aria-label="Close inspection report">✕</button>
  </div>
  <div class="drawer-body" id="dBody"></div>
</aside>

<div class="replaybar" id="replaybar" hidden>
  <button class="btn ghost" id="rpPlay" type="button">▶ Play</button>
  <input id="rpSeek" type="range" min="0" max="0" value="0" />
  <div class="rp-meta"><span id="rpTime">0:00</span> · <span id="rpCount"><b>0</b> / 0 events</span></div>
  <a class="rp-link" href="/">Exit replay · live</a>
</div>
<canvas id="fxCanvas" class="fx-canvas" aria-hidden="true"></canvas>

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
  var reducedMotion = function () {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  // ---- transition fx: cover/reveal + ink blot ----------------------------
  var fx = { ctx: null, w: 0, h: 0, dpr: 1, mode: null, t: 0, dur: 0, cb: null, blobs: [], cells: [], raf: null, last: 0 };
  var fxCanvas = function () { return $('fxCanvas'); };
  var fxReady = function () {
    var cvs = fxCanvas();
    if (!cvs || !cvs.getContext) return false;
    fx.ctx = cvs.getContext('2d');
    return !!fx.ctx;
  };
  var fxResize = function () {
    var cvs = fxCanvas();
    if (!cvs) return;
    var w = window.innerWidth, h = window.innerHeight;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w !== fx.w || h !== fx.h || dpr !== fx.dpr) {
      fx.w = w; fx.h = h; fx.dpr = dpr;
      cvs.width = Math.max(1, Math.round(w * dpr));
      cvs.height = Math.max(1, Math.round(h * dpr));
      cvs.style.width = w + 'px';
      cvs.style.height = h + 'px';
    }
  };
  var fxClear = function () {
    if (!fx.ctx) return;
    fx.ctx.setTransform(1, 0, 0, 1, 0, 0);
    fx.ctx.clearRect(0, 0, fxCanvas().width, fxCanvas().height);
  };
  var fxStep = function (ts) {
    var dt = Math.min(0.05, (ts - fx.last) / 1000 || 0.016);
    fx.last = ts;
    fx.t += dt;
    if (fx.mode === 'wipe') drawWipe();
    else if (fx.mode === 'blot') drawBlot(dt);
    else {
      fxClear();
      if (!fx.blobs.length && !fx.mode) { fx.raf = null; return; }
    }
    if (fx.mode || fx.blobs.length) fx.raf = requestAnimationFrame(fxStep);
    else fx.raf = null;
  };
  var fxKick = function () {
    if (fx.raf || reducedMotion() || !fxReady()) return;
    fxResize();
    fx.last = performance.now();
    fx.raf = requestAnimationFrame(fxStep);
  };
  var drawWipe = function () {
    var cvs = fxCanvas(), ctx = fx.ctx;
    if (!cvs || !ctx) return;
    var cols = 28, rows = 7, cw = fx.w / cols, ch = fx.h / rows;
    var cover = Math.min(1, fx.t / (fx.dur * 0.52));
    var reveal = Math.max(0, Math.min(1, (fx.t - fx.dur * 0.5) / (fx.dur * 0.5)));
    ctx.setTransform(fx.dpr, 0, 0, fx.dpr, 0, 0);
    ctx.clearRect(0, 0, fx.w, fx.h);
    for (var i = 0; i < fx.cells.length; i++) {
      var cell = fx.cells[i];
      var cp = Math.min(1, Math.max(0, (cover - cell.at) / 0.16));
      var rp = Math.min(1, Math.max(0, (reveal - cell.at * 0.7) / 0.2));
      if (rp > 0) {
        ctx.fillStyle = '#f5efe2';
        ctx.fillRect(cell.x * cw - 0.5, cell.y * ch - 0.5, cw + 1, ch + 1);
      } else if (cp > 0) {
        ctx.fillStyle = cell.accent ? '#c8402a' : '#22304a';
        ctx.fillRect(cell.x * cw - 0.5, cell.y * ch - 0.5, cw + 1, ch + 1);
      }
    }
    if (fx.t >= fx.dur) {
      var cb = fx.cb; fx.cb = null; fx.mode = null; fx.t = 0; fx.cells = [];
      fxClear();
      if (cb) cb();
    }
  };
  var drawBlot = function (dt) {
    var ctx = fx.ctx;
    if (!ctx) return;
    ctx.setTransform(fx.dpr, 0, 0, fx.dpr, 0, 0);
    ctx.clearRect(0, 0, fx.w, fx.h);
    for (var i = fx.blobs.length - 1; i >= 0; i--) {
      var b = fx.blobs[i];
      b.r += b.vr * dt; b.a -= dt * b.decay;
      if (b.a <= 0 || b.r > b.max) { fx.blobs.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, b.a);
      ctx.fillStyle = b.color;
      ctx.beginPath();
      for (var k = 0; k < 14; k++) {
        var ang = (k / 14) * 6.2832;
        var rr = b.r * (0.82 + 0.18 * Math.sin(k * 2.7 + b.seed));
        var x = b.x + Math.cos(ang) * rr, y = b.y + Math.sin(ang) * rr * 0.82;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!fx.blobs.length) { fx.mode = null; fx.t = 0; fxClear(); if (!fx.raf) fx.raf = requestAnimationFrame(fxStep); }
  };
  var runWipe = function (cb) {
    if (reducedMotion() || !fxReady()) { if (cb) cb(); return; }
    fxResize();
    fx.cells = [];
    var cols = 28, rows = 7;
    var probs = [0.08, 0.18, 0.38, 0.62, 0.85, 1, 1];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (Math.random() > probs[r]) continue;
        fx.cells.push({
          x: c, y: r,
          at: Math.random() * 0.32 + r * 0.055 + (c % 5) * 0.012,
          accent: r < 4 && Math.random() < 0.045
        });
      }
    }
    fx.mode = 'wipe'; fx.t = 0; fx.dur = 0.9; fx.cb = cb;
    fxKick();
  };
  var inkBlot = function (x, y, color) {
    if (reducedMotion() || !fxReady()) return;
    fxResize();
    for (var i = 0; i < 5; i++) {
      fx.blobs.push({
        x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 30,
        r: 6 + Math.random() * 10, vr: 90 + Math.random() * 70, max: 90 + Math.random() * 60,
        a: 0.5, decay: 1.4 + Math.random() * 0.8, seed: Math.random() * 10,
        color: color || 'rgba(200,64,42,0.55)'
      });
    }
    fx.mode = 'blot'; fxKick();
  };
  window.addEventListener('resize', fxResize);

  // ---- field notes ---------------------------------------------------------
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
      return '<tr><td><span class="agent">' + esc(w.agentId) + '</span></td><td>' + filesCell(w.files) + '</td><td><span class="pill queued">staged</span></td></tr>';
    }).join('');
  };

  var renderFeed = function (events) {
    var feed = $('feed');
    if (!events || !events.length) {
      feed.innerHTML = '<div class="empty">Waiting for activity…</div>';
      return;
    }
    feed.innerHTML = events.map(function (e, i) {
      var who = e.agentId ? '<span class="who">' + esc(e.agentId) + '</span> · ' : '';
      return '<div class="feed-row" style="animation-delay:' + Math.min(i * 18, 240) + 'ms">' +
        '<div class="t">' + clock(e.at) + '</div>' +
        '<div class="b"><span class="tag ' + esc(e.kind) + '">' + esc(e.kind) + '</span> ' + who + esc(e.detail) + '</div></div>';
    }).join('');
  };

  // ---- ledger --------------------------------------------------------------
  var tasksById = {};
  var tasksList = [];
  var openTaskId = null;
  var taskFilter = 'all';
  var taskQuery = '';
  var taskIndex = function (id) {
    for (var i = 0; i < tasksList.length; i++) if (tasksList[i].id === id) return i + 1;
    return 0;
  };

  var renderTasks = function (tasks) {
    var host = $('tasks');
    tasksList = tasks || [];
    if (!tasksList.length) { host.innerHTML = ''; tasksById = {}; return; }
    tasksById = {};
    var counts = { all: tasksList.length, active: 0, landed: 0, rejected: 0 };
    tasksList.forEach(function (t) {
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
    var shown = tasksList.filter(function (t) {
      var match = !taskQuery || (t.goal + ' ' + t.agentId).toLowerCase().indexOf(taskQuery) !== -1;
      if (!match) return false;
      if (taskFilter === 'all') return true;
      if (taskFilter === 'active') return ['landed','rejected','failed'].indexOf(t.status) === -1;
      if (taskFilter === 'landed') return t.status === 'landed';
      return t.status === 'rejected' || t.status === 'failed';
    });
    host.innerHTML = shown.map(function (t) {
      var idx = String(taskIndex(t.id)).padStart(2, '0');
      var gateMark = '';
      if (t.gate && t.gate.provider) {
        var gok = t.gate.exitCode === 0;
        gateMark = '<span class="gate-mark ' + (gok ? 'ok' : 'bad') + '">' + (gok ? 'gate ✓' : 'gate ✗') + '</span>';
      }
      return '<div class="spec-row" data-task="' + esc(t.id) + '" data-status="' + esc(t.status) + '" data-idx="' + idx + '">' +
        '<div class="spec-top"><span class="st ' + esc(t.status) + '">' + esc(t.status) + '</span>' +
        '<span class="agent">' + esc(t.agentId) + '</span>' + gateMark + '</div>' +
        '<div class="spec-goal">' + esc(t.goal) + '</div>' +
        '<div class="spec-meta"><span>' + esc(ago(t.createdAt)) + '</span>' +
        (t.reason ? '<span>· ' + esc(String(t.reason).slice(0, 70)) + '</span>' : '') + '</div></div>';
    }).join('');
    host.querySelectorAll('.spec-row').forEach(function (el) {
      el.addEventListener('click', function () {
        var r = el.getBoundingClientRect();
        inkBlot(r.left + r.width / 2, r.top + r.height / 2, 'rgba(44,95,138,0.45)');
        openDrawer(el.getAttribute('data-task'));
      });
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
    $('dGoal').textContent = 'INSPECTION · ' + t.goal;
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
          (v.stderr ? '<pre style="border-color: rgba(200,64,42,0.5); color: #9c2f1d">' + esc(v.stderr) + '</pre>' : '');
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

  // ---- site plan -----------------------------------------------------------
  var hash = function (s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  };
  var PALETTE = ['#2c5f8a', '#6e4f2a', '#7a3b2e', '#2f6b4f', '#5b4b8a', '#8a5a2b', '#3f5a7a', '#6e2f4f'];
  var colorFor = function (name, i) { return PALETTE[(hash(String(name || 'x')) + i) % PALETTE.length]; };
  var W = 1200, H = 760;
  var CONFLUENCE = { x: 640, y: 560 };
  var trunkPoint = function (x) {
    var t = (x - CONFLUENCE.x) / 520;
    return 560 + Math.sin(t * Math.PI) * 10 - Math.max(0, t) * 18;
  };
  var trunkD = function () {
    var pts = [];
    for (var x = CONFLUENCE.x; x <= 1160; x += 65) pts.push(x + ',' + trunkPoint(x).toFixed(1));
    return 'M' + pts.join(' L');
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

  var planSig = null;
  var renderPlan = function (s) {
    var claims = s.activeClaims || [];
    var queued = s.waitlist || [];
    var tasks = s.tasks || [];
    var merges = (s.stats && s.stats.totalMerges) || 0;
    var rapids = (s.stats && s.stats.resolverInvocations) || 0;
    var trunkRed = s.stats && s.stats.trunkStatus === 'red';
    var sig = claims.map(function (c) { return c.agentId; }).join(',') + '|' +
      queued.map(function (w) { return w.agentId; }).join(',') + '|' +
      tasks.map(function (t) { return t.id + ':' + t.status; }).join(',') + '|' + merges + '|' + rapids + '|' + (trunkRed ? 'red' : 'green');
    if (sig === planSig) return;
    planSig = sig;

    var out = [];
    var fd = { claims: [], waitlist: [], rapids: [], trunk: makePath(sampleCubic([CONFLUENCE.x, CONFLUENCE.y], [820, CONFLUENCE.y - 20], [1010, trunkPoint(1010) + 10], [1160, trunkPoint(1160)], 48)), confluence: CONFLUENCE, outflow: { x: 1140, y: trunkPoint(1140) }, merges: merges, trunkRed: trunkRed };

    // staged / waitlist parcels
    out.push('<rect class="sp-staged" x="64" y="86" width="352" height="132"/>');
    out.push('<rect x="64" y="86" width="352" height="132" fill="url(#hatchWait)" opacity="0.7"/>');
    out.push('<text class="sp-label" x="76" y="106">STAGED · WAITLIST</text>');
    queued.slice(0, 5).forEach(function (w, i) {
      var x = 84 + (i % 2) * 168, y = 122 + Math.floor(i / 2) * 34;
      out.push('<text class="sp-label" x="' + x + '" y="' + y + '" fill="#9a6a1f">' + esc(String(w.agentId).slice(0, 16)) + '</text>');
      fd.waitlist.push({ agentId: w.agentId, path: makePath([[x, y + 8], [x + 120, y + 8]]) });
    });
    if (!queued.length) out.push('<text class="sp-label" x="84" y="170">NO STAGED WORK</text>');

    // claim parcels + surveyed channels
    claims.forEach(function (c, i) {
      var col = i % 2, row = Math.floor(i / 2);
      var px = 76 + col * 188, py = 268 + row * 108;
      var pw = 168, ph = 84;
      var color = colorFor(c.agentId, i);
      var files = (c.files && c.files.length) || 0;
      out.push('<rect class="sp-parcel" x="' + px + '" y="' + py + '" width="' + pw + '" height="' + ph + '" fill="url(#hatchMid)"/>');
      out.push('<rect class="sp-parcel" x="' + px + '" y="' + py + '" width="' + pw + '" height="' + ph + '" fill="none" stroke="' + color + '" stroke-width="1.4"/>');
      out.push('<text class="sp-label strong" x="' + (px + 10) + '" y="' + (py + 22) + '" fill="' + color + '">' + esc(String(c.agentId).slice(0, 18)) + '</text>');
      out.push('<text class="sp-label" x="' + (px + 10) + '" y="' + (py + 42) + '">' + files + ' file' + (files === 1 ? '' : 's') + ' claimed</text>');
      out.push('<text class="sp-label" x="' + (px + 10) + '" y="' + (py + 60) + '">' + esc(String((c.files || [])[0] || 'footprint').slice(0, 22)) + '</text>');
      var sx = px + pw, sy = py + ph / 2;
      var cx1 = sx + 90, cy1 = sy - 30, cx2 = CONFLUENCE.x - 120, cy2 = CONFLUENCE.y - 70;
      var d = 'M' + sx + ',' + sy.toFixed(1) + ' C ' + cx1 + ',' + cy1.toFixed(1) + ' ' + cx2 + ',' + cy2.toFixed(1) + ' ' + CONFLUENCE.x + ',' + CONFLUENCE.y.toFixed(1);
      fd.claims.push({ agentId: c.agentId, color: color, endX: CONFLUENCE.x, path: makePath(sampleCubic([sx, sy], [cx1, cy1], [cx2, cy2], [CONFLUENCE.x, CONFLUENCE.y], 40)) });
      out.push('<path class="sp-channel-halo" d="' + d + '" stroke="' + color + '" stroke-width="8"/>');
      out.push('<path class="sp-channel" d="' + d + '" stroke="' + color + '" stroke-width="2.2" stroke-dasharray="6 8"/>');
    });

    // confluence basin + trunk
    out.push('<ellipse class="sp-basin" cx="' + CONFLUENCE.x + '" cy="' + CONFLUENCE.y + '" rx="120" ry="58"/>');
    out.push('<path class="sp-trunk' + (trunkRed ? ' red' : '') + '" d="' + trunkD() + '"/>');
    out.push('<path class="sp-trunk-core" d="' + trunkD() + '" opacity="0.45"/>');
    out.push('<text class="sp-label strong" x="' + CONFLUENCE.x + '" y="' + (CONFLUENCE.y - 42) + '" text-anchor="middle">CONFLUENCE</text>');
    out.push('<text class="sp-label" x="' + CONFLUENCE.x + '" y="' + (CONFLUENCE.y + 76) + '" text-anchor="middle">SERIAL MERGE QUEUE</text>');

    // pending drops = in-flight tasks
    var inflight = tasks.filter(function (t) { return ['landed','rejected','failed'].indexOf(t.status) === -1; });
    inflight.slice(0, 7).forEach(function (t, i) {
      var x = CONFLUENCE.x - 42 + i * 14, y = CONFLUENCE.y - 86 - (i % 2) * 12;
      out.push('<line class="sp-pending" x1="' + x + '" y1="' + (y + 16) + '" x2="' + x + '" y2="' + (CONFLUENCE.y - 24) + '"/>');
      out.push('<circle cx="' + x + '" cy="' + y + '" r="7" fill="none" stroke="#9a6a1f" stroke-width="1.4"/>');
      out.push('<text class="sp-label" x="' + x + '" y="' + (y - 12) + '" text-anchor="middle" fill="#9a6a1f">' + esc(String(taskIndex(t.id)).padStart(2, '0')) + '</text>');
    });

    // landed stamps along trunk
    var landed = tasks.filter(function (t) { return t.status === 'landed'; }).slice(0, 9);
    landed.forEach(function (t, i) {
      var x = 706 + i * 46, y = trunkPoint(x);
      out.push('<g class="stamp-in" style="animation-delay:' + Math.min(i * 60, 480) + 'ms">' +
        '<rect class="sp-stamp" x="' + (x - 17) + '" y="' + (y - 30) + '" width="34" height="18" transform="rotate(-8 ' + x + ' ' + (y - 20) + ')"/>' +
        '<text x="' + x + '" y="' + (y - 17) + '" text-anchor="middle" transform="rotate(-8 ' + x + ' ' + (y - 20) + ')">OK</text></g>');
    });

    // rejected / failed marks near rapids
    tasks.filter(function (t) { return t.status === 'rejected' || t.status === 'failed'; }).slice(0, 6).forEach(function (t, i) {
      var x = 742 + i * 52, y = trunkPoint(x) - 44;
      out.push('<g class="redline-in">' +
        '<line class="sp-reject" x1="' + (x - 8) + '" y1="' + (y - 8) + '" x2="' + (x + 8) + '" y2="' + (y + 8) + '"/>' +
        '<line class="sp-reject" x1="' + (x + 8) + '" y1="' + (y - 8) + '" x2="' + (x - 8) + '" y2="' + (y + 8) + '"/></g>');
    });

    // rapids clouds
    var cloudCount = Math.min(rapids + inflight.filter(function (t) { return t.status === 'resolving' || t.status === 'merging'; }).length, 5);
    for (var r = 0; r < cloudCount; r++) {
      var rx = CONFLUENCE.x + 92 + r * 58, ry = trunkPoint(rx) - 52 - (r % 2) * 18;
      fd.rapids.push({ x: rx, y: ry });
      var rd = 'M' + (rx - 30) + ',' + ry.toFixed(1) + ' C ' + (rx - 11) + ',' + (ry - 13).toFixed(1) + ' ' + (rx + 11) + ',' + (ry + 13).toFixed(1) + ' ' + (rx + 30) + ',' + ry.toFixed(1) +
        ' C ' + (rx + 11) + ',' + (ry + 19).toFixed(1) + ' ' + (rx - 11) + ',' + (ry - 19).toFixed(1) + ' ' + (rx - 30) + ',' + ry.toFixed(1) + ' Z';
      out.push('<path class="sp-cloud" d="' + rd + '" fill="rgba(200,64,42,0.06)"/>');
      out.push('<circle cx="' + rx.toFixed(1) + '" cy="' + ry.toFixed(1) + '" r="3" fill="#c8402a"/>');
    }
    if (cloudCount) out.push('<text class="sp-label red" x="' + (CONFLUENCE.x + 120) + '" y="' + (trunkPoint(CONFLUENCE.x + 120) - 78) + '">RAPIDS · RESIDUAL CONFLICTS</text>');

    // outflow arrow
    var ex = 1120, ey = trunkPoint(ex);
    out.push('<path class="sp-arrow" d="M' + (ex - 26) + ',' + ey.toFixed(1) + ' L' + (ex - 6) + ',' + (ey - 6).toFixed(1) + ' M' + (ex - 6) + ',' + (ey - 6).toFixed(1) + ' L' + (ex + 8) + ',' + ey.toFixed(1) + ' M' + (ex - 6) + ',' + (ey - 6).toFixed(1) + ' L' + (ex + 2) + ',' + (ey + 6).toFixed(1) + ' L' + (ex + 8) + ',' + ey.toFixed(1) + '"/>');
    out.push('<text class="sp-label strong" x="' + (ex - 30) + '" y="' + (ey - 24) + '" text-anchor="end">AS-BUILT TRUNK</text>');

    var layer = $('planLayer');
    if (layer) layer.innerHTML = out.join('');
    $('sheetCap').textContent = (!claims.length && !queued.length && !merges)
      ? 'The site is quiet — no changes in flight'
      : (claims.length + ' in flight · ' + queued.length + ' staged · ' + merges + ' landed' + (rapids ? ' · ' + rapids + ' rapids' : ''));

    updatePlanFX(fd);
  };

  // ---- plan fx: drafting particles over the sheet -------------------------
  var flow = {
    data: null, emitters: [], byKey: {}, particles: [], bursts: [], ripples: [], sprites: {},
    raf: null, last: 0, time: 0, lastMerges: -1, w: 0, h: 0, dpr: 1, burstAcc: 0
  };
  var makeSprite = function (color) {
    if (flow.sprites[color]) return flow.sprites[color];
    var c = document.createElement('canvas');
    c.width = c.height = 48;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.3, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 48, 48);
    flow.sprites[color] = c;
    return c;
  };
  var updatePlanFX = function (fd) {
    flow.data = fd || flow.data;
    var d = flow.data;
    if (!d || !d.trunk) return;
    flow.emitters = [];
    flow.byKey = {};
    var claims = d.claims || [];
    var add = function (e) { flow.emitters.push(e); flow.byKey[e.key] = e; e.acc = 0; };
    add({ key: 'trunk', path: d.trunk, rate: 7 + (d.merges || 0) * 1.4 + claims.length * 1.8, color: '#22304a', size: 5, alpha: 0.42, speed: 120, wobble: 3, freq: 1.0, hold: false });
    claims.forEach(function (c) {
      add({ key: 'claim:' + c.agentId, path: c.path, rate: 5, color: c.color, size: 6, alpha: 0.85, speed: 150, wobble: 5, freq: 1.5, hold: false, nextKey: 'trunk', nextDist: 0 });
    });
    (d.waitlist || []).forEach(function (w) {
      add({ key: 'wait:' + w.agentId, path: w.path, rate: 2.5, color: '#9a6a1f', size: 5, alpha: 0.7, speed: 46, wobble: 2, freq: 1.8, hold: true });
    });
    var m = d.merges || 0;
    if (flow.lastMerges >= 0 && m > flow.lastMerges) {
      flow.ripples.push({ x: d.confluence.x, y: d.confluence.y, r: 10, vr: 52, a: 0.7, color: '#2c5f8a' });
      flow.ripples.push({ x: d.outflow.x, y: d.outflow.y, r: 10, vr: 60, a: 0.65, color: '#2f6b4f' });
    }
    flow.lastMerges = m;
  };
  var spawnFor = function (e) {
    var start = e.hold ? Math.random() * e.path.len : Math.random() * Math.min(36, e.path.len * 0.2);
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
  var stepPlanFX = function (dt) {
    flow.time += dt;
    for (var ei = 0; ei < flow.emitters.length; ei++) {
      var e = flow.emitters[ei];
      e.acc += e.rate * dt;
      while (e.acc >= 1) {
        e.acc -= 1;
        flow.particles.push(spawnFor(e));
        if (flow.particles.length > 380) flow.particles.splice(0, flow.particles.length - 380);
      }
    }
    var rapids = flow.data ? (flow.data.rapids || []) : [];
    if (rapids.length) {
      flow.burstAcc += rapids.length * 8 * dt;
      while (flow.burstAcc >= 1 && flow.bursts.length < 120) {
        flow.burstAcc -= 1;
        var rp = rapids[Math.floor(Math.random() * rapids.length)];
        flow.bursts.push({
          x: rp.x + (Math.random() - 0.5) * 40, y: rp.y + (Math.random() - 0.5) * 26,
          vx: (Math.random() - 0.5) * 55, vy: (Math.random() - 0.5) * 42 - 18,
          life: 1, decay: 1.2 + Math.random() * 0.8, size: 3 + Math.random() * 3.5
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
            p.em = nx;
            p.dist = p.em.nextDist || 0;
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
      bu.vx *= 0.985; bu.vy = bu.vy * 0.985 - 10 * dt;
      bu.life -= bu.decay * dt;
      if (bu.life <= 0) flow.bursts.splice(b, 1);
    }
    for (var r = flow.ripples.length - 1; r >= 0; r--) {
      var rp2 = flow.ripples[r];
      rp2.r += rp2.vr * dt;
      rp2.a -= dt * 0.7;
      if (rp2.a <= 0) flow.ripples.splice(r, 1);
    }
  };
  var drawPlanFX = function () {
    var cvs = $('planFX');
    if (!cvs) return;
    var ctx = cvs.getContext('2d');
    resizePlanFX();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    var w = flow.w || 1, h = flow.h || 1;
    var scale = Math.min(w / W, h / H);
    var ox = (w - W * scale) / 2, oy = (h - H * scale) / 2;
    ctx.setTransform(flow.dpr * scale, 0, 0, flow.dpr * scale, flow.dpr * ox, flow.dpr * oy);
    ctx.globalCompositeOperation = 'source-over';
    for (var r = 0; r < flow.ripples.length; r++) {
      var rp = flow.ripples[r];
      ctx.globalAlpha = Math.max(0, rp.a);
      ctx.strokeStyle = rp.color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, 6.2832);
      ctx.stroke();
    }
    for (var b = 0; b < flow.bursts.length; b++) {
      var bu = flow.bursts[b];
      ctx.globalAlpha = Math.max(0, bu.life) * 0.8;
      var bs = bu.size * 3;
      ctx.drawImage(makeSprite('#c8402a'), bu.x - bs / 2, bu.y - bs / 2, bs, bs);
    }
    for (var i = 0; i < flow.particles.length; i++) {
      var p = flow.particles[i], path = p.em.path;
      var pt = pointAt(path, p.dist);
      var nx = -Math.sin(pt.a), ny = Math.cos(pt.a);
      var off = Math.sin(flow.time * p.freq + p.phase) * p.wobble;
      var x = pt.x + nx * off, y = pt.y + ny * off + Math.sin(flow.time * 0.8 + p.phase) * 1.2;
      var fade = 1;
      if (!p.em.hold) {
        if (p.dist < 8) fade = p.dist / 8;
        else if (p.dist > path.len - 10) fade = Math.max(0, (path.len - p.dist) / 10);
      }
      ctx.globalAlpha = Math.max(0, p.alpha * fade);
      var s = p.size * 2.2 * (0.85 + 0.25 * Math.sin(flow.time * 3 + p.phase));
      ctx.drawImage(makeSprite(p.em.color), x - s / 2, y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };
  var resizePlanFX = function () {
    var cvs = $('planFX');
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
  var framePlanFX = function (ts) {
    var dt = Math.min(0.05, (ts - flow.last) / 1000 || 0.016);
    flow.last = ts;
    stepPlanFX(dt);
    drawPlanFX();
    flow.raf = requestAnimationFrame(framePlanFX);
  };
  var initPlanFX = function () {
    var cvs = $('planFX');
    if (!cvs || !cvs.getContext || reducedMotion()) return;
    resizePlanFX();
    if (window.ResizeObserver && cvs.parentElement) new ResizeObserver(resizePlanFX).observe(cvs.parentElement);
    window.addEventListener('resize', resizePlanFX);
    flow.last = performance.now();
    flow.raf = requestAnimationFrame(framePlanFX);
  };

  // ---- state ---------------------------------------------------------------
  var lastMerges = null;
  var applyState = function (s) {
    var ts = s.stats || {};
    var green = ts.trunkStatus !== 'red';
    var light = $('trunkLight');
    light.className = 'trunk-light ' + (green ? 'green' : 'red');
    light.querySelector('span').textContent = green ? '✓' : '!';
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
    renderPlan(s);
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

  // ---- transport -----------------------------------------------------------
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

  // ---- replay --------------------------------------------------------------
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
        runWipe(function () { renderReplayFrame(); });
        if (replay.events.length > 1) togglePlay();
      })
      .catch(function () { setPill('stale', 'Replay unavailable'); });
  };

  // ---- controls ------------------------------------------------------------
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

  // ---- repos ---------------------------------------------------------------
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
      renderTasks(tasksList.slice());
    });
  });
  $('taskSearch').addEventListener('input', function () {
    taskQuery = this.value.trim().toLowerCase();
    renderTasks(tasksList.slice());
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

  initPlanFX();
  runWipe(function () {
    if (location.search.indexOf('replay') !== -1) startReplay(); else startStream();
  });
})();
</script>
</body>
</html>`;
