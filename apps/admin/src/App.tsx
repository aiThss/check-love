import { Ban, CheckCircle2, Heart, Image, LogOut, RefreshCw, Shield, Trash2, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { apiFetch, clearAdminToken, getAdminToken, saveAdminToken } from "./api";

type Summary = {
  users: number;
  couples: number;
  checkIns: number;
  blockedUsers: number;
  randomEvents: number;
  pushSubscriptions: number;
};

type AdminUser = {
  id: string;
  displayName: string;
  partnerName: string;
  email?: string;
  status: "active" | "blocked";
  coupleId: string;
  createdAt: string;
};

type AdminCouple = {
  id: string;
  code: string;
  loveStartDate: string;
  memberIds: string[];
  createdAt: string;
};

type AdminCheckIn = {
  id: string;
  coupleId: string;
  ownerName: string;
  type: string;
  imageUrl?: string;
  caption?: string;
  mood?: string;
  quickMessage?: string;
  deletedAt?: string;
  createdAt: string;
};

type AdminRandomEvent = {
  id: string;
  coupleId: string;
  userId: string;
  category: string;
  prompt: string;
  createdAt: string;
};

export function App() {
  const [token, setToken] = useState(() => getAdminToken());

  function logout() {
    clearAdminToken();
    setToken(null);
  }

  if (!token) {
    return <Login onLogin={(nextToken) => setToken(nextToken)} />;
  }

  return <Dashboard onLogout={logout} />;
}

function Login({ onLogin }: { onLogin(token: string): void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await apiFetch<{ token: string }>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      saveAdminToken(response.token);
      onLogin(response.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không đăng nhập được.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <img src="/logo.svg" alt="" />
        <div>
          <p className="eyebrow">Admin</p>
          <h1>LoveCheck control</h1>
        </div>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button disabled={busy}>
          <Shield size={18} />
          Đăng nhập
        </button>
        {message && <p className="message">{message}</p>}
      </form>
    </main>
  );
}

function Dashboard({ onLogout }: { onLogout(): void }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [couples, setCouples] = useState<AdminCouple[]>([]);
  const [checkIns, setCheckIns] = useState<AdminCheckIn[]>([]);
  const [events, setEvents] = useState<AdminRandomEvent[]>([]);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setMessage("");
    const [summaryData, userData, coupleData, checkInData, eventData] = await Promise.all([
      apiFetch<Summary>("/admin/summary"),
      apiFetch<{ users: AdminUser[] }>("/admin/users"),
      apiFetch<{ couples: AdminCouple[] }>("/admin/couples"),
      apiFetch<{ checkIns: AdminCheckIn[] }>("/admin/checkins"),
      apiFetch<{ events: AdminRandomEvent[] }>("/admin/random-events")
    ]);
    setSummary(summaryData);
    setUsers(userData.users);
    setCouples(coupleData.couples);
    setCheckIns(checkInData.checkIns);
    setEvents(eventData.events);
  }, []);

  useEffect(() => {
    void load().catch((error) => setMessage(error instanceof Error ? error.message : "Không tải được dữ liệu."));
  }, [load]);

  async function setUserStatus(id: string, status: "active" | "blocked") {
    await apiFetch(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    await load();
  }

  async function setLoveDate(id: string, loveStartDate: string) {
    await apiFetch(`/admin/couples/${id}`, { method: "PATCH", body: JSON.stringify({ loveStartDate }) });
    await load();
  }

  async function deleteCheckIn(id: string) {
    await apiFetch(`/admin/checkins/${id}`, { method: "DELETE" });
    await load();
  }

  const statCards = [
    { label: "Users", value: summary?.users ?? 0, Icon: UsersRound },
    { label: "Couples", value: summary?.couples ?? 0, Icon: Heart },
    { label: "Check-ins", value: summary?.checkIns ?? 0, Icon: Image },
    { label: "Blocked", value: summary?.blockedUsers ?? 0, Icon: Ban },
    { label: "Random", value: summary?.randomEvents ?? 0, Icon: RefreshCw },
    { label: "Push", value: summary?.pushSubscriptions ?? 0, Icon: CheckCircle2 }
  ];

  return (
    <main className="dashboard">
      <header className="topbar">
        <div className="brand">
          <img src="/logo.svg" alt="" />
          <span>LoveCheck Admin</span>
        </div>
        <div className="top-actions">
          <button onClick={() => void load()}>
            <RefreshCw size={17} />
            Refresh
          </button>
          <button onClick={onLogout}>
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </header>

      {message && <p className="message">{message}</p>}

      <section className="stat-grid">
        {statCards.map(({ label, value, Icon }) => (
          <article key={label} className="stat-card">
            <Icon size={20} />
            <span>{value}</span>
            <p>{label}</p>
          </article>
        ))}
      </section>

      <Section title="Users">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Couple</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.displayName}</strong>
                    <small>Partner: {user.partnerName}</small>
                  </td>
                  <td>{user.email || "device session"}</td>
                  <td>{user.coupleId}</td>
                  <td>
                    <span className={`pill ${user.status}`}>{user.status}</span>
                  </td>
                  <td>
                    <button
                      onClick={() => void setUserStatus(user.id, user.status === "blocked" ? "active" : "blocked")}
                    >
                      {user.status === "blocked" ? "Unblock" : "Block"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Couples">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Members</th>
                <th>Love date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {couples.map((couple) => (
                <tr key={couple.id}>
                  <td>
                    <strong>{couple.code}</strong>
                    <small>{couple.id}</small>
                  </td>
                  <td>{couple.memberIds.length}/2</td>
                  <td>
                    <input
                      type="date"
                      defaultValue={couple.loveStartDate.slice(0, 10)}
                      onBlur={(event) => void setLoveDate(couple.id, event.currentTarget.value)}
                    />
                  </td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Check-ins">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Owner</th>
                <th>Content</th>
                <th>Type</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {checkIns.map((item) => (
                <tr key={item.id} className={item.deletedAt ? "deleted" : ""}>
                  <td>{item.ownerName}</td>
                  <td>
                    {item.imageUrl && <img className="thumb" src={item.imageUrl} alt="" />}
                    <strong>{item.caption || item.quickMessage || item.mood || "No caption"}</strong>
                    <small>{item.coupleId}</small>
                  </td>
                  <td>{item.type}</td>
                  <td>{formatDate(item.createdAt)}</td>
                  <td>
                    {!item.deletedAt && (
                      <button className="danger" onClick={() => void deleteCheckIn(item.id)}>
                        <Trash2 size={15} />
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Random history">
        <div className="event-grid">
          {events.map((event) => (
            <article key={event.id}>
              <p className="eyebrow">{event.category}</p>
              <h3>{event.prompt}</h3>
              <small>{formatDate(event.createdAt)}</small>
            </article>
          ))}
        </div>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
