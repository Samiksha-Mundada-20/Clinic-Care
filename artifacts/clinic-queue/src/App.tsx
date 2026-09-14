import { type FormEvent, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Bell, Check, ChevronRight, Clock3, FileText, HeartPulse, Home as HomeIcon, LayoutDashboard, Menu, Phone, Plus, Search, Settings as SettingsIcon, Stethoscope, UserRound, UsersRound, X, AlertCircle, ArrowRight, RotateCcw, Save, ClipboardList, LogOut, Volume2, Accessibility, Upload, Eye } from 'lucide-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  getGetDashboardQueryKey,
  getGetPatientQueryKey,
  getListAppointmentsQueryKey,
  getListDoctorsQueryKey,
  getListPatientVisitsQueryKey,
  getListQueueQueryKey,
  useCreateAppointment,
  useCreatePatientVisit,
  useGenerateToken,
  useGetDashboard,
  useGetPatient,
  useListAppointments,
  useListDoctors,
  useListPatientVisits,
  useListQueue,
  useUpdateDoctorDelay,
  useUpdatePatient,
  useUpdateQueueStatus,
  type Appointment,
  type Doctor,
  type Patient,
  type QueueItem,
  type QueueItemStatus,
  type Visit,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import NotFound from '@/pages/not-found';
import './index.css';

const queryClient = new QueryClient();
const PATIENT_ID = 1;
type DemoRole = 'patient' | 'receptionist';
type DemoSession = { role: DemoRole; name: string; patientId?: number };
type Language = 'en' | 'hi' | 'bn' | 'mr' | 'ta' | 'te' | 'kn' | 'ml' | 'gu' | 'pa';
type AccessibilitySettings = { language: Language; voice: boolean; largeText: boolean; highContrast: boolean; reducedMotion: boolean };

const languageNames: Record<Language, string> = { en: 'English', hi: 'हिन्दी', bn: 'বাংলা', mr: 'मराठी', ta: 'தமிழ்', te: 'తెలుగు', kn: 'ಕನ್ನಡ', ml: 'മലയാളം', gu: 'ગુજરાતી', pa: 'ਪੰਜਾਬੀ' };
const languageVoiceCodes: Record<Language, string> = { en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', mr: 'mr-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN', gu: 'gu-IN', pa: 'pa-IN' };
const translations: Record<Language, Record<string, string>> = {
  en: { myDay: 'My day', book: 'Book appointment', records: 'My records', reception: 'Reception queue', patients: 'Patient records', settings: 'Accessibility & settings', patient: 'Patient account', receptionist: 'Receptionist account', signOut: 'Sign out', voice: 'Read page aloud', language: 'Language' },
  hi: { myDay: 'मेरा दिन', book: 'अपॉइंटमेंट बुक करें', records: 'मेरे रिकॉर्ड', reception: 'रिसेप्शन कतार', patients: 'मरीज़ रिकॉर्ड', settings: 'सुलभता और सेटिंग्स', patient: 'मरीज़ खाता', receptionist: 'रिसेप्शन खाता', signOut: 'साइन आउट', voice: 'पेज ज़ोर से पढ़ें', language: 'भाषा' },
  bn: { myDay: 'আমার দিন', book: 'অ্যাপয়েন্টমেন্ট বুক করুন', records: 'আমার রেকর্ড', reception: 'রিসেপশন কিউ', patients: 'রোগীর রেকর্ড', settings: 'অ্যাক্সেসিবিলিটি ও সেটিংস', patient: 'রোগী অ্যাকাউন্ট', receptionist: 'রিসেপশন অ্যাকাউন্ট', signOut: 'সাইন আউট', voice: 'পাতা পড়ে শোনান', language: 'ভাষা' },
  mr: { myDay: 'माझा दिवस', book: 'अपॉइंटमेंट बुक करा', records: 'माझे रेकॉर्ड', reception: 'रिसेप्शन रांग', patients: 'रुग्ण रेकॉर्ड', settings: 'सुलभता आणि सेटिंग्ज', patient: 'रुग्ण खाते', receptionist: 'रिसेप्शन खाते', signOut: 'साइन आउट', voice: 'पान मोठ्याने वाचा', language: 'भाषा' },
  ta: { myDay: 'என் நாள்', book: 'சந்திப்பை பதிவு செய்க', records: 'என் பதிவுகள்', reception: 'வரவேற்பு வரிசை', patients: 'நோயாளர் பதிவுகள்', settings: 'அணுகல் மற்றும் அமைப்புகள்', patient: 'நோயாளர் கணக்கு', receptionist: 'வரவேற்பு கணக்கு', signOut: 'வெளியேறு', voice: 'பக்கத்தைப் படிக்கவும்', language: 'மொழி' },
  te: { myDay: 'నా రోజు', book: 'అపాయింట్‌మెంట్ బుక్ చేయండి', records: 'నా రికార్డులు', reception: 'రిసెప్షన్ క్యూ', patients: 'రోగి రికార్డులు', settings: 'యాక్సెసిబిలిటీ & సెట్టింగ్స్', patient: 'రోగి ఖాతా', receptionist: 'రిసెప్షన్ ఖాతా', signOut: 'సైన్ అవుట్', voice: 'పేజీని చదవండి', language: 'భాష' },
  kn: { myDay: 'ನನ್ನ ದಿನ', book: 'ಅಪಾಯಿಂಟ್ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ', records: 'ನನ್ನ ದಾಖಲೆಗಳು', reception: 'ರಿಸೆಪ್ಷನ್ ಸರದಿ', patients: 'ರೋಗಿ ದಾಖಲೆಗಳು', settings: 'ಪ್ರವೇಶಸಾಧ್ಯತೆ ಮತ್ತು ಸೆಟ್ಟಿಂಗ್‌ಗಳು', patient: 'ರೋಗಿ ಖಾತೆ', receptionist: 'ರಿಸೆಪ್ಷನ್ ಖಾತೆ', signOut: 'ಸೈನ್ ಔಟ್', voice: 'ಪುಟವನ್ನು ಓದಿ', language: 'ಭಾಷೆ' },
  ml: { myDay: 'എന്റെ ദിവസം', book: 'അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യുക', records: 'എന്റെ രേഖകൾ', reception: 'റിസപ്ഷൻ ക്യൂ', patients: 'രോഗിയുടെ രേഖകൾ', settings: 'ആക്സസിബിലിറ്റിയും ക്രമീകരണങ്ങളും', patient: 'രോഗി അക്കൗണ്ട്', receptionist: 'റിസപ്ഷൻ അക്കൗണ്ട്', signOut: 'സൈൻ ഔട്ട്', voice: 'പേജ് വായിക്കുക', language: 'ഭാഷ' },
  gu: { myDay: 'મારો દિવસ', book: 'મુલાકાત બુક કરો', records: 'મારા રેકોર્ડ્સ', reception: 'રિસેપ્શન કતાર', patients: 'દર્દીના રેકોર્ડ્સ', settings: 'ઍક્સેસિબિલિટી અને સેટિંગ્સ', patient: 'દર્દી ખાતું', receptionist: 'રિસેપ્શન ખાતું', signOut: 'સાઇન આઉટ', voice: 'પાનું વાંચો', language: 'ભાષા' },
  pa: { myDay: 'ਮੇਰਾ ਦਿਨ', book: 'ਮੁਲਾਕਾਤ ਬੁੱਕ ਕਰੋ', records: 'ਮੇਰੇ ਰਿਕਾਰਡ', reception: 'ਰਿਸੈਪਸ਼ਨ ਕਤਾਰ', patients: 'ਮਰੀਜ਼ ਰਿਕਾਰਡ', settings: 'ਪਹੁੰਚਯੋਗਤਾ ਅਤੇ ਸੈਟਿੰਗਾਂ', patient: 'ਮਰੀਜ਼ ਖਾਤਾ', receptionist: 'ਰਿਸੈਪਸ਼ਨ ਖਾਤਾ', signOut: 'ਸਾਈਨ ਆਊਟ', voice: 'ਪੰਨਾ ਪੜ੍ਹੋ', language: 'ਭਾਸ਼ਾ' },
};
const AccessibilityContext = createContext<{ settings: AccessibilitySettings; update: (patch: Partial<AccessibilitySettings>) => void }>({ settings: { language: 'en', voice: false, largeText: false, highContrast: false, reducedMotion: false }, update: () => undefined });
const useAccessibility = () => useContext(AccessibilityContext);
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const dateLabel = (date: string | Date) => {
  const parsed = typeof date === 'string'
    ? new Date(date.includes('T') ? date : `${date}T12:00:00`)
    : date;
  return Number.isNaN(parsed.getTime())
    ? 'Date to be confirmed'
    : new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(parsed);
};
const timeLabel = (time?: string | null) => {
  if (!time) return '—';
  if (/[AP]M$/i.test(time.trim())) return time;
  const parsed = new Date(`2024-01-01T${time}`);
  return Number.isNaN(parsed.getTime())
    ? time
    : new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(parsed);
};
const initials = (name?: string) => (name ?? 'Patient').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

function speakPage(language: Language) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(document.body.innerText);
  utterance.lang = languageVoiceCodes[language];
  utterance.rate = 0.88;
  window.speechSynthesis.speak(utterance);
}

function LoginScreen({ onLogin }: { onLogin: (session: DemoSession) => void }) {
  const [account, setAccount] = useState<DemoRole>('patient');
  const [email, setEmail] = useState('patient@horizonclinic.demo');
  const [password, setPassword] = useState('patient123');
  const [error, setError] = useState('');
  const choose = (role: DemoRole) => {
    setAccount(role);
    setEmail(role === 'patient' ? 'patient@horizonclinic.demo' : 'reception@horizonclinic.demo');
    setPassword(role === 'patient' ? 'patient123' : 'reception123');
    setError('');
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch('/api/auth/demo-login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!response.ok) { setError('That demo email or password is not correct.'); return; }
    const session = await response.json() as DemoSession;
    onLogin(session);
    window.location.href = session.role === 'receptionist' ? '/reception' : '/';
  };
  return <div className="min-h-screen bg-background px-5 py-10 text-foreground md:grid md:place-items-center"><div className="mx-auto w-full max-w-5xl"><div className="mb-8 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground"><HeartPulse size={22} /></span><div><p className="display text-xl font-extrabold">horizon clinic</p><p className="eyebrow text-muted-foreground">patient care portal</p></div></div><div className="grid overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_20px_70px_hsl(220_30%_20%/.10)] md:grid-cols-[.9fr_1.1fr]"><div className="bg-sidebar p-8 text-sidebar-foreground md:p-12"><p className="eyebrow text-sidebar-primary">two demo accounts</p><h1 className="display mt-4 text-4xl font-extrabold leading-tight">Care updates that stay with the right person.</h1><p className="mt-5 max-w-md text-sm leading-relaxed text-sidebar-foreground/70">Patients see only their own appointments, queue, delays, and uploaded reports. Reception keeps the live line moving.</p><div className="mt-10 space-y-3 text-sm text-sidebar-foreground/80"><p>• Live token and waiting estimate</p><p>• Indian-language and voice controls</p><p>• Patient-owned medical report storage</p></div></div><form onSubmit={submit} className="p-8 md:p-12"><p className="eyebrow text-primary">sign in to continue</p><h2 className="display mt-3 text-3xl font-extrabold">Choose your workspace</h2><div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => choose('patient')} className={`rounded-2xl border p-4 text-left ${account === 'patient' ? 'border-primary bg-secondary/55' : 'border-border'}`}><UserRound size={18} className="text-primary" /><p className="mt-3 text-sm font-extrabold">Patient account</p><p className="mt-1 text-xs text-muted-foreground">Book, track, and keep your own reports.</p></button><button type="button" onClick={() => choose('receptionist')} className={`rounded-2xl border p-4 text-left ${account === 'receptionist' ? 'border-primary bg-secondary/55' : 'border-border'}`}><UsersRound size={18} className="text-primary" /><p className="mt-3 text-sm font-extrabold">Receptionist account</p><p className="mt-1 text-xs text-muted-foreground">Update queues, delays, and walk-ins.</p></button></div><label className="mt-7 block"><span className="mb-2 block text-xs font-extrabold">Demo email</span><input className="form-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="mt-4 block"><span className="mb-2 block text-xs font-extrabold">Demo password</span><input className="form-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="mt-3 text-sm text-destructive">{error}</p>}<button className="btn-primary mt-6 w-full" type="submit">Open {account === 'patient' ? 'patient' : 'reception'} workspace <ChevronRight size={16} /></button><div className="mt-5 rounded-2xl bg-muted/55 p-4 text-xs text-muted-foreground"><p className="font-bold text-foreground">Demo credentials</p><p className="mt-1">Patient: patient@horizonclinic.demo / patient123</p><p>Reception: reception@horizonclinic.demo / reception123</p></div></form></div></div></div>;
}

function LoadingBlock({ label = 'Loading clinic data' }: { label?: string }) {
  return <div className="panel p-6 animate-pulse" data-testid="loading-state"><div className="h-3 w-28 rounded bg-muted" /><div className="mt-4 h-7 w-2/3 rounded bg-muted" /><div className="mt-3 h-3 w-1/2 rounded bg-muted" /><span className="sr-only">{label}</span></div>;
}

function ErrorBlock({ onRetry }: { onRetry?: () => void }) {
  return <div className="panel border-destructive/30 p-6" data-testid="error-state"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 text-destructive" size={18} /><div><p className="font-bold">We could not load this view</p><p className="mt-1 text-sm text-muted-foreground">The clinic connection may be taking a moment. Nothing has been lost.</p>{onRetry && <button className="btn-quiet mt-4" onClick={onRetry} data-testid="button-retry"><RotateCcw size={14} />Try again</button>}</div></div></div>;
}

function EmptyBlock({ title, body }: { title: string; body: string }) {
  return <div className="panel border-dashed p-8 text-center" data-testid="empty-state"><div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-secondary/50 text-primary"><ClipboardList size={18} /></div><p className="mt-4 font-bold">{title}</p><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p></div>;
}

function Brand() {
  return <Link href="/" className="flex items-center gap-3" data-testid="link-brand"><span className="grid h-9 w-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><HeartPulse size={19} strokeWidth={2.4} /></span><span><strong className="display block text-[15px] tracking-tight text-sidebar-foreground">horizon clinic</strong><span className="eyebrow text-sidebar-foreground/45">patient care</span></span></Link>;
}

const navItems = [
  { href: '/', key: 'myDay', icon: HomeIcon },
  { href: '/book', key: 'book', icon: CalendarDays },
  { href: '/records', key: 'records', icon: FileText },
  { href: '/reception', key: 'reception', icon: LayoutDashboard, staff: true },
  { href: '/reception/patients', key: 'patients', icon: UsersRound, staff: true },
  { href: '/settings', key: 'settings', icon: SettingsIcon },
];

function Shell({ children, session, onLogout }: { children: ReactNode; session: DemoSession; onLogout: () => void }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { settings, update } = useAccessibility();
  const text = translations[settings.language];
  const visibleNav = navItems.filter((item) => !item.staff || session.role === 'receptionist');
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    onLogout();
    window.location.href = '/';
  };
  return <div className="app-shell grain flex bg-background text-foreground">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col bg-sidebar px-4 py-5 transition-transform md:static md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between px-2"><Brand /><button className="text-sidebar-foreground/60 md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-menu"><X size={18} /></button></div>
      <div className="mt-10 px-2"><span className="eyebrow text-sidebar-foreground/40">workspace</span><p className="mt-2 text-xs text-sidebar-foreground/65">{dateLabel(today())}</p></div>
      <nav className="mt-5 flex flex-1 flex-col gap-1" aria-label="Main navigation">{visibleNav.map((item) => { const Icon = item.icon; const label = text[item.key]; const active = item.href === '/' ? location === '/' : location.startsWith(item.href); return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="nav-link" data-active={active} data-testid={`link-nav-${item.key}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{item.staff && <span className="ml-auto rounded-full bg-sidebar-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-sidebar-primary">STAFF</span>}</Link>; })}</nav>
      <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/70 p-4"><div className="flex items-center gap-2"><span className="status-dot" /><span className="text-xs font-bold text-sidebar-foreground">Clinic is open</span></div><p className="mt-2 text-[11px] leading-relaxed text-sidebar-foreground/55">Live queue updates are on. We’ll keep you posted.</p></div>
      <div className="mt-5 flex items-center gap-3 border-t border-sidebar-border pt-4"><div className="grid h-9 w-9 place-items-center rounded-full bg-sidebar-primary font-bold text-sidebar-primary-foreground text-xs">{initials(session.name)}</div><div className="min-w-0"><p className="truncate text-xs font-bold text-sidebar-foreground">{session.name}</p><p className="text-[11px] text-sidebar-foreground/45">{text[session.role]}</p></div><button onClick={logout} className="ml-auto text-sidebar-foreground/45 hover:text-sidebar-foreground" aria-label={text.signOut} title={text.signOut}><LogOut size={15} /></button></div>
    </aside>
    {mobileOpen && <button className="fixed inset-0 z-30 bg-sidebar/35 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-overlay-menu" />}
    <main className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex min-h-[68px] items-center justify-between gap-3 border-b border-border/75 bg-background/85 px-5 py-2 backdrop-blur-md md:px-10"><button className="rounded-lg p-2 hover:bg-muted md:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-menu"><Menu size={20} /></button><div className="hidden md:block"><span className="eyebrow">horizon clinic / {session.role === 'patient' ? 'patient care' : 'reception workspace'}</span></div><div className="flex items-center gap-2"><label className="sr-only" htmlFor="language-select">{text.language}</label><select id="language-select" className="form-input !w-auto !rounded-full !py-2 !text-xs" value={settings.language} onChange={(event) => update({ language: event.target.value as Language })} aria-label={text.language}>{Object.entries(languageNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><button className={`btn-quiet !rounded-full !px-3 !py-2 ${settings.voice ? '!border-primary !text-primary' : ''}`} onClick={() => { update({ voice: !settings.voice }); speakPage(settings.language); }} aria-label={text.voice} title={text.voice}><Volume2 size={14} /></button><a href="tel:+14155550188" className="btn-quiet !rounded-full !px-3 !py-2" data-testid="link-call-clinic"><Phone size={14} /><span className="hidden sm:inline">Call clinic</span></a></div></header><div className="mx-auto max-w-[1400px] px-5 py-7 md:px-10 md:py-10">{children}</div></main>
  </div>;
}

function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow text-primary">{eyebrow}</p><h1 className="display mt-3 text-3xl font-extrabold tracking-tight md:text-[42px]">{title}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p></div>{action}</div>;
}

function StatusPill({ status }: { status: string }) {
  const labels: Record<string, string> = { booked: 'Booked', checked_in: 'Checked in', completed: 'Completed', cancelled: 'Cancelled', waiting: 'Waiting', in_room: 'In room', skipped: 'Skipped', on_time: 'On time', delayed: 'Delayed', offline: 'Offline' };
  const positive = ['checked_in', 'in_room', 'on_time'].includes(status);
  const caution = ['delayed', 'waiting', 'booked'].includes(status);
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.08em] ${positive ? 'bg-[hsl(153_37%_91%)] text-[hsl(153_39%_32%)]' : caution ? 'bg-secondary text-secondary-foreground' : status === 'cancelled' || status === 'skipped' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`} data-testid={`status-${status}`}><span className={`status-dot ${caution && !positive ? 'warn' : ''}`} />{labels[status] ?? status}</span>;
}

function DoctorStrip({ doctors, onSelect }: { doctors: Doctor[]; onSelect?: (doctor: Doctor) => void }) {
  if (!doctors.length) return <EmptyBlock title="No doctors are listed" body="Doctor availability will appear here when the clinic opens." />;
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{doctors.map((doctor) => <button key={doctor.id} onClick={() => onSelect?.(doctor)} className="panel flex items-center gap-4 p-4 text-left hover:-translate-y-0.5 hover:border-primary/35" data-testid={`card-doctor-${doctor.id}`}><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary"><Stethoscope size={20} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-extrabold">{doctor.name}</p><span className="text-xs text-muted-foreground">Rm {doctor.room}</span></div><p className="mt-1 text-xs text-muted-foreground">{doctor.specialty}</p><div className="mt-3 flex items-center justify-between"><span className="flex items-center gap-2 text-[11px] text-muted-foreground"><span className={`status-dot ${doctor.status === 'delayed' ? 'warn' : ''}`} />{doctor.status === 'delayed' ? `${doctor.delayMinutes} min delay` : doctor.status === 'offline' ? 'Offline' : 'On time'}</span><span className="mono text-[10px] text-muted-foreground">{doctor.waitingCount} waiting</span></div></div></button>)}</div>;
}

function Home() {
  const dashboardQuery = useGetDashboard({ date: today() }, { query: { queryKey: getGetDashboardQueryKey({ date: today() }), refetchInterval: 30000 } });
  const doctorsQuery = useListDoctors();
  const queueQuery = useListQueue({ date: today() });
  const appointmentsQuery = useListAppointments({ patientId: PATIENT_ID, date: today() });
  const dashboard = dashboardQuery.data;
  const appointments = appointmentsQuery.data ?? [];
  const next = appointments.find((appointment) => appointment.status !== 'completed' && appointment.status !== 'cancelled') ?? dashboard?.nextAppointment;
  const queueItem = (queueQuery.data ?? []).find((item) => item.patientId === PATIENT_ID && ['waiting', 'in_room'].includes(item.status)) ?? (queueQuery.data ?? []).find((item) => item.patientId === PATIENT_ID);
  if (dashboardQuery.isLoading || doctorsQuery.isLoading) return <><PageHeader eyebrow="good morning, alex" title="Your clinic day, at a glance." subtitle="A clear view of what’s next, from your appointment to the live queue." /><LoadingBlock /></>;
  if (dashboardQuery.isError || doctorsQuery.isError) return <><PageHeader eyebrow="good morning, alex" title="Your clinic day, at a glance." subtitle="A clear view of what’s next, from your appointment to the live queue." /><ErrorBlock onRetry={() => { void dashboardQuery.refetch(); void doctorsQuery.refetch(); }} /></>;
  return <div className="space-y-9"><PageHeader eyebrow="good morning, alex" title="Your clinic day, at a glance." subtitle="No guessing, no waiting blindly. Here’s the latest from Horizon Clinic." action={<Link href="/book" className="btn-primary" data-testid="link-book-appointment"><Plus size={16} />Book an appointment</Link>} />
    {next ? <section className="panel relative overflow-hidden p-6 md:p-8 reveal"><div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[28px] border-secondary/50" /><div className="relative grid gap-7 md:grid-cols-[1fr_auto] md:items-center"><div><p className="eyebrow text-primary">up next · {dateLabel(next.date)}</p><div className="mt-3 flex flex-wrap items-end gap-3"><h2 className="display text-3xl font-extrabold">{timeLabel(next.time)}</h2><StatusPill status={next.status} /></div><p className="mt-2 text-sm text-muted-foreground">Your appointment is booked. We’ll let you know when it’s time to head in.</p><div className="mt-5 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-muted px-3 py-2 font-semibold">Reason: {next.reason}</span><span className="rounded-full bg-muted px-3 py-2 font-semibold">Token {next.tokenNumber ?? 'assigned at check-in'}</span></div></div><Link href="/records" className="btn-quiet" data-testid="link-view-records">View my records <ArrowRight size={14} /></Link></div></section> : <EmptyBlock title="Nothing booked for today" body="Choose a time that works for you and we’ll keep the rest clear." />}
    <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]"><div className="panel p-6 reveal reveal-2"><div className="flex items-start justify-between"><div><p className="eyebrow text-primary">live queue</p><h2 className="display mt-2 text-2xl font-extrabold">Your place in line</h2></div><span className="flex items-center gap-2 text-xs text-muted-foreground"><span className="status-dot" />Live · updates every 30 sec</span></div>{queueItem ? <div className="mt-7 flex items-center gap-6"><div className="token-ring"><div className="text-center"><p className="eyebrow">token</p><p className="mono mt-1 text-2xl font-medium text-primary">#{queueItem.tokenNumber}</p></div></div><div><p className="text-2xl font-extrabold">{queueItem.estimatedWaitMinutes <= 5 ? 'You’re nearly up.' : `${queueItem.estimatedWaitMinutes} minutes to go`}</p><p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{queueItem.estimatedWaitMinutes <= 5 ? 'Stay close to the waiting area. We’ll call your token shortly.' : `There ${queueItem.estimatedWaitMinutes === 1 ? 'is' : 'are'} ${queueItem.estimatedWaitMinutes} minutes estimated before your turn.`}</p><div className="mt-4"><StatusPill status={queueItem.status} /></div></div></div> : <div className="mt-8 rounded-2xl bg-muted/65 p-5"><p className="font-bold">You’re not in today’s queue.</p><p className="mt-1 text-sm text-muted-foreground">Once reception checks you in, your live token will appear here.</p></div>}</div><div className="panel bg-primary p-6 text-primary-foreground reveal reveal-3"><p className="eyebrow text-secondary">today at horizon</p><div className="mt-7 grid grid-cols-2 gap-y-6"><div><p className="mono text-3xl">{dashboard?.currentToken ?? '—'}</p><p className="mt-1 text-xs text-primary-foreground/65">now serving</p></div><div><p className="mono text-3xl">{dashboard?.waitingCount ?? '—'}</p><p className="mt-1 text-xs text-primary-foreground/65">people waiting</p></div><div><p className="mono text-3xl">{dashboard?.avgVisitMinutes ?? '—'}m</p><p className="mt-1 text-xs text-primary-foreground/65">average visit</p></div><div><p className="mono text-3xl">{dashboard?.checkedIn ?? '—'}</p><p className="mt-1 text-xs text-primary-foreground/65">checked in</p></div></div></div></section>
    <section><div className="mb-4 flex items-end justify-between"><div><p className="eyebrow text-primary">care team</p><h2 className="display mt-2 text-2xl font-extrabold">Today’s doctors</h2></div><span className="text-xs text-muted-foreground">{(doctorsQuery.data ?? []).length} available</span></div><DoctorStrip doctors={doctorsQuery.data ?? []} /></section>
  </div>;
}

function Book() {
  const doctorsQuery = useListDoctors();
  const createAppointment = useCreateAppointment();
  const client = useQueryClient();
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(today());
  const [time, setTime] = useState('09:30');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState<Appointment | null>(null);
  const submit = (event: FormEvent) => { event.preventDefault(); if (!doctorId || reason.trim().length < 2) return; createAppointment.mutate({ data: { patientId: PATIENT_ID, doctorId: Number(doctorId), date, time, reason } }, { onSuccess: (appointment) => { setSubmitted(appointment); void client.invalidateQueries({ queryKey: getListAppointmentsQueryKey({ patientId: PATIENT_ID, date }) }); void client.invalidateQueries({ queryKey: getGetDashboardQueryKey({ date }) }); } }); };
  if (doctorsQuery.isLoading) return <><PageHeader eyebrow="make time for care" title="Book an appointment." subtitle="Pick a doctor and a time. We’ll take care of the rest." /><LoadingBlock /></>;
  return <div className="max-w-5xl"><PageHeader eyebrow="make time for care" title="Book an appointment." subtitle="Pick a doctor and a time. We’ll take care of the rest." /><div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><form onSubmit={submit} className="panel p-6 md:p-8"><div className="flex items-center gap-3 border-b border-border pb-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"><CalendarDays size={19} /></div><div><p className="font-extrabold">Appointment details</p><p className="text-xs text-muted-foreground">For Alex Morgan · patient account</p></div></div><div className="mt-7 space-y-5"><label className="block"><span className="mb-2 block text-xs font-extrabold">Choose a doctor</span><select className="form-input" value={doctorId} onChange={(event) => setDoctorId(event.target.value)} data-testid="select-book-doctor"><option value="">Select from available doctors</option>{(doctorsQuery.data ?? []).map((doctor) => <option value={doctor.id} key={doctor.id}>{doctor.name} · {doctor.specialty}</option>)}</select></label><div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-extrabold">Date</span><input className="form-input" type="date" min={today()} value={date} onChange={(event) => setDate(event.target.value)} data-testid="input-book-date" /></label><label className="block"><span className="mb-2 block text-xs font-extrabold">Preferred time</span><input className="form-input" type="time" value={time} onChange={(event) => setTime(event.target.value)} data-testid="input-book-time" /></label></div><label className="block"><span className="mb-2 block text-xs font-extrabold">What would you like help with?</span><textarea className="form-input min-h-[110px] resize-none" placeholder="A short note helps your doctor prepare." value={reason} onChange={(event) => setReason(event.target.value)} data-testid="textarea-book-reason" /></label>{createAppointment.isError && <p className="text-sm text-destructive" data-testid="text-book-error">We couldn’t book that time. Please check the details and try again.</p>}<button className="btn-primary w-full" type="submit" disabled={createAppointment.isPending} data-testid="button-submit-appointment">{createAppointment.isPending ? 'Booking your visit…' : 'Confirm appointment'}<ChevronRight size={16} /></button></div></form><div className="space-y-5"><div className="panel-soft p-6"><p className="eyebrow text-primary">before you book</p><div className="mt-5 space-y-4">{[['01', 'Choose a clinician', 'See their specialty and current availability.'], ['02', 'Tell us the reason', 'A few words help the care team prepare.'], ['03', 'Watch your queue', 'Your token and wait estimate appear after check-in.']].map(([number, title, body]) => <div className="flex gap-3" key={number}><span className="mono text-xs text-accent">{number}</span><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p></div></div>)}</div></div><div className="rounded-2xl bg-secondary/65 p-6"><Clock3 size={18} className="text-primary" /><p className="mt-4 text-sm font-extrabold">Timing that respects yours</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Appointments are estimates, not promises. We show live delays so you can plan your time.</p></div></div></div>{submitted && <div className="fixed bottom-6 right-6 z-30 flex max-w-sm items-start gap-3 rounded-2xl bg-sidebar p-4 text-sidebar-foreground shadow-xl reveal" data-testid="status-booking-success"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground"><Check size={16} /></div><div><p className="text-sm font-bold">Appointment booked</p><p className="mt-1 text-xs text-sidebar-foreground/65">{dateLabel(submitted.date)} at {timeLabel(submitted.time)}. See you there.</p></div><button className="ml-auto text-sidebar-foreground/45 hover:text-sidebar-foreground" onClick={() => setSubmitted(null)} data-testid="button-dismiss-booking"><X size={15} /></button></div>}</div>;
}

function Records() {
  const patientQuery = useGetPatient(PATIENT_ID);
  const visitsQuery = useListPatientVisits(PATIENT_ID);
  const updatePatient = useUpdatePatient();
  const createVisit = useCreatePatientVisit();
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', dateOfBirth: '', bloodGroup: '' });
  const [report, setReport] = useState<File | null>(null);
  const [reportNote, setReportNote] = useState('');
  const [reportError, setReportError] = useState('');
  useEffect(() => { if (patientQuery.data) setForm({ name: patientQuery.data.name, email: patientQuery.data.email, phone: patientQuery.data.phone, dateOfBirth: patientQuery.data.dateOfBirth, bloodGroup: patientQuery.data.bloodGroup }); }, [patientQuery.data]);
  if (patientQuery.isLoading || visitsQuery.isLoading) return <><PageHeader eyebrow="your care history" title="My records." subtitle="Your profile, prescriptions, and the notes that help your care team know you." /><LoadingBlock /></>;
  if (patientQuery.isError) return <ErrorBlock onRetry={() => void patientQuery.refetch()} />;
  const patient = patientQuery.data as Patient;
  const save = (event: FormEvent) => { event.preventDefault(); updatePatient.mutate({ patientId: PATIENT_ID, data: form }, { onSuccess: () => { setEditing(false); void client.invalidateQueries({ queryKey: getGetPatientQueryKey(PATIENT_ID) }); } }); };
  const uploadReport = async (event: FormEvent) => {
    event.preventDefault();
    if (!report) return;
    setReportError('');
    try {
      const response = await fetch('/api/storage/uploads/request-url', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: report.name, size: report.size, contentType: report.type || 'application/octet-stream' }) });
      if (!response.ok) throw new Error('Could not prepare upload');
      const upload = await response.json() as { uploadURL: string; objectPath: string };
      const put = await fetch(upload.uploadURL, { method: 'PUT', headers: { 'Content-Type': report.type || 'application/octet-stream' }, body: report });
      if (!put.ok) throw new Error('Could not upload report');
      const doctorId = visitsQuery.data?.[0]?.doctorId ?? 1;
      createVisit.mutate({ patientId: PATIENT_ID, data: { doctorId, date: today(), diagnosis: 'Patient uploaded medical report', notes: reportNote || `Uploaded ${report.name} for personal reference.`, prescriptions: [], documents: [{ name: report.name, objectPath: upload.objectPath, contentType: report.type || 'application/octet-stream', size: report.size }] } }, { onSuccess: () => { setReport(null); setReportNote(''); void client.invalidateQueries({ queryKey: getListPatientVisitsQueryKey(PATIENT_ID) }); } });
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Could not upload report');
    }
  };
  return <div><PageHeader eyebrow="your care history" title="My records." subtitle="Your profile, prescriptions, and the notes that help your care team know you." action={!editing && <button className="btn-quiet" onClick={() => setEditing(true)} data-testid="button-edit-profile"><UserRound size={15} />Edit profile</button>} /><div className="grid gap-5 lg:grid-cols-[.82fr_1.18fr]"><section className="panel p-6"><div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-lg font-extrabold text-primary">{initials(patient.name)}</div><div><p className="text-lg font-extrabold">{patient.name}</p><p className="text-xs text-muted-foreground">Patient since October 2022</p></div></div>{editing ? <form className="mt-7 space-y-4" onSubmit={save}><label className="block"><span className="mb-1.5 block text-xs font-bold">Full name</span><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-profile-name" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Email</span><input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-profile-email" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Phone</span><input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-profile-phone" /></label><div className="flex gap-2"><button className="btn-primary flex-1" type="submit" disabled={updatePatient.isPending} data-testid="button-save-profile"><Save size={14} />{updatePatient.isPending ? 'Saving…' : 'Save changes'}</button><button className="btn-quiet" type="button" onClick={() => setEditing(false)} data-testid="button-cancel-profile">Cancel</button></div></form> : <div className="mt-7 divide-y divide-border/80 text-sm"><div className="flex justify-between gap-4 py-3"><span className="text-muted-foreground">Email</span><span className="font-semibold text-right">{patient.email}</span></div><div className="flex justify-between gap-4 py-3"><span className="text-muted-foreground">Phone</span><span className="font-semibold">{patient.phone}</span></div><div className="flex justify-between gap-4 py-3"><span className="text-muted-foreground">Date of birth</span><span className="font-semibold">{patient.dateOfBirth}</span></div><div className="flex justify-between gap-4 py-3"><span className="text-muted-foreground">Blood group</span><span className="rounded-md bg-secondary px-2 py-1 font-bold text-primary">{patient.bloodGroup}</span></div></div>}</section><section className="space-y-5"><form className="panel-soft p-5" onSubmit={uploadReport}><div className="flex items-start gap-3"><Upload size={18} className="mt-0.5 text-primary" /><div><p className="font-extrabold">Keep a private medical report</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Only this patient account can upload and open these files. Reception cannot add or access them.</p></div></div><input className="form-input mt-5" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => setReport(event.target.files?.[0] ?? null)} data-testid="input-medical-report" /><textarea className="form-input mt-3 min-h-[78px] resize-none" placeholder="Optional note for your own reference" value={reportNote} onChange={(event) => setReportNote(event.target.value)} /><button className="btn-primary mt-3 w-full" type="submit" disabled={!report || createVisit.isPending}><Upload size={14} />{createVisit.isPending ? 'Saving private report…' : 'Upload report'}</button>{reportError && <p className="mt-3 text-sm text-destructive">{reportError}</p>}</form><div><p className="eyebrow text-primary">visit history</p><h2 className="display mt-2 text-2xl font-extrabold">Notes from your care team</h2></div>{(visitsQuery.data ?? []).length ? <div className="space-y-3">{(visitsQuery.data ?? []).map((visit) => <VisitCard key={visit.id} visit={visit} />)}</div> : <EmptyBlock title="No visit notes yet" body="Your visit summaries and prescriptions will appear here after your first appointment." />}</section></div></div>;
}

function VisitCard({ visit, hideDocuments = false }: { visit: Visit; hideDocuments?: boolean }) {
  return <details className="panel group p-5" data-testid={`card-visit-${visit.id}`}><summary className="flex cursor-pointer list-none items-center justify-between gap-4"><div><p className="eyebrow text-primary">{visit.date}</p><p className="mt-2 font-extrabold">{visit.doctorName}</p><p className="mt-1 text-xs text-muted-foreground">{visit.diagnosis}</p></div><ChevronRight className="text-muted-foreground transition-transform group-open:rotate-90" size={17} /></summary><div className="mt-5 border-t border-border pt-5"><p className="text-sm leading-relaxed text-muted-foreground">{visit.notes}</p>{visit.prescriptions.length > 0 && <div className="mt-5"><p className="eyebrow text-primary">prescriptions</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{visit.prescriptions.map((medication) => <div className="rounded-xl bg-muted/60 p-3" key={medication.name}><p className="text-sm font-bold">{medication.name}</p><p className="mt-1 text-xs text-muted-foreground">{medication.dosage} · {medication.frequency}</p><p className="mt-1 text-[11px] text-primary">{medication.duration}</p></div>)}</div></div>}{!hideDocuments && visit.documents?.length > 0 && <div className="mt-5"><p className="eyebrow text-primary">your uploaded reports</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{visit.documents.map((document) => <a className="flex items-center gap-3 rounded-xl bg-muted/60 p-3 hover:bg-secondary" href={`/api/storage${document.objectPath}`} target="_blank" rel="noreferrer" key={document.objectPath}><FileText size={16} className="text-primary" /><span className="min-w-0 truncate text-sm font-bold">{document.name}</span></a>)}</div></div>}</div></details>;
}

function Reception() {
  const dashboardQuery = useGetDashboard({ date: today() }, { query: { queryKey: getGetDashboardQueryKey({ date: today() }), refetchInterval: 30000 } });
  const doctorsQuery = useListDoctors();
  const queueQuery = useListQueue({ date: today() });
  const generateToken = useGenerateToken();
  const updateStatus = useUpdateQueueStatus();
  const updateDelay = useUpdateDoctorDelay();
  const client = useQueryClient();
  const [tokenForm, setTokenForm] = useState({ patientId: '', patientName: '', patientPhone: '', doctorId: '', appointmentTime: '09:30' });
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [delayDraft, setDelayDraft] = useState<Record<number, string>>({});
  const queue = queueQuery.data ?? [];
  const invalidate = () => { void client.invalidateQueries({ queryKey: getListQueueQueryKey({ date: today() }) }); void client.invalidateQueries({ queryKey: getGetDashboardQueryKey({ date: today() }) }); void client.invalidateQueries({ queryKey: getListDoctorsQueryKey() }); };
  const makeToken = (event: FormEvent) => { event.preventDefault(); if ((!tokenForm.patientId && (!tokenForm.patientName || !tokenForm.patientPhone)) || !tokenForm.doctorId) return; generateToken.mutate({ data: { ...(tokenForm.patientId ? { patientId: Number(tokenForm.patientId), source: 'online' as const } : { patientName: tokenForm.patientName, patientPhone: tokenForm.patientPhone, source: 'walk_in' as const }), doctorId: Number(tokenForm.doctorId), appointmentTime: tokenForm.appointmentTime } }, { onSuccess: () => { setTokenForm({ ...tokenForm, patientId: '', patientName: '', patientPhone: '' }); invalidate(); } }); };
  const changeStatus = (item: QueueItem, status: QueueItemStatus) => updateStatus.mutate({ queueId: item.id, data: { status } }, { onSuccess: invalidate });
  const saveDelay = (doctor: Doctor) => updateDelay.mutate({ doctorId: doctor.id, data: { delayMinutes: Number(delayDraft[doctor.id] ?? doctor.delayMinutes) } }, { onSuccess: invalidate });
  if (dashboardQuery.isLoading || doctorsQuery.isLoading || queueQuery.isLoading) return <><PageHeader eyebrow="staff workspace" title="Reception queue." subtitle="Keep the waiting room moving with one clear view." /><LoadingBlock /></>;
  if (dashboardQuery.isError || doctorsQuery.isError || queueQuery.isError) return <ErrorBlock onRetry={() => { void dashboardQuery.refetch(); void doctorsQuery.refetch(); void queueQuery.refetch(); }} />;
  return <div><PageHeader eyebrow="staff workspace" title="Reception queue." subtitle={`${dateLabel(today())} · Keep the waiting room moving with one clear view.`} action={<div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground"><span className="status-dot" />Live operations</div>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Appointments" value={dashboardQuery.data?.totalAppointments ?? 0} sub="scheduled today" /><Metric label="Checked in" value={dashboardQuery.data?.checkedIn ?? 0} sub="ready or in room" /><Metric label="Waiting" value={dashboardQuery.data?.waitingCount ?? 0} sub="across all doctors" /><Metric label="Now serving" value={dashboardQuery.data?.currentToken ?? '—'} sub={`${dashboardQuery.data?.avgVisitMinutes ?? '—'} min average`} /></div><div className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_.75fr]"><section className="panel overflow-hidden"><div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow text-primary">live line</p><h2 className="display mt-2 text-2xl font-extrabold">Waiting room</h2></div><select className="form-input !w-auto" value={selectedDoctor} onChange={(event) => setSelectedDoctor(event.target.value)} data-testid="select-queue-doctor"><option value="">All doctors</option>{(doctorsQuery.data ?? []).map((doctor) => <option value={doctor.id} key={doctor.id}>{doctor.name}</option>)}</select></div>{queue.filter((item) => !selectedDoctor || item.doctorId === Number(selectedDoctor)).length ? <div className="divide-y divide-border/75">{queue.filter((item) => !selectedDoctor || item.doctorId === Number(selectedDoctor)).map((item) => <QueueRow item={item} key={item.id} onStatus={changeStatus} />)}</div> : <div className="p-8"><EmptyBlock title="The queue is clear" body="New checked-in patients will appear here." /></div>}</section><aside className="space-y-5"><form className="panel p-5" onSubmit={makeToken}><p className="eyebrow text-primary">walk-in / check-in</p><h2 className="display mt-2 text-xl font-extrabold">Generate a token</h2><p className="mt-2 text-xs text-muted-foreground">Use an existing patient ID, or add someone who arrived in person.</p><div className="mt-5 space-y-3"><input className="form-input" placeholder="Existing patient ID (optional)" inputMode="numeric" value={tokenForm.patientId} onChange={(e) => setTokenForm({ ...tokenForm, patientId: e.target.value })} data-testid="input-token-patient-id" /><div className="grid gap-3 sm:grid-cols-2"><input className="form-input" placeholder="Walk-in name" value={tokenForm.patientName} onChange={(e) => setTokenForm({ ...tokenForm, patientName: e.target.value })} data-testid="input-token-patient-name" /><input className="form-input" placeholder="Phone number" value={tokenForm.patientPhone} onChange={(e) => setTokenForm({ ...tokenForm, patientPhone: e.target.value })} data-testid="input-token-patient-phone" /></div><select className="form-input" value={tokenForm.doctorId} onChange={(e) => setTokenForm({ ...tokenForm, doctorId: e.target.value })} data-testid="select-token-doctor"><option value="">Assign doctor</option>{(doctorsQuery.data ?? []).map((doctor) => <option value={doctor.id} key={doctor.id}>{doctor.name}</option>)}</select><input className="form-input" type="time" value={tokenForm.appointmentTime} onChange={(e) => setTokenForm({ ...tokenForm, appointmentTime: e.target.value })} data-testid="input-token-time" /><button className="btn-primary w-full" disabled={generateToken.isPending} data-testid="button-generate-token"><Plus size={15} />{generateToken.isPending ? 'Generating…' : 'Store patient + generate token'}</button></div></form><div className="panel p-5"><p className="eyebrow text-primary">doctor pulse</p><div className="mt-4 space-y-3">{(doctorsQuery.data ?? []).map((doctor) => <div className="rounded-xl bg-muted/50 p-3" key={doctor.id}><div className="flex items-center justify-between"><div><p className="text-xs font-extrabold">{doctor.name}</p><p className="mt-1 text-[11px] text-muted-foreground">Room {doctor.room} · {doctor.waitingCount} waiting</p></div><StatusPill status={doctor.status} /></div>{doctor.status === 'delayed' && <div className="mt-3 flex gap-2"><input className="form-input !py-1.5 text-xs" type="number" min="0" max="240" value={delayDraft[doctor.id] ?? doctor.delayMinutes} onChange={(e) => setDelayDraft({ ...delayDraft, [doctor.id]: e.target.value })} data-testid={`input-delay-${doctor.id}`} /><button className="btn-quiet !px-2 !py-1.5" onClick={() => saveDelay(doctor)} disabled={updateDelay.isPending} data-testid={`button-save-delay-${doctor.id}`}><Save size={13} /></button></div>}</div>)}</div></div></aside></div></div>;
}

function Metric({ label, value, sub }: { label: string; value: string | number; sub: string }) { return <div className="panel p-5"><p className="eyebrow">{label}</p><p className="mono mt-3 text-3xl text-primary">{value}</p><p className="mt-1 text-xs text-muted-foreground">{sub}</p></div>; }

function QueueRow({ item, onStatus }: { item: QueueItem; onStatus: (item: QueueItem, status: QueueItemStatus) => void }) {
  const nextAction = item.status === 'waiting' ? { label: 'Call in', status: 'in_room' as QueueItemStatus, icon: ArrowRight } : item.status === 'in_room' ? { label: 'Complete', status: 'completed' as QueueItemStatus, icon: Check } : null;
  return <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary"><span className="mono text-sm font-medium text-primary">#{item.tokenNumber}</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-extrabold">{item.patientName}</p><StatusPill status={item.status} /><span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-[.08em]">{item.source === 'walk_in' ? 'Walk-in' : 'Online'}</span></div><p className="mt-1 text-xs text-muted-foreground">Patient #{item.patientId} · appointment {timeLabel(item.appointmentTime)}</p></div><div className="flex items-center gap-3 sm:justify-end"><span className="hidden text-right sm:block"><span className="block mono text-xs">{item.estimatedWaitMinutes} min</span><span className="block text-[10px] text-muted-foreground">estimated wait</span></span>{nextAction && <button className="btn-quiet !py-2" onClick={() => onStatus(item, nextAction.status)} data-testid={`button-queue-${nextAction.status}-${item.id}`}><nextAction.icon size={13} />{nextAction.label}</button>}{item.status === 'waiting' && <button className="btn-quiet !border-destructive/20 !text-destructive !py-2" onClick={() => onStatus(item, 'skipped')} data-testid={`button-queue-skip-${item.id}`}>Skip</button>}</div></div>;
}

function ReceptionPatients() {
  const [search, setSearch] = useState('');
  const [patientId, setPatientId] = useState<number | null>(null);
  const patientQuery = useGetPatient(patientId ?? 0, { query: { enabled: !!patientId, queryKey: getGetPatientQueryKey(patientId ?? 0) } });
  const visitsQuery = useListPatientVisits(patientId ?? 0, { query: { enabled: !!patientId, queryKey: getListPatientVisitsQueryKey(patientId ?? 0) } });
  const lookup = (event: FormEvent) => { event.preventDefault(); const value = Number(search); if (value > 0) setPatientId(value); };
  return <div><PageHeader eyebrow="staff workspace" title="Patient records." subtitle="Reception can view patient context, but only a signed-in patient can add or store medical reports." /><div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]"><aside className="space-y-5"><form className="panel p-5" onSubmit={lookup}><p className="eyebrow text-primary">patient lookup</p><h2 className="display mt-2 text-xl font-extrabold">Who are you seeing?</h2><div className="mt-5 flex gap-2"><input className="form-input" placeholder="Patient ID" inputMode="numeric" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-lookup-patient" /><button className="btn-primary !px-3" type="submit" data-testid="button-lookup-patient"><Search size={16} /></button></div></form>{patientQuery.isError && <ErrorBlock onRetry={() => void patientQuery.refetch()} />}{patientQuery.data && <div className="panel p-5"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary font-bold text-primary">{initials(patientQuery.data.name)}</div><div><p className="font-extrabold">{patientQuery.data.name}</p><p className="text-xs text-muted-foreground">{patientQuery.data.email}</p></div></div><div className="mt-5 flex gap-2 text-xs"><span className="rounded-full bg-muted px-2.5 py-1 font-bold">ID #{patientQuery.data.id}</span><span className="rounded-full bg-muted px-2.5 py-1 font-bold">{patientQuery.data.bloodGroup}</span></div></div>}</aside><section className="space-y-5">{patientId && patientQuery.data ? <><div className="panel-soft p-5"><div className="flex items-start gap-3"><Eye size={18} className="mt-0.5 text-primary" /><div><p className="font-extrabold">Read-only patient context</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Medical reports uploaded by the patient are private and are not shown in the receptionist workspace.</p></div></div></div><div><p className="eyebrow text-primary">previous notes</p><div className="mt-3 space-y-3">{(visitsQuery.data ?? []).map((visit) => <VisitCard key={visit.id} visit={visit} hideDocuments />)}{!visitsQuery.isLoading && !(visitsQuery.data ?? []).length && <EmptyBlock title="No previous notes" body="No clinic notes are available for this patient yet." />}</div></div></> : <div className="panel flex min-h-[390px] flex-col items-center justify-center p-8 text-center"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary"><Search size={22} /></div><h2 className="display mt-5 text-2xl font-extrabold">Start with a patient ID</h2><p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Search on the left to view scheduling context and clinic notes without accessing private uploaded reports.</p></div>}</section></div></div>;
}

function Settings() {
  const patientQuery = useGetPatient(PATIENT_ID);
  const updatePatient = useUpdatePatient();
  const client = useQueryClient();
  const { settings, update } = useAccessibility();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', dateOfBirth: '', bloodGroup: '' });
  const [preferences, setPreferences] = useState({ updates: true, reminders: true, waitAlerts: true });
  useEffect(() => { if (patientQuery.data) setForm({ name: patientQuery.data.name, email: patientQuery.data.email, phone: patientQuery.data.phone, dateOfBirth: patientQuery.data.dateOfBirth, bloodGroup: patientQuery.data.bloodGroup }); }, [patientQuery.data]);
  const save = (event: FormEvent) => { event.preventDefault(); updatePatient.mutate({ patientId: PATIENT_ID, data: form }, { onSuccess: () => { setSaved(true); void client.invalidateQueries({ queryKey: getGetPatientQueryKey(PATIENT_ID) }); window.setTimeout(() => setSaved(false), 2200); } }); };
  if (patientQuery.isLoading) return <><PageHeader eyebrow="your preferences" title="Settings." subtitle="A few details that keep your clinic experience feeling like yours." /><LoadingBlock /></>;
  return <div className="max-w-4xl"><PageHeader eyebrow="your preferences" title="Accessibility & settings." subtitle="Choose the language, text size, contrast, and voice support that make the portal easier to use." /><div className="space-y-5"><section className="panel p-6 md:p-8"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"><Accessibility size={18} /></div><div><h2 className="font-extrabold">Accessibility for every age</h2><p className="text-xs text-muted-foreground">These preferences stay on this device.</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-bold">Language / भाषा</span><select className="form-input" value={settings.language} onChange={(event) => update({ language: event.target.value as Language })}>{Object.entries(languageNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><button type="button" className="btn-quiet mt-6 justify-center" onClick={() => { update({ voice: !settings.voice }); speakPage(settings.language); }}><Volume2 size={15} />{translations[settings.language].voice}</button></div><div className="mt-5 divide-y divide-border">{[['largeText', 'Larger text', 'Helpful for elderly patients and low vision.'], ['highContrast', 'High contrast', 'Stronger separation between text and surfaces.'], ['reducedMotion', 'Reduce motion', 'Use calmer transitions and fewer animations.']].map(([key, label, body]) => <label className="flex cursor-pointer items-center justify-between gap-4 py-4" key={key}><span><span className="block text-sm font-bold">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{body}</span></span><input className="h-5 w-5 accent-[hsl(var(--primary))]" type="checkbox" checked={settings[key as keyof AccessibilitySettings] as boolean} onChange={(event) => update({ [key]: event.target.checked })} /></label>)}</div></section><form onSubmit={save} className="space-y-5"><section className="panel p-6 md:p-8"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"><UserRound size={18} /></div><div><h2 className="font-extrabold">Personal details</h2><p className="text-xs text-muted-foreground">Used for appointments and clinic communication.</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-bold">Full name</span><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-settings-name" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Email</span><input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-settings-email" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Phone</span><input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-settings-phone" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Date of birth</span><input className="form-input" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} data-testid="input-settings-dob" /></label></div></section><section className="panel p-6 md:p-8"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"><BellIcon /></div><div><h2 className="font-extrabold">Clinic updates</h2><p className="text-xs text-muted-foreground">Choose what deserves your attention.</p></div></div><div className="mt-5 divide-y divide-border">{[['updates', 'Appointment updates', 'Changes to your booking or clinician availability.'], ['reminders', 'Appointment reminders', 'A gentle reminder before your visit.'], ['waitAlerts', 'Queue movement', 'Let me know when my token is getting close.']].map(([key, label, body]) => <label className="flex cursor-pointer items-center justify-between gap-4 py-4" key={key}><span><span className="block text-sm font-bold">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{body}</span></span><input className="h-4 w-4 accent-[hsl(var(--primary))]" type="checkbox" checked={preferences[key as keyof typeof preferences]} onChange={(e) => setPreferences({ ...preferences, [key]: e.target.checked })} data-testid={`checkbox-settings-${key}`} /></label>)}</div></section><div className="flex items-center justify-end gap-3"><span className={`text-xs font-bold text-primary transition-opacity ${saved ? 'opacity-100' : 'opacity-0'}`} data-testid="text-settings-saved"><Check size={14} className="mr-1 inline" />Saved</span><button className="btn-primary" type="submit" disabled={updatePatient.isPending} data-testid="button-save-settings"><Save size={14} />{updatePatient.isPending ? 'Saving…' : 'Save settings'}</button></div></form></div></div>;
}

function BellIcon() { return <Bell size={18} />; }

function AccessDenied() {
  return <div className="panel max-w-xl p-8"><p className="eyebrow text-primary">private workspace</p><h1 className="display mt-3 text-3xl font-extrabold">This area is not part of your account.</h1><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Sign in with the account that owns this information. Patient records and uploaded medical reports are private to the patient account.</p></div>;
}

function Router({ session, onLogout }: { session: DemoSession; onLogout: () => void }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Shell session={session} onLogout={onLogout}><Switch><Route path="/" component={session.role === 'receptionist' ? Reception : Home} /><Route path="/book" component={session.role === 'patient' ? Book : AccessDenied} /><Route path="/records" component={session.role === 'patient' ? Records : AccessDenied} /><Route path="/reception" component={session.role === 'receptionist' ? Reception : AccessDenied} /><Route path="/reception/patients" component={session.role === 'receptionist' ? ReceptionPatients : AccessDenied} /><Route path="/settings" component={session.role === 'patient' ? Settings : AccessDenied} /><Route component={NotFound} /></Switch></Shell></ErrorBoundary>;
}

function App() {
  const [session, setSession] = useState<DemoSession | null | undefined>(undefined);
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({ language: 'en', voice: false, largeText: false, highContrast: false, reducedMotion: false });
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('clinic-accessibility');
      if (stored) setAccessibility((current) => ({ ...current, ...JSON.parse(stored) as Partial<AccessibilitySettings> }));
    } catch { /* use defaults when browser storage is unavailable */ }
    fetch('/api/auth/session', { credentials: 'include' }).then(async (response) => response.ok ? setSession(await response.json() as DemoSession) : setSession(null)).catch(() => setSession(null));
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('large-text', accessibility.largeText);
    document.documentElement.classList.toggle('high-contrast', accessibility.highContrast);
    document.documentElement.classList.toggle('reduced-motion', accessibility.reducedMotion);
    window.localStorage.setItem('clinic-accessibility', JSON.stringify(accessibility));
  }, [accessibility]);
  const update = (patch: Partial<AccessibilitySettings>) => setAccessibility((current) => ({ ...current, ...patch }));
  if (session === undefined) return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Loading secure clinic portal…</div>;
  if (!session) return <AccessibilityContext.Provider value={{ settings: accessibility, update }}><LoginScreen onLogin={setSession} /></AccessibilityContext.Provider>;
  return <AccessibilityContext.Provider value={{ settings: accessibility, update }}><QueryClientProvider client={queryClient}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router session={session} onLogout={() => setSession(null)} /></WouterRouter><Toaster /></QueryClientProvider></AccessibilityContext.Provider>;
}

export default App;