import { useState, useEffect, useCallback } from "react";
import { loadData, saveData } from "./supabase.js";

const MONTHLY_FIRMS = [
  "Building Projects a.s.",
  "Building s.r.o.",
  "Building Statics s.r.o.",
  "Drbohlav Jakub, Ing.",
  "ECO-VEST s.r.o.",
  "Kovo Stoupa cz s.r.o.",
  "Krejza Václav",
  "MODESTIA s.r.o.",
  "Moc Pavel",
  "Nástrojárna Pňov s.r.o.",
  "Sazavatex s.r.o.",
  "Štál Petr, Ing.",
  "VF Electric s.r.o.",
];

const QUARTERLY_FIRMS = [
  "Dušek Jaroslav",
  "Janda Petr",
  "Jandová Jana",
  "Mušková Dana",
  "Pavlíček Dušan",
];

const QUARTER_MONTHS = [4, 7, 10, 1];

const ALL_FIRMS_TAX = [...MONTHLY_FIRMS, ...QUARTERLY_FIRMS.filter(f => f !== "Mušková Dana")]
  .sort((a, b) => a.localeCompare(b, "cs"));

const INITIAL_TASKS = [
  { id: 1, date: "2026-06-16", title: "Building Projects a.s. – připravit doklady pro kontrolu VZP", done: false, category: "účetnictví" },
  { id: 2, date: "2026-06-18", title: "Kožní lékař 12:00", done: false, category: "osobní" },
  { id: 6, date: "2026-06-25", title: "Kovo Stoupa cz s.r.o. – oprava FV pan Stoupa", done: false, category: "účetnictví" },
  { id: 3, date: "2026-06-29", title: "Štál Petr, Ing. – odhlášení zaměstnance", done: false, category: "mzdy" },
  { id: 4, date: "2026-07-01", title: "Building Projects a.s. – odhlášení zaměstnance", done: false, category: "mzdy" },
  { id: 5, date: "2026-07-10", title: "Kadeřnictví 11:00", done: false, category: "osobní" },
];

const CATEGORY_COLORS = {
  "mzdy":       { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", label: "Mzdy" },
  "osobní":     { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce", label: "Osobní" },
  "účetnictví": { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", label: "Účetnictví" },
  "daně":       { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", label: "Daně" },
};

function buildPrefilledData() {
  const data = {};
  [1, 2, 3, 4, 5].forEach(month => {
    const mKey = `2026-${month}`;
    const monthData = {};
    MONTHLY_FIRMS.forEach(f => { monthData[`monthly-${f}`] = true; });
    monthData[`monthly-Building s.r.o.-SK`] = true;
    if (QUARTER_MONTHS.includes(month)) {
      QUARTERLY_FIRMS.forEach(f => { monthData[`quarterly-${f}`] = true; });
    }
    data[mKey] = monthData;
  });
  return data;
}

function getMonthName(month) {
  const names = ["Leden","Únor","Březen","Duben","Květen","Červen",
    "Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];
  return names[month - 1];
}

function isQuarterlyMonth(month) { return QUARTER_MONTHS.includes(month); }

function getPrevMonthName(month, year) {
  if (month === 1) return `${getMonthName(12)} ${year - 1}`;
  return `${getMonthName(month - 1)} ${year}`;
}

export default function App() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [checked, setChecked] = useState({});
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [syncStatus, setSyncStatus] = useState("loading");
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ date: "", title: "", category: "účetnictví" });

  useEffect(() => {
    async function load() {
      try {
        const data = await loadData();
        if (data) {
          setChecked(data.checked && Object.keys(data.checked).length > 0 ? data.checked : buildPrefilledData());
          setTasks(data.tasks && data.tasks.length > 0 ? data.tasks : INITIAL_TASKS);
        } else {
          setChecked(buildPrefilledData());
          setTasks(INITIAL_TASKS);
        }
        setSyncStatus("ok");
      } catch {
        setChecked(buildPrefilledData());
        setTasks(INITIAL_TASKS);
        setSyncStatus("ok");
      }
    }
    load();
  }, []);

  const save = useCallback(async (newChecked, newTasks) => {
    setSyncStatus("saving");
    try {
      await Promise.all([
        saveData("checked", newChecked),
        saveData("tasks", newTasks),
      ]);
      setSyncStatus("ok");
    } catch {
      setSyncStatus("error");
    }
  }, []);

  const todayStr = today.toISOString().split("T")[0];
  const key = `${currentYear}-${currentMonth}`;
  const monthChecked = checked[key] || {};
  const taxChecked = checked["tax2026"] || {};
  const taxDone = ALL_FIRMS_TAX.filter(f => taxChecked[f]).length;

  function toggle(type, firm) {
    setChecked(prev => {
      const pm = prev[key] || {};
      const newData = { ...prev, [key]: { ...pm, [`${type}-${firm}`]: !pm[`${type}-${firm}`] } };
      save(newData, tasks);
      return newData;
    });
  }

  function toggleTax(firm) {
    setChecked(prev => {
      const pt = prev["tax2026"] || {};
      const newData = { ...prev, tax2026: { ...pt, [firm]: !pt[firm] } };
      save(newData, tasks);
      return newData;
    });
  }

  function toggleTask(id) {
    setTasks(prev => {
      const newTasks = prev.map(t => t.id === id ? { ...t, done: !t.done } : t);
      save(checked, newTasks);
      return newTasks;
    });
  }

  function addTask() {
    if (!newTask.date || !newTask.title) return;
    const task = { id: Date.now(), date: newTask.date, title: newTask.title, category: newTask.category, done: false };
    setTasks(prev => {
      const newTasks = [...prev, task];
      save(checked, newTasks);
      return newTasks;
    });
    setNewTask({ date: "", title: "", category: "účetnictví" });
    setShowAddTask(false);
  }

  function deleteTask(id) {
    setTasks(prev => {
      const newTasks = prev.filter(t => t.id !== id);
      save(checked, newTasks);
      return newTasks;
    });
  }

  function prevMonth() {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  }
  function nextMonth() {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  }

  const showQuarterly = isQuarterlyMonth(currentMonth);
  const monthlyDone = MONTHLY_FIRMS.filter(f => monthChecked[`monthly-${f}`]).length;
  const quarterlyDone = showQuarterly ? QUARTERLY_FIRMS.filter(f => monthChecked[`quarterly-${f}`]).length : 0;
  const sortedTasks = [...tasks].sort((a, b) => new Date(a.date) - new Date(b.date));

  const getWeekDays = (offset) => {
    const d = new Date(today);
    const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - day + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(d);
      dd.setDate(d.getDate() + i);
      return dd;
    });
  };
  const weekDays = getWeekDays(weekOffset);
  const weekDayNames = ["Pondělí","Úterý","Středa","Čtvrtek","Pátek","Sobota","Neděle"];

  const getEventsForDay = (date) => {
    const dateStr = date.toISOString().split("T")[0];
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const events = [];
    tasks.forEach(task => { if (task.date === dateStr) events.push({ type: "task", task }); });
    if (date.getDate() === 25) {
      const mChecked = checked[`${year}-${month}`] || {};
      const mDone = MONTHLY_FIRMS.filter(f => mChecked[`monthly-${f}`]).length;
      const skDone = !!mChecked[`monthly-Building s.r.o.-SK`];
      const isQ = isQuarterlyMonth(month);
      const qDone = isQ ? QUARTERLY_FIRMS.filter(f => mChecked[`quarterly-${f}`]).length : 0;
      const total = MONTHLY_FIRMS.length + 1 + (isQ ? QUARTERLY_FIRMS.length : 0);
      const done = mDone + (skDone ? 1 : 0) + qDone;
      events.push({ type: "dph", month, year, done, total, isQ });
    }
    if (date.getDate() === 30 && month === 4 && year === 2027) {
      events.push({ type: "tax", done: taxDone, total: ALL_FIRMS_TAX.length });
    }
    return events;
  };

  function FirmRow({ label, done, onClick, flag }) {
    return (
      <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, cursor: "pointer", background: done ? "#f0fdf4" : flag ? "#f0f4ff" : "#f8fafc", border: `1px solid ${done ? "#bbf7d0" : flag ? "#c7d2fe" : "#e2eaf2"}` }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${done ? "#16a34a" : flag ? "#6366f1" : "#94a3b8"}`, background: done ? "#16a34a" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {done && <span style={{ color: "white", fontSize: 13, lineHeight: 1 }}>✓</span>}
        </div>
        <span style={{ fontSize: 14, fontWeight: 500, color: done ? "#15803d" : flag ? "#4338ca" : "#1e3a5f", textDecoration: done ? "line-through" : "none", opacity: done ? 0.7 : 1 }}>{label}</span>
        {done && <span style={{ marginLeft: "auto", fontSize: 11, color: "#16a34a", fontWeight: 600 }}>Zpracováno ✓</span>}
      </div>
    );
  }

  function FirmList({ firms, type }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {firms.map(firm => (
          <FirmRow key={firm} label={firm} done={!!monthChecked[`${type}-${firm}`]} onClick={() => toggle(type, firm)} />
        ))}
        {type === "monthly" && (
          <FirmRow label="🇸🇰 Building s.r.o. – DPH & KH Slovensko" done={!!monthChecked[`monthly-Building s.r.o.-SK`]} onClick={() => toggle("monthly", "Building s.r.o.-SK")} flag={true} />
        )}
      </div>
    );
  }

  const navBtn = (label, target) => (
    <button onClick={() => setView(target)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: view === target ? "white" : "rgba(255,255,255,0.15)", color: view === target ? "#1e3a5f" : "white", fontWeight: 600, fontSize: 12 }}>{label}</button>
  );

  const Card = ({ children, mb }) => (
    <div style={{ background: "white", borderRadius: 14, padding: 20, marginBottom: mb !== undefined ? mb : 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #e2eaf2" }}>{children}</div>
  );

  const Badge = ({ done, total }) => (
    <div style={{ background: done === total ? "#dcfce7" : "#f1f5f9", color: done === total ? "#166534" : "#64748b", borderRadius: 20, padding: "4px 12px", fontSize: 13, fontWeight: 700 }}>{done}/{total}</div>
  );

  const syncColor = syncStatus === "ok" ? "#16a34a" : syncStatus === "saving" ? "#f59e0b" : syncStatus === "error" ? "#dc2626" : "#94a3b8";
  const syncText = syncStatus === "ok" ? "✓ Uloženo" : syncStatus === "saving" ? "⏳ Ukládám..." : syncStatus === "error" ? "⚠️ Chyba uložení" : "⏳ Načítám...";

  if (syncStatus === "loading") {
    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", minHeight: "100vh", background: "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Načítám diář...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", minHeight: "100vh", background: "#f0f4f8" }}>
      <div style={{ background: "#1e3a5f", color: "white", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.6, textTransform: "uppercase" }}>Fineko Daně</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Účetní  diář</div>
          <div style={{ fontSize: 10, marginTop: 2, color: syncColor, fontWeight: 600 }}>{syncText}</div>
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {navBtn("Týden", "week")}
          {navBtn("Měsíc", "month")}
          {navBtn("Přehled", "overview")}
          {navBtn("Přiznání", "tax")}
          {navBtn("Úkoly", "tasks")}
        </div>
      </div>

      {view === "week" && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid #d1d9e0", background: "white", cursor: "pointer", fontSize: 18, color: "#1e3a5f" }}>‹</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1e3a5f" }}>{weekDays[0].getDate()}. {getMonthName(weekDays[0].getMonth()+1)} – {weekDays[6].getDate()}. {getMonthName(weekDays[6].getMonth()+1)} {weekDays[6].getFullYear()}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{weekOffset === 0 ? "Tento týden" : weekOffset === 1 ? "Příští týden" : weekOffset === -1 ? "Minulý týden" : `${weekOffset > 0 ? "+" : ""}${weekOffset} týdnů`}</div>
            </div>
            <button onClick={() => setWeekOffset(w => w + 1)} style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid #d1d9e0", background: "white", cursor: "pointer", fontSize: 18, color: "#1e3a5f" }}>›</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {weekDays.map((date, i) => {
              const dateStr = date.toISOString().split("T")[0];
              const isToday = dateStr === todayStr;
              const isWeekend = i >= 5;
              const events = getEventsForDay(date);
              return (
                <div key={dateStr} style={{ background: isToday ? "#eff6ff" : isWeekend ? "#f8fafc" : "white", borderRadius: 12, padding: "12px 16px", border: isToday ? "2px solid #1e3a5f" : "1px solid #e2eaf2", opacity: isWeekend && events.length === 0 ? 0.5 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: events.length > 0 ? 10 : 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: isToday ? "#1e3a5f" : isWeekend ? "#f1f5f9" : "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: isToday ? "white" : isWeekend ? "#94a3b8" : "#1e3a5f" }}>{date.getDate()}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? "#1e3a5f" : isWeekend ? "#94a3b8" : "#1e3a5f" }}>{weekDayNames[i]}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{date.getDate()}. {getMonthName(date.getMonth()+1)}</div>
                    </div>
                    {isToday && <span style={{ marginLeft: "auto", fontSize: 10, background: "#1e3a5f", color: "white", borderRadius: 10, padding: "2px 8px", fontWeight: 600 }}>Dnes</span>}
                    {events.length === 0 && !isToday && <span style={{ marginLeft: "auto", fontSize: 11, color: "#cbd5e1" }}>Volno</span>}
                  </div>
                  {events.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 46 }}>
                      {events.map((event, ei) => {
                        if (event.type === "task") {
                          const cat = CATEGORY_COLORS[event.task.category] || CATEGORY_COLORS["účetnictví"];
                          const done = event.task.done;
                          return (
                            <div key={ei} onClick={() => toggleTask(event.task.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, cursor: "pointer", background: done ? "#f0fdf4" : cat.bg, border: `1px solid ${done ? "#bbf7d0" : cat.border}` }}>
                              <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: `2px solid ${done ? "#16a34a" : cat.text}`, background: done ? "#16a34a" : "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {done && <span style={{ color: "white", fontSize: 11, lineHeight: 1 }}>✓</span>}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 500, color: done ? "#15803d" : cat.text, textDecoration: done ? "line-through" : "none", opacity: done ? 0.7 : 1 }}>{event.task.title}</span>
                              <span style={{ marginLeft: "auto", fontSize: 10, background: "white", color: cat.text, border: `1px solid ${cat.border}`, borderRadius: 8, padding: "1px 6px", fontWeight: 600, flexShrink: 0 }}>{cat.label}</span>
                            </div>
                          );
                        }
                        if (event.type === "dph") {
                          const allDone = event.done === event.total;
                          return (
                            <div key={ei} onClick={() => { setCurrentMonth(event.month); setCurrentYear(event.year); setView("month"); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, cursor: "pointer", background: allDone ? "#f0fdf4" : "#fff7ed", border: `1px solid ${allDone ? "#bbf7d0" : "#fed7aa"}` }}>
                              <span style={{ fontSize: 16 }}>{allDone ? "✅" : "📋"}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: allDone ? "#15803d" : "#c2410c" }}>Termín DPH & KH – {getPrevMonthName(event.month, event.year)}</div>
                                <div style={{ fontSize: 11, color: allDone ? "#16a34a" : "#f59e0b", marginTop: 1 }}>{allDone ? "Vše zpracováno ✓" : `${event.done}/${event.total} zpracováno – klikni pro detail`}</div>
                              </div>
                            </div>
                          );
                        }
                        if (event.type === "tax") {
                          const allDone = event.done === event.total;
                          return (
                            <div key={ei} onClick={() => setView("tax")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, cursor: "pointer", background: allDone ? "#f0fdf4" : "#fdf4ff", border: `1px solid ${allDone ? "#bbf7d0" : "#e9d5ff"}` }}>
                              <span style={{ fontSize: 16 }}>{allDone ? "✅" : "📄"}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: allDone ? "#15803d" : "#7e22ce" }}>Termín daňového přiznání za rok 2026</div>
                                <div style={{ fontSize: 11, color: allDone ? "#16a34a" : "#a855f7", marginTop: 1 }}>{allDone ? "Vše zpracováno ✓" : `${event.done}/${event.total} zpracováno`}</div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {weekOffset !== 0 && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button onClick={() => setWeekOffset(0)} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #1e3a5f", background: "white", color: "#1e3a5f", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Zpět na tento týden</button>
            </div>
          )}
        </div>
      )}

      {view === "month" && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <button onClick={prevMonth} style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid #d1d9e0", background: "white", cursor: "pointer", fontSize: 18, color: "#1e3a5f" }}>‹</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#1e3a5f" }}>{getMonthName(currentMonth)} {currentYear}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Termín 25. {getMonthName(currentMonth)} – za {getPrevMonthName(currentMonth, currentYear)}</div>
            </div>
            <button onClick={nextMonth} style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid #d1d9e0", background: "white", cursor: "pointer", fontSize: 18, color: "#1e3a5f" }}>›</button>
          </div>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1e3a5f" }}>📋 DPH & KH – měsíční plátci</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Termín: 25. {getMonthName(currentMonth)} {currentYear} – za {getPrevMonthName(currentMonth, currentYear)}</div>
              </div>
              <Badge done={monthlyDone} total={MONTHLY_FIRMS.length} />
            </div>
            <FirmList firms={MONTHLY_FIRMS} type="monthly" />
          </Card>
          {showQuarterly && (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1e3a5f" }}>📋 DPH & KH – čtvrtletní plátci</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Termín: 25. {getMonthName(currentMonth)} {currentYear} – za {getPrevMonthName(currentMonth, currentYear)}</div>
                </div>
                <Badge done={quarterlyDone} total={QUARTERLY_FIRMS.length} />
              </div>
              <FirmList firms={QUARTERLY_FIRMS} type="quarterly" />
            </Card>
          )}
          {!showQuarterly && (
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 18px", border: "1px dashed #cbd5e1", fontSize: 13, color: "#64748b", textAlign: "center" }}>
              Čtvrtletní DPH se nezpracovává v {getMonthName(currentMonth)} – termíny jsou v dubnu, červenci, říjnu a lednu.
            </div>
          )}
        </div>
      )}

      {view === "overview" && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1e3a5f", marginBottom: 16 }}>Přehled roku {currentYear}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
              const mKey = `${currentYear}-${month}`;
              const mChecked = checked[mKey] || {};
              const mDone = MONTHLY_FIRMS.filter(f => mChecked[`monthly-${f}`]).length;
              const isQ = isQuarterlyMonth(month);
              const qDone = isQ ? QUARTERLY_FIRMS.filter(f => mChecked[`quarterly-${f}`]).length : 0;
              const totalDue = MONTHLY_FIRMS.length + (isQ ? QUARTERLY_FIRMS.length : 0);
              const totalDone = mDone + qDone;
              const allDone = totalDone === totalDue;
              const isNow = month === today.getMonth() + 1 && currentYear === today.getFullYear();
              return (
                <div key={month} onClick={() => { setCurrentMonth(month); setView("month"); }} style={{ background: "white", borderRadius: 12, padding: 16, cursor: "pointer", border: isNow ? "2px solid #1e3a5f" : "1px solid #e2eaf2", boxShadow: isNow ? "0 2px 12px rgba(30,58,95,0.12)" : "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontWeight: 700, color: "#1e3a5f", fontSize: 15 }}>{getMonthName(month)}</div>
                    {isNow && <span style={{ fontSize: 10, background: "#1e3a5f", color: "white", borderRadius: 10, padding: "2px 7px", fontWeight: 600 }}>Nyní</span>}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ height: 6, borderRadius: 3, background: "#e2eaf2", overflow: "hidden", marginBottom: 8 }}>
                      <div style={{ height: "100%", borderRadius: 3, background: allDone ? "#16a34a" : totalDone > 0 ? "#f59e0b" : "#e2eaf2", width: `${totalDue > 0 ? (totalDone / totalDue) * 100 : 0}%` }} />
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {allDone ? <span style={{ color: "#16a34a", fontWeight: 700 }}>✓ Vše zpracováno</span> : `${totalDone}/${totalDue} zpracováno`}
                    </div>
                    {isQ && <div style={{ fontSize: 11, color: "#8b5cf6", marginTop: 4, fontWeight: 600 }}>+ čtvrtletní DPH</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "tax" && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px" }}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1e3a5f" }}>📄 Daňové přiznání za rok 2026</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Termín: 30. dubna 2027 • FO i PO (elektronické podání)</div>
              </div>
              <Badge done={taxDone} total={ALL_FIRMS_TAX.length} />
            </div>
            {taxDone === ALL_FIRMS_TAX.length && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#166534", fontWeight: 600 }}>🎉 Všechna přiznání jsou zpracována!</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {ALL_FIRMS_TAX.map(firm => {
                const done = !!taxChecked[firm];
                return (
                  <div key={firm} onClick={() => toggleTax(firm)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, cursor: "pointer", background: done ? "#f0fdf4" : "#f8fafc", border: `1px solid ${done ? "#bbf7d0" : "#e2eaf2"}` }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${done ? "#16a34a" : "#94a3b8"}`, background: done ? "#16a34a" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {done && <span style={{ color: "white", fontSize: 13, lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: done ? "#15803d" : "#1e3a5f", textDecoration: done ? "line-through" : "none", opacity: done ? 0.7 : 1 }}>{firm}</span>
                    {done && <span style={{ marginLeft: "auto", fontSize: 11, color: "#16a34a", fontWeight: 600 }}>Zpracováno ✓</span>}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {view === "tasks" && (() => {
        const groups = {};
        sortedTasks.forEach(task => {
          const [y, m] = task.date.split("-");
          const gKey = `${y}-${parseInt(m)}`;
          if (!groups[gKey]) groups[gKey] = { year: parseInt(y), month: parseInt(m), tasks: [] };
          groups[gKey].tasks.push(task);
        });
        const groupKeys = Object.keys(groups).sort();
        return (
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1e3a5f" }}>📌 Úkoly a události</div>
              <button onClick={() => setShowAddTask(!showAddTask)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#1e3a5f", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                {showAddTask ? "✕ Zrušit" : "+ Přidat úkol"}
              </button>
            </div>

            {showAddTask && (
              <Card>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e3a5f", marginBottom: 14 }}>Nový úkol</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Datum</div>
                    <input type="date" value={newTask.date} onChange={e => setNewTask(p => ({ ...p, date: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2eaf2", fontSize: 14, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Název</div>
                    <input type="text" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="např. Kožní lékař 10:00" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2eaf2", fontSize: 14, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Kategorie</div>
                    <select value={newTask.category} onChange={e => setNewTask(p => ({ ...p, category: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2eaf2", fontSize: 14, boxSizing: "border-box" }}>
                      <option value="účetnictví">Účetnictví</option>
                      <option value="mzdy">Mzdy</option>
                      <option value="osobní">Osobní</option>
                      <option value="daně">Daně</option>
                    </select>
                  </div>
                  <button onClick={addTask} style={{ padding: "10px", borderRadius: 8, border: "none", background: "#16a34a", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 4 }}>
                    ✓ Uložit úkol
                  </button>
                </div>
              </Card>
            )}
            {groupKeys.map(gKey => {
              const { year, month, tasks: gTasks } = groups[gKey];
              const allDone = gTasks.every(t => t.done);
              return (
                <div key={gKey} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e3a5f" }}>📅 {getMonthName(month)} {year}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, borderRadius: 10, padding: "2px 10px", background: allDone ? "#dcfce7" : "#f1f5f9", color: allDone ? "#166534" : "#64748b" }}>{gTasks.filter(t => t.done).length}/{gTasks.length} hotovo</div>
                  </div>
                  <Card mb={0}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {gTasks.map(task => {
                        const cat = CATEGORY_COLORS[task.category] || CATEGORY_COLORS["účetnictví"];
                        const isPast = task.date < todayStr && !task.done;
                        const isToday = task.date === todayStr;
                        const done = task.done;
                        return (
                          <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, background: done ? "#f0fdf4" : isPast ? "#fff1f2" : "#f8fafc", border: `1px solid ${done ? "#bbf7d0" : isPast ? "#fecdd3" : "#e2eaf2"}` }}>
                            <div onClick={() => toggleTask(task.id)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${done ? "#16a34a" : isPast ? "#f43f5e" : "#94a3b8"}`, background: done ? "#16a34a" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                              {done && <span style={{ color: "white", fontSize: 13, lineHeight: 1 }}>✓</span>}
                            </div>
                            <div style={{ flex: 1 }} onClick={() => toggleTask(task.id)}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: done ? "#15803d" : isPast ? "#be123c" : "#1e3a5f", textDecoration: done ? "line-through" : "none", opacity: done ? 0.7 : 1, cursor: "pointer" }}>{task.title}</div>
                              <div style={{ fontSize: 11, color: done ? "#16a34a" : isPast ? "#be123c" : "#64748b", marginTop: 2 }}>{done ? `✓ Hotovo • ${task.date}` : isToday ? "📅 Dnes" : isPast ? `⚠️ Prošlé – ${task.date}` : `📅 ${task.date}`}</div>
                            </div>
                            <span style={{ fontSize: 11, background: cat.bg, color: cat.text, border: `1px solid ${cat.border}`, borderRadius: 10, padding: "2px 8px", fontWeight: 600, flexShrink: 0 }}>{cat.label}</span>
                            <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, padding: "0 4px", flexShrink: 0 }}>🗑</button>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        );
      })()}

      <div style={{ textAlign: "center", padding: "20px 16px", fontSize: 11, color: "#94a3b8", borderTop: "1px solid #e2eaf2", marginTop: 16 }}>
        Fineko Daně • Účetní diář {currentYear} • Data uložena v databázi
      </div>
    </div>
  );
}
