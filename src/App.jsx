import { useState, useEffect } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "friend-reminder-data-v3";
const ms = (days) => days * 24 * 60 * 60 * 1000;
const daysAgo = (d) => Date.now() - ms(d);

function generateDummyData() {
  const interval = 30;
  const friends = [
    { id: 1, name: "Anna",   intervalDays: interval },
    { id: 2, name: "Ben",    intervalDays: interval },
    { id: 3, name: "Clara",  intervalDays: interval },
    { id: 4, name: "David",  intervalDays: interval },
    { id: 5, name: "Eva",    intervalDays: interval },
  ];
  const contacts = {
    1: { lastContact: daysAgo(Math.round(interval * 0.2)),  lastType: "real" },
    2: { lastContact: daysAgo(Math.round(interval * 0.55)), lastType: "chat" },
    3: { lastContact: daysAgo(Math.round(interval * 0.85)), lastType: "real" },
    4: { lastContact: daysAgo(Math.round(interval * 1.15)), lastType: "chat" },
    5: { lastContact: daysAgo(Math.round(interval * 1.5)),  lastType: "real" },
  };
  return { friends, contacts };
}

const INTERVAL_PRESETS = [
  { label: "Täglich",       days: 1  },
  { label: "Alle 3 Tage",   days: 3  },
  { label: "Wöchentlich",   days: 7  },
  { label: "Alle 2 Wochen", days: 14 },
  { label: "Monatlich",     days: 30 },
  { label: "Alle 3 Monate", days: 90 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysSince(ts) {
  if (!ts) return null;
  return Math.floor((Date.now() - ts) / ms(1));
}
function getRatio(days, interval) {
  if (days === null) return 1.5;
  return Math.min(days / interval, 1.5);
}
function getColorFromRatio(r) {
  if (r > 1.3) return { ring: "#d94040", bg: "#ffd5d5", label: "Dringend!", emoji: "🔥" };
  if (r > 1.0) return { ring: "#e07a30", bg: "#ffe0b2", label: "Zu lang!",  emoji: "🍂" };
  if (r > 0.7) return { ring: "#e6a817", bg: "#fff3cd", label: "Bald melden", emoji: "☀️" };
  if (r > 0.4) return { ring: "#7ab648", bg: "#d8ecc2", label: "Gut",       emoji: "🌼" };
  return             { ring: "#52a069", bg: "#d4edda", label: "Frisch",    emoji: "🌿" };
}
function formatTime(days) {
  if (days === null) return "Noch kein Kontakt";
  if (days === 0) return "Heute";
  if (days === 1) return "Gestern";
  if (days < 7)  return `Vor ${days} Tagen`;
  if (days < 14) return "Vor 1 Woche";
  if (days < 30) return `Vor ${Math.floor(days / 7)} Wochen`;
  if (days < 60) return "Vor 1 Monat";
  return `Vor ${Math.floor(days / 30)} Monaten`;
}
function formatInterval(days) {
  const p = INTERVAL_PRESETS.find(x => x.days === days);
  if (p) return p.label;
  if (days === 1) return "Täglich";
  if (days < 7)  return `Alle ${days} Tage`;
  if (days % 7 === 0) return `Alle ${days / 7} Wochen`;
  if (days % 30 === 0) return `Alle ${days / 30} Monate`;
  return `Alle ${days} Tage`;
}

// ─── useIsMobile ──────────────────────────────────────────────────────────────

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

// ─── Ring Avatar ──────────────────────────────────────────────────────────────

function RingAvatar({ name, ratio, size = 56 }) {
  const { ring, bg } = getColorFromRatio(ratio);
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ring + "28"} strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ring} strokeWidth={4}
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={ratio > 1 ? 0 : circ * (1 - Math.min(ratio, 1))}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 5, borderRadius: "50%", background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Fraunces', serif", fontSize: size * 0.38, fontWeight: 700, color: "#2d2015",
      }}>
        {name.charAt(0)}
      </div>
    </div>
  );
}

// ─── Modal Shell (responsive: centered on desktop, bottom-sheet on mobile) ────

function ModalShell({ onClose, children, border }) {
  const isMobile = useIsMobile();
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(40,30,20,0.55)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        zIndex: 100, backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease",
        padding: isMobile ? 0 : 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fdf8f1",
          borderRadius: isMobile ? "20px 20px 0 0" : 20,
          padding: isMobile ? "24px 20px 32px" : "32px",
          width: isMobile ? "100%" : "min(440px, 92vw)",
          maxHeight: isMobile ? "92vh" : "90vh",
          overflowY: "auto",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
          border: border || "2px solid #e8d9c4",
          animation: isMobile ? "slideUpSheet 0.3s cubic-bezier(0.4,0,0.2,1)" : "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Drag handle on mobile */}
        {isMobile && (
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#ddd5c8", margin: "0 auto 20px" }} />
        )}
        {children}
      </div>
    </div>
  );
}

// ─── Edit / Add Modal ─────────────────────────────────────────────────────────

function EditModal({ friend, isNew, onClose, onSave, onDelete }) {
  const initialInterval = friend?.intervalDays ?? null;
  const hasPreset = initialInterval !== null && !!INTERVAL_PRESETS.find(p => p.days === initialInterval);

  const [name, setName]             = useState(friend?.name ?? "");
  const [intervalDays, setInterval] = useState(initialInterval);
  const [customMode, setCustomMode] = useState(initialInterval !== null && !hasPreset);
  const [customVal, setCustomVal]   = useState(initialInterval !== null && !hasPreset ? String(initialInterval) : "");
  const [errors, setErrors]         = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handlePreset = (days) => {
    setInterval(days); setCustomMode(false); setCustomVal("");
    setErrors(e => ({ ...e, interval: null }));
  };
  const handleCustom = (val) => {
    setCustomVal(val); setCustomMode(true);
    const n = parseInt(val);
    if (!isNaN(n) && n > 0) { setInterval(n); setErrors(e => ({ ...e, interval: null })); }
    else setInterval(null);
  };
  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = "Bitte einen Namen eingeben.";
    if (!intervalDays || intervalDays < 1) errs.interval = "Bitte ein Intervall wählen oder eingeben.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };
  const isPresetActive = (days) => !customMode && intervalDays === days;

  return (
    <ModalShell onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: "#2d2015" }}>
          {isNew ? "Freund hinzufügen" : "Freund bearbeiten"}
        </h2>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#8a7060", padding: "4px 8px" }}>✕</button>
      </div>

      {/* Name */}
      <div style={{ marginBottom: 22 }}>
        <label style={{ fontFamily: "'Lato', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8, color: errors.name ? "#d94040" : "#b8a898" }}>
          Name {errors.name && <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0 }}>– {errors.name}</span>}
        </label>
        <input
          value={name}
          onChange={e => { setName(e.target.value); if (e.target.value.trim()) setErrors(er => ({ ...er, name: null })); }}
          placeholder="z.B. Anna"
          style={{
            width: "100%", padding: "13px 14px", borderRadius: 10,
            border: `2px solid ${errors.name ? "#d94040" : "#ddd5c8"}`,
            background: errors.name ? "#fff5f5" : "#faf5ee",
            fontFamily: "'Fraunces', serif", fontSize: 18, color: "#2d2015", outline: "none",
            WebkitAppearance: "none"
          }}
        />
      </div>

      {/* Interval */}
      <div style={{ marginBottom: 26 }}>
        <label style={{ fontFamily: "'Lato', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8, color: errors.interval ? "#d94040" : "#b8a898" }}>
          Kontakt-Intervall {errors.interval && <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0 }}>– {errors.interval}</span>}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
          {INTERVAL_PRESETS.map(p => (
            <button key={p.days} onClick={() => handlePreset(p.days)} style={{
              padding: "11px 6px", borderRadius: 10, fontSize: 12,
              fontFamily: "'Lato', sans-serif", fontWeight: isPresetActive(p.days) ? 700 : 400,
              cursor: "pointer", border: `2px solid ${isPresetActive(p.days) ? "#52a069" : "#ddd5c8"}`,
              background: isPresetActive(p.days) ? "#d4edda" : "#faf5ee",
              color: isPresetActive(p.days) ? "#2a6040" : "#6a5545", transition: "all 0.15s",
              touchAction: "manipulation"
            }}>{p.label}</button>
          ))}
        </div>
        <div onClick={() => setCustomMode(true)} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10,
          border: `2px solid ${customMode && intervalDays ? "#52a069" : "#ddd5c8"}`,
          background: customMode && intervalDays ? "#d4edda" : "#faf5ee",
          cursor: "text", transition: "all 0.15s"
        }}>
          <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 13, color: "#8a7060", whiteSpace: "nowrap" }}>Alle</span>
          <input type="number" min="1" max="365" value={customVal} placeholder="?"
            onChange={e => handleCustom(e.target.value)}
            onFocus={() => setCustomMode(true)}
            style={{ width: 52, border: "none", background: "transparent", fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, color: "#2d2015", outline: "none", textAlign: "center" }}
          />
          <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 13, color: "#8a7060" }}>Tage (individuell)</span>
        </div>
        {intervalDays && intervalDays > 0 && (
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 13, color: "#8a7060", marginTop: 10, textAlign: "center" }}>
            Ziel: <strong style={{ color: "#52a069" }}>{formatInterval(intervalDays)}</strong> mit {name.trim() || "dieser Person"}
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        {!isNew && (
          <button onClick={() => setShowDeleteConfirm(true)} style={{
            padding: "14px", borderRadius: 10, border: "2px solid #ffd5d5",
            background: "#fff5f5", color: "#d94040", fontSize: 16, cursor: "pointer",
            transition: "all 0.18s", flexShrink: 0, touchAction: "manipulation"
          }}
            onMouseEnter={e => e.currentTarget.style.background = "#ffd5d5"}
            onMouseLeave={e => e.currentTarget.style.background = "#fff5f5"}
          >🗑️</button>
        )}
        <button onClick={onClose} style={{
          flex: 1, padding: "14px", borderRadius: 10, border: "2px solid #ddd5c8",
          background: "transparent", color: "#8a7060", fontFamily: "'Lato', sans-serif",
          fontSize: 15, cursor: "pointer", touchAction: "manipulation"
        }}>Abbrechen</button>
        <button onClick={() => { if (validate()) onSave({ name: name.trim(), intervalDays }); }} style={{
          flex: 2, padding: "14px", borderRadius: 10, border: "none",
          background: "#52a069", color: "#fff", fontFamily: "'Lato', sans-serif",
          fontSize: 15, fontWeight: 700, cursor: "pointer",
          boxShadow: "0 4px 12px #52a06955", touchAction: "manipulation"
        }}>{isNew ? "+ Hinzufügen" : "✓ Speichern"}</button>
      </div>

      {/* Delete confirm – overlaid inside modal */}
      {showDeleteConfirm && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(253,248,241,0.97)",
          borderRadius: "inherit", display: "flex", alignItems: "center", justifyContent: "center",
          padding: 28, zIndex: 10, animation: "fadeIn 0.15s ease"
        }}>
          <div style={{ textAlign: "center", maxWidth: 300 }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: "#2d2015", marginBottom: 8 }}>
              {friend?.name} löschen?
            </h3>
            <p style={{ fontFamily: "'Lato', sans-serif", color: "#8a7060", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              Alle Kontaktdaten werden dauerhaft entfernt.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: "13px", borderRadius: 10, border: "2px solid #ddd5c8", background: "transparent", color: "#8a7060", fontFamily: "'Lato', sans-serif", fontSize: 14, cursor: "pointer" }}>Abbrechen</button>
              <button onClick={onDelete} style={{ flex: 1, padding: "13px", borderRadius: 10, border: "none", background: "#d94040", color: "#fff", fontFamily: "'Lato', sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Ja, löschen</button>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// ─── Contact Modal ────────────────────────────────────────────────────────────

function ContactModal({ friend, contactData, intervalDays, onClose, onLog }) {
  const [type, setType] = useState("chat");
  const days = getDaysSince(contactData?.lastContact);
  const ratio = getRatio(days, intervalDays);
  const { ring, bg } = getColorFromRatio(ratio);

  return (
    <ModalShell onClose={onClose} border={`3px solid ${ring}`}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <RingAvatar name={friend.name} ratio={ratio} size={72} />
        </div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, color: "#2d2015", margin: 0 }}>{friend.name}</h2>
        <p style={{ color: "#8a7060", fontSize: 14, marginTop: 4, fontFamily: "'Lato', sans-serif" }}>
          {formatTime(days)} · Ziel: {formatInterval(intervalDays)}
        </p>
      </div>

      <p style={{ fontFamily: "'Lato', sans-serif", color: "#5a4535", fontSize: 15, textAlign: "center", marginBottom: 16 }}>
        Welche Art von Kontakt hattest du?
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {[{ value: "chat", label: "💬 Chat / Nachricht" }, { value: "real", label: "🤝 Echter Kontakt" }].map(opt => (
          <button key={opt.value} onClick={() => setType(opt.value)} style={{
            flex: 1, padding: "15px 10px", borderRadius: 12,
            border: `2px solid ${type === opt.value ? ring : "#ddd5c8"}`,
            background: type === opt.value ? bg : "#faf5ee",
            color: type === opt.value ? "#2d2015" : "#8a7060",
            fontFamily: "'Lato', sans-serif", fontSize: 14, cursor: "pointer",
            fontWeight: type === opt.value ? 700 : 400, transition: "all 0.2s",
            touchAction: "manipulation"
          }}>{opt.label}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "14px", borderRadius: 10, border: "2px solid #ddd5c8", background: "transparent", color: "#8a7060", fontFamily: "'Lato', sans-serif", fontSize: 15, cursor: "pointer", touchAction: "manipulation" }}>
          Abbrechen
        </button>
        <button onClick={() => onLog(type)} style={{ flex: 2, padding: "14px", borderRadius: 10, border: "none", background: ring, color: "#fff", fontFamily: "'Lato', sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 12px ${ring}55`, touchAction: "manipulation" }}>
          ✓ Kontakt bestätigen
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Friend Card ──────────────────────────────────────────────────────────────

function FriendCard({ friend, contactData, onLogContact, onEdit }) {
  const days = getDaysSince(contactData?.lastContact);
  const interval = friend.intervalDays || 30;
  const ratio = getRatio(days, interval);
  const { bg, ring, label, emoji } = getColorFromRatio(ratio);

  return (
    <div
      onClick={onLogContact}
      className="friend-card"
      style={{
        background: bg, borderRadius: 16, padding: "16px",
        cursor: "pointer", border: `2px solid ${ring}33`,
        boxShadow: `0 4px 16px ${ring}18, 0 1px 3px rgba(0,0,0,0.05)`,
        transition: "transform 0.18s, box-shadow 0.18s",
        display: "flex", flexDirection: "column", gap: 12,
        WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <RingAvatar name={friend.name} ratio={ratio} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, color: "#2d2015", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {friend.name}
          </div>
          <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 11, color: ring, fontWeight: 700, marginTop: 2, opacity: 0.85 }}>
            {formatInterval(interval)}
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onEdit(); }}
          style={{ background: ring + "22", border: "none", cursor: "pointer", fontSize: 13, padding: "7px 8px", borderRadius: 8, transition: "background 0.15s", lineHeight: 1, flexShrink: 0, touchAction: "manipulation" }}
          onMouseEnter={e => e.currentTarget.style.background = ring + "44"}
          onMouseLeave={e => e.currentTarget.style.background = ring + "22"}
        >✏️</button>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: ring + "20", borderRadius: 20, padding: "3px 10px" }}>
          <span style={{ fontSize: 12 }}>{emoji}</span>
          <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 11, fontWeight: 700, color: ring }}>{label}</span>
        </div>
        <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 11, color: "#8a7060" }}>
          {formatTime(days)}{contactData?.lastType && <span style={{ marginLeft: 4 }}>{contactData.lastType === "chat" ? "💬" : "🤝"}</span>}
        </div>
      </div>

      <div style={{ height: 3, borderRadius: 2, background: ring + "25" }}>
        <div style={{ height: "100%", borderRadius: 2, background: ring, width: `${Math.min(ratio * 100, 100)}%`, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ─── Add Card ─────────────────────────────────────────────────────────────────

function AddCard({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16, padding: "16px", cursor: "pointer",
        border: `2px dashed ${hovered ? "#7ab648" : "#c8b8a8"}`,
        background: hovered ? "#f0f7ea" : "transparent",
        minHeight: 120, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 10,
        transition: "all 0.2s", touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        border: `2px dashed ${hovered ? "#7ab648" : "#c8b8a8"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, color: hovered ? "#7ab648" : "#c8b8a8", transition: "all 0.2s"
      }}>+</div>
      <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 13, fontWeight: 700, color: hovered ? "#7ab648" : "#b8a898", transition: "color 0.2s" }}>
        Freund hinzufügen
      </span>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const dummy = generateDummyData();
  const [friends, setFriends]     = useState(dummy.friends);
  const [contacts, setContacts]   = useState(dummy.contacts);
  const [selected, setSelected]   = useState(null);
  const [editing, setEditing]     = useState(null);
  const [addingNew, setAddingNew] = useState(false);
  const [toast, setToast]         = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.friends)  setFriends(data.friends);
        if (data.contacts) setContacts(data.contacts);
      }
    } catch {}
  }, []);

  const save = (f, c) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ friends: f, contacts: c })); } catch {}
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const logContact = (type) => {
    if (!selected) return;
    const newC = { ...contacts, [selected.id]: { lastContact: Date.now(), lastType: type } };
    setContacts(newC); save(friends, newC);
    showToast(`${selected.name} – Kontakt gespeichert ${type === "chat" ? "💬" : "🤝"}`);
    setSelected(null);
  };

  const saveFriend = ({ name, intervalDays }) => {
    const newF = friends.map(f => f.id === editing.id ? { ...f, name, intervalDays } : f);
    setFriends(newF); save(newF, contacts);
    showToast(`${name} – Einstellungen gespeichert ✓`);
    setEditing(null);
  };

  const addFriend = ({ name, intervalDays }) => {
    const newId = Math.max(0, ...friends.map(f => f.id)) + 1;
    const newF = [...friends, { id: newId, name, intervalDays }];
    setFriends(newF); save(newF, contacts);
    showToast(`${name} wurde hinzugefügt 🌱`);
    setAddingNew(false);
  };

  const deleteFriend = () => {
    const newF = friends.filter(f => f.id !== editing.id);
    const newC = { ...contacts };
    delete newC[editing.id];
    setFriends(newF); setContacts(newC); save(newF, newC);
    showToast(`${editing.name} wurde entfernt`);
    setEditing(null);
  };

  const sorted = [...friends].sort((a, b) =>
    getRatio(getDaysSince(contacts[b.id]?.lastContact), b.intervalDays || 30) -
    getRatio(getDaysSince(contacts[a.id]?.lastContact), a.intervalDays || 30)
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,400&family=Lato:wght@400;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-text-size-adjust: 100%; }
        body { background: #f5ede0; min-height: 100dvh; }

        @keyframes fadeIn      { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp     { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideUpSheet{ from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes toastIn     { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }

        input[type=number]::-webkit-inner-spin-button { opacity: 1; }

        /* Card hover – desktop only */
        @media (hover: hover) {
          .friend-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 28px rgba(0,0,0,0.12) !important;
          }
        }

        /* Grid layout */
        .card-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(2, 1fr);
        }
        @media (min-width: 0px) {
          .card-grid { grid-template-columns: 1fr; }
        }
        @media (min-width: 480px) {
          .card-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 680px) {
          .card-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 900px) {
          .card-grid { grid-template-columns: repeat(4, 1fr); }
        }

        /* Page padding */
        .page-wrap {
          display: flex;
          justify-content: center;
          padding: 24px 16px 40px;
        }
        @media (min-width: 640px) {
          .page-wrap { padding: 40px 24px 60px; }
        }

        /* Max width container */
        .content-wrap {
          max-width: 960px;
          margin: 0 auto;
        }

        /* Toast */
        .toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #2d2015;
          color: #f5ede0;
          padding: 12px 20px;
          border-radius: 24px;
          font-family: 'Lato', sans-serif;
          font-size: 14px;
          white-space: nowrap;
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
          animation: toastIn 0.3s ease;
          z-index: 300;
        }
        @media (min-width: 640px) {
          .toast {
            left: auto;
            right: 24px;
            bottom: 28px;
            transform: none;
            border-radius: 12px;
          }
        }
      `}</style>

      <div
        className="page-wrap"
        style={{ minHeight: "100dvh", background: "linear-gradient(135deg, #f9f0e3 0%, #f0e4d0 50%, #e8d9c4 100%)", fontFamily: "'Lato', sans-serif" }}
      >
        <div className="content-wrap">

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(26px, 6vw, 44px)", color: "#2d2015", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 6 }}>
              Friendly Reminder 🌿
            </h1>
            <p style={{ color: "#8a7060", fontSize: "clamp(13px, 3.5vw, 15px)" }}>
              Karte antippen zum Kontakt erfassen · ✏️ für Einstellungen
            </p>

            {/* Legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
              {[
                { label: "< 40%",     ring: "#52a069", bg: "#d4edda" },
                { label: "40–70%",    ring: "#7ab648", bg: "#d8ecc2" },
                { label: "70–100%",   ring: "#e6a817", bg: "#fff3cd" },
                { label: "Überfällig",ring: "#e07a30", bg: "#ffe0b2" },
                { label: "Dringend",  ring: "#d94040", bg: "#ffd5d5" },
              ].map(c => (
                <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 5, background: c.bg, borderRadius: 20, padding: "3px 9px", border: `1px solid ${c.ring}33` }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.ring, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: c.ring, fontWeight: 700, whiteSpace: "nowrap" }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card grid */}
          <div className="card-grid">
            {sorted.map(friend => (
              <FriendCard
                key={friend.id} friend={friend}
                contactData={contacts[friend.id]}
                onLogContact={() => setSelected(friend)}
                onEdit={() => setEditing(friend)}
              />
            ))}
            <AddCard onClick={() => setAddingNew(true)} />
          </div>

          <p style={{ textAlign: "center", color: "#b8a898", fontSize: 11, marginTop: 32 }}>
            Sortiert nach Dringlichkeit · Daten lokal gespeichert
          </p>
        </div>
      </div>

      {selected && (
        <ContactModal friend={selected} contactData={contacts[selected.id]}
          intervalDays={selected.intervalDays || 30}
          onClose={() => setSelected(null)} onLog={logContact} />
      )}
      {editing && (
        <EditModal friend={editing} isNew={false}
          onClose={() => setEditing(null)} onSave={saveFriend} onDelete={deleteFriend} />
      )}
      {addingNew && (
        <EditModal friend={null} isNew={true}
          onClose={() => setAddingNew(false)} onSave={addFriend} onDelete={null} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
