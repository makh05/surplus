// Surplus widget for Scriptable (iPhone).
// Shows your next meal, gym or rest, and bedtime, worked out from your weekly schedule
// the same way the Surplus app does it.
//
// Your weight (optional): long-press the widget → Edit Widget → Parameter → type it, e.g. 51.7
// When your timetable changes, edit SCHED below (Tashkent time, same as the app's Week tab).

const SCHED = {
  1: {shift:["00:00","07:30"], uni:["08:00","11:00"], gym:false},  // Monday
  2: {shift:["02:00","10:00"], uni:["15:00","18:00"], gym:true},   // Tuesday
  3: {shift:null,              uni:["15:00","18:00"], gym:false},  // Wednesday
  4: {shift:["02:00","10:00"], uni:["11:00","12:00"], gym:true},   // Thursday
  5: {shift:["02:00","10:00"], uni:null,              gym:false},  // Friday
  6: {shift:["02:00","10:00"], uni:null,              gym:true},   // Saturday
  0: {shift:["02:00","10:00"], uni:null,              gym:false}   // Sunday
};
const GOAL_KG = 65;
const MOTTO = "Do it for her";

// ENGINE START (same rules as the app: bed soon after the last thing, wake an hour before the first,
// at most 9 h of sleep, a nap in gaps of 3 h or more, 6 meals spread over the hours you're awake)
const MAX_SLEEP = 9*60, GYM_LEN = 60, NAP_GAP = 3*60;
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const pad = n => String(n).padStart(2, "0");
const toMin = s => { const [h, m] = s.split(":").map(Number); return h*60 + m; };
const hhmm = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return pad(Math.floor(m/60)) + ":" + pad(m % 60); };
const round15 = m => Math.round(m / 15) * 15;
const hrs = m => (Math.round(m / 30) / 2).toString().replace(/\.0$/, "") + " h";
const midnight = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => { const x = midnight(d); x.setDate(x.getDate() + n); return x; };
const schedOf = d => SCHED[d.getDay()];

function blocksOf(d){
  const s = schedOf(d), out = [];
  if (s.shift) { let a = toMin(s.shift[0]), b = toMin(s.shift[1]); if (a >= 18*60) a -= 1440; if (b <= a) b += 1440; out.push({kind:"shift", a, b}); }
  if (s.uni) { const a = toMin(s.uni[0]); let b = toMin(s.uni[1]); if (b <= a) b += 1440; out.push({kind:"uni", a, b}); }
  if (s.gym) {
    const sh = out.find(o => o.kind === "shift"), un = out.find(o => o.kind === "uni");
    let g = sh ? sh.b + 15 : un ? un.b + 15 : 17*60;
    if (un && g < un.b && g + GYM_LEN > un.a - 30) g = un.b + 15;
    out.push({kind:"gym", a:g, b:g + GYM_LEN});
  }
  return out.sort((x, y) => x.a - y.a);
}
function bedOf(d){
  const bl = blocksOf(d); if (!bl.length) return 22*60;
  const last = bl.reduce((a, b) => b.b > a.b ? b : a);
  return last.b + (last.kind === "gym" ? 60 : 30);
}
function wakeOf(d){
  const bl = blocksOf(d), first = bl.length ? bl[0].a : 9*60;
  return Math.min(first - 60, bedOf(addDays(d, -1)) - 1440 + MAX_SLEEP);
}
function planOf(d){
  const bl = blocksOf(d), wake = wakeOf(d), bed = bedOf(d), nextWake = wakeOf(addDays(d, 1)) + 1440;
  const shift = bl.find(b => b.kind === "shift"), gym = bl.find(b => b.kind === "gym"), unis = bl.filter(b => b.kind === "uni");
  const naps = [];
  for (let i = 0; i + 1 < bl.length; i++) {
    const a = bl[i].b + 45, b = bl[i+1].a - 60;
    if (bl[i+1].a - bl[i].b >= NAP_GAP && b - a >= 90) naps.push({kind:"nap", a, b});
  }
  const napIn = (t1, t2) => naps.reduce((s, n) => s + Math.max(0, Math.min(t2, n.b) - Math.max(t1, n.a)), 0);
  const awakeMid = (t1, t2) => {
    let half = (t2 - t1 - napIn(t1, t2)) / 2, t = t1;
    for (const n of naps.filter(n => n.a >= t1 && n.b <= t2).sort((x, y) => x.a - y.a)) {
      if (n.a - t >= half) break;
      half -= n.a - t; t = n.b;
    }
    return t + half;
  };
  const pts = [{id:"bk", t:wake + 15}];
  const fill = ["lu","di","sn"];
  if (gym) {
    pts.push({id:"pre", t:gym.a - 45}, {id:"shake", t:gym.b});
    if (bed - gym.b > 150) { pts.push({id:"di", t:bed - 45}); fill.splice(fill.indexOf("di"), 1); }
  } else {
    pts.push({id:"pre", t:bed - 45});
    if (shift && shift.b < bed - 120) pts.push({id:"shake", t:shift.b + 5}); else fill.push("shake");
  }
  if (naps.length && !gym) { pts.push({id:"sn", t:naps[0].b + 15}); fill.splice(fill.indexOf("sn"), 1); }
  for (const id of fill) {
    pts.sort((x, y) => x.t - y.t);
    let bi = 0, bg = -1;
    for (let i = 0; i + 1 < pts.length; i++) { const g = pts[i+1].t - pts[i].t - napIn(pts[i].t, pts[i+1].t); if (g > bg) { bg = g; bi = i; } }
    pts.push({id, t:awakeMid(pts[bi].t, pts[bi+1].t), free:true});
  }
  pts.sort((x, y) => x.t - y.t);
  for (let it = 0; it < 12; it++) for (let i = 1; i + 1 < pts.length; i++) if (pts[i].free) pts[i].t = awakeMid(pts[i-1].t, pts[i+1].t);
  for (const p of pts) {
    for (const u of unis) if (p.t > u.a && p.t < u.b) p.t = (p.t - u.a < u.b - p.t) ? u.a - 10 : u.b + 5;
    for (const n of naps) if (p.t > n.a && p.t < n.b) p.t = n.b + 10;
    p.t = round15(p.t);
  }
  pts.sort((x, y) => x.t - y.t);
  const within = (t, b) => t >= b.a && t <= b.b;
  const ctx = t => shift && within(t, shift) ? "at work"
    : unis.some(u => u.a - t > 0 && u.a - t <= 90) ? "before class"
    : unis.some(u => t - u.b >= 0 && t - u.b <= 60) ? "after class"
    : naps.some(n => t - n.b >= 0 && t - n.b <= 60) ? "after nap" : "";
  const BASE = {bk:"Breakfast", lu:"Main meal", di:"Second meal", sn:"Snack",
    pre: gym ? "Pre-gym snack" : "Light meal, then bed", shake: gym ? "Shake after gym" : "Shake"};
  const slots = pts.map(p => {
    const c = ["lu","di","sn","shake"].includes(p.id) && !(p.id === "shake" && gym) ? ctx(p.t) : "";
    return [p.id, p.t, BASE[p.id] + (c ? " · " + c : "")];
  });
  return {wake, bed, nextWake, sleepLen: nextWake - bed, naps, blocks: bl, slots};
}
// a day is named after its night shift; after 19:00 you're already on the next one
const cycleDay = now => now.getHours() >= 19 ? addDays(now, 1) : midnight(now);
const relMin = (now, day) => (now - day) / 60000;

function summary(now){
  const day = cycleDay(now), P = planOf(day), t = relMin(now, day);
  let next = P.slots.find(s => s[1] >= t - 10), nextDay = day;
  if (!next) { nextDay = addDays(day, 1); next = planOf(nextDay).slots[0]; }
  const mealAt = new Date(nextDay.getTime() + next[1] * 60000);
  const gym = P.blocks.find(b => b.kind === "gym");
  let gymTitle, gymSub;
  if (gym && t < gym.b) {
    gymTitle = "Gym " + hhmm(gym.a);
    gymSub = "today, after " + (P.blocks.some(b => b.kind === "uni" && b.b <= gym.a) ? "class" : "your shift");
  } else {
    let nd = null; for (let i = 1; i <= 7 && !nd; i++) { const x = addDays(day, i); if (schedOf(x).gym) nd = x; }
    gymTitle = gym ? "Trained today" : "Rest day";
    gymSub = nd ? "next gym " + DOW[nd.getDay()] + " " + hhmm(planOf(nd).blocks.find(b => b.kind === "gym").a) : "";
  }
  return {
    day, P, t,
    meal: {time: hhmm(next[1]), label: next[2], at: mealAt, now: next[1] <= t && nextDay === day},
    gymTitle, gymSub,
    bed: hhmm(P.bed), wake: hhmm(P.nextWake), sleep: hrs(P.sleepLen), asleep: t >= P.bed
  };
}
// ENGINE END

// ---------- drawing ----------
const C = {
  bg: new Color("#050506"), ink: new Color("#F3F3F5"), muted: new Color("#8D8D96"), dim: new Color("#26262B"),
  red: new Color("#FF3B30"), lime: new Color("#DDF46A"), peri: new Color("#A9ACFF")
};
const mono = (s, w = "medium") => w === "bold" ? Font.boldMonospacedSystemFont(s) : Font.mediumMonospacedSystemFont(s);

// the logo: red plus in lit dots, unlit dots faintly visible
function dotPlus(size){
  const dc = new DrawContext(); dc.size = new Size(size, size); dc.opaque = false; dc.respectScreenScale = true;
  const step = size / 11;
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const on = r >= 1 && r <= 7 && c >= 1 && c <= 7 && ((c >= 3 && c <= 5) || (r >= 3 && r <= 5));
    const rad = step * (on ? 0.43 : 0.23), cx = (c + 1) * step, cy = (r + 1) * step;
    dc.setFillColor(on ? C.red : C.dim);
    dc.fillEllipse(new Rect(cx - rad, cy - rad, rad * 2, rad * 2));
  }
  return dc.getImage();
}
// dot-matrix digits, like the numbers in the app
const GLYPH = {
  "0":["01110","10001","10011","10101","11001","10001","01110"], "1":["00100","01100","00100","00100","00100","00100","01110"],
  "2":["01110","10001","00001","00010","00100","01000","11111"], "3":["11110","00001","00001","01110","00001","00001","11110"],
  "4":["00010","00110","01010","10010","11111","00010","00010"], "5":["11111","10000","11110","00001","00001","10001","01110"],
  "6":["00110","01000","10000","11110","10001","10001","01110"], "7":["11111","00001","00010","00100","01000","01000","01000"],
  "8":["01110","10001","10001","01110","10001","10001","01110"], "9":["01110","10001","10001","01111","00001","00010","01100"],
  ":":["0","0","1","0","1","0","0"], ".":["0","0","0","0","0","0","1"]
};
function dotText(str, cell, color){
  const cols = [...str].reduce((n, ch, i) => n + GLYPH[ch][0].length + (i ? 1 : 0), 0);
  const dc = new DrawContext(); dc.size = new Size(cols * cell, 7 * cell); dc.opaque = false; dc.respectScreenScale = true;
  dc.setFillColor(color);
  let x = 0;
  [...str].forEach((ch, i) => {
    if (i) x += cell;
    const g = GLYPH[ch];
    g.forEach((row, r) => [...row].forEach((bit, c) => {
      if (bit === "1") dc.fillEllipse(new Rect(x + c * cell + cell * .1, r * cell + cell * .1, cell * .8, cell * .8));
    }));
    x += g[0].length * cell;
  });
  return {img: dc.getImage(), w: cols * cell, h: 7 * cell};
}
function addText(stack, s, font, color, lines = 1){
  const t = stack.addText(s); t.font = font; t.textColor = color; t.lineLimit = lines; t.minimumScaleFactor = 0.7; return t;
}
function addDots(stack, s, cell, color){
  const d = dotText(s, cell, color), im = stack.addImage(d.img); im.imageSize = new Size(d.w, d.h); return im;
}
function header(w, small){
  const h = w.addStack(); h.centerAlignContent();
  const logo = h.addImage(dotPlus(60)); logo.imageSize = new Size(small ? 20 : 22, small ? 20 : 22);
  h.addSpacer(7);
  const v = h.addStack(); v.layoutVertically();
  addText(v, "SURPLUS", mono(small ? 10 : 11, "bold"), C.ink);
  addText(v, MOTTO.toUpperCase(), mono(small ? 7.5 : 8), C.muted);
  return h;
}

// ---------- widget ----------
const S = summary(new Date());
const kg = parseFloat(String(args.widgetParameter || "").replace(",", "."));
const toGo = kg > 0 ? Math.max(0, GOAL_KG - kg).toFixed(1) : null;
const fam = config.widgetFamily || "medium";
const w = new ListWidget();
w.refreshAfterDate = new Date(Math.min(S.meal.at.getTime() + 11 * 60000, Date.now() + 60 * 60000));
const mealLine = (S.meal.now ? "Now · " : "") + S.meal.label;

if (fam === "accessoryInline") {
  addText(w, `${S.meal.time} ${S.meal.label}`, Font.systemFont(12), Color.white());
} else if (fam === "accessoryCircular") {
  w.addAccessoryWidgetBackground = true;
  addText(w, "NEXT", Font.boldSystemFont(9), Color.white()).centerAlignText();
  addText(w, S.meal.time, Font.boldMonospacedSystemFont(13), Color.white()).centerAlignText();
} else if (fam === "accessoryRectangular") {
  addText(w, `${S.meal.time} · ${S.meal.label}`, Font.boldSystemFont(13), Color.white());
  addText(w, `${S.gymTitle}${S.gymSub ? " · " + S.gymSub : ""}`, Font.systemFont(12), Color.white());
  addText(w, `Bed ${S.bed} · up ${S.wake}`, Font.systemFont(12), Color.white());
} else {
  w.backgroundColor = C.bg;
  const small = fam === "small";
  w.setPadding(14, 15, 12, 15);
  const top = w.addStack(); top.centerAlignContent();
  header(top, small);
  top.addSpacer();
  if (toGo && !small) {
    const g = top.addStack(); g.layoutVertically();
    addText(g, "TO GO", mono(8), C.muted).rightAlignText();
    const r = g.addStack(); r.bottomAlignContent(); r.addSpacer();
    addDots(r, toGo, 2.4, C.ink); r.addSpacer(3); addText(r, "KG", mono(8), C.muted);
  }
  w.addSpacer();

  const body = w.addStack(); body.bottomAlignContent();
  const left = body.addStack(); left.layoutVertically();
  addText(left, S.meal.now ? "EAT NOW" : "NEXT MEAL", mono(8.5), S.meal.now ? C.lime : C.muted);
  left.addSpacer(4);
  addDots(left, S.meal.time, small ? 3.4 : 3.9, C.ink);
  left.addSpacer(4);
  addText(left, S.meal.label, Font.systemFont(small ? 11 : 12), C.ink, small ? 2 : 1);

  if (small) {
    w.addSpacer(6);
    addText(w, S.asleep ? `Up ${S.wake}` : (S.gymTitle.startsWith("Gym") ? S.gymTitle : `Bed ${S.bed}`), mono(9.5), C.lime);
  } else {
    body.addSpacer();
    const right = body.addStack(); right.layoutVertically();
    addText(right, "GYM", mono(8.5), C.muted);
    addText(right, S.gymTitle, Font.lightSystemFont(15), C.ink);
    if (S.gymSub) addText(right, S.gymSub, Font.systemFont(10), C.muted);
    right.addSpacer(6);
    addText(right, "SLEEP", mono(8.5), C.muted);
    addText(right, `${S.bed} → ${S.wake}`, mono(12), C.ink);
  }

  if (fam === "large") {
    w.addSpacer(12);
    addText(w, "TODAY'S MEALS", mono(8.5), C.muted);
    w.addSpacer(4);
    for (const [, tm, label] of S.P.slots) {
      const row = w.addStack(); row.centerAlignContent();
      const past = tm < S.t - 10;
      addText(row, hhmm(tm), mono(11), past ? C.dim : (hhmm(tm) === S.meal.time ? C.lime : C.ink));
      row.addSpacer(10);
      addText(row, label, Font.systemFont(12), past ? C.muted : C.ink);
      w.addSpacer(3);
    }
  }
}

Script.setWidget(w);
if (!config.runsInWidget) await w.presentMedium();
Script.complete();
