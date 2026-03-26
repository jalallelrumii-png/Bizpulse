import { useState, useEffect, useCallback, useRef } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip,
} from "recharts";
import {
  Home, ClipboardList, BookOpen, Settings as Gear,
  Key, Trash2, Download, Eye, EyeOff, ChevronRight,
  ChevronLeft, CheckCircle, Zap, TrendingUp, Bell,
  ArrowRight, RotateCcw, Share2, Award, Activity
} from "lucide-react";

// ─────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────
const C = {
  bg:        '#09152A',
  surface:   '#0E1E38',
  surface2:  '#132540',
  surface3:  '#192E4D',
  accent:    '#C9956A',
  accentLt:  '#D4A882',
  accentGlow:'rgba(201,149,106,0.25)',
  accentDim: 'rgba(201,149,106,0.08)',
  text:      '#EDE8DF',
  textSub:   '#9AADC5',
  textMuted: '#576A87',
  success:   '#52C48A',
  danger:    '#E05C5C',
  border:    'rgba(201,149,106,0.18)',
  borderSub: 'rgba(255,255,255,0.05)',
};

const font = {
  display: "'Cormorant Garamond', serif",
  body:    "'DM Sans', sans-serif",
};

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const LEVELS = ['Pemula', 'Berkembang', 'Pro'];

const DIMS = [
  { key: 'keuangan',    label: 'Keuangan',    icon: '💰', color: '#52C48A', full: 'Keuangan & Cashflow' },
  { key: 'marketing',   label: 'Marketing',   icon: '📣', color: '#C9956A', full: 'Marketing & Konten' },
  { key: 'operasional', label: 'Ops',         icon: '⚙️', color: '#5B9BD5', full: 'Operasional & Sistem' },
  { key: 'mindset',     label: 'Mindset',     icon: '🧠', color: '#9B7FD4', full: 'Mindset & Energi' },
];

const QUESTIONS = [
  [
    { dim:'keuangan',    text:'Kamu tahu estimasi pemasukan bulan ini?',           hint:'Angka kasar pun sudah bagus' },
    { dim:'marketing',   text:'Sudah publish konten minggu ini?',                  hint:'IG, TikTok, LinkedIn, dll' },
    { dim:'operasional', text:'Ada tugas berulang yang masih manual hari ini?',    hint:'Jawab rendah kalau masih banyak manual' },
    { dim:'mindset',     text:'Energi & fokus kerja kamu hari ini?',               hint:'Jujur, ini hanya untuk kamu' },
    { dim:'operasional', text:'1 prioritas bisnis minggu ini sudah jelas?',        hint:'Satu hal paling penting' },
  ],
  [
    { dim:'keuangan',    text:'Cashflow minggu ini positif?',                      hint:'Pemasukan lebih besar dari pengeluaran' },
    { dim:'marketing',   text:'Konten kamu mendapat respons dari audiens?',        hint:'Like, DM, comment, atau inquiry' },
    { dim:'operasional', text:'SOP utama bisnis sudah terdokumentasi?',            hint:'Bisa jalan tanpa kamu 1 minggu?' },
    { dim:'mindset',     text:'Seberapa fokus deep work kamu hari ini?',           hint:'Tanpa distraksi & multitasking' },
    { dim:'keuangan',    text:'Ada bottleneck yang menghalangi growth minggu ini?', hint:'Rendah = banyak bottleneck' },
  ],
  [
    { dim:'keuangan',    text:'Profit margin bulan ini on track dengan target?',   hint:'Revenue minus semua biaya & nilai waktu' },
    { dim:'marketing',   text:'Sistem konten berjalan tanpa banyak energimu?',     hint:'Ada jadwal, template, & metrik jelas' },
    { dim:'operasional', text:'Operasional bisa jalan minimal 80% tanpa kamu?',   hint:'Jujur, bukan harapan' },
    { dim:'mindset',     text:'Hari ini kamu bekerja "pada" bisnis atau "dalam"?', hint:'"Pada"=strategic 5, "Dalam"=operasional 1' },
    { dim:'keuangan',    text:'Seberapa dekat dengan target kuartal ini?',         hint:'Berdasarkan progress aktual' },
  ],
];

const RATINGS = [
  { v:1, label:'Sangat Lemah', color:'#E05C5C' },
  { v:2, label:'Perlu Kerja',  color:'#E0905C' },
  { v:3, label:'Cukup',        color:'#C9956A' },
  { v:4, label:'Bagus',        color:'#7BC47A' },
  { v:5, label:'Excellent',    color:'#52C48A' },
];

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);

const calcScores = (answers, level) => {
  const qs = QUESTIONS[level] || QUESTIONS[0];
  const totals = { keuangan:[], marketing:[], operasional:[], mindset:[] };
  qs.forEach((q, i) => {
    const val = answers[i] ?? 3;
    if (totals[q.dim]) totals[q.dim].push(val);
  });
  const scores = {};
  DIMS.forEach(d => {
    const arr = totals[d.key];
    scores[d.key] = arr && arr.length ? Math.round((arr.reduce((a,b)=>a+b,0)/arr.length) * 20) : 50;
  });
  scores.health = Math.round(Object.values(scores).reduce((a,b)=>a+b,0) / DIMS.length);
  return scores;
};

const buildPrompt = (profile, answers, scores) => {
  const qs = QUESTIONS[profile.level] || QUESTIONS[0];
  const lines = qs.map((q,i) => `- ${q.text}: ${answers[i] ?? 3}/5`).join('\n');
  return `Kamu adalah konsultan bisnis senior untuk solopreneur Indonesia bernama "${profile.name}" yang menjalankan bisnis "${profile.businessName}" (level: ${LEVELS[profile.level]}).

Hasil audit bisnis hari ini (${today()}):
${lines}

Skor dimensi:
- Keuangan & Cashflow: ${scores.keuangan}/100
- Marketing & Konten: ${scores.marketing}/100
- Operasional & Sistem: ${scores.operasional}/100
- Mindset & Energi: ${scores.mindset}/100
- Business Health Score: ${scores.health}/100

Berikan insight yang:
1. Spesifik dan jujur berdasarkan data di atas
2. Highlight 1 area terkuat (apresiasi singkat)
3. Highlight 1 area yang paling butuh perhatian segera
4. Tutup dengan 1 rekomendasi aksi konkret untuk besok

Format: 3-4 paragraf pendek. Gunakan bahasa mix Indo-English yang modern dan profesional. Jangan bullet points. Langsung ke poinnya, tanpa basa-basi pembuka.`;
};

// ─────────────────────────────────────────
// CSS INJECTION
// ─────────────────────────────────────────
const GlobalStyle = () => {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap';
    document.head.appendChild(link);
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: ${C.bg}; color: ${C.text}; font-family: ${font.body}; }
      ::-webkit-scrollbar { width: 3px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
      @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      @keyframes scoreCount { from { opacity:0; transform:scale(0.7); } to { opacity:1; transform:scale(1); } }
      @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
      @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
      @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      @keyframes slideRight { from { transform:translateX(-100%); } to { transform:translateX(0); } }
      @keyframes glow { 0%,100% { box-shadow:0 0 20px rgba(201,149,106,0.2); } 50% { box-shadow:0 0 40px rgba(201,149,106,0.5); } }
      .screen { animation: fadeUp 0.35s ease forwards; }
      .score-anim { animation: scoreCount 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      .card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
      .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
      .btn-press:active { transform: scale(0.96); }
      input, textarea { outline: none; }
      select { outline: none; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(link); document.head.removeChild(style); };
  }, []);
  return null;
};

// ─────────────────────────────────────────
// CIRCULAR SCORE
// ─────────────────────────────────────────
const CircleScore = ({ score = 0, size = 140 }) => {
  const [displayed, setDisplayed] = useState(0);
  const radius = (size - 20) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (displayed / 100) * circ;
  const color = score >= 70 ? C.success : score >= 40 ? C.accent : C.danger;

  useEffect(() => {
    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1000, 1);
      setDisplayed(Math.round(p * score));
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [score]);

  return (
    <div style={{ position:'relative', width:size, height:size }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={C.surface3} strokeWidth={8}/>
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition:'stroke-dashoffset 0.05s linear', filter:`drop-shadow(0 0 8px ${color}60)` }}
        />
      </svg>
      <div style={{
        position:'absolute', inset:0, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
      }}>
        <span style={{ fontFamily:font.display, fontSize:size*0.28, fontWeight:700, color, lineHeight:1 }}>{displayed}</span>
        <span style={{ fontSize:10, color:C.textMuted, letterSpacing:'0.1em', textTransform:'uppercase', marginTop:2 }}>Health</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// RADAR VIZ
// ─────────────────────────────────────────
const RadarViz = ({ scores }) => {
  const data = DIMS.map(d => ({ subject: d.label, A: scores?.[d.key] ?? 50, fullMark: 100 }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} margin={{ top:10, right:20, bottom:10, left:20 }}>
        <PolarGrid stroke={C.borderSub} />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill:C.textSub, fontSize:11, fontFamily:font.body }}
        />
        <Radar
          dataKey="A" stroke={C.accent} fill={C.accent} fillOpacity={0.15}
          dot={{ fill:C.accent, r:3 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

// ─────────────────────────────────────────
// STREAK CALENDAR
// ─────────────────────────────────────────
const StreakCalendar = ({ history }) => {
  const days = 35;
  const cells = [];
  const auditDates = new Set(history.map(h => h.date));
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const done = auditDates.has(dateStr);
    const isToday = dateStr === today();
    cells.push({ date: dateStr, done, isToday });
  }
  let streak = 0;
  for (let i = cells.length - 1; i >= 0; i--) {
    if (cells[i].done) streak++;
    else break;
  }
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span style={{ fontSize:12, color:C.textMuted }}>Audit streak</span>
        <span style={{ fontSize:13, color:C.accent, fontWeight:600 }}>🔥 {streak} hari</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4 }}>
        {cells.map((c, i) => (
          <div key={i} title={c.date} style={{
            aspectRatio:'1/1', borderRadius:4,
            background: c.done ? C.accent : c.isToday ? C.surface3 : C.surface2,
            border: c.isToday ? `1px solid ${C.accent}` : 'none',
            boxShadow: c.done ? `0 0 6px ${C.accentGlow}` : 'none',
            transition:'all 0.2s',
          }}/>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// TREND CHART
// ─────────────────────────────────────────
const TrendChart = ({ history }) => {
  const data = history.slice(-10).map((h, i) => ({
    day: `H${i+1}`,
    score: h.scores?.health ?? 0,
  }));
  if (data.length < 2) return (
    <div style={{ height:100, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ color:C.textMuted, fontSize:12 }}>Minimal 2 audit untuk lihat tren</span>
    </div>
  );
  return (
    <ResponsiveContainer width="100%" height={100}>
      <AreaChart data={data} margin={{ top:5, right:5, left:-30, bottom:0 }}>
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={C.accent} stopOpacity={0.4}/>
            <stop offset="95%" stopColor={C.accent} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis dataKey="day" tick={{ fill:C.textMuted, fontSize:9 }} axisLine={false} tickLine={false}/>
        <YAxis domain={[0,100]} tick={{ fill:C.textMuted, fontSize:9 }} axisLine={false} tickLine={false}/>
        <Tooltip
          contentStyle={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8, fontSize:11, color:C.text }}
          formatter={(v) => [`${v}`, 'Health Score']}
        />
        <Area type="monotone" dataKey="score" stroke={C.accent} strokeWidth={2} fill="url(#trendGrad)" dot={{ fill:C.accent, r:3 }}/>
      </AreaChart>
    </ResponsiveContainer>
  );
};

// ─────────────────────────────────────────
// SCREEN: ONBOARDING
// ─────────────────────────────────────────
const Onboarding = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name:'', businessName:'', level:0, apiKey:'', showKey:false });

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const canNext = [
    form.name.trim() && form.businessName.trim(),
    true,
    true,
  ];

  const steps = [
    {
      title: 'Selamat Datang',
      sub: 'Mari kita kenalan dulu sebelum mulai audit bisnis kamu.',
      content: (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={labelStyle}>Nama kamu</label>
            <input style={inputStyle} placeholder="Contoh: Budi Santoso"
              value={form.name} onChange={e=>set('name',e.target.value)}/>
          </div>
          <div>
            <label style={labelStyle}>Nama bisnis</label>
            <input style={inputStyle} placeholder="Contoh: Toko Kue Nusantara"
              value={form.businessName} onChange={e=>set('businessName',e.target.value)}/>
          </div>
        </div>
      ),
    },
    {
      title: 'Level Bisnis',
      sub: 'Pilih yang paling sesuai dengan kondisi bisnismu sekarang.',
      content: (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[
            { label:'Pemula', sub:'Baru mulai atau masih validasi bisnis', icon:'🌱' },
            { label:'Berkembang', sub:'Sudah ada revenue, fokus growth', icon:'🚀' },
            { label:'Pro', sub:'Sistem jalan, fokus scale & efisiensi', icon:'⚡' },
          ].map((l, i) => (
            <button key={i} className="btn-press" onClick={() => set('level', i)} style={{
              background: form.level === i ? C.accentDim : C.surface2,
              border: `1px solid ${form.level === i ? C.accent : C.borderSub}`,
              borderRadius:14, padding:'14px 16px', cursor:'pointer',
              display:'flex', alignItems:'center', gap:14, textAlign:'left', transition:'all 0.2s',
            }}>
              <span style={{ fontSize:24 }}>{l.icon}</span>
              <div>
                <div style={{ color:form.level===i?C.accentLt:C.text, fontWeight:600, fontSize:15, fontFamily:font.body }}>{l.label}</div>
                <div style={{ color:C.textMuted, fontSize:12, marginTop:2 }}>{l.sub}</div>
              </div>
              {form.level === i && <CheckCircle size={18} color={C.accent} style={{ marginLeft:'auto' }}/>}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: 'AI Insight (Opsional)',
      sub: 'Masukkan Groq API key untuk mengaktifkan analisis AI. Bisa dilewati.',
      content: (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:C.accentDim, border:`1px solid ${C.border}`, borderRadius:12, padding:14, fontSize:13, color:C.textSub, lineHeight:1.6 }}>
            🔑 API key disimpan lokal di device kamu, tidak pernah dikirim ke server kami. Dapatkan free key di <strong style={{color:C.accent}}>console.groq.com</strong>
          </div>
          <div>
            <label style={labelStyle}>Groq API Key</label>
            <div style={{ position:'relative' }}>
              <input
                style={{ ...inputStyle, paddingRight:44 }}
                type={form.showKey ? 'text' : 'password'}
                placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
                value={form.apiKey}
                onChange={e=>set('apiKey',e.target.value)}
              />
              <button onClick={() => set('showKey', !form.showKey)} style={{
                position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', cursor:'pointer', color:C.textMuted,
              }}>
                {form.showKey ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];

  return (
    <div className="screen" style={{
      minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column',
      padding:'0 24px 40px', maxWidth:480, margin:'0 auto',
    }}>
      {/* Header */}
      <div style={{ paddingTop:60, paddingBottom:40, display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{
          width:72, height:72, borderRadius:36,
          background:`radial-gradient(circle at 40% 40%, #1A3050, ${C.bg})`,
          border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center',
          marginBottom:20, boxShadow:`0 0 30px ${C.accentGlow}`,
        }}>
          <span style={{ fontSize:32 }}>🪷</span>
        </div>
        <span style={{ fontFamily:font.display, fontSize:26, fontWeight:600, color:C.accent, letterSpacing:'0.02em' }}>Logika Digital</span>
        <span style={{ color:C.textMuted, fontSize:12, letterSpacing:'0.12em', marginTop:2 }}>BIZPULSE · AUDIT BISNIS</span>
      </div>

      {/* Progress dots */}
      <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:36 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            height:4, borderRadius:2, transition:'all 0.3s',
            width: i === step ? 28 : 8,
            background: i <= step ? C.accent : C.surface3,
          }}/>
        ))}
      </div>

      {/* Step content */}
      <div key={step} className="screen" style={{ flex:1 }}>
        <h2 style={{ fontFamily:font.display, fontSize:28, fontWeight:600, color:C.text, marginBottom:8 }}>{current.title}</h2>
        <p style={{ color:C.textSub, fontSize:14, marginBottom:28, lineHeight:1.6 }}>{current.sub}</p>
        {current.content}
      </div>

      {/* Buttons */}
      <div style={{ display:'flex', gap:12, marginTop:36 }}>
        {step > 0 && (
          <button className="btn-press" onClick={() => setStep(s => s-1)} style={{
            flex:1, background:C.surface2, border:`1px solid ${C.borderSub}`,
            borderRadius:14, padding:'16px', color:C.textSub, fontSize:15,
            fontFamily:font.body, cursor:'pointer', fontWeight:500,
          }}>← Back</button>
        )}
        <button
          className="btn-press"
          onClick={() => {
            if (step < steps.length - 1) setStep(s => s+1);
            else onDone({ name:form.name, businessName:form.businessName, level:form.level, apiKey:form.apiKey });
          }}
          disabled={!canNext[step]}
          style={{
            flex: step === 0 ? 1 : 2,
            background: canNext[step]
              ? `linear-gradient(135deg, ${C.accent}, ${C.accentLt})`
              : C.surface2,
            border:'none', borderRadius:14, padding:'16px', cursor: canNext[step] ? 'pointer':'not-allowed',
            color: canNext[step] ? C.bg : C.textMuted, fontSize:15,
            fontFamily:font.body, fontWeight:600, transition:'all 0.2s',
            boxShadow: canNext[step] ? `0 4px 20px ${C.accentGlow}` : 'none',
          }}
        >
          {step === steps.length - 1 ? (form.apiKey ? 'Mulai Sekarang ✨' : 'Lewati & Mulai →') : 'Lanjut →'}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// SCREEN: HOME DASHBOARD
// ─────────────────────────────────────────
const HomeDashboard = ({ profile, history, onStartAudit }) => {
  const latest = history[history.length - 1];
  const scores = latest?.scores ?? { keuangan:0, marketing:0, operasional:0, mindset:0, health:0 };
  const todayDone = latest?.date === today();
  const radarData = DIMS.map(d => ({ subject: d.label, A: scores[d.key] ?? 0, fullMark:100 }));

  return (
    <div className="screen" style={{ padding:'0 0 100px' }}>
      {/* TOP HEADER */}
      <div style={{
        padding:'52px 24px 28px',
        background:`linear-gradient(180deg, ${C.surface} 0%, transparent 100%)`,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <p style={{ color:C.textMuted, fontSize:12, letterSpacing:'0.08em' }}>Selamat datang,</p>
            <h1 style={{ fontFamily:font.display, fontSize:26, fontWeight:600, color:C.text, marginTop:2 }}>{profile.name}</h1>
            <span style={{
              display:'inline-block', marginTop:6, fontSize:11, color:C.accent,
              background:C.accentDim, border:`1px solid ${C.border}`,
              padding:'2px 10px', borderRadius:20, letterSpacing:'0.06em',
            }}>{profile.businessName} · {LEVELS[profile.level]}</span>
          </div>
          <div style={{
            width:44, height:44, borderRadius:22,
            background:`radial-gradient(circle, #1A3050, ${C.bg})`,
            border:`1px solid ${C.border}`, display:'flex', alignItems:'center',
            justifyContent:'center', boxShadow:`0 0 16px ${C.accentGlow}`,
          }}>
            <span style={{ fontSize:22 }}>🪷</span>
          </div>
        </div>
      </div>

      <div style={{ padding:'0 24px', display:'flex', flexDirection:'column', gap:20 }}>

        {/* HEALTH SCORE CARD */}
        <div style={{
          background:`linear-gradient(135deg, ${C.surface} 0%, ${C.surface2} 100%)`,
          border:`1px solid ${C.border}`, borderRadius:24,
          padding:'28px 24px', display:'flex', alignItems:'center', gap:24,
          boxShadow:`0 8px 40px rgba(0,0,0,0.3)`,
          position:'relative', overflow:'hidden',
        }}>
          <div style={{
            position:'absolute', top:-30, right:-30,
            width:120, height:120, borderRadius:60,
            background:`radial-gradient(circle, ${C.accentGlow} 0%, transparent 70%)`,
          }}/>
          <CircleScore score={scores.health} size={130}/>
          <div style={{ flex:1 }}>
            <p style={{ color:C.textMuted, fontSize:11, letterSpacing:'0.1em', marginBottom:8 }}>BUSINESS HEALTH</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {DIMS.map(d => (
                <div key={d.key} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:13, width:20 }}>{d.icon}</span>
                  <div style={{ flex:1, height:4, background:C.surface3, borderRadius:2 }}>
                    <div style={{
                      height:'100%', borderRadius:2,
                      width:`${scores[d.key] || 0}%`,
                      background:`linear-gradient(90deg, ${d.color}80, ${d.color})`,
                      transition:'width 1s ease',
                    }}/>
                  </div>
                  <span style={{ fontSize:11, color:C.textSub, width:26, textAlign:'right' }}>{scores[d.key] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AUDIT CTA */}
        {!todayDone ? (
          <button className="btn-press card-hover" onClick={onStartAudit} style={{
            background:`linear-gradient(135deg, ${C.accent} 0%, ${C.accentLt} 100%)`,
            border:'none', borderRadius:18, padding:'20px 24px',
            display:'flex', alignItems:'center', gap:16, cursor:'pointer',
            boxShadow:`0 6px 30px ${C.accentGlow}`,
            animation:'glow 3s ease-in-out infinite',
          }}>
            <div style={{
              width:48, height:48, borderRadius:24,
              background:'rgba(0,0,0,0.2)', display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <Zap size={24} color={C.bg}/>
            </div>
            <div style={{ textAlign:'left' }}>
              <div style={{ color:C.bg, fontWeight:700, fontSize:16, fontFamily:font.body }}>Audit Bisnis Hari Ini</div>
              <div style={{ color:'rgba(0,0,0,0.5)', fontSize:12, marginTop:2 }}>5 pertanyaan · ±5 menit</div>
            </div>
            <ArrowRight size={20} color={C.bg} style={{ marginLeft:'auto' }}/>
          </button>
        ) : (
          <div style={{
            background:C.surface2, border:`1px solid ${C.success}30`,
            borderRadius:18, padding:'16px 20px',
            display:'flex', alignItems:'center', gap:12,
          }}>
            <CheckCircle size={22} color={C.success}/>
            <div>
              <div style={{ color:C.success, fontWeight:600, fontSize:14 }}>Audit hari ini selesai ✓</div>
              <div style={{ color:C.textMuted, fontSize:12 }}>Kembali besok untuk menjaga streak</div>
            </div>
          </div>
        )}

        {/* RADAR CHART */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <Activity size={16} color={C.accent}/>
            <span>Profil Bisnis</span>
          </div>
          <RadarViz scores={scores}/>
        </div>

        {/* STREAK + TREND */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={{ ...cardStyle, gridColumn:'span 2' }}>
            <div style={cardHeaderStyle}>
              <span>🔥</span>
              <span>Konsistensi Audit</span>
            </div>
            <StreakCalendar history={history}/>
          </div>
        </div>

        {/* TREND */}
        {history.length >= 2 && (
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <TrendingUp size={16} color={C.accent}/>
              <span>Tren Health Score</span>
            </div>
            <TrendChart history={history}/>
          </div>
        )}

      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// SCREEN: AUDIT
// ─────────────────────────────────────────
const AuditScreen = ({ profile, onDone, onBack }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const qs = QUESTIONS[profile.level] || QUESTIONS[0];
  const q = qs[step];
  const progress = (step / qs.length) * 100;

  const handleNext = () => {
    const newAnswers = [...answers];
    newAnswers[step] = selected;
    setAnswers(newAnswers);
    if (step < qs.length - 1) {
      setStep(s => s + 1);
      setSelected(answers[step + 1] ?? null);
    } else {
      onDone(newAnswers);
    }
  };

  const handlePrev = () => {
    if (step === 0) { onBack(); return; }
    setStep(s => s - 1);
    setSelected(answers[step - 1] ?? null);
  };

  const dimInfo = DIMS.find(d => d.key === q.dim) || DIMS[0];

  return (
    <div className="screen" style={{ minHeight:'100vh', background:C.bg, padding:'0 24px 40px', maxWidth:480, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ padding:'52px 0 32px', display:'flex', alignItems:'center', gap:16 }}>
        <button onClick={handlePrev} style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted }}>
          <ChevronLeft size={24}/>
        </button>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:12, color:C.textMuted }}>Pertanyaan {step+1} dari {qs.length}</span>
            <span style={{ fontSize:12, color:C.accent }}>{Math.round(progress + 20)}%</span>
          </div>
          <div style={{ height:4, background:C.surface3, borderRadius:2 }}>
            <div style={{
              height:'100%', borderRadius:2, transition:'width 0.4s ease',
              width:`${(step+1)/qs.length*100}%`,
              background:`linear-gradient(90deg, ${C.accent}, ${C.accentLt})`,
            }}/>
          </div>
        </div>
      </div>

      {/* Dimension badge */}
      <div key={step} className="screen" style={{ display:'flex', flexDirection:'column', gap:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:40, height:40, borderRadius:12,
            background: dimInfo.color + '20',
            border:`1px solid ${dimInfo.color}40`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
          }}>{dimInfo.icon}</div>
          <span style={{ color:dimInfo.color, fontSize:13, fontWeight:500 }}>{dimInfo.full}</span>
        </div>

        {/* Question */}
        <div>
          <h2 style={{
            fontFamily:font.display, fontSize:26, fontWeight:600, color:C.text, lineHeight:1.3, marginBottom:10,
          }}>{q.text}</h2>
          <p style={{ color:C.textMuted, fontSize:13 }}>{q.hint}</p>
        </div>

        {/* Rating buttons */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {RATINGS.map(r => (
            <button key={r.v} className="btn-press" onClick={() => setSelected(r.v)} style={{
              background: selected === r.v ? r.color + '20' : C.surface2,
              border: `1.5px solid ${selected === r.v ? r.color : C.borderSub}`,
              borderRadius:14, padding:'14px 18px', cursor:'pointer',
              display:'flex', alignItems:'center', gap:14, transition:'all 0.2s',
              boxShadow: selected === r.v ? `0 4px 16px ${r.color}30` : 'none',
            }}>
              <div style={{
                width:32, height:32, borderRadius:8,
                background: selected === r.v ? r.color : C.surface3,
                display:'flex', alignItems:'center', justifyContent:'center',
                color: selected === r.v ? C.bg : C.textMuted,
                fontWeight:700, fontSize:15, fontFamily:font.body, transition:'all 0.2s',
              }}>{r.v}</div>
              <span style={{ color: selected === r.v ? r.color : C.textSub, fontSize:14, fontFamily:font.body, fontWeight:500 }}>
                {r.label}
              </span>
              {selected === r.v && <CheckCircle size={16} color={r.color} style={{ marginLeft:'auto' }}/>}
            </button>
          ))}
        </div>

        {/* Next */}
        <button className="btn-press" onClick={handleNext} disabled={selected === null} style={{
          background: selected !== null
            ? `linear-gradient(135deg, ${C.accent}, ${C.accentLt})`
            : C.surface2,
          border:'none', borderRadius:14, padding:'17px',
          color: selected !== null ? C.bg : C.textMuted,
          fontSize:15, fontFamily:font.body, fontWeight:600, cursor: selected !== null ? 'pointer':'not-allowed',
          transition:'all 0.2s',
          boxShadow: selected !== null ? `0 4px 20px ${C.accentGlow}` : 'none',
        }}>
          {step < qs.length - 1 ? 'Lanjut →' : 'Selesai & Analisis AI ✨'}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// SCREEN: INSIGHT
// ─────────────────────────────────────────
const InsightScreen = ({ profile, answers, onDone }) => {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const scores = calcScores(answers, profile.level);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      if (!profile.apiKey) {
        await new Promise(r => setTimeout(r, 1500));
        setInsight(`Business health score kamu hari ini adalah ${scores.health}/100. ${scores.health >= 60 ? 'Secara keseluruhan, bisnismu dalam kondisi yang cukup baik.' : 'Ada beberapa area yang perlu mendapat perhatian segera.'}\n\nDimensi terkuat kamu adalah ${DIMS.reduce((a,b) => scores[a.key]>scores[b.key]?a:b).full} dengan skor ${Math.max(...DIMS.map(d=>scores[d.key]))}/100. Area yang paling butuh improvement adalah ${DIMS.reduce((a,b) => scores[a.key]<scores[b.key]?a:b).full} dengan skor ${Math.min(...DIMS.map(d=>scores[d.key]))}/100.\n\n**Rekomendasi untuk besok:** Aktifkan AI insight dengan memasukkan Groq API key di Settings untuk mendapatkan analisis yang lebih personal dan actionable.`);
        setLoading(false);
        return;
      }
      try {
        const prompt = buildPrompt(profile, answers, scores);
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method:'POST',
          headers: { 'Authorization':`Bearer ${profile.apiKey}`, 'Content-Type':'application/json' },
          body: JSON.stringify({
            model:'llama-3.3-70b-versatile',
            messages:[
              { role:'system', content:'Kamu adalah konsultan bisnis senior untuk solopreneur Indonesia. Berikan insight yang jujur, spesifik, dan actionable.' },
              { role:'user', content:prompt }
            ],
            max_tokens:600, temperature:0.7,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        setInsight(data.choices[0].message.content);
      } catch(e) {
        setError(e.message || 'Gagal mendapat insight AI.');
        setInsight('');
      }
      setLoading(false);
    };
    run();
  }, []);

  return (
    <div className="screen" style={{ minHeight:'100vh', background:C.bg, padding:'0 24px 40px', maxWidth:480, margin:'0 auto' }}>
      <div style={{ padding:'52px 0 28px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <div style={{
            width:44, height:44, borderRadius:22,
            background:C.accentDim, border:`1px solid ${C.border}`,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Zap size={20} color={C.accent}/>
          </div>
          <div>
            <div style={{ fontFamily:font.display, fontSize:22, color:C.text, fontWeight:600 }}>AI Business Insight</div>
            <div style={{ color:C.textMuted, fontSize:12 }}>Dianalisis oleh Llama 3.3 · {today()}</div>
          </div>
        </div>

        {/* Score cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:24 }}>
          {DIMS.map(d => (
            <div key={d.key} style={{
              background:C.surface2, border:`1px solid ${C.borderSub}`,
              borderRadius:14, padding:'12px 14px',
            }}>
              <div style={{ fontSize:12, color:C.textMuted, marginBottom:4 }}>{d.icon} {d.full.split('&')[0].trim()}</div>
              <div style={{
                fontFamily:font.display, fontSize:26, fontWeight:600,
                color: scores[d.key] >= 70 ? d.color : scores[d.key] >= 40 ? C.accent : C.danger,
              }}>{scores[d.key]}</div>
            </div>
          ))}
        </div>

        {/* Insight */}
        <div style={{
          background:C.surface, border:`1px solid ${C.border}`,
          borderRadius:18, padding:22, marginBottom:24,
          minHeight:180,
        }}>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:'20px 0' }}>
              <div style={{
                width:40, height:40, border:`3px solid ${C.border}`,
                borderTop:`3px solid ${C.accent}`, borderRadius:20,
                animation:'spin 1s linear infinite',
              }}/>
              <p style={{ color:C.textMuted, fontSize:13 }}>Menganalisis bisnis kamu...</p>
            </div>
          ) : error ? (
            <div style={{ color:C.danger, fontSize:13, lineHeight:1.6 }}>
              <strong>⚠️ Error:</strong> {error}<br/><br/>
              <span style={{ color:C.textMuted }}>Periksa API key di Settings dan coba lagi.</span>
            </div>
          ) : (
            <div style={{ color:C.textSub, fontSize:14, lineHeight:1.8, whiteSpace:'pre-wrap' }}>
              {insight}
            </div>
          )}
        </div>

        <button className="btn-press" onClick={() => onDone(scores, insight)} style={{
          width:'100%', background:`linear-gradient(135deg, ${C.accent}, ${C.accentLt})`,
          border:'none', borderRadius:14, padding:'17px', cursor:'pointer',
          color:C.bg, fontSize:15, fontFamily:font.body, fontWeight:600,
          boxShadow:`0 4px 20px ${C.accentGlow}`,
        }}>
          Lihat Dashboard →
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// SCREEN: HISTORY
// ─────────────────────────────────────────
const HistoryScreen = ({ history }) => {
  if (!history.length) return (
    <div className="screen" style={{ padding:'80px 24px', textAlign:'center' }}>
      <span style={{ fontSize:48 }}>📋</span>
      <h3 style={{ fontFamily:font.display, color:C.text, marginTop:16, fontSize:22 }}>Belum ada audit</h3>
      <p style={{ color:C.textMuted, marginTop:8, fontSize:14 }}>Mulai audit pertamamu dari halaman Home</p>
    </div>
  );

  return (
    <div className="screen" style={{ padding:'72px 24px 100px' }}>
      <h2 style={{ fontFamily:font.display, fontSize:26, color:C.text, fontWeight:600, marginBottom:8 }}>Riwayat Audit</h2>
      <p style={{ color:C.textMuted, fontSize:13, marginBottom:24 }}>{history.length} audit tersimpan</p>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {[...history].reverse().map((h, i) => {
          const color = h.scores?.health >= 70 ? C.success : h.scores?.health >= 40 ? C.accent : C.danger;
          return (
            <div key={i} className="card-hover" style={{
              background:C.surface, border:`1px solid ${C.borderSub}`,
              borderRadius:18, padding:'18px 20px',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                <div>
                  <div style={{ color:C.text, fontWeight:600, fontSize:15 }}>
                    {new Date(h.date).toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long' })}
                  </div>
                  {h.insight && (
                    <div style={{ color:C.textMuted, fontSize:12, marginTop:4, lineHeight:1.5, maxWidth:220 }}>
                      {h.insight.slice(0, 80)}...
                    </div>
                  )}
                </div>
                <div style={{
                  fontFamily:font.display, fontSize:32, fontWeight:700, color,
                  lineHeight:1,
                }}>{h.scores?.health ?? '—'}</div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {DIMS.map(d => (
                  <div key={d.key} style={{ flex:1, textAlign:'center' }}>
                    <div style={{ fontSize:11, color:C.textMuted }}>{d.icon}</div>
                    <div style={{ fontSize:12, color:d.color, fontWeight:600 }}>{h.scores?.[d.key] ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// SCREEN: SETTINGS
// ─────────────────────────────────────────
const SettingsScreen = ({ profile, onUpdate, onReset }) => {
  const [form, setForm] = useState({ ...profile });
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdate(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const exportData = () => {
    const data = { profile, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'bizpulse-export.json'; a.click();
  };

  return (
    <div className="screen" style={{ padding:'72px 24px 100px' }}>
      <h2 style={{ fontFamily:font.display, fontSize:26, color:C.text, fontWeight:600, marginBottom:24 }}>Settings</h2>

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* Profile */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}><span>👤</span><span>Profil</span></div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label style={labelStyle}>Nama</label>
              <input style={inputStyle} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
            </div>
            <div>
              <label style={labelStyle}>Nama Bisnis</label>
              <input style={inputStyle} value={form.businessName} onChange={e=>setForm(f=>({...f,businessName:e.target.value}))}/>
            </div>
            <div>
              <label style={labelStyle}>Level Bisnis</label>
              <select style={inputStyle} value={form.level} onChange={e=>setForm(f=>({...f,level:Number(e.target.value)}))}>
                {LEVELS.map((l,i) => <option key={i} value={i}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* API Key */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}><Key size={15} color={C.accent}/><span>Groq API Key</span></div>
          <div style={{ position:'relative' }}>
            <input
              style={{ ...inputStyle, paddingRight:44 }}
              type={showKey ? 'text' : 'password'}
              value={form.apiKey}
              onChange={e=>setForm(f=>({...f,apiKey:e.target.value}))}
              placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
            />
            <button onClick={()=>setShowKey(s=>!s)} style={{
              position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', cursor:'pointer', color:C.textMuted,
            }}>
              {showKey ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
          <p style={{ color:C.textMuted, fontSize:11, marginTop:8 }}>Dapatkan free key di console.groq.com</p>
        </div>

        {/* Notif */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}><Bell size={15} color={C.accent}/><span>Reminder Audit</span></div>
          <input style={inputStyle} type="time" value={form.notifTime || '08:00'} onChange={e=>setForm(f=>({...f,notifTime:e.target.value}))}/>
          <p style={{ color:C.textMuted, fontSize:11, marginTop:8 }}>In-app reminder · Push notification coming soon</p>
        </div>

        {/* Save */}
        <button className="btn-press" onClick={handleSave} style={{
          background: saved
            ? `linear-gradient(135deg, ${C.success}, #3DAA72)`
            : `linear-gradient(135deg, ${C.accent}, ${C.accentLt})`,
          border:'none', borderRadius:14, padding:'16px',
          color:C.bg, fontSize:15, fontFamily:font.body, fontWeight:600,
          cursor:'pointer', transition:'all 0.3s',
          boxShadow:`0 4px 20px ${C.accentGlow}`,
        }}>
          {saved ? '✓ Tersimpan!' : 'Simpan Perubahan'}
        </button>

        {/* Export */}
        <button className="btn-press" onClick={exportData} style={{
          background:C.surface2, border:`1px solid ${C.borderSub}`,
          borderRadius:14, padding:'14px', cursor:'pointer',
          color:C.textSub, fontSize:14, fontFamily:font.body,
          display:'flex', alignItems:'center', justifyContent:'center', gap:10,
        }}>
          <Download size={16}/> Export Data (JSON)
        </button>

        {/* Reset */}
        <button className="btn-press" onClick={() => {
          if (confirm('Reset semua data? Ini tidak bisa di-undo.')) onReset();
        }} style={{
          background:'transparent', border:`1px solid ${C.danger}30`,
          borderRadius:14, padding:'14px', cursor:'pointer',
          color:C.danger + '90', fontSize:14, fontFamily:font.body,
          display:'flex', alignItems:'center', justifyContent:'center', gap:10,
        }}>
          <Trash2 size={16}/> Reset Semua Data
        </button>

        {/* About */}
        <div style={{ textAlign:'center', marginTop:8 }}>
          <span style={{ fontSize:22 }}>🪷</span>
          <p style={{ fontFamily:font.display, color:C.accent, fontSize:15, marginTop:6 }}>Logika Digital · BizPulse</p>
          <p style={{ color:C.textMuted, fontSize:11, marginTop:2 }}>Beta v0.1 · Helping Solopreneurs Scale Up</p>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────
const BottomNav = ({ tab, onChange }) => {
  const items = [
    { key:'home',     icon:<Home size={20}/>,          label:'Home' },
    { key:'audit',    icon:<ClipboardList size={20}/>,  label:'Audit' },
    { key:'history',  icon:<BookOpen size={20}/>,       label:'History' },
    { key:'settings', icon:<Gear size={20}/>,           label:'Settings' },
  ];
  return (
    <div style={{
      position:'fixed', bottom:0, left:0, right:0,
      background:`${C.surface}ee`, backdropFilter:'blur(20px)',
      borderTop:`1px solid ${C.border}`,
      display:'flex', padding:'8px 0 calc(8px + env(safe-area-inset-bottom))',
      maxWidth:480, margin:'0 auto',
    }}>
      {items.map(item => {
        const active = tab === item.key;
        return (
          <button key={item.key} onClick={() => onChange(item.key)} style={{
            flex:1, background:'none', border:'none', cursor:'pointer',
            display:'flex', flexDirection:'column', alignItems:'center', gap:4,
            padding:'4px 0', transition:'all 0.2s',
            color: active ? C.accent : C.textMuted,
          }}>
            <div style={{
              padding:6, borderRadius:12,
              background: active ? C.accentDim : 'transparent',
              transition:'all 0.2s',
            }}>{item.icon}</div>
            <span style={{ fontSize:10, fontFamily:font.body, fontWeight: active ? 600 : 400 }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────
// SHARED STYLES
// ─────────────────────────────────────────
const cardStyle = {
  background:C.surface, border:`1px solid ${C.borderSub}`,
  borderRadius:18, padding:'18px 20px',
};
const cardHeaderStyle = {
  display:'flex', alignItems:'center', gap:8,
  color:C.textSub, fontSize:13, fontWeight:500,
  fontFamily:font.body, marginBottom:16,
};
const labelStyle = {
  display:'block', color:C.textMuted, fontSize:12,
  letterSpacing:'0.06em', marginBottom:8, fontFamily:font.body,
};
const inputStyle = {
  width:'100%', background:C.surface2, border:`1px solid ${C.borderSub}`,
  borderRadius:12, padding:'12px 14px', color:C.text,
  fontSize:14, fontFamily:font.body, transition:'border-color 0.2s',
};

// ─────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────
export default function App() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('home');
  const [auditMode, setAuditMode] = useState(false);
  const [insightMode, setInsightMode] = useState(null);

  // Load from storage
  useEffect(() => {
    const load = async () => {
      try {
        const pVal = localStorage.getItem('bp_profile');
        const hVal = localStorage.getItem('bp_history');
        if (pVal) setProfile(JSON.parse(pVal));
        if (hVal) setHistory(JSON.parse(hVal));
      } catch(e) {}
      setReady(true);
    };
    load();
  }, []);

  const saveProfile = async (p) => {
    try { localStorage.setItem('bp_profile', JSON.stringify(p)); } catch(e) {}
  };
  const saveHistory = async (h) => {
    try { localStorage.setItem('bp_history', JSON.stringify(h)); } catch(e) {}
  };

  const handleOnboardingDone = async (p) => {
    await saveProfile(p);
    setProfile(p);
  };

  const handleAuditDone = (answers) => {
    setInsightMode(answers);
    setAuditMode(false);
  };

  const handleInsightDone = async (scores, insight) => {
    const entry = { date: today(), scores, insight, answers: insightMode };
    const newHistory = [...history.filter(h => h.date !== today()), entry];
    await saveHistory(newHistory);
    setHistory(newHistory);
    setInsightMode(null);
    setTab('home');
  };

  const handleUpdateProfile = async (p) => {
    await saveProfile(p);
    setProfile(p);
  };

  const handleReset = async () => {
    try {
      localStorage.removeItem('bp_profile');
      localStorage.removeItem('bp_history');
    } catch(e) {}
    setProfile(null);
    setHistory([]);
    setTab('home');
  };

  if (!ready) return (
    <div style={{
      minHeight:'100vh', background:C.bg, display:'flex',
      alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16,
    }}>
      <GlobalStyle/>
      <div style={{
        width:48, height:48, border:`3px solid ${C.border}`,
        borderTop:`3px solid ${C.accent}`, borderRadius:24,
        animation:'spin 1s linear infinite',
      }}/>
      <span style={{ color:C.textMuted, fontSize:13, fontFamily:'DM Sans, sans-serif' }}>Loading BizPulse...</span>
    </div>
  );

  return (
    <div style={{
      maxWidth:480, margin:'0 auto', minHeight:'100vh',
      background:C.bg, fontFamily:font.body, position:'relative',
      overflowX:'hidden',
    }}>
      <GlobalStyle/>

      {!profile ? (
        <Onboarding onDone={handleOnboardingDone}/>
      ) : auditMode ? (
        <AuditScreen
          profile={profile}
          onDone={handleAuditDone}
          onBack={() => { setAuditMode(false); setTab('home'); }}
        />
      ) : insightMode ? (
        <InsightScreen
          profile={profile}
          answers={insightMode}
          onDone={handleInsightDone}
        />
      ) : (
        <>
          <div style={{ overflowY:'auto', maxHeight:'100vh', paddingBottom:80 }}>
            {tab === 'home' && (
              <HomeDashboard
                profile={profile}
                history={history}
                onStartAudit={() => setAuditMode(true)}
              />
            )}
            {tab === 'audit' && (
              <div className="screen" style={{ padding:'80px 24px', textAlign:'center' }}>
                <span style={{ fontSize:56 }}>⚡</span>
                <h3 style={{ fontFamily:font.display, color:C.text, marginTop:16, fontSize:26 }}>Siap Audit Hari Ini?</h3>
                <p style={{ color:C.textMuted, marginTop:10, fontSize:14, lineHeight:1.6 }}>
                  5 pertanyaan · ±5 menit · Insight AI langsung setelah selesai
                </p>
                <button className="btn-press" onClick={() => { setAuditMode(true); }} style={{
                  marginTop:32, background:`linear-gradient(135deg, ${C.accent}, ${C.accentLt})`,
                  border:'none', borderRadius:16, padding:'18px 40px',
                  color:C.bg, fontSize:16, fontFamily:font.body, fontWeight:600,
                  cursor:'pointer', boxShadow:`0 6px 30px ${C.accentGlow}`,
                }}>
                  Mulai Audit →
                </button>
              </div>
            )}
            {tab === 'history' && <HistoryScreen history={history}/>}
            {tab === 'settings' && (
              <SettingsScreen profile={profile} onUpdate={handleUpdateProfile} onReset={handleReset}/>
            )}
          </div>
          <BottomNav tab={tab} onChange={setTab}/>
        </>
      )}
    </div>
  );
}
