import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Tractor, ClipboardList, Wallet, Package, BarChart3,
  Users, ClipboardCheck, Menu, X, LogOut, Plus, RefreshCw, Search,
  AlertCircle, CheckCircle2, Trash2, CalendarDays, Activity, MessageSquare, MailCheck
} from "lucide-react";
import { supabase } from "./supabase";

const GREEN = "#174d35";
const ACCENT = "#24734d";
const today = () => new Date().toISOString().slice(0, 10);
const money = (n) => `${Number(n || 0).toLocaleString("fr-FR")} FCFA`;
const dateLabel = (d) => d ? new Date(`${d}T00:00:00`).toLocaleDateString("fr-FR") : "—";
const addDaysToDate = (date, days) => { if (!date) return ""; const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const stockEquivalent = (quantity, unit) => {
  const value = Number(quantity || 0);
  if (unit === "kg" && value >= 1000) return `≈ ${(value / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} tonne(s)`;
  if (unit === "tonne") return `≈ ${(value * 1000).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} kg`;
  if (unit === "g" && value >= 1000) return `≈ ${(value / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} kg`;
  if (unit === "ml" && value >= 1000) return `≈ ${(value / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} L`;
  return "";
};
const speciesNames = { broilers: "Poulets de chair", layers: "Poules pondeuses", rabbits: "Lapins", pigs: "Porcs" };
const stockUnits = ["kg", "g", "sac", "tonne", "L", "unité", "pièce", "boîte", "flacon", "bidon", "carton", "rouleau", "ml", "autre"];
const stockUnitLabels = { kg:"Kilogramme (kg)", g:"Gramme (g)", sac:"Sac", tonne:"Tonne (t)", L:"Litre (L)", unité:"Unité", pièce:"Pièce", boîte:"Boîte", flacon:"Flacon", bidon:"Bidon", carton:"Carton", rouleau:"Rouleau", ml:"Millilitre (ml)", autre:"Autre" };
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
  ["rabbits", "Reproducteurs lapins", Activity],
  ["pigs", "Reproducteurs porcs", Activity],
  ["finance", "Finances", Wallet],
  ["sales", "Ventes", Wallet],
  ["stocks", "Stocks", Package],
  ["reports", "Rapports", BarChart3],
  ["team", "Équipe", Users],
  ["tasks", "Tâches et absences", ClipboardCheck],
  ["activity", "Journal d’activité", Activity],
  ["suggestions", "Suggestions", MessageSquare],
  ["adminSuggestions", "Administration — retours", MailCheck]
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

function farmGroupsForRabbit(allGroups, allCycles, farmId) {
  return allGroups.filter(g => g.farm_id === farmId && allCycles.some(c => c.id === g.cycle_id && c.species === "rabbits"));
}
function farmGroupsForSpecies(allGroups, allCycles, farmId, species) {
  return allGroups.filter(g => g.farm_id === farmId && allCycles.some(c => c.id === g.cycle_id && c.species === species));
}

function PrivacyText() {
  return <div style={{fontSize:13,lineHeight:1.65,color:"#405047",margin:"16px 0"}}>
    <p><b>Version de travail — à compléter et à faire valider avant la mise en production.</b> Cette notice explique les grandes lignes du traitement des données dans GESTFARM.</p>
    <h3>Données traitées</h3><p>Selon les fonctions utilisées, GESTFARM peut traiter les informations de compte (nom, adresse e-mail et identifiants techniques), les données des exploitations et de leurs équipes, les suivis d’élevage, les stocks, les opérations financières, les tâches, les journaux d’activité ainsi que les messages envoyés dans la boîte à suggestions.</p>
    <h3>Finalités</h3><p>Ces données servent à créer et sécuriser les comptes, gérer les exploitations, permettre la collaboration selon les habilitations attribuées, conserver l’historique des opérations, assurer le fonctionnement du service et traiter les demandes d’assistance et suggestions.</p>
    <h3>Hébergement et prestataires</h3><p>Le service utilise Supabase pour l’authentification et le stockage des données, ainsi que Vercel pour l’hébergement de l’application. Ces prestataires techniques peuvent traiter des données dans le cadre de la fourniture de leurs services, selon leurs propres engagements contractuels et politiques.</p>
    <h3>Accès et sécurité</h3><p>L’accès aux données dépend de l’authentification et des autorisations configurées dans l’application. Des mesures techniques, notamment les règles de sécurité au niveau des lignes de la base de données, sont utilisées. Aucun système ne peut toutefois garantir une sécurité absolue. Ne partage jamais ton mot de passe.</p>
    <h3>Conservation et partage</h3><p>Les données sont conservées pendant la durée nécessaire au fonctionnement du compte et aux finalités décrites, puis selon les obligations légales et les procédures de suppression qui seront définies par le responsable du service. Les durées précises et les éventuels transferts internationaux doivent être documentés avant la mise en production. Les données ne doivent pas être vendues.</p>
    <h3>Vos droits et contact</h3><p>Selon la réglementation applicable, tu peux demander l’accès, la rectification ou la suppression de tes données et exercer les autres droits prévus par la loi. Le responsable du traitement, ses coordonnées officielles, les délais de conservation détaillés et le canal de demande doivent être renseignés ici avant publication : <b>coordonnées du responsable GESTFARM à compléter</b>.</p>
    <p>Cette notice est une base informative et ne constitue pas un avis juridique ni une déclaration de conformité. Elle doit être complétée avec l’identité du responsable, les durées exactes, les bases légales et les procédures de traitement des demandes.</p>
  </div>;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryPasswordConfirm, setRecoveryPasswordConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailSentAddress, setEmailSentAddress] = useState("");
  const [emailConfirmed, setEmailConfirmed] = useState(() => new URLSearchParams(window.location.search).get("email_confirmed") === "1");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [inviteSetup, setInviteSetup] = useState(() => new URLSearchParams(window.location.search).get("invite") === "1");
  const [invitePassword, setInvitePassword] = useState("");
  const [invitePasswordConfirm, setInvitePasswordConfirm] = useState("");
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
  const [groupAssignments, setGroupAssignments] = useState([]);
  const [rabbitGroupFilter, setRabbitGroupFilter] = useState("");
  const [rabbitBreeders, setRabbitBreeders] = useState([]);
  const [rabbitEvents, setRabbitEvents] = useState([]);
  const [pigGroupFilter, setPigGroupFilter] = useState("");
  const [pigBreeders, setPigBreeders] = useState([]);
  const [pigEvents, setPigEvents] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState("");
  const [modal, setModal] = useState("");
  const [form, setForm] = useState({});
  const [filter, setFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [selectedStockId, setSelectedStockId] = useState("");
  const [reportStart, setReportStart] = useState("");
  const [reportEnd, setReportEnd] = useState("");
  const [reportCycleId, setReportCycleId] = useState("");
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [suggestionCategory, setSuggestionCategory] = useState("suggestion");
  const [suggestionSubject, setSuggestionSubject] = useState("");
  const [suggestionMessage, setSuggestionMessage] = useState("");
  const [suggestionBusy, setSuggestionBusy] = useState(false);
  const [suggestionRows, setSuggestionRows] = useState([]);
  const [sales, setSales] = useState([]);
  const [offspringBatches, setOffspringBatches] = useState([]);
  const [stockTransfers, setStockTransfers] = useState([]);
  const [stockAllocations, setStockAllocations] = useState([]);
  const [allocationMovements, setAllocationMovements] = useState([]);
  const [archivedFarms, setArchivedFarms] = useState([]);
  const [archivedCycles, setArchivedCycles] = useState([]);
  const [archivedGroups, setArchivedGroups] = useState([]);
  const [printItem, setPrintItem] = useState(null);
  const [suggestionError, setSuggestionError] = useState("");

  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const activeFarm = farms.find((f) => f.id === (selectedFarm || farms[0]?.id));

  useEffect(() => {
    const confirmationRedirect = new URLSearchParams(window.location.search).get("email_confirmed") === "1";
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (confirmationRedirect) {
        setEmailConfirmed(true);
        if (data.session) setNotice("Adresse e-mail confirmée. Bienvenue sur GESTFARM !");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      if (event === "SIGNED_IN" && confirmationRedirect) {
        setEmailConfirmed(true);
        setNotice("Adresse e-mail confirmée. Bienvenue sur GESTFARM !");
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session?.user) loadAll(); }, [session?.user?.id]);
  useEffect(() => { if (session?.user?.id && (page === "suggestions" || page === "adminSuggestions")) loadSuggestions(); }, [session?.user?.id, page]);

  async function loadAll() {
    setBusy(true); setError("");
    const uid = session?.user?.id;
    if (!uid) { setBusy(false); return; }
    try {
      const { data: farmData, error: farmError } = await supabase.from("farms").select("*").order("created_at", { ascending: false });
      if (farmError) throw farmError;
      const allFarmRows = farmData || [];
      const activeFarmRows = allFarmRows.filter((f) => !f.deleted_at);
      setFarms(activeFarmRows);
      setArchivedFarms(allFarmRows.filter((f) => !!f.deleted_at));
      const ids = allFarmRows.map((f) => f.id);
      if (!ids.length) {
        setCycles([]); setGroups([]); setRecords([]); setTransactions([]); setFeedItems([]);
        setFeedMovements([]); setMembers([]); setTasks([]); setAbsences([]); setLogs([]); setGroupAssignments([]);
        setRabbitBreeders([]); setRabbitEvents([]); setPigBreeders([]); setPigEvents([]); setSales([]); setOffspringBatches([]); setStockTransfers([]); setStockAllocations([]); setAllocationMovements([]); setArchivedCycles([]); setArchivedGroups([]); setSelectedFarm(""); setBusy(false); return;
      }
      const activeIds = activeFarmRows.map((f) => f.id);
      if (!selectedFarm || !activeIds.includes(selectedFarm)) setSelectedFarm(activeIds[0] || "");
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
        supabase.from("audit_logs").select("*").in("farm_id", ids).order("created_at", { ascending: false }).limit(200),
        supabase.from("animal_group_assignments").select("*").in("farm_id", ids),
        supabase.from("rabbit_breeders").select("*").in("farm_id", ids).order("created_at", { ascending: false }),
        supabase.from("rabbit_reproduction_events").select("*").in("farm_id", ids).order("event_date", { ascending: false }).limit(1000),
        supabase.from("pig_breeders").select("*").in("farm_id", ids).order("created_at", { ascending: false }),
        supabase.from("pig_reproduction_events").select("*").in("farm_id", ids).order("event_date", { ascending: false }).limit(1000),
        supabase.from("gestfarm_sales").select("*").in("farm_id", ids).order("sale_date", { ascending: false }).limit(500),
        supabase.from("gestfarm_offspring_batches").select("*").in("farm_id", ids).order("birth_date", { ascending: false }).limit(500),
        supabase.from("gestfarm_stock_transfers").select("*").in("farm_id", ids).order("transfer_date", { ascending: false }).limit(300),
        supabase.from("gestfarm_stock_allocations").select("*").in("farm_id", ids).order("created_at", { ascending: false }).limit(1000),
        supabase.from("gestfarm_stock_allocation_movements").select("*").in("farm_id", ids).order("created_at", { ascending: false }).limit(1500)
      ]);
      if (queries[0].error) console.warn("Chargement cycles", queries[0].error.message);
      if (queries[1].error) console.warn("Chargement bandes", queries[1].error.message);
      setCycles((queries[0].data || []).filter(x => !x.deleted_at));
      setArchivedCycles((queries[0].data || []).filter(x => !!x.deleted_at));
      setGroups((queries[1].data || []).filter(x => !x.deleted_at));
      setArchivedGroups((queries[1].data || []).filter(x => !!x.deleted_at));
      const setters = [null,null,setRecords,setTransactions,setFeedItems,setFeedMovements,setMembers,setTasks,setAbsences,setLogs,setGroupAssignments,setRabbitBreeders,setRabbitEvents,setPigBreeders,setPigEvents,setSales,setOffspringBatches,setStockTransfers,setStockAllocations,setAllocationMovements];
      queries.forEach((q, i) => { if (i < 2) return; if (q.error) console.warn("Chargement module", i, q.error.message); setters[i]?.(q.data || []); });
    } catch (e) { setError(e.message || "Impossible de charger les données."); }
    finally { setBusy(false); }
  }

  async function loadSuggestions() {
    if (!session?.user?.id) return;
    const { data, error } = await supabase.from("gestfarm_suggestions").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) { setSuggestionError("Impossible de charger tes retours pour le moment."); return; }
    setSuggestionRows(data || []);
  }

  async function submitSuggestion(e) {
    e.preventDefault();
    const subject = suggestionSubject.trim();
    const message = suggestionMessage.trim();
    if (subject.length < 3 || message.length < 10) {
      setSuggestionError("Le sujet doit contenir au moins 3 caractères et le message au moins 10.");
      return;
    }
    setSuggestionBusy(true); setSuggestionError("");
    const { error } = await supabase.from("gestfarm_suggestions").insert({
      user_id: session.user.id,
      user_email: session.user.email || null,
      farm_id: activeFarm?.id || null,
      category: suggestionCategory,
      subject,
      message
    });
    if (error) setSuggestionError("Envoi impossible : " + (error.message || "réessaie plus tard."));
    else {
      setSuggestionSubject(""); setSuggestionMessage("");
      setNotice("Merci ! Ton retour a bien été transmis à GESTFARM.");
      await loadSuggestions();
    }
    setSuggestionBusy(false);
  }

  async function updateSuggestionStatus(row, status) {
    const { error } = await supabase.from("gestfarm_suggestions").update({ status }).eq("id", row.id);
    if (error) setError("Modification du statut impossible : " + error.message);
    else { setNotice("Statut de la suggestion mis à jour."); await loadSuggestions(); }
  }

  function printBreederCard(breeder, species, history) {
    setPrintItem({ kind: "breeder", breeder, species, history: history || [], batch: offspringBatches.find(b=>b.id===breeder.offspring_batch_id) || null });
    window.setTimeout(() => window.print(), 250);
  }
  function printBreederHistory(breeder, species, history) {
    setPrintItem({ kind: "history", breeder, species, history: history || [], batch: offspringBatches.find(b=>b.id===breeder.offspring_batch_id) || null });
    window.setTimeout(() => window.print(), 250);
  }

  function friendlyAuthError(error) {
    const message = String(error?.message || "");
    if (/email rate limit exceeded|over_email_send_rate_limit/i.test(message)) {
      return "La limite temporaire d’envoi des e-mails de Supabase est atteinte. Attends avant de réessayer. Pour permettre les inscriptions de tous les utilisateurs, GESTFARM doit aussi disposer d’un service e-mail SMTP personnalisé.";
    }
    if (/email_address_not_authorized/i.test(message)) {
      return "Le service e-mail intégré de Supabase n’autorise pas encore cette adresse. Un service SMTP personnalisé doit être configuré pour envoyer les confirmations aux autres utilisateurs.";
    }
    if (/password.*(at least|short|characters)/i.test(message)) {
      return "Le mot de passe doit contenir au moins 8 caractères.";
    }
    return message || "Une erreur est survenue. Réessaie dans quelques instants.";
  }
  async function signIn(e) {
    e.preventDefault(); setAuthBusy(true); setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setAuthError(friendlyAuthError(error));
    setAuthBusy(false);
  }
  async function signUp(e) {
    e.preventDefault(); setAuthBusy(true); setAuthError("");
    if (!fullName.trim()) {
      setAuthError("Indique ton nom complet."); setAuthBusy(false); return;
    }
    if (password.length < 8) {
      setAuthError("Le mot de passe doit contenir au moins 8 caractères."); setAuthBusy(false); return;
    }
    if (password !== passwordConfirm) {
      setAuthError("Les deux mots de passe ne correspondent pas."); setAuthBusy(false); return;
    }
    const address = email.trim();
    const { data, error } = await supabase.auth.signUp({
      email: address,
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/?email_confirmed=1`
      }
    });
    if (error) {
      setAuthError(friendlyAuthError(error));
    } else if (data?.session) {
      setNotice("Compte créé. Ton espace GESTFARM est prêt.");
    } else if (data?.user) {
      setEmailSentAddress(address);
      setEmailSent(true);
      setPassword("");
      setPasswordConfirm("");
      setAuthError("");
    } else {
      setAuthError("La demande de création du compte n’a pas abouti. Réessaie dans quelques instants.");
    }
    setAuthBusy(false);
  }
  async function sendPasswordRecovery(e) {
    e.preventDefault();
    setAuthBusy(true); setAuthError("");
    const address = email.trim();
    if (!address) {
      setAuthError("Indique d’abord ton adresse e-mail.");
      setAuthBusy(false);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/?recovery=1`
    });
    setAuthError(error
      ? error.message
      : "Si cette adresse correspond à un compte, un lien de réinitialisation vient d’être envoyé. Vérifie ta boîte mail.");
    setAuthBusy(false);
  }
  async function finishPasswordRecovery(e) {
    e.preventDefault();
    setAuthBusy(true); setAuthError("");
    if (recoveryPassword.length < 8) {
      setAuthError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      setAuthBusy(false);
      return;
    }
    if (recoveryPassword !== recoveryPasswordConfirm) {
      setAuthError("Les deux mots de passe ne correspondent pas.");
      setAuthBusy(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: recoveryPassword });
    if (error) {
      setAuthError(error.message);
    } else {
      setRecoveryMode(false);
      setRecoveryPassword("");
      setRecoveryPasswordConfirm("");
      setPassword("");
      setAuthError("Ton mot de passe a été modifié. Tu peux maintenant te connecter avec le nouveau mot de passe.");
      await supabase.auth.signOut();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    setAuthBusy(false);
  }
  async function logout() { await supabase.auth.signOut(); }
  async function finishInvite(e) {
    e.preventDefault(); setAuthBusy(true); setAuthError("");
    if (!session) { setAuthError("Ouvre le lien reçu par e-mail pour activer ton compte."); setAuthBusy(false); return; }
    if (invitePassword.length < 8) { setAuthError("Le mot de passe doit contenir au moins 8 caractères."); setAuthBusy(false); return; }
    if (invitePassword !== invitePasswordConfirm) { setAuthError("Les deux mots de passe ne correspondent pas."); setAuthBusy(false); return; }
    const { error } = await supabase.auth.updateUser({ password: invitePassword });
    if (error) setAuthError(friendlyAuthError(error));
    else {
      setInviteSetup(false); setInvitePassword(""); setInvitePasswordConfirm("");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    setAuthBusy(false);
  }
  async function sendMemberInvite(member) {
    if (!activeFarm) return;
    setBusy(true); setError(""); setNotice("");
    const { data, error } = await supabase.functions.invoke("invite-farm-member", {
      body: { farm_id: activeFarm.id, member_id: member.id }
    });
    if (error) setError(error.message || "Impossible d’envoyer l’invitation.");
    else if (data?.error) setError(data.error);
    else { setNotice(data?.message || `Invitation envoyée à ${member.email}.`); await loadAll(); }
    setBusy(false);
  }

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
    e.preventDefault();
    const name = form.name?.trim();
    const count = Number(form.count);
    const species = form.species || "broilers";
    if (!name) { setError("Donne un nom clair à cette fiche d’élevage."); return; }
    if (!Number.isFinite(count) || count < (form.group_id ? 0 : 1)) { setError(form.group_id ? "L’effectif actuel ne peut pas être négatif." : "Indique un effectif supérieur à zéro."); return; }
    if (!Object.prototype.hasOwnProperty.call(speciesNames, species)) { setError("Choisis une espèce valide."); return; }
    setBusy(true); setError("");
    let createdFarmId = null;
    let createdCycleId = null;
    try {
      let farm = activeFarm;
      if (!farm) {
        const { data: createdFarm, error: farmError } = await supabase.from("farms").insert({
          owner_id: session.user.id,
          name: form.farm_name?.trim() || "Mon exploitation",
          location: form.location?.trim() || null
        }).select().single();
        if (farmError) throw farmError;
        farm = createdFarm;
        createdFarmId = createdFarm.id;
      }
      if (form.group_id) {
        const { error: groupError } = await supabase.from("animal_groups").update({
          name, breed: form.breed?.trim() || null, building_name: form.building_name?.trim() || null,
          initial_count: Number(form.initial_count ?? count), current_count: count,
          entry_date: form.date || today()
        }).eq("id", form.group_id);
        if (groupError) throw groupError;
        const relatedGroups = groups.filter(g => g.cycle_id === form.cycle_id);
        if (relatedGroups.length <= 1) {
          const { error: cycleError } = await supabase.from("production_cycles").update({
            name, species, start_date: form.date || today()
          }).eq("id", form.cycle_id);
          if (cycleError) throw cycleError;
        }
        setNotice("Fiche d’élevage modifiée.");
      } else {
        const { data: cycle, error: cycleError } = await supabase.from("production_cycles").insert({
          farm_id: farm.id, name, species, start_date: form.date || today(), status: "active"
        }).select().single();
        if (cycleError) throw cycleError;
        createdCycleId = cycle.id;
        const { error: groupError } = await supabase.from("animal_groups").insert({
          farm_id: farm.id, cycle_id: cycle.id, name,
          breed: form.breed?.trim() || null, building_name: form.building_name?.trim() || null, initial_count: count, current_count: count,
          entry_date: form.date || today()
        });
        if (groupError) throw groupError;
        setNotice("Fiche d’élevage créée avec succès.");
      }
      setModal("");
      await loadAll();
      if (farm?.id) setSelectedFarm(farm.id);
    } catch (err) {
      if (createdCycleId) await supabase.from("production_cycles").delete().eq("id", createdCycleId);
      if (createdFarmId) await loadAll();
      setError(err.message || "Impossible d’enregistrer cette fiche.");
    }
    finally { setBusy(false); }
  }

  async function deleteGroup(group) {
    if (!window.confirm(`Mettre « ${group.name} » dans la corbeille ? Tu pourras le restaurer plus tard.`)) return;
    setBusy(true); setError("");
    const { error } = await supabase.rpc("gestfarm_archive_group", { p_group_id: group.id });
    if (error) setError("Impossible de déplacer cette fiche dans la corbeille : " + error.message);
    else { setNotice("Fiche déplacée dans la corbeille. Ses données sont conservées."); await loadAll(); }
    setBusy(false);
  }

  async function archiveCycle(cycle) {
    if (!window.confirm(`Mettre l’élevage « ${cycle.name} » et ses bandes dans la corbeille ? Les données seront conservées et pourront être restaurées.`)) return;
    setBusy(true); setError("");
    const { error } = await supabase.rpc("gestfarm_archive_cycle", { p_cycle_id: cycle.id });
    if (error) setError("Impossible d’archiver cet élevage : " + error.message);
    else { setNotice("Élevage déplacé dans la corbeille."); await loadAll(); }
    setBusy(false);
  }

  async function archiveFarm(farm) {
    if (!window.confirm(`Attention : veux-tu vraiment placer toute l’exploitation « ${farm.name} » dans la corbeille ? Ses élevages et bandes seront également masqués, sans perdre leurs données.`)) return;
    if (!window.confirm(`Confirmer une dernière fois l’archivage de « ${farm.name} » ? Tu pourras restaurer toute l’exploitation depuis la corbeille.`)) return;
    setBusy(true); setError("");
    const { error } = await supabase.rpc("gestfarm_archive_farm", { p_farm_id: farm.id });
    if (error) setError("Impossible d’archiver cette exploitation : " + error.message);
    else { setNotice("Exploitation placée dans la corbeille. Tu pourras la restaurer."); await loadAll(); }
    setBusy(false);
  }

  async function restoreArchived(kind, item) {
    const config = { farm:["gestfarm_restore_farm","p_farm_id"], cycle:["gestfarm_restore_cycle","p_cycle_id"], group:["gestfarm_restore_group","p_group_id"] }[kind];
    if (!config) return;
    setBusy(true); setError("");
    const { error } = await supabase.rpc(config[0], { [config[1]]: item.id });
    if (error) setError("Restauration impossible : " + error.message);
    else { setNotice("Élément restauré avec ses données et son historique."); await loadAll(); }
    setBusy(false);
  }

  async function saveGroupAssignments(e) {
    e.preventDefault();
    if (!activeFarm || activeFarm.owner_id !== session?.user?.id) { setError("Seul le promoteur peut attribuer les élevages aux employés."); return; }
    setBusy(true); setError("");
    try {
      const group = groups.find(g => g.id === form.group_id);
      if (!group) throw new Error("Fiche d’élevage introuvable.");
      const current = groupAssignments.filter(a => a.group_id === group.id);
      const selected = Array.isArray(form.member_ids) ? form.member_ids : [];
      const toRemove = current.filter(a => !selected.includes(a.member_id));
      const toAdd = selected.filter(id => !current.some(a => a.member_id === id));
      for (const item of toRemove) {
        const { error } = await supabase.from("animal_group_assignments").delete().eq("id", item.id);
        if (error) throw error;
      }
      if (toAdd.length) {
        const { error } = await supabase.from("animal_group_assignments").insert(toAdd.map(member_id => ({ farm_id: activeFarm.id, group_id: group.id, member_id })));
        if (error) throw error;
      }
      setModal(""); setNotice("Les responsabilités de cet élevage ont été mises à jour."); await loadAll();
    } catch (err) { setError(err.message || "Impossible d’enregistrer les affectations."); }
    finally { setBusy(false); }
  }
  async function saveRabbitBreeder(e) {
    e.preventDefault();
    if (!activeFarm || !form.group_id) { setError("Choisis un élevage de lapins."); return; }
    const payload = {
      farm_id: activeFarm.id, group_id: form.group_id,
      breeder_code: form.breeder_code?.trim(), sex: form.sex,
      breed: form.breed?.trim() || null, birth_date: form.birth_date || null,
      estimated_age_months: form.estimated_age_months === "" || form.estimated_age_months == null ? null : Number(form.estimated_age_months),
      origin: form.origin || "born_on_farm", source_details: form.source_details?.trim() || null,
      offspring_batch_id: form.offspring_batch_id || null,
      acquired_at: form.acquired_at || null,
      acquisition_price: form.acquisition_price === "" || form.acquisition_price == null ? null : Number(form.acquisition_price),
      initial_weight_kg: form.initial_weight_kg === "" || form.initial_weight_kg == null ? null : Number(form.initial_weight_kg),
      body_condition: form.body_condition?.trim() || null,
      health_status: form.health_status || "good", status: form.status || "active", notes: form.notes?.trim() || null
    };
    if (!payload.breeder_code) { setError("Indique un identifiant unique pour ce reproducteur."); return; }
    if (!payload.sex) { setError("Précise le sexe du reproducteur."); return; }
    setBusy(true); setError("");
    const request = form.breeder_id
      ? supabase.from("rabbit_breeders").update(payload).eq("id", form.breeder_id)
      : supabase.from("rabbit_breeders").insert(payload);
    const { error } = await request;
    if (error) setError(error.message);
    else { setModal(""); setNotice(form.breeder_id ? "Fiche du reproducteur mise à jour." : "Reproducteur enregistré."); await loadAll(); }
    setBusy(false);
  }

  async function saveRabbitEvent(e) {
    e.preventDefault();
    if (!activeFarm || !form.group_id || !form.event_type) { setError("Complète le type d’événement et l’élevage concerné."); return; }
    const payload = {
      farm_id: activeFarm.id, group_id: form.group_id, event_type: form.event_type,
      event_date: form.event_date || today(), female_id: form.female_id || null, male_id: form.male_id || null,
      pregnancy_result: form.pregnancy_result || null,
      kits_total: form.kits_total === "" || form.kits_total == null ? null : Number(form.kits_total),
      kits_alive: form.kits_alive === "" || form.kits_alive == null ? null : Number(form.kits_alive),
      kits_stillborn: form.kits_stillborn === "" || form.kits_stillborn == null ? null : Number(form.kits_stillborn),
      kits_dead: form.kits_dead === "" || form.kits_dead == null ? null : Number(form.kits_dead),
      kits_weaned: form.kits_weaned === "" || form.kits_weaned == null ? null : Number(form.kits_weaned),
      weight_kg: form.weight_kg === "" || form.weight_kg == null ? null : Number(form.weight_kg),
      product_name: form.product_name?.trim() || null, dosage: form.dosage?.trim() || null,
      administration_route: form.administration_route || null, reason: form.reason?.trim() || null,
      next_due_date: form.next_due_date || null,
      expected_kindling_date: form.expected_kindling_date || (form.event_type === "mating" ? addDaysToDate(form.event_date || today(), 31) : null),
      outcome: form.outcome?.trim() || null, notes: form.notes?.trim() || null
    };
    if (payload.event_type === "mating" && (!payload.female_id || !payload.male_id)) { setError("Pour une saillie, sélectionne la lapine et le mâle."); return; }
    if (["pregnancy_check","kindling","weaning"].includes(payload.event_type) && !payload.female_id) { setError("Sélectionne la lapine concernée."); return; }
    if (payload.kits_alive != null && payload.kits_total != null && payload.kits_alive + (payload.kits_stillborn || 0) > payload.kits_total) { setError("Les lapereaux vivants et mort-nés ne peuvent pas dépasser le total né."); return; }
    if (payload.kits_weaned != null && payload.kits_alive != null && payload.kits_weaned > payload.kits_alive) { setError("Le nombre de lapereaux sevrés ne peut pas dépasser le nombre de nés vivants."); return; }
    if (payload.event_type === "weaning" && form.offspring_batch_id) {
      const batch = offspringBatches.find(b=>b.id===form.offspring_batch_id);
      if (!batch || Number(payload.kits_weaned || 0) < Number(batch.transferred_count || 0) + Number(batch.sold_count || 0)) { setError("Le nombre sevré ne peut pas être inférieur aux jeunes déjà transférés ou vendus."); return; }
    }
    setBusy(true); setError("");
    const request = form.event_id
      ? supabase.from("rabbit_reproduction_events").update(payload).eq("id", form.event_id).select().single()
      : supabase.from("rabbit_reproduction_events").insert(payload).select().single();
    const { data: savedEvent, error } = await request;
    if (error) setError(error.message);
    else {
      let batchWarning = "";
      if (payload.event_type === "kindling" && savedEvent) {
        const { error: batchError } = await supabase.from("gestfarm_offspring_batches").upsert({
          farm_id: activeFarm.id, species: "rabbits", source_group_id: form.group_id,
          female_id: payload.female_id, male_id: payload.male_id, birth_event_id: savedEvent.id,
          birth_date: payload.event_date, born_total: payload.kits_total || 0,
          born_alive: payload.kits_alive || 0, stillborn: payload.kits_stillborn || 0,
          updated_at: new Date().toISOString()
        }, { onConflict: "birth_event_id" });
        if (batchError) batchWarning = " L’événement est enregistré, mais la fiche de portée n’a pas pu être créée : " + batchError.message;
      }
      if (payload.event_type === "weaning" && form.offspring_batch_id) {
        const batch = offspringBatches.find(b=>b.id===form.offspring_batch_id);
        const { error: weanError } = await supabase.from("gestfarm_offspring_batches").update({
          weaned_count: Number(payload.kits_weaned || 0), updated_at: new Date().toISOString()
        }).eq("id", form.offspring_batch_id);
        if (weanError) batchWarning = " Le sevrage est enregistré, mais la fiche de portée n’a pas été actualisée : " + weanError.message;
      }
      setModal(""); setNotice((form.event_id ? "Événement reproductif modifié." : "Événement reproductif enregistré.") + batchWarning); await loadAll();
    }
    setBusy(false);
  }

  async function deleteRabbitEvent(event) {
    if (!window.confirm("Supprimer cet événement de l’historique reproductif ?")) return;
    setBusy(true); setError("");
    const { error } = await supabase.from("rabbit_reproduction_events").delete().eq("id", event.id);
    if (error) setError(error.message); else { setNotice("Événement supprimé."); await loadAll(); }
    setBusy(false);
  }

  async function savePigBreeder(e) {
    e.preventDefault();
    if (!activeFarm || !form.group_id) { setError("Choisis un élevage de porcs."); return; }
    const payload = {
      farm_id: activeFarm.id, group_id: form.group_id,
      breeder_code: form.breeder_code?.trim(), sex: form.sex,
      breed: form.breed?.trim() || null, birth_date: form.birth_date || null,
      estimated_age_months: form.estimated_age_months === "" || form.estimated_age_months == null ? null : Number(form.estimated_age_months),
      origin: form.origin || "born_on_farm", source_details: form.source_details?.trim() || null,
      offspring_batch_id: form.offspring_batch_id || null,
      acquired_at: form.acquired_at || null,
      acquisition_price: form.acquisition_price === "" || form.acquisition_price == null ? null : Number(form.acquisition_price),
      initial_weight_kg: form.initial_weight_kg === "" || form.initial_weight_kg == null ? null : Number(form.initial_weight_kg),
      body_condition: form.body_condition?.trim() || null,
      health_status: form.health_status || "good", status: form.status || "active", notes: form.notes?.trim() || null
    };
    if (!payload.breeder_code || !payload.sex) { setError("Indique un identifiant unique et le sexe du reproducteur."); return; }
    setBusy(true); setError("");
    const request = form.breeder_id
      ? supabase.from("pig_breeders").update(payload).eq("id", form.breeder_id)
      : supabase.from("pig_breeders").insert(payload);
    const { error } = await request;
    if (error) setError(error.message);
    else { setModal(""); setNotice(form.breeder_id ? "Fiche du reproducteur porcin mise à jour." : "Reproducteur porcin enregistré."); await loadAll(); }
    setBusy(false);
  }

  async function savePigEvent(e) {
    e.preventDefault();
    if (!activeFarm || !form.group_id || !form.event_type) { setError("Complète le type d’événement et l’élevage concerné."); return; }
    const numeric = key => form[key] === "" || form[key] == null ? null : Number(form[key]);
    const payload = {
      farm_id: activeFarm.id, group_id: form.group_id, event_type: form.event_type,
      event_date: form.event_date || today(), female_id: form.female_id || null, male_id: form.male_id || null,
      pregnancy_result: form.pregnancy_result || null,
      piglets_total: numeric("piglets_total"), piglets_alive: numeric("piglets_alive"),
      piglets_stillborn: numeric("piglets_stillborn"), piglets_mummified: numeric("piglets_mummified"),
      piglets_dead: numeric("piglets_dead"), piglets_weaned: numeric("piglets_weaned"),
      litter_weight_kg: numeric("litter_weight_kg"), avg_birth_weight_kg: numeric("avg_birth_weight_kg"),
      weight_kg: numeric("weight_kg"), product_name: form.product_name?.trim() || null,
      dosage: form.dosage?.trim() || null, administration_route: form.administration_route || null,
      reason: form.reason?.trim() || null, next_due_date: form.next_due_date || null,
      expected_farrowing_date: form.expected_farrowing_date || (form.event_type === "mating" ? addDaysToDate(form.event_date || today(), 114) : null),
      outcome: form.outcome?.trim() || null, notes: form.notes?.trim() || null
    };
    if (payload.event_type === "mating" && (!payload.female_id || !payload.male_id)) { setError("Pour une saillie, sélectionne la truie et le verrat."); return; }
    if (["pregnancy_check","farrowing","weaning"].includes(payload.event_type) && !payload.female_id) { setError("Sélectionne la truie concernée."); return; }
    if (payload.piglets_total != null && payload.piglets_alive != null && payload.piglets_alive + (payload.piglets_stillborn || 0) > payload.piglets_total) { setError("Les porcelets vivants et mort-nés ne peuvent pas dépasser le total né."); return; }
    if (payload.piglets_weaned != null && payload.piglets_alive != null && payload.piglets_weaned > payload.piglets_alive) { setError("Le nombre de porcelets sevrés ne peut pas dépasser le nombre de nés vivants."); return; }
    if (payload.event_type === "weaning" && form.offspring_batch_id) {
      const batch = offspringBatches.find(b=>b.id===form.offspring_batch_id);
      if (!batch || Number(payload.piglets_weaned || 0) < Number(batch.transferred_count || 0) + Number(batch.sold_count || 0)) { setError("Le nombre sevré ne peut pas être inférieur aux jeunes déjà transférés ou vendus."); return; }
    }
    setBusy(true); setError("");
    const request = form.event_id
      ? supabase.from("pig_reproduction_events").update(payload).eq("id", form.event_id).select().single()
      : supabase.from("pig_reproduction_events").insert(payload).select().single();
    const { data: savedEvent, error } = await request;
    if (error) setError(error.message);
    else {
      let batchWarning = "";
      if (payload.event_type === "farrowing" && savedEvent) {
        const { error: batchError } = await supabase.from("gestfarm_offspring_batches").upsert({
          farm_id: activeFarm.id, species: "pigs", source_group_id: form.group_id,
          female_id: payload.female_id, male_id: payload.male_id, birth_event_id: savedEvent.id,
          birth_date: payload.event_date, born_total: payload.piglets_total || 0,
          born_alive: payload.piglets_alive || 0, stillborn: payload.piglets_stillborn || 0,
          updated_at: new Date().toISOString()
        }, { onConflict: "birth_event_id" });
        if (batchError) batchWarning = " La mise bas est enregistrée, mais la fiche de portée n’a pas pu être créée : " + batchError.message;
      }
      if (payload.event_type === "weaning" && form.offspring_batch_id) {
        const { error: weanError } = await supabase.from("gestfarm_offspring_batches").update({
          weaned_count: Number(payload.piglets_weaned || 0), updated_at: new Date().toISOString()
        }).eq("id", form.offspring_batch_id);
        if (weanError) batchWarning = " Le sevrage est enregistré, mais la fiche de portée n’a pas été actualisée : " + weanError.message;
      }
      setModal(""); setNotice((form.event_id ? "Événement porcin modifié." : "Événement porcin enregistré.") + batchWarning); await loadAll();
    }
    setBusy(false);
  }

  async function deletePigEvent(event) {
    if (!window.confirm("Supprimer cet événement de l’historique reproductif porcin ?")) return;
    setBusy(true); setError("");
    const { error } = await supabase.from("pig_reproduction_events").delete().eq("id", event.id);
    if (error) setError(error.message); else { setNotice("Événement porcin supprimé."); await loadAll(); }
    setBusy(false);
  }

  async function saveRecord(e) {
    e.preventDefault(); setBusy(true);
    const payload = {
      farm_id: activeFarm.id, cycle_id: form.cycle_id, group_id: form.group_id || farmGroups.find(g => g.cycle_id === form.cycle_id)?.id || null,
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
  async function saveSale(e) {
    e.preventDefault();
    if (!canCreateSales) { setError("Tu n’as pas l’autorisation d’enregistrer des ventes."); return; }
    if (!activeFarm) { setError("Sélectionne une exploitation avant d’enregistrer une vente."); return; }
    const saleType = form.sale_type || "product";
    const quantity = Number(form.quantity);
    const unitPrice = Number(form.unit_price);
    if (!(quantity > 0) || !(unitPrice >= 0)) { setError("Vérifie la quantité et le prix unitaire."); return; }
    if (form.location_type !== "farm" && !form.location_name?.trim()) { setError("Précise le nom du dépôt, de la boutique ou de l’autre lieu de vente."); return; }
    const group = groups.find(g => g.id === form.group_id);
    const item = feedItems.find(i => i.id === form.feed_item_id);
    const batch = offspringBatches.find(b => b.id === form.offspring_batch_id);
    const rabbit = saleType === "breeder" && form.breeder_species === "rabbits" ? rabbitBreeders.find(b => b.id === form.breeder_id) : null;
    const pig = saleType === "breeder" && form.breeder_species === "pigs" ? pigBreeders.find(b => b.id === form.breeder_id) : null;
    const breeder = rabbit || pig;
    if (saleType === "animal_group" && (!group || quantity > Number(group.current_count || 0) || !Number.isInteger(quantity))) {
      setError("Choisis un lot valide et une quantité entière qui ne dépasse pas son effectif."); return;
    }
    if (saleType === "stock_item" && (!item || quantity > Number(item.quantity || 0))) { setError("La quantité vendue dépasse le stock disponible."); return; }
    if (saleType === "breeder" && (!breeder || quantity !== 1 || !["active","resting"].includes(breeder.status))) { setError("Sélectionne un reproducteur actif ou au repos. Une fiche individuelle correspond à un seul animal."); return; }
    if (saleType === "offspring_batch" && (!batch || !Number.isInteger(quantity) || quantity > Math.max(0, Number(batch.weaned_count || 0) - Number(batch.transferred_count || 0) - Number(batch.sold_count || 0)))) {
      setError("La quantité dépasse le nombre de jeunes sevrés encore disponibles dans cette portée."); return;
    }
    if (saleType === "breeder" && !(rabbit ? canUpdateRabbit : canUpdatePig)) { setError("Tu n’as pas l’autorisation de modifier le statut de ce reproducteur."); return; }
    if (saleType === "offspring_batch" && !(batch.species === "rabbits" ? canUpdateRabbit : canUpdatePig)) { setError("Tu n’as pas l’autorisation de mettre à jour cette portée."); return; }
    if (saleType === "animal_group" && !canEditElevages) { setError("Tu n’as pas l’autorisation de modifier l’effectif de cet élevage."); return; }
    if (saleType === "stock_item" && !canUpdateStocks) { setError("Tu dois disposer de l’autorisation de modification des stocks pour vendre un article provenant du stock."); return; }
    const productName = saleType === "animal_group" ? group.name : saleType === "stock_item" ? item.name : saleType === "breeder" ? `${rabbit ? "Lapin" : "Porc"} reproducteur ${breeder.breeder_code}` : saleType === "offspring_batch" ? `Portée ${batch.species === "rabbits" ? "lapins" : "porcs"} du ${dateLabel(batch.birth_date)}` : form.product_name?.trim();
    if (!productName) { setError("Indique le produit vendu."); return; }
    const unit = saleType === "animal_group" || saleType === "breeder" || saleType === "offspring_batch" ? "animal" : saleType === "stock_item" ? item.unit : (form.unit || "unité");
    const cycleId = saleType === "animal_group" ? group.cycle_id
      : saleType === "offspring_batch" ? groups.find(g=>g.id===batch.source_group_id)?.cycle_id
      : saleType === "breeder" ? groups.find(g=>g.id===breeder.group_id)?.cycle_id
      : (form.cycle_id || null);
    const groupId = saleType === "animal_group" ? group.id
      : saleType === "offspring_batch" ? batch.source_group_id
      : saleType === "breeder" ? breeder.group_id : null;
    setBusy(true); setError("");
    try {
      const { data: saleId, error } = await supabase.rpc("gestfarm_register_sale", {
        p_farm_id: activeFarm.id,
        p_sale_type: saleType,
        p_product_name: productName,
        p_quantity: quantity,
        p_unit: unit,
        p_unit_price: unitPrice,
        p_sale_date: form.sale_date || today(),
        p_location_type: form.location_type || "farm",
        p_location_name: form.location_name?.trim() || null,
        p_customer_name: form.customer_name?.trim() || null,
        p_payment_method: form.payment_method || null,
        p_notes: form.notes?.trim() || null,
        p_cycle_id: cycleId || null,
        p_group_id: groupId || null,
        p_feed_item_id: saleType === "stock_item" ? item.id : null,
        p_breeder_id: saleType === "breeder" ? breeder.id : null,
        p_breeder_species: saleType === "breeder" ? form.breeder_species : null,
        p_offspring_batch_id: saleType === "offspring_batch" ? batch.id : null
      });
      if (error) throw error;
      setModal(""); setNotice("Vente enregistrée. L’effectif ou le stock concerné a été actualisé et la recette ajoutée automatiquement aux finances."); await loadAll();
    } catch (err) {
      setError("Vente non enregistrée : " + (err.message || "vérifie les autorisations, l’effectif et le stock disponible."));
    } finally { setBusy(false); }
  }

  async function saveStockTransfer(e) {
    e.preventDefault();
    const source = feedItems.find(i=>i.id===form.source_feed_item_id);
    const quantity = Number(form.quantity);
    const destination = form.destination_location?.trim();
    if (!source || source.farm_id !== activeFarm?.id) { setError("Choisis un article de cette exploitation."); return; }
    if (!destination) { setError("Indique le lieu de destination (magasin, dépôt, boutique…)."); return; }
    if (destination.toLowerCase() === String(source.storage_location || "").trim().toLowerCase()) { setError("Le lieu de destination doit être différent du lieu de départ."); return; }
    if (!(quantity > 0) || quantity > Number(source.quantity || 0)) { setError("Quantité invalide ou supérieure au stock disponible."); return; }
    setBusy(true); setError("");
    const { error } = await supabase.rpc("gestfarm_transfer_stock", {
      p_farm_id: activeFarm.id,
      p_feed_item_id: source.id,
      p_quantity: quantity,
      p_destination_location: destination,
      p_transfer_date: form.transfer_date || today(),
      p_notes: form.notes?.trim() || null
    });
    if (error) setError("Transfert non enregistré : " + error.message);
    else { setModal(""); setNotice("Transfert interne enregistré. Le stock du lieu de départ et celui du lieu d’arrivée ont été actualisés sans créer de recette ni de dépense."); await loadAll(); }
    setBusy(false);
  }

  async function saveStockAllocation(e) {
    e.preventDefault();
    const item = farmFeed.find(x => x.id === form.feed_item_id);
    const quantity = Number(form.quantity);
    if (!item || !(quantity > 0) || quantity > Number(item.quantity || 0) || !form.group_id) { setError("Vérifie l’article, la bande et la quantité disponible."); return; }
    setBusy(true); setError("");
    const { error } = await supabase.rpc("gestfarm_allocate_stock", { p_farm_id: activeFarm.id, p_feed_item_id: item.id, p_group_id: form.group_id, p_quantity: quantity, p_minimum_quantity: Number(form.minimum_quantity || 0), p_assigned_member_id: form.assigned_member_id || null, p_allocation_date: form.date || today(), p_notes: form.notes?.trim() || null });
    if (error) setError("Affectation non enregistrée : " + error.message);
    else { setModal(""); setNotice("Stock affecté à la bande. Le stock central a été diminué automatiquement."); await loadAll(); }
    setBusy(false);
  }

  async function saveAllocatedConsumption(e) {
    e.preventDefault();
    const allocation = stockAllocations.find(x => x.id === form.allocation_id);
    const item = feedItems.find(x => x.id === allocation?.feed_item_id);
    const quantity = Number(form.quantity);
    const remaining = allocation ? Number(allocation.quantity_allocated) - Number(allocation.quantity_consumed) - Number(allocation.quantity_transferred_out) : 0;
    if (!allocation || !(quantity > 0) || quantity > remaining) { setError(`Quantité invalide. Reste disponible : ${remaining} ${item?.unit || ""}.`); return; }
    setBusy(true); setError("");
    const { error } = await supabase.rpc("gestfarm_consume_allocated_stock", { p_farm_id: activeFarm.id, p_allocation_id: allocation.id, p_quantity: quantity, p_movement_date: form.date || today(), p_notes: form.notes?.trim() || null });
    if (error) setError("Distribution non enregistrée : " + error.message);
    else { setModal(""); setNotice("Distribution enregistrée. Le stock affecté et le suivi technique ont été actualisés."); await loadAll(); }
    setBusy(false);
  }

  async function saveAllocatedTransfer(e) {
    e.preventDefault();
    const allocation = stockAllocations.find(x => x.id === form.allocation_id);
    const quantity = Number(form.quantity);
    const remaining = allocation ? Number(allocation.quantity_allocated) - Number(allocation.quantity_consumed) - Number(allocation.quantity_transferred_out) : 0;
    if (!allocation || !form.destination_group_id || !(quantity > 0) || quantity > remaining) { setError(`Vérifie la bande destinataire et la quantité. Reste disponible : ${remaining}.`); return; }
    setBusy(true); setError("");
    const { error } = await supabase.rpc("gestfarm_transfer_allocated_stock", { p_farm_id: activeFarm.id, p_source_allocation_id: allocation.id, p_destination_group_id: form.destination_group_id, p_quantity: quantity, p_assigned_member_id: form.assigned_member_id || null, p_transfer_date: form.date || today(), p_notes: form.notes?.trim() || null });
    if (error) setError("Réaffectation non enregistrée : " + error.message);
    else { setModal(""); setNotice("Stock restant réaffecté. Le solde des deux bandes a été actualisé sans double comptage."); await loadAll(); }
    setBusy(false);
  }

  async function saveAllocatedReplenishment(e) {
    e.preventDefault();
    const allocation = stockAllocations.find(x => x.id === form.allocation_id);
    const quantity = Number(form.quantity);
    const item = feedItems.find(x => x.id === allocation?.feed_item_id);
    if (!allocation || !(quantity > 0) || quantity > Number(item?.quantity || 0)) { setError("Quantité invalide ou stock central insuffisant."); return; }
    setBusy(true); setError("");
    const { error } = await supabase.rpc("gestfarm_replenish_allocated_stock", { p_farm_id: activeFarm.id, p_allocation_id: allocation.id, p_quantity: quantity, p_replenish_date: form.date || today(), p_notes: form.notes?.trim() || null });
    if (error) setError("Réapprovisionnement non enregistré : " + error.message);
    else { setModal(""); setNotice("Réapprovisionnement effectué. Le stock central et la réserve de la bande ont été actualisés."); await loadAll(); }
    setBusy(false);
  }

  async function saveOffspringDestination(e) {
    e.preventDefault();
    const batch = offspringBatches.find(b=>b.id===form.offspring_batch_id);
    if (!batch) { setError("Portée introuvable."); return; }
    setBusy(true); setError("");
    try {
      const patch = { destination_type: form.destination_type || "other", destination_notes: form.destination_notes?.trim() || null, updated_at: new Date().toISOString() };
      if (form.destination_type === "fattening") {
        const destination = groups.find(g=>g.id===form.destination_group_id);
        const quantity = Number(form.transfer_count);
        const available = Number(batch.weaned_count || 0) - Number(batch.transferred_count || 0) - Number(batch.sold_count || 0);
        const species = cycles.find(c=>c.id===destination?.cycle_id)?.species;
        if (!destination || species !== batch.species || destination.id === batch.source_group_id) throw new Error("Choisis un lot d’engraissement de la même espèce, différent du lot des reproducteurs.");
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > available) throw new Error(`Quantité invalide. Jeunes sevrés encore disponibles : ${Math.max(0,available)}.`);
        const { data: updatedDestination, error: destError } = await supabase.from("animal_groups").update({ current_count: Number(destination.current_count || 0) + quantity }).eq("id", destination.id).select("id").maybeSingle();
        if (destError) throw destError;
        if (!updatedDestination) throw new Error("L’effectif du lot de destination n’a pas pu être actualisé.");
        patch.transferred_count = Number(batch.transferred_count || 0) + quantity;
        patch.destination_group_id = destination.id;
        const { data: updatedBatch, error: batchError } = await supabase.from("gestfarm_offspring_batches").update(patch).eq("id", batch.id).select("id").maybeSingle();
        if (batchError || !updatedBatch) {
          await supabase.from("animal_groups").update({ current_count: Number(destination.current_count || 0) }).eq("id", destination.id);
          throw batchError || new Error("La fiche de portée n’a pas été mise à jour.");
        }
      } else {
        const { data: updatedBatch, error } = await supabase.from("gestfarm_offspring_batches").update(patch).eq("id", batch.id).select("id").maybeSingle();
        if (error) throw error;
        if (!updatedBatch) throw new Error("La fiche de portée n’a pas été mise à jour.");
      }
      setModal(""); setNotice(form.destination_type === "fattening" ? "Les jeunes ont été intégrés au lot d’engraissement sans être comptés comme de nouvelles naissances." : "Destination de la portée mise à jour. Les jeunes conservés pour la reproduction devront être identifiés individuellement dans les fiches reproducteurs."); await loadAll();
    } catch (err) { setError(err.message || "Impossible d’enregistrer la destination."); }
    finally { setBusy(false); }
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
  const teamModules = [
    ["elevages", "Gestion des élevages"], ["suivi", "Suivi technique"],
    ["sales", "Ventes"], ["finances", "Finances"], ["stocks", "Stocks"], ["equipe", "Équipe, tâches et absences"],
    ["historique", "Journal d’activité"]
  ];
  const permissionActions = [["read", "Consulter"], ["create", "Ajouter"], ["update", "Modifier"], ["delete", "Supprimer"]];
  const rolePresets = {
    promoter: { elevages:{read:true,create:true,update:true,delete:true}, suivi:{read:true,create:true,update:true,delete:true}, sales:{read:true,create:true,update:true,delete:true}, finances:{read:true,create:true,update:true,delete:true}, stocks:{read:true,create:true,update:true,delete:true}, equipe:{read:true,create:true,update:true,delete:true}, historique:{read:true} },
    manager: { elevages:{read:true,create:true,update:true,delete:false}, suivi:{read:true,create:true,update:true,delete:false}, sales:{read:true,create:true,update:true,delete:false}, finances:{read:true,create:true,update:true,delete:false}, stocks:{read:true,create:true,update:true,delete:false}, equipe:{read:true,create:true,update:true,delete:false}, historique:{read:true} },
    technician: { elevages:{read:true,create:false,update:false,delete:false}, suivi:{read:true,create:true,update:true,delete:false}, sales:{read:false,create:false,update:false,delete:false}, finances:{read:false,create:false,update:false,delete:false}, stocks:{read:true,create:false,update:false,delete:false}, equipe:{read:false,create:false,update:false,delete:false}, historique:{read:false} },
    employee: { elevages:{read:true,create:false,update:false,delete:false}, suivi:{read:true,create:true,update:false,delete:false}, sales:{read:false,create:false,update:false,delete:false}, finances:{read:false,create:false,update:false,delete:false}, stocks:{read:true,create:false,update:false,delete:false}, equipe:{read:false,create:false,update:false,delete:false}, historique:{read:false} },
    viewer: { elevages:{read:true}, suivi:{read:true}, sales:{read:true}, finances:{read:true}, stocks:{read:true}, equipe:{read:true}, historique:{read:true} },
    consultant: { elevages:{read:true}, suivi:{read:true}, sales:{read:false}, finances:{read:false}, stocks:{read:false}, equipe:{read:false}, historique:{read:true} }
  };
  function permissionsForRole(role) { return JSON.parse(JSON.stringify(rolePresets[role] || rolePresets.employee)); }
  async function saveMember(e) {
    e.preventDefault(); setBusy(true); setError("");
    const permissions = form.permissions || permissionsForRole(form.role || "employee");
    const payload = { farm_id: activeFarm.id, email: form.email.trim().toLowerCase(), full_name: form.full_name?.trim() || null, role: form.role || "employee", permissions, status: "pending", is_active: true };
    const request = form.member_id
      ? supabase.from("farm_members").update({ full_name: payload.full_name, role: payload.role, permissions: payload.permissions, is_active: form.is_active !== false, status: form.is_active === false ? "inactive" : (form.status || "pending"), updated_at: new Date().toISOString() }).eq("id", form.member_id)
      : supabase.from("farm_members").insert(payload);
    const { error } = await request;
    if (error) setError(error.message);
    else { setModal(""); setNotice(form.member_id ? "Autorisations du membre mises à jour." : "Fiche de membre préparée. Le compte de connexion devra être associé séparément."); await loadAll(); }
    setBusy(false);
  }
  async function saveAbsence(e) {
    e.preventDefault(); setBusy(true); setError("");
    const { error } = await supabase.from("farm_absences").insert({ farm_id: activeFarm.id, member_id: form.member_id, reason: form.reason?.trim() || null, start_date: form.start_date, end_date: form.end_date || null, status: "pending" });
    if (error) setError(error.message); else { setModal(""); setNotice("Absence enregistrée."); await loadAll(); }
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
  const rabbitGroups = farmGroupsForRabbit(groups, cycles, activeFarm?.id);
  const rabbitEventNames = {mating:"Saillie",pregnancy_check:"Contrôle de gestation",kindling:"Mise bas",weaning:"Sevrage",weight:"Pesée",health:"Observation sanitaire",vaccination:"Vaccination",treatment:"Traitement",observation:"Observation",status_change:"Changement de statut"};
  const selectedRabbitGroupId = rabbitGroups.some(g=>g.id===rabbitGroupFilter)?rabbitGroupFilter:(rabbitGroups[0]?.id||"");
  const selectedRabbitBreeders = rabbitBreeders.filter(b=>b.group_id===selectedRabbitGroupId);
  const selectedRabbitEvents = rabbitEvents.filter(ev=>ev.group_id===selectedRabbitGroupId);
  const pigGroups = farmGroupsForSpecies(groups, cycles, activeFarm?.id, "pigs");
  const pigEventNames = {mating:"Saillie / insémination",pregnancy_check:"Contrôle de gestation",farrowing:"Mise bas",weaning:"Sevrage",weight:"Pesée",health:"Observation sanitaire",vaccination:"Vaccination",treatment:"Traitement",observation:"Observation",status_change:"Changement de statut"};
  const selectedPigGroupId = pigGroups.some(g=>g.id===pigGroupFilter)?pigGroupFilter:(pigGroups[0]?.id||"");
  const selectedPigBreeders = pigBreeders.filter(b=>b.group_id===selectedPigGroupId);
  const selectedPigEvents = pigEvents.filter(ev=>ev.group_id===selectedPigGroupId);
  const farmGroups = groups.filter((x) => x.farm_id === activeFarm?.id);
  const farmGroupIds = farmGroups.map(g=>g.id);
  const farmRabbitBreeders = rabbitBreeders.filter(b=>farmGroupIds.includes(b.group_id));
  const farmPigBreeders = pigBreeders.filter(b=>farmGroupIds.includes(b.group_id));
  const isGlobalAdmin = (session?.user?.email || "").toLowerCase() === "valery.yacinthe@gmail.com";
  const farmSales = sales.filter(x => x.farm_id === activeFarm?.id);
  const farmOffspring = offspringBatches.filter(x => x.farm_id === activeFarm?.id);
  const farmTransfers = stockTransfers.filter(x => x.farm_id === activeFarm?.id);
  const farmAllocations = stockAllocations.filter(x => x.farm_id === activeFarm?.id);
  const farmAllocationMovements = allocationMovements.filter(x => x.farm_id === activeFarm?.id);
  const farmRecords = records.filter((x) => x.farm_id === activeFarm?.id);
  const farmTransactions = transactions.filter((x) => x.farm_id === activeFarm?.id);
  const farmFeed = feedItems.filter((x) => x.farm_id === activeFarm?.id);
  const farmFeedMovements = feedMovements.filter((x) => x.farm_id === activeFarm?.id);
  const selectedStock = farmFeed.find((x) => x.id === selectedStockId) || null;
  const visibleStock = farmFeed.filter((x) => `${x.name} ${x.description || ""} ${stockCategories[x.category] || ""}`.toLowerCase().includes(stockFilter.toLowerCase()));
  const stockLowCount = farmFeed.filter((x) => Number(x.quantity) <= Number(x.minimum_quantity || 0)).length;
  const expiringCount = farmFeed.filter((x) => x.expiry_date && new Date(`${x.expiry_date}T00:00:00`) <= new Date(Date.now() + 30 * 86400000)).length;
  const farmMembers = members.filter((x) => x.farm_id === activeFarm?.id);
  const isFarmOwner = !!activeFarm && activeFarm.owner_id === session?.user?.id;
  const currentFarmMember = farmMembers.find(m => m.user_id === session?.user?.id);
  const canCreateRabbit = isFarmOwner || !!currentFarmMember?.permissions?.suivi?.create;
  const canUpdateRabbit = isFarmOwner || !!currentFarmMember?.permissions?.suivi?.update;
  const canDeleteRabbit = isFarmOwner || !!currentFarmMember?.permissions?.suivi?.delete;
  const canCreatePig = canCreateRabbit;
  const canUpdatePig = canUpdateRabbit;
  const canDeletePig = canDeleteRabbit;
  const canCreateElevages = isFarmOwner || !!currentFarmMember?.permissions?.elevages?.create;
  const canEditElevages = isFarmOwner || !!currentFarmMember?.permissions?.elevages?.update;
  const canDeleteElevages = isFarmOwner || !!currentFarmMember?.permissions?.elevages?.delete;
  const canAssignElevages = isFarmOwner;
  const canCreateSales = isFarmOwner || !!currentFarmMember?.permissions?.sales?.create;
  const canCreateFinance = isFarmOwner || !!currentFarmMember?.permissions?.finances?.create;
  const canUpdateFinance = isFarmOwner || !!currentFarmMember?.permissions?.finances?.update;
  const canCreateStocks = isFarmOwner || !!currentFarmMember?.permissions?.stocks?.create;
  const canUpdateStocks = isFarmOwner || !!currentFarmMember?.permissions?.stocks?.update;
  const canConsumeAllocatedStock = isFarmOwner || !!currentFarmMember?.permissions?.stocks?.create || !!currentFarmMember?.permissions?.suivi?.create;
  const moduleForPage = { farms:"elevages", technical:"suivi", rabbits:"suivi", pigs:"suivi", finance:"finances", sales:"sales", stocks:"stocks", team:"equipe", tasks:"equipe", activity:"historique" };
  const visibleNav = nav.filter(([id]) => {
    if (id === "adminSuggestions") return isGlobalAdmin;
    if (!activeFarm || isFarmOwner || id === "suggestions") return true;
    const permissions = currentFarmMember?.permissions || {};
    if (id === "dashboard" || id === "reports") return ["elevages","suivi","finances","stocks"].some(k => permissions[k]?.read);
    const module = moduleForPage[id];
    return module ? !!permissions[module]?.read : false;
  });
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

  if (emailSent && !session) return <div style={styles.authPage}>
    <section style={{ ...styles.authCard, width: "min(100%, 540px)", minHeight: "65vh", alignContent: "center", textAlign: "center", padding: 34 }}>
      <div style={{ ...styles.logoMark, width: 68, height: 68, borderRadius: 20, margin: "0 auto" }}><MailCheck size={34}/></div>
      <h1 style={{ color: GREEN, fontSize: 30, lineHeight: 1.15, margin: "8px 0 0" }}>Vérifiez votre boîte e-mail !</h1>
      <p style={{ color: "#52645a", fontSize: 15, lineHeight: 1.6, margin: 0 }}>La demande de confirmation de votre compte GESTFARM a été envoyée à :</p>
      <p style={{ color: GREEN, fontSize: 17, fontWeight: 750, overflowWrap: "anywhere", margin: 0 }}>{emailSentAddress}</p>
      <div style={{ background: "#edf7ef", borderRadius: 12, padding: 16, textAlign: "left", color: "#34443a", fontSize: 14, lineHeight: 1.65 }}>
        <b>Pour activer votre compte :</b>
        <ol style={{ margin: "8px 0 0", paddingLeft: 20 }}>
          <li>Ouvrez votre boîte e-mail.</li>
          <li>Recherchez le message de confirmation envoyé par Supabase.</li>
          <li>Cliquez sur le lien de confirmation.</li>
          <li>Vous serez redirigé vers GESTFARM pour accéder à votre espace.</li>
        </ol>
      </div>
      <p style={{ color: "#718077", fontSize: 12, lineHeight: 1.5, margin: 0 }}>Vous ne voyez pas le message ? Vérifiez les courriers indésirables et patientez quelques minutes. Évitez de demander plusieurs envois successifs.</p>
      <Button onClick={() => { setEmailSent(false); setAuthMode("login"); setAuthError(""); setPassword(""); setPasswordConfirm(""); }}>Retour à la connexion</Button>
    </section>
  </div>;

  if (emailConfirmed && !session) return <div style={styles.authPage}>
    <section style={{ ...styles.authCard, width: "min(100%, 500px)", minHeight: "55vh", alignContent: "center", textAlign: "center", padding: 34 }}>
      <div style={{ ...styles.logoMark, width: 68, height: 68, borderRadius: 20, margin: "0 auto" }}><CheckCircle2 size={34}/></div>
      <h1 style={{ color: GREEN, fontSize: 29, margin: "8px 0 0" }}>Adresse e-mail confirmée !</h1>
      <p style={{ color: "#52645a", fontSize: 15, lineHeight: 1.6 }}>Votre adresse est validée. Votre compte GESTFARM est prêt : vous pouvez maintenant vous connecter.</p>
      <Button onClick={() => { setEmailConfirmed(false); setAuthMode("login"); setAuthError(""); }}>Se connecter</Button>
    </section>
  </div>;

  if (recoveryMode) return <div style={styles.authPage}>
    <form onSubmit={finishPasswordRecovery} style={styles.authCard}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={styles.logoMark}>G</div><h1 style={{ color: GREEN, margin: "10px 0 3px", fontSize: 27 }}>GESTFARM</h1>
        <div style={{ color: "#718077", fontSize: 12 }}>Réinitialisation du mot de passe</div>
        <p style={{ color: "#66746b", fontSize: 13, marginTop: 18 }}>Choisis un nouveau mot de passe personnel pour sécuriser ton compte.</p>
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        <Field label="Nouveau mot de passe"><input style={inputStyle} type="password" value={recoveryPassword} onChange={e=>setRecoveryPassword(e.target.value)} required minLength={8} autoComplete="new-password"/></Field>
        <Field label="Confirmer le nouveau mot de passe"><input style={inputStyle} type="password" value={recoveryPasswordConfirm} onChange={e=>setRecoveryPasswordConfirm(e.target.value)} required minLength={8} autoComplete="new-password"/></Field>
      </div>
      {authError && <p style={styles.error}>{authError}</p>}
      <Button type="submit" disabled={authBusy}>{authBusy ? "Modification…" : "Enregistrer le nouveau mot de passe"}</Button>
    </form>
  </div>;

  if (inviteSetup && session) return <div style={styles.authPage}>
    <form onSubmit={finishInvite} style={styles.authCard}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={styles.logoMark}>G</div><h1 style={{ color: GREEN, margin: "10px 0 3px", fontSize: 27 }}>GESTFARM</h1>
        <div style={{ color: "#718077", fontSize: 12 }}>Activation du compte employé</div>
        <p style={{ color: "#66746b", fontSize: 13, marginTop: 18 }}>Bienvenue ! Choisis maintenant ton mot de passe personnel.</p>
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        <Field label="Nouveau mot de passe"><input style={inputStyle} type="password" value={invitePassword} onChange={e=>setInvitePassword(e.target.value)} required minLength={8} autoComplete="new-password"/></Field>
        <Field label="Confirmer le mot de passe"><input style={inputStyle} type="password" value={invitePasswordConfirm} onChange={e=>setInvitePasswordConfirm(e.target.value)} required minLength={8} autoComplete="new-password"/></Field>
      </div>
      {authError && <p style={styles.error}>{authError}</p>}
      <Button type="submit" disabled={authBusy}>{authBusy ? "Activation…" : "Activer mon compte"}</Button>
    </form>
  </div>;

  if (!session) return <div style={styles.authPage}>
    <form onSubmit={authMode === "recovery" ? sendPasswordRecovery : authMode === "login" ? signIn : signUp} style={styles.authCard}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={styles.logoMark}>G</div><h1 style={{ color: GREEN, margin: "10px 0 3px", fontSize: 27 }}>GESTFARM</h1>
        <div style={{ color: "#718077", fontSize: 12 }}>by kenfack sobtia</div>
        <p style={{ color: "#66746b", fontSize: 13, marginTop: 18 }}>
          {authMode === "login" ? "Connecte-toi à ton espace de gestion." : authMode === "signup" ? "Crée ton compte GESTFARM." : "Saisis ton adresse e-mail pour recevoir un lien de réinitialisation."}
        </p>
      </div>
      {authMode === "signup" && <Field label="Nom complet"><input style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} required/></Field>}
      <div style={{ display: "grid", gap: 14 }}>
        <Field label="Adresse e-mail"><input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"/></Field>
        {authMode !== "recovery" && <Field label="Mot de passe">
          <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={authMode === "signup" ? 8 : undefined} autoComplete={authMode === "login" ? "current-password" : "new-password"}/>
          {authMode === "signup" && <small style={{ color: "#718077", fontSize: 12, lineHeight: 1.45 }}>Utilisez au moins 8 caractères. Vous pouvez combiner lettres, chiffres et symboles.</small>}
        </Field>}
        {authMode === "signup" && <Field label="Confirmer le mot de passe">
          <input style={inputStyle} type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required minLength={8} autoComplete="new-password" aria-invalid={passwordConfirm.length > 0 && password !== passwordConfirm}/>
          {passwordConfirm.length > 0 && password !== passwordConfirm && <small style={{ color: "#a33131", fontSize: 12 }}>Les deux mots de passe ne correspondent pas.</small>}
          {passwordConfirm.length > 0 && password === passwordConfirm && <small style={{ color: "#24734d", fontSize: 12 }}>Les mots de passe correspondent.</small>}
        </Field>}
      </div>
      {authError && <p style={styles.error}>{authError}</p>}
      <Button type="submit" disabled={authBusy || (authMode === "signup" && passwordConfirm.length > 0 && password !== passwordConfirm)}>
        {authBusy ? "Patiente…" : authMode === "login" ? "Se connecter" : authMode === "signup" ? "Créer mon compte" : "Envoyer le lien"}
      </Button>
      {authMode === "login" && <button type="button" onClick={() => { setAuthMode("recovery"); setAuthError(""); }} style={styles.linkButton}>Mot de passe oublié ?</button>}
      <button type="button" onClick={() => { setAuthMode(authMode === "signup" ? "login" : "signup"); setAuthError(""); setPasswordConfirm(""); }} style={styles.linkButton}>
        {authMode === "signup" ? "J’ai déjà un compte" : "Créer un compte"}
      </button>
      {authMode === "recovery" && <button type="button" onClick={() => { setAuthMode("login"); setAuthError(""); }} style={styles.linkButton}>Retour à la connexion</button>}
      <button type="button" onClick={() => setPrivacyOpen(true)} style={{ ...styles.linkButton, marginTop: 8 }}>Politique de confidentialité</button>
    </form>
    {privacyOpen && <div style={styles.overlay} onClick={() => setPrivacyOpen(false)}><section role="dialog" aria-modal="true" aria-label="Politique de confidentialité" className="gf-modal" style={{ ...styles.modal, maxHeight:"85vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><h2 style={{color:GREEN,margin:0}}>Politique de confidentialité</h2><button onClick={()=>setPrivacyOpen(false)} style={styles.iconButton} aria-label="Fermer"><X size={19}/></button></div><PrivacyText/><Button onClick={()=>setPrivacyOpen(false)}>Fermer</Button></section></div>}
  </div>;

  function renderContent() {
    if (!activeFarm && page !== "farms" && page !== "suggestions") return <div style={styles.panel}><Empty text="Commence par créer ton premier élevage dans « Mes élevages »."/></div>;
    if (page === "dashboard") return <>
      <SectionTitle title="Tableau de bord" subtitle={activeFarm ? `Vue d’ensemble — ${activeFarm.name}` : "Vue d’ensemble de ton activité"} action={<Button secondary onClick={loadAll}><RefreshCw size={15}/> Actualiser</Button>}/>
      <div style={styles.statsGrid}>
        <Card title="Fiches d’élevage" value={farmGroups.length} hint="Élevages suivis séparément" icon={Tractor}/>
        <Card title="Animaux présents" value={animals.toLocaleString("fr-FR")} hint="Effectif actuel des groupes" icon={Activity}/>
        <Card title="Recettes" value={money(income)} hint="Total des recettes enregistrées" icon={Wallet}/>
        <Card title="Dépenses" value={money(expenses)} hint="Total des dépenses enregistrées" icon={Package}/>
      </div>
      <div style={styles.twoCols}>
        <div style={styles.panel}><h3 style={styles.panelTitle}>Exploitations</h3>{farms.length ? farms.map((f) => <div key={f.id} style={styles.listRow}><div><b>{f.name}</b><div style={styles.muted}>{f.location || "Localisation non précisée"}</div></div><span style={styles.pill}>{groups.filter(g => g.farm_id === f.id).length} fiches</span></div>) : <Empty text="Aucune exploitation pour le moment."/>}</div>
        <div style={styles.panel}><h3 style={styles.panelTitle}>Activité récente</h3>{farmRecords.slice(0,5).length ? farmRecords.slice(0,5).map((r) => <div key={r.id} style={styles.listRow}><div><b>{recordNames[r.record_type] || r.record_type}</b><div style={styles.muted}>{r.notes || "Enregistrement technique"}</div></div><span style={styles.muted}>{dateLabel(r.record_date)}</span></div>) : <Empty text="Aucune donnée technique enregistrée."/>}</div>
      </div>
    </>;
    if (page === "farms") return <>
      <SectionTitle title="Mes élevages" subtitle="Chaque fiche représente un élevage distinct, avec son espèce, son effectif et ses responsables." action={canCreateElevages?<Button onClick={() => openModal("group", { species: "broilers", date: today(), count: "" })}><Plus size={16}/> Ajouter un élevage</Button>:null}/>
      {farms.length > 1 && <div style={{...styles.panel,marginBottom:14}}><Field label="Exploitation à consulter"><select style={inputStyle} value={activeFarm?.id||""} onChange={e=>setSelectedFarm(e.target.value)}>{farms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></Field></div>}
      {activeFarm && <div style={{fontSize:12,color:"#718077",marginBottom:14}}>Exploitation : <b style={{color:GREEN}}>{activeFarm.name}</b>{activeFarm.location?` · ${activeFarm.location}`:""}</div>}
      {!activeFarm ? <div style={styles.panel}><Empty text="Bienvenue ! Ajoute ton premier élevage. GESTFARM créera automatiquement ton espace d’exploitation : tu n’as pas besoin de créer un compte employé si tu travailles seul."/><div style={{display:"flex",justifyContent:"center",paddingBottom:18}}>{canCreateElevages&&<Button onClick={()=>openModal("group",{species:"broilers",date:today(),count:""})}><Plus size={16}/> Créer ma première fiche d’élevage</Button>}</div></div> : <>
        {farmGroups.length ? <div style={styles.cardsGrid}>{farmGroups.map(g=>{
          const cycle=farmCycles.find(c=>c.id===g.cycle_id);
          const assigned=groupAssignments.filter(a=>a.group_id===g.id).map(a=>farmMembers.find(m=>m.id===a.member_id)).filter(Boolean);
          return <div key={g.id} style={{...styles.panel,display:"grid",gap:12,border:"1px solid #e1eae3"}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}><div style={{minWidth:0}}><div style={{fontSize:11,color:ACCENT,fontWeight:750,textTransform:"uppercase",letterSpacing:.5}}>{speciesNames[cycle?.species]||"Élevage"}</div><h3 style={{margin:"5px 0",color:GREEN,fontSize:18,overflowWrap:"anywhere"}}>{g.name}</h3><div style={styles.muted}>{g.building_name?`Bâtiment : ${g.building_name} · `:""}{g.breed?`Race / souche : ${g.breed} · `:""}Début : {dateLabel(g.entry_date||cycle?.start_date)}</div></div><span style={styles.pill}>{cycle?.status==="completed"?"Terminé":cycle?.status==="cancelled"?"Annulé":"Actif"}</span></div>
            <div style={{background:"#f1f7f2",borderRadius:12,padding:14}}><div style={{fontSize:12,color:"#65736a"}}>Effectif actuel</div><div style={{fontSize:30,fontWeight:800,color:GREEN,lineHeight:1.2}}>{Number(g.current_count||0).toLocaleString("fr-FR")}</div><div style={{fontSize:11,color:"#7a877e",marginTop:3}}>Effectif initial : {Number(g.initial_count||0).toLocaleString("fr-FR")} animaux</div></div>
            <div style={{fontSize:12,color:"#65736a"}}><b>Responsables :</b> {assigned.length?assigned.map(m=>m.full_name||m.email).join(", "):"Aucun employé affecté — le promoteur peut gérer lui-même cet élevage."}</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {canEditElevages&&<Button secondary onClick={()=>openModal("group",{group_id:g.id,cycle_id:g.cycle_id,name:g.name,species:cycle?.species||"broilers",breed:g.breed||"",building_name:g.building_name||"",initial_count:g.initial_count,current_count:g.current_count,count:g.current_count,date:g.entry_date||cycle?.start_date||today()})}>Modifier</Button>}
              {canAssignElevages&&farmMembers.some(m=>m.is_active!==false)&&<Button secondary onClick={()=>openModal("assignments",{group_id:g.id,member_ids:assigned.map(m=>m.id)})}>Affecter les employés</Button>}
              {canDeleteElevages&&<Button secondary onClick={()=>deleteGroup(g)}><Trash2 size={14}/> Supprimer</Button>}
              {cycle?.status==="active"&&canEditElevages&&<Button secondary onClick={()=>updateCycle(cycle,"completed")}>Terminer l’élevage</Button>}{cycle&&canDeleteElevages&&<Button secondary onClick={()=>archiveCycle(cycle)}><Trash2 size={14}/> Supprimer cet élevage</Button>}
            </div>
          </div>;
        })}</div> : <div style={styles.panel}><Empty text="Aucune fiche d’élevage pour cette exploitation. Ajoute ta première activité : poulets de chair, poules pondeuses, lapins ou porcs."/></div>}
        <div style={{...styles.panel,marginTop:16}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}><div><h3 style={styles.panelTitle}>Organisation de l’exploitation</h3><p style={styles.muted}>Tu peux travailler seul ou ajouter des employés lorsque ton activité grandit.</p></div>{isFarmOwner&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Button secondary onClick={()=>openModal("farmEdit",{name:activeFarm.name,location:activeFarm.location||""})}>Modifier l’exploitation</Button><Button secondary onClick={()=>archiveFarm(activeFarm)}><Trash2 size={14}/> Supprimer l’exploitation</Button></div>}</div></div>
      </>}
      {(isFarmOwner||archivedFarms.length>0)&&<div style={{...styles.panel,marginTop:16}}><h3 style={styles.panelTitle}>Corbeille — récupération</h3><p style={styles.muted}>Les éléments supprimés restent conservés ici. Tu peux les restaurer avec leurs données et leur historique.</p>
        {archivedFarms.length>0&&<div style={{marginBottom:12}}><b>Exploitations</b>{archivedFarms.map(f=><div key={f.id} style={styles.listRow}><span>{f.name} · supprimée le {new Date(f.deleted_at).toLocaleDateString("fr-FR")}</span><Button secondary onClick={()=>restoreArchived("farm",f)}>Restaurer</Button></div>)}</div>}
        {activeFarm&&archivedCycles.filter(c=>c.farm_id===activeFarm.id&&!c.deleted_by_parent).length>0&&<div style={{marginBottom:12}}><b>Élevages</b>{archivedCycles.filter(c=>c.farm_id===activeFarm.id&&!c.deleted_by_parent).map(c=><div key={c.id} style={styles.listRow}><span>{c.name} · {speciesNames[c.species]||c.species}</span><Button secondary onClick={()=>restoreArchived("cycle",c)}>Restaurer</Button></div>)}</div>}
        {activeFarm&&archivedGroups.filter(g=>g.farm_id===activeFarm.id&&!g.deleted_by_parent).length>0&&<div><b>Bandes</b>{archivedGroups.filter(g=>g.farm_id===activeFarm.id&&!g.deleted_by_parent).map(g=><div key={g.id} style={styles.listRow}><span>{g.name}{g.building_name?` · ${g.building_name}`:""}</span><Button secondary onClick={()=>restoreArchived("group",g)}>Restaurer</Button></div>)}</div>}
        {!archivedFarms.length&&(!activeFarm||(!archivedCycles.some(c=>c.farm_id===activeFarm.id&&!c.deleted_by_parent)&&!archivedGroups.some(g=>g.farm_id===activeFarm.id&&!g.deleted_by_parent)))&&<div style={styles.muted}>La corbeille est vide.</div>}
      </div>}
    </>;
    if (page === "rabbits") return <>
      <SectionTitle title="Gestion individuelle des reproducteurs lapins" subtitle="Une fiche par animal, avec sa généalogie d’élevage, sa santé et son historique reproductif." action={<Button onClick={() => openModal("rabbitBreeder", { group_id: selectedRabbitGroupId, sex: "female", origin: "born_on_farm", status: "active", health_status: "good" })} disabled={!rabbitGroups.length || !canCreateRabbit}><Plus size={15}/> Ajouter un reproducteur</Button>}/>
      {!rabbitGroups.length ? <div style={styles.panel}><Empty text="Crée d’abord une fiche d’élevage de lapins dans « Mes élevages ». Les reproducteurs seront rattachés à cette fiche pour ne pas mélanger les lots."/></div> : <>
        <div style={{...styles.panel,marginBottom:14}}><div style={{fontSize:13,color:GREEN,fontWeight:700,marginBottom:8}}>Élevage cunicole concerné</div><select style={inputStyle} value={selectedRabbitGroupId} onChange={e=>setRabbitGroupFilter(e.target.value)}>{rabbitGroups.map(g=><option key={g.id} value={g.id}>{g.name} · {g.breed || "Race non précisée"}</option>)}</select><div style={styles.muted}>Les fiches et événements affichés ci-dessous concernent uniquement cet élevage.</div></div>
        <div style={styles.statsGrid}><Card title="Femelles" value={selectedRabbitBreeders.filter(b=>b.sex==="female").length} hint="Lapines enregistrées" icon={Activity}/><Card title="Mâles" value={selectedRabbitBreeders.filter(b=>b.sex==="male").length} hint="Mâles reproducteurs" icon={Activity}/><Card title="Actifs" value={selectedRabbitBreeders.filter(b=>b.status==="active").length} hint="Reproducteurs en activité" icon={CheckCircle2}/><Card title="Événements" value={selectedRabbitEvents.length} hint="Historique de l’élevage" icon={ClipboardList}/></div>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><Button secondary onClick={()=>openModal("rabbitEvent",{group_id:selectedRabbitGroupId,event_type:"mating",event_date:today()})} disabled={!selectedRabbitBreeders.length || !canCreateRabbit}><Plus size={15}/> Enregistrer un événement</Button></div>
        {selectedRabbitBreeders.length ? <div style={styles.cardsGrid}>{selectedRabbitBreeders.map(b=>{const history=selectedRabbitEvents.filter(ev=>ev.female_id===b.id||ev.male_id===b.id);const latest=history[0];const originBatch=farmOffspring.find(x=>x.id===b.offspring_batch_id);return <div key={b.id} style={{...styles.panel,display:"grid",gap:10}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><div><div style={{fontSize:11,color:ACCENT,fontWeight:750,textTransform:"uppercase"}}>{b.sex==="female"?"Femelle reproductrice":"Mâle reproducteur"}</div><h3 style={{margin:"4px 0",color:GREEN,fontSize:18}}>{b.breeder_code}</h3><div style={styles.muted}>{b.breed || "Race non précisée"} · {b.birth_date?`Né(e) le ${dateLabel(b.birth_date)}`:b.estimated_age_months!=null?`${b.estimated_age_months} mois (âge estimé)`:"Âge non précisé"}</div></div><span style={styles.pill}>{({active:"Actif",resting:"Au repos",culled:"Réformé",sold:"Vendu",dead:"Décédé"})[b.status]||b.status}</span></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}><div style={{background:"#f4f8f4",padding:9,borderRadius:8}}>Poids initial<br/><b>{b.initial_weight_kg?`${b.initial_weight_kg} kg`:"—"}</b></div><div style={{background:"#f4f8f4",padding:9,borderRadius:8}}>État sanitaire<br/><b>{{good:"Bon",to_monitor:"À surveiller",sick:"Malade",recovering:"En convalescence"}[b.health_status]||"—"}</b></div></div><div style={styles.muted}>Origine : {{born_on_farm:"Né sur l’exploitation",purchased:"Acheté",gift:"Don",other:"Autre"}[b.origin]||b.origin}{b.acquisition_price?` · Achat : ${money(b.acquisition_price)}`:""}{originBatch?` · Portée d’origine : ${dateLabel(originBatch.birth_date)}`:""}</div><div style={{fontSize:12,color:"#65736a"}}>Dernier événement : {latest?`${rabbitEventNames[latest.event_type]||latest.event_type} · ${dateLabel(latest.event_date)}`:"Aucun événement enregistré"}</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{canUpdateRabbit&&<Button secondary onClick={()=>openModal("rabbitBreeder",{breeder_id:b.id,group_id:b.group_id,breeder_code:b.breeder_code,sex:b.sex,breed:b.breed||"",birth_date:b.birth_date||"",estimated_age_months:b.estimated_age_months??"",origin:b.origin,source_details:b.source_details||"",offspring_batch_id:b.offspring_batch_id||"",acquired_at:b.acquired_at||"",acquisition_price:b.acquisition_price??"",initial_weight_kg:b.initial_weight_kg??"",body_condition:b.body_condition||"",health_status:b.health_status,status:b.status,notes:b.notes||""})}>Modifier la fiche</Button>}<Button secondary onClick={()=>openModal("rabbitEvent",{group_id:b.group_id,female_id:b.sex==="female"?b.id:"",male_id:b.sex==="male"?b.id:"",event_type:b.sex==="female"?"pregnancy_check":"weight",event_date:today()})} disabled={!canCreateRabbit}>Ajouter un suivi</Button><Button secondary onClick={()=>printBreederCard(b,"Lapin",history)}>Imprimer la fiche</Button><Button secondary onClick={()=>printBreederHistory(b,"Lapin",history)}>Imprimer l’historique</Button></div><div style={{borderTop:"1px solid #edf1ed",paddingTop:8}}><b style={{fontSize:12,color:GREEN}}>Historique récent ({history.length})</b>{history.slice(0,4).length?history.slice(0,4).map(ev=><div key={ev.id} style={{fontSize:11,color:"#65736a",paddingTop:6}}>{dateLabel(ev.event_date)} · {rabbitEventNames[ev.event_type]||ev.event_type}{ev.kits_total!=null?` · ${ev.kits_total} nés`:""}{ev.notes?` — ${ev.notes}`:""}</div>):<div style={styles.muted}>Aucun suivi individuel pour le moment.</div>}</div></div>})}</div> : <div style={styles.panel}><Empty text="Aucun reproducteur enregistré pour cet élevage. Ajoute la première fiche individuelle."/></div>}
        <div style={{...styles.panel,marginTop:16}}><h3 style={styles.panelTitle}>Historique des événements de reproduction</h3>{selectedRabbitEvents.length?<div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Date</th><th>Événement</th><th>Femelle</th><th>Mâle</th><th>Résultat / portée</th><th>Notes</th><th>Actions</th></tr></thead><tbody>{selectedRabbitEvents.map(ev=><tr key={ev.id}><td>{dateLabel(ev.event_date)}</td><td>{rabbitEventNames[ev.event_type]||ev.event_type}</td><td>{rabbitBreeders.find(x=>x.id===ev.female_id)?.breeder_code||"—"}</td><td>{rabbitBreeders.find(x=>x.id===ev.male_id)?.breeder_code||"—"}</td><td>{ev.event_type==="pregnancy_check"?({positive:"Gestante",negative:"Non gestante",uncertain:"Incertain"}[ev.pregnancy_result]||"—"):ev.kits_total!=null?`${ev.kits_total} nés · ${ev.kits_alive??"—"} vivants · ${ev.kits_stillborn??"—"} mort-nés · ${ev.kits_weaned??"—"} sevrés`:ev.weight_kg?`${ev.weight_kg} kg`:ev.expected_kindling_date?`Mise bas prévue : ${dateLabel(ev.expected_kindling_date)}`:ev.outcome||"—"}</td><td>{[ev.product_name,ev.dosage,ev.reason,ev.notes].filter(Boolean).join(" · ")||"—"}</td><td><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{canUpdateRabbit&&<Button secondary onClick={()=>openModal("rabbitEvent",{event_id:ev.id,group_id:ev.group_id,event_type:ev.event_type,event_date:ev.event_date,female_id:ev.female_id||"",male_id:ev.male_id||"",pregnancy_result:ev.pregnancy_result||"",kits_total:ev.kits_total??"",kits_alive:ev.kits_alive??"",kits_stillborn:ev.kits_stillborn??"",kits_dead:ev.kits_dead??"",kits_weaned:ev.kits_weaned??"",weight_kg:ev.weight_kg??"",product_name:ev.product_name||"",dosage:ev.dosage||"",administration_route:ev.administration_route||"",reason:ev.reason||"",next_due_date:ev.next_due_date||"",expected_kindling_date:ev.expected_kindling_date||"",outcome:ev.outcome||"",notes:ev.notes||""})}>Modifier</Button>}{canDeleteRabbit&&<Button secondary onClick={()=>deleteRabbitEvent(ev)}>Supprimer</Button>}</div></td></tr>)}</tbody></table></div>:<Empty text="Les saillies, contrôles de gestation, mises bas, sevrages et suivis sanitaires apparaîtront ici."/>}</div>
      </>}
         <div style={{...styles.panel,marginTop:16}}><h3 style={styles.panelTitle}>Portées et devenir des lapereaux</h3>{farmOffspring.filter(b=>b.species==="rabbits"&&b.source_group_id===selectedRabbitGroupId).length?<div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Naissance</th><th>Parents</th><th>Nés vivants</th><th>Sevrés</th><th>Transférés</th><th>Vendus</th><th>Destination</th><th>Action</th></tr></thead><tbody>{farmOffspring.filter(b=>b.species==="rabbits"&&b.source_group_id===selectedRabbitGroupId).map(b=><tr key={b.id}><td>{dateLabel(b.birth_date)}</td><td>Mère : {rabbitBreeders.find(x=>x.id===b.female_id)?.breeder_code||"—"} · Père : {rabbitBreeders.find(x=>x.id===b.male_id)?.breeder_code||"—"}</td><td>{b.born_alive}</td><td>{b.weaned_count}</td><td>{b.transferred_count}</td><td>{b.sold_count}</td><td>{{pending:"À orienter",fattening:"Engraissement",breeding:"Reproduction",sold:"Vente",other:"Autre"}[b.destination_type]||b.destination_type}</td><td>{(b.species==="rabbits"?canUpdateRabbit:canUpdatePig)&&canEditElevages&&<Button secondary onClick={()=>openModal("offspring",{offspring_batch_id:b.id,destination_type:"fattening",destination_group_id:b.destination_group_id||"",transfer_count:""})}>Orienter les jeunes</Button>}</td></tr>)}</tbody></table></div>:<Empty text="Les portées apparaîtront automatiquement après l’enregistrement d’une mise bas."/>}</div>
    </>;
    if (page === "pigs") return <>
      <SectionTitle title="Gestion individuelle des reproducteurs porcs" subtitle="Une fiche par animal, avec sa généalogie d’élevage, sa santé et son historique reproductif." action={<Button onClick={() => openModal("pigBreeder", { group_id: selectedPigGroupId, sex: "female", origin: "born_on_farm", status: "active", health_status: "good" })} disabled={!pigGroups.length || !canCreatePig}><Plus size={15}/> Ajouter un reproducteur</Button>}/>
      {!pigGroups.length ? <div style={styles.panel}><Empty text="Crée d’abord une fiche d’élevage de porcs dans « Mes élevages ». Les reproducteurs seront rattachés à cette fiche pour ne pas mélanger les lots."/></div> : <>
        <div style={{...styles.panel,marginBottom:14}}><div style={{fontSize:13,color:GREEN,fontWeight:700,marginBottom:8}}>Élevage porcin concerné</div><select style={inputStyle} value={selectedPigGroupId} onChange={e=>setPigGroupFilter(e.target.value)}>{pigGroups.map(g=><option key={g.id} value={g.id}>{g.name} · {g.breed || "Race non précisée"}</option>)}</select><div style={styles.muted}>Les fiches et événements affichés ci-dessous concernent uniquement cet élevage.</div></div>
        <div style={styles.statsGrid}><Card title="Truies" value={selectedPigBreeders.filter(b=>b.sex==="female").length} hint="Truies enregistrées" icon={Activity}/><Card title="Verrats" value={selectedPigBreeders.filter(b=>b.sex==="male").length} hint="Verrats reproducteurs" icon={Activity}/><Card title="Actifs" value={selectedPigBreeders.filter(b=>b.status==="active").length} hint="Reproducteurs en activité" icon={CheckCircle2}/><Card title="Événements" value={selectedPigEvents.length} hint="Historique de l’élevage" icon={ClipboardList}/></div>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><Button secondary onClick={()=>openModal("pigEvent",{group_id:selectedPigGroupId,event_type:"mating",event_date:today()})} disabled={!selectedPigBreeders.length || !canCreatePig}><Plus size={15}/> Enregistrer un événement</Button></div>
        {selectedPigBreeders.length ? <div style={styles.cardsGrid}>{selectedPigBreeders.map(b=>{const history=selectedPigEvents.filter(ev=>ev.female_id===b.id||ev.male_id===b.id);const latest=history[0];const originBatch=farmOffspring.find(x=>x.id===b.offspring_batch_id);return <div key={b.id} style={{...styles.panel,display:"grid",gap:10}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><div><div style={{fontSize:11,color:ACCENT,fontWeight:750,textTransform:"uppercase"}}>{b.sex==="female"?"Truie reproductrice":"Verrat reproducteur"}</div><h3 style={{margin:"4px 0",color:GREEN,fontSize:18}}>{b.breeder_code}</h3><div style={styles.muted}>{b.breed || "Race non précisée"} · {b.birth_date?`Né(e) le ${dateLabel(b.birth_date)}`:b.estimated_age_months!=null?`${b.estimated_age_months} mois (âge estimé)`:"Âge non précisé"}</div></div><span style={styles.pill}>{({active:"Actif",resting:"Au repos",culled:"Réformé",sold:"Vendu",dead:"Décédé"})[b.status]||b.status}</span></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}><div style={{background:"#f4f8f4",padding:9,borderRadius:8}}>Poids initial<br/><b>{b.initial_weight_kg?`${b.initial_weight_kg} kg`:"—"}</b></div><div style={{background:"#f4f8f4",padding:9,borderRadius:8}}>État sanitaire<br/><b>{{good:"Bon",to_monitor:"À surveiller",sick:"Malade",recovering:"En convalescence"}[b.health_status]||"—"}</b></div></div><div style={styles.muted}>Origine : {{born_on_farm:"Né sur l’exploitation",purchased:"Acheté",gift:"Don",other:"Autre"}[b.origin]||b.origin}{b.acquisition_price?` · Achat : ${money(b.acquisition_price)}`:""}{originBatch?` · Portée d’origine : ${dateLabel(originBatch.birth_date)}`:""}</div><div style={{fontSize:12,color:"#65736a"}}>Dernier événement : {latest?`${pigEventNames[latest.event_type]||latest.event_type} · ${dateLabel(latest.event_date)}`:"Aucun événement enregistré"}</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{canUpdatePig&&<Button secondary onClick={()=>openModal("pigBreeder",{breeder_id:b.id,group_id:b.group_id,breeder_code:b.breeder_code,sex:b.sex,breed:b.breed||"",birth_date:b.birth_date||"",estimated_age_months:b.estimated_age_months??"",origin:b.origin,source_details:b.source_details||"",offspring_batch_id:b.offspring_batch_id||"",acquired_at:b.acquired_at||"",acquisition_price:b.acquisition_price??"",initial_weight_kg:b.initial_weight_kg??"",body_condition:b.body_condition||"",health_status:b.health_status,status:b.status,notes:b.notes||""})}>Modifier la fiche</Button>}<Button secondary onClick={()=>openModal("pigEvent",{group_id:b.group_id,female_id:b.sex==="female"?b.id:"",male_id:b.sex==="male"?b.id:"",event_type:b.sex==="female"?"pregnancy_check":"weight",event_date:today()})} disabled={!canCreatePig}>Ajouter un suivi</Button><Button secondary onClick={()=>printBreederCard(b,"Porc",history)}>Imprimer la fiche</Button><Button secondary onClick={()=>printBreederHistory(b,"Porc",history)}>Imprimer l’historique</Button></div><div style={{borderTop:"1px solid #edf1ed",paddingTop:8}}><b style={{fontSize:12,color:GREEN}}>Historique récent ({history.length})</b>{history.slice(0,4).length?history.slice(0,4).map(ev=><div key={ev.id} style={{fontSize:11,color:"#65736a",paddingTop:6}}>{dateLabel(ev.event_date)} · {pigEventNames[ev.event_type]||ev.event_type}{ev.piglets_total!=null?` · ${ev.piglets_total} nés`:""}{ev.notes?` — ${ev.notes}`:""}</div>):<div style={styles.muted}>Aucun suivi individuel pour le moment.</div>}</div></div>})}</div> : <div style={styles.panel}><Empty text="Aucun reproducteur enregistré pour cet élevage. Ajoute la première fiche individuelle."/></div>}
        <div style={{...styles.panel,marginTop:16}}><h3 style={styles.panelTitle}>Historique des événements de reproduction</h3>{selectedPigEvents.length?<div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Date</th><th>Événement</th><th>Truie</th><th>Verrat</th><th>Résultat / portée</th><th>Notes</th><th>Actions</th></tr></thead><tbody>{selectedPigEvents.map(ev=><tr key={ev.id}><td>{dateLabel(ev.event_date)}</td><td>{pigEventNames[ev.event_type]||ev.event_type}</td><td>{pigBreeders.find(x=>x.id===ev.female_id)?.breeder_code||"—"}</td><td>{pigBreeders.find(x=>x.id===ev.male_id)?.breeder_code||"—"}</td><td>{ev.event_type==="pregnancy_check"?({positive:"Gestante",negative:"Non gestante",uncertain:"Incertain"}[ev.pregnancy_result]||"—"):ev.piglets_total!=null?`${ev.piglets_total} nés · ${ev.piglets_alive??"—"} vivants · ${ev.piglets_stillborn??"—"} mort-nés · ${ev.piglets_mummified??"—"} momifiés · ${ev.piglets_weaned??"—"} sevrés${ev.litter_weight_kg?` · portée ${ev.litter_weight_kg} kg`:""}`:ev.weight_kg?`${ev.weight_kg} kg`:ev.expected_farrowing_date?`Mise bas prévue : ${dateLabel(ev.expected_farrowing_date)}`:ev.outcome||"—"}</td><td>{[ev.product_name,ev.dosage,ev.reason,ev.notes].filter(Boolean).join(" · ")||"—"}</td><td><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{canUpdatePig&&<Button secondary onClick={()=>openModal("pigEvent",{event_id:ev.id,group_id:ev.group_id,event_type:ev.event_type,event_date:ev.event_date,female_id:ev.female_id||"",male_id:ev.male_id||"",pregnancy_result:ev.pregnancy_result||"",piglets_total:ev.piglets_total??"",piglets_alive:ev.piglets_alive??"",piglets_stillborn:ev.piglets_stillborn??"",piglets_dead:ev.piglets_dead??"",piglets_mummified:ev.piglets_mummified??"",litter_weight_kg:ev.litter_weight_kg??"",avg_birth_weight_kg:ev.avg_birth_weight_kg??"",piglets_weaned:ev.piglets_weaned??"",weight_kg:ev.weight_kg??"",expected_farrowing_date:ev.expected_farrowing_date||"",litter_weight_kg:ev.litter_weight_kg??"",avg_birth_weight_kg:ev.avg_birth_weight_kg??"",product_name:ev.product_name||"",dosage:ev.dosage||"",administration_route:ev.administration_route||"",reason:ev.reason||"",next_due_date:ev.next_due_date||"",expected_farrowing_date:ev.expected_farrowing_date||"",outcome:ev.outcome||"",notes:ev.notes||""})}>Modifier</Button>}{canDeletePig&&<Button secondary onClick={()=>deletePigEvent(ev)}>Supprimer</Button>}</div></td></tr>)}</tbody></table></div>:<Empty text="Les saillies, contrôles de gestation, mises bas, sevrages et suivis sanitaires apparaîtront ici."/>}</div>
      </>}
         <div style={{...styles.panel,marginTop:16}}><h3 style={styles.panelTitle}>Portées et devenir des porcelets</h3>{farmOffspring.filter(b=>b.species==="pigs"&&b.source_group_id===selectedPigGroupId).length?<div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Naissance</th><th>Parents</th><th>Nés vivants</th><th>Sevrés</th><th>Transférés</th><th>Vendus</th><th>Destination</th><th>Action</th></tr></thead><tbody>{farmOffspring.filter(b=>b.species==="pigs"&&b.source_group_id===selectedPigGroupId).map(b=><tr key={b.id}><td>{dateLabel(b.birth_date)}</td><td>Mère : {pigBreeders.find(x=>x.id===b.female_id)?.breeder_code||"—"} · Père : {pigBreeders.find(x=>x.id===b.male_id)?.breeder_code||"—"}</td><td>{b.born_alive}</td><td>{b.weaned_count}</td><td>{b.transferred_count}</td><td>{b.sold_count}</td><td>{{pending:"À orienter",fattening:"Engraissement",breeding:"Reproduction",sold:"Vente",other:"Autre"}[b.destination_type]||b.destination_type}</td><td>{(b.species==="rabbits"?canUpdateRabbit:canUpdatePig)&&canEditElevages&&<Button secondary onClick={()=>openModal("offspring",{offspring_batch_id:b.id,destination_type:"fattening",destination_group_id:b.destination_group_id||"",transfer_count:""})}>Orienter les jeunes</Button>}</td></tr>)}</tbody></table></div>:<Empty text="Les portées apparaîtront automatiquement après l’enregistrement d’une mise bas."/>}</div>
    </>;
    if (page === "technical") return <>
      <SectionTitle title="Suivi technique" subtitle="Enregistre les données quotidiennes de tes bandes et troupeaux." action={<Button onClick={() => openModal("record", { cycle_id: farmCycles.find(c=>c.status==="active")?.id || "", record_type: "observation" })} disabled={!farmCycles.length}><Plus size={15}/> Nouveau suivi</Button>}/>
      <div style={styles.panel}>{farmRecords.length ? <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Date</th><th>Type</th><th>Élevage</th><th>Quantité</th><th>Notes</th></tr></thead><tbody>{farmRecords.map(r=><tr key={r.id}><td>{dateLabel(r.record_date)}</td><td>{recordNames[r.record_type] || r.record_type}</td><td>{farmCycles.find(c=>c.id===r.cycle_id)?.name || "—"}</td><td>{r.quantity ?? "—"} {r.unit || ""}</td><td>{r.notes || "—"}</td></tr>)}</tbody></table></div> : <Empty text="Aucun suivi technique. Crée un cycle et un groupe, puis enregistre tes premières données."/>}</div>
    </>;
    if (page === "finance") return <>
      <SectionTitle title="Finances" subtitle="Suis les recettes, les dépenses et le solde de ton élevage." action={<Button onClick={() => openModal("transaction", { transaction_type: "expense" })}><Plus size={15}/> Nouvelle opération</Button>}/>
      <div style={styles.statsGrid}><Card title="Recettes" value={money(income)} icon={Wallet}/><Card title="Dépenses" value={money(expenses)} icon={Package}/><Card title="Solde" value={money(income-expenses)} hint="Recettes moins dépenses" icon={BarChart3}/></div>
      <div style={styles.panel}><div style={{ display: "flex", gap: 10, marginBottom: 12 }}><Search size={18} color="#718077"/><input style={{ ...inputStyle, maxWidth: 360 }} placeholder="Rechercher une opération…" value={filter} onChange={e=>setFilter(e.target.value)}/></div>
      {visibleTransactions.length ? <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Date</th><th>Type</th><th>Catégorie</th><th>Description</th><th>Montant</th></tr></thead><tbody>{visibleTransactions.map(t=>{const linkedSale=farmSales.find(x=>x.financial_transaction_id===t.id);return <tr key={t.id}><td>{dateLabel(t.transaction_date)}</td><td>{t.transaction_type==="revenue"?"Recette":"Dépense"}</td><td>{t.category}</td><td>{t.description || "—"}{linkedSale&&<div style={styles.muted}>Lieu : {linkedSale.location_type==="farm"?"À la ferme":linkedSale.location_type==="depot"?(linkedSale.location_name||"Dépôt / boutique"):(linkedSale.location_name||"Autre lieu")}</div>}</td><td style={{ fontWeight: 700 }}>{money(t.amount)}</td></tr>})}</tbody></table></div> : <Empty text="Aucune opération financière enregistrée."/>}</div>
    </>;
    if (page === "sales") return <>
      <SectionTitle title="Ventes et commercialisation" subtitle="Enregistre les ventes réalisées à la ferme, en dépôt, en boutique ou ailleurs. Chaque vente alimente automatiquement les recettes des finances." action={canCreateSales?<Button onClick={()=>openModal("sale",{sale_type:"product",sale_date:today(),location_type:"farm",quantity:"1",unit_price:""})}><Plus size={15}/> Enregistrer une vente</Button>:null}/>
      <div style={styles.statsGrid}><Card title="Ventes enregistrées" value={farmSales.length} icon={Wallet}/><Card title="Chiffre d’affaires" value={money(farmSales.reduce((n,x)=>n+Number(x.total_amount||0),0))} icon={BarChart3}/><Card title="Ventes à la ferme" value={farmSales.filter(x=>x.location_type==="farm").length} icon={Tractor}/><Card title="Ventes hors ferme" value={farmSales.filter(x=>x.location_type!=="farm").length} icon={Package}/></div>
      <div style={styles.panel}>{farmSales.length?<div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Date</th><th>Produit / animal</th><th>Quantité</th><th>Lieu</th><th>Client</th><th>Total</th></tr></thead><tbody>{farmSales.map(x=><tr key={x.id}><td>{dateLabel(x.sale_date)}</td><td>{x.product_name}</td><td>{Number(x.quantity).toLocaleString("fr-FR")} {x.unit}</td><td>{x.location_type==="farm"?"À la ferme":x.location_type==="depot"?(x.location_name||"Dépôt / boutique"):(x.location_name||"Autre lieu")}</td><td>{x.customer_name||"—"}</td><td><b>{money(x.total_amount)}</b></td></tr>)}</tbody></table></div>:<Empty text="Aucune vente enregistrée. Les ventes apparaîtront ici et dans les recettes du module Finances."/>}</div>
    </>;
    if (page === "stocks") return <>
      <SectionTitle title="Stocks" subtitle="Gère tous les aliments, matières premières, médicaments, équipements et fournitures." action={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button secondary onClick={() => openModal("transfer",{source_feed_item_id:farmFeed[0]?.id||"",destination_location:"",transfer_date:today()})} disabled={!farmFeed.length || !canCreateStocks || !canUpdateStocks}>Transfert interne</Button><Button secondary onClick={() => openModal("movement", { movement_type: "entry", feed_item_id: farmFeed[0]?.id || "" })} disabled={!farmFeed.length || !canCreateStocks}><Plus size={15}/> Mouvement</Button><Button secondary onClick={() => openModal("allocateStock", { feed_item_id:farmFeed[0]?.id||"", group_id:farmGroups[0]?.id||"", date:today() })} disabled={!farmFeed.length || !farmGroups.length || !canCreateStocks || !canUpdateStocks}>Affecter à une bande</Button><Button onClick={() => openModal("stock", { category: "feed", unit: "kg" })} disabled={!canCreateStocks}><Plus size={15}/> Nouvel article</Button></div>}/>
      <div style={styles.statsGrid}><Card title="Articles en stock" value={farmFeed.length} icon={Package}/><Card title="Stocks à réapprovisionner" value={stockLowCount} hint="Sous le seuil minimum" icon={AlertCircle}/><Card title="Dates à surveiller" value={expiringCount} hint="Périmés ou à moins de 30 jours" icon={CalendarDays}/></div>
      <div style={styles.panel}>
        <div style={{ display:"flex",gap:10,alignItems:"center",marginBottom:15,flexWrap:"wrap" }}><Search size={18} color="#718077"/><input style={{...inputStyle,maxWidth:390}} placeholder="Rechercher un article ou une catégorie…" value={stockFilter} onChange={e=>setStockFilter(e.target.value)}/></div>
        {visibleStock.length ? <div style={styles.cardsGrid}>{visibleStock.map(i=>{const low=Number(i.quantity)<=Number(i.minimum_quantity||0);const expired=i.expiry_date && new Date(`${i.expiry_date}T00:00:00`) < new Date();return <div key={i.id} style={{border:"1px solid #e7eee8",borderRadius:12,padding:15,background:"#fff",display:"grid",gap:9}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"start"}}><div><b style={{color:GREEN,fontSize:15}}>{i.name}</b><div style={styles.muted}>{stockCategories[i.category]||"Autres fournitures"}</div></div><span style={{...styles.pill,background:low?"#fff1e8":"#edf5ef",color:low?"#a54b16":GREEN}}>{low?"Stock bas":"Disponible"}</span></div><div style={{fontSize:22,fontWeight:750,color:GREEN}}>{Number(i.quantity).toLocaleString("fr-FR",{maximumFractionDigits:3})} <span style={{fontSize:13,fontWeight:500}}>{i.unit}</span></div>{stockEquivalent(i.quantity,i.unit)&&<div style={{fontSize:12,color:ACCENT,fontWeight:650}}>{stockEquivalent(i.quantity,i.unit)}</div>}<div style={styles.muted}>Seuil : {i.minimum_quantity||0} {i.unit} · Coût unitaire : {money(i.unit_cost)}</div>{i.package_size&&i.package_unit&&<div style={styles.muted}>1 {i.package_unit} = {i.package_size} {i.unit}</div>}{i.expiry_date&&<div style={{fontSize:12,color:expired?"#a33131":"#65736a"}}>Expiration : {dateLabel(i.expiry_date)}{expired?" · Périmé":""}</div>}<div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Button secondary onClick={()=>setSelectedStockId(selectedStockId===i.id?"":i.id)}>{selectedStockId===i.id?"Masquer les détails":"Voir les détails"}</Button><Button secondary onClick={()=>openModal("movement",{movement_type:"entry",feed_item_id:i.id,input_unit:i.package_unit||i.unit})}>Mouvement</Button></div></div>})}</div> : <Empty text="Aucun article ne correspond à cette recherche. Ajoute ton premier article."/>}
      </div>
      <div style={{...styles.panel,marginTop:16}}><SectionTitle title="Stocks affectés aux bandes" subtitle="Suis les quantités confiées à chaque bande, les distributions et les réserves restantes." />
        {farmAllocations.filter(a=>a.status==="active").length?<div style={styles.cardsGrid}>{farmAllocations.filter(a=>a.status==="active").map(a=>{const item=farmFeed.find(i=>i.id===a.feed_item_id);const group=farmGroups.find(g=>g.id===a.group_id);const cycle=cycles.find(c=>c.id===group?.cycle_id);const responsible=farmMembers.find(m=>m.id===a.assigned_member_id);const remaining=Math.max(0,Number(a.quantity_allocated)-Number(a.quantity_consumed)-Number(a.quantity_transferred_out));return <div key={a.id} style={{border:"1px solid #e4ece5",borderRadius:12,padding:14,display:"grid",gap:8}}><div><b style={{color:GREEN}}>{item?.name||"Article"}</b><div style={styles.muted}>{group?.name||"Bande archivée"} · {speciesNames[cycle?.species]||"Élevage"}{group?.building_name?` · ${group.building_name}`:""}</div></div><div style={{fontSize:12,color:"#65736a"}}>Responsable : <b>{responsible?.full_name||responsible?.email||"Promoteur / non attribué"}</b></div><div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,fontSize:12}}><div><span style={styles.muted}>Affecté</span><div><b>{Number(a.quantity_allocated).toLocaleString("fr-FR")} {item?.unit}</b></div></div><div><span style={styles.muted}>Distribué</span><div><b>{Number(a.quantity_consumed).toLocaleString("fr-FR")} {item?.unit}</b></div></div><div><span style={styles.muted}>Transféré</span><div><b>{Number(a.quantity_transferred_out).toLocaleString("fr-FR")} {item?.unit}</b></div></div><div><span style={styles.muted}>Reste disponible</span><div style={{color:remaining<=Number(a.minimum_quantity||0)?"#a54b16":GREEN}}><b>{remaining.toLocaleString("fr-FR")} {item?.unit}</b></div>{Number(a.minimum_quantity)>0&&<small style={{color:remaining<=Number(a.minimum_quantity)?"#a54b16":"#65736a"}}>Seuil : {a.minimum_quantity} {item?.unit}{remaining<=Number(a.minimum_quantity)?" · Réapprovisionnement conseillé":""}</small>}</div></div>{remaining>0&&<div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{canConsumeAllocatedStock&&<Button secondary onClick={()=>openModal("consumeAllocation",{allocation_id:a.id,quantity:"",date:today()})}>Enregistrer distribution</Button>}{canUpdateStocks&&<><Button secondary onClick={()=>openModal("transferAllocation",{allocation_id:a.id,destination_group_id:"",quantity:String(remaining),date:today()})}>Réaffecter le reste</Button><Button secondary onClick={()=>openModal("replenishAllocation",{allocation_id:a.id,quantity:"",date:today()})}>Réapprovisionner</Button></>}</div>}{farmAllocationMovements.filter(m=>m.allocation_id===a.id).length>0&&<details><summary style={{fontSize:12,color:ACCENT,cursor:"pointer"}}>Voir l’historique de cette réserve</summary><div style={{fontSize:11,color:"#65736a",marginTop:6}}>{farmAllocationMovements.filter(m=>m.allocation_id===a.id).slice(0,8).map(m=><div key={m.id}>{dateLabel(m.movement_date)} · {({allocation:"Affectation",consumption:"Distribution",transfer_out:"Transfert sortant",transfer_in:"Transfert entrant",replenishment:"Réapprovisionnement"})[m.movement_type]||m.movement_type} : {m.quantity} {item?.unit}</div>)}</div></details>}</div>})}</div>:<Empty text="Aucun stock n’est encore affecté à une bande. Le stock non affecté reste disponible dans le magasin central."/>}
      </div>
      {selectedStock&&<div style={{...styles.panel,marginTop:16}}><SectionTitle title={`Détails — ${selectedStock.name}`} subtitle={stockCategories[selectedStock.category]||"Article de stock"} action={<Button secondary onClick={()=>setSelectedStockId("")}>Fermer</Button>}/><div style={styles.formGrid}>{[
        {label:"Quantité disponible",value:`${Number(selectedStock.quantity||0).toLocaleString("fr-FR",{maximumFractionDigits:3})} ${selectedStock.unit||""}${stockEquivalent(selectedStock.quantity,selectedStock.unit)?` · ${stockEquivalent(selectedStock.quantity,selectedStock.unit)}`:""}`,show:selectedStock.quantity!==null&&selectedStock.quantity!==undefined},
        {label:"Seuil minimum",value:`${selectedStock.minimum_quantity} ${selectedStock.unit||""}`,show:Number(selectedStock.minimum_quantity)>0},
        {label:"Coût unitaire",value:money(selectedStock.unit_cost),show:Number(selectedStock.unit_cost)>0},
        {label:"Conditionnement",value:`1 ${selectedStock.package_unit} = ${selectedStock.package_size} ${selectedStock.unit||""}`,show:Boolean(selectedStock.package_unit)&&Number(selectedStock.package_size)>0},
        {label:"Fournisseur",value:selectedStock.supplier,show:Boolean(selectedStock.supplier?.trim())},
        {label:"Emplacement",value:selectedStock.storage_location,show:Boolean(selectedStock.storage_location?.trim())},
        {label:"Lot / numéro de série",value:selectedStock.lot_number,show:Boolean(selectedStock.lot_number?.trim())},
        {label:"Date d’expiration",value:dateLabel(selectedStock.expiry_date),show:Boolean(selectedStock.expiry_date)},
        {label:"État du matériel",value:selectedStock.item_condition,show:Boolean(selectedStock.item_condition)},
        {label:"Description",value:selectedStock.description,show:Boolean(selectedStock.description?.trim())}
      ].filter(field=>field.show).map(field=><div key={field.label}><b>{field.label}</b><div style={styles.muted}>{field.value}</div></div>)}</div><h3 style={{...styles.panelTitle,marginTop:22}}>Historique des mouvements</h3>{farmFeedMovements.filter(m=>m.feed_item_id===selectedStock.id).length?<div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Date</th><th>Opération</th><th>Quantité</th><th>Notes</th></tr></thead><tbody>{farmFeedMovements.filter(m=>m.feed_item_id===selectedStock.id).map(m=><tr key={m.id}><td>{dateLabel(m.movement_date)}</td><td>{m.movement_type==="entry"?"Entrée":m.movement_type==="loss"?"Perte":m.movement_type==="adjustment"?"Ajustement":"Sortie"}</td><td>{m.input_quantity??m.quantity} {m.input_unit||selectedStock.unit}</td><td>{m.notes||"—"}</td></tr>)}</tbody></table></div>:<Empty text="Aucun mouvement enregistré pour cet article."/>}</div>}
      <div style={{...styles.panel,marginTop:16}}><h3 style={styles.panelTitle}>Transferts internes récents</h3>{farmTransfers.length?<div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Date</th><th>De</th><th>Vers</th><th>Quantité</th></tr></thead><tbody>{farmTransfers.slice(0,20).map(t=><tr key={t.id}><td>{dateLabel(t.transfer_date)}</td><td>{t.source_location||"—"}</td><td>{t.destination_location}</td><td>{t.quantity} {t.unit}</td></tr>)}</tbody></table></div>:<Empty text="Aucun transfert interne enregistré."/>}</div>
       <div style={{...styles.panel,marginTop:16}}><h3 style={styles.panelTitle}>Mouvements récents de l’élevage</h3>{farmFeedMovements.length?<div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Date</th><th>Article</th><th>Opération</th><th>Quantité</th></tr></thead><tbody>{farmFeedMovements.slice(0,12).map(m=><tr key={m.id}><td>{dateLabel(m.movement_date)}</td><td>{farmFeed.find(i=>i.id===m.feed_item_id)?.name||"Article"}</td><td>{m.movement_type==="entry"?"Entrée":m.movement_type==="loss"?"Perte":m.movement_type==="adjustment"?"Ajustement":"Sortie"}</td><td>{m.input_quantity??m.quantity} {m.input_unit||farmFeed.find(i=>i.id===m.feed_item_id)?.unit||""}</td></tr>)}</tbody></table></div>:<Empty text="Les entrées, sorties et pertes apparaîtront ici."/>}</div>
    </>;
    if (page === "reports") return (() => {
      const inPeriod = (value) => (!reportStart || value >= reportStart) && (!reportEnd || value <= reportEnd);
      const reportCycles = reportCycleId ? farmCycles.filter(c => c.id === reportCycleId) : farmCycles;
      const cycleIds = reportCycles.map(c => c.id);
      const reportGroups = farmGroups.filter(g => cycleIds.includes(g.cycle_id));
      const reportAnimals = reportGroups.reduce((n, g) => n + Number(g.current_count || 0), 0);
      const reportRecords = farmRecords.filter(r => inPeriod(r.record_date) && (!reportCycleId || r.cycle_id === reportCycleId));
      const reportTransactions = farmTransactions.filter(t => inPeriod(t.transaction_date) && (!reportCycleId || t.cycle_id === reportCycleId || !t.cycle_id));
      const reportIncome = reportTransactions.filter(t => t.transaction_type === "revenue").reduce((n, t) => n + Number(t.amount || 0), 0);
      const reportExpenses = reportTransactions.filter(t => t.transaction_type === "expense").reduce((n, t) => n + Number(t.amount || 0), 0);
      const sumType = (type) => reportRecords.filter(r => r.record_type === type).reduce((n, r) => n + Number(r.quantity || 0), 0);
      const technicalTypes = [...new Set(reportRecords.map(r => r.record_type))].map(type => ({ type, count: reportRecords.filter(r => r.record_type === type).length, quantity: sumType(type), unit: reportRecords.find(r => r.record_type === type && r.unit)?.unit || "" }));
      const expenseCategories = Object.entries(reportTransactions.filter(t => t.transaction_type === "expense").reduce((acc, t) => { const key = t.category || "Sans catégorie"; acc[key] = (acc[key] || 0) + Number(t.amount || 0); return acc; }, {})).sort((a,b) => b[1]-a[1]);
      return <>
        <SectionTitle title="Rapports" subtitle="Analyse les résultats techniques et financiers de tes élevages." action={<Button secondary onClick={()=>window.print()}>Imprimer / PDF</Button>}/>
        <div style={{...styles.panel,marginBottom:16}}>
          <h3 style={styles.panelTitle}>Filtres du rapport</h3>
          <div style={styles.formGrid}>
            <Field label="Du"><input style={inputStyle} type="date" value={reportStart} max={reportEnd || undefined} onChange={e=>setReportStart(e.target.value)}/></Field>
            <Field label="Au"><input style={inputStyle} type="date" value={reportEnd} min={reportStart || undefined} onChange={e=>setReportEnd(e.target.value)}/></Field>
            <Field label="Élevage concerné"><select style={inputStyle} value={reportCycleId} onChange={e=>setReportCycleId(e.target.value)}><option value="">Tous les cycles</option>{farmCycles.map(c=><option key={c.id} value={c.id}>{c.name} — {speciesNames[c.species] || c.species}</option>)}</select></Field>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}><Button secondary onClick={()=>{setReportStart("");setReportEnd("");setReportCycleId("");}}>Réinitialiser les filtres</Button></div>
        </div>
        <div style={styles.statsGrid}>
          <Card title="Animaux actuellement présents" value={reportAnimals.toLocaleString("fr-FR")} hint={`${reportGroups.length} groupe(s) concerné(s)`} icon={Activity}/>
          <Card title="Recettes sur la période" value={money(reportIncome)} icon={Wallet}/>
          <Card title="Dépenses sur la période" value={money(reportExpenses)} icon={Package}/>
          <Card title="Solde de la période" value={money(reportIncome-reportExpenses)} hint="Recettes moins dépenses" icon={BarChart3}/>
        </div>
        <div style={styles.twoCols}>
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Répartition des animaux</h3>
            {Object.entries(speciesNames).map(([key,label])=>{const count=reportGroups.filter(g=>farmCycles.find(c=>c.id===g.cycle_id)?.species===key).reduce((n,g)=>n+Number(g.current_count||0),0);return <div key={key} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}><span>{label}</span><b>{count.toLocaleString("fr-FR")}</b></div><div style={{height:9,background:"#edf2ee",borderRadius:9,overflow:"hidden"}}><div style={{height:"100%",width:`${reportAnimals?count/reportAnimals*100:0}%`,background:ACCENT,borderRadius:9}}/></div></div>})}
          </div>
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>Indicateurs techniques</h3>
            <div style={styles.listRow}><span>Mortalités enregistrées</span><b>{sumType("mortality").toLocaleString("fr-FR")}</b></div>
            <div style={styles.listRow}><span>Aliments distribués</span><b>{sumType("feed").toLocaleString("fr-FR")} {reportRecords.find(r=>r.record_type==="feed"&&r.unit)?.unit||""}</b></div>
            <div style={styles.listRow}><span>Œufs enregistrés</span><b>{sumType("eggs").toLocaleString("fr-FR")}</b></div>
            <div style={styles.listRow}><span>Enregistrements techniques</span><b>{reportRecords.length}</b></div>
          </div>
        </div>
        <div style={{...styles.panel,marginTop:16}}>
          <h3 style={styles.panelTitle}>Dépenses par catégorie</h3>
          {expenseCategories.length ? expenseCategories.map(([category,amount])=><div key={category} style={{marginBottom:13}}><div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:13,marginBottom:5}}><span>{category}</span><b>{money(amount)}</b></div><div style={{height:8,background:"#edf2ee",borderRadius:8,overflow:"hidden"}}><div style={{height:"100%",width:`${reportExpenses?amount/reportExpenses*100:0}%`,background:ACCENT,borderRadius:8}}/></div></div>) : <Empty text="Aucune dépense sur la période sélectionnée."/>}
        </div>
        <div style={{...styles.panel,marginTop:16}}>
          <h3 style={styles.panelTitle}>Détail des suivis techniques</h3>
          {technicalTypes.length ? <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Indicateur</th><th>Nombre de saisies</th><th>Quantité cumulée</th></tr></thead><tbody>{technicalTypes.map(item=><tr key={item.type}><td>{recordNames[item.type]||item.type}</td><td>{item.count}</td><td>{item.quantity.toLocaleString("fr-FR")} {item.unit}</td></tr>)}</tbody></table></div> : <Empty text="Aucun suivi technique sur la période sélectionnée."/>}
        </div>
        <div style={{...styles.panel,marginTop:16}}>
          <h3 style={styles.panelTitle}>Opérations financières de la période</h3>
          {reportTransactions.length ? <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Date</th><th>Type</th><th>Catégorie</th><th>Description</th><th>Montant</th></tr></thead><tbody>{reportTransactions.map(t=><tr key={t.id}><td>{dateLabel(t.transaction_date)}</td><td>{t.transaction_type==="revenue"?"Recette":"Dépense"}</td><td>{t.category}</td><td>{t.description||"—"}</td><td>{money(t.amount)}</td></tr>)}</tbody></table></div> : <Empty text="Aucune opération financière sur la période sélectionnée."/>}
        </div>
      </>;
    })();
    if (page === "team") return <>
      <SectionTitle title="Équipe et autorisations" subtitle="Prépare les membres et règle leurs accès pour cet élevage." action={isFarmOwner?<Button onClick={()=>openModal("member", { role:"employee", permissions:permissionsForRole("employee") })}><Plus size={15}/> Ajouter un membre</Button>:null}/>
      <div style={styles.panel}>
        <div style={{fontSize:12,color:"#718077",marginBottom:14}}>{isFarmOwner?"Ajoute les membres, attribue leurs permissions et envoie leurs invitations. Le promoteur reste le seul à pouvoir modifier les autorisations.":"Consulte les membres de cette exploitation. Seul le promoteur peut modifier les accès et les permissions."}</div>
        {farmMembers.length ? <div style={styles.cardsGrid}>{farmMembers.map(m=><div key={m.id} style={{border:"1px solid #e7eee8",borderRadius:12,padding:15,display:"grid",gap:9}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"start"}}><div><b style={{color:GREEN}}>{m.full_name||m.email}</b><div style={styles.muted}>{m.email}</div></div><span style={styles.pill}>{m.user_id?"Invitation envoyée / compte associé":(m.status==="inactive"?"Désactivé":"À inviter")}</span></div>
          <div style={{fontSize:13}}>Rôle : <b>{({promoter:"Promoteur",manager:"Responsable de ferme",technician:"Technicien",employee:"Employé",viewer:"Consultation",consultant:"Consultant"})[m.role]||m.role||"Employé"}</b></div>
          <div style={styles.muted}>{Object.entries(m.permissions||{}).filter(([,a])=>Object.values(a||{}).some(Boolean)).map(([k])=>({elevages:"Élevages",suivi:"Suivi technique",finances:"Finances",stocks:"Stocks",equipe:"Équipe",historique:"Journal d’activité"})[k]||k).join(" · ")||"Aucun accès défini"}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{isFarmOwner&&<><Button secondary onClick={()=>openModal("member",{member_id:m.id,email:m.email,full_name:m.full_name||"",role:m.role||"employee",permissions:m.permissions||permissionsForRole(m.role||"employee"),is_active:m.is_active,status:m.status})}>Gérer les accès</Button>{!m.user_id&&m.is_active&&<Button onClick={()=>sendMemberInvite(m)} disabled={busy}>Envoyer l’invitation</Button>}<Button secondary onClick={async()=>{const next=!m.is_active;const {error}=await supabase.from("farm_members").update({is_active:next,status:next?(m.user_id?"active":"pending"):"inactive",updated_at:new Date().toISOString()}).eq("id",m.id);if(error)setError(error.message);else{setNotice(next?"Membre réactivé.":"Accès du membre désactivé.");await loadAll();}}}>{m.is_active?"Désactiver":"Réactiver"}</Button></>}</div>
        </div>)}</div> : <Empty text="Aucun membre enregistré. Ajoute une fiche pour préparer ses autorisations."/>}
      </div>
    </>;
    if (page === "tasks") return <>
      <SectionTitle title="Tâches et absences" subtitle="Organise les tâches et consulte les absences enregistrées." action={<div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Button secondary onClick={()=>openModal("absence",{start_date:today()})} disabled={!farmMembers.length}><Plus size={15}/> Déclarer une absence</Button><Button onClick={()=>openModal("task")}><Plus size={15}/> Nouvelle tâche</Button></div>}/>
      <div style={styles.twoCols}><div style={styles.panel}><h3 style={styles.panelTitle}>Tâches</h3>{farmTasks.length?farmTasks.map(t=><div key={t.id} style={styles.listRow}><div><b>{t.title}</b><div style={styles.muted}>{t.description||"Sans description"}</div></div><select value={t.status||"pending"} onChange={e=>updateTask(t,e.target.value)} style={{...inputStyle,width:130}}><option value="pending">En attente</option><option value="in_progress">En cours</option><option value="completed">Terminée</option><option value="cancelled">Annulée</option></select></div>):<Empty text="Aucune tâche enregistrée."/>}</div>
      <div style={styles.panel}><h3 style={styles.panelTitle}>Absences</h3>{farmAbsences.length?farmAbsences.map(a=><div key={a.id} style={styles.listRow}><div><b>{farmMembers.find(m=>m.id===a.member_id)?.full_name||farmMembers.find(m=>m.id===a.member_id)?.email||"Membre"}</b><div style={styles.muted}>{a.reason||"Motif non précisé"}</div></div><span style={styles.muted}>{dateLabel(a.start_date)} – {dateLabel(a.end_date)}</span></div>):<Empty text="Aucune absence enregistrée."/>}</div></div>
    </>;
    if (page === "suggestions" || page === "adminSuggestions") return <>
      <SectionTitle title={page==="adminSuggestions"?"Administration générale — retours utilisateurs":"Boîte à suggestions"} subtitle={isGlobalAdmin?"Vue globale des retours accessibles à l’administration GESTFARM. Les promoteurs ne voient que les retours de leurs exploitations.":isFarmOwner?"Tu consultes ici les suggestions envoyées par les membres de ton exploitation.":"Tes retours sont associés à ton compte et à l’exploitation sélectionnée."} action={<Button secondary onClick={loadSuggestions}><RefreshCw size={15}/> Actualiser</Button>}/>
      {page==="adminSuggestions" && isGlobalAdmin && <div style={{...styles.panel,marginBottom:14}}><b>Administration globale</b><p style={styles.muted}>Les retours sont identifiés par compte, rôle et exploitation. Les droits de lecture sont également contrôlés par Supabase.</p><Button secondary onClick={()=>{const body=suggestionRows.map(r=>`[${r.created_at?new Date(r.created_at).toLocaleDateString("fr-FR"):""}] ${r.farm_name||"Sans exploitation"} — ${r.author_name||r.user_email||"Utilisateur"} (${r.author_role||"user"})\n${r.subject}\n${r.message}\nStatut : ${r.status}\n`).join("\n---\n");window.location.href=`mailto:valery.yacinthe@gmail.com?subject=${encodeURIComponent("GESTFARM — synthèse des suggestions")}&body=${encodeURIComponent(body)}`;}}>Préparer un e-mail récapitulatif</Button></div>}
      <div style={styles.twoCols}>
        {page==="suggestions" && <form style={styles.panel} onSubmit={submitSuggestion}>
          <h3 style={styles.panelTitle}>Envoyer un retour</h3>
          <div style={{display:"grid",gap:13}}>
            <Field label="Type de retour"><select style={inputStyle} value={suggestionCategory} onChange={e=>setSuggestionCategory(e.target.value)}><option value="suggestion">Suggestion d’amélioration</option><option value="bug">Signaler un problème</option><option value="question">Question</option><option value="observation">Observation technique</option><option value="recommendation">Recommandation du consultant</option><option value="privacy">Confidentialité / données personnelles</option><option value="other">Autre</option></select></Field>
            <Field label="Sujet"><input style={inputStyle} value={suggestionSubject} onChange={e=>setSuggestionSubject(e.target.value)} minLength={3} maxLength={120} required placeholder="Résume ton retour en quelques mots"/></Field>
            <Field label="Message"><textarea style={{...inputStyle,minHeight:130,resize:"vertical"}} value={suggestionMessage} onChange={e=>setSuggestionMessage(e.target.value)} minLength={10} maxLength={3000} required placeholder="Décris ton idée ou le problème rencontré…"/></Field>
            <div style={styles.muted}>N’indique jamais ton mot de passe ni des informations personnelles sensibles dans ce message.</div>
            {suggestionError && <p style={styles.error}>{suggestionError}</p>}
            <Button type="submit" disabled={suggestionBusy}>{suggestionBusy ? "Envoi…" : "Envoyer mon retour"}</Button>
          </div>
        </form>}
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>{page==="adminSuggestions"?"Toutes les suggestions":"Retours accessibles"}</h3>
          {suggestionRows.length ? suggestionRows.map(row=><div key={row.id} style={{padding:"12px 0",borderBottom:"1px solid #eff3ef"}}><div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><b style={{fontSize:13}}>{row.subject}</b><span style={styles.pill}>{({new:"Reçu",in_review:"En cours d’examen",planned:"Planifié",resolved:"Résolu",closed:"Clôturé"})[row.status] || "Reçu"}</span></div><div style={styles.muted}>{({suggestion:"Suggestion",bug:"Problème",question:"Question",observation:"Observation technique",recommendation:"Recommandation du consultant",privacy:"Confidentialité",other:"Autre"})[row.category] || row.category} · {new Date(row.created_at).toLocaleDateString("fr-FR")}</div><div style={styles.muted}>Auteur : {row.author_name||row.user_email||"Compte utilisateur"} · Rôle : {row.author_role||"Utilisateur"} · Exploitation : {row.farm_name||"Non précisée"} · Promoteur : {row.farm_owner_email||"—"}</div><p style={{fontSize:13,whiteSpace:"pre-wrap",marginBottom:8}}>{row.message}</p>{(isGlobalAdmin || isFarmOwner) && <Field label="État du traitement"><select style={{...inputStyle,maxWidth:230}} value={row.status||"new"} onChange={e=>updateSuggestionStatus(row,e.target.value)}><option value="new">Nouveau / reçu</option><option value="in_review">En cours d’examen</option><option value="planned">Amélioration planifiée</option><option value="resolved">Traité / résolu</option><option value="closed">Clôturé</option></select></Field>}</div>) : <Empty text="Aucun retour accessible pour le moment."/>}
        </div>
      </div>
    </>;
    if (page === "activity") return <>
      <SectionTitle title="Journal d’activité" subtitle="Historique automatique des opérations effectuées dans la base de données."/>
      <div style={styles.panel}>{farmLogs.length?<div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Date et heure</th><th>Action</th><th>Élément concerné</th><th>Où ?</th><th>Qui ?</th><th>Détail</th></tr></thead><tbody>{farmLogs.map(l=>{const d=l.new_data||l.old_data||{};const allGroups=[...groups,...archivedGroups];const allCycles=[...cycles,...archivedCycles];const alloc=[...stockAllocations].find(a=>a.id===(d.id||l.record_id))||[...stockAllocations].find(a=>a.id===d.allocation_id);const group=allGroups.find(g=>g.id===(d.group_id|| (l.table_name==="animal_groups"?l.record_id:null) || alloc?.group_id));const cycle=allCycles.find(c=>c.id===(d.cycle_id||(l.table_name==="production_cycles"?l.record_id:null)||group?.cycle_id));const contextualGroup=group||allGroups.find(g=>g.cycle_id===cycle?.id);const farmRow=[...farms,...archivedFarms].find(f=>f.id===l.farm_id);const farmName=[farmRow?.name,farmRow?.location].filter(Boolean).join(" · ")||"Exploitation";const stockItem=feedItems.find(i=>i.id===(d.feed_item_id||alloc?.feed_item_id));const member=farmMembers.find(m=>m.user_id===l.actor_id);const actor=l.actor_id===activeFarm?.owner_id?"Promoteur":(member?.full_name||member?.email||"Utilisateur");const tableLabels={farms:"Exploitation",production_cycles:"Élevage / cycle",animal_groups:"Bande",daily_records:"Suivi technique",feed_items:"Article de stock",feed_movements:"Mouvement de stock",gestfarm_stock_allocations:"Affectation de stock",gestfarm_stock_allocation_movements:"Mouvement de stock affecté",financial_transactions:"Finance",gestfarm_sales:"Vente"};const actionLabels={INSERT:"Création",UPDATE:"Modification",DELETE:"Suppression / archivage"};const location=[farmName,contextualGroup?.building_name?`Bâtiment ${contextualGroup.building_name}`:null,contextualGroup?.name||cycle?.name||null,stockItem?.storage_location?`Emplacement ${stockItem.storage_location}`:null,d.source_location?`De ${d.source_location}`:null,d.destination_location?`Vers ${d.destination_location}`:null].filter(Boolean).join(" · ");const detail=Object.entries(d).filter(([k,v])=>["name","quantity","quantity_allocated","quantity_consumed","quantity_transferred_out","status","record_type","notes","building_name","product_name","sale_type","movement_type","category"].includes(k)&&v!==null&&v!=="").map(([k,v])=>`${({name:"Nom",quantity:"Quantité",quantity_allocated:"Affecté",quantity_consumed:"Consommé",quantity_transferred_out:"Transféré",status:"Statut",record_type:"Suivi",notes:"Note",building_name:"Bâtiment",product_name:"Produit",sale_type:"Type de vente",movement_type:"Mouvement",category:"Catégorie"})[k]||k} : ${v}`).join(" · ");return <tr key={l.id}><td>{new Date(l.created_at).toLocaleString("fr-FR")}</td><td>{actionLabels[l.action]||l.action}</td><td>{tableLabels[l.table_name]||l.table_name}</td><td>{location||farmName}</td><td>{actor}</td><td>{detail||`Référence : ${l.record_id||"—"}`}</td></tr>})}</tbody></table></div>:<Empty text="Aucune activité enregistrée pour le moment."/>}</div>
    </>;
    return null;
  }

  const modalContent = (() => {
    const farmSelect = <Field label="Fiche d’élevage concernée"><select style={inputStyle} value={form.cycle_id||""} onChange={e=>{set("cycle_id",e.target.value);set("group_id",farmGroups.find(g=>g.cycle_id===e.target.value)?.id||"");}} required><option value="">Choisir un élevage</option>{farmCycles.filter(c=>c.status==="active").map(c=><option key={c.id} value={c.id}>{speciesNames[c.species]||c.species} — {c.name}</option>)}</select></Field>;
    if (modal==="farmEdit") return modalForm("Modifier l’exploitation",async e=>{e.preventDefault();setBusy(true);const {error}=await supabase.from("farms").update({name:form.name?.trim(),location:form.location?.trim()||null}).eq("id",activeFarm.id);if(error)setError(error.message);else{setModal("");setNotice("Informations de l’exploitation modifiées.");await loadAll();}setBusy(false);},<div style={styles.formGrid}><Field label="Nom de l’exploitation"><input style={inputStyle} value={form.name||""} onChange={e=>set("name",e.target.value)} required/></Field><Field label="Localisation (facultatif)"><input style={inputStyle} value={form.location||""} onChange={e=>set("location",e.target.value)}/></Field></div>);
    if (modal==="group") return modalForm(form.group_id?"Modifier la fiche d’élevage":"Ajouter une fiche d’élevage",saveGroup,<div style={{display:"grid",gap:12}}>
      {!activeFarm&&<><p style={{fontSize:12,color:"#65736a",margin:0}}>Première utilisation : GESTFARM va créer automatiquement ton exploitation. Tu pourras préciser son nom ici.</p><Field label="Nom de l’exploitation (facultatif)"><input style={inputStyle} value={form.farm_name||""} onChange={e=>set("farm_name",e.target.value)} placeholder="Ex. Ferme familiale"/></Field><Field label="Localisation (facultatif)"><input style={inputStyle} value={form.location||""} onChange={e=>set("location",e.target.value)} placeholder="Village, ville…"/></Field></>}
      <Field label="Nom de cette fiche d’élevage"><input style={inputStyle} value={form.name||""} onChange={e=>set("name",e.target.value)} required placeholder="Ex. Pondeuses – Bande A"/></Field>
      <Field label="Espèce élevée"><select style={inputStyle} value={form.species||"broilers"} onChange={e=>set("species",e.target.value)}>{Object.entries(speciesNames).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></Field>
      <Field label="Bâtiment / emplacement (facultatif)"><input style={inputStyle} value={form.building_name||""} onChange={e=>set("building_name",e.target.value)} placeholder="Ex. Bâtiment A, poulailler 2, clapier…"/></Field>
      <div style={styles.formGrid}><Field label="Effectif actuel"><input style={inputStyle} type="number" min={form.group_id?0:1} step="1" value={form.count??""} onChange={e=>set("count",e.target.value)} required placeholder="Ex. 5000"/></Field><Field label="Race / souche (facultatif)"><input style={inputStyle} value={form.breed||""} onChange={e=>set("breed",e.target.value)} placeholder="Ex. Lohmann Brown"/></Field><Field label="Date de démarrage"><input style={inputStyle} type="date" value={form.date||today()} onChange={e=>set("date",e.target.value)} required/></Field></div>
      <p style={{fontSize:11,color:"#718077",margin:0}}>Chaque fiche est indépendante. Tu peux créer plusieurs fiches de la même espèce, par exemple 5 000 pondeuses et 10 000 pondeuses, sans mélanger leurs données.</p>
    </div>);
    if (modal==="assignments") return modalForm("Affecter les employés à cet élevage",saveGroupAssignments,<div style={{display:"grid",gap:12}}>
      <p style={{fontSize:13,color:"#65736a",margin:0}}>Sélectionne une ou plusieurs personnes. Un même employé peut être affecté à plusieurs élevages.</p>
      {farmMembers.filter(m=>m.is_active!==false).length?farmMembers.filter(m=>m.is_active!==false).map(m=><label key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:10,border:"1px solid #e7eee8",borderRadius:9,fontSize:13}}><input type="checkbox" checked={(form.member_ids||[]).includes(m.id)} onChange={e=>set("member_ids",e.target.checked?[...(form.member_ids||[]),m.id]:(form.member_ids||[]).filter(id=>id!==m.id))}/><span><b>{m.full_name||m.email}</b><span style={{display:"block",color:"#718077",fontSize:11}}>{m.email}</span></span></label>):<Empty text="Aucun employé actif. Tu peux gérer toi-même cet élevage ou ajouter des membres dans le module Équipe."/>}
    </div>);
    if (modal==="rabbitBreeder") return modalForm(form.breeder_id?"Modifier le reproducteur":"Nouvelle fiche de reproducteur",saveRabbitBreeder,<div style={{display:"grid",gap:12}}><Field label="Élevage de lapins"><select style={inputStyle} value={form.group_id||""} onChange={e=>set("group_id",e.target.value)} required>{rabbitGroups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></Field><div style={styles.formGrid}><Field label="Identifiant / numéro de boucle"><input style={inputStyle} value={form.breeder_code||""} onChange={e=>set("breeder_code",e.target.value)} required placeholder="Ex. LAP-F-001"/></Field><Field label="Sexe"><select style={inputStyle} value={form.sex||"female"} onChange={e=>set("sex",e.target.value)}><option value="female">Femelle</option><option value="male">Mâle</option></select></Field><Field label="Race / souche"><input style={inputStyle} value={form.breed||""} onChange={e=>set("breed",e.target.value)} placeholder="Ex. Néo-zélandais"/></Field><Field label="Date de naissance"><input style={inputStyle} type="date" value={form.birth_date||""} onChange={e=>set("birth_date",e.target.value)}/></Field><Field label="Âge estimé (mois, si date inconnue)"><input style={inputStyle} type="number" min="0" value={form.estimated_age_months??""} onChange={e=>set("estimated_age_months",e.target.value)}/></Field><Field label="Origine"><select style={inputStyle} value={form.origin||"born_on_farm"} onChange={e=>setForm(old=>({...old,origin:e.target.value,offspring_batch_id:e.target.value==="born_on_farm"?old.offspring_batch_id:""}))}><option value="born_on_farm">Né sur l’exploitation</option><option value="purchased">Acheté</option><option value="gift">Don</option><option value="other">Autre</option></select></Field>{form.origin==="born_on_farm"&&<Field label="Portée d’origine (facultatif)"><select style={inputStyle} value={form.offspring_batch_id||""} onChange={e=>set("offspring_batch_id",e.target.value)}><option value="">Non renseignée</option>{farmOffspring.filter(b=>b.species==="rabbits").map(b=><option key={b.id} value={b.id}>Portée du {dateLabel(b.birth_date)} · {b.born_alive} nés vivants</option>)}</select></Field>}<Field label="Provenance / fournisseur"><input style={inputStyle} value={form.source_details||""} onChange={e=>set("source_details",e.target.value)}/></Field><Field label="Date d’acquisition"><input style={inputStyle} type="date" value={form.acquired_at||""} onChange={e=>set("acquired_at",e.target.value)}/></Field><Field label="Prix d’achat (FCFA)"><input style={inputStyle} type="number" min="0" step="1" value={form.acquisition_price??""} onChange={e=>set("acquisition_price",e.target.value)}/></Field><Field label="Poids initial (kg)"><input style={inputStyle} type="number" min="0.001" step="0.001" value={form.initial_weight_kg??""} onChange={e=>set("initial_weight_kg",e.target.value)}/></Field><Field label="État corporel"><input style={inputStyle} value={form.body_condition||""} onChange={e=>set("body_condition",e.target.value)} placeholder="Ex. bon, maigre, gras…"/></Field><Field label="État sanitaire"><select style={inputStyle} value={form.health_status||"good"} onChange={e=>set("health_status",e.target.value)}><option value="good">Bon</option><option value="to_monitor">À surveiller</option><option value="sick">Malade</option><option value="recovering">En convalescence</option></select></Field><Field label="Statut du reproducteur"><select style={inputStyle} value={form.status||"active"} onChange={e=>set("status",e.target.value)}><option value="active">Actif</option><option value="resting">Au repos</option><option value="culled">Réformé</option><option value="sold">Vendu</option><option value="dead">Décédé</option></select></Field></div><Field label="Observations"><textarea style={inputStyle} value={form.notes||""} onChange={e=>set("notes",e.target.value)}/></Field></div>);
    if (modal==="pigBreeder") return modalForm(form.breeder_id?"Modifier le reproducteur":"Nouvelle fiche de reproducteur",savePigBreeder,<div style={{display:"grid",gap:12}}><Field label="Élevage de porcs"><select style={inputStyle} value={form.group_id||""} onChange={e=>set("group_id",e.target.value)} required>{pigGroups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></Field><div style={styles.formGrid}><Field label="Identifiant / numéro de boucle"><input style={inputStyle} value={form.breeder_code||""} onChange={e=>set("breeder_code",e.target.value)} required placeholder="Ex. POR-F-001"/></Field><Field label="Sexe"><select style={inputStyle} value={form.sex||"female"} onChange={e=>set("sex",e.target.value)}><option value="female">Femelle</option><option value="male">Mâle</option></select></Field><Field label="Race / souche"><input style={inputStyle} value={form.breed||""} onChange={e=>set("breed",e.target.value)} placeholder="Ex. Large White / Landrace"/></Field><Field label="Date de naissance"><input style={inputStyle} type="date" value={form.birth_date||""} onChange={e=>set("birth_date",e.target.value)}/></Field><Field label="Âge estimé (mois, si date inconnue)"><input style={inputStyle} type="number" min="0" value={form.estimated_age_months??""} onChange={e=>set("estimated_age_months",e.target.value)}/></Field><Field label="Origine"><select style={inputStyle} value={form.origin||"born_on_farm"} onChange={e=>setForm(old=>({...old,origin:e.target.value,offspring_batch_id:e.target.value==="born_on_farm"?old.offspring_batch_id:""}))}><option value="born_on_farm">Né sur l’exploitation</option><option value="purchased">Acheté</option><option value="gift">Don</option><option value="other">Autre</option></select></Field>{form.origin==="born_on_farm"&&<Field label="Portée d’origine (facultatif)"><select style={inputStyle} value={form.offspring_batch_id||""} onChange={e=>set("offspring_batch_id",e.target.value)}><option value="">Non renseignée</option>{farmOffspring.filter(b=>b.species==="pigs").map(b=><option key={b.id} value={b.id}>Portée du {dateLabel(b.birth_date)} · {b.born_alive} nés vivants</option>)}</select></Field>}<Field label="Provenance / fournisseur"><input style={inputStyle} value={form.source_details||""} onChange={e=>set("source_details",e.target.value)}/></Field><Field label="Date d’acquisition"><input style={inputStyle} type="date" value={form.acquired_at||""} onChange={e=>set("acquired_at",e.target.value)}/></Field><Field label="Prix d’achat (FCFA)"><input style={inputStyle} type="number" min="0" step="1" value={form.acquisition_price??""} onChange={e=>set("acquisition_price",e.target.value)}/></Field><Field label="Poids initial (kg)"><input style={inputStyle} type="number" min="0.001" step="0.001" value={form.initial_weight_kg??""} onChange={e=>set("initial_weight_kg",e.target.value)}/></Field><Field label="État corporel"><input style={inputStyle} value={form.body_condition||""} onChange={e=>set("body_condition",e.target.value)} placeholder="Ex. bon, maigre, gras…"/></Field><Field label="État sanitaire"><select style={inputStyle} value={form.health_status||"good"} onChange={e=>set("health_status",e.target.value)}><option value="good">Bon</option><option value="to_monitor">À surveiller</option><option value="sick">Malade</option><option value="recovering">En convalescence</option></select></Field><Field label="Statut du reproducteur"><select style={inputStyle} value={form.status||"active"} onChange={e=>set("status",e.target.value)}><option value="active">Actif</option><option value="resting">Au repos</option><option value="culled">Réformé</option><option value="sold">Vendu</option><option value="dead">Décédé</option></select></Field></div><Field label="Observations"><textarea style={inputStyle} value={form.notes||""} onChange={e=>set("notes",e.target.value)}/></Field></div>);
    if (modal==="rabbitEvent") { const females=selectedRabbitBreeders.filter(b=>b.sex==="female"); const males=selectedRabbitBreeders.filter(b=>b.sex==="male"); return modalForm("Enregistrer un événement reproductif",saveRabbitEvent,<div style={{display:"grid",gap:12}}><Field label="Type d’événement"><select style={inputStyle} value={form.event_type||"mating"} onChange={e=>set("event_type",e.target.value)}>{Object.entries(rabbitEventNames).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field><Field label="Date"><input style={inputStyle} type="date" value={form.event_date||today()} onChange={e=>set("event_date",e.target.value)} required/></Field>{["mating","pregnancy_check"].includes(form.event_type)&&<Field label="Date estimée de mise bas"><input style={inputStyle} type="date" value={form.expected_kindling_date|| (form.event_type==="mating"?addDaysToDate(form.event_date||today(),31):"")} onChange={e=>set("expected_kindling_date",e.target.value)}/><span style={{fontSize:11,color:"#718077"}}>Estimation indicative à environ 31 jours après la saillie.</span></Field>}<div style={styles.formGrid}><Field label="Lapine concernée"><select style={inputStyle} value={form.female_id||""} onChange={e=>set("female_id",e.target.value)}><option value="">Non concernée</option>{females.map(b=><option key={b.id} value={b.id}>{b.breeder_code}</option>)}</select></Field><Field label="Mâle concerné"><select style={inputStyle} value={form.male_id||""} onChange={e=>set("male_id",e.target.value)}><option value="">Non concerné</option>{males.map(b=><option key={b.id} value={b.id}>{b.breeder_code}</option>)}</select></Field></div>{form.event_type==="pregnancy_check"&&<Field label="Résultat du contrôle"><select style={inputStyle} value={form.pregnancy_result||""} onChange={e=>set("pregnancy_result",e.target.value)}><option value="">Choisir</option><option value="positive">Gestante</option><option value="negative">Non gestante</option><option value="uncertain">Incertain</option></select></Field>}{form.event_type==="kindling"&&<div style={styles.formGrid}><Field label="Nombre total nés"><input style={inputStyle} type="number" min="0" value={form.kits_total??""} onChange={e=>set("kits_total",e.target.value)}/></Field><Field label="Nés vivants"><input style={inputStyle} type="number" min="0" value={form.kits_alive??""} onChange={e=>set("kits_alive",e.target.value)}/></Field><Field label="Mort-nés"><input style={inputStyle} type="number" min="0" value={form.kits_stillborn??""} onChange={e=>set("kits_stillborn",e.target.value)}/></Field><Field label="Décédés après naissance"><input style={inputStyle} type="number" min="0" value={form.kits_dead??""} onChange={e=>set("kits_dead",e.target.value)}/></Field></div>}{form.event_type==="weaning"&&<div style={styles.formGrid}><Field label="Portée concernée"><select style={inputStyle} value={form.offspring_batch_id||""} onChange={e=>set("offspring_batch_id",e.target.value)}><option value="">Ne pas rattacher à une portée</option>{farmOffspring.filter(b=>b.species==="rabbits").map(b=><option key={b.id} value={b.id}>Portée du {dateLabel(b.birth_date)} — {b.born_alive} vivants</option>)}</select></Field><Field label="Nombre de lapereaux sevrés"><input style={inputStyle} type="number" min="0" value={form.kits_weaned??""} onChange={e=>set("kits_weaned",e.target.value)}/></Field></div>}{form.event_type==="weight"&&<Field label="Poids mesuré (kg)"><input style={inputStyle} type="number" min="0.001" step="0.001" value={form.weight_kg??""} onChange={e=>set("weight_kg",e.target.value)}/></Field>}{["health","vaccination","treatment"].includes(form.event_type)&&<div style={styles.formGrid}><Field label="Produit / médicament"><input style={inputStyle} value={form.product_name||""} onChange={e=>set("product_name",e.target.value)}/></Field><Field label="Dose / posologie"><input style={inputStyle} value={form.dosage||""} onChange={e=>set("dosage",e.target.value)}/></Field><Field label="Voie d’administration"><select style={inputStyle} value={form.administration_route||""} onChange={e=>set("administration_route",e.target.value)}><option value="">Non précisée</option><option value="oral">Orale</option><option value="injection">Injection</option><option value="topical">Locale</option><option value="other">Autre</option></select></Field><Field label="Motif / diagnostic"><input style={inputStyle} value={form.reason||""} onChange={e=>set("reason",e.target.value)}/></Field><Field label="Prochain rappel / contrôle"><input style={inputStyle} type="date" value={form.next_due_date||""} onChange={e=>set("next_due_date",e.target.value)}/></Field></div>}<Field label="Résultat / observation"><input style={inputStyle} value={form.outcome||""} onChange={e=>set("outcome",e.target.value)} placeholder="Ex. saillie effectuée, traitement…"/></Field><Field label="Notes"><textarea style={inputStyle} value={form.notes||""} onChange={e=>set("notes",e.target.value)}/></Field></div>); }
    if (modal==="pigEvent") { const females=selectedPigBreeders.filter(b=>b.sex==="female"); const males=selectedPigBreeders.filter(b=>b.sex==="male"); return modalForm("Enregistrer un événement reproductif porcin",savePigEvent,<div style={{display:"grid",gap:12}}><Field label="Type d’événement"><select style={inputStyle} value={form.event_type||"mating"} onChange={e=>set("event_type",e.target.value)}>{Object.entries(pigEventNames).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field><Field label="Date"><input style={inputStyle} type="date" value={form.event_date||today()} onChange={e=>set("event_date",e.target.value)} required/></Field>{["mating","pregnancy_check"].includes(form.event_type)&&<Field label="Date prévisionnelle de mise bas"><input style={inputStyle} type="date" value={form.expected_farrowing_date|| (form.event_type==="mating"?addDaysToDate(form.event_date||today(),114):"")} onChange={e=>set("expected_farrowing_date",e.target.value)}/><span style={{fontSize:11,color:"#718077"}}>Estimation indicative à environ 114 jours après la saillie.</span></Field>}<div style={styles.formGrid}><Field label="Truie concernée"><select style={inputStyle} value={form.female_id||""} onChange={e=>set("female_id",e.target.value)}><option value="">Non concernée</option>{females.map(b=><option key={b.id} value={b.id}>{b.breeder_code}</option>)}</select></Field><Field label="Verrat concerné"><select style={inputStyle} value={form.male_id||""} onChange={e=>set("male_id",e.target.value)}><option value="">Non concerné</option>{males.map(b=><option key={b.id} value={b.id}>{b.breeder_code}</option>)}</select></Field></div>{form.event_type==="pregnancy_check"&&<Field label="Résultat du contrôle"><select style={inputStyle} value={form.pregnancy_result||""} onChange={e=>set("pregnancy_result",e.target.value)}><option value="">Choisir</option><option value="positive">Gestante</option><option value="negative">Non gestante</option><option value="uncertain">Incertain</option></select></Field>}{form.event_type==="farrowing"&&<div style={styles.formGrid}><Field label="Nombre total de porcelets nés"><input style={inputStyle} type="number" min="0" value={form.piglets_total??""} onChange={e=>set("piglets_total",e.target.value)}/></Field><Field label="Nés vivants"><input style={inputStyle} type="number" min="0" value={form.piglets_alive??""} onChange={e=>set("piglets_alive",e.target.value)}/></Field><Field label="Mort-nés"><input style={inputStyle} type="number" min="0" value={form.piglets_stillborn??""} onChange={e=>set("piglets_stillborn",e.target.value)}/></Field><Field label="Décédés après naissance"><input style={inputStyle} type="number" min="0" value={form.piglets_dead??""} onChange={e=>set("piglets_dead",e.target.value)}/></Field><Field label="Porcelets momifiés"><input style={inputStyle} type="number" min="0" value={form.piglets_mummified??""} onChange={e=>set("piglets_mummified",e.target.value)}/></Field><Field label="Poids total de la portée (kg)"><input style={inputStyle} type="number" min="0.001" step="0.001" value={form.litter_weight_kg??""} onChange={e=>set("litter_weight_kg",e.target.value)}/></Field><Field label="Poids moyen à la naissance (kg)" ><input style={inputStyle} type="number" min="0.001" step="0.001" value={form.avg_birth_weight_kg??""} onChange={e=>set("avg_birth_weight_kg",e.target.value)}/></Field></div>}{form.event_type==="weaning"&&<div style={styles.formGrid}><Field label="Portée concernée"><select style={inputStyle} value={form.offspring_batch_id||""} onChange={e=>set("offspring_batch_id",e.target.value)}><option value="">Ne pas rattacher à une portée</option>{farmOffspring.filter(b=>b.species==="pigs").map(b=><option key={b.id} value={b.id}>Portée du {dateLabel(b.birth_date)} — {b.born_alive} vivants</option>)}</select></Field><Field label="Nombre de porcelets sevrés"><input style={inputStyle} type="number" min="0" value={form.piglets_weaned??""} onChange={e=>set("piglets_weaned",e.target.value)}/></Field></div>}{form.event_type==="weight"&&<Field label="Poids mesuré (kg)"><input style={inputStyle} type="number" min="0.001" step="0.001" value={form.weight_kg??""} onChange={e=>set("weight_kg",e.target.value)}/></Field>}{["health","vaccination","treatment"].includes(form.event_type)&&<div style={styles.formGrid}><Field label="Produit / médicament"><input style={inputStyle} value={form.product_name||""} onChange={e=>set("product_name",e.target.value)}/></Field><Field label="Dose / posologie"><input style={inputStyle} value={form.dosage||""} onChange={e=>set("dosage",e.target.value)}/></Field><Field label="Voie d’administration"><select style={inputStyle} value={form.administration_route||""} onChange={e=>set("administration_route",e.target.value)}><option value="">Non précisée</option><option value="oral">Orale</option><option value="injection">Injection</option><option value="topical">Locale</option><option value="other">Autre</option></select></Field><Field label="Motif / diagnostic"><input style={inputStyle} value={form.reason||""} onChange={e=>set("reason",e.target.value)}/></Field><Field label="Prochain rappel / contrôle"><input style={inputStyle} type="date" value={form.next_due_date||""} onChange={e=>set("next_due_date",e.target.value)}/></Field></div>}<Field label="Résultat / observation"><input style={inputStyle} value={form.outcome||""} onChange={e=>set("outcome",e.target.value)} placeholder="Ex. saillie effectuée, traitement…"/></Field><Field label="Notes"><textarea style={inputStyle} value={form.notes||""} onChange={e=>set("notes",e.target.value)}/></Field></div>); }
    if (modal==="record") return modalForm("Nouveau suivi technique",saveRecord,<div style={styles.formGrid}>{farmSelect}<Field label="Type de suivi"><select style={inputStyle} value={form.record_type||"observation"} onChange={e=>set("record_type",e.target.value)}>{Object.entries(recordNames).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field><Field label="Date"><input style={inputStyle} type="date" value={form.date||today()} onChange={e=>set("date",e.target.value)}/></Field><Field label="Quantité (facultatif)"><input style={inputStyle} type="number" min="0" step="any" value={form.quantity??""} onChange={e=>set("quantity",e.target.value)}/></Field><Field label="Unité"><input style={inputStyle} value={form.unit||""} onChange={e=>set("unit",e.target.value)} placeholder="kg, litres, unités…"/></Field><Field label="Notes"><textarea style={{...inputStyle,minHeight:75}} value={form.notes||""} onChange={e=>set("notes",e.target.value)}/></Field></div>);
    if (modal==="transaction") return modalForm("Nouvelle opération financière",saveTransaction,<div style={styles.formGrid}><Field label="Type"><select style={inputStyle} value={form.transaction_type||"expense"} onChange={e=>set("transaction_type",e.target.value)}><option value="expense">Dépense</option><option value="revenue">Recette</option></select></Field><Field label="Catégorie"><input style={inputStyle} value={form.category||""} onChange={e=>set("category",e.target.value)} required placeholder="Aliments, vente, soins…"/></Field><Field label="Montant (FCFA)"><input style={inputStyle} type="number" min="0" step="1" value={form.amount??""} onChange={e=>set("amount",e.target.value)} required/></Field><Field label="Date"><input style={inputStyle} type="date" value={form.date||today()} onChange={e=>set("date",e.target.value)}/></Field><Field label="Élevage concerné (facultatif)"><select style={inputStyle} value={form.cycle_id||""} onChange={e=>set("cycle_id",e.target.value)}><option value="">Tous les élevages</option>{farmCycles.map(c=><option key={c.id} value={c.id}>{speciesNames[c.species]||c.species} — {c.name}</option>)}</select></Field><Field label="Description"><textarea style={{...inputStyle,minHeight:70}} value={form.description||""} onChange={e=>set("description",e.target.value)}/></Field></div>);
    if (modal==="sale") {
      const selectedBreederList = form.breeder_species==="rabbits"?farmRabbitBreeders:farmPigBreeders;
      const saleGroups = farmGroups;
      return modalForm("Enregistrer une vente",saveSale,<div style={styles.formGrid}>
        <Field label="Nature de la vente"><select style={inputStyle} value={form.sale_type||"product"} onChange={e=>setForm(old=>({...old,sale_type:e.target.value,group_id:"",feed_item_id:"",breeder_id:"",offspring_batch_id:""}))}><option value="product">Produit / autre vente</option><option value="animal_group" disabled={!canEditElevages}>Animaux d’un élevage / lot</option><option value="stock_item" disabled={!canUpdateStocks}>Article provenant du stock</option><option value="breeder" disabled={!canUpdateRabbit&&!canUpdatePig}>Reproducteur individuel</option><option value="offspring_batch" disabled={!canUpdateRabbit&&!canUpdatePig}>Jeunes issus d’une portée</option></select></Field>
        {form.sale_type==="animal_group"&&<Field label="Élevage / lot"><select style={inputStyle} value={form.group_id||""} onChange={e=>set("group_id",e.target.value)} required><option value="">Choisir un lot</option>{saleGroups.map(g=><option key={g.id} value={g.id}>{g.name} — {g.current_count} animaux</option>)}</select></Field>}
        {form.sale_type==="stock_item"&&<Field label="Article en stock"><select style={inputStyle} value={form.feed_item_id||""} onChange={e=>{const x=feedItems.find(i=>i.id===e.target.value);setForm(old=>({...old,feed_item_id:e.target.value,unit_price:x?.unit_cost||old.unit_price||""}));}} required><option value="">Choisir un article</option>{farmFeed.map(i=><option key={i.id} value={i.id}>{i.name} — {i.quantity} {i.unit}</option>)}</select></Field>}
        {form.sale_type==="breeder"&&<><Field label="Espèce du reproducteur"><select style={inputStyle} value={form.breeder_species||"rabbits"} onChange={e=>setForm(old=>({...old,breeder_species:e.target.value,breeder_id:""}))}><option value="rabbits">Lapins</option><option value="pigs">Porcs</option></select></Field><Field label="Reproducteur"><select style={inputStyle} value={form.breeder_id||""} onChange={e=>set("breeder_id",e.target.value)} required><option value="">Choisir un reproducteur</option>{selectedBreederList.filter(b=>b.status!=="sold"&&b.status!=="dead").map(b=><option key={b.id} value={b.id}>{b.breeder_code} — {b.sex==="female"?"Femelle":"Mâle"}</option>)}</select></Field></>}
        {form.sale_type==="offspring_batch"&&<Field label="Portée"><select style={inputStyle} value={form.offspring_batch_id||""} onChange={e=>{const b=offspringBatches.find(x=>x.id===e.target.value);setForm(old=>({...old,offspring_batch_id:e.target.value,unit:"animal",quantity:"1",product_name:b?`Portée ${b.species==="rabbits"?"lapins":"porcs"}`:""}));}} required><option value="">Choisir une portée</option>{farmOffspring.filter(b=>Number(b.weaned_count||0)>Number(b.transferred_count||0)+Number(b.sold_count||0)).map(b=><option key={b.id} value={b.id}>{b.species==="rabbits"?"Lapins":"Porcs"} — {dateLabel(b.birth_date)} · disponibles {Number(b.weaned_count||0)-Number(b.transferred_count||0)-Number(b.sold_count||0)}</option>)}</select></Field>}
        {form.sale_type==="product"&&<Field label="Produit vendu"><input style={inputStyle} value={form.product_name||""} onChange={e=>set("product_name",e.target.value)} required placeholder="Œufs, fumier, viande, autre produit…"/></Field>}
        <Field label="Quantité"><input style={inputStyle} type="number" min={["animal_group","breeder","offspring_batch"].includes(form.sale_type)?"1":"0.001"} step={["animal_group","breeder","offspring_batch"].includes(form.sale_type)?"1":"any"} value={form.quantity??""} onChange={e=>set("quantity",e.target.value)} required/></Field>
        <Field label="Unité"><input style={inputStyle} value={form.sale_type==="animal_group"||form.sale_type==="breeder"||form.sale_type==="offspring_batch"?"animal":form.sale_type==="stock_item"?(farmFeed.find(i=>i.id===form.feed_item_id)?.unit||"unité"):(form.unit||"unité")} onChange={e=>set("unit",e.target.value)} disabled={["animal_group","breeder","offspring_batch","stock_item"].includes(form.sale_type)}/></Field>
        <Field label="Prix unitaire (FCFA)"><input style={inputStyle} type="number" min="0" step="1" value={form.unit_price??""} onChange={e=>set("unit_price",e.target.value)} required/></Field>
        <Field label="Date de vente"><input style={inputStyle} type="date" value={form.sale_date||today()} onChange={e=>set("sale_date",e.target.value)}/></Field>
        <Field label="Lieu de vente"><select style={inputStyle} value={form.location_type||"farm"} onChange={e=>set("location_type",e.target.value)}><option value="farm">À la ferme</option><option value="depot">Dépôt / boutique</option><option value="other">Autre lieu</option></select></Field>
        {form.location_type!=="farm"&&<Field label="Nom du dépôt / lieu"><input style={inputStyle} value={form.location_name||""} onChange={e=>set("location_name",e.target.value)} placeholder="Ex. Boutique du marché…"/></Field>}
        <Field label="Client (facultatif)"><input style={inputStyle} value={form.customer_name||""} onChange={e=>set("customer_name",e.target.value)}/></Field>
        <Field label="Mode de paiement (facultatif)"><select style={inputStyle} value={form.payment_method||""} onChange={e=>set("payment_method",e.target.value)}><option value="">Non précisé</option><option value="cash">Espèces</option><option value="mobile_money">Mobile Money</option><option value="bank">Virement bancaire</option><option value="other">Autre</option></select></Field>
        <Field label="Notes"><textarea style={inputStyle} value={form.notes||""} onChange={e=>set("notes",e.target.value)}/></Field>
        <div style={{gridColumn:"1 / -1",background:"#f1f7f2",padding:12,borderRadius:9,fontSize:13}}>Montant total estimé : <b>{money(Number(form.quantity||0)*Number(form.unit_price||0))}</b>. La recette sera ajoutée automatiquement au module Finances.</div>
      </div>);
    }
    if (modal==="allocateStock") { const item=farmFeed.find(i=>i.id===form.feed_item_id); return modalForm("Affecter du stock à une bande",saveStockAllocation,<div style={styles.formGrid}><Field label="Article du stock central"><select style={inputStyle} value={form.feed_item_id||""} onChange={e=>set("feed_item_id",e.target.value)} required><option value="">Choisir un article</option>{farmFeed.map(i=><option key={i.id} value={i.id}>{i.name} — {i.quantity} {i.unit}</option>)}</select></Field><Field label="Bande destinataire"><select style={inputStyle} value={form.group_id||""} onChange={e=>set("group_id",e.target.value)} required><option value="">Choisir une bande</option>{farmGroups.map(g=><option key={g.id} value={g.id}>{g.name}{g.building_name?` · ${g.building_name}`:""}</option>)}</select></Field><Field label={`Quantité à affecter (${item?.unit||"unité"})`}><input style={inputStyle} type="number" min="0.001" max={item?.quantity||undefined} step="any" value={form.quantity??""} onChange={e=>set("quantity",e.target.value)} required/><span style={styles.muted}>Disponible au magasin : {item?.quantity??0} {item?.unit||""}</span></Field><Field label="Seuil d’alerte pour cette bande"><input style={inputStyle} type="number" min="0" step="any" value={form.minimum_quantity??0} onChange={e=>set("minimum_quantity",e.target.value)}/><span style={styles.muted}>Un avertissement apparaîtra quand le reste atteindra ce seuil.</span></Field><Field label="Employé responsable (facultatif)"><select style={inputStyle} value={form.assigned_member_id||""} onChange={e=>set("assigned_member_id",e.target.value)}><option value="">Promoteur / non attribué</option>{farmMembers.filter(m=>m.is_active!==false&&m.status==="active").map(m=><option key={m.id} value={m.id}>{m.full_name||m.email}</option>)}</select></Field><Field label="Date"><input style={inputStyle} type="date" value={form.date||today()} onChange={e=>set("date",e.target.value)}/></Field><Field label="Note (facultatif)"><textarea style={inputStyle} value={form.notes||""} onChange={e=>set("notes",e.target.value)}/></Field></div>); }
    if (modal==="consumeAllocation") { const a=stockAllocations.find(x=>x.id===form.allocation_id); const item=farmFeed.find(x=>x.id===a?.feed_item_id); const g=farmGroups.find(x=>x.id===a?.group_id); const remaining=a?Number(a.quantity_allocated)-Number(a.quantity_consumed)-Number(a.quantity_transferred_out):0; return modalForm("Enregistrer une distribution",saveAllocatedConsumption,<div style={styles.formGrid}><div style={{gridColumn:"1/-1",fontSize:13,color:GREEN}}><b>{item?.name}</b> · {g?.name} · Reste : {remaining} {item?.unit}</div><Field label={`Quantité distribuée (${item?.unit||"unité"})`}><input style={inputStyle} type="number" min="0.001" max={remaining} step="any" value={form.quantity??""} onChange={e=>set("quantity",e.target.value)} required/></Field><Field label="Date"><input style={inputStyle} type="date" value={form.date||today()} onChange={e=>set("date",e.target.value)}/></Field><Field label="Observation (facultatif)"><textarea style={inputStyle} value={form.notes||""} onChange={e=>set("notes",e.target.value)} placeholder="Ex. ration du matin…"/></Field><div style={{gridColumn:"1/-1",fontSize:12,color:"#65736a"}}>La quantité sera déduite de cette réserve et ajoutée automatiquement au suivi technique de la bande. Aucun prélèvement ne sera fait sur le stock central.</div></div>); }
    if (modal==="transferAllocation") { const a=stockAllocations.find(x=>x.id===form.allocation_id); const item=farmFeed.find(x=>x.id===a?.feed_item_id); const g=farmGroups.find(x=>x.id===a?.group_id); const remaining=a?Number(a.quantity_allocated)-Number(a.quantity_consumed)-Number(a.quantity_transferred_out):0; return modalForm("Réaffecter le stock restant",saveAllocatedTransfer,<div style={styles.formGrid}><div style={{gridColumn:"1/-1",fontSize:13,color:GREEN}}>Origine : <b>{g?.name}</b> · {item?.name} · Disponible : {remaining} {item?.unit}</div><Field label="Bande destinataire"><select style={inputStyle} value={form.destination_group_id||""} onChange={e=>set("destination_group_id",e.target.value)} required><option value="">Choisir une autre bande</option>{farmGroups.filter(x=>x.id!==g?.id).map(x=><option key={x.id} value={x.id}>{x.name}{x.building_name?` · ${x.building_name}`:""}</option>)}</select></Field><Field label={`Quantité à transférer (${item?.unit||"unité"})`}><input style={inputStyle} type="number" min="0.001" max={remaining} step="any" value={form.quantity??""} onChange={e=>set("quantity",e.target.value)} required/><button type="button" style={{border:0,background:"transparent",color:ACCENT,textAlign:"left",padding:0,fontSize:12}} onClick={()=>set("quantity",String(remaining))}>Transférer tout le reste ({remaining} {item?.unit})</button></Field><Field label="Nouvel employé responsable (facultatif)"><select style={inputStyle} value={form.assigned_member_id||""} onChange={e=>set("assigned_member_id",e.target.value)}><option value="">Conserver sans responsable attribué</option>{farmMembers.filter(m=>m.is_active!==false&&m.status==="active").map(m=><option key={m.id} value={m.id}>{m.full_name||m.email}</option>)}</select></Field><Field label="Date"><input style={inputStyle} type="date" value={form.date||today()} onChange={e=>set("date",e.target.value)}/></Field><Field label="Note (facultatif)"><textarea style={inputStyle} value={form.notes||""} onChange={e=>set("notes",e.target.value)}/></Field></div>); }
    if (modal==="replenishAllocation") { const a=stockAllocations.find(x=>x.id===form.allocation_id); const item=farmFeed.find(x=>x.id===a?.feed_item_id); const g=farmGroups.find(x=>x.id===a?.group_id); return modalForm("Réapprovisionner la réserve de la bande",saveAllocatedReplenishment,<div style={styles.formGrid}><div style={{gridColumn:"1/-1",fontSize:13,color:GREEN}}><b>{g?.name}</b> · {item?.name} · Stock central : {item?.quantity} {item?.unit}</div><Field label={`Quantité à ajouter (${item?.unit||"unité"})`}><input style={inputStyle} type="number" min="0.001" max={item?.quantity||undefined} step="any" value={form.quantity??""} onChange={e=>set("quantity",e.target.value)} required/></Field><Field label="Date"><input style={inputStyle} type="date" value={form.date||today()} onChange={e=>set("date",e.target.value)}/></Field><Field label="Note (facultatif)"><textarea style={inputStyle} value={form.notes||""} onChange={e=>set("notes",e.target.value)}/></Field></div>); }
    if (modal==="transfer") return modalForm("Transfert interne entre lieux de stockage",saveStockTransfer,<div style={styles.formGrid}>
      <Field label="Article / emplacement de départ"><select style={inputStyle} value={form.source_feed_item_id||""} onChange={e=>set("source_feed_item_id",e.target.value)} required><option value="">Choisir</option>{farmFeed.map(i=><option key={i.id} value={i.id}>{i.name} — {i.storage_location||"Stock principal"} ({i.quantity} {i.unit})</option>)}</select></Field>
      <Field label="Lieu d’arrivée"><input style={inputStyle} value={form.destination_location||""} onChange={e=>set("destination_location",e.target.value)} required placeholder="Dépôt, boutique, magasin…"/></Field>
      <Field label={`Quantité transférée (${feedItems.find(i=>i.id===form.source_feed_item_id)?.unit||"unité"})`}><input style={inputStyle} type="number" min="0.001" step="any" value={form.quantity||""} onChange={e=>set("quantity",e.target.value)} required/></Field>
      <Field label="Date"><input style={inputStyle} type="date" value={form.transfer_date||today()} onChange={e=>set("transfer_date",e.target.value)}/></Field>
      <Field label="Notes"><textarea style={inputStyle} value={form.notes||""} onChange={e=>set("notes",e.target.value)}/></Field>
      <div style={{gridColumn:"1 / -1",fontSize:12,color:"#65736a"}}>GESTFARM créera automatiquement le stock correspondant au lieu d’arrivée si nécessaire, puis mettra à jour les deux quantités. Le transfert ne crée ni recette ni dépense.</div>
    </div>);
    if (modal==="offspring") {
      const batch = offspringBatches.find(b=>b.id===form.offspring_batch_id);
      const speciesGroups = groups.filter(g=>cycles.some(c=>c.id===g.cycle_id&&c.species===batch?.species));
      const available = batch ? Math.max(0,Number(batch.weaned_count||0)-Number(batch.transferred_count||0)-Number(batch.sold_count||0)) : 0;
      return modalForm("Destination des jeunes sevrés",saveOffspringDestination,<div style={styles.formGrid}>
        <Field label="Destination"><select style={inputStyle} value={form.destination_type||"fattening"} onChange={e=>set("destination_type",e.target.value)}><option value="fattening">Lot d’engraissement</option><option value="breeding">Futurs reproducteurs</option><option value="other">Autre destination</option></select></Field>
        {form.destination_type==="fattening"&&<><Field label="Lot d’engraissement"><select style={inputStyle} value={form.destination_group_id||""} onChange={e=>set("destination_group_id",e.target.value)} required><option value="">Choisir un lot de même espèce</option>{speciesGroups.filter(g=>g.id!==batch?.source_group_id).map(g=><option key={g.id} value={g.id}>{g.name} — {g.current_count} animaux</option>)}</select></Field><Field label={`Nombre à transférer (disponibles : ${available})`}><input style={inputStyle} type="number" min="1" max={available} step="1" value={form.transfer_count||""} onChange={e=>set("transfer_count",e.target.value)} required/></Field></>}
        <Field label="Observation / destination détaillée"><textarea style={inputStyle} value={form.destination_notes||""} onChange={e=>set("destination_notes",e.target.value)} placeholder="Précisions sur l’orientation des jeunes…"/></Field>
        {batch&&<div style={{gridColumn:"1 / -1",fontSize:12,color:"#65736a"}}>Portée du {dateLabel(batch.birth_date)} · Nés vivants : {batch.born_alive} · Sevrés : {batch.weaned_count} · Déjà transférés : {batch.transferred_count} · Vendus : {batch.sold_count}. Les jeunes destinés à la reproduction devront ensuite recevoir une fiche individuelle.</div>}
      </div>);
    }
    if (modal==="stock") return modalForm("Ajouter un article au stock",saveStock,<div style={styles.formGrid}><Field label="Nom de l’article"><input style={inputStyle} value={form.name||""} onChange={e=>set("name",e.target.value)} required placeholder="Ex. Maïs, vaccin, abreuvoir…"/></Field><Field label="Catégorie"><select style={inputStyle} value={form.category||"feed"} onChange={e=>set("category",e.target.value)}>{Object.entries(stockCategories).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></Field><Field label="Unité de base"><select style={inputStyle} value={form.unit||"kg"} onChange={e=>set("unit",e.target.value)}>{stockUnits.map(u=><option key={u} value={u}>{stockUnitLabels[u]}</option>)}</select></Field><Field label="Conditionnement (facultatif)"><select style={inputStyle} value={form.package_unit||""} onChange={e=>set("package_unit",e.target.value)}><option value="">Aucun</option>{["sac","carton","boîte","flacon","bidon","paquet","rouleau"].map(u=><option key={u} value={u}>{u}</option>)}</select></Field><Field label={`Contenu par conditionnement (${form.unit||"kg"})`}><input style={inputStyle} type="number" min="0.001" step="any" value={form.package_size??""} onChange={e=>set("package_size",e.target.value)} placeholder="Ex. 50"/></Field><Field label={`Quantité initiale (${form.package_unit||form.unit||"kg"})`}><input style={inputStyle} type="number" min="0" step="any" value={form.quantity??0} onChange={e=>set("quantity",e.target.value)}/></Field><Field label={`Seuil minimum (${form.unit||"kg"})`}><input style={inputStyle} type="number" min="0" step="any" value={form.minimum_quantity??0} onChange={e=>set("minimum_quantity",e.target.value)}/></Field><Field label={`Coût unitaire (FCFA / ${form.unit||"kg"})`}><input style={inputStyle} type="number" min="0" step="any" value={form.unit_cost??0} onChange={e=>set("unit_cost",e.target.value)}/></Field><Field label="Fournisseur"><input style={inputStyle} value={form.supplier||""} onChange={e=>set("supplier",e.target.value)}/></Field><Field label="Emplacement"><input style={inputStyle} value={form.storage_location||""} onChange={e=>set("storage_location",e.target.value)} placeholder="Magasin, pharmacie…"/></Field><Field label="N° de lot / série"><input style={inputStyle} value={form.lot_number||""} onChange={e=>set("lot_number",e.target.value)}/></Field><Field label="Date d’expiration (si applicable)"><input style={inputStyle} type="date" value={form.expiry_date||""} onChange={e=>set("expiry_date",e.target.value)}/></Field><Field label="État du matériel"><select style={inputStyle} value={form.item_condition||""} onChange={e=>set("item_condition",e.target.value)}><option value="">Non concerné / non précisé</option><option value="new">Neuf</option><option value="good">Bon état</option><option value="repair">À réparer</option><option value="out_of_service">Hors service</option></select></Field><Field label="Description"><textarea style={{...inputStyle,minHeight:70}} value={form.description||""} onChange={e=>set("description",e.target.value)}/></Field></div>);
    if (modal==="movement") { const movementItem=farmFeed.find(i=>i.id===form.feed_item_id); return modalForm("Mouvement de stock",saveMovement,<div style={styles.formGrid}><Field label="Article"><select style={inputStyle} value={form.feed_item_id||""} onChange={e=>{set("feed_item_id",e.target.value);const chosen=farmFeed.find(i=>i.id===e.target.value);set("input_unit",chosen?.package_unit||chosen?.unit||"");}} required><option value="">Choisir</option>{farmFeed.map(i=><option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>)}</select></Field><Field label="Type de mouvement"><select style={inputStyle} value={form.movement_type||"entry"} onChange={e=>set("movement_type",e.target.value)}><option value="entry">Entrée</option><option value="exit">Sortie / utilisation</option><option value="loss">Perte</option><option value="adjustment">Ajustement inventaire</option></select></Field><Field label="Unité de saisie"><select style={inputStyle} value={form.input_unit||movementItem?.unit||"kg"} onChange={e=>set("input_unit",e.target.value)}>{movementItem&&<><option value={movementItem.unit}>{movementItem.unit}</option>{movementItem.package_unit&&<option value={movementItem.package_unit}>{movementItem.package_unit} ({movementItem.package_size} {movementItem.unit})</option>}</>}</select></Field><Field label={`Quantité (${form.input_unit||movementItem?.unit||"unité"})`}><input style={inputStyle} type="number" min="0.001" step="any" value={form.quantity??""} onChange={e=>set("quantity",e.target.value)} required/></Field><Field label="Date"><input style={inputStyle} type="date" value={form.date||today()} onChange={e=>set("date",e.target.value)}/></Field><Field label="Coût unitaire (FCFA, facultatif)"><input style={inputStyle} type="number" min="0" step="any" value={form.unit_cost??""} onChange={e=>set("unit_cost",e.target.value)}/></Field><Field label="Lot / numéro de série"><input style={inputStyle} value={form.lot_number||""} onChange={e=>set("lot_number",e.target.value)}/></Field><Field label="Expiration du lot"><input style={inputStyle} type="date" value={form.expiry_date||""} onChange={e=>set("expiry_date",e.target.value)}/></Field><Field label="Notes"><input style={inputStyle} value={form.notes||""} onChange={e=>set("notes",e.target.value)}/></Field></div>); }
    if (modal==="member") return modalForm(form.member_id?"Modifier les accès du membre":"Préparer un membre",saveMember,<div style={{display:"grid",gap:14}}>
      <div style={styles.formGrid}><Field label="Nom complet"><input style={inputStyle} value={form.full_name||""} onChange={e=>set("full_name",e.target.value)} placeholder="Nom du collaborateur"/></Field><Field label="Adresse e-mail"><input style={inputStyle} type="email" value={form.email||""} onChange={e=>set("email",e.target.value)} required disabled={!!form.member_id}/></Field><Field label="Rôle"><select style={inputStyle} value={form.role||"employee"} onChange={e=>{set("role",e.target.value);set("permissions",permissionsForRole(e.target.value));}}>{[["manager","Responsable de ferme"],["technician","Technicien"],["employee","Employé"],["consultant","Consultant"],["viewer","Consultation seule"]].map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></Field></div>
      <div style={{fontSize:13,fontWeight:700,color:GREEN}}>Autorisations personnalisées</div>
      <div style={{display:"grid",gap:10}}>{teamModules.map(([module,label])=><div key={module} style={{border:"1px solid #e8eee9",borderRadius:10,padding:11}}><b style={{fontSize:13}}>{label}</b><div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:8}}>{permissionActions.map(([action,caption])=><label key={action} style={{display:"flex",alignItems:"center",gap:5,fontSize:12}}><input type="checkbox" checked={!!form.permissions?.[module]?.[action]} disabled={module==="historique"&&action!=="read"} onChange={e=>set("permissions",{...(form.permissions||{}),[module]:{...(form.permissions?.[module]||{}),[action]:e.target.checked}})}/>{caption}</label>)}</div></div>)}</div>
      {form.member_id&&<label style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}><input type="checkbox" checked={form.is_active!==false} onChange={e=>set("is_active",e.target.checked)}/> Accès actif</label>}
      <div style={{fontSize:11,color:"#7b887f"}}>Le rôle propose des autorisations initiales que tu peux modifier. Après l’enregistrement, tu pourras envoyer une invitation de connexion à son adresse e-mail.</div>
    </div>);
    if (modal==="absence") return modalForm("Déclarer une absence",saveAbsence,<div style={styles.formGrid}><Field label="Membre"><select style={inputStyle} value={form.member_id||""} onChange={e=>set("member_id",e.target.value)} required><option value="">Choisir un membre</option>{farmMembers.map(m=><option key={m.id} value={m.id}>{m.full_name||m.email}</option>)}</select></Field><Field label="Motif (facultatif)"><input style={inputStyle} value={form.reason||""} onChange={e=>set("reason",e.target.value)} placeholder="Congé, maladie, permission…"/></Field><Field label="Date de début"><input style={inputStyle} type="date" value={form.start_date||today()} onChange={e=>set("start_date",e.target.value)} required/></Field><Field label="Date de fin"><input style={inputStyle} type="date" min={form.start_date||today()} value={form.end_date||""} onChange={e=>set("end_date",e.target.value)}/></Field></div>);
    if (modal==="task") return modalForm("Créer une tâche",saveTask,<div style={styles.formGrid}><Field label="Intitulé"><input style={inputStyle} value={form.title||""} onChange={e=>set("title",e.target.value)} required/></Field><Field label="Description"><textarea style={inputStyle} value={form.description||""} onChange={e=>set("description",e.target.value)}/></Field><Field label="Début (facultatif)"><input style={inputStyle} type="datetime-local" value={form.start_date||""} onChange={e=>set("start_date",e.target.value)}/></Field><Field label="Fin (facultatif)"><input style={inputStyle} type="datetime-local" value={form.end_date||""} onChange={e=>set("end_date",e.target.value)}/></Field><Field label="Attribuer à (facultatif)"><select style={inputStyle} value={form.assigned_to||""} onChange={e=>set("assigned_to",e.target.value)}><option value="">Non attribuée</option>{farmMembers.map(m=><option key={m.id} value={m.id}>{m.full_name||m.email}</option>)}</select></Field></div>);
    return null;
  })();

  return <div className="gf-app" style={styles.app}>
    <style>{`
      .gf-app { width:100%; min-width:0; }
      .gf-sidebar { }
      .gf-main { }
      .gf-mobile-menu { display:none !important; }
      @media (max-width:760px) {
        .gf-app { display:block !important; min-height:100dvh !important; overflow-x:hidden !important; }
        .gf-sidebar { position:fixed !important; top:0 !important; left:0 !important; bottom:0 !important; height:100dvh !important; min-height:100dvh !important; width:min(82vw,290px) !important; transform:translateX(-105%); transition:transform .22s ease; overflow-y:auto !important; box-shadow:0 12px 35px #102a1b24; z-index:30 !important; }
        .gf-sidebar.gf-sidebar-open { transform:translateX(0) !important; }
        .gf-main { width:100% !important; min-width:0 !important; }
        .gf-main-header { height:auto !important; min-height:64px !important; padding:10px 12px !important; gap:8px !important; flex-wrap:wrap !important; }
        .gf-main-header select { max-width:145px !important; font-size:12px !important; }
        .gf-content { padding:18px 12px !important; width:100% !important; box-sizing:border-box !important; }
        .gf-mobile-scrim { display:block !important; position:fixed !important; inset:0 !important; background:#0d211866 !important; z-index:19 !important; }
        .gf-mobile-menu { display:inline-flex !important; flex:0 0 auto !important; }
        .gf-modal { padding:16px !important; max-height:88dvh !important; }
        .gf-app table { min-width:560px; }
      }
      @media (min-width:761px) { .gf-mobile-menu { display:none !important; } }
      .gf-print-sheet { display:none; }
      @media print {
        body * { visibility:hidden !important; }
        .gf-print-sheet, .gf-print-sheet * { visibility:visible !important; }
        .gf-print-sheet { display:block !important; position:absolute !important; inset:0 auto auto 0 !important; width:100% !important; padding:18mm !important; box-sizing:border-box !important; background:#fff !important; color:#111 !important; font-family:Arial,sans-serif !important; }
        .gf-print-sheet h1,.gf-print-sheet h2 { color:#174d35 !important; }
        .gf-print-sheet table { width:100%; border-collapse:collapse; font-size:11pt; }
        .gf-print-sheet th,.gf-print-sheet td { border:1px solid #bbb; padding:7px; text-align:left; }
      }
    `}</style>
    <aside className={`gf-sidebar${mobileOpen ? " gf-sidebar-open" : ""}`} style={{ ...styles.sidebar, transform: mobileOpen ? "translateX(0)" : undefined }}>
      <div style={styles.brand}><div style={styles.brandMark}>G</div><div><b>GESTFARM</b><small>by kenfack sobtia</small></div></div>
      <div style={styles.navLabel}>MENU PRINCIPAL</div>
      {visibleNav.map(([id,label,Icon])=><button key={id} onClick={()=>{setPage(id);setMobileOpen(false);setError("");}} style={{...styles.navItem,background:page===id?"#eaf3ec":"transparent",color:page===id?GREEN:"#66746b",fontWeight:page===id?700:500}}><Icon size={18}/>{label}</button>)}
      <div style={{ marginTop:"auto", paddingTop:20 }}><button onClick={logout} style={styles.navItem}><LogOut size={18}/> Déconnexion</button></div>
    </aside>
    {mobileOpen && <div className="gf-mobile-scrim" style={styles.scrim} onClick={()=>setMobileOpen(false)}/> }
    <main className="gf-main" style={styles.main}>
      <header className="gf-main-header" style={styles.header}>
        <button className="gf-mobile-menu" aria-label="Ouvrir le menu" onClick={()=>setMobileOpen(!mobileOpen)} style={{...styles.iconButton,display:"inline-flex"}}><Menu size={20}/></button>
        <div style={{ flex:1 }}><b style={{ color:GREEN }}>Espace de gestion</b><div style={styles.muted}>{session.user.email}</div></div>
        <select aria-label="Élevage actif" value={activeFarm?.id||""} onChange={e=>setSelectedFarm(e.target.value)} style={{...inputStyle,width:"auto",maxWidth:190}}><option value="">Tous les élevages</option>{farms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select>
      </header>
      <div className="gf-content" style={styles.content}>
        {error && <div style={styles.errorBanner}><AlertCircle size={17}/>{error}<button onClick={()=>setError("")} style={styles.dismiss}>×</button></div>}
        {notice && <div style={styles.successBanner}><CheckCircle2 size={17}/>{notice}<button onClick={()=>setNotice("")} style={styles.dismiss}>×</button></div>}
        {busy && <div style={styles.loading}>Chargement des données…</div>}
        {renderContent()}
        <footer style={styles.footer}>GESTFARM by kenfack sobtia · Gestion et suivi des exploitations d’élevage · <button type="button" onClick={()=>setPrivacyOpen(true)} style={styles.footerLink}>Confidentialité</button></footer>
      </div>
    </main>
    {printItem && <div className="gf-print-sheet">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"2px solid #174d35",paddingBottom:12,marginBottom:18}}>
        <div><h1 style={{margin:0}}>GESTFARM</h1><div>Fiche zootechnique individuelle — {printItem.species}</div></div>
        <div style={{textAlign:"right",fontSize:11}}>Document généré le {new Date().toLocaleDateString("fr-FR")}</div>
      </div>
      <h2>{printItem.kind==="history"?"Historique reproductif":"Fiche individuelle du reproducteur"} — {printItem.breeder?.breeder_code}</h2>
      {printItem.kind==="breeder" && <table><tbody>
        <tr><th>Espèce</th><td>{printItem.species}</td><th>Sexe</th><td>{printItem.breeder?.sex==="female"?"Femelle":"Mâle"}</td></tr>
        <tr><th>Race / croisement</th><td>{printItem.breeder?.breed||"Non précisé"}</td><th>Statut</th><td>{({active:"Actif",resting:"Au repos",culled:"Réformé",sold:"Vendu",dead:"Décédé"})[printItem.breeder?.status]||printItem.breeder?.status}</td></tr>
        <tr><th>Date de naissance</th><td>{dateLabel(printItem.breeder?.birth_date)}</td><th>Âge estimé</th><td>{printItem.breeder?.estimated_age_months??"—"} mois</td></tr>
        <tr><th>Origine</th><td>{({born_on_farm:"Né sur l’exploitation",purchased:"Acheté",gift:"Don",other:"Autre"})[printItem.breeder?.origin]||printItem.breeder?.origin}</td><th>Provenance</th><td>{printItem.breeder?.source_details||"—"}</td></tr>
        <tr><th>Date d’acquisition</th><td>{dateLabel(printItem.breeder?.acquired_at)}</td><th>Prix d’achat</th><td>{printItem.breeder?.acquisition_price?money(printItem.breeder.acquisition_price):"—"}</td></tr>
        <tr><th>Poids initial</th><td>{printItem.breeder?.initial_weight_kg?`${printItem.breeder.initial_weight_kg} kg`:"—"}</td><th>État corporel</th><td>{printItem.breeder?.body_condition||"—"}</td></tr>
        <tr><th>État sanitaire</th><td>{({good:"Bon",to_monitor:"À surveiller",sick:"Malade",recovering:"En convalescence"})[printItem.breeder?.health_status]||"—"}</td><th>Notes</th><td>{printItem.breeder?.notes||"—"}</td></tr>
        <tr><th>Portée d’origine</th><td>{printItem.batch?dateLabel(printItem.batch.birth_date):"Non renseignée"}</td><th>Parents</th><td>{printItem.batch?`Mère : ${(printItem.species==="Lapin"?rabbitBreeders:pigBreeders).find(x=>x.id===printItem.batch.female_id)?.breeder_code||"—"} · Père : ${(printItem.species==="Lapin"?rabbitBreeders:pigBreeders).find(x=>x.id===printItem.batch.male_id)?.breeder_code||"—"}`:"—"}</td></tr>
      </tbody></table>}
      <h2 style={{marginTop:24}}>Historique des événements</h2>
      {printItem.history?.length?<table><thead><tr><th>Date</th><th>Événement</th><th>Résultat / données</th><th>Produit / notes</th></tr></thead><tbody>{printItem.history.map(ev=><tr key={ev.id}><td>{dateLabel(ev.event_date)}</td><td>{ev.event_type}</td><td>{[ev.kits_total!=null?`${ev.kits_total} nés`:null,ev.kits_alive!=null?`${ev.kits_alive} vivants`:null,ev.piglets_total!=null?`${ev.piglets_total} porcelets nés`:null,ev.piglets_alive!=null?`${ev.piglets_alive} vivants`:null,ev.weight_kg?`${ev.weight_kg} kg`:null,ev.pregnancy_result].filter(Boolean).join(" · ")||"—"}</td><td>{[ev.product_name,ev.dosage,ev.reason,ev.notes,ev.outcome].filter(Boolean).join(" · ")||"—"}</td></tr>)}</tbody></table>:<p>Aucun événement enregistré.</p>}
      <div style={{marginTop:30,fontSize:10,color:"#555"}}>GESTFARM by Kenfack Sobtia — Document issu des données enregistrées dans l’application.</div>
    </div>}
    {modalContent}
    {privacyOpen && <div style={styles.overlay} onClick={()=>setPrivacyOpen(false)}><section role="dialog" aria-modal="true" aria-label="Politique de confidentialité" className="gf-modal" style={{ ...styles.modal, maxHeight:"85vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><h2 style={{color:GREEN,margin:0}}>Politique de confidentialité</h2><button onClick={()=>setPrivacyOpen(false)} style={styles.iconButton} aria-label="Fermer"><X size={19}/></button></div><PrivacyText/><Button onClick={()=>setPrivacyOpen(false)}>Fermer</Button></section></div>}
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
  footerLink:{border:0,background:"transparent",color:ACCENT,textDecoration:"underline",cursor:"pointer",fontSize:12,padding:0},
  footer:{textAlign:"center",color:"#9aa69d",fontSize:11,padding:"30px 0 10px"},
  scrim:{display:"none"}
};
