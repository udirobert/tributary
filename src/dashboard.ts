export const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Tributary · Site Plan 001</title>
<meta name="description" content="Tributary coordinates many AI agents on one repository with claimed footprints, a serial merge queue, sandbox verification, and a live site-plan dashboard." />
<meta name="robots" content="index,follow" />
<meta name="theme-color" content="#f5efe2" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon.ico" sizes="64x64" />
<link rel="apple-touch-icon" href="/favicon.png" />
<link rel="manifest" href="/site.webmanifest" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Anton&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
<noscript><link href="https://fonts.googleapis.com/css2?family=Anton&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" /></noscript>
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
  .plan-fx { position: absolute; top: 8px; left: 12px; z-index: 3; width: calc(100% - 24px); height: calc(100% - 8px); }
  .fx-canvas { position: fixed; inset: 0; z-index: 70; width: 100%; height: 100%; pointer-events: none; }
  .sheet-loading {
    position: absolute; inset: 0; z-index: 4; display: grid; place-items: center;
    background: linear-gradient(180deg, rgba(245,239,226,0.92), rgba(236,228,209,0.94));
    pointer-events: none;
  }
  .sheet-loading[hidden] { display: none; }
  .load-plate {
    position: relative; min-width: 320px; padding: 24px 34px 22px; text-align: center;
    border: 1.5px solid var(--ink3); background: rgba(255,255,255,0.42);
    box-shadow: 6px 6px 0 rgba(34,48,74,0.12);
    animation: loadPlate 700ms cubic-bezier(0.2,0.9,0.2,1) both;
  }
  .load-plate::before, .load-plate::after {
    content: ""; position: absolute; width: 14px; height: 14px; border: 1.5px solid var(--ink2);
  }
  .load-plate::before { left: -7px; top: -7px; border-right: 0; border-bottom: 0; }
  .load-plate::after { right: -7px; bottom: -7px; border-left: 0; border-top: 0; }
  .load-kicker { font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--dim); }
  .load-title { margin-top: 6px; font-family: var(--font-display); font-size: 30px; letter-spacing: 0.8px; color: var(--ink3); }
  .load-rule { height: 2px; margin: 14px auto 10px; width: min(240px, 70%); background: rgba(34,48,74,0.14); overflow: hidden; }
  .load-rule span { display: block; height: 100%; width: 0; background: var(--ink2); animation: loadRule 1.1s ease-out 250ms forwards; }
  .load-sub { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--dim); }
  @keyframes loadPlate { from { opacity: 0; transform: translateY(10px) scale(0.985); } to { opacity: 1; transform: none; } }
  @keyframes loadRule { to { width: 100%; } }
  .sheet-cap { text-align: center; padding: 8px 0 10px; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 1.8px; text-transform: uppercase; color: var(--faint); border-top: 1px dashed var(--line2); }
  .revision-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-top: 1px solid var(--line2); }
  .counter { padding: 10px 14px; border-left: 1px dashed var(--line); }
  .counter:first-child { border-left: 0; }
  .counter span { display: block; font-family: var(--font-display); font-size: 24px; letter-spacing: 0.5px; color: var(--ink3); }
  .counter span.tick { transform: scale(1.08); transition: transform 200ms ease; }
  .counter label { font-family: var(--font-mono); font-size: 9.5px; color: var(--faint); text-transform: uppercase; letter-spacing: 1.1px; }
  @media (max-width: 720px) { .revision-strip { grid-template-columns: repeat(2,1fr); } .counter { border-top: 1px dashed var(--line); } }

  /* readability pass: keep the drawing legible at dashboard scale */
  .panel h2 { font-size: 11px; }
  .tfb, .st, .spec-meta, .feed-row .b, .tl-row, .last-merge, .repo-files summary, .repo-files pre, .dsec h4 { font-size: 12px; }
  .sheet-cap, .counter label, .cfgb, .live, .trunk-pill .label { font-size: 11px; }
  .spec-goal { font-size: 14px; }
  .counter span { font-size: 30px; }

  /* site plan svg */
  .sp-frame { fill: none; stroke: var(--ink3); stroke-width: 2; }
  .sp-grid { stroke: rgba(34,48,74,0.10); stroke-width: 1; }
  .sp-dim { stroke: var(--ink2); stroke-width: 1; }
  .sp-label { fill: var(--dim); font-family: var(--font-mono); font-size: 12.5px; letter-spacing: 1.8px; text-transform: uppercase; font-weight: 600; }
  .sp-label.strong { fill: var(--ink3); font-weight: 800; }
  .sp-label.red { fill: var(--red); }
  .sp-label.green { fill: var(--green); }
  .sp-display { fill: var(--ink3); font-family: var(--font-display); font-size: 27px; letter-spacing: 0.8px; }
  .sp-display.sm { font-size: 20px; letter-spacing: 1.2px; }
  .sp-meta { fill: var(--dim); font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; }
  .sp-parcel { stroke: var(--ink3); stroke-width: 1.6; }
  .sp-parcel.wait { stroke-dasharray: 6 5; }
  .sp-channel { fill: none; stroke-linecap: round; }
  .sp-channel-halo { fill: none; stroke-linecap: round; opacity: 0.16; filter: blur(3px); }
  .sp-staged { stroke: var(--amber); stroke-width: 1.4; stroke-dasharray: 5 6; }
  .sp-trunk { fill: none; stroke: var(--ink2); stroke-width: 5; stroke-linecap: round; }
  .sp-trunk-core { fill: none; stroke: var(--ink3); stroke-width: 1.2; stroke-linecap: round; opacity: 0.65; stroke-dasharray: 2 10; }
  .sp-trunk.red { stroke: var(--red); }
  .sp-basin-fill { stroke: var(--ink2); stroke-width: 1.5; }
  .sp-basin-inner { fill: none; stroke: var(--ink3); stroke-width: 1.2; stroke-dasharray: 5 6; opacity: 0.75; }
  .sp-trunk-edge { fill: none; stroke: rgba(16,35,63,0.32); stroke-width: 1.5; }
  .sp-cp-line { stroke: var(--ink3); stroke-width: 1; }
  .sp-cp { fill: var(--paper); stroke: var(--ink3); stroke-width: 2; }
  .sp-stamp { fill: none; stroke: var(--green); stroke-width: 1.8; }
  .sp-stamp text { fill: var(--green); font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: 1.2px; }
  .sp-reject { stroke: var(--red); stroke-width: 1.8; }
  .sp-reject text { fill: var(--red); font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: 1px; }
  .sp-cloud { fill: none; stroke: var(--red); stroke-width: 1.6; stroke-linecap: round; }
  .sp-pending { fill: none; stroke: var(--amber); stroke-width: 1.2; stroke-dasharray: 3 5; }
  .sp-tick { stroke: var(--ink3); stroke-width: 1; }
  .sp-arrow { fill: none; stroke: var(--ink3); stroke-width: 1.6; stroke-linecap: round; }
  .draw-once { stroke-dasharray: 1400; stroke-dashoffset: 1400; animation: drawPath 2.4s ease-out forwards; }
  .sp-grow { stroke-dasharray: 100; stroke-dashoffset: 100; animation: drawPath 1.6s ease-out forwards; }
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
  .spec-row.hl { background: rgba(44,95,138,0.12); border-color: var(--ink3); }
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
            <g class="sp-meta" text-anchor="end">
              <text x="1120" y="64">SHEET 1 / 1</text>
              <text x="1120" y="82">DRAWN BY TRIBUTARY</text>
              <text x="1120" y="100">SCALE 1:1 · REV A</text>
            </g>
            <g transform="translate(1120 152)">
              <circle cx="0" cy="0" r="15" fill="none" stroke="#5d6a80" stroke-width="1.4"/>
              <path d="M0,-10 L5,6 L0,3 L-5,6 Z" fill="#10233f"/>
              <text class="sp-display sm" x="0" y="32" text-anchor="middle" style="font-size:15px">N</text>
            </g>
            <path class="sp-dim draw-once" d="M60,706 H1140"/>
            <path class="sp-tick" d="M60,700 V712 M1140,700 V712"/>
            <text class="sp-label" x="60" y="730">SCALE 1:1 · REV A</text>
            <text class="sp-label" x="1140" y="730" text-anchor="end">BLAST RADIUS: CONTAINED</text>
          </g>
          <g id="planLayer" filter="url(#inkRough)"></g>
        </svg>
        <canvas id="planFX" class="plan-fx" aria-hidden="true"></canvas>
        <div class="sheet-loading" id="sheetLoading" role="status" aria-live="polite">
          <div class="load-plate">
            <div class="load-kicker">Tributary · Site Plan 001</div>
            <div class="load-title">Surveying site</div>
            <div class="load-rule"><span></span></div>
            <div class="load-sub">Awaiting first feed — claims · confluence · trunk</div>
          </div>
        </div>
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
  var fx = { ctx: null, w: 0, h: 0, dpr: 1, mode: null, t: 0, dur: 0, cb: null, blobs: [], raf: null, last: 0 };
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
    if (fx.mode === 'blot') drawBlot(dt);
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
      el.addEventListener('mouseenter', function () { flow.hoverTask = el.getAttribute('data-task'); });
      el.addEventListener('mouseleave', function () { flow.hoverTask = null; });
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
  var CONFLUENCE = { x: 600, y: 400 };
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

    var fd = { claims: [], waitlist: [], rapids: [], trunk: makePath(sampleCubic([CONFLUENCE.x, CONFLUENCE.y], [830, 470], [1010, 560], [1150, 640], 72)), confluence: CONFLUENCE, outflow: null, merges: merges, trunkRed: trunkRed, tasks: tasks.map(function (t, i) { return { id: t.id, status: t.status, agentId: t.agentId, idx: i + 1 }; }) };
    var op = pointAt(fd.trunk, fd.trunk.len - 24);
    fd.outflow = { x: op.x, y: op.y };

    claims.slice(0, 6).forEach(function (c, i) {
      var color = colorFor(c.agentId, i);
      var ax = 170 + (i % 3) * 310, ay = 120 + Math.floor(i / 3) * 95;
      var files = (c.files && c.files.length) || 0;
      fd.claims.push({ agentId: c.agentId, color: color, files: files, endX: CONFLUENCE.x, anchor: { x: ax, y: ay }, path: makePath(sampleCubic([ax, ay], [ax + (CONFLUENCE.x - ax) * 0.35, ay + (CONFLUENCE.y - ay) * 0.15], [ax + (CONFLUENCE.x - ax) * 0.7, ay + (CONFLUENCE.y - ay) * 0.62], [CONFLUENCE.x, CONFLUENCE.y], 44)) });
    });
    fd.claimsMore = Math.max(0, claims.length - 6);
    queued.slice(0, YARD_CAP).forEach(function (w, i) {
      var p = yardPos(i);
      fd.waitlist.push({ agentId: w.agentId, files: (w.files && w.files.length) || 0, anchor: { x: p.x, y: p.y } });
    });
    fd.stagedMore = Math.max(0, queued.length - YARD_CAP);

    var inflight = tasks.filter(function (t) { return ['landed','rejected','failed'].indexOf(t.status) === -1; });
    var rapidsActive = Math.min(rapids + inflight.filter(function (t) { return t.status === 'resolving' || t.status === 'merging'; }).length, 5);
    for (var r = 0; r < rapidsActive; r++) {
      var pt = pointAt(fd.trunk, fd.trunk.len * (0.24 + r * 0.13));
      fd.rapids.push({ x: pt.x, y: pt.y - 40 - (r % 2) * 16 });
    }

    var structKey = claims.map(function (c) { return c.agentId; }).join(',') + '|' +
      queued.map(function (w) { return w.agentId; }).join(',') + '|' + merges + '|' + rapids + '|' + (trunkRed ? 'red' : 'green');
    if (structKey !== structSig) {
      structSig = structKey;
      var fresh = {};
      var nextIds = {};
      claims.forEach(function (c) { fresh[c.agentId] = !prevClaimIds[c.agentId]; nextIds[c.agentId] = true; });
      prevClaimIds = nextIds;
      drawPlanStatic(fd, fresh);
    }
    $('sheetCap').textContent = (!claims.length && !queued.length && !merges)
      ? 'The site is quiet — no changes in flight'
      : (claims.length + ' in flight · ' + queued.length + ' staged · ' + merges + ' landed' + (rapids ? ' · ' + rapids + ' rapids' : ''));

    flowSetState(fd);
  };

  // ---- tracer watershed -----------------------------------------------------
  // Living layer of the center stage, drawn in plain Canvas 2D over the static
  // SVG underlay: comet tracers run down claimed channels (tracery + steering,
  // after three-particles / procedural-snake), CP-01 behaves like a serial
  // canal lock (admit → fill → release, after Floaty's gate ideas), and landed
  // merges deposit rings that drift downstream and fade with age. No external
  // renderer: the fallback is the SVG sheet itself, which stays complete.
  var CHAMBER = { x: CONFLUENCE.x, y: CONFLUENCE.y, r: 40 };
  var APPROACH = makePath(sampleCubic([260, 460], [370, 470], [480, 440], [567, 422], 40));
  var TAU = Math.PI * 2;
  var YARD = { x: 62, y: 292, w: 178, cols: 3, cell: 27, head: 40, box: 14 };
  var yardPos = function (i) {
    return {
      x: YARD.x + 16 + (i % YARD.cols) * YARD.cell,
      y: YARD.y + YARD.head + Math.floor(i / YARD.cols) * YARD.cell
    };
  };
  var YARD_ROWS = 4;
  var YARD_CAP = YARD.cols * YARD_ROWS;
  var YARD_H = YARD.head + YARD_ROWS * YARD.cell + 10;

  var flow = {
    data: null, prevStatus: {}, prevMerges: -1,
    tracers: {}, rings: [], bursts: [],
    gate: { up: 0, dn: 0, fill: 0 }, chamberColor: '#9a6a1f',
    hover: null, hoverTask: null, view: null,
    time: 0, raf: null, last: 0, w: 0, h: 0, dpr: 1
  };

  var spawnBurst = function (x, y, n) {
    for (var i = 0; i < n; i++) {
      flow.bursts.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 130, vy: (Math.random() - 0.5) * 100 - 20,
        life: 1, decay: 1.1 + Math.random() * 0.9, size: 2 + Math.random() * 2.6
      });
    }
  };

  var flowSetState = function (fd) {
    flow.data = fd;
    var m = fd.merges || 0;
    if (flow.prevMerges < 0) {
      for (var i = 0; i < Math.min(m, 8); i++) {
        flow.rings.push({ u: 0.12 + i * 0.1, age: 3 + i * 5, rev: m - i });
      }
    } else if (m > flow.prevMerges) {
      for (var j = flow.prevMerges + 1; j <= m; j++) {
        flow.rings.push({ u: 0.03, age: 0, rev: j });
      }
      if (flow.rings.length > 14) flow.rings.splice(0, flow.rings.length - 14);
    } else if (m < flow.prevMerges) {
      flow.rings = [];
    }
    flow.prevMerges = m;

    var seen = {};
    (fd.tasks || []).forEach(function (t) {
      seen[t.id] = true;
      var prev = flow.prevStatus[t.id];
      var term = ['landed', 'rejected', 'failed'].indexOf(t.status) !== -1;
      if (prev && term && prev !== t.status) {
        if (t.status === 'rejected' || t.status === 'failed') {
          var rp = (fd.rapids && fd.rapids.length) ? fd.rapids[0] : CHAMBER;
          spawnBurst(rp.x, rp.y - 14, 16);
        }
        var tr = flow.tracers[t.id];
        if (tr) tr.dying = 0.001;
      }
      flow.prevStatus[t.id] = t.status;
    });
    Object.keys(flow.prevStatus).forEach(function (id) {
      if (!seen[id]) delete flow.prevStatus[id];
    });
  };

  var claimFor = function (agentId) {
    var d = flow.data;
    if (!d) return null;
    for (var i = 0; i < d.claims.length; i++) {
      if (d.claims[i].agentId === agentId) return d.claims[i];
    }
    return null;
  };
  var ensureTracer = function (id) {
    var tr = flow.tracers[id];
    if (!tr) {
      tr = { id: id, dist: Math.random() * 36, ang: Math.random() * TAU, alpha: 0, dying: 0, kind: null, color: '#2c5f8a', path: null, speed: 90 };
      flow.tracers[id] = tr;
    }
    return tr;
  };

  var stepFlow = function (dt) {
    var d = flow.data;
    flow.time += dt;
    if (!d || !d.trunk) return;
    var tasks = d.tasks || [];
    var queued = [], chamber = null, exiting = null, patrolling = [];
    tasks.forEach(function (t) {
      if (['landed', 'rejected', 'failed'].indexOf(t.status) !== -1) return;
      if (t.status === 'queued') queued.push(t);
      else if (t.status === 'resolving') chamber = chamber || t;
      else if (t.status === 'merging') exiting = exiting || t;
      else patrolling.push(t);
    });

    var head = queued[0] || null;
    var headTr = head ? ensureTracer(head.id) : null;
    var headIn = !!(headTr && headTr.dist >= APPROACH.len - 6);
    var occupant = chamber || (headIn ? head : null);
    var upT = (queued.length && !occupant && !exiting) ? 1 : 0;
    var dnT = exiting ? 1 : 0;

    patrolling.forEach(function (t) {
      var tr = ensureTracer(t.id);
      var c = claimFor(t.agentId);
      tr.kind = 'patrol';
      tr.path = c ? c.path : APPROACH;
      tr.color = c ? c.color : '#2c5f8a';
      tr.speed = t.status === 'planning' ? 55 : t.status === 'claiming' ? 85 : 115;
      tr.dist += tr.speed * dt;
      if (tr.dist > tr.path.len) tr.dist = 0;
      tr.alpha += (1 - tr.alpha) * Math.min(1, dt * 3);
    });

    var line = queued.filter(function (t) { return t !== occupant; });
    line.forEach(function (t, j) {
      var tr = ensureTracer(t.id);
      tr.kind = 'hold';
      tr.color = '#9a6a1f';
      tr.path = APPROACH;
      var target = APPROACH.len * (1 - 0.06 - j * 0.13);
      if (target < 16) target = 16;
      tr.dist += (target - tr.dist) * Math.min(1, dt * 2.2);
      tr.alpha += (0.95 - tr.alpha) * Math.min(1, dt * 3);
    });

    if (occupant) {
      var tro = ensureTracer(occupant.id);
      tro.kind = 'swirl';
      tro.color = occupant === chamber ? '#c8402a' : '#9a6a1f';
      tro.ang += dt * (occupant === chamber ? 2.1 : 1.2);
      tro.alpha += (1 - tro.alpha) * Math.min(1, dt * 3);
      flow.chamberColor = occupant === chamber ? '#c8402a' : '#9a6a1f';
    }
    if (exiting) {
      var tre = ensureTracer(exiting.id);
      if (tre.kind !== 'run') { tre.kind = 'run'; tre.dist = 0; }
      tre.color = '#2f6b4f';
      tre.path = d.trunk;
      tre.dist += 245 * dt;
      tre.alpha += (1 - tre.alpha) * Math.min(1, dt * 3);
      if (tre.dist > d.trunk.len) tre.dying = 0.001;
      flow.chamberColor = '#2f6b4f';
    }

    var g = flow.gate;
    g.up += (upT - g.up) * Math.min(1, dt * 2.4);
    g.dn += (dnT - g.dn) * Math.min(1, dt * 2.4);
    var fillT = (occupant || exiting) ? 1 : 0;
    g.fill += (fillT - g.fill) * Math.min(1, dt * 1.8);

    for (var ri = flow.rings.length - 1; ri >= 0; ri--) {
      var ring = flow.rings[ri];
      ring.u += dt * 0.012;
      ring.age += dt;
      if (ring.u > 0.98 || ring.age > 46) flow.rings.splice(ri, 1);
    }
    for (var bi = flow.bursts.length - 1; bi >= 0; bi--) {
      var b = flow.bursts[bi];
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.vx *= 0.985; b.vy = b.vy * 0.985 - 10 * dt;
      b.life -= b.decay * dt;
      if (b.life <= 0) flow.bursts.splice(bi, 1);
    }

    var live = {};
    tasks.forEach(function (t) { live[t.id] = true; });
    Object.keys(flow.tracers).forEach(function (id) {
      var tr = flow.tracers[id];
      if (tr.dying) {
        tr.dying += dt;
        tr.alpha -= dt * 1.6;
        if (tr.alpha <= 0 || tr.dying > 1.6) delete flow.tracers[id];
        return;
      }
      if (!live[id]) delete flow.tracers[id];
    });
  };

  var tracerPos = function (tr) {
    if (tr.kind === 'swirl') {
      return { x: CHAMBER.x + Math.cos(tr.ang) * 16, y: CHAMBER.y + Math.sin(tr.ang) * 12 };
    }
    var path = tr.path || APPROACH;
    return pointAt(path, Math.max(0, Math.min(path.len, tr.dist)));
  };
  var pickFlow = function (mx, my) {
    var d = flow.data;
    if (!d || !d.trunk) return null;
    var best = null, bestD = 14;
    Object.keys(flow.tracers).forEach(function (id) {
      var tr = flow.tracers[id];
      if (tr.alpha < 0.15) return;
      var pos = tracerPos(tr);
      var dd = Math.hypot(pos.x - mx, pos.y - my);
      if (dd < bestD) { bestD = dd; best = { kind: 'tracer', id: id, x: pos.x, y: pos.y }; }
    });
    if (best) return best;
    for (var r = 0; r < flow.rings.length; r++) {
      var ring = flow.rings[r];
      var pt = pointAt(d.trunk, d.trunk.len * ring.u);
      if (Math.hypot(pt.x - mx, pt.y - my) < 11) return { kind: 'ring', x: pt.x, y: pt.y, rev: ring.rev };
    }
    var bd = 9, res = null;
    for (var w = 0; w < (d.waitlist || []).length; w++) {
      var a = d.waitlist[w].anchor;
      if (mx >= a.x - 4 && mx <= a.x + YARD.box + 4 && my >= a.y - 4 && my <= a.y + YARD.box + 4)
        return { kind: 'staged', x: a.x + YARD.box / 2, y: a.y + YARD.box / 2, agentId: d.waitlist[w].agentId, files: d.waitlist[w].files };
    }
    (d.claims || []).forEach(function (c) {
      for (var i = 0; i < c.path.pts.length; i += 3) {
        var p = c.path.pts[i];
        if (Math.hypot(p[0] - mx, p[1] - my) < bd) {
          bd = Math.hypot(p[0] - mx, p[1] - my);
          res = { kind: 'claim', x: mx, y: my, agentId: c.agentId, files: c.files };
        }
      }
    });
    return res;
  };
  var traceLine = function (ctx, path, style, width, dash, offset, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.lineDashOffset = offset;
    ctx.beginPath();
    ctx.moveTo(path.pts[0][0], path.pts[0][1]);
    for (var i = 1; i < path.pts.length; i++) ctx.lineTo(path.pts[i][0], path.pts[i][1]);
    ctx.stroke();
    ctx.restore();
  };
  var drawGate = function (ctx, x, y, a, rot) {
    var ang = a + rot;
    var nx = Math.cos(ang) * 14, ny = Math.sin(ang) * 14;
    ctx.save();
    ctx.strokeStyle = '#10233f';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.moveTo(x - nx, y - ny);
    ctx.lineTo(x + nx, y + ny);
    ctx.stroke();
    ctx.fillStyle = '#10233f';
    ctx.beginPath();
    ctx.arc(x + nx, y + ny, 2.6, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  var drawFlow = function () {
    var cvs = $('planFX');
    if (!cvs) return;
    var d = flow.data;
    var ctx = cvs.getContext('2d');
    resizePlanFX();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    if (!d || !d.trunk) return;
    var w = flow.w || 1, h = flow.h || 1;
    var scale = Math.min(w / W, h / H);
    var ox = (w - W * scale) / 2, oy = (h - H * scale) / 2;
    flow.view = { scale: scale, ox: ox, oy: oy };
    ctx.setTransform(flow.dpr * scale, 0, 0, flow.dpr * scale, flow.dpr * ox, flow.dpr * oy);
    ctx.lineCap = 'round';

    var dashOff = -flow.time * 70;
    (d.claims || []).forEach(function (c) {
      traceLine(ctx, c.path, c.color, 1.6, [2, 14], dashOff * 0.8, 0.55);
    });
    if ((d.waitlist || []).length) {
      ctx.save();
      ctx.strokeStyle = '#9a6a1f';
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = 0.55;
      ctx.setLineDash([2, 9]);
      ctx.lineDashOffset = dashOff * 0.35;
      ctx.beginPath();
      ctx.moveTo(YARD.x + YARD.w, YARD.y + YARD_H - 14);
      ctx.bezierCurveTo(YARD.x + YARD.w + 40, YARD.y + YARD_H + 6, 210, 452, 258, 459);
      ctx.stroke();
      ctx.restore();
      var head = d.waitlist[0].anchor;
      ctx.globalAlpha = 0.2 + 0.22 * (0.5 + 0.5 * Math.sin(flow.time * 2.2));
      ctx.fillStyle = '#9a6a1f';
      ctx.fillRect(head.x, head.y, YARD.box, YARD.box);
      ctx.globalAlpha = 1;
    }
    traceLine(ctx, APPROACH, '#10233f', 1.4, [4, 10], dashOff, 0.45);
    var trunkColor = d.trunkRed ? '#c8402a' : '#2c5f8a';
    traceLine(ctx, d.trunk, trunkColor, 2.2, [5, 18], dashOff * 1.6, 0.5);

    flow.rings.forEach(function (ring) {
      var pt = pointAt(d.trunk, d.trunk.len * ring.u);
      var a = Math.max(0, 1 - ring.age / 46) * Math.min(1, ring.u / 0.06) * Math.min(1, (1 - ring.u) / 0.04);
      if (a <= 0.02) return;
      ctx.globalAlpha = a * 0.85;
      ctx.strokeStyle = '#2f6b4f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = '#2f6b4f';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2, 0, TAU);
      ctx.fill();
      if (ring.age < 9) {
        ctx.globalAlpha = Math.min(1, (9 - ring.age) / 3) * a;
        ctx.font = '600 11px "IBM Plex Mono", ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('REV ' + ring.rev, pt.x + 11, pt.y - 5);
      }
    });
    ctx.globalAlpha = 1;

    var g = flow.gate;
    if (g.fill > 0.02) {
      ctx.strokeStyle = flow.chamberColor;
      ctx.lineWidth = 5;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(CHAMBER.x, CHAMBER.y, 32, -Math.PI / 2, -Math.PI / 2 + TAU * g.fill);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    var gateU = pointAt(APPROACH, APPROACH.len - 2);
    drawGate(ctx, gateU.x, gateU.y, gateU.a + Math.PI / 2, -g.up * 1.35);
    var gateD = pointAt(d.trunk, 32);
    drawGate(ctx, gateD.x, gateD.y, gateD.a + Math.PI / 2, g.dn * 1.35);

    Object.keys(flow.tracers).forEach(function (id) {
      var tr = flow.tracers[id];
      if (tr.alpha <= 0.02) return;
      var path = tr.path || APPROACH;
      var pos = tracerPos(tr);
      var hot = (flow.hover && flow.hover.kind === 'tracer' && flow.hover.id === id) || flow.hoverTask === id;
      if (hot) {
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#10233f';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 3]);
        ctx.lineDashOffset = -flow.time * 20;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 12, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (tr.kind === 'patrol' || tr.kind === 'run') {
        for (var k = 6; k >= 1; k--) {
          var td = tr.dist - k * 9;
          if (td < 4) continue;
          var tp = pointAt(path, td);
          ctx.globalAlpha = tr.alpha * (0.5 - k * 0.07);
          ctx.fillStyle = tr.color;
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, Math.max(0.6, 3.4 - k * 0.45), 0, TAU);
          ctx.fill();
        }
      }
      ctx.globalAlpha = tr.alpha;
      if (tr.kind === 'hold') {
        var bob = Math.sin(flow.time * 1.8 + tr.dist) * 2.2;
        ctx.fillStyle = '#f5efe2';
        ctx.strokeStyle = tr.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y + bob, 5, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = tr.color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y + bob, 1.8, 0, TAU);
        ctx.fill();
      } else if (tr.kind === 'swirl') {
        ctx.strokeStyle = tr.color;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = tr.alpha * (0.45 + 0.45 * Math.abs(Math.sin(flow.time * 5)));
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 9 + Math.sin(flow.time * 3) * 2, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = tr.alpha;
        ctx.fillStyle = tr.color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3.4, 0, TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = tr.color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3.8, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = tr.alpha * 0.85;
        ctx.fillStyle = '#f5efe2';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 1.5, 0, TAU);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;

    (d.rapids || []).forEach(function (rp, i) {
      ctx.strokeStyle = '#c8402a';
      ctx.lineWidth = 1.6;
      for (var s2 = 0; s2 < 3; s2++) {
        var ph = flow.time * (2.4 + s2 * 0.7) + i * 2.1 + s2;
        ctx.globalAlpha = 0.25 + 0.3 * Math.abs(Math.sin(ph));
        ctx.beginPath();
        ctx.arc(rp.x + Math.cos(ph * 1.7) * 10, rp.y + Math.sin(ph) * 6, 3.2 + 2 * Math.sin(ph * 2.3), 0, TAU);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#c8402a';
    flow.bursts.forEach(function (b) {
      ctx.globalAlpha = Math.max(0, b.life) * 0.85;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size * Math.max(0.3, b.life), 0, TAU);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    var hv = flow.hover;
    if (hv) {
      var label = '';
      if (hv.kind === 'tracer') {
        var tk = (d.tasks || []).filter(function (x) { return x.id === hv.id; })[0];
        if (tk) label = '#' + tk.idx + ' · ' + tk.status + ' · ' + tk.agentId;
      } else if (hv.kind === 'ring') {
        label = 'REV ' + hv.rev + ' · landed revision';
      } else if (hv.kind === 'claim') {
        label = hv.agentId + (hv.files ? ' · ' + hv.files + ' files claimed' : ' · claim');
      } else if (hv.kind === 'staged') {
        label = hv.agentId + ' · staged' + (hv.files ? ' · ' + hv.files + 'f' : '');
      }
      if (label) {
        ctx.font = '600 12px "IBM Plex Mono", ui-monospace, monospace';
        var tw = ctx.measureText(label).width;
        var lx = Math.min(W - tw - 26, hv.x + 14), ly = Math.max(24, hv.y - 12);
        ctx.fillStyle = 'rgba(245,239,226,0.95)';
        ctx.strokeStyle = '#10233f';
        ctx.lineWidth = 1;
        ctx.fillRect(lx - 6, ly - 13, tw + 12, 20);
        ctx.strokeRect(lx - 6, ly - 13, tw + 12, 20);
        ctx.fillStyle = '#10233f';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(label, lx, ly + 2);
      }
    }
  };

  var resizePlanFX = function () {
    var cvs = $('planFX');
    if (!cvs) return;
    var w = cvs.clientWidth, h = cvs.clientHeight;
    if (!w || !h) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w !== flow.w || h !== flow.h || dpr !== flow.dpr) {
      flow.w = w; flow.h = h; flow.dpr = dpr;
      cvs.width = Math.max(1, Math.round(w * dpr));
      cvs.height = Math.max(1, Math.round(h * dpr));
    }
  };
  var framePlanFX = function (ts) {
    var dt = Math.min(0.05, (ts - flow.last) / 1000 || 0.016);
    flow.last = ts;
    stepFlow(dt);
    drawFlow();
    flow.raf = requestAnimationFrame(framePlanFX);
  };
  var syncLedgerHL = function () {
    var host = $('tasks');
    if (!host) return;
    var want = flow.hover && flow.hover.kind === 'tracer' ? flow.hover.id : null;
    host.querySelectorAll('.spec-row').forEach(function (el) {
      var on = el.getAttribute('data-task') === want;
      el.classList.toggle('hl', on);
      if (on) el.scrollIntoView({ block: 'nearest' });
    });
  };
  var initPlanFX = function () {
    var cvs = $('planFX');
    if (!cvs || !cvs.getContext || reducedMotion()) return;
    resizePlanFX();
    if (window.ResizeObserver) new ResizeObserver(resizePlanFX).observe(cvs);
    window.addEventListener('resize', resizePlanFX);
    var toView = function (ev) {
      if (!flow.view) return null;
      var rect = cvs.getBoundingClientRect();
      return {
        x: (ev.clientX - rect.left - flow.view.ox) / flow.view.scale,
        y: (ev.clientY - rect.top - flow.view.oy) / flow.view.scale
      };
    };
    cvs.addEventListener('mousemove', function (ev) {
      var m = toView(ev);
      flow.hover = m ? pickFlow(m.x, m.y) : null;
      cvs.style.cursor = flow.hover ? 'pointer' : '';
      syncLedgerHL();
    });
    cvs.addEventListener('mouseleave', function () {
      flow.hover = null;
      cvs.style.cursor = '';
      syncLedgerHL();
    });
    cvs.addEventListener('click', function (ev) {
      if (flow.hover && flow.hover.kind === 'tracer') {
        inkBlot(ev.clientX, ev.clientY, 'rgba(44,95,138,0.45)');
        openDrawer(flow.hover.id);
      }
    });
    flow.last = performance.now();
    flow.raf = requestAnimationFrame(framePlanFX);
  };

  // ---- static sheet underlay --------------------------------------------------
  var structSig = null;
  var prevClaimIds = {};
  var svgPathD = function (path) {
    var s = 'M' + path.pts[0][0].toFixed(1) + ',' + path.pts[0][1].toFixed(1);
    for (var i = 1; i < path.pts.length; i++) {
      s += ' L' + path.pts[i][0].toFixed(1) + ',' + path.pts[i][1].toFixed(1);
    }
    return s;
  };
  var gateBar = function (x, y, a) {
    var nx = Math.cos(a) * 14, ny = Math.sin(a) * 14;
    return '<path d="M' + (x - nx).toFixed(1) + ',' + (y - ny).toFixed(1) + ' L' + (x + nx).toFixed(1) + ',' + (y + ny).toFixed(1) +
      '" stroke="var(--ink3)" stroke-width="4" stroke-linecap="round" opacity="0.9"/>';
  };
  var drawPlanStatic = function (fd, fresh) {
    var layer = $('planLayer');
    if (!layer) return;
    var out = [];
    var trunkD = svgPathD(fd.trunk);
    var trunkW = 4.5 + Math.min(9, Math.log(1 + (fd.merges || 0)) * 2.4);
    var trunkStroke = fd.trunkRed ? 'var(--red)' : null;
    out.push('<path class="sp-channel-halo" stroke="' + (fd.trunkRed ? 'var(--red)' : 'var(--ink2)') + '" stroke-width="' + (trunkW + 9).toFixed(1) + '" d="' + trunkD + '"/>');
    out.push('<path class="sp-trunk' + (fd.trunkRed ? ' red' : '') + '" stroke-width="' + trunkW.toFixed(1) + '"' + (trunkStroke ? ' stroke="' + trunkStroke + '"' : '') + ' d="' + trunkD + '"/>');
    out.push('<path class="sp-trunk-core" d="' + trunkD + '"/>');

    if (reducedMotion()) {
      var ringCount = Math.min(8, fd.merges || 0);
      for (var ri = 0; ri < ringCount; ri++) {
        var rpt = pointAt(fd.trunk, fd.trunk.len * (0.12 + ri * 0.1));
        out.push('<circle cx="' + rpt.x.toFixed(1) + '" cy="' + rpt.y.toFixed(1) + '" r="8" fill="none" stroke="var(--green)" stroke-width="2" opacity="' + (0.85 - ri * 0.09).toFixed(2) + '"/>');
        out.push('<circle cx="' + rpt.x.toFixed(1) + '" cy="' + rpt.y.toFixed(1) + '" r="2" fill="var(--green)" opacity="' + (0.85 - ri * 0.09).toFixed(2) + '"/>');
      }
    }

    var tip = pointAt(fd.trunk, fd.trunk.len - 2);
    out.push('<path class="sp-arrow" transform="translate(' + tip.x.toFixed(1) + ',' + tip.y.toFixed(1) + ') rotate(' + (tip.a * 57.2958).toFixed(1) + ')" d="M-14,-7 L0,0 L-14,7"/>');

    fd.claims.forEach(function (c) {
      var grow = fresh[c.agentId] ? ' sp-grow' : '';
      var cd = svgPathD(c.path);
      out.push('<path class="sp-channel-halo' + grow + '" pathLength="100" stroke="' + c.color + '" stroke-width="9" d="' + cd + '"/>');
      out.push('<path class="sp-channel' + grow + '" pathLength="100" stroke="' + c.color + '" stroke-width="2.4" d="' + cd + '"/>');
      out.push('<rect x="' + (c.anchor.x - 8) + '" y="' + (c.anchor.y - 8) + '" width="16" height="16" fill="none" stroke="' + c.color + '" stroke-width="1.6"/>');
      out.push('<text class="sp-label" x="' + c.anchor.x + '" y="' + (c.anchor.y - 16) + '" text-anchor="middle" style="fill:' + c.color + '">' + esc(c.agentId) + (c.files ? ' · ' + c.files + 'f' : '') + '</text>');
    });

    out.push('<rect x="' + YARD.x + '" y="' + YARD.y + '" width="' + YARD.w + '" height="' + YARD_H + '" fill="none" stroke="var(--ink3)" stroke-width="1.4" opacity="0.75"/>');
    out.push('<rect x="' + (YARD.x + 4) + '" y="' + (YARD.y + 4) + '" width="' + (YARD.w - 8) + '" height="' + (YARD_H - 8) + '" fill="none" stroke="var(--ink3)" stroke-width="0.8" opacity="0.35"/>');
    out.push('<text class="sp-label strong" x="' + (YARD.x + 14) + '" y="' + (YARD.y + 22) + '" style="fill:var(--amber)">Staged · CP-01 queue</text>');
    if (fd.waitlist.length) {
      fd.waitlist.forEach(function (wt, i) {
        var p = wt.anchor;
        out.push('<rect x="' + p.x + '" y="' + p.y + '" width="' + YARD.box + '" height="' + YARD.box + '" fill="none" stroke="var(--amber)" stroke-width="1.6" opacity="' + (0.95 - i * 0.045).toFixed(2) + '"/>');
      });
      if (fd.stagedMore) {
        out.push('<text class="sp-label" x="' + (YARD.x + 14) + '" y="' + (YARD.y + YARD_H - 8) + '" style="fill:var(--amber)">+' + fd.stagedMore + ' more</text>');
      }
    } else {
      out.push('<text class="sp-label" x="' + (YARD.x + 14) + '" y="' + (YARD.y + YARD.head + 22) + '" style="fill:var(--amber)" opacity="0.5">No staged work</text>');
    }
    out.push('<path class="sp-staged" d="M' + (YARD.x + YARD.w) + ',' + (YARD.y + YARD_H - 14) + ' C' + (YARD.x + YARD.w + 40) + ',' + (YARD.y + YARD_H + 6) + ' ' + 210 + ',452 258,459"/>');

    if (fd.claimsMore) {
      out.push('<text class="sp-label" x="860" y="132" style="fill:var(--ink2)">+' + fd.claimsMore + ' more claims held</text>');
    }
    out.push('<path class="sp-pending" d="' + svgPathD(APPROACH) + '"/>');
    out.push('<circle class="sp-cp" cx="' + CHAMBER.x + '" cy="' + CHAMBER.y + '" r="40"/>');
    out.push('<circle class="sp-basin-inner" cx="' + CHAMBER.x + '" cy="' + CHAMBER.y + '" r="27"/>');
    var gateUS = pointAt(APPROACH, APPROACH.len - 2);
    out.push(gateBar(gateUS.x, gateUS.y, gateUS.a + Math.PI / 2));
    var gateDS = pointAt(fd.trunk, 32);
    out.push(gateBar(gateDS.x, gateDS.y, gateDS.a + Math.PI / 2));

    out.push('<text class="sp-label strong" x="' + CHAMBER.x + '" y="' + (CHAMBER.y - 56) + '" text-anchor="middle">CP-01 · Serial Lock</text>');
    out.push('<text class="sp-label" x="' + CHAMBER.x + '" y="' + (CHAMBER.y + 80) + '" text-anchor="middle" style="fill:var(--green)">Verified revisions only</text>');
    out.push('<text class="sp-label strong" x="' + (fd.outflow.x - 250) + '" y="' + (fd.outflow.y - 30) + '">As-built trunk</text>');

    if (fd.rapids.length) {
      fd.rapids.forEach(function (rp) {
        out.push('<path class="sp-cloud" d="M' + (rp.x - 16).toFixed(1) + ',' + rp.y.toFixed(1) + ' l 8,-8 l 8,8 l 8,-8"/>');
      });
      out.push('<text class="sp-label red" x="' + (fd.rapids[0].x + 6).toFixed(1) + '" y="' + (fd.rapids[0].y - 66).toFixed(1) + '">Rapids · residual conflicts</text>');
    }

    out.push('<g transform="translate(60,560)">' +
      '<text class="sp-label strong" x="0" y="0">Legend</text>' +
      '<rect x="0" y="12" width="12" height="12" fill="none" stroke="var(--ink3)" stroke-width="1.4"/>' +
      '<text class="sp-label" x="22" y="22">Parcel · agent claim</text>' +
      '<path d="M-4,42 L8,42" stroke="var(--ink2)" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="10" cy="42" r="4" fill="var(--ink2)"/>' +
      '<text class="sp-label" x="22" y="46">Comet · task in flight</text>' +
      '<circle cx="6" cy="66" r="4.5" fill="var(--paper)" stroke="var(--amber)" stroke-width="1.8"/>' +
      '<text class="sp-label" x="22" y="70">Buoy · queued at lock</text>' +
      '<circle cx="6" cy="90" r="6" fill="none" stroke="var(--green)" stroke-width="1.8"/>' +
      '<text class="sp-label" x="22" y="94">Ring · landed revision, fades with age</text>' +
      '<path d="M0,110 l 6,-7 l 6,7 l 6,-7" fill="none" stroke="var(--red)" stroke-width="1.6" stroke-linecap="round"/>' +
      '<text class="sp-label" x="22" y="118">Rapids · residual conflicts</text>' +
      '</g>');
    layer.innerHTML = out.join('');
  };


  // ---- state ---------------------------------------------------------------
  var sheetReady = false;
  var hideSheetLoading = function () {
    if (sheetReady) return;
    sheetReady = true;
    var el = $('sheetLoading');
    if (el) el.hidden = true;
  };
  var lastMerges = null;
  var applyState = function (s) {
    hideSheetLoading();
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
        renderReplayFrame();
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
  if (location.search.indexOf('replay') !== -1) startReplay(); else startStream();
})();
</script>
</body>
</html>`;
