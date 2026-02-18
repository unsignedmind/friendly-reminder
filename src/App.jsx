import { useState, useEffect, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "friend-reminder-data-v4";
const ms = (days) => days * 24 * 60 * 60 * 1000;
const daysAgo = (d) => Date.now() - ms(d);

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isoToTimestamp(iso) {
  return new Date(iso + "T12:00:00").getTime();
}

const DEFAULT_GROUPS = [{ id: "favorites", name: "Favoriten", canDelete: false }];

function generateDummyData() {
  const interval = 30;
  const friends = [
    { id: 1, name: "Anna",  intervalDays: interval, group: "favorites" },
    { id: 2, name: "Ben",   intervalDays: interval, group: null },
    { id: 3, name: "Clara", intervalDays: interval, group: null },
    { id: 4, name: "David", intervalDays: interval, group: "favorites" },
    { id: 5, name: "Eva",   intervalDays: interval, group: null },
  ];
  const contacts = {
    1: { lastContact: daysAgo(Math.round(interval * 0.2)),  lastType: "real" },
    2: { lastContact: daysAgo(Math.round(interval * 0.55)), lastType: "chat" },
    3: { lastContact: daysAgo(Math.round(interval * 0.85)), lastType: "real" },
    4: { lastContact: daysAgo(Math.round(interval * 1.15)), lastType: "chat" },
    5: { lastContact: daysAgo(Math.round(interval * 1.5)),  lastType: "real" },
  };
  return { friends, contacts, groups: DEFAULT_GROUPS };
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
  if (days < 7)  return `Alle ${days} Tage`;
  if (days % 7 === 0) return `Alle ${days / 7} Wochen`;
  if (days % 30 === 0) return `Alle ${days / 30} Monate`;
  return `Alle ${days} Tage`;
}

// ─── useIsMobile ──────────────────────────────────────────────────────────────

function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
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

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 32, height: 32, borderRadius: "50%", border: "none",
      background: "#ede4d8", color: "#6a5545", fontSize: 14, cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, transition: "background 0.15s", touchAction: "manipulation",
    }}
      onMouseEnter={e => e.currentTarget.style.background = "#ddd5c8"}
      onMouseLeave={e => e.currentTarget.style.background = "#ede4d8"}
    >✕</button>
  );
}

function FieldLabel({ text, error }) {
  return (
    <label style={{
      fontFamily: "'Lato', sans-serif", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase",
      display: "block", marginBottom: 8,
      color: error ? "#d94040" : "#b8a898"
    }}>
      {text}{error && <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0 }}> – {error}</span>}
    </label>
  );
}

// ─── Modal Shell ──────────────────────────────────────────────────────────────

function ModalShell({ onClose, children, border }) {
  const isMobile = useIsMobile();
  const startYRef = useRef(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const onTouchStart = (e) => { startYRef.current = e.touches[0].clientY; setDragging(true); setDragY(0); };
  const onTouchMove  = (e) => { if (!dragging) return; const d = e.touches[0].clientY - startYRef.current; if (d > 0) setDragY(d); };
  const onTouchEnd   = () => { if (dragY > 100) onClose(); setDragY(0); setDragging(false); };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(40,30,20,0.55)",
      display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center",
      zIndex: 100, backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease",
      padding: isMobile ? 0 : 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fdf8f1",
        borderRadius: isMobile ? "20px 20px 0 0" : 20,
        padding: isMobile ? "0 20px 32px" : "32px",
        width: isMobile ? "100%" : "min(460px, 92vw)",
        maxHeight: isMobile ? "92vh" : "90vh",
        overflowY: dragY > 0 ? "hidden" : "auto",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
        border: border || "2px solid #e8d9c4",
        animation: isMobile && !dragging ? "slideUpSheet 0.3s cubic-bezier(0.4,0,0.2,1)" : undefined,
        transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
        transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        WebkitOverflowScrolling: "touch",
        position: "relative",
      }}>
        {/* Drag handle */}
        {isMobile && (
          <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            style={{ padding: "16px 0 12px", cursor: "grab", touchAction: "none" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "#ddd5c8", margin: "0 auto" }} />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ─── Groups Manager Modal ─────────────────────────────────────────────────────

function GroupsModal({ groups, friends, onClose, onSave }) {
  const [local, setLocal]           = useState(groups.map(g => ({ ...g })));
  const [newName, setNewName]       = useState("");
  const [editingId, setEditingId]   = useState(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name, count }

  const commit = (updated) => { setLocal(updated); onSave(updated); };

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    commit([...local, { id: "g_" + Date.now(), name, canDelete: true }]);
    setNewName("");
  };
  const startEdit = (g) => { setEditingId(g.id); setEditingName(g.name); };
  const saveEdit  = () => {
    const name = editingName.trim();
    if (name) commit(local.map(g => g.id === editingId ? { ...g, name } : g));
    setEditingId(null);
  };

  const requestDelete = (g) => {
    const count = friends.filter(f => f.group === g.id).length;
    if (count > 0) {
      setConfirmDelete({ id: g.id, name: g.name, count });
    } else {
      commit(local.filter(x => x.id !== g.id));
    }
  };
  const confirmDeleteGroup = () => {
    commit(local.filter(x => x.id !== confirmDelete.id));
    setConfirmDelete(null);
  };

  return (
    <ModalShell onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: "#2d2015" }}>Gruppen verwalten</h2>
        <CloseBtn onClick={onClose} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {local.map(g => (
          <div key={g.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#faf5ee", borderRadius: 10, padding: "10px 12px", border: "2px solid #e8d9c4"
          }}>
            {editingId === g.id ? (
              <>
                <input value={editingName} onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveEdit()} autoFocus
                  style={{ flex: 1, border: "none", background: "transparent", fontFamily: "'Fraunces', serif", fontSize: 16, color: "#2d2015", outline: "none" }}
                />
                <button onClick={saveEdit} style={{ background: "#52a069", border: "none", color: "#fff", padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "'Lato', sans-serif", fontSize: 13, fontWeight: 700 }}>✓</button>
                <button onClick={() => setEditingId(null)} style={{ background: "#ede4d8", border: "none", color: "#6a5545", padding: "5px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "'Lato', sans-serif", fontSize: 13 }}>✕</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontFamily: "'Fraunces', serif", fontSize: 16, color: "#2d2015" }}>{g.name}</span>
                {!g.canDelete && <span style={{ fontSize: 11, fontFamily: "'Lato', sans-serif", color: "#b8a898", fontStyle: "italic" }}>Standard</span>}
                {g.canDelete && (
                  <>
                    <button onClick={() => startEdit(g)} style={{ background: "#ede4d8", border: "none", color: "#6a5545", padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>✏️</button>
                    <button onClick={() => requestDelete(g)} style={{ background: "#fff5f5", border: "none", color: "#d94040", padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>🗑️</button>
                  </>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Delete confirmation overlay */}
      {confirmDelete && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(253,248,241,0.97)",
          borderRadius: "inherit", display: "flex", alignItems: "center", justifyContent: "center",
          padding: 28, zIndex: 10, animation: "fadeIn 0.15s ease"
        }}>
          <div style={{ textAlign: "center", maxWidth: 300 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>👥</div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: "#2d2015", marginBottom: 10 }}>
              „{confirmDelete.name}" löschen?
            </h3>
            <p style={{ fontFamily: "'Lato', sans-serif", color: "#8a7060", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              In dieser Gruppe {confirmDelete.count === 1 ? "ist" : "sind"}{" "}
              <strong style={{ color: "#2d2015" }}>
                {confirmDelete.count} {confirmDelete.count === 1 ? "Person" : "Personen"}
              </strong>.
              {" "}Sie werden keiner Gruppe mehr zugeordnet.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "13px", borderRadius: 10, border: "2px solid #ddd5c8", background: "transparent", color: "#8a7060", fontFamily: "'Lato', sans-serif", fontSize: 14, cursor: "pointer" }}>
                Abbrechen
              </button>
              <button onClick={confirmDeleteGroup} style={{ flex: 1, padding: "13px", borderRadius: 10, border: "none", background: "#d94040", color: "#fff", fontFamily: "'Lato', sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Ja, löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Neue Gruppe..."
          style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "2px solid #ddd5c8", background: "#faf5ee", fontFamily: "'Fraunces', serif", fontSize: 16, color: "#2d2015", outline: "none", WebkitAppearance: "none" }}
        />
        <button onClick={add} style={{ padding: "12px 18px", borderRadius: 10, border: "none", background: "#52a069", color: "#fff", fontFamily: "'Lato', sans-serif", fontSize: 20, fontWeight: 700, cursor: "pointer", minWidth: 48 }}>+</button>
      </div>

      <button onClick={onClose} style={{ width: "100%", padding: "14px", borderRadius: 10, border: "2px solid #ddd5c8", background: "transparent", color: "#8a7060", fontFamily: "'Lato', sans-serif", fontSize: 15, cursor: "pointer" }}>
        Schließen
      </button>
    </ModalShell>
  );
}

// ─── Edit / Add Modal ─────────────────────────────────────────────────────────

function EditModal({ friend, isNew, groups, onClose, onSave, onDelete, onOpenGroupsManager }) {
  const initialInterval = friend?.intervalDays ?? null;
  const hasPreset = initialInterval !== null && !!INTERVAL_PRESETS.find(p => p.days === initialInterval);

  const [name, setName]             = useState(friend?.name ?? "");
  const [intervalDays, setInterval] = useState(initialInterval);
  const [customMode, setCustomMode] = useState(initialInterval !== null && !hasPreset);
  const [customVal, setCustomVal]   = useState(initialInterval !== null && !hasPreset ? String(initialInterval) : "");
  const [selectedGroup, setGroup]   = useState(friend?.group ?? "");
  const [errors, setErrors]         = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handlePreset = (days) => { setInterval(days); setCustomMode(false); setCustomVal(""); setErrors(e => ({ ...e, interval: null })); };
  const handleCustom = (val) => {
    setCustomVal(val); setCustomMode(true);
    const n = parseInt(val);
    if (!isNaN(n) && n > 0) { setInterval(n); setErrors(e => ({ ...e, interval: null })); } else setInterval(null);
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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: "#2d2015" }}>
          {isNew ? "Freund hinzufügen" : "Freund bearbeiten"}
        </h2>
        <CloseBtn onClick={onClose} />
      </div>

      {/* Name */}
      <div style={{ marginBottom: 22 }}>
        <FieldLabel text="Name" error={errors.name} />
        <input value={name}
          onChange={e => { setName(e.target.value); if (e.target.value.trim()) setErrors(er => ({ ...er, name: null })); }}
          placeholder="z.B. Anna"
          style={{ width: "100%", padding: "13px 14px", borderRadius: 10, border: `2px solid ${errors.name ? "#d94040" : "#ddd5c8"}`, background: errors.name ? "#fff5f5" : "#faf5ee", fontFamily: "'Fraunces', serif", fontSize: 18, color: "#2d2015", outline: "none", WebkitAppearance: "none" }}
        />
      </div>

      {/* Interval */}
      <div style={{ marginBottom: 22 }}>
        <FieldLabel text="Kontakt-Intervall" error={errors.interval} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
          {INTERVAL_PRESETS.map(p => (
            <button key={p.days} onClick={() => handlePreset(p.days)} style={{
              padding: "11px 6px", borderRadius: 10, fontSize: 12,
              fontFamily: "'Lato', sans-serif", fontWeight: isPresetActive(p.days) ? 700 : 400, cursor: "pointer",
              border: `2px solid ${isPresetActive(p.days) ? "#52a069" : "#ddd5c8"}`,
              background: isPresetActive(p.days) ? "#d4edda" : "#faf5ee",
              color: isPresetActive(p.days) ? "#2a6040" : "#6a5545", transition: "all 0.15s", touchAction: "manipulation"
            }}>{p.label}</button>
          ))}
        </div>
        <div onClick={() => setCustomMode(true)} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10,
          border: `2px solid ${customMode && intervalDays ? "#52a069" : "#ddd5c8"}`,
          background: customMode && intervalDays ? "#d4edda" : "#faf5ee", cursor: "text", transition: "all 0.15s"
        }}>
          <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 13, color: "#8a7060", whiteSpace: "nowrap" }}>Alle</span>
          <input type="number" min="1" max="365" value={customVal} placeholder="?"
            onChange={e => handleCustom(e.target.value)} onFocus={() => setCustomMode(true)}
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

      {/* Group */}
      <div style={{ marginBottom: 28 }}>
        <FieldLabel text="Gruppe" />
        <div style={{ display: "flex", gap: 8 }}>
          <select value={selectedGroup} onChange={e => setGroup(e.target.value)}
            style={{
              flex: 1, padding: "13px 14px", borderRadius: 10, border: "2px solid #ddd5c8",
              background: "#faf5ee", fontFamily: "'Lato', sans-serif", fontSize: 15, color: "#2d2015",
              outline: "none", cursor: "pointer",
              WebkitAppearance: "none", appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238a7060' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center",
            }}
          >
            <option value="">Keine Gruppe</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button onClick={onOpenGroupsManager} title="Gruppen verwalten"
            style={{ padding: "13px 14px", borderRadius: 10, border: "2px solid #ddd5c8", background: "#faf5ee", color: "#6a5545", fontSize: 16, cursor: "pointer", transition: "all 0.15s", flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = "#ede4d8"}
            onMouseLeave={e => e.currentTarget.style.background = "#faf5ee"}
          >✏️</button>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        {!isNew && (
          <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: "14px", borderRadius: 10, border: "2px solid #ffd5d5", background: "#fff5f5", color: "#d94040", fontSize: 16, cursor: "pointer", transition: "all 0.18s", flexShrink: 0, touchAction: "manipulation" }}
            onMouseEnter={e => e.currentTarget.style.background = "#ffd5d5"}
            onMouseLeave={e => e.currentTarget.style.background = "#fff5f5"}
          >🗑️</button>
        )}
        <button onClick={onClose} style={{ flex: 1, padding: "14px", borderRadius: 10, border: "2px solid #ddd5c8", background: "transparent", color: "#8a7060", fontFamily: "'Lato', sans-serif", fontSize: 15, cursor: "pointer", touchAction: "manipulation" }}>
          Abbrechen
        </button>
        <button onClick={() => { if (validate()) onSave({ name: name.trim(), intervalDays, group: selectedGroup || null }); }}
          style={{ flex: 2, padding: "14px", borderRadius: 10, border: "none", background: "#52a069", color: "#fff", fontFamily: "'Lato', sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px #52a06955", touchAction: "manipulation" }}>
          {isNew ? "+ Hinzufügen" : "✓ Speichern"}
        </button>
      </div>

      {/* Delete confirm overlay */}
      {showDeleteConfirm && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(253,248,241,0.97)", borderRadius: "inherit", display: "flex", alignItems: "center", justifyContent: "center", padding: 28, zIndex: 10, animation: "fadeIn 0.15s ease" }}>
          <div style={{ textAlign: "center", maxWidth: 300 }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: "#2d2015", marginBottom: 8 }}>{friend?.name} löschen?</h3>
            <p style={{ fontFamily: "'Lato', sans-serif", color: "#8a7060", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>Alle Kontaktdaten werden dauerhaft entfernt.</p>
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
  const [date, setDate] = useState(todayISO());
  const days = getDaysSince(contactData?.lastContact);
  const ratio = getRatio(days, intervalDays);
  const { ring, bg } = getColorFromRatio(ratio);

  return (
    <ModalShell onClose={onClose} border={`3px solid ${ring}`}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <RingAvatar name={friend.name} ratio={ratio} size={56} />
          <div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: "#2d2015", margin: 0 }}>{friend.name}</h2>
            <p style={{ color: "#8a7060", fontSize: 13, marginTop: 2, fontFamily: "'Lato', sans-serif" }}>
              {formatTime(days)} · {formatInterval(intervalDays)}
            </p>
          </div>
        </div>
        <CloseBtn onClick={onClose} />
      </div>

      {/* Contact type */}
      <div style={{ marginBottom: 18 }}>
        <FieldLabel text="Art des Kontakts" />
        <div style={{ display: "flex", gap: 10 }}>
          {[{ value: "chat", label: "💬 Chat / Nachricht" }, { value: "real", label: "🤝 Echter Kontakt" }].map(opt => (
            <button key={opt.value} onClick={() => setType(opt.value)} style={{
              flex: 1, padding: "13px 10px", borderRadius: 12,
              border: `2px solid ${type === opt.value ? ring : "#ddd5c8"}`,
              background: type === opt.value ? bg : "#faf5ee",
              color: type === opt.value ? "#2d2015" : "#8a7060",
              fontFamily: "'Lato', sans-serif", fontSize: 14, cursor: "pointer",
              fontWeight: type === opt.value ? 700 : 400, transition: "all 0.2s", touchAction: "manipulation"
            }}>{opt.label}</button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div style={{ marginBottom: 24 }}>
        <FieldLabel text="Datum" />
        <input type="date" value={date} max={todayISO()}
          onChange={e => setDate(e.target.value)}
          style={{ width: "100%", padding: "13px 14px", borderRadius: 10, border: "2px solid #ddd5c8", background: "#faf5ee", fontFamily: "'Lato', sans-serif", fontSize: 15, color: "#2d2015", outline: "none", WebkitAppearance: "none", cursor: "pointer" }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "14px", borderRadius: 10, border: "2px solid #ddd5c8", background: "transparent", color: "#8a7060", fontFamily: "'Lato', sans-serif", fontSize: 15, cursor: "pointer", touchAction: "manipulation" }}>
          Abbrechen
        </button>
        <button onClick={() => onLog(type, isoToTimestamp(date))} style={{ flex: 2, padding: "14px", borderRadius: 10, border: "none", background: ring, color: "#fff", fontFamily: "'Lato', sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 12px ${ring}55`, touchAction: "manipulation" }}>
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
    <div onClick={onLogContact} className="friend-card" style={{
      background: bg, borderRadius: 16, padding: "16px", cursor: "pointer",
      border: `2px solid ${ring}33`, boxShadow: `0 4px 16px ${ring}18, 0 1px 3px rgba(0,0,0,0.05)`,
      transition: "transform 0.18s, box-shadow 0.18s",
      display: "flex", flexDirection: "column", gap: 10,
      WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <RingAvatar name={friend.name} ratio={ratio} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, color: "#2d2015", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{friend.name}</div>
          <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 11, color: ring, fontWeight: 700, marginTop: 2, opacity: 0.85 }}>{formatInterval(interval)}</div>
        </div>
        <button onClick={e => { e.stopPropagation(); onEdit(); }}
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
    </div>
  );
}

// ─── Add Card ─────────────────────────────────────────────────────────────────

function AddCard({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16, padding: "16px", cursor: "pointer",
        border: `2px dashed ${hovered ? "#7ab648" : "#c8b8a8"}`,
        background: hovered ? "#f0f7ea" : "transparent",
        minHeight: 100, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 10,
        transition: "all 0.2s", touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
      }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px dashed ${hovered ? "#7ab648" : "#c8b8a8"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: hovered ? "#7ab648" : "#c8b8a8", transition: "all 0.2s" }}>+</div>
      <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 13, fontWeight: 700, color: hovered ? "#7ab648" : "#b8a898", transition: "color 0.2s" }}>Freund hinzufügen</span>
    </div>
  );
}

// ─── Group Filter Carousel ────────────────────────────────────────────────────

function GroupFilterCarousel({ groups, activeGroup, onChange, onOpenGroupsManager }) {
  const chips = [{ id: "all", name: "Alle", icon: "🌐" }, ...groups.map(g => ({ ...g, icon: g.id === "favorites" ? "⭐" : "👥" }))];
  return (
    <div className="filter-carousel" style={{ display: "flex", gap: 8, overflowX: "auto", flexWrap: "nowrap", paddingBottom: 6, scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
      {chips.map(chip => {
        const isActive = activeGroup === chip.id;
        return (
          <button key={chip.id} onClick={() => onChange(chip.id)} style={{
            flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 20, cursor: "pointer",
            border: `2px solid ${isActive ? "#52a069" : "#c8b8a855"}`,
            background: isActive ? "#52a069" : "#fdf8f1",
            color: isActive ? "#fff" : "#6a5545",
            fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: 13,
            transition: "all 0.18s", touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
            boxShadow: isActive ? "0 2px 8px #52a06933" : "0 1px 3px rgba(0,0,0,0.06)"
          }}>
            <span style={{ fontSize: 13 }}>{chip.icon}</span>
            <span>{chip.name}</span>
          </button>
        );
      })}
      {/* Add group button */}
      <button onClick={onOpenGroupsManager} title="Gruppen verwalten" style={{
        flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 36, height: 36, borderRadius: "50%", cursor: "pointer",
        border: "2px solid #c8b8a855", background: "#fdf8f1", color: "#8a7060",
        fontSize: 20, lineHeight: 1, transition: "all 0.18s",
        touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }}
        onMouseEnter={e => { e.currentTarget.style.background = "#ede4d8"; e.currentTarget.style.color = "#2d2015"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "#fdf8f1"; e.currentTarget.style.color = "#8a7060"; }}
      >+</button>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const dummy = generateDummyData();
  const [friends, setFriends]         = useState(dummy.friends);
  const [contacts, setContacts]       = useState(dummy.contacts);
  const [groups, setGroups]           = useState(dummy.groups);
  const [selected, setSelected]       = useState(null);
  const [editing, setEditing]         = useState(null);
  const [addingNew, setAddingNew]     = useState(false);
  const [toast, setToast]             = useState(null);
  const [activeGroup, setActiveGroup] = useState("all");
  const [showGroupsMgr, setGroupsMgr] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.friends)  setFriends(data.friends);
        if (data.contacts) setContacts(data.contacts);
        if (data.groups)   setGroups(data.groups);
      }
    } catch {}
  }, []);

  const save = (f, c, g) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ friends: f, contacts: c, groups: g })); } catch {}
  };
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const logContact = (type, timestamp) => {
    if (!selected) return;
    const newC = { ...contacts, [selected.id]: { lastContact: timestamp, lastType: type } };
    setContacts(newC); save(friends, newC, groups);
    showToast(`${selected.name} – Kontakt gespeichert ${type === "chat" ? "💬" : "🤝"}`);
    setSelected(null);
  };

  const saveFriend = ({ name, intervalDays, group }) => {
    const newF = friends.map(f => f.id === editing.id ? { ...f, name, intervalDays, group } : f);
    setFriends(newF); save(newF, contacts, groups);
    showToast(`${name} – Einstellungen gespeichert ✓`);
    setEditing(null);
  };

  const addFriend = ({ name, intervalDays, group }) => {
    const newId = Math.max(0, ...friends.map(f => f.id)) + 1;
    const newF = [...friends, { id: newId, name, intervalDays, group }];
    setFriends(newF); save(newF, contacts, groups);
    showToast(`${name} wurde hinzugefügt 🌱`);
    setAddingNew(false);
  };

  const deleteFriend = () => {
    const newF = friends.filter(f => f.id !== editing.id);
    const newC = { ...contacts };
    delete newC[editing.id];
    setFriends(newF); setContacts(newC); save(newF, newC, groups);
    showToast(`${editing.name} wurde entfernt`);
    setEditing(null);
  };

  const saveGroups = (newGroups) => {
    const hasFav = newGroups.some(g => g.id === "favorites");
    const finalGroups = hasFav ? newGroups : [DEFAULT_GROUPS[0], ...newGroups];
    const groupIds = new Set(finalGroups.map(g => g.id));
    const newF = friends.map(f => ({ ...f, group: groupIds.has(f.group) ? f.group : null }));
    setGroups(finalGroups); setFriends(newF);
    save(newF, contacts, finalGroups);
  };

  const sorted = [...friends].sort((a, b) =>
    getRatio(getDaysSince(contacts[b.id]?.lastContact), b.intervalDays || 30) -
    getRatio(getDaysSince(contacts[a.id]?.lastContact), a.intervalDays || 30)
  );
  const filtered = activeGroup === "all" ? sorted : sorted.filter(f => f.group === activeGroup);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,400&family=Lato:wght@400;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-text-size-adjust: 100%; }
        body { background: #f5ede0; min-height: 100dvh; }
        #root { width: 100%; }

        @keyframes fadeIn      { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp     { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideUpSheet{ from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes toastIn     { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }

        input[type=number]::-webkit-inner-spin-button { opacity: 1; }
        input[type=date]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
        .filter-carousel::-webkit-scrollbar { display: none; }

        @media (hover: hover) {
          .friend-card:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(0,0,0,0.12) !important; }
        }

        .card-grid { display: grid; gap: 14px; }
        @media (min-width: 0px)   { .card-grid { grid-template-columns: 1fr; } }
        @media (min-width: 400px) { .card-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 680px) { .card-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 900px) { .card-grid { grid-template-columns: repeat(4, 1fr); } }

        .page-wrap { padding: 24px 16px 40px; }
        @media (min-width: 640px) { .page-wrap { padding: 40px 24px 60px; } }
        .content-wrap { max-width: 960px; margin: 0 auto; }

        .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #2d2015; color: #f5ede0; padding: 12px 20px; border-radius: 24px; font-family: 'Lato', sans-serif; font-size: 14px; white-space: nowrap; box-shadow: 0 8px 24px rgba(0,0,0,0.25); animation: toastIn 0.3s ease; z-index: 300; }
        @media (min-width: 640px) { .toast { left: auto; right: 24px; bottom: 28px; transform: none; border-radius: 12px; } }
      `}</style>

      <div className="page-wrap" style={{ minHeight: "100dvh", background: "linear-gradient(135deg, #f9f0e3 0%, #f0e4d0 50%, #e8d9c4 100%)", fontFamily: "'Lato', sans-serif" }}>
        <div className="content-wrap">
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(26px, 6vw, 44px)", color: "#2d2015", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 4 }}>
              Friendly Reminder 🌿
            </h1>
            <p style={{ color: "#8a7060", fontSize: "clamp(13px, 3.5vw, 15px)", marginBottom: 16 }}>
              Karte antippen zum Kontakt erfassen · ✏️ für Einstellungen
            </p>
            <GroupFilterCarousel groups={groups} activeGroup={activeGroup} onChange={setActiveGroup} onOpenGroupsManager={() => setGroupsMgr(true)} />
          </div>

          <div className="card-grid">
            {filtered.map(friend => (
              <FriendCard key={friend.id} friend={friend} contactData={contacts[friend.id]}
                onLogContact={() => setSelected(friend)} onEdit={() => setEditing(friend)} />
            ))}
            {filtered.length === 0 && activeGroup !== "all" && (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px 0", color: "#b8a898", fontFamily: "'Lato', sans-serif", fontSize: 14 }}>
                Keine Freunde in dieser Gruppe
              </div>
            )}
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
      {editing && !showGroupsMgr && (
        <EditModal friend={editing} isNew={false} groups={groups}
          onClose={() => setEditing(null)} onSave={saveFriend} onDelete={deleteFriend}
          onOpenGroupsManager={() => setGroupsMgr(true)} />
      )}
      {addingNew && !showGroupsMgr && (
        <EditModal friend={null} isNew={true} groups={groups}
          onClose={() => setAddingNew(false)} onSave={addFriend} onDelete={null}
          onOpenGroupsManager={() => setGroupsMgr(true)} />
      )}
      {showGroupsMgr && (
        <GroupsModal groups={groups} friends={friends} onClose={() => setGroupsMgr(false)} onSave={saveGroups} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
