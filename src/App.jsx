import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Tractor, ClipboardList, Wallet, Package, BarChart3,
  Users, ClipboardCheck, Menu, X, LogOut, Plus, RefreshCw, Search,
  AlertCircle, CheckCircle2, Trash2, CalendarDays, Activity
} from "lucide-react";
import { supabase } from "./supabase";

const GREEN = "#174d35";
const ACCENT = "#24734d";
const today = () => new Date().toISOString().slice(0, 10);
const money = (n) => `${Number(n || 0).toLocaleString("fr-FR")} FCFA`;
const dateLabel = (d) => d ? new Date(`${d}T00:00:00`).toLocaleDateString("fr-FR") : "—";
const stockEquivalent = (quantity, unit) => {
  const value = Number(quantity || 0);
  if (unit === "kg" && value >= 1000) return `≈ ${(value / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} tonne(s)`;
  if (unit === "tonne") return `≈ ${(value * 1000).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} kg`;
  if (unit === "g" && value >= 1000) return `≈ ${(value / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} kg`;
  if (unit === "ml" && value >= 1000) return `≈ ${(value / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} L`;
  return "";
};
const speciesNames = { broilers: "Poulets de chair", layers: "Poules pondeuses", rabbits: "Lapins", pigs: "Porcs" };
const stockCategories = {
  feed: "Aliments", ingredient: "Matières premières", veterinary: "Produits vétérinaires",
  equipment: "Matériels et équipements", consumable: "Consommables", other: "Autres fournitures"
};
const recordNames = {
  weight: "Poids", mortality: "Mortalité", feed: "Aliment distribué", eggs: "Œufs",
  health: "Santé", reproduction: "Reproduction", note: "Note", water: "Eau",
  temperature: "Température", vaccination: "Vaccination", treatment: "Traitement",
  medication: "Médicament", observation: "Observation"
};

const nav = [
  ["dashboard", "Tableau de bord", LayoutDashboard],
  ["farms", "Mes élevages", Tractor],
  ["technical", "Suivi technique", ClipboardList],
  ["finance", "Finances", Wallet],
  ["stocks", "Stocks", Package],
  ["reports", "Rapports", BarChart3],
  ["team", "Équipe", Users],
  ["tasks", "Tâches et absences", ClipboardCheck],
  ["activity", "Journal d’activité", Activity]
];

function Field({ label, children }) {
  return <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "#34443a" }}>
    {label}{children}
  </label>;
}
const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "11px 12px", border: "1px solid #dce5de",
  borderRadius: 9, background: "#fff", fontSize: 14, color: "#24352a"
};
function Button({ children, onClick, secondary = false, disabled = false, type = "button" }) {
  return <button type={type} disabled={disabled} onClick={onClick} style={{
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "10px 14px", borderRadius: 9, border: secondary ? "1px solid #d8e3da" : "none",
    background: secondary ? "#fff" : GREEN, color: secondary ? GREEN : "#fff",
    fontWeight: 650, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .6 : 1
  }}>{children}</button>;
}
function Card({ title, value, hint, icon: Icon }) {
  return <div style={styles.card}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "#65736a", fontSize: 13 }}>{title}</span>
      {Icon && <span style={{ background: "#edf5ef", color: ACCENT, padding: 9, borderRadius: 10 }}><Icon size={18}/></span>}
    </div>
    <div style={{ fontSize: 25, fontWeight: 750, color: GREEN, marginTop: 12 }}>{value}</div>
    {hint && <div style={{ color: "#7a877e", fontSize: 12, marginTop: 5 }}>{hint}</div>}
  </div>;
}
function Empty({ text }) {
  return <div style={{ textAlign: "center", padding: "32px 12px", color: "#77847a", fontSize: 14 }}>{text}</div>;
}
function SectionTitle({ title, subtitle, action }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
    <div><h2 style={{ margin: 0, color: GREEN, fontSize: 21 }}>{title}</h2>{subtitle && <p style={{ margin: "5px 0 0", color: "#7b887f", fontSize: 13 }}>{subtitle}</p>}</div>
    {action}
  </div>;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [page, setPage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [farms, setFarms] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [records, setRecords] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  const [feedMovements, setFeedMovements] = useState([]);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState("");
  const [modal, setModal] = useState("");
  const [form, setForm] = useState({});
  const [filter, setFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [selectedStockId, setSelectedStockId] = useState("");

  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const activeFarm = farms.find((f) => f.id === (selectedFarm || farms[0]?.id));

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session?.user) loadAll(); }, [session?.user?.id]);

  async function loadAll() {
    setBusy(true); setError("");
    const uid = session?.user?.id;
    if (!uid) { setBusy(false); return; }
    try {
      const { data: farmData, error: farmError } = await supabase.from("farms").select("*").order("created_at", { ascending: false });
      if (farmError) throw farmError;
      setFarms(farmData || []);
      const ids = (farmData || []).map((f) => f.id);
      if (!ids.length) {
        setCycles([]); setGroups([]); setRecords([]); setTransactions([]); setFeedItems([]);
        setFeedMovements([]); setMembers([]); setTasks([]); setAbsences([]); setLogs([]);
        setSelectedFarm(""); setBusy(false); return;
      }
      if (!selectedFarm || !ids.includes(selectedFarm)) setSelectedFarm(ids[0]);
      const queries = await Promise.all([
        supabase.from("production_cycles").select("*").in("farm_id", ids).order("created_at", { ascending: false }),
        supabase.from("animal_groups").select("*").in("farm_id", ids).order("created_at", { ascending: false }),
        supabase.from("daily_records").select("*").in("farm_id", ids).order("record_date", { ascending: false }).limit(300),
        supabase.from("financial_transactions").select("*").in("farm_id", ids).order("transaction_date", { ascending: false }).limit(300),
        supabase.from("feed_items").select("*").in("farm_id", ids).order("name"),
        supabase.from("feed_movements").select("*").in("farm_id", ids).order("movement_date", { ascending: false }).limit(200),
        supabase.from("farm_members").select("*").in("farm_id", ids).order("created_at", { ascending: false }),
        supabase.from("farm_tasks").select("*").in("farm_id", ids).order("created_at", { ascending: false }),
        supabase.from("farm_absences").select("*").in("farm_id", ids).order("start_date", { ascending: false }),
        supabase.from("audit_logs").select("*").in("farm_id", ids).order("created_at", { ascending: false }).limit(200)
      ]);
      const setters = [setCycles,setGroups,setRecords,setTransactions,setFeedItems,setFeedMovements,setMembers,setTasks,setAbsences,setLogs];
      queries.forEach((q, i) => { if (q.error) console.warn("Chargement module", i, q.error.message); setters[i](q.data || []); });
    } catch (e) { setError(e.message || "Impossible de charger les données."); }
    finally { setBusy(false); }
  }

  async function signIn(e) {
    e.preventDefault(); setAuthBusy(true); setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setAuthError(error.message);
    setAuthBusy(false);
  }
  async function signUp(e) {
    e.preventDefault(); setAuthBusy(true); setAuthError("");
    const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName } } });
    setAuthError(error ? error.message : "Compte créé. Vérifie ta boîte mail pour confirmer ton adresse.");
    setAuthBusy(false);
  }
  async function logout() { await supabase.auth.signOut(); }

  function openModal(name, defaults = {}) { setForm({ date: today(), ...defaults }); setModal(name); setError(""); setNotice(""); }
  async function saveFarm(e) {
    e.preventDefault(); setBusy(true); setError("");
    const { data, error } = await supabase.from("farms").insert({ owner_id: session.user.id, name: form.name?.trim(), location: form.location?.trim() || null }).select().single();
    if (error) setError(error.message);
    else { setNotice("Élevage ajouté."); setModal(""); await loadAll(); if (data?.id) setSelectedFarm(data.id); }
    setBusy(false);
  }
  async function saveCycle(e) {
    e.preventDefault();
    if (!activeFarm) { setError("Sélectionne d’abord un élevage."); return; }
    const cycleName = form.name?.trim();
    const cycleSpecies = form.species || "broilers";
    if (!cycleName) { setError("Indique le nom du cycle."); return; }
    if (!Object.prototype.hasOwnProperty.call(speciesNames, cycleSpecies)) {
      setError("Choisis une espèce animale valide."); return;
    }
    setBusy(true); setError("");
    const { error } = await supabase.from("production_cycles").insert({
      farm_id: activeFarm.id,
      name: cycleName,
      species: cycleSpecies,
      start_date: form.start_date || today(),
      status: "active"
    });
    if (error) setError(error.message);
    else { setModal(""); setNotice("Cycle créé."); await loadAll(); }
    setBusy(false);
  }
  async function saveGroup(e) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.from("animal_groups").insert({
      farm_id: activeFarm.id, cycle_id: form.cycle_id, name: form.name?.trim(),
      breed: form.breed || null, initial_count: Number(form.count), current_count: Number(form.count),
      entry_date: form.date || today()
    });
    if (error) setError(error.message); else { setModal(""); setNotice("Groupe d’animaux enregistré."); await loadAll(); }
    setBusy(false);
  }
  async function saveRecord(e) {
    e.preventDefault(); setBusy(true);
    const payload = {
      farm_id: activeFarm.id, cycle_id: form.cycle_id, group_id: form.group_id || null,
      record_date: form.date || today(), record_type: form.record_type,
      quantity: form.quantity === "" ? null : Number(form.quantity),
      unit: form.unit || null, notes: form.notes || null
    };
    const { error } = await supabase.from("daily_records").insert(payload);
    if (error) setError(error.message); else { setModal(""); setNotice("Suivi technique enregistré."); await loadAll(); }
    setBusy(false);
  }
  async function saveTransaction(e) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.from("financial_transactions").insert({
      farm_id: activeFarm.id, cycle_id: form.cycle_id || null,
      transaction_type: form.transaction_type, category: form.category?.trim(),
      amount: Number(form.amount), transaction_date: form.date || today(), description: form.description || null
    });
    if (error) setError(error.message); else { setModal(""); setNotice("Opération financière enregistrée."); await loadAll(); }
    setBusy(false);
  }
  async function saveStock(e) {
    e.preventDefault();
    if (!activeFarm) { setError("Sélectionne d’abord un élevage."); return; }
    setBusy(true); setError("");
    const baseUnit = form.unit || "kg";
    const packSize = Number(form.package_size || 0);
    const initialQty = Number(form.quantity || 0);
    const conversion = form.package_unit && packSize > 0 ? packSize : 1;
    if (form.package_unit && packSize <= 0) { setError("Indique le contenu d’un conditionnement (ex. 50 kg par sac)."); setBusy(false); return; }
    const { data: created, error: createError } = await supabase.from("feed_items").insert({
      farm_id: activeFarm.id, name: form.name?.trim(), category: form.category || "feed",
      description: form.description?.trim() || null, unit: baseUnit,
      quantity: 0, minimum_quantity: Number(form.minimum_quantity || 0),
      unit_cost: Number(form.unit_cost || 0), package_size: packSize || null,
      package_unit: form.package_unit || null, lot_number: form.lot_number?.trim() || null,
      expiry_date: form.expiry_date || null, supplier: form.supplier?.trim() || null,
      storage_location: form.storage_location?.trim() || null, item_condition: form.item_condition || null
    }).select().single();
    if (createError) {
      setError(createError.message);
      setBusy(false);
      return;
    }
    if (initialQty > 0) {
      const { error: movementError } = await supabase.rpc("gestfarm_register_stock_movement", {
        p_farm_id: activeFarm.id, p_feed_item_id: created.id, p_movement_type: "entry",
        p_quantity: initialQty, p_movement_date: today(), p_notes: "Stock initial à la création",
        p_input_unit: form.package_unit || baseUnit, p_conversion_factor: conversion,
        p_unit_cost: Number(form.unit_cost || 0), p_lot_number: form.lot_number || null,
        p_expiry_date: form.expiry_date || null
      });
      if (movementError) {
        await supabase.from("feed_items").delete().eq("id", created.id);
        setError(`Article non finalisé : ${movementError.message}`);
        setBusy(false);
        return;
      }
    }
    setModal(""); setNotice("Article ajouté au stock.");
    setSelectedStockId(created.id);
    await loadAll();
    setBusy(false);
  }
  async function saveMovement(e) {
    e.preventDefault(); setBusy(true); setError("");
    const item = feedItems.find((x) => x.id === form.feed_item_id);
    const qty = Number(form.quantity);
    if (!item) { setError("Choisis un article."); setBusy(false); return; }
    const inputUnit = form.input_unit || item.unit;
    const factor = inputUnit === item.package_unit && Number(item.package_size) > 0 ? Number(item.package_size) : 1;
    const { error: movementError } = await supabase.rpc("gestfarm_register_stock_movement", {
      p_farm_id: activeFarm.id, p_feed_item_id: item.id,
      p_movement_type: form.movement_type || "entry", p_quantity: qty,
      p_movement_date: form.date || today(), p_notes: form.notes || null,
      p_input_unit: inputUnit, p_conversion_factor: factor,
      p_unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
      p_lot_number: form.lot_number || null, p_expiry_date: form.expiry_date || null
    });
    if (movementError) setError(movementError.message);
    else { setModal(""); setNotice("Mouvement de stock enregistré et quantité actualisée."); setSelectedStockId(item.id); await loadAll(); }
    setBusy(false);
  }
  async function saveTask(e) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.from("farm_tasks").insert({
      farm_id: activeFarm.id, title: form.title?.trim(), description: form.description || null,
      assigned_to: form.assigned_to || null, status: "pending",
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null
    });
    if (error) setError(error.message); else { setModal(""); setNotice("Tâche créée."); await loadAll(); }
    setBusy(false);
  }
  async function updateTask(task, status) {
    const { error } = await supabase.from("farm_tasks").update({ status }).eq("id", task.id);
    if (error) setError(error.message); else await loadAll();
  }
  async function updateCycle(cycle, status) {
    const { error } = await supabase.from("production_cycles").update({ status, end_date: status === "completed" ? today() : cycle.end_date }).eq("id", cycle.id);
    if (error) setError(error.message); else await loadAll();
  }

  const farmCycles = cycles.filter((x) => x.farm_id === activeFarm?.id);
  const farmGroups = groups.filter((x) => x.farm_id === activeFarm?.id);
  const farmRecords = records.filter((x) => x.farm_id === activeFarm?.id);
  const farmTransactions = transactions.filter((x) => x.farm_id === activeFarm?.id);
  const farmFeed = feedItems.filter((x) => x.farm_id === activeFarm?.id);
  const farmFeedMovements = feedMovements.filter((x) => x.farm_id === activeFarm?.id);
  const selectedStock = farmFeed.find((x) => x.id === selectedStockId) || null;
  const visibleStock = farmFeed.filter((x) => `${x.name} ${x.description || ""} ${stockCategories[x.category] || ""}`.toLowerCase().includes(stockFilter.toLowerCase()));
  const stockLowCount = farmFeed.filter((x) => Number(x.quantity) <= Number(x.minimum_quantity || 0)).length;
  const expiringCount = farmFeed.filter((x) => x.expiry_date && new Date(`${x.expiry_date}T00:00:00`) <= new Date(Date.now() + 30 * 86400000)).length;
  const farmMembers = members.filter((x) => x.farm_id === activeFarm?.id);
  const farmTasks = tasks.filter((x) => x.farm_id === activeFarm?.id);
  const farmAbsences = absences.filter((x) => x.farm_id === activeFarm?.id);
  const farmLogs = logs.filter((x) => x.farm_id === activeFarm?.id);
  const animals = farmGroups.reduce((n, x) => n + Number(x.current_count || 0), 0);
  const income = farmTransactions.filter((x) => x.transaction_type === "revenue").reduce((n, x) => n + Number(x.amount || 0), 0);
  const expenses = farmTransactions.filter((x) => x.transaction_type === "expense").reduce((n, x) => n + Number(x.amount || 0), 0);
  const visibleTransactions = farmTransactions.filter((x) => `${x.category} ${x.description}`.toLowerCase().includes(filter.toLowerCase()));

  function modalForm(title, onSubmit, fields) {
    return <div style={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(""); }}>
      <form onSubmit={onSubmit} style={styles.modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: GREEN }}>{title}</h3><button type="button" onClick={() => setModal("")} style={styles.iconButton}><X size={20}/></button>
        </div>
        {fields}
        {error && <p style={styles.error}>{error}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <Button secondary onClick={() => setModal("")}>Annuler</Button>
          <Button type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Button>
        </div>
      </form>
    </div>;
  }

  if (!session) return <div style={styles.authPage}>
    <form onSubmit={authMode === "login" ? signIn : signUp} style={styles.authCard}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={styles.logoMark}>G</div><h1 style={{ color: GREEN, margin: "10px 0 3px", fontSize: 27 }}>GESTFARM</h1>
        <div style={{ color: "#718077", fontSize: 12 }}>by kenfack sobtia</div>
        <p style={{ color: "#66746b", fontSize: 13, marginTop: 18 }}>{authMode === "login" ? "Connecte-toi à ton espace de gestion." : "Crée ton compte GESTFARM."}</p>
      </div>
      {authMode === "signup" && <Field label="Nom complet"><input style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} required/></Field>}
      <div style={{ display: "grid", gap: 14 }}>
        <Field label="Adresse e-mail"><input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"/></Field>
        <Field label="Mot de passe"><input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={authMode === "login" ? "current-password" : "new-password"}/></Field>
      </div>
      {authError && <p style={styles.error}>{authError}</p>}
      <Button type="submit" disabled={authBusy}>{authBusy ? "Patiente…" : authMode === "login" ? "Se connecter" : "Créer mon compte"}</Button>
      <button type="button" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); }} style={styles.linkButton}>
        {authMode === "login" ? "Créer un compte" : "J’ai déjà un compte"}
      </button>
    </form>
  </div>;

  function renderContent() {
    if (!activeFarm && page !== "farms") return <div style={styles.panel}><Empty text="Commence par créer ton premier élevage dans « Mes élevages »."/></div>;
    if (page === "dashboard") return <>
      <SectionTitle title="Tableau de bord" subtitle={activeFarm ? `Vue d’ensemble — ${activeFarm.name}` : "Vue d’ensemble de ton activité"} action={<Button secondary onClick={loadAll}><RefreshCw size={15}/> Actualiser</Button>}/>
      <div style={styles.statsGrid}>
        <Card title="Élevages" value={farms.length} hint="Exploitations enregistrées" icon={Tractor}/>
        <Card title="Animaux présents" value={animals.toLocaleString("fr-FR")} hint="Effectif actuel des groupes" icon={Activity}/>
        <Card title="Recettes" value={money(income)} hint="Total des recettes enregistrées" icon={Wallet}/>
        <Card title="Dépenses" value={money(expenses)} hint="Total des dépenses enregistrées" icon={Package}/>
      </div>
      <div style={styles.twoCols}>
        <div style={styles.panel}><h3 style={styles.panelTitle}>Mes élevages</h3>{farms.length ? farms.map((f) => <div key={f.id} style={styles.listRow}><div><b>{f.name}</b><div style={styles.muted}>{f.location || "Localisation non précisée"}</div></div><span style={styles.pill}>{groups.filter(g => g.farm_id === f.id).reduce((n,g)=>n+Number(g.current_count||0),0)} animaux</span></div>) : <Empty text="Aucun élevage pour le moment."/>}</div>
        <div style={styles.panel}><h3 style={styles.panelTitle}>Activité récente</h3>{farmRecords.slice(0,5).length ? farmRecords.slice(0,5).map((r) => <div key={r.id} style={styles.listRow}><div><b>{recordNames[r.record_type] || r.record_type}</b><div style={styles.muted}>{r.notes || "Enregistrement technique"}</div></div><span style={styles.muted}>{dateLabel(r.record_date)}</span></div>) : <Empty text="Aucune donnée technique enregistrée."/>}</div>
      </div>
    </>;
    if (page === "farms") return <>
      <SectionTitle title="Mes élevages" subtitle="Gère tes exploitations, cycles de production et groupes d’animaux." action={<Button onClick={() => openModal("farm")}><Plus size={16}/> Nouvel élevage</Button>}/>
      <div style={styles.cardsGrid}>{farms.map((f) => <div key={f.id} style={{ ...styles.panel, border: selectedFarm === f.id ? `1px solid ${ACCENT}` : "1px solid #e7eee8" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div><h3 style={{ margin: 0, color: GREEN }}>{f.name}</h3><p style={styles.muted}>{f.location || "Localisation non précisée"}</p></div><span style={styles.pill}>{groups.filter(g => g.farm_id === f.id).reduce((n,g)=>n+Number(g.current_count||0),0)} animaux</span></div>
        <Button secondary onClick={() => setSelectedFarm(f.id)}>{selectedFarm === f.id ? "Élevage sélectionné" : "Sélectionner"}</Button>
      </div>)}</div>
      {activeFarm && <div style={{ ...styles.panel, marginTop: 18 }}>
        <SectionTitle title={`Cycles de ${activeFarm.name}`} action={<Button onClick={() => openModal("cycle", { species: "broilers", start_date: today() })}><Plus size={15}/> Nouveau cycle</Button>}/>
        {farmCycles.length ? farmCycles.map(c => <div key={c.id} style={styles.listRow}><div><b>{c.name}</b><div style={styles.muted}>{speciesNames[c.species] || c.species} · Début : {dateLabel(c.start_date)}</div></div><div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={styles.pill}>{c.status === "active" ? "Actif" : c.status === "completed" ? "Terminé" : "Annulé"}</span>{c.status === "active" && <Button secondary onClick={() => updateCycle(c,"completed")}>Terminer</Button>}</div></div>) : <Empty text="Aucun cycle. Crée un cycle pour commencer."/>}
      </div>}
      {activeFarm && <div style={{ ...styles.panel, marginTop: 18 }}>
        <SectionTitle title="Groupes d’animaux" action={<Button onClick={() => openModal("group", { cycle_id: farmCycles.find(c => c.status === "active")?.id || "" })}><Plus size={15}/> Ajouter un groupe</Button>}/>
        {farmGroups.length ? farmGroups.map(g => <div key={g.id} style={styles.listRow}><div><b>{g.name}</b><div style={styles.muted}>{g.breed || "Race non précisée"} · {farmCycles.find(c=>c.id===g.cycle_id)?.name || "Cycle"}</div></div><span style={styles.pill}>{g.current_count} / {g.initial_count}</span></div>) : <Empty text="Aucun groupe d’animaux enregistré."/>}
      </div>}
    </>;
    if (page === "technical") return <>
      <SectionTitle title="Suivi technique" subtitle="Enregistre les données quotidiennes de tes bandes et troupeaux." action={<Button onClick={() => openModal("record", { cycle_id: farmCycles.find(c=>c.status==="active")?.id || "", record_type: "observation" })} disabled={!farmCycles.length}><Plus size={15}/> Nouveau suivi</Button>}/>
      <div style={styles.panel}>{farmRecords.length ? <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Date</th><th>Type</th><th>Cycle</th><th>Quantité</th><th>Notes</th></tr></thead><tbody>{farmRecords.map(r=><tr key={r.id}><td>{dateLabel(r.record_date)}</td><td>{recordNames[r.record_type] || r.record_type}</td><td>{farmCycles.find(c=>c.id===r.cycle_id)?.name || "—"}</td><td>{r.quantity ?? "—"} {r.unit || ""}</td><td>{r.notes || "—"}</td></tr>)}</tbody></table></div> : <Empty text="Aucun suivi technique. Crée un cycle et un groupe, puis enregistre tes premières données."/>}</div>
    </>;
    if (page === "finance") return <>
      <SectionTitle title="Finances" subtitle="Suis les recettes, les dépenses et le solde de ton élevage." action={<Button onClick={() => openModal("transaction", { transaction_type: "expense" })}><Plus size={15}/> Nouvelle opération</Button>}/>
      <div style={styles.statsGrid}><Card title="Recettes" value={money(income)} icon={Wallet}/><Card title="Dépenses" value={money(expenses)} icon={Package}/><Card title="Solde" value={money(income-expenses)} hint="Recettes moins dépenses" icon={BarChart3}/></div>
      <div style={styles.panel}><div style={{ display: "flex", gap: 10, marginBottom: 12 }}><Search size={18} color="#718077"/><input style={{ ...inputStyle, maxWidth: 360 }} placeholder="Rechercher une opération…" value={filter} onChange={e=>setFilter(e.target.value)}/></div>
      {visibleTransactions.length ? <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Date</th><th>Type</th><th>Catégorie</th><th>Description</th><th>Montant</th></tr></thead><tbody>{visibleTransactions.map(t=><tr key={t.id}><td>{dateLabel(t.transaction_date)}</td><td>{t.transaction_type==="revenue"?"Recette":"Dépense"}</td><td>{t.category}</td><td>{t.description || "—"}</td><td style={{ fontWeight: 700 }}>{money(t.amount)}</td></tr>)}</tbody></table></div> : <Empty text="Aucune opération financière enregistrée."/>}</div>
    </>;
    if (page === "stocks") return <>
      <SectionTitle title="Stocks" subtitle="Gère tous les aliments, matières premières, médicaments, équipements et fournitures." action={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button secondary onClick={() => openModal("movement", { movement_type: "entry", feed_item_id: farmFeed[0]?.id || "" })} disabled={!farmFeed.length}><Plus size={15}/> Mouvement</Button><Button onClick={() => openModal("stock", { category: "feed", unit: "kg" })}><Plus size={15}/> Nouvel article</Button></div>}/>
      <div style={styles.statsGrid}><Card title="Articles en stock" value={farmFeed.length} icon={Package}/><Card title="Stocks à réapprovisionner" value={stockLowCount} hint="Sous le seuil minimum" icon={AlertCircle}/><Card title="Dates à surveiller" value={expiringCount} hint="Périmés ou à moins de 30 jours" icon={CalendarDays}/></div>
      <div style={styles.panel}>
        <div style={{ display:"flex",gap:10,alignItems:"center",marginBottom:15,flexWrap:"wrap" }}><Search size={18} color="#718077"/><input style={{...inputStyle,maxWidth:390}} placeholder="Rechercher un article ou une catégorie…" value={stockFilter} onChange={e=>setStockFilter(e.target.value)}/></div>
        {visibleStock.length ? <div style={styles.cardsGrid}>{visibleStock.map(i=>{const low=Number(i.quantity)<=Number(i.minimum_quantity||0);const expired=i.expiry_date && new Date(`${i.expiry_date}T00:00:00`) < new Date();return <div key={i.id} style={{border:"1px solid #e7eee8",borderRadius:12,padding:15,background:"#fff",display:"grid",gap:9}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"start"}}><div><b style={{color:GREEN,fontSize:15}}>{i.name}</b><div style={styles.muted}>{stockCategories[i.category]||"Autres fournitures"}</div></div><span style={{...styles.pill,background:low?"#fff1e8":"#edf5ef",color:low?"#a54b16":GREEN}}>{low?"Stock bas":"Disponible"}</span></div><div style={{fontSize:22,fontWeight:750,color:GREEN}}>{Number(i.quantity).toLocaleString("fr-FR",{maximumFractionDigits:3})} <span style={{fontSize:13,fontWeight:500}}>{i.unit}</span></div>{stockEquivalent(i.quantity,i.unit)&&<div style={{fontSize:12,color:ACCENT,fontWeight:650}}>{stockEquivalent(i.quantity,i.unit)}</div>}<div style={styles.muted}>Seuil : {i.minimum_quantity||0} {i.unit} · Coût unitaire : {money(i.unit_cost)}</div>{i.package_size&&i.package_unit&&<div style={styles.muted}>1 {i.package_unit} = {i.package_size} {i.unit}</div>}{i.expiry_date&&<div style={{fontSize:12,color:expired?"#a33131":"#65736a"}}>Expiration : {dateLabel(i.expiry_date)}{expired?" · Périmé":""}</div>}<div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Button secondary onClick={()=>setSelectedStockId(selectedStockId===i.id?"":i.id)}>{selectedStockId===i.id?"Masquer les détails":"Voir les détails"}</Button><Button secondary onClick={()=>openModal("movement",{movement_type:"entry",feed_item_id:i.id,input_unit:i.package_unit||i.unit})}>Mouvement</Button></div></div>})}</div> : <Empty text="Aucun article ne correspond à cette recherche. Ajoute ton premier article."/>}
      </div>
      {selectedStock&&<div style={{...styles.panel,marginTop:16}}><SectionTitle title={`Détails — ${selectedStock.name}`} subtitle={stockCategories[selectedStock.category]||"Article de stock"} action={<Button secondary onClick={()=>setSelectedStockId("")}>Fermer</Button>}/><div style={styles.formGrid}><div><b>Quantité disponible</b><div style={styles.muted}>{selectedStock.quantity} {selectedStock.unit} {stockEquivalent(selectedStock.quantity,selectedStock.unit) ? `· ${stockEquivalent(selectedStock.quantity,selectedStock.unit)}` : ""}</div></div><div><b>Seuil minimum</b><div style={styles.muted}>{selectedStock.minimum_quantity||0} {selectedStock.unit}</div></div><div><b>Fournisseur</b><div style={styles.muted}>{selectedStock.supplier||"Non renseigné"}</div></div><div><b>Emplacement</b><div style={styles.muted}>{selectedStock.storage_location||"Non renseigné"}</div></div><div><b>Lot / numéro de série</b><div style={styles.muted}>{selectedStock.lot_number||"Non renseigné"}</div></div><div><b>Date d’expiration</b><div style={styles.muted}>{dateLabel(selectedStock.expiry_date)}</div></div><div><b>État du matériel</b><div style={styles.muted}>{selectedStock.item_condition||"Non précisé"}</div></div><div><b>Description</b><div style={styles.muted}>{selectedStock.description||"Aucune description"}</div></div></div><h3 style={{...styles.panelTitle,marginTop:22}}>Historique des mouvements</h3>{farmFeedMovements.filter(m=>m.feed_item_id===selectedStock.id).length?<div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Date</th><th>Opération</th><th>Quantité</th><th>Notes</th></tr></thead><tbody>{farmFeedMovements.filter(m=>m.feed_item_id===selectedStock.id).map(m=><tr key={m.id}><td>{dateLabel(m.movement_date)}</td><td>{m.movement_type==="entry"?"Entrée":m.movement_type==="loss"?"Perte":m.movement_type==="adjustment"?"Ajustement":"Sortie"}</td><td>{m.input_quantity??m.quantity} {m.input_unit||selectedStock.unit}</td><td>{m.notes||"—"}</td></tr>)}</tbody></table></div>:<Empty text="Aucun mouvement enregistré pour cet article."/>}</div>}
      <div style={{...styles.panel,marginTop:16}}><h3 style={styles.panelTitle}>Mouvements récents de l’élevage</h3>{farmFeedMovements.length?<div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Date</th><th>Article</th><th>Opération</th><th>Quantité</th></tr></thead><tbody>{farmFeedMovements.slice(0,12).map(m=><tr key={m.id}><td>{dateLabel(m.movement_date)}</td><td>{farmFeed.find(i=>i.id===m.feed_item_id)?.name||"Article"}</td><td>{m.movement_type==="entry"?"Entrée":m.movement_type==="loss"?"Perte":m.movement_type==="adjustment"?"Ajustement":"Sortie"}</td><td>{m.input_quantity??m.quantity} {m.input_unit||farmFeed.find(i=>i.id===m.feed_item_id)?.unit||""}</td></tr>)}</tbody></table></div>:<Empty text="Les entrées, sorties et pertes apparaîtront ici."/>}</div>
    </>;
    if (page === "reports") return <>
      <SectionTitle title="Rapports" subtitle="Indicateurs calculés à partir des données enregistrées." action={<Button secondary onClick={()=>window.print()}>Imprimer / PDF</Button>}/>
      <div style={styles.statsGrid}><Card title="Nombre de cycles" value={farmCycles.length}/><Card title="Groupes d’animaux" value={farmGroups.length}/><Card title="Effectif actuel" value={animals}/><Card title="Marge actuelle" value={money(income-expenses)}/></div>
      <div style={styles.panel}><h3 style={styles.panelTitle}>Répartition des animaux</h3>{Object.entries(speciesNames).map(([key,label])=>{const count=farmGroups.filter(g=>farmCycles.find(c=>c.id===g.cycle_id)?.species===key).reduce((n,g)=>n+Number(g.current_count||0),0);return <div key={key} style={{ marginBottom: 14 }}><div style={{ display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5 }}><span>{label}</span><b>{count}</b></div><div style={{ height:9,background:"#edf2ee",borderRadius:9,overflow:"hidden" }}><div style={{ height:"100%",width:`${animals?count/animals*100:0}%`,background:ACCENT,borderRadius:9 }}/></div></div>})}</div>
    </>;
    if (page === "team") return <>
      <SectionTitle title="Équipe et autorisations" subtitle="Consulte les membres associés à cet élevage."/>
      <div style={styles.panel}>{farmMembers.length ? <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th>Statut</th><th>Compte lié</th></tr></thead><tbody>{farmMembers.map(m=><tr key={m.id}><td>{m.full_name || "—"}</td><td>{m.email}</td><td>{m.role || "Employé"}</td><td>{m.status}</td><td>{m.user_id?"Associé":"En attente"}</td></tr>)}</tbody></table></div> : <Empty text="Aucun membre n’est encore associé à cet élevage. L’invitation et la création sécurisée des comptes employés ne sont pas encore activées."/>}</div>
    </>;
    if (page === "tasks") return <>
      <SectionTitle title="Tâches et absences" subtitle="Organise les tâches et consulte les absences enregistrées." action={<Button onClick={()=>openModal("task")}><Plus size={15}/> Nouvelle tâche</Button>}/>
      <div style={styles.twoCols}><div style={styles.panel}><h3 style={styles.panelTitle}>Tâches</h3>{farmTasks.length?farmTasks.map(t=><div key={t.id} style={styles.listRow}><div><b>{t.title}</b><div style={styles.muted}>{t.description||"Sans description"}</div></div><select value={t.status||"pending"} onChange={e=>updateTask(t,e.target.value)} style={{...inputStyle,width:130}}><option value="pending">En attente</option><option value="in_progress">En cours</option><option value="completed">Terminée</option><option value="cancelled">Annulée</option></select></div>):<Empty text="Aucune tâche enregistrée."/>}</div>
      <div style={styles.panel}><h3 style={styles.panelTitle}>Absences</h3>{farmAbsences.length?farmAbsences.map(a=><div key={a.id} style={styles.listRow}><div><b>{farmMembers.find(m=>m.id===a.member_id)?.full_name||farmMembers.find(m=>m.id===a.member_id)?.email||"Membre"}</b><div style={styles.muted}>{a.reason||"Motif non précisé"}</div></div><span style={styles.muted}>{dateLabel(a.start_date)} – {dateLabel(a.end_date)}</span></div>):<Empty text="Aucune absence enregistrée."/>}</div></div>
    </>;
    if (page === "activity") return <>
      <SectionTitle title="Journal d’activité" subtitle="Historique automatique des opérations effectuées dans la base de données."/>
      <div style={styles.panel}>{farmLogs.length?<div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Date et heure</th><th>Action</th><th>Table</th><th>Utilisateur</th><th>Enregistrement</th></tr></thead><tbody>{farmLogs.map(l=><tr key={l.id}><td>{new Date(l.created_at).toLocaleString("fr-FR")}</td><td>{l.action}</td><td>{l.table_name}</td><td>{l.actor_id||"—"}</td><td>{l.record_id||"—"}</td></tr>)}</tbody></table></div>:<Empty text="Aucune activité enregistrée pour le moment."/>}</div>
    </>;
    return null;
  }

  const modalContent = (() => {
    const farmSelect = <Field label="Cycle de production"><select style={inputStyle} value={form.cycle_id||""} onChange={e=>set("cycle_id",e.target.value)} required><option value="">Choisir un cycle</option>{farmCycles.filter(c=>c.status==="active").map(c=><option key={c.id} value={c.id}>{c.name} — {speciesNames[c.species]}</option>)}</select></Field>;
    if (modal==="farm") return modalForm("Créer un élevage",saveFarm,<div style={styles.formGrid}><Field label="Nom de l’élevage"><input style={inputStyle} value={form.name||""} onChange={e=>set("name",e.target.value)} required placeholder="Ex. Ferme familiale"/></Field><Field label="Localisation"><input style={inputStyle} value={form.location||""} onChange={e=>set("location",e.target.value)} placeholder="Ville, village…"/></Field></div>);
    if (modal==="cycle") return modalForm("Créer un cycle",saveCycle,<div style={styles.formGrid}><Field label="Nom du cycle"><input style={inputStyle} value={form.name||""} onChange={e=>set("name",e.target.value)} required placeholder="Ex. Bande novembre"/></Field><Field label="Espèce"><select style={inputStyle} value={form.species||"broilers"} onChange={e=>set("species",e.target.value)}>{Object.entries(speciesNames).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></Field><Field label="Date de début"><input style={inputStyle} type="date" value={form.start_date||today()} onChange={e=>set("start_date",e.target.value)} required/></Field></div>);
    if (modal==="group") return modalForm("Ajouter un groupe d’animaux",saveGroup,<div style={styles.formGrid}>{farmSelect}<Field label="Nom du groupe"><input style={inputStyle} value={form.name||""} onChange={e=>set("name",e.target.value)} required placeholder="Ex. Bande 01"/></Field><Field label="Race / souche"><input style={inputStyle} value={form.breed||""} onChange={e=>set("breed",e.target.value)}/></Field><Field label="Effectif initial"><input style={inputStyle} type="number" min="0" value={form.count??""} onChange={e=>set("count",e.target.value)} required/></Field><Field label="Date d’entrée"><input style={inputStyle} type="date" value={form.date||today()} onChange={e=>set("date",e.target.value)}/></Field></div>);
    if (modal==="record") return modalForm("Nouveau suivi technique",saveRecord,<div style={styles.formGrid}>{farmSelect}<Field label="Type de suivi"><select style={inputStyle} value={form.record_type||"observation"} onChange={e=>set("record_type",e.target.value)}>{Object.entries(recordNames).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field><Field label="Groupe (facultatif)"><select style={inputStyle} value={form.group_id||""} onChange={e=>set("group_id",e.target.value)}><option value="">Tous les groupes / non précisé</option>{farmGroups.filter(g=>g.cycle_id===form.cycle_id).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></Field><Field label="Date"><input style={inputStyle} type="date" value={form.date||today()} onChange={e=>set("date",e.target.value)}/></Field><Field label="Quantité (facultatif)"><input style={inputStyle} type="number" min="0" step="any" value={form.quantity??""} onChange={e=>set("quantity",e.target.value)}/></Field><Field label="Unité"><input style={inputStyle} value={form.unit||""} onChange={e=>set("unit",e.target.value)} placeholder="kg, litres, unités…"/></Field><Field label="Notes"><textarea style={{...inputStyle,minHeight:75}} value={form.notes||""} onChange={e=>set("notes",e.target.value)}/></Field></div>);
    if (modal==="transaction") return modalForm("Nouvelle opération financière",saveTransaction,<div style={styles.formGrid}><Field label="Type"><select style={inputStyle} value={form.transaction_type||"expense"} onChange={e=>set("transaction_type",e.target.value)}><option value="expense">Dépense</option><option value="revenue">Recette</option></select></Field><Field label="Catégorie"><input style={inputStyle} value={form.category||""} onChange={e=>set("category",e.target.value)} required placeholder="Aliments, vente, soins…"/></Field><Field label="Montant (FCFA)"><input style={inputStyle} type="number" min="0" step="1" value={form.amount??""} onChange={e=>set("amount",e.target.value)} required/></Field><Field label="Date"><input style={inputStyle} type="date" value={form.date||today()} onChange={e=>set("date",e.target.value)}/></Field><Field label="Cycle (facultatif)"><select style={inputStyle} value={form.cycle_id||""} onChange={e=>set("cycle_id",e.target.value)}><option value="">Aucun cycle précis</option>{farmCycles.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Description"><textarea style={{...inputStyle,minHeight:70}} value={form.description||""} onChange={e=>set("description",e.target.value)}/></Field></div>);
    if (modal==="stock") return modalForm("Ajouter un article au stock",saveStock,<div style={styles.formGrid}><Field label="Nom de l’article"><input style={inputStyle} value={form.name||""} onChange={e=>set("name",e.target.value)} required placeholder="Ex. Maïs, vaccin, abreuvoir…"/></Field><Field label="Catégorie"><select style={inputStyle} value={form.category||"feed"} onChange={e=>set("category",e.target.value)}>{Object.entries(stockCategories).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></Field><Field label="Unité de base"><select style={inputStyle} value={form.unit||"kg"} onChange={e=>set("unit",e.target.value)}>{["kg","g","tonne","L","ml","unité","pièce","boîte","flacon","bidon","carton","rouleau","sac"].map(u=><option key={u} value={u}>{u}</option>)}</select></Field><Field label="Conditionnement (facultatif)"><select style={inputStyle} value={form.package_unit||""} onChange={e=>set("package_unit",e.target.value)}><option value="">Aucun</option>{["sac","carton","boîte","flacon","bidon","paquet","rouleau"].map(u=><option key={u} value={u}>{u}</option>)}</select></Field><Field label={`Contenu par conditionnement (${form.unit||"kg"})`}><input style={inputStyle} type="number" min="0.001" step="any" value={form.package_size??""} onChange={e=>set("package_size",e.target.value)} placeholder="Ex. 50"/></Field><Field label={`Quantité initiale (${form.package_unit||form.unit||"kg"})`}><input style={inputStyle} type="number" min="0" step="any" value={form.quantity??0} onChange={e=>set("quantity",e.target.value)}/></Field><Field label={`Seuil minimum (${form.unit||"kg"})`}><input style={inputStyle} type="number" min="0" step="any" value={form.minimum_quantity??0} onChange={e=>set("minimum_quantity",e.target.value)}/></Field><Field label={`Coût unitaire (FCFA / ${form.unit||"kg"})`}><input style={inputStyle} type="number" min="0" step="any" value={form.unit_cost??0} onChange={e=>set("unit_cost",e.target.value)}/></Field><Field label="Fournisseur"><input style={inputStyle} value={form.supplier||""} onChange={e=>set("supplier",e.target.value)}/></Field><Field label="Emplacement"><input style={inputStyle} value={form.storage_location||""} onChange={e=>set("storage_location",e.target.value)} placeholder="Magasin, pharmacie…"/></Field><Field label="N° de lot / série"><input style={inputStyle} value={form.lot_number||""} onChange={e=>set("lot_number",e.target.value)}/></Field><Field label="Date d’expiration (si applicable)"><input style={inputStyle} type="date" value={form.expiry_date||""} onChange={e=>set("expiry_date",e.target.value)}/></Field><Field label="État du matériel"><select style={inputStyle} value={form.item_condition||""} onChange={e=>set("item_condition",e.target.value)}><option value="">Non concerné / non précisé</option><option value="new">Neuf</option><option value="good">Bon état</option><option value="repair">À réparer</option><option value="out_of_service">Hors service</option></select></Field><Field label="Description"><textarea style={{...inputStyle,minHeight:70}} value={form.description||""} onChange={e=>set("description",e.target.value)}/></Field></div>);
    if (modal==="movement") { const movementItem=farmFeed.find(i=>i.id===form.feed_item_id); return modalForm("Mouvement de stock",saveMovement,<div style={styles.formGrid}><Field label="Article"><select style={inputStyle} value={form.feed_item_id||""} onChange={e=>{set("feed_item_id",e.target.value);const chosen=farmFeed.find(i=>i.id===e.target.value);set("input_unit",chosen?.package_unit||chosen?.unit||"");}} required><option value="">Choisir</option>{farmFeed.map(i=><option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>)}</select></Field><Field label="Type de mouvement"><select style={inputStyle} value={form.movement_type||"entry"} onChange={e=>set("movement_type",e.target.value)}><option value="entry">Entrée</option><option value="exit">Sortie / utilisation</option><option value="loss">Perte</option><option value="adjustment">Ajustement inventaire</option></select></Field><Field label="Unité de saisie"><select style={inputStyle} value={form.input_unit||movementItem?.unit||"kg"} onChange={e=>set("input_unit",e.target.value)}>{movementItem&&<><option value={movementItem.unit}>{movementItem.unit}</option>{movementItem.package_unit&&<option value={movementItem.package_unit}>{movementItem.package_unit} ({movementItem.package_size} {movementItem.unit})</option>}</>}</select></Field><Field label={`Quantité (${form.input_unit||movementItem?.unit||"unité"})`}><input style={inputStyle} type="number" min="0.001" step="any" value={form.quantity??""} onChange={e=>set("quantity",e.target.value)} required/></Field><Field label="Date"><input style={inputStyle} type="date" value={form.date||today()} onChange={e=>set("date",e.target.value)}/></Field><Field label="Coût unitaire (FCFA, facultatif)"><input style={inputStyle} type="number" min="0" step="any" value={form.unit_cost??""} onChange={e=>set("unit_cost",e.target.value)}/></Field><Field label="Lot / numéro de série"><input style={inputStyle} value={form.lot_number||""} onChange={e=>set("lot_number",e.target.value)}/></Field><Field label="Expiration du lot"><input style={inputStyle} type="date" value={form.expiry_date||""} onChange={e=>set("expiry_date",e.target.value)}/></Field><Field label="Notes"><input style={inputStyle} value={form.notes||""} onChange={e=>set("notes",e.target.value)}/></Field></div>); }
    if (modal==="task") return modalForm("Créer une tâche",saveTask,<div style={styles.formGrid}><Field label="Intitulé"><input style={inputStyle} value={form.title||""} onChange={e=>set("title",e.target.value)} required/></Field><Field label="Description"><textarea style={inputStyle} value={form.description||""} onChange={e=>set("description",e.target.value)}/></Field><Field label="Début (facultatif)"><input style={inputStyle} type="datetime-local" value={form.start_date||""} onChange={e=>set("start_date",e.target.value)}/></Field><Field label="Fin (facultatif)"><input style={inputStyle} type="datetime-local" value={form.end_date||""} onChange={e=>set("end_date",e.target.value)}/></Field><Field label="Attribuer à (facultatif)"><select style={inputStyle} value={form.assigned_to||""} onChange={e=>set("assigned_to",e.target.value)}><option value="">Non attribuée</option>{farmMembers.map(m=><option key={m.id} value={m.id}>{m.full_name||m.email}</option>)}</select></Field></div>);
    return null;
  })();

  return <div style={styles.app}>
    <aside style={{ ...styles.sidebar, transform: mobileOpen ? "translateX(0)" : undefined }}>
      <div style={styles.brand}><div style={styles.brandMark}>G</div><div><b>GESTFARM</b><small>by kenfack sobtia</small></div></div>
      <div style={styles.navLabel}>MENU PRINCIPAL</div>
      {nav.map(([id,label,Icon])=><button key={id} onClick={()=>{setPage(id);setMobileOpen(false);setError("");}} style={{...styles.navItem,background:page===id?"#eaf3ec":"transparent",color:page===id?GREEN:"#66746b",fontWeight:page===id?700:500}}><Icon size={18}/>{label}</button>)}
      <div style={{ marginTop:"auto", paddingTop:20 }}><button onClick={logout} style={styles.navItem}><LogOut size={18}/> Déconnexion</button></div>
    </aside>
    {mobileOpen && <div style={styles.scrim} onClick={()=>setMobileOpen(false)}/>}
    <main style={styles.main}>
      <header style={styles.header}>
        <button onClick={()=>setMobileOpen(!mobileOpen)} style={{...styles.iconButton,display:"inline-flex"}}><Menu size={20}/></button>
        <div style={{ flex:1 }}><b style={{ color:GREEN }}>Espace de gestion</b><div style={styles.muted}>{session.user.email}</div></div>
        <select aria-label="Élevage actif" value={activeFarm?.id||""} onChange={e=>setSelectedFarm(e.target.value)} style={{...inputStyle,width:"auto",maxWidth:190}}><option value="">Tous les élevages</option>{farms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select>
      </header>
      <div style={styles.content}>
        {error && <div style={styles.errorBanner}><AlertCircle size={17}/>{error}<button onClick={()=>setError("")} style={styles.dismiss}>×</button></div>}
        {notice && <div style={styles.successBanner}><CheckCircle2 size={17}/>{notice}<button onClick={()=>setNotice("")} style={styles.dismiss}>×</button></div>}
        {busy && <div style={styles.loading}>Chargement des données…</div>}
        {renderContent()}
        <footer style={styles.footer}>GESTFARM by kenfack sobtia · Gestion et suivi des exploitations d’élevage</footer>
      </div>
    </main>
    {modalContent}
  </div>;
}

const styles = {
  app:{minHeight:"100vh",display:"flex",background:"#f5f7f5",fontFamily:"Arial, sans-serif",color:"#24352a"},
  authPage:{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f5f7f5",padding:18,fontFamily:"Arial,sans-serif"},
  authCard:{width:"min(100%,390px)",boxSizing:"border-box",background:"#fff",padding:30,borderRadius:16,boxShadow:"0 8px 35px #173d2512",display:"grid",gap:16},
  logoMark:{width:48,height:48,margin:"0 auto",borderRadius:14,background:GREEN,color:"#fff",display:"grid",placeItems:"center",fontWeight:800,fontSize:26},
  sidebar:{width:245,background:"#fff",borderRight:"1px solid #e8eee9",padding:"22px 14px",boxSizing:"border-box",display:"flex",flexDirection:"column",minHeight:"100vh",position:"sticky",top:0,height:"100vh",zIndex:20,flexShrink:0},
  brand:{display:"flex",alignItems:"center",gap:10,padding:"0 9px 28px",color:GREEN,fontSize:17,letterSpacing:.4},
  brandMark:{width:38,height:38,background:GREEN,color:"#fff",borderRadius:11,display:"grid",placeItems:"center",fontWeight:800,fontSize:21},
  navLabel:{fontSize:10,fontWeight:700,color:"#9aa69d",letterSpacing:1,padding:"0 10px 10px"},
  navItem:{width:"100%",display:"flex",alignItems:"center",gap:12,border:0,borderRadius:9,padding:"11px 12px",marginBottom:4,textAlign:"left",fontSize:13,cursor:"pointer"},
  main:{flex:1,minWidth:0},
  header:{height:70,background:"#fff",borderBottom:"1px solid #e8eee9",display:"flex",alignItems:"center",gap:14,padding:"0 25px",position:"sticky",top:0,zIndex:10},
  content:{padding:"27px 28px",maxWidth:1450,margin:"0 auto"},
  statsGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:15,marginBottom:18},
  card:{background:"#fff",border:"1px solid #e8eee9",borderRadius:13,padding:18,boxShadow:"0 2px 8px #1d462408"},
  panel:{background:"#fff",border:"1px solid #e8eee9",borderRadius:13,padding:19,boxShadow:"0 2px 8px #1d462408",minWidth:0},
  panelTitle:{fontSize:16,color:GREEN,margin:"0 0 13px"},
  twoCols:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginTop:16},
  cardsGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:14},
  listRow:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"12px 0",borderBottom:"1px solid #eff3ef",fontSize:13},
  muted:{fontSize:12,color:"#7b887f",marginTop:4},
  pill:{fontSize:11,color:GREEN,background:"#edf5ef",borderRadius:20,padding:"5px 9px",whiteSpace:"nowrap"},
  tableWrap:{overflowX:"auto"},
  table:{width:"100%",borderCollapse:"collapse",fontSize:13,textAlign:"left"},
  formGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14},
  overlay:{position:"fixed",inset:0,background:"#0d2118a6",zIndex:50,display:"grid",placeItems:"center",padding:16},
  modal:{width:"min(100%,620px)",maxHeight:"90vh",overflowY:"auto",background:"#fff",borderRadius:15,padding:22,boxSizing:"border-box",boxShadow:"0 20px 70px #0003"},
  iconButton:{border:0,background:"transparent",color:"#52645a",padding:7,borderRadius:8,cursor:"pointer"},
  linkButton:{border:0,background:"transparent",color:ACCENT,fontWeight:650,cursor:"pointer",padding:7},
  error:{color:"#a33131",background:"#fff0f0",padding:10,borderRadius:8,fontSize:13},
  errorBanner:{display:"flex",alignItems:"center",gap:9,background:"#fff0f0",color:"#9b3030",padding:12,borderRadius:9,marginBottom:14,fontSize:13},
  successBanner:{display:"flex",alignItems:"center",gap:9,background:"#edf7ef",color:GREEN,padding:12,borderRadius:9,marginBottom:14,fontSize:13},
  dismiss:{marginLeft:"auto",border:0,background:"transparent",fontSize:20,cursor:"pointer",color:"inherit"},
  loading:{fontSize:12,color:"#718077",marginBottom:12},
  footer:{textAlign:"center",color:"#9aa69d",fontSize:11,padding:"30px 0 10px"},
  scrim:{display:"none"}
};
