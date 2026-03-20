import React, { useEffect, useRef, useState } from 'react';
import {
  HelpCircle, Mail, Phone, MessageCircle, FileText,
  ChevronDown, Github, Code2, Stethoscope,
} from 'lucide-react';

interface Developer {
  name: string;
  role: string;
  phone: string;
  photo: string;
  gradient: string;
  initials: string;
  accentColor: string;
}

const DEVELOPERS: Developer[] = [
  { name: 'Arnish Baruah', role: 'Full Stack Developer', phone: '+91 91018 28669', photo: '/dev-arnish.png', gradient: 'linear-gradient(135deg, #1868b7 0%, #0891b2 100%)', initials: 'AB', accentColor: '#1868b7' },
  { name: 'Kshatriya Nandini Kuldeep Singh', role: 'UI/UX Designer & Developer', phone: '+91 99099 29000', photo: '/dev-nandini.png', gradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', initials: 'NK', accentColor: '#7c3aed' },
  { name: 'Jayesh Dubey', role: 'Backend & Database Engineer', phone: '+91 9981469352', photo: '/dev-jayesh.png', gradient: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', initials: 'JD', accentColor: '#0891b2' },
  { name: 'Akshat Barve', role: 'AI & Integration Specialist', phone: '+91 95106 42537', photo: '/dev-akshat.png', gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', initials: 'AB2', accentColor: '#059669' },
  { name: 'Vijay Vinod Mane', role: 'DevOps & Cloud Engineer', phone: '+91 93721 60518', photo: '/dev-vijay.png', gradient: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)', initials: 'VM', accentColor: '#e11d48' },
];

const FAQ_ITEMS = [
  { q: 'How do I schedule an appointment with my doctor?', a: 'Navigate to the Appointments section from the sidebar. Click "New Appointment", select your doctor, preferred date and time, and confirm.' },
  { q: 'Can I upload my medical records securely?', a: 'Yes. Go to "My Records" and use the upload area to add PDFs or images. All files are encrypted and only accessible by you and your assigned doctor.' },
  { q: 'How does the AI Assistant work?', a: 'The AI Assistant uses advanced language models to answer health-related questions. It is not a substitute for professional medical advice.' },
  { q: 'How do I view my prescriptions?', a: 'Open the Prescriptions page from the sidebar. All active and past prescriptions from your doctor will appear there, including dosage and instructions.' },
  { q: 'What are Disease Programs?', a: 'Disease Programs let your doctor enroll you in structured monitoring plans (e.g., Diabetes Management). You log vitals regularly and your doctor tracks progress.' },
  { q: 'How do I contact my doctor directly?', a: 'Use the "My Doctor" section (patient view) or "Chat" section (doctor view) to send real-time messages to your healthcare provider.' },
];

// Scroll-triggered animation hook
function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// Animated section wrapper
const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'left' | 'right';
}> = ({ children, delay = 0, direction = 'up' }) => {
  const { ref, visible } = useScrollReveal();
  const transforms: Record<string, string> = {
    up: 'translateY(40px)',
    left: 'translateX(-40px)',
    right: 'translateX(40px)',
  };
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate(0,0)' : transforms[direction],
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

const HelpSupport: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll carousel
  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        setActiveIdx((prev) => (prev + 1) % DEVELOPERS.length);
      }, 3500);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPaused]);

  const goTo = (idx: number) => {
    setActiveIdx(idx);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 6000);
  };

  const dev = DEVELOPERS[activeIdx];

  return (
    <div className="flex-1 h-full overflow-y-auto" style={{ background: '#eef5fc' }}>

      {/* Hero Banner */}
      <div className="relative overflow-hidden px-8 py-8 shrink-0" style={{ background: 'linear-gradient(135deg, #1868b7 0%, #0891b2 100%)' }}>
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10 bg-white" />
        <div className="absolute top-5 right-32 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="h-4 w-4 text-white/70" />
            <span className="text-white/70 text-sm font-medium">Support</span>
          </div>
          <h1 className="text-[28px] font-bold text-white tracking-tight mb-2">Help & Support</h1>
          <p className="text-white/75 text-[14px] font-medium max-w-xl">Find answers, contact our team, or reach out directly to the DocPlus developers.</p>
          <a href="mailto:docplus@gmail.com" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full text-[13px] font-semibold transition-all hover:bg-white/30" style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)', color: 'white' }}>
            <Mail className="h-4 w-4" />
            docplus@gmail.com
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8 space-y-10">

        {/* Quick Contact Cards */}
        <Reveal direction="up" delay={0}>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Mail, label: 'Email Us', value: 'docplus@gmail.com', href: 'mailto:docplus@gmail.com', color: '#1868b7', bg: '#f0f6fc', border: '#c0dcf5' },
              { icon: MessageCircle, label: 'Live Chat', value: 'Available in app', href: '/ai-chat', color: '#0891b2', bg: '#f0fbff', border: '#bae6fd' },
              { icon: FileText, label: 'Documentation', value: 'User guide & FAQ', href: '#faq', color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe' },
            ].map((card) => (
              <a key={card.label} href={card.href} className="flex items-center gap-4 p-4 bg-white border rounded-xl hover:shadow-md transition-all" style={{ borderColor: card.border }}>
                <div className="p-3 rounded-xl shrink-0" style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                  <card.icon className="h-5 w-5" style={{ color: card.color }} />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-800">{card.label}</p>
                  <p className="text-[12px] text-slate-500">{card.value}</p>
                </div>
              </a>
            ))}
          </div>
        </Reveal>

        {/* Meet the Team */}
        <div>
          <Reveal direction="up" delay={100}>
            <div className="bg-white border border-[#cddff0] rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid #e8f0f9', background: 'linear-gradient(135deg, #f7fbff, #f0f6fc)' }}>
                <div className="p-2 rounded-xl" style={{ background: '#dceaf6', border: '1px solid #c0dcf5' }}>
                  <Code2 className="h-4 w-4 text-[#1868b7]" />
                </div>
                <h2 className="text-[15px] font-bold text-slate-800">Meet the Team</h2>
                <span className="ml-auto text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: '#dceaf6', color: '#1868b7' }}>{DEVELOPERS.length} developers</span>
              </div>

              <div className="p-6">
                {/* Main Carousel Card */}
                <div
                  className="relative rounded-2xl overflow-hidden mb-5"
                  style={{ minHeight: '240px', background: 'linear-gradient(135deg, #0d1e35 0%, #112540 100%)' }}
                  onMouseEnter={() => setIsPaused(true)}
                  onMouseLeave={() => setIsPaused(false)}
                >
                  <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-10 bg-white" />
                  <div className="absolute bottom-0 -left-8 w-32 h-32 rounded-full opacity-10 bg-white" />

                  <div className="relative z-10 flex items-center gap-8 px-8 py-8">
                    {/* Photo */}
                    <div className="relative shrink-0">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl" style={{ border: '3px solid rgba(255,255,255,0.2)' }}>
                        <img
                          key={`photo-${activeIdx}`}
                          src={dev.photo}
                          alt={dev.name}
                          className="w-full h-full object-cover"
                          style={{ transition: 'opacity 0.4s ease' }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                            const fb = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement;
                            if (fb) fb.style.display = 'flex';
                          }}
                        />
                        <div className="w-full h-full items-center justify-center text-white text-2xl font-bold hidden" style={{ background: dev.gradient }}>{dev.initials.slice(0, 2)}</div>
                      </div>
                      <div className="absolute inset-0 rounded-2xl opacity-25 blur-xl -z-10" style={{ background: dev.gradient }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold mb-3" style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}>
                        <Stethoscope className="h-3 w-3" />DocPlus Core Team
                      </div>
                      <h3 key={`name-${activeIdx}`} className="text-[22px] font-bold text-white mb-1 leading-tight" style={{ animation: 'fadeInUp 0.4s ease' }}>{dev.name}</h3>
                      <p key={`role-${activeIdx}`} className="text-[13px] font-medium mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>{dev.role}</p>
                      <a
                        href={`tel:${dev.phone.replace(/\s/g, '')}`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-90"
                        style={{ background: dev.gradient, color: 'white' }}
                      >
                        <Phone className="h-4 w-4" />{dev.phone}
                      </a>
                    </div>

                    {/* Prev/Next */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <button type="button" onClick={() => goTo((activeIdx - 1 + DEVELOPERS.length) % DEVELOPERS.length)} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80" style={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}>
                        <ChevronDown className="h-4 w-4 rotate-180" />
                      </button>
                      <button type="button" onClick={() => goTo((activeIdx + 1) % DEVELOPERS.length)} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80" style={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}>
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div className="h-full transition-all duration-300" style={{ background: dev.gradient, width: `${((activeIdx + 1) / DEVELOPERS.length) * 100}%` }} />
                  </div>
                </div>

                {/* Thumbnail strip */}
                <div className="flex items-center justify-center gap-3">
                  {DEVELOPERS.map((d, idx) => (
                    <button key={d.name} type="button" onClick={() => goTo(idx)} className="group relative transition-all duration-300">
                      <div className="w-10 h-10 rounded-xl overflow-hidden transition-all duration-300" style={{ border: idx === activeIdx ? `2px solid ${d.accentColor}` : '2px solid transparent', opacity: idx === activeIdx ? 1 : 0.5, transform: idx === activeIdx ? 'scale(1.15)' : 'scale(1)' }}>
                        <img src={d.photo} alt={d.name} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; const fb = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement; if (fb) fb.style.display = 'flex'; }} />
                        <div className="w-full h-full items-center justify-center text-white text-[10px] font-bold hidden" style={{ background: d.gradient }}>{d.initials.slice(0, 2)}</div>
                      </div>
                      {idx === activeIdx && <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ background: d.accentColor }} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Individual Developer Cards with scroll reveal */}
          <div className="mt-6 grid grid-cols-1 gap-4">
            {DEVELOPERS.map((d, idx) => (
              <Reveal key={d.name} direction={idx % 2 === 0 ? 'left' : 'right'} delay={idx * 80}>
                <div
                  className="flex items-center gap-5 p-5 bg-white rounded-2xl shadow-sm transition-all hover:shadow-md cursor-pointer"
                  style={{ border: `1px solid #e2eaf4`, borderLeft: `4px solid ${d.accentColor}` }}
                  onClick={() => goTo(idx)}
                >
                  {/* Photo */}
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-md" style={{ border: `2px solid ${d.accentColor}20` }}>
                    <img src={d.photo} alt={d.name} className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; const fb = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement; if (fb) fb.style.display = 'flex'; }}
                    />
                    <div className="w-full h-full items-center justify-center text-white text-lg font-bold hidden" style={{ background: d.gradient }}>{d.initials.slice(0, 2)}</div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-slate-800 leading-tight truncate">{d.name}</p>
                    <p className="text-[12px] font-medium text-slate-500 mt-0.5">{d.role}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${d.accentColor}15`, color: d.accentColor, border: `1px solid ${d.accentColor}30` }}>
                        DocPlus Team
                      </span>
                    </div>
                  </div>

                  {/* Phone */}
                  <a
                    href={`tel:${d.phone.replace(/\s/g, '')}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold shrink-0 transition-all hover:opacity-80"
                    style={{ background: `${d.accentColor}15`, color: d.accentColor, border: `1px solid ${d.accentColor}30` }}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {d.phone}
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <Reveal direction="up" delay={0}>
          <div id="faq" className="bg-white border border-[#cddff0] rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid #e8f0f9', background: 'linear-gradient(135deg, #f7fbff, #f0f6fc)' }}>
              <div className="p-2 rounded-xl" style={{ background: '#dceaf6', border: '1px solid #c0dcf5' }}>
                <HelpCircle className="h-4 w-4 text-[#1868b7]" />
              </div>
              <h2 className="text-[15px] font-bold text-slate-800">Frequently Asked Questions</h2>
            </div>
            <div className="divide-y divide-[#f0f6fc]">
              {FAQ_ITEMS.map((item, idx) => (
                <div key={idx}>
                  <button
                    type="button"
                    className="w-full text-left flex items-center justify-between px-6 py-4 hover:bg-[#f7fbff] transition-colors"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  >
                    <span className="text-[13px] font-semibold text-slate-700 pr-4">{item.q}</span>
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200" style={{ transform: openFaq === idx ? 'rotate(180deg)' : 'none' }} />
                  </button>
                  {openFaq === idx && (
                    <div className="px-6 pb-4 text-[13px] text-slate-500 leading-relaxed" style={{ borderTop: '1px solid #f0f6fc' }}>
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Footer */}
        <Reveal direction="up" delay={100}>
          <div className="flex items-center gap-3 p-4 rounded-xl border justify-center" style={{ background: '#f0f6fc', borderColor: '#c0dcf5' }}>
            <Github className="h-4 w-4 text-[#1868b7]" />
            <p className="text-[12px] font-medium text-[#1868b7]">DocPlus Medical Assistant — Built with care by the DocPlus Team</p>
          </div>
        </Reveal>

      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default HelpSupport;
