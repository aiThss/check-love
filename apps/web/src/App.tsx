import {
  Bell,
  Camera,
  Check,
  ChevronRight,
  CircleUserRound,
  Copy,
  Dice5,
  Heart,
  Home,
  Image as ImageIcon,
  LogOut,
  Moon,
  RefreshCw,
  Send,
  Share,
  ShieldAlert,
  Smile,
  Sparkles,
  Sun,
  Upload,
  UserRound,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, Navigate, NavLink, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { ApiError, apiFetch, clearToken, getToken, saveToken } from "./api";
import type { CheckIn, MeResponse, RandomCategory, RandomEvent, ReactionType, ThemeMode } from "./types";

type AuthContextValue = {
  token: string | null;
  me: MeResponse | null;
  loading: boolean;
  blocked: boolean;
  completeAuth(token: string): Promise<void>;
  refreshMe(): Promise<void>;
  signOut(): void;
};

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme(theme: ThemeMode): void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const ThemeContext = createContext<ThemeContextValue | null>(null);

const moodOptions = ["vui", "nhớ", "mệt", "đang học", "đang đi chơi", "đang ăn", "cần ôm"];
const quickMessages = ["nhớ em/anh", "ôm cái nào", "đang làm gì đó?", "gửi tim"];
const reactionOptions: Array<{ type: ReactionType; label: string; Icon: LucideIcon }> = [
  { type: "heart", label: "Tim", Icon: Heart },
  { type: "hug", label: "Ôm", Icon: Sparkles },
  { type: "kiss", label: "Hôn", Icon: Send },
  { type: "laugh", label: "Cười", Icon: Smile },
  { type: "miss", label: "Nhớ", Icon: Bell }
];

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthContext is missing");
  return context;
}

function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeContext is missing");
  return context;
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => (localStorage.getItem("lovecheck.theme") as ThemeMode) || "system");

  const applyTheme = useCallback((mode: ThemeMode) => {
    const resolved =
      mode === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : mode;
    document.documentElement.dataset.theme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#000000" : "#ffffff");
  }, []);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("lovecheck.theme", theme);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme(theme);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [applyTheme, theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: setThemeState
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [blocked, setBlocked] = useState(false);

  const signOut = useCallback(() => {
    clearToken();
    setTokenState(null);
    setMe(null);
    setBlocked(false);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch<MeResponse>("/me");
      setMe(response);
      setBlocked(false);
    } catch (error) {
      if (error instanceof ApiError && error.code === "USER_BLOCKED") {
        setBlocked(true);
        return;
      }
      if (error instanceof ApiError && error.status === 401) {
        signOut();
      }
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  const completeAuth = useCallback(
    async (nextToken: string) => {
      saveToken(nextToken);
      setTokenState(nextToken);
      await refreshMe();
    },
    [refreshMe]
  );

  useEffect(() => {
    if (token) void refreshMe();
  }, [refreshMe, token]);

  const value = useMemo(
    () => ({ token, me, loading, blocked, completeAuth, refreshMe, signOut }),
    [token, me, loading, blocked, completeAuth, refreshMe, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/install" element={<InstallPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<Protected />}>
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Navigate to="/app/home" replace />} />
              <Route path="home" element={<HomePage />} />
              <Route path="checkin" element={<CheckInPage />} />
              <Route path="memories" element={<MemoriesPage />} />
              <Route path="random" element={<RandomPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootRedirect() {
  return getToken() ? <Navigate to="/app/home" replace /> : <Navigate to="/onboarding" replace />;
}

function Protected() {
  const { token, loading, blocked } = useAuth();
  if (!token) return <Navigate to="/onboarding" replace />;
  if (loading) return <LoadingScreen />;
  if (blocked) return <BlockedScreen />;
  return <Outlet />;
}

function Brand() {
  return (
    <Link to="/app/home" className="brand" aria-label="LoveCheck home">
      <img src="/logo.svg" alt="" />
      <span>LoveCheck</span>
    </Link>
  );
}

function LoadingScreen() {
  return (
    <main className="center-screen">
      <img src="/logo.svg" className="loading-logo" alt="" />
      <p>Đang mở không gian của hai đứa...</p>
    </main>
  );
}

function BlockedScreen() {
  const { signOut } = useAuth();
  return (
    <main className="center-screen page-pad">
      <ShieldAlert size={40} />
      <h1>Tài khoản đang bị khóa</h1>
      <p className="muted">Bạn chưa thể xem dữ liệu couple lúc này. Hãy liên hệ người quản trị để mở lại.</p>
      <button className="primary-button" onClick={signOut}>
        <LogOut size={18} />
        Đăng xuất
      </button>
    </main>
  );
}

function InstallPage() {
  return (
    <main className="install-screen">
      <section className="install-hero">
        <Brand />
        <h1>Thêm LoveCheck vào màn hình chính</h1>
        <p>Trên iPhone, mở bằng Safari rồi bấm Share và chọn Add to Home Screen.</p>
        <div className="install-steps">
          <span>
            <Share size={18} /> Share
          </span>
          <ChevronRight size={18} />
          <span>Add to Home Screen</span>
        </div>
        <Link to="/onboarding" className="primary-button">
          <Heart size={18} />
          Vào app
        </Link>
      </section>
    </main>
  );
}

function OnboardingPage() {
  const navigate = useNavigate();
  const { completeAuth } = useAuth();
  const [mode, setMode] = useState<"email" | "device" | "login">("email");
  const [displayName, setDisplayName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [coupleCode, setCoupleCode] = useState("LOVE");
  const [loveStartDate, setLoveStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function runAuth(fn: () => Promise<{ token: string }>) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fn();
      await completeAuth(response.token);
      navigate("/app/home", { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chưa vào được, thử lại một chút nhé.");
    } finally {
      setBusy(false);
    }
  }

  async function requestCode(purpose: "register" | "login") {
    setBusy(true);
    setMessage("");
    try {
      const response = await apiFetch<{ ok: boolean; sent: boolean; devCode?: string }>("/auth/request-code", {
        method: "POST",
        body: JSON.stringify({ email, purpose })
      });
      setMessage(response.devCode ? `Mã dev: ${response.devCode}` : "Mã OTP đã được gửi vào email.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không gửi được mã OTP.");
    } finally {
      setBusy(false);
    }
  }

  function submitRegister(event: FormEvent) {
    event.preventDefault();
    void runAuth(() =>
      apiFetch<{ token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ displayName, partnerName, coupleCode, loveStartDate, email, password, otpCode })
      })
    );
  }

  function submitDevice(event: FormEvent) {
    event.preventDefault();
    void runAuth(() =>
      apiFetch<{ token: string }>("/auth/start", {
        method: "POST",
        body: JSON.stringify({
          displayName,
          partnerName,
          coupleCode,
          loveStartDate,
          deviceName: navigator.userAgent.slice(0, 80)
        })
      })
    );
  }

  function submitLogin(event: FormEvent) {
    event.preventDefault();
    void runAuth(() =>
      apiFetch<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, otpCode: otpCode || undefined })
      })
    );
  }

  return (
    <main className="onboarding-screen">
      <section className="auth-panel">
        <Brand />
        <div>
          <p className="eyebrow">Không gian riêng của hai người</p>
          <h1>Gửi một chút hiện tại của bạn</h1>
        </div>

        <div className="segmented" role="tablist" aria-label="Chế độ đăng nhập">
          <button className={mode === "email" ? "active" : ""} onClick={() => setMode("email")} type="button">
            Email + OTP
          </button>
          <button className={mode === "device" ? "active" : ""} onClick={() => setMode("device")} type="button">
            Thiết bị
          </button>
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
            Đăng nhập
          </button>
        </div>

        {mode !== "login" ? (
          <form className="stack" onSubmit={mode === "email" ? submitRegister : submitDevice}>
            <label>
              Tên của bạn
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
            </label>
            <label>
              Tên người ấy
              <input value={partnerName} onChange={(event) => setPartnerName(event.target.value)} required />
            </label>
            <div className="two-cols">
              <label>
                Couple code
                <input value={coupleCode} onChange={(event) => setCoupleCode(event.target.value)} required />
              </label>
              <label>
                Ngày bắt đầu
                <input type="date" value={loveStartDate} onChange={(event) => setLoveStartDate(event.target.value)} />
              </label>
            </div>

            {mode === "email" && (
              <>
                <label>
                  Email
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </label>
                <label>
                  Mật khẩu
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                </label>
                <div className="otp-row">
                  <label>
                    OTP
                    <input inputMode="numeric" value={otpCode} onChange={(event) => setOtpCode(event.target.value)} required />
                  </label>
                  <button className="ghost-button" onClick={() => void requestCode("register")} disabled={!email || busy} type="button">
                    Gửi mã
                  </button>
                </div>
              </>
            )}

            <button className="primary-button" disabled={busy} type="submit">
              <Heart size={18} />
              {mode === "email" ? "Tạo tài khoản" : "Vào bằng thiết bị này"}
            </button>
          </form>
        ) : (
          <form className="stack" onSubmit={submitLogin}>
            <label>
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label>
              Mật khẩu
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <div className="otp-row">
              <label>
                OTP nếu bật
                <input inputMode="numeric" value={otpCode} onChange={(event) => setOtpCode(event.target.value)} />
              </label>
              <button className="ghost-button" onClick={() => void requestCode("login")} disabled={!email || busy} type="button">
                Gửi mã
              </button>
            </div>
            <button className="primary-button" disabled={busy} type="submit">
              <UserRound size={18} />
              Đăng nhập
            </button>
          </form>
        )}

        {message && <p className="form-message">{message}</p>}
        <Link className="install-link" to="/install">
          Cài lên iPhone
        </Link>
      </section>
    </main>
  );
}

function AppShell() {
  const { me } = useAuth();
  const { theme, setTheme } = useTheme();
  const navItems = [
    { to: "/app/home", label: "Home", Icon: Home },
    { to: "/app/memories", label: "Memories", Icon: ImageIcon },
    { to: "/app/checkin", label: "Check-in", Icon: Camera },
    { to: "/app/random", label: "Random", Icon: Dice5 },
    { to: "/app/profile", label: "Profile", Icon: CircleUserRound }
  ];

  return (
    <div className="app-frame">
      <header className="topbar">
        <Brand />
        <button
          className="icon-button"
          aria-label="Đổi theme"
          title="Đổi theme"
          onClick={() => setTheme(theme === "dark" ? "light" : theme === "light" ? "system" : "dark")}
        >
          {theme === "dark" ? <Moon size={19} /> : theme === "light" ? <Sun size={19} /> : <Sparkles size={19} />}
        </button>
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Điều hướng chính">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")} aria-label={label}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {me?.stats.streak ? <div className="soft-badge">Hai đứa đã giữ liên lạc {me.stats.streak} ngày</div> : null}
    </div>
  );
}

function HomePage() {
  const { me, refreshMe } = useAuth();
  const [latest, setLatest] = useState<CheckIn | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasNew, setHasNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch<{ checkIn: CheckIn | null; streak: number }>("/checkins/latest-partner");
      setLatest(response.checkIn);
      setStreak(response.streak);
      const seen = localStorage.getItem("lovecheck.seenPartnerCheckin");
      setHasNew(Boolean(response.checkIn && response.checkIn.id !== seen));
      if (response.checkIn) localStorage.setItem("lovecheck.seenPartnerCheckin", response.checkIn.id);
      await refreshMe();
    } finally {
      setLoading(false);
    }
  }, [refreshMe]);

  useEffect(() => {
    void load();
  }, [load]);

  async function react(type: ReactionType) {
    if (!latest) return;
    const response = await apiFetch<{ checkIn: CheckIn }>(`/checkins/${latest.id}/reactions`, {
      method: "POST",
      body: JSON.stringify({ type })
    });
    setLatest(response.checkIn);
  }

  return (
    <section className="page stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{me?.user.partnerName || "Người ấy"} hôm nay</p>
          <h1>Hôm nay người ấy gửi gì?</h1>
        </div>
        <button className="icon-button" onClick={() => void load()} aria-label="Refresh" title="Refresh">
          <RefreshCw size={19} />
        </button>
      </div>

      {hasNew && <div className="new-badge">Có check-in mới</div>}
      <CheckInCard checkIn={latest} loading={loading} onReact={react} />

      <div className="stats-strip">
        <div>
          <span>{me?.stats.daysTogether || 1}</span>
          <p>ngày yêu nhau</p>
        </div>
        <div>
          <span>{streak}</span>
          <p>streak đôi mình</p>
        </div>
      </div>
    </section>
  );
}

function CheckInCard({
  checkIn,
  loading,
  onReact
}: {
  checkIn: CheckIn | null;
  loading?: boolean;
  onReact?: (type: ReactionType) => void | Promise<void>;
}) {
  if (loading) {
    return <div className="checkin-card skeleton" />;
  }

  if (!checkIn) {
    return (
      <div className="checkin-card empty-card">
        <Heart size={42} />
        <h2>Chưa có check-in nào</h2>
        <p>Một khoảnh khắc nhỏ cũng đủ thành kỷ niệm.</p>
        <Link to="/app/checkin" className="primary-button">
          <Camera size={18} />
          Gửi tấm đầu tiên
        </Link>
      </div>
    );
  }

  const reactionCounts = reactionOptions
    .map((option) => ({
      ...option,
      count: checkIn.reactions.filter((reaction) => reaction.type === option.type).length
    }))
    .filter((item) => item.count > 0);

  return (
    <article className={`checkin-card ${checkIn.imageUrl ? "photo-card" : "text-card"}`}>
      {checkIn.imageUrl ? (
        <img src={checkIn.imageUrl} alt={checkIn.caption || "Check-in"} />
      ) : (
        <div className="text-moment">
          <Sparkles size={34} />
          <p>{checkIn.quickMessage || checkIn.caption || checkIn.mood || "Một check-in nhỏ"}</p>
        </div>
      )}
      <div className="checkin-overlay">
        <div>
          <p className="eyebrow">{checkIn.ownerName}</p>
          <h2>{checkIn.caption || checkIn.quickMessage || checkIn.mood || "Đang nghĩ đến bạn"}</h2>
          <p>{formatDate(checkIn.createdAt)}</p>
        </div>
        {checkIn.mood && <span className="mood-chip">{checkIn.mood}</span>}
      </div>

      {reactionCounts.length > 0 && (
        <div className="reaction-summary">
          {reactionCounts.map(({ type, label, count, Icon }) => (
            <span key={type}>
              <Icon size={14} />
              {label} {count}
            </span>
          ))}
        </div>
      )}

      {onReact && (
        <div className="reaction-bar">
          {reactionOptions.map(({ type, label, Icon }) => (
            <button key={type} onClick={() => void onReact(type)} title={label} aria-label={label}>
              <Icon size={18} />
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function CheckInPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<"photo" | "text" | "mood">("photo");
  const [caption, setCaption] = useState("");
  const [mood, setMood] = useState("");
  const [quickMessage, setQuickMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const form = new FormData();
      form.append("type", type);
      if (caption) form.append("caption", caption);
      if (mood) form.append("mood", mood);
      if (quickMessage) form.append("quickMessage", quickMessage);
      if (file) {
        const image = await compressImage(file);
        if (image.size > 10 * 1024 * 1024) {
          throw new Error("Ảnh vẫn lớn hơn 10MB sau khi nén.");
        }
        form.append("image", image);
      }

      await apiFetch("/checkins", { method: "POST", body: form });
      navigate("/app/home");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không gửi được check-in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Check-in</p>
          <h1>Gửi một chút hiện tại của bạn</h1>
        </div>
      </div>

      <form className="compose-panel stack" onSubmit={submit}>
        <div className="segmented">
          <button className={type === "photo" ? "active" : ""} type="button" onClick={() => setType("photo")}>
            <Camera size={16} /> Ảnh
          </button>
          <button className={type === "text" ? "active" : ""} type="button" onClick={() => setType("text")}>
            <Send size={16} /> Text
          </button>
          <button className={type === "mood" ? "active" : ""} type="button" onClick={() => setType("mood")}>
            <Smile size={16} /> Mood
          </button>
        </div>

        {type === "photo" && (
          <label className="upload-zone">
            <Upload size={26} />
            <span>{file ? file.name : "Chụp hoặc chọn ảnh"}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
        )}

        <label>
          Caption
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={4}
            maxLength={280}
            placeholder="Một khoảnh khắc nhỏ..."
          />
        </label>

        <div className="chip-group">
          {moodOptions.map((item) => (
            <button className={mood === item ? "active" : ""} key={item} type="button" onClick={() => setMood(item)}>
              {item}
            </button>
          ))}
        </div>

        <div className="chip-group">
          {quickMessages.map((item) => (
            <button
              className={quickMessage === item ? "active" : ""}
              key={item}
              type="button"
              onClick={() => setQuickMessage(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <button className="primary-button" disabled={busy} type="submit">
          <Send size={18} />
          Gửi check-in
        </button>
        {message && <p className="form-message">{message}</p>}
      </form>
    </section>
  );
}

function MemoriesPage() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch<{ checkIns: CheckIn[] }>("/checkins");
      setCheckIns(response.checkIns);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="page stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Memories</p>
          <h1>Kỷ niệm gần đây</h1>
        </div>
        <button className="icon-button" onClick={() => void load()} aria-label="Refresh" title="Refresh">
          <RefreshCw size={19} />
        </button>
      </div>

      {!loading && checkIns.length === 0 ? (
        <div className="empty-block">
          <ImageIcon size={36} />
          <h2>Chưa có kỷ niệm nào</h2>
          <p>Gửi một check-in đầu tiên để timeline bắt đầu có hơi thở.</p>
        </div>
      ) : (
        <div className="memory-grid">
          {checkIns.map((item) => (
            <CheckInCard key={item.id} checkIn={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function RandomPage() {
  const [categories, setCategories] = useState<RandomCategory[]>([]);
  const [history, setHistory] = useState<RandomEvent[]>([]);
  const [category, setCategory] = useState<string>("");
  const [current, setCurrent] = useState<RandomEvent | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [categoryResponse, historyResponse] = await Promise.all([
      apiFetch<{ categories: RandomCategory[] }>("/random/categories"),
      apiFetch<{ events: RandomEvent[] }>("/random/history")
    ]);
    setCategories(categoryResponse.categories);
    setHistory(historyResponse.events);
    setCategory((value) => value || categoryResponse.categories[0]?.id || "");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function draw() {
    setBusy(true);
    try {
      const response = await apiFetch<{ event: RandomEvent }>("/random/draw", {
        method: "POST",
        body: JSON.stringify({ category })
      });
      setCurrent(response.event);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Random</p>
          <h1>Bốc một tín hiệu nhỏ</h1>
        </div>
      </div>

      <div className="random-panel">
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <button className="primary-button" onClick={() => void draw()} disabled={busy}>
          <Dice5 size={18} />
          Random ngay
        </button>
      </div>

      {current && (
        <div className="prompt-card">
          <p className="eyebrow">{current.category}</p>
          <h2>{current.prompt}</h2>
        </div>
      )}

      <div className="timeline-list">
        {history.map((event) => (
          <article key={event.id}>
            <p className="eyebrow">{event.category}</p>
            <h3>{event.prompt}</h3>
            <time>{formatDate(event.createdAt)}</time>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProfilePage() {
  const { me, refreshMe, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(me?.user.displayName || "");
  const [partnerName, setPartnerName] = useState(me?.user.partnerName || "");
  const [loveStartDate, setLoveStartDate] = useState(me?.couple?.loveStartDate?.slice(0, 10) || "");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDisplayName(me?.user.displayName || "");
    setPartnerName(me?.user.partnerName || "");
    setLoveStartDate(me?.couple?.loveStartDate?.slice(0, 10) || "");
  }, [me]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    await apiFetch("/me", {
      method: "PATCH",
      body: JSON.stringify({ displayName, partnerName, loveStartDate })
    });
    await refreshMe();
    setMessage("Đã lưu.");
  }

  async function uploadAvatar(file: File | null, partner = false) {
    if (!file) return;
    const form = new FormData();
    form.append("image", await compressImage(file));
    await apiFetch(partner ? "/me/partner-avatar" : "/me/avatar", { method: "POST", body: form });
    await refreshMe();
  }

  async function enablePush() {
    setMessage("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        throw new Error("Thiết bị này chưa hỗ trợ Web Push.");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Bạn chưa cấp quyền thông báo.");
      const { publicKey } = await apiFetch<{ publicKey: string | null }>("/push/public-key");
      if (!publicKey) throw new Error("Chưa cấu hình VAPID_PUBLIC_KEY trên server.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      await apiFetch("/push/subscribe", {
        method: "POST",
        body: JSON.stringify(subscription.toJSON())
      });
      setMessage("Đã bật thông báo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không bật được thông báo.");
    }
  }

  return (
    <section className="page stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Profile</p>
          <h1>Thông tin đôi mình</h1>
        </div>
      </div>

      <div className="profile-avatars">
        <Avatar image={me?.user.avatarUrl} label={me?.user.displayName || "Bạn"} />
        <Heart size={20} />
        <Avatar image={me?.user.partnerAvatarUrl} label={me?.user.partnerName || "Người ấy"} />
      </div>

      <div className="stats-strip">
        <div>
          <span>{me?.stats.daysTogether || 1}</span>
          <p>ngày yêu nhau</p>
        </div>
        <div>
          <span>{me?.stats.streak || 0}</span>
          <p>ngày liên lạc</p>
        </div>
      </div>

      <form className="compose-panel stack" onSubmit={saveProfile}>
        <div className="code-row">
          <span>Couple code</span>
          <strong>{me?.couple?.code}</strong>
          <button
            className="icon-button"
            type="button"
            title="Copy"
            aria-label="Copy couple code"
            onClick={() => void navigator.clipboard.writeText(me?.couple?.code || "")}
          >
            <Copy size={17} />
          </button>
        </div>
        <label>
          Tên của bạn
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </label>
        <label>
          Tên người ấy
          <input value={partnerName} onChange={(event) => setPartnerName(event.target.value)} />
        </label>
        <label>
          Ngày bắt đầu yêu
          <input type="date" value={loveStartDate} onChange={(event) => setLoveStartDate(event.target.value)} />
        </label>

        <div className="two-cols">
          <label className="file-button">
            <Upload size={16} />
            Avatar của bạn
            <input type="file" accept="image/*" onChange={(event) => void uploadAvatar(event.target.files?.[0] ?? null)} />
          </label>
          <label className="file-button">
            <Upload size={16} />
            Avatar người ấy
            <input
              type="file"
              accept="image/*"
              onChange={(event) => void uploadAvatar(event.target.files?.[0] ?? null, true)}
            />
          </label>
        </div>

        <div className="segmented">
          {(["light", "dark", "system"] as ThemeMode[]).map((item) => (
            <button className={theme === item ? "active" : ""} type="button" onClick={() => setTheme(item)} key={item}>
              {item === "light" ? "Light" : item === "dark" ? "Dark" : "System"}
            </button>
          ))}
        </div>

        <button className="primary-button" type="submit">
          <Check size={18} />
          Lưu thay đổi
        </button>
        <button className="ghost-button" type="button" onClick={() => void enablePush()}>
          <Bell size={18} />
          Bật thông báo
        </button>
        <button className="danger-button" type="button" onClick={signOut}>
          <LogOut size={18} />
          Đăng xuất
        </button>
        {message && <p className="form-message">{message}</p>}
      </form>
    </section>
  );
}

function Avatar({ image, label }: { image?: string; label: string }) {
  return (
    <div className="avatar-block">
      <div className="avatar">{image ? <img src={image} alt={label} /> : <UserRound size={28} />}</div>
      <span>{label}</span>
    </div>
  );
}

async function compressImage(file: File) {
  if (!file.type.startsWith("image/")) return file;
  if (file.size < 1_500_000) return file;

  try {
    const image = await createImageBitmap(file);
    const maxSide = 1600;
    const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * ratio);
    canvas.height = Math.round(image.height * ratio);
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.84));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = `${base64}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(normalized);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
