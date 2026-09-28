import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Clock3,
  Copy,
  Instagram,
  MessageCircle,
  RefreshCw,
  Share2,
  Sparkles,
  Upload,
  Video,
  X,
} from 'lucide-react';
import type { Goal, SmileAnalysis, Step } from '@/types';
import { analyzeSmile, buildWhatsAppLink } from '@/lib/analysisClient';

const goals: Array<{ id: Goal; label: string; detail: string }> = [
  { id: 'whiter', label: 'Dientes más blancos', detail: 'Luminosidad y tono' },
  { id: 'alignment', label: 'Mejor alineación', detail: 'Orden visual' },
  { id: 'shape', label: 'Forma o proporción', detail: 'Equilibrio' },
  { id: 'harmony', label: 'Sonrisa más armónica', detail: 'Armonía general' },
  { id: 'health', label: 'Salud y limpieza', detail: 'Cuidado' },
  { id: 'guide', label: 'Quiero orientación', detail: 'Una mirada general' },
];

const profileByGoal: Record<Goal, { name: string; description: string; priorities: string[] }> = {
  whiter: { name: 'LUMINOUS BALANCE', description: 'Te atrae una sonrisa luminosa, fresca y cuidada, con un resultado que se sienta auténticamente tuyo.', priorities: ['Luminosidad', 'Naturalidad', 'Cuidado'] },
  alignment: { name: 'NATURAL CONFIDENCE', description: 'Buscas una sonrisa natural, limpia y armónica sin perder aquello que te hace reconocible.', priorities: ['Naturalidad', 'Armonía', 'Orden visual'] },
  shape: { name: 'BALANCED SIGNATURE', description: 'Tu mirada está en los detalles: proporción, equilibrio y una sonrisa que acompañe tus rasgos.', priorities: ['Proporción', 'Armonía', 'Naturalidad'] },
  harmony: { name: 'NATURAL CONFIDENCE', description: 'Buscas una sonrisa natural, limpia y armónica sin perder aquello que te hace reconocible.', priorities: ['Naturalidad', 'Armonía', 'Luminosidad'] },
  health: { name: 'FRESH FOUNDATION', description: 'Para ti, una sonrisa bonita empieza por sentirse limpia, fresca y saludable todos los días.', priorities: ['Cuidado', 'Frescura', 'Naturalidad'] },
  guide: { name: 'OPEN EXPLORER', description: 'Estás empezando a descubrir tus posibilidades y valoras una guía clara, cercana y personalizada.', priorities: ['Descubrimiento', 'Armonía', 'Naturalidad'] },
};

const variantsByGoal: Record<Goal, string[]> = {
  whiter: ['Soft Radiance', 'Balanced Radiance', 'Brightness Focus'],
  alignment: ['Natural Balance', 'Visual Order', 'Harmony Focus'],
  shape: ['Soft Proportion', 'Balanced Form', 'Refined Balance'],
  harmony: ['Natural Balance', 'Soft Harmony', 'Signature Harmony'],
  health: ['Fresh Balance', 'Clean & Natural', 'Bright Freshness'],
  guide: ['Natural Explorer', 'Harmony Explorer', 'Radiance Explorer'],
};

function levelFromScore(score: number): { level: string; dots: number } {
  if (score >= 90) return { level: 'Alta', dots: 5 };
  if (score >= 80) return { level: 'Equilibrada', dots: 4 };
  if (score >= 70) return { level: 'Moderada', dots: 3 };
  if (score >= 60) return { level: 'Suave', dots: 2 };
  return { level: 'Inicial', dots: 1 };
}

function calculateAnalysisResults(base: [number, number, number], importance: number): [number, number, number] {
  const shifts: Record<number, [number, number, number]> = {
    1: [-4, -2, 6],
    2: [5, -3, -2],
    3: [0, 0, 0],
    4: [-2, 5, -3],
    5: [-3, -1, 4],
  };
  const [s0, s1, s2] = shifts[importance] ?? [0, 0, 0];
  return [
    Math.max(1, Math.min(100, base[0] + s0)),
    Math.max(1, Math.min(100, base[1] + s1)),
    Math.max(1, Math.min(100, base[2] + s2)),
  ];
}

function calculateVariantIndex(scores: [number, number, number]): number {
  const [nat, arm, bri] = scores;
  const max = Math.max(nat, arm, bri);
  if (max === nat) return 0;
  if (max === arm) return 1;
  return 2;
}

const baseScores: Record<Goal, [number, number, number]> = {
  whiter: [86, 91, 82],
  alignment: [92, 86, 78],
  shape: [88, 90, 84],
  harmony: [92, 86, 78],
  health: [94, 82, 80],
  guide: [84, 87, 81],
};

const attributeLabels = ['Naturalidad', 'Armonía', 'Luminosidad'];

const analysisTitles: Record<Goal, string> = {
  whiter: 'Tu sonrisa desde la luminosidad',
  alignment: 'Tu sonrisa desde el orden visual',
  shape: 'Las proporciones de tu sonrisa',
  harmony: 'El equilibrio visual de tu sonrisa',
  health: 'Tu sonrisa desde la limpieza',
  guide: 'Lo que observamos en tu sonrisa',
};

function App() {
  const [step, setStep] = useState<Step>('welcome');
  const [photo, setPhoto] = useState<string | null>(null);
  const [goal, setGoal] = useState<Goal>('harmony');
  const [importance, setImportance] = useState(4);
  const [showVisualization, setShowVisualization] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [analysis, setAnalysis] = useState<SmileAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const profile = useMemo(() => profileByGoal[goal], [goal]);
  const analysisResults = useMemo(() => calculateAnalysisResults(baseScores[goal], importance), [goal, importance]);
  const variantIndex = useMemo(() => calculateVariantIndex(analysisResults), [analysisResults]);
  const variant = useMemo(() => variantsByGoal[goal][variantIndex], [goal, variantIndex]);

  const attributes = useMemo(() => {
    return analysisResults.map((score, i) => {
      const { level, dots } = levelFromScore(score);
      return { label: attributeLabels[i], level, dots };
    });
  }, [analysisResults]);

  const shareText = `Mi Smile Profile es ${profile.name} ✦\n\nDescubre el tuyo en ODEA Smile Check`;

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setPhoto(URL.createObjectURL(file));
  };

  const beginGeneration = () => {
    setStep('generating');
    window.setTimeout(() => setStep('profile'), 3600);
  };

  const copyReferral = async () => {
    await navigator.clipboard?.writeText('odea.pe/smile-profile/natural-confidence');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const reset = () => {
    setStep('welcome');
    setPhoto(null);
    setShowVisualization(false);
    setShowShare(false);
    setContactSent(false);
    setAnalysis(null);
    setAnalysisError(null);
  };

  const runAnalysis = async (selectedGoal: Goal, imp: number) => {
    if (!photo) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    setStep('analyzing');
    try {
      const result = await analyzeSmile(photo, selectedGoal, imp);
      setAnalysis(result);
      setStep('analysis');
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Error en el análisis');
      setStep('analysis');
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-mark" onClick={reset} aria-label="Volver al inicio">
          <span className="brand-wordmark"><Sparkles size={16} /><strong>ODEA</strong></span>
          <span className="brand-tagline">ODONTOLOGÍA ESTÉTICA AVANZADA</span>
          <span className="brand-slogan">Tu tiempo importa, tu salud dental también</span>
        </button>
        <div className="topbar-note"><span className="live-dot" /> Experiencia privada · 60 segundos</div>
      </header>

      {step === 'welcome' && <Welcome onStart={() => setStep('photo')} />}
      {step === 'photo' && <PhotoStep photo={photo} onPhoto={handlePhoto} onNext={() => setStep('consent')} onBack={() => setStep('welcome')} />}
      {step === 'consent' && <ConsentStep photo={photo} onNext={() => setStep('goal')} onBack={() => setStep('photo')} />}
      {step === 'goal' && <GoalStep goal={goal} importance={importance} onGoal={setGoal} onImportance={setImportance} onNext={beginGeneration} onBack={() => setStep('consent')} />}
      {step === 'generating' && <Generating />}
      {step === 'profile' && (
        <ProfileResult
          profileName={profile.name}
          variant={variant}
          description={profile.description}
          attributes={attributes}
          priorities={profile.priorities}
          photo={photo}
          showVisualization={showVisualization}
          onVisualization={() => setShowVisualization(true)}
          onShare={() => setShowShare(true)}
          onAnalyze={() => setStep('analyzeGoal')}
          onReset={reset}
        />
      )}
      {step === 'analyzeGoal' && (
        <AnalyzeGoalStep
          photo={photo}
          goal={goal}
          importance={importance}
          onGoal={setGoal}
          onImportance={setImportance}
          onNext={() => runAnalysis(goal, importance)}
          onBack={() => setStep('profile')}
        />
      )}
      {step === 'analyzing' && <Analyzing />}
      {step === 'analysis' && analysis && (
        <AnalysisResult
          analysis={analysis}
          photo={photo}
          onContact={() => setStep('contact')}
          onAnotherAspect={() => setStep('analyzeGoal')}
          onBackToProfile={() => setStep('profile')}
        />
      )}
      {step === 'analysis' && !analysis && analysisError && (
        <AnalysisError error={analysisError} onRetry={() => setStep('analyzeGoal')} onBack={() => setStep('profile')} />
      )}
      {step === 'contact' && <ContactStep sent={contactSent} onSubmit={() => setContactSent(true)} onBack={() => setStep('analysis')} />}

      <footer className="site-footer">
        <div className="footer-brand">
          <span className="brand-wordmark"><Sparkles size={16} /><strong>ODEA</strong></span>
          <span className="brand-tagline">ODONTOLOGÍA ESTÉTICA AVANZADA</span>
        </div>
        <div className="footer-links">
          <a href="https://wa.me/51950239644" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de Clínica ODEA"><MessageCircle size={16} /> WhatsApp</a>
          <a href="https://www.instagram.com/clinicaodea/" target="_blank" rel="noopener noreferrer" aria-label="Instagram de Clínica ODEA"><Instagram size={16} /> Instagram</a>
        </div>
        <div className="footer-doctor">
          <div className="doctor-info">
            <strong>Dra. Daniela Morales Quintero</strong>
            <span>Odontóloga · COP: 57011</span>
          </div>
          <a className="doctor-whatsapp" href="https://wa.me/51950239644" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de Clínica ODEA"><MessageCircle size={15} /> Hablar por WhatsApp</a>
        </div>
        <p className="footer-note">Una experiencia educativa de ODEA · No es un diagnóstico ni garantiza resultados clínicos.</p>
      </footer>

      {showShare && <SharePanel copied={copied} onCopy={copyReferral} onClose={() => setShowShare(false)} shareText={shareText} profileName={profile.name} />}
    </main>
  );
}

function Progress({ active }: { active: number }) {
  return <div className="progress" aria-label={`Paso ${active} de 3`}>{[1, 2, 3].map((item) => <span key={item} className={item <= active ? 'active' : ''} />)}</div>;
}

function Welcome({ onStart }: { onStart: () => void }) {
  return <section className="hero-screen fade-in">
    <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
    <div className="hero-copy">
      <p className="eyebrow"><Sparkles size={14} /> ODEA SMILE CHECK</p>
      <h1>Descubre tu<br /><em>Smile Profile</em><br /><span>en 60 segundos.</span></h1>
      <p className="hero-subtitle">Sube una foto, cuéntanos qué te gustaría mejorar y recibe una orientación estética pensada para ti.</p>
      <button className="primary-button" onClick={onStart}>Descubrir mi Smile Profile <ArrowRight size={18} /></button>
      <div className="trust-row"><span><Check size={15} /> Sin registro</span><span><Clock3 size={15} /> 1 minuto</span><span><Sparkles size={15} /> Personalizado</span></div>
    </div>
    <div className="hero-card">
      <div className="card-glow" />
      <div className="profile-preview-top"><span>ODEA</span><small>SMILE CHECK / 60 SEC</small></div>
      <div className="preview-badge"><Sparkles size={15} /> TU PERFIL ESTÁ LISTO</div>
      <div className="preview-profile-title">NATURAL<br /><em>CONFIDENCE</em></div>
      <p className="preview-copy">Una sonrisa natural, limpia y armónica, pensada para seguir sintiéndose tuya.</p>
      <div className="preview-metrics"><div><strong>92%</strong><span>Naturalidad</span></div><div><strong>86%</strong><span>Armonía</span></div><div><strong>78%</strong><span>Brillo</span></div></div>
      <span className="preview-stamp">01 / 03 · ORIENTACIÓN ESTÉTICA</span>
    </div>
  </section>;
}

function PhotoStep({ photo, onPhoto, onNext, onBack }: { photo: string | null; onPhoto: (event: ChangeEvent<HTMLInputElement>) => void; onNext: () => void; onBack: () => void }) {
  return <section className="flow-screen fade-in"><div className="flow-header"><button className="back-button" onClick={onBack}><ChevronLeft size={18} /> Atrás</button><Progress active={1} /><span className="step-count">01 / 03</span></div>
    <div className="flow-content photo-layout"><div className="flow-intro"><p className="eyebrow">PRIMERO, CONOCÉMONOS</p><h2>Una sonrisa dice<br /><em>muchísimo de ti.</em></h2><p>Sube una fotografía frontal sonriendo para personalizar tu experiencia.</p><div className="photo-tips"><span><Check size={15} /> Buena iluminación</span><span><Check size={15} /> Mirada de frente</span><span><Check size={15} /> Sonrisa natural</span><span><Check size={15} /> Sin filtros</span></div></div>
      <label className={`upload-card ${photo ? 'has-photo' : ''}`}>{photo ? <img src={photo} alt="Tu fotografía seleccionada" /> : <div className="upload-empty"><div className="upload-icon"><Upload size={22} /></div><strong>Sube tu foto</strong><span>Arrastra o selecciona una imagen</span><small>JPG, PNG · Máx. 10 MB</small></div>}<input type="file" accept="image/jpeg,image/png" onChange={onPhoto} /></label>
    </div><div className="privacy-line"><span><Check size={15} /> Tu fotografía se utiliza únicamente para crear tu experiencia personalizada.</span><button className="primary-button compact" onClick={onNext} disabled={!photo}>Continuar <ArrowRight size={17} /></button></div>
  </section>;
}

function ConsentStep({ photo, onNext, onBack }: { photo: string | null; onNext: () => void; onBack: () => void }) {
  return <section className="flow-screen fade-in">
    <div className="flow-header"><button className="back-button" onClick={onBack}><ChevronLeft size={18} /> Atrás</button><Progress active={1} /><span className="step-count">01 / 03</span></div>
    <div className="flow-content consent-layout">
      <div className="flow-intro">
        <p className="eyebrow">TU PRIVACIDAD IMPORTA</p>
        <h2>¿Podemos utilizar<br /><em>tu fotografía?</em></h2>
        <p>Para crear tu Smile Profile y posteriormente poder realizar una orientación visual personalizada, necesitamos tu consentimiento.</p>
        <div className="consent-points">
          <span><Check size={15} /> Tu foto se usa para generar tu perfil estético</span>
          <span><Check size={15} /> No se comparte en redes sin tu permiso explícito</span>
          <span><Check size={15} /> No se envía automáticamente por WhatsApp</span>
          <span><Check size={15} /> Puedes borrarla en cualquier momento</span>
        </div>
      </div>
      {photo && <div className="consent-preview"><img src={photo} alt="Vista previa" /></div>}
    </div>
    <div className="privacy-line"><span><Check size={15} /> No almacenamos tu fotografía permanentemente.</span><button className="primary-button compact" onClick={onNext}>Acepto y continúo <ArrowRight size={17} /></button></div>
  </section>;
}

function GoalStep({ goal, importance, onGoal, onImportance, onNext, onBack }: { goal: Goal; importance: number; onGoal: (goal: Goal) => void; onImportance: (value: number) => void; onNext: () => void; onBack: () => void }) {
  return <section className="flow-screen fade-in"><div className="flow-header"><button className="back-button" onClick={onBack}><ChevronLeft size={18} /> Atrás</button><Progress active={2} /><span className="step-count">02 / 03</span></div><div className="goal-content"><p className="eyebrow">AHORA, TU MIRADA</p><h2>Si pudieras cambiar<br /><em>una sola cosa…</em></h2><p>¿Qué elegirías para tu sonrisa?</p><div className="goal-grid">{goals.map((item) => <button key={item.id} className={`goal-card ${goal === item.id ? 'selected' : ''}`} onClick={() => onGoal(item.id)}><span className="goal-number">0{goals.indexOf(item) + 1}</span><strong>{item.label}</strong><small>{item.detail}</small>{goal === item.id && <Check className="selected-check" size={17} />}</button>)}</div><div className="importance"><div><strong>¿Qué tan importante es para ti?</strong><span>Tu respuesta nos ayuda a conocerte mejor.</span></div><div className="scale">{[1, 2, 3, 4, 5].map((item) => <button key={item} className={importance === item ? 'selected' : ''} onClick={() => onImportance(item)}>{item}</button>)}</div><div className="scale-labels"><span>No tanto</span><span>Muchísimo</span></div></div></div><div className="privacy-line goal-action"><span>Orientación estética, no diagnóstico clínico.</span><button className="primary-button compact" onClick={onNext}>Crear mi perfil <Sparkles size={17} /></button></div></section>;
}

function Generating() {
  const messages = ['Analizando tus preferencias…', 'Creando tu Smile Profile…', 'Preparando tus recomendaciones…'];
  const [message, setMessage] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setMessage((current) => (current + 1) % messages.length), 1000);
    return () => window.clearInterval(timer);
  }, [messages.length]);
  return <section className="generating-screen fade-in"><div className="generation-ring"><div className="ring-inner"><Sparkles size={28} /></div></div><p className="eyebrow">ODEA AI / SMILE CHECK</p><h2>{messages[message]}</h2><p>Una mirada estética a tus preferencias<br />para ayudarte a conversar mejor.</p><div className="loading-bar"><span /></div></section>;
}

function Analyzing() {
  return <section className="generating-screen fade-in"><div className="generation-ring"><div className="ring-inner"><Sparkles size={28} /></div></div><p className="eyebrow">ANÁLISIS VISUAL PERSONALIZADO</p><h2>Analizando tu sonrisa…</h2><p>Observando tu fotografía con detenimiento<br />para preparar tu orientación personalizada.</p><div className="loading-bar"><span /></div></section>;
}

function ProfileResult({ profileName, variant, description, attributes, priorities, photo, showVisualization, onVisualization, onShare, onAnalyze, onReset }: {
  profileName: string;
  variant: string;
  description: string;
  attributes: { label: string; level: string; dots: number }[];
  priorities: string[];
  photo: string | null;
  showVisualization: boolean;
  onVisualization: () => void;
  onShare: () => void;
  onAnalyze: () => void;
  onReset: () => void;
}) {
  return <section className="result-screen fade-in">
    <div className="result-top">
      <button className="back-button" onClick={onReset}><RefreshCw size={16} /> Repetir experiencia</button>
      <span className="result-meta">SMILE PROFILE / 2026</span>
      <button className="share-top" onClick={onShare}><Share2 size={16} /> Compartir</button>
    </div>
    <div className="result-heading">
      <p className="eyebrow">ESTE ES TU SMILE PROFILE</p>
      <h2>{profileName}</h2>
      <span className="profile-variant">{variant}</span>
      <p>{description}</p>
    </div>
    <div className="profile-card">
      <div className="profile-card-top"><div><span>ODEA</span><small>SMILE CHECK</small></div><span>01 — 03</span></div>
      <div className="profile-card-main">
        <div className="profile-art">{photo && <img src={photo} alt="Foto del perfil" />}<div className="art-overlay"><Sparkles size={17} /> Tu firma natural</div></div>
        <div className="score-list">
          {attributes.map((attr, index) => (
            <div className="score-item" key={attr.label}>
              <div><span>{attr.label.toUpperCase()}</span><strong>{attr.level}</strong></div>
              <div className="score-dots">{[1, 2, 3, 4, 5].map((d) => <span key={d} className={d <= attr.dots ? 'filled' : ''} />)}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="profile-card-bottom"><span>ORIENTACIÓN ESTÉTICA PERSONALIZADA</span><span>ODEA / TU TIEMPO IMPORTA, TU SALUD DENTAL TAMBIÉN</span></div>
    </div>
    <div className="priorities">
      <div>
        <p className="eyebrow">TUS 3 PRIORIDADES</p>
        <div className="priority-list">{priorities.map((item, index) => <span key={item}><b>0{index + 1}</b> {item}</span>)}</div>
      </div>
      <div className="educational-note"><Sparkles size={17} /><p>En una consulta con ODEA podrías conversar con un profesional sobre alternativas compatibles con estas preferencias.</p></div>
    </div>
    <p className="profile-disclaimer">Tu Smile Profile es una interpretación estética y compartible de tu sonrisa. No constituye una evaluación clínica.</p>
    <div className="result-actions">
      <button className="primary-button" onClick={onShare}><Share2 size={17} /> Compartir mi Smile Profile</button>
      <button className="secondary-button" onClick={onVisualization}>{showVisualization ? 'Visualización activada' : 'Ver simulación'} <ArrowRight size={16} /></button>
    </div>
    {showVisualization && <div className="visualization-note fade-in"><div className="visual-slider"><span>ORIGINAL</span><span>VISUALIZACIÓN</span><div /></div><p>SIMULACIÓN VISUAL — NO REPRESENTA UN RESULTADO CLÍNICO GARANTIZADO</p></div>}
    <div className="weekly-card"><div><p className="eyebrow">ODEA / CURIOSIDAD SEMANAL</p><h3>¿El carbón realmente blanquea los dientes?</h3></div><span className="true-false">VERDADERO / FALSO</span></div>
    <button className="reel-button"><Video size={17} /> Convierte mi resultado en Reel</button>

    <div className="analyze-cta-section">
      <p className="eyebrow">¿QUIERES IR UN POCO MÁS ALLÁ?</p>
      <h3>Conoce tu sonrisa con más detalle.</h3>
      <p>Tu Smile Profile muestra el lado más personal de tu sonrisa. Si quieres entender mejor un aspecto específico, podemos realizar una orientación visual basada en tu fotografía.</p>
      <button className="primary-button analyze-cta-button" onClick={onAnalyze}>Analizar mi sonrisa <ArrowRight size={18} /></button>
      <p className="analyze-cta-sub">Elige qué aspecto te gustaría conocer mejor.</p>
    </div>
  </section>;
}

function AnalyzeGoalStep({ photo, goal, importance, onGoal, onImportance, onNext, onBack }: { photo: string | null; goal: Goal; importance: number; onGoal: (goal: Goal) => void; onImportance: (value: number) => void; onNext: () => void; onBack: () => void }) {
  return <section className="flow-screen fade-in">
    <div className="flow-header"><button className="back-button" onClick={onBack}><ChevronLeft size={18} /> Volver a mi perfil</button><Progress active={2} /><span className="step-count">02 / 03</span></div>
    <div className="goal-content">
      <p className="eyebrow">ORIENTACIÓN PERSONALIZADA</p>
      <h2>¿Qué te gustaría conocer<br /><em>mejor de tu sonrisa?</em></h2>
      <p>Elige un aspecto y realizaremos una orientación visual basada en tu fotografía.</p>
      <div className="goal-grid">{goals.map((item) => <button key={item.id} className={`goal-card ${goal === item.id ? 'selected' : ''}`} onClick={() => onGoal(item.id)}><span className="goal-number">0{goals.indexOf(item) + 1}</span><strong>{item.label}</strong><small>{item.detail}</small>{goal === item.id && <Check className="selected-check" size={17} />}</button>)}</div>
      <div className="importance"><div><strong>¿Qué tan importante es para ti?</strong><span>Esta escala representa tu interés, no modifica el análisis visual.</span></div><div className="scale">{[1, 2, 3, 4, 5].map((item) => <button key={item} className={importance === item ? 'selected' : ''} onClick={() => onImportance(item)}>{item}</button>)}</div><div className="scale-labels"><span>No tanto</span><span>Muchísimo</span></div></div>
    </div>
    <div className="privacy-line goal-action">
      <span>El análisis se realiza sobre tu fotografía. No es un diagnóstico clínico.</span>
      <button className="primary-button compact" onClick={onNext} disabled={!photo}>Analizar mi sonrisa <Sparkles size={17} /></button>
    </div>
  </section>;
}

function AnalysisResult({ analysis, photo, onContact, onAnotherAspect, onBackToProfile }: { analysis: SmileAnalysis; photo: string | null; onContact: () => void; onAnotherAspect: () => void; onBackToProfile: () => void }) {
  if (!analysis.imageQuality.usable) {
    return <section className="result-screen fade-in">
      <div className="result-top"><button className="back-button" onClick={onBackToProfile}><ChevronLeft size={18} /> Volver a mi perfil</button></div>
      <div className="analysis-bad-photo">
        <div className="analysis-bad-icon"><Sparkles size={28} /></div>
        <p className="eyebrow">ORIENTACIÓN PERSONALIZADA</p>
        <h2>Necesitamos ver tu sonrisa un poco mejor.</h2>
        <p>{analysis.imageQuality.reason || 'Para darte una orientación más útil, intenta tomar una fotografía frontal, con buena iluminación y mostrando tu sonrisa de forma natural.'}</p>
        <button className="primary-button" onClick={onBackToProfile}>Tomar otra fotografía <ArrowRight size={18} /></button>
      </div>
    </section>;
  }

  const waLink = buildWhatsAppLink(analysis.whatsappSummary);
  const title = analysisTitles[(analysis.selectedGoal || '').toLowerCase().replace(/ /g, '') as Goal] || 'Lo que observamos en tu sonrisa';

  return <section className="result-screen fade-in">
    <div className="result-top">
      <button className="back-button" onClick={onBackToProfile}><ChevronLeft size={18} /> Volver a mi Smile Profile</button>
      <span className="result-meta">ORIENTACIÓN / 2026</span>
    </div>

    <div className="result-heading">
      <p className="eyebrow">ORIENTACIÓN PERSONALIZADA</p>
      <h2>{title}</h2>
    </div>

    {photo && <div className="analysis-photo-ref"><img src={photo} alt="Tu fotografía" /></div>}

    <div className="analysis-block">
      <p className="eyebrow">RESUMEN</p>
      <p className="analysis-summary">{analysis.summary}</p>
    </div>

    {analysis.findings.length > 0 && (
      <div className="analysis-block">
        <p className="eyebrow">LO QUE OBSERVAMOS</p>
        <div className="findings-list">
          {analysis.findings.map((f, i) => (
            <div className="finding-item" key={i}>
              <span className="finding-number">0{i + 1}</span>
              <div>
                <strong>{f.title}</strong>
                <p>{f.observation}</p>
                <span className={`finding-relevance ${f.relevance}`}>{f.relevance === 'high' ? 'Muy relevante' : f.relevance === 'medium' ? 'Relevante' : 'Informativo'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {analysis.strengths.length > 0 && (
      <div className="analysis-block">
        <p className="eyebrow">FORTALEZAS VISUALES</p>
        <div className="strengths-list">
          {analysis.strengths.map((s, i) => <span key={i}><Check size={15} /> {s}</span>)}
        </div>
      </div>
    )}

    {analysis.explorationTopics.length > 0 && (
      <div className="analysis-block">
        <p className="eyebrow">QUÉ PODRÍAS EXPLORAR</p>
        <div className="exploration-list">
          {analysis.explorationTopics.map((t, i) => <span key={i}><ArrowRight size={14} /> {t}</span>)}
        </div>
      </div>
    )}

    <div className="analysis-block limitations-block">
      <p className="eyebrow">LO QUE UNA FOTO NO PUEDE DECIRNOS</p>
      <p>{analysis.limitations}</p>
    </div>

    <div className="analysis-cta">
      <p className="eyebrow">TU SIGUIENTE PASO</p>
      <h3>¿Quieres conocer tu caso con mayor detalle?</h3>
      <p>Esta orientación visual es un punto de partida. Para recibir una evaluación personalizada y conocer qué alternativas pueden ser adecuadas para tu sonrisa, comunícate con nuestros especialistas.</p>
      <div className="analysis-cta-doctor">
        <strong>Dra. Daniela Morales Quintero</strong>
        <span>COP: 57011</span>
      </div>
      <div className="analysis-cta-actions">
        <a className="primary-button" href={waLink} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de Clínica ODEA"><MessageCircle size={18} /> Hablar con nuestros especialistas</a>
        <a className="secondary-button" href={waLink} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de Clínica ODEA"><MessageCircle size={16} /> Enviar mi análisis por WhatsApp</a>
      </div>
    </div>

    <div className="analysis-after-actions">
      <button className="text-button" onClick={onAnotherAspect}>Consultar otro aspecto de mi sonrisa</button>
      <button className="text-button" onClick={onBackToProfile}>Volver a mi Smile Profile</button>
    </div>
  </section>;
}

function AnalysisError({ error, onRetry, onBack }: { error: string; onRetry: () => void; onBack: () => void }) {
  return <section className="result-screen fade-in">
    <div className="result-top"><button className="back-button" onClick={onBack}><ChevronLeft size={18} /> Volver a mi perfil</button></div>
    <div className="analysis-bad-photo">
      <div className="analysis-bad-icon"><Sparkles size={28} /></div>
      <p className="eyebrow">ORIENTACIÓN PERSONALIZADA</p>
      <h2>No pudimos completar el análisis.</h2>
      <p>{error}</p>
      <button className="primary-button" onClick={onRetry}>Intentar de nuevo <ArrowRight size={18} /></button>
    </div>
  </section>;
}

function ContactStep({ sent, onSubmit, onBack }: { sent: boolean; onSubmit: () => void; onBack: () => void }) {
  if (sent) return <section className="contact-screen fade-in"><div className="success-icon"><Check size={30} /></div><p className="eyebrow">PERFECTO, YA ESTÁ</p><h2>Tu perfil llegó a ODEA.</h2><p>Un profesional se pondrá en contacto contigo para conversar sobre tus preferencias y resolver tus dudas.</p><a className="primary-button" href="https://wa.me/51950239644" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de Clínica ODEA">Hablar por WhatsApp <MessageCircle size={18} /></a><a className="contact-direct-link" href="https://www.instagram.com/clinicaodea/" target="_blank" rel="noopener noreferrer" aria-label="Instagram de Clínica ODEA"><Instagram size={16} /> Visítanos en Instagram @clinicaodea</a><div className="doctor-card"><div className="doctor-avatar"><Sparkles size={18} /></div><div className="doctor-details"><strong>Dra. Daniela Morales Quintero</strong><span>Odontóloga · COP: 57011</span><small>Lista para conversar sobre tu Smile Profile y las opciones que mejor se adaptan a ti.</small></div><a className="doctor-whatsapp-btn" href="https://wa.me/51950239644" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de Clínica ODEA"><MessageCircle size={16} /> Hablar por WhatsApp</a></div><button className="text-button" onClick={onBack}>Volver a mi Smile Profile</button></section>;
  return <section className="contact-screen fade-in"><button className="back-button contact-back" onClick={onBack}><ChevronLeft size={18} /> Volver a mi análisis</button><div className="contact-intro"><p className="eyebrow">DA EL SIGUIENTE PASO</p><h2>Tu sonrisa merece<br /><em>una conversación.</em></h2><p>Déjanos tus datos y te contactaremos con la misma cercanía que esta experiencia.</p></div><div className="contact-form"><label>¿Cómo te llamas?<input placeholder="Tu nombre" /></label><label>WhatsApp<input placeholder="+51 999 999 999" /></label><div className="form-row"><label>Distrito o ciudad<input placeholder="Ej. Miraflores" /></label><label>Horario preferido<select defaultValue=""><option value="" disabled>Elige un horario</option><option>Mañana</option><option>Mediodía</option><option>Tarde</option></select></label></div><button className="primary-button" onClick={onSubmit}>Solicitar contacto <ArrowRight size={18} /></button><small><Check size={13} /> Solo usaremos tus datos para contactarte sobre tu experiencia ODEA.</small></div><div className="contact-doctor-preview"><div className="doctor-avatar"><Sparkles size={18} /></div><div className="doctor-details"><strong>Dra. Daniela Morales Quintero</strong><span>Odontóloga · COP: 57011</span></div><a className="doctor-whatsapp-btn" href="https://wa.me/51950239644" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de Clínica ODEA"><MessageCircle size={16} /> Hablar por WhatsApp</a></div></section>;
}

function SharePanel({ copied, onCopy, onClose, shareText, profileName }: { copied: boolean; onCopy: () => void; onClose: () => void; shareText: string; profileName: string }) {
  return <div className="share-overlay"><div className="share-panel fade-in">
    <button className="close-button" onClick={onClose}><X size={19} /></button>
    <div className="share-icon"><Share2 size={20} /></div>
    <p className="eyebrow">HAZLO PARTE DE TU HISTORIA</p>
    <h2>¿Cuál será el Smile Profile de tus amigos?</h2>
    <p>Comparte una tarjeta limpia, sin fotos clínicas ni información privada.</p>
    <div className="share-preview-card">
      <div className="share-preview-top"><span>ODEA</span><small>SMILE CHECK</small></div>
      <div className="share-preview-name">{profileName}</div>
      <p className="share-preview-text">"Mi Smile Profile es {profileName} ✦"</p>
      <p className="share-preview-cta">Descubre el tuyo en ODEA Smile Check</p>
    </div>
    <div className="share-options">
      <button onClick={onCopy}><Copy size={17} /> {copied ? 'Enlace copiado' : 'Copiar enlace'}</button>
      <a href="https://www.instagram.com/clinicaodea/" target="_blank" rel="noopener noreferrer" aria-label="Instagram de Clínica ODEA"><Instagram size={17} /> Instagram Story</a>
      <a href={`https://wa.me/51950239644?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de Clínica ODEA"><MessageCircle size={17} /> WhatsApp</a>
    </div>
    <div className="referral-code">Tu enlace de invitación <strong>ODEA-7F42</strong></div>
  </div></div>;
}

export default App;
