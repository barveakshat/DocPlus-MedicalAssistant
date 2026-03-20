import React, { useState, useEffect } from 'react';
import { useLanguage, LANGUAGE_NAMES, type Language } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Settings2, Bell, Shield, Globe, Moon, Sun, Monitor,
  Mail, Smartphone, Volume2, Eye, Lock, Clock, CheckCircle2,
} from 'lucide-react';

const SETTINGS_KEY = 'docplus_settings';

interface AppSettings {
  theme: string;
  fontSize: string;
  compactMode: boolean;
  animationsEnabled: boolean;
  emailNotifs: boolean;
  pushNotifs: boolean;
  smsNotifs: boolean;
  appointmentReminders: boolean;
  prescriptionAlerts: boolean;
  labResultAlerts: boolean;
  messageNotifs: boolean;
  soundEnabled: boolean;
  twoFactor: boolean;
  sessionTimeout: string;
  profileVisibility: string;
  dataSharing: boolean;
  activityLog: boolean;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  fontSize: 'medium',
  compactMode: false,
  animationsEnabled: true,
  emailNotifs: true,
  pushNotifs: true,
  smsNotifs: false,
  appointmentReminders: true,
  prescriptionAlerts: true,
  labResultAlerts: true,
  messageNotifs: true,
  soundEnabled: true,
  twoFactor: false,
  sessionTimeout: '30',
  profileVisibility: 'doctor',
  dataSharing: true,
  activityLog: true,
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
};

const FONT_SIZES: Record<string, string> = {
  small: '13px',
  medium: '15px',
  large: '17px',
};

function applyTheme(theme: string) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }
}

function applyFontSize(size: string) {
  document.documentElement.style.setProperty('--app-font-size', FONT_SIZES[size] || '15px');
  document.body.style.fontSize = FONT_SIZES[size] || '15px';
}

export function initAppSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const s: AppSettings = JSON.parse(stored);
      applyTheme(s.theme ?? 'light');
      applyFontSize(s.fontSize ?? 'medium');
    }
  } catch { /* ignore */ }
}

const SECTIONS = [
  { id: 'notifications', label_key: 'settings_notifications', icon: Bell, color: '#1868b7', bgColor: '#f0f6fc', borderColor: '#c0dcf5' },
  { id: 'appearance', label_key: 'settings_appearance', icon: Monitor, color: '#0891b2', bgColor: '#f0fbff', borderColor: '#bae6fd' },
  { id: 'privacy', label_key: 'settings_privacy', icon: Shield, color: '#059669', bgColor: '#f0fdf4', borderColor: '#bbf7d0' },
  { id: 'language', label_key: 'settings_language', icon: Globe, color: '#7c3aed', bgColor: '#faf5ff', borderColor: '#ddd6fe' },
];

const Settings: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('notifications');
  const [saved, setSaved] = useState(false);

  // Load from localStorage on mount
  const loadedSettings = (() => {
    try {
      const s = localStorage.getItem(SETTINGS_KEY);
      return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  })();

  const [theme, setThemeState] = useState(loadedSettings.theme);
  const [fontSize, setFontSizeState] = useState(loadedSettings.fontSize);
  const [compactMode, setCompactMode] = useState(loadedSettings.compactMode);
  const [animationsEnabled, setAnimationsEnabled] = useState(loadedSettings.animationsEnabled);
  const [emailNotifs, setEmailNotifs] = useState(loadedSettings.emailNotifs);
  const [pushNotifs, setPushNotifs] = useState(loadedSettings.pushNotifs);
  const [smsNotifs, setSmsNotifs] = useState(loadedSettings.smsNotifs);
  const [appointmentReminders, setAppointmentReminders] = useState(loadedSettings.appointmentReminders);
  const [prescriptionAlerts, setPrescriptionAlerts] = useState(loadedSettings.prescriptionAlerts);
  const [labResultAlerts, setLabResultAlerts] = useState(loadedSettings.labResultAlerts);
  const [messageNotifs, setMessageNotifs] = useState(loadedSettings.messageNotifs);
  const [soundEnabled, setSoundEnabled] = useState(loadedSettings.soundEnabled);
  const [twoFactor, setTwoFactor] = useState(loadedSettings.twoFactor);
  const [sessionTimeout, setSessionTimeout] = useState(loadedSettings.sessionTimeout);
  const [profileVisibility, setProfileVisibility] = useState(loadedSettings.profileVisibility);
  const [dataSharing, setDataSharing] = useState(loadedSettings.dataSharing);
  const [activityLog, setActivityLog] = useState(loadedSettings.activityLog);
  const [timezone, setTimezone] = useState(loadedSettings.timezone);
  const [dateFormat, setDateFormat] = useState(loadedSettings.dateFormat);
  const [timeFormat, setTimeFormat] = useState(loadedSettings.timeFormat);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);

  // Live preview: apply theme and font size immediately on change
  const handleThemeChange = (v: string) => { setThemeState(v); applyTheme(v); };
  const handleFontSizeChange = (v: string) => { setFontSizeState(v); applyFontSize(v); };
  const handleLanguageChange = (v: Language) => { setSelectedLanguage(v); setLanguage(v); };

  const handleSave = () => {
    const settings: AppSettings = {
      theme, fontSize, compactMode, animationsEnabled, emailNotifs, pushNotifs, smsNotifs,
      appointmentReminders, prescriptionAlerts, labResultAlerts, messageNotifs, soundEnabled,
      twoFactor, sessionTimeout, profileVisibility, dataSharing, activityLog,
      timezone, dateFormat, timeFormat,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applyTheme(theme);
    applyFontSize(fontSize);
    setLanguage(selectedLanguage);

    setSaved(true);
    toast({ title: t('saved'), description: 'Your preferences have been updated.' });
    setTimeout(() => setSaved(false), 3000);
  };

  const activeS = SECTIONS.find(s => s.id === activeSection)!;

  return (
    <div className="flex-1 h-full overflow-y-auto" style={{ background: '#eef5fc' }}>

      {/* Banner */}
      <div className="relative overflow-hidden px-8 py-6 shrink-0" style={{ background: 'linear-gradient(135deg, #1868b7 0%, #0891b2 100%)' }}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10 bg-white" />
        <div className="absolute top-3 right-28 w-20 h-20 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Settings2 className="h-4 w-4 text-white/70" />
            <span className="text-white/70 text-sm font-medium">Account</span>
          </div>
          <h1 className="text-[24px] font-bold text-white tracking-tight mb-1">{t('settings_title')}</h1>
          <p className="text-white/70 text-[14px] font-medium">{t('settings_subtitle')}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-6">
        <div className="flex gap-5">

          {/* Section Nav */}
          <div className="w-[220px] shrink-0 space-y-1.5">
            {SECTIONS.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                  style={
                    isActive
                      ? { background: section.bgColor, color: section.color, border: `1px solid ${section.borderColor}` }
                      : { background: 'white', color: '#64748b', border: '1px solid #e2eaf4' }
                  }
                >
                  <div className="p-1.5 rounded-lg shrink-0" style={{ background: isActive ? section.bgColor : '#f8fafc', border: `1px solid ${isActive ? section.borderColor : '#e2eaf4'}` }}>
                    <section.icon className="h-3.5 w-3.5" style={{ color: isActive ? section.color : '#94a3b8' }} />
                  </div>
                  {t(section.label_key)}
                </button>
              );
            })}
          </div>

          {/* Content Panel */}
          <div className="flex-1 min-w-0 bg-white border border-[#cddff0] rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid #e8f0f9', background: 'linear-gradient(135deg, #f7fbff, #f0f6fc)' }}>
              <div className="p-2 rounded-xl" style={{ background: activeS.bgColor, border: `1px solid ${activeS.borderColor}` }}>
                <activeS.icon className="h-4 w-4" style={{ color: activeS.color }} />
              </div>
              <h2 className="text-[15px] font-bold text-slate-800">{t(activeS.label_key)}</h2>
            </div>

            <div className="p-6 space-y-5">

              {/* === Notifications === */}
              {activeSection === 'notifications' && (
                <>
                  <SettingGroup title="Delivery Channels">
                    <ToggleRow icon={Mail} label="Email Notifications" description="Receive updates via email" value={emailNotifs} onChange={setEmailNotifs} color="#1868b7" />
                    <ToggleRow icon={Smartphone} label="Push Notifications" description="Alerts on your device" value={pushNotifs} onChange={setPushNotifs} color="#1868b7" />
                    <ToggleRow icon={Bell} label="SMS Alerts" description="Text message reminders" value={smsNotifs} onChange={setSmsNotifs} color="#1868b7" />
                    <ToggleRow icon={Volume2} label="Sound" description="Play sounds for alerts" value={soundEnabled} onChange={setSoundEnabled} color="#1868b7" />
                  </SettingGroup>
                  <SettingGroup title="Alert Types">
                    <ToggleRow icon={Clock} label="Appointment Reminders" description="Before scheduled appointments" value={appointmentReminders} onChange={setAppointmentReminders} color="#1868b7" />
                    <ToggleRow icon={Bell} label="Prescription Alerts" description="Dose logs and refill reminders" value={prescriptionAlerts} onChange={setPrescriptionAlerts} color="#1868b7" />
                    <ToggleRow icon={Bell} label="Lab Result Alerts" description="When new lab reports are available" value={labResultAlerts} onChange={setLabResultAlerts} color="#1868b7" />
                    <ToggleRow icon={Mail} label="Message Notifications" description="When doctors or patients message you" value={messageNotifs} onChange={setMessageNotifs} color="#1868b7" />
                  </SettingGroup>
                </>
              )}

              {/* === Appearance === */}
              {activeSection === 'appearance' && (
                <>
                  <SettingGroup title="Theme">
                    <div className="py-3">
                      <p className="text-[12px] font-medium text-slate-500 mb-3">Choose your preferred color theme — changes apply instantly</p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'light', label: 'Light', icon: Sun, preview: 'bg-white' },
                          { id: 'dark', label: 'Dark', icon: Moon, preview: 'bg-slate-800' },
                          { id: 'system', label: 'System', icon: Monitor, preview: 'bg-gradient-to-br from-white to-slate-800' },
                        ].map((t_item) => (
                          <button
                            key={t_item.id}
                            type="button"
                            onClick={() => handleThemeChange(t_item.id)}
                            className="flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all text-[12px] font-semibold"
                            style={
                              theme === t_item.id
                                ? { borderColor: '#1868b7', background: '#f0f6fc', color: '#1868b7' }
                                : { borderColor: '#e2eaf4', background: '#f8fafc', color: '#64748b' }
                            }
                          >
                            <div className={`w-8 h-8 rounded-lg ${t_item.preview} border border-slate-200 flex items-center justify-center`}>
                              <t_item.icon className="h-4 w-4" style={{ color: theme === t_item.id ? '#1868b7' : '#94a3b8' }} />
                            </div>
                            {t_item.label}
                            {theme === t_item.id && <CheckCircle2 className="h-3.5 w-3.5 text-[#1868b7]" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </SettingGroup>
                  <SettingGroup title="Text Size">
                    <div className="py-2">
                      <p className="text-[12px] font-medium text-slate-500 mb-3">Adjust text size — applies across the entire app</p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'small', label: 'Small', sample: 'Aa', size: '11px' },
                          { id: 'medium', label: 'Medium', sample: 'Aa', size: '14px' },
                          { id: 'large', label: 'Large', sample: 'Aa', size: '17px' },
                        ].map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => handleFontSizeChange(f.id)}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all"
                            style={
                              fontSize === f.id
                                ? { borderColor: '#1868b7', background: '#f0f6fc' }
                                : { borderColor: '#e2eaf4', background: '#f8fafc' }
                            }
                          >
                            <span style={{ fontSize: f.size, fontWeight: 700, color: fontSize === f.id ? '#1868b7' : '#94a3b8' }}>{f.sample}</span>
                            <span className="text-[11px] font-semibold" style={{ color: fontSize === f.id ? '#1868b7' : '#64748b' }}>{f.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </SettingGroup>
                  <SettingGroup title="Layout">
                    <ToggleRow icon={Monitor} label="Compact Mode" description="Reduce spacing for more content" value={compactMode} onChange={setCompactMode} color="#0891b2" />
                    <ToggleRow icon={Eye} label="Animations" description="Enable UI motion and transitions" value={animationsEnabled} onChange={setAnimationsEnabled} color="#0891b2" />
                  </SettingGroup>
                </>
              )}

              {/* === Privacy === */}
              {activeSection === 'privacy' && (
                <>
                  <SettingGroup title="Security">
                    <ToggleRow icon={Lock} label="Two-Factor Authentication" description="Extra layer of sign-in security" value={twoFactor} onChange={setTwoFactor} color="#059669" />
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 shrink-0 text-emerald-600" />
                        <div>
                          <p className="text-[13px] font-semibold text-slate-700">Session Timeout</p>
                          <p className="text-[11px] text-slate-400">Auto sign-out after inactivity</p>
                        </div>
                      </div>
                      <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                        <SelectTrigger className="w-36 border-[#c0dcf5] text-[13px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="240">4 hours</SelectItem>
                          <SelectItem value="never">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </SettingGroup>
                  <SettingGroup title="Privacy">
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Eye className="h-4 w-4 shrink-0 text-emerald-600" />
                        <div>
                          <p className="text-[13px] font-semibold text-slate-700">Profile Visibility</p>
                          <p className="text-[11px] text-slate-400">Who can view your profile details</p>
                        </div>
                      </div>
                      <Select value={profileVisibility} onValueChange={setProfileVisibility}>
                        <SelectTrigger className="w-36 border-[#c0dcf5] text-[13px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="doctor">My Doctor Only</SelectItem>
                          <SelectItem value="staff">Medical Staff</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <ToggleRow icon={Shield} label="Data Sharing for Research" description="Allow anonymized data for medical research" value={dataSharing} onChange={setDataSharing} color="#059669" />
                    <ToggleRow icon={Eye} label="Activity Log" description="Keep a log of your account activity" value={activityLog} onChange={setActivityLog} color="#059669" />
                  </SettingGroup>
                </>
              )}

              {/* === Language & Region === */}
              {activeSection === 'language' && (
                <>
                  <SettingGroup title="Language">
                    <div className="py-3">
                      <p className="text-[12px] font-medium text-slate-500 mb-3">
                        Select your language — sidebar navigation and UI labels will update immediately.
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {(Object.entries(LANGUAGE_NAMES) as [Language, string][]).map(([code, name]) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => handleLanguageChange(code)}
                            className="flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left"
                            style={
                              selectedLanguage === code
                                ? { borderColor: '#1868b7', background: '#f0f6fc' }
                                : { borderColor: '#e2eaf4', background: '#f8fafc' }
                            }
                          >
                            <div>
                              <p className="text-[13px] font-bold" style={{ color: selectedLanguage === code ? '#1868b7' : '#334155' }}>{name}</p>
                              <p className="text-[11px] text-slate-400 capitalize">{code === 'en' ? 'English' : code === 'hi' ? 'Hindi' : code === 'mr' ? 'Marathi' : code === 'gu' ? 'Gujarati' : 'Bengali'}</p>
                            </div>
                            {selectedLanguage === code && <CheckCircle2 className="h-5 w-5 text-[#1868b7]" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </SettingGroup>
                  <SettingGroup title="Region">
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-[13px] font-semibold text-slate-700">Timezone</p>
                        <p className="text-[11px] text-slate-400">Used for scheduling and timestamps</p>
                      </div>
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger className="w-44 border-[#c0dcf5] text-[13px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="America/New_York">US Eastern</SelectItem>
                          <SelectItem value="Europe/London">UK (GMT)</SelectItem>
                          <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-[13px] font-semibold text-slate-700">Date Format</p>
                        <p className="text-[11px] text-slate-400">How dates are displayed</p>
                      </div>
                      <Select value={dateFormat} onValueChange={setDateFormat}>
                        <SelectTrigger className="w-40 border-[#c0dcf5] text-[13px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-[13px] font-semibold text-slate-700">Time Format</p>
                        <p className="text-[11px] text-slate-400">12-hour or 24-hour clock</p>
                      </div>
                      <Select value={timeFormat} onValueChange={setTimeFormat}>
                        <SelectTrigger className="w-32 border-[#c0dcf5] text-[13px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12h">12-hour</SelectItem>
                          <SelectItem value="24h">24-hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </SettingGroup>
                </>
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleSave}
                  className="text-white border-0 font-semibold px-8"
                  style={{ background: 'linear-gradient(135deg, #1868b7 0%, #0891b2 100%)' }}
                >
                  {saved ? <><CheckCircle2 className="h-4 w-4 mr-2" />{t('saved')}</> : t('save_changes')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-1">
    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">{title}</p>
    <div className="bg-[#f8fbff] border border-[#e8f0f9] rounded-xl px-4 divide-y divide-[#f0f6fc]">
      {children}
    </div>
  </div>
);

const ToggleRow: React.FC<{
  icon: React.ElementType; label: string; description: string;
  value: boolean; onChange: (v: boolean) => void; color: string;
}> = ({ icon: Icon, label, description, value, onChange, color }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0" style={{ color }} />
      <div>
        <p className="text-[13px] font-semibold text-slate-700">{label}</p>
        <p className="text-[11px] text-slate-400">{description}</p>
      </div>
    </div>
    <Switch checked={value} onCheckedChange={onChange} />
  </div>
);

export default Settings;
