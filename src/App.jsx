import { useState, useEffect, useRef } from "react";
import earthImg from "./assets/Earth.png";
import logoImg from "./assets/neoCast.png";

export default function App() {
  const [activeTab, setActiveTab] = useState("simulator");
  const [selectedModel, setSelectedModel] = useState("LightGBM");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [stars, setStars] = useState([]);
  const [earthRotation, setEarthRotation] = useState(0);
  const [sliders, setSliders] = useState({
    absolute_magnitude: 10.0,
    estimated_diameter_min: 0.05,
    estimated_diameter_max: 0.10,
    relative_velocity: 20,
    miss_distance: 0.39,
  });

  const simulatorRef = useRef(null);
  const insightsRef = useRef(null);
  const lastScrollY = useRef(0);
  const modelRefs = useRef({});
  const tabRefs = useRef({});
  const [modelIndicator, setModelIndicator] = useState({ top: 0, height: 0 });
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });

  // Generate stars matching Figma spec: white, blur 0.8px, mix-blend-mode screen, varied size/opacity
  useEffect(() => {
    const s = Array.from({ length: 160 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      // Vary size around 3.685px as in Figma
      size: 1.5 + Math.random() * 4.5,
      opacity: 0.15 + Math.random() * 0.7,
      dur: 2 + Math.random() * 5,
      delay: Math.random() * 4,
    }));
    setStars(s);
  }, []);

  // Earth spins on scroll
  useEffect(() => {
    const onScroll = () => {
      const delta = window.scrollY - lastScrollY.current;
      lastScrollY.current = window.scrollY;
      setEarthRotation(prev => prev + delta * 0.04);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
  const measureTab = () => {
    const el = tabRefs.current[activeTab];
    if (el) setTabIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  };
  measureTab();
  // re-measure after fonts/layout settle
  const t = setTimeout(measureTab, 100);
  return () => clearTimeout(t);
  }, [activeTab]);

  useEffect(() => {
    const measureModel = () => {
      const el = modelRefs.current[selectedModel];
      if (el) setModelIndicator({ top: el.offsetTop, height: el.offsetHeight });
    };
    
    measureModel();
    // Tambahin jeda 100ms buat nunggu font Magnetik selesai kerender
    const t = setTimeout(measureModel, 100);
    return () => clearTimeout(t);
  }, [selectedModel]);

  const scrollTo = (tab) => {
    setActiveTab(tab);
    const ref = tab === "simulator" ? simulatorRef : insightsRef;

    if (ref.current) {
      const offset = 120;
      const elementPosition = ref.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const handleSlider = (key, val) => {
    setSliders((prev) => ({ ...prev, [key]: parseFloat(val) }));
  };

  const runPrediction = async () => {
    setLoading(true);
    setResult(null);
    try {
      const missDistanceKm = sliders.miss_distance * 149597870.7;
      const velocityKmH = sliders.relative_velocity;
      const response = await fetch("https://soure-neocast-backend.hf.space/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_type: selectedModel,
          absolute_magnitude: sliders.absolute_magnitude,
          estimated_diameter_min: sliders.estimated_diameter_min,
          estimated_diameter_max: sliders.estimated_diameter_max,
          relative_velocity: velocityKmH,
          miss_distance: missDistanceKm,
        }),
      });
      if (!response.ok) throw new Error("Prediction failed");
      const data = await response.json();
      console.log("MATA-MATA API RESPONSE:", data);
      setResult({
        hazard_probability: data.hazard_prob / 100,
        confidence: data.confidence / 100,
        is_hazardous: data.is_hazardous,
        model_reasoning: data.is_hazardous
          ? "High risk based on asteroid parameters."
          : "Current parameters indicate low hazard risk.",
      });
    } catch (e) {
      setResult({ error: true, message: "Prediction failed. Check API." });
    }
    setLoading(false);
  };

  const models = ["Random Forest", "LightGBM", "XGBoost", "Ensemble"];

  const sliderConfig = [
    { key: "absolute_magnitude", label: "Absolute Magnitude", min: 0, max: 30.0, step: 0.1, fmt: (v) => v.toFixed(1) },
    { key: "estimated_diameter_min", label: "Est. Diameter (Min)", min: 0, max: 2.0, step: 0.01, fmt: (v) => v.toFixed(3) },
    { key: "estimated_diameter_max", label: "Est. Diameter (Max)", min: 0, max: 5.0, step: 0.01, fmt: (v) => v.toFixed(3) },
    { key: "relative_velocity", label: "Relative Velocity (km/h)", min: 0, max: 150000, step: 100, fmt: (v) => v.toFixed(0) },
    { key: "miss_distance", label: "Miss Distance (AU)", min: 0.001, max: 0.5, step: 0.001, fmt: (v) => v.toFixed(3) },
  ];

  const modelStats = [
    { name: "Random Forest", auc: "0.9009", acc: "88.76%", recall: "0.19", f1: "0.30", color: "#AFA9EC" },
    { name: "LightGBM",      auc: "0.9086", acc: "74.84%", recall: "0.80", f1: "0.54", color: "#5DCAA5" },
    { name: "XGBoost",       auc: "0.9080", acc: "82.26%", recall: "0.80", f1: "0.53", color: "#4A9EFF" },
    { name: "Ensemble",      auc: "0.9099", acc: "82.65%", recall: "0.80", f1: "0.54", color: "#EF9F27" },
  ];

  const GaugeDonut = ({ pct }) => {
    const r = 54;
    const circ = 2 * Math.PI * r;
    const filled = (pct / 100) * circ;
    const color = pct > 50 ? "#F45C82" : "#5DCAA5";
    return (
      <svg width="140" height="140" viewBox="0 0 140 140" className="mx-auto">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={`${filled} ${circ}`}
          strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: "stroke-dasharray 1s ease-out" }}
        />
        <text x="70" y="66" textAnchor="middle" fill="white" fontSize="22" fontWeight="700" fontFamily="Inter,sans-serif">{pct}%</text>
        <text x="70" y="85" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="Inter,sans-serif">HAZARD</text>
      </svg>
    );
  };

  return (
    <div className="relative min-h-screen bg-[#02070C] text-white font-inter overflow-x-hidden selection:bg-blue-500/30">

      {/* ── STAR FIELD ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {stars.map(s => (
          <div
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              
              mixBlendMode: "screen",
              filter: "blur(0.8px)",
              opacity: s.opacity,
              animation: `starPulse ${s.dur}s ease-in-out ${s.delay}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* ── HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-[100] px-6 md:px-12 py-5 flex items-center justify-between">
        <img src={logoImg} alt="NeoCast" className="h-9 object-contain select-none" />

        <div className="relative flex items-center gap-1 rounded-full px-2 py-2 border border-white/10 bg-[#16212e]/60 backdrop-blur-md">
        <div
          className="absolute top-2 bottom-2 bg-white/90 rounded-full transition-all duration-300 ease-out"
          style={{ left: tabIndicator.left, width: tabIndicator.width }}
        />
          {["simulator", "insights"].map(tab => (
            <button
              key={tab}
              ref={el => (tabRefs.current[tab] = el)}
              onClick={() => scrollTo(tab)}
              className={`
                relative z-10 px-5 py-1.5 rounded-full text-[13px] transition-colors duration-300 cursor-pointer
                ${activeTab === tab
                  ? "text-[#02070C] font-medium font-magnetik"
                  : "text-white/50 hover:text-white font-light font-magnetik"}
              `}
            >
              {tab === "simulator" ? "Simulator" : "Data Insights"}
            </button>
          ))}
        </div>
        <div className="w-[100px] hidden md:block" />
      </header>

      {/* ── HERO ── */}
      <section className="min-h-screen flex flex-col items-center relative pt-[20vh] md:pt-[22vh]">
        {/* Text content */}
        <div className="relative z-10 text-center px-5 max-w-[750px]">
          <h1 className="text-[clamp(42px,6.5vw,80px)] font-regular leading-[1.1] mb-6 text-white tracking-tight font-magnetik">
            Cosmic Threat Predictor
          </h1>
          <p className="text-[clamp(14px,1.5vw,16px)] text-white/60 leading-relaxed mb-10 max-w-[520px] mx-auto font-light font-magnetik">
            An interactive machine learning study comparing how different algorithms predict hazardous asteroids using NASA datasets.
          </p>
          <button
            onClick={() => scrollTo("simulator")}
            className="px-10 py-3.5 rounded-[50px] border border-[#2B9FFF]/30 cursor-pointer font-regular font-magnetik text-[14px] tracking-wide bg-gradient-to-b from-[#1C4E8A] to-[#0F294A] text-white shadow-[0_0_20px_rgba(43,159,255,0.2)] hover:shadow-[0_0_30px_rgba(43,159,255,0.35)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            Run Simulator
          </button>
        </div>


        {/* Earth — spins on scroll */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-[70%] w-[180vw] md:w-[120vw] z-0 pointer-events-none select-none">
          {/* Glow ring behind earth */}
          <div className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(ellipse at center, rgba(43,159,255,0.12) 0%, transparent 70%)" }}
          />
          <img  
            src={earthImg}
            alt="Earth"
            className="w-full object-contain"
            style={{
              transform: `rotate(${earthRotation}deg)`,
              transition: "transform 0.05s linear",
              filter: "drop-shadow(0 0 60px rgba(43,159,255,0.18))",
            }}
          />
        </div>
      </section>

      {/* ── SIMULATOR ── */}
      <section id="simulator" className="px-5 md:px-10 pt-[150vh] pb-20 relative z-10">
        <h2 ref={simulatorRef} className="text-center text-[30px] font-regular font-magnetik mb-12 tracking-tight">Simulator</h2>
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-6 items-start">

          {/* LEFT — Controls */}
          <div className="glass-panel p-8 md:p-10">
            <p className="text-[18px] tracking-[2px] text-white/80 mb-5 font-light font-magnetik tracking-[0.5px]">Models</p>
            <div className="flex flex-col gap-4 mb-9 border-l-[1.5px] border-white/10 pl-4 relative">
              <span
                className="absolute -left-[2px] w-[3px] bg-white rounded-full transition-all duration-300 ease-out"
                style={{ 
                  top: modelIndicator.top + (modelIndicator.height / 3) - 4, height: 16 }}
              />
              {models.map(m => (
                <button
                  key={m}
                  ref={el => (modelRefs.current[m] = el)}
                  onClick={() => setSelectedModel(m)}
                  className={`flex items-center text-left text-[13.5px] transition-all duration-200 relative cursor-pointer py-1
                    ${selectedModel === m ? "text-white font-medium font-magnetik" : "text-white/40 font-light font-magnetik hover:text-white/70"}`}
                >
                  {m}
                </button>
              ))}
            </div>

            <p className="text-[18px] tracking-[0.5px] text-white/80 mb-5 font-light font-magnetik">Settings</p>
            <div className="flex flex-col gap-6 mb-9">
              {sliderConfig.map((sc) => (
                <div key={sc.key}>
                  <div className="flex justify-between mb-2.5">
                    <span className="text-[12px] text-white/50 font-light font-magnetik tracking-[0.5px]">{sc.label}</span>
                    <span className="text-[12px] text-white font-regular font-magnetik tabular-nums">{sc.fmt(sliders[sc.key])}</span>
                  </div>
                  <input
                    type="range" min={sc.min} max={sc.max} step={sc.step}
                    value={sliders[sc.key]} onChange={e => handleSlider(sc.key, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={runPrediction}
              disabled={loading}
              className={`w-full py-3.5 rounded-[50px] border border-[#2B9FFF]/30 font-magnetik font-medium text-[14px] tracking-wide transition-all duration-200
                ${loading
                  ? "bg-[#16293E] text-white/40 cursor-not-allowed"
                  : "bg-gradient-to-b from-[#1C4E8A] to-[#0F294A] text-white cursor-pointer shadow-[0_0_20px_rgba(43,159,255,0.15)] hover:shadow-[0_0_30px_rgba(43,159,255,0.3)] hover:-translate-y-0.5 active:translate-y-0"
                }`}
            >
              {loading ? <span className="inline-block animate-pulse tracking-widest">· · ·</span> : "Run"}
            </button>
          </div>

          {/* RIGHT — Results */}
          <div className="glass-box p-8 md:p-10 min-h-[580px] flex flex-col items-center justify-center relative overflow-hidden">
            {!result && !loading && (
              <p className="text-white/35 italic text-[14px] font-light font-magnetik">Awaiting parameters...</p>
            )}
            {loading && (
              <p className="text-white/55 italic text-[14px] font-light font-magnetik">Simulating prediction...</p>
            )}
            {result && !result.error && (
              <div className="text-center w-full">
                <p className="text-[15px] tracking-[1px] text-white/60 mb-5 font-light font-magnetik">{selectedModel} Model Result</p>
                <div
                  className={`text-[clamp(18px,2.8vw,26px)] font-semibold font-magnetik mb-6 tracking-wide ${result.is_hazardous ? "text-[#F45C82]" : "text-[#5DCAA5]"}`}
                  style={{ textShadow: `0 0 24px ${result.is_hazardous ? "rgba(244,92,130,0.5)" : "rgba(93,202,165,0.5)"}` }}
                >
                  {result.is_hazardous ? "⚠ HAZARDOUS" : "✓ SAFE"}
                </div>
                <div className="flex justify-center mb-7">
                  <GaugeDonut pct={Math.round((result.hazard_probability || 0) * 100)} />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-7 max-w-sm mx-auto">
                  {[["Hazard Prob.", `${Math.round((result.hazard_probability || 0) * 100)}%`],
                    ["Confidence",  `${Math.round((result.confidence || 0) * 100)}%`]].map(([label, val]) => (
                    <div key={label} className="bg-white/[0.025] border border-white/5 rounded-2xl py-4 px-2 text-center">
                      <p className="text-[10px] text-white/40 mb-1 font-light">{label}</p>
                      <p className="text-[20px] font-semibold font-magnetik tracking-[0.5px] text-white tabular-nums">{val}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[13px] text-white/45 italic leading-relaxed px-4 max-w-sm mx-auto font-light font-magnetik tracking-[0.5px]">
                  "{result.model_reasoning}"
                </p>
              </div>
            )}
            {result?.error && (
              <p className="text-[#F45C82] italic text-sm font-light font-magnetik">{result.message}</p>
            )}
            {/* Background orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#2B9FFF]/4 rounded-full blur-[90px] pointer-events-none -z-10" />
          </div>
        </div>
      </section>

      {/* ── DATA INSIGHTS ── */}
      <section id="insights" ref={insightsRef} className="px-5 md:px-10 pt-[10vh] pb-32 relative z-10">
        <h2 className="text-center text-[30px] font-regular font-magnetik tracking-[0.5px] mb-12 tracking-tight">Data Insights</h2>
        <div className="max-w-[1000px] mx-auto flex flex-col gap-6">

          {/* Stat cards */}
          <div className="flex flex-col md:flex-row gap-4">
            {[
              ["338,171", "Records"],
              ["~12.76%", "Hazardous"],
              ["HuggingFace", "Source"],
              ["5", "Features"]
            ].map(([v, l]) => (
              <div key={l} className="flex-1 glass-box p-6 hover:bg-white/[0.03] transition-colors">
                {l === "Source" ? (
                  <a
                    href="https://huggingface.co/datasets/IvanSher/NASA_Nearest_Earth_Objects_1910-2024"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-[22px] font-regular font-magnetik tracking-[0.5px] text-white mb-1 tracking-tight underline decoration-white/30 hover:decoration-white transition-all underline-offset-4 cursor-pointer"
                  >
                    {v} ↗
                  </a>
                ) : (
                  <p className="text-[22px] font-regular font-magnetik tracking-[0.5px] text-white mb-1 tracking-tight">
                    {v}
                  </p>
                )}
                
                <p className="text-[15px] text-white/40 font-light font-magnetik">{l}</p>
              </div>
            ))}
          </div>

          {/* Model table */}
          <div className="glass-panel p-8 md:p-10">
            <h3 className="text-[15px] font-semibold font-magnetik mb-7 tracking-[0.5px] text-white">Model Performance</h3>
            <div className="overflow-x-auto pb-2">
              <table className="w-full text-left border-collapse min-w-[560px]">
                <thead>
                  <tr>
                    {["Model","ROC-AUC","Accuracy","Recall (Hazardous)","F1"].map(h => (
                      <th key={h} className="py-3.5 px-4 text-white/35 text-[10.5px] uppercase tracking-[1px] font-light font-magnetik border-b border-white/[0.06]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modelStats.map((m) => (
                    <tr key={m.name} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                      <td className="py-4 px-4 font-medium font-magnetik flex items-center text-[13px] text-white gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                        {m.name}
                      </td>
                      <td className={`py-4 px-4 text-[13px] tabular-nums ${m.auc === "0.9099" ? "text-white font-bold font-magnetik" : "text-white/55 font-light font-magnetik"}`}>{m.auc}</td>
                      <td className="py-4 px-4 text-white/55 font-light font-magnetik text-[13px] tabular-nums">{m.acc}</td>
                      <td className={`py-4 px-4 text-[13px] tabular-nums ${parseFloat(m.recall) >= 0.80 ? "text-[#5DCAA5] font-medium" : "text-white/35 font-light font-magnetik"}`}>{m.recall}</td>
                      <td className="py-4 px-4 text-white/55 font-light font-magnetik text-[13px] tabular-nums">{m.f1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 p-5 bg-white/[0.02] rounded-xl border border-white/5">
              <p className="text-[13px] text-white/50 leading-relaxed font-light font-magnetik">
                Boosting models pushed hazardous recall from <strong className="text-white font-medium font-magnetik tracking-[0.5px]">19% → 80%</strong>, meaning 4× fewer dangerous asteroids go undetected. All boosted models use <code className="text-[#FFFFFF]/100 text-[13px] bg-black/20 px-1.5 py-0.5 rounded font-magnetik tracking-[0.5px]">scale_pos_weight=3</code> to handle the 12.76% class imbalance. The Ensemble achieves the best overall AUC of <strong className="text-white font-medium font-magnetik tracking-[0.5px]">0.9099</strong>.
              </p>
            </div>
          </div>

          {/* Key insight */}
          <div className="glass-panel p-8 md:p-10">
            <p className="text-[15px] tracking-[0.5px] text-white/35  mb-4 font-regular font-magnetik">Key Insight</p>
            <p className="text-[12px] text-white/55 leading-relaxed font-light max-w-4xl">
              Across all models, <strong className="text-white font-medium font-magnetik">absolute magnitude</strong> (inversely proportional to size) and <strong className="text-white font-medium">relative velocity</strong> are the strongest predictors of asteroid hazard. Miss distance matters too, though oddly, a fast-moving object can still get flagged as hazardous even if it's relatively far away
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="text-center px-5 pt-8 pb-14 text-white/25 text-[11.5px] relative z-10 font-light font-magnetik border-t border-white/[0.05]">
        Built with React · NASA NEO Dataset 1910–2024 · scikit-learn, LightGBM, XGBoost
      </footer>

      {/* Global star animation keyframe */}
      <style>{`
        @keyframes starPulse {
          from { opacity: 0.08; }
          to   { opacity: 0.75; }
        }
      `}</style>
    </div>
  );
}
