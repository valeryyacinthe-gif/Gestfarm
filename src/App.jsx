
import React, { useEffect, useState } from "react";
import {
  LayoutDashboard, Bird, Rabbit, PiggyBank,
  Wallet, Package, Activity, Menu, X,
  TrendingUp, Users, Bell, Settings,
  ChevronRight, Plus, Sprout, LogOut
} from "lucide-react";
import { supabase } from "./supabase";

const species = [
  { name: "Poulets de chair", icon: Bird, color: "#e9a23b" },
  { name: "Poules pondeuses", icon: Bird, color: "#4b9b75" },
  { name: "Lapins", icon: Rabbit, color: "#9b83c9" },
  { name: "Porcs", icon: PiggyBank, color: "#d77d83" }
];

export default function App() {
  const [active, setActive] = useState("Tableau de bord");
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [farms, setFarms] = useState([]);
  const [animalCount, setAnimalCount] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [income, setIncome] = useState(0);

  const [showFarmForm, setShowFarmForm] = useState(false);
  const [farmName, setFarmName] = useState("");
  const [farmLocation, setFarmLocation] = useState("");
  const [dataMessage, setDataMessage] = useState("");

  const navigation = [
    { name: "Tableau de bord", icon: LayoutDashboard },
    { name: "Mes élevages", icon: Sprout },
    { name: "Suivi technique", icon: Activity },
    { name: "Finances", icon: Wallet },
    { name: "Stocks", icon: Package },
    { name: "Rapports", icon: TrendingUp }
  ];

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setAuthMessage(error.message);
      setUser(data?.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) setUser(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) loadDashboard();
    else {
      setFarms([]);
      setAnimalCount(0);
      setExpenses(0);
      setIncome(0);
    }
  }, [user]);

  async function loadDashboard() {
    setDataMessage("");

    const { data: farmData, error: farmError } = await supabase
      .from("farms")
      .select("*")
      .order("created_at", { ascending: false });

    if (farmError) {
      setDataMessage("Impossible de charger les exploitations : " + farmError.message);
      return;
    }

    setFarms(farmData || []);

    if (!farmData?.length) {
      setAnimalCount(0);
      setExpenses(0);
      setIncome(0);
      return;
    }

    const farmIds = farmData.map(farm => farm.id);

    const [animalsResult, financesResult] = await Promise.all([
      supabase
        .from("animal_groups")
        .select("current_count")
        .in("farm_id", farmIds),

      supabase
        .from("financial_transactions")
        .select("transaction_type, amount")
        .in("farm_id", farmIds)
    ]);

    if (animalsResult.error) {
      setDataMessage("Erreur de lecture des animaux : " + animalsResult.error.message);
    } else {
      const total = (animalsResult.data || []).reduce(
        (sum, group) => sum + Number(group.current_count || 0), 0
      );
      setAnimalCount(total);
    }

    if (financesResult.error) {
      setDataMessage("Erreur de lecture des finances : " + financesResult.error.message);
    } else {
      let totalExpenses = 0;
      let totalIncome = 0;

      (financesResult.data || []).forEach(transaction => {
        const amount = Number(transaction.amount || 0);
        const type = String(transaction.transaction_type || "").toLowerCase();

        if (["expense", "depense", "dépense", "sortie"].includes(type)) {
          totalExpenses += amount;
        }

        if (["income", "recette", "revenu", "entrée", "entree"].includes(type)) {
          totalIncome += amount;
        }
      });

      setExpenses(totalExpenses);
      setIncome(totalIncome);
    }
  }

  async function handleAuth(event) {
    event.preventDefault();
    setBusy(true);
    setAuthMessage("");

    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password
        });

        if (error) throw error;

        if (data.session) {
          setAuthMessage("Compte créé et connexion réussie.");
        } else {
          setAuthMessage(
            "Compte créé. Consultez votre boîte e-mail pour confirmer votre adresse avant de vous connecter."
          );
          setAuthMode("login");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) throw error;
      }
    } catch (error) {
      setAuthMessage(error.message || "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) setAuthMessage(error.message);
  }

  async function createFarm(event) {
    event.preventDefault();
    if (!farmName.trim()) return;

    setBusy(true);
    setDataMessage("");

    const { error } = await supabase
      .from("farms")
      .insert({
        owner_id: user.id,
        name: farmName.trim(),
        location: farmLocation.trim() || null
      });

    if (error) {
      setDataMessage("Impossible d'enregistrer l'exploitation : " + error.message);
    } else {
      setFarmName("");
      setFarmLocation("");
      setShowFarmForm(false);
      await loadDashboard();
    }

    setBusy(false);
  }

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "grid", placeItems: "center",
        background: "#f5f7f5", color: "#174d35", fontFamily: "Arial"
      }}>
        Chargement de GESTFARM...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        fontFamily: "Arial,sans-serif",
        background: "#f5f7f5",
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        color: "#20352a"
      }}>
        <div style={{
          background: "white",
          width: "100%",
          maxWidth: 420,
          padding: 28,
          borderRadius: 15,
          boxShadow: "0 2px 12px #173c1715"
        }}>
          <div style={{ textAlign: "center", marginBottom: 25 }}>
            <div style={{
              fontSize: 27, fontWeight: 800, letterSpacing: 1,
              color: "#174d35"
            }}>GESTFARM</div>
            <div style={{ fontSize: 12, color: "#718078" }}>
              by kenfack sobtia
            </div>
            <h2 style={{ color: "#174d35", marginTop: 25 }}>
              {authMode === "login" ? "Connexion" : "Créer un compte"}
            </h2>
            <p style={{ color: "#718078", fontSize: 14 }}>
              Votre espace de gestion des élevages
            </p>
          </div>

          <form onSubmit={handleAuth}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 7 }}>
              Adresse e-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Votre adresse e-mail"
              style={{
                width: "100%", boxSizing: "border-box", padding: 13,
                border: "1px solid #dce5de", borderRadius: 8,
                marginBottom: 16, fontSize: 15
              }}
            />

            <label style={{ display: "block", fontSize: 13, marginBottom: 7 }}>
              Mot de passe
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Au moins 6 caractères"
              style={{
                width: "100%", boxSizing: "border-box", padding: 13,
                border: "1px solid #dce5de", borderRadius: 8,
                marginBottom: 18, fontSize: 15
              }}
            />

            <button
              type="submit"
              disabled={busy}
              style={{
                width: "100%", background: "#24734d", color: "white",
                border: 0, padding: 14, borderRadius: 9,
                fontWeight: 600, fontSize: 15, opacity: busy ? 0.6 : 1
              }}
            >
              {busy ? "Veuillez patienter..." :
                authMode === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>

          {authMessage && (
            <p style={{
              marginTop: 15, fontSize: 13, color: "#53695b",
              lineHeight: 1.5
            }}>{authMessage}</p>
          )}

          <div style={{
            textAlign: "center", marginTop: 22, fontSize: 14
          }}>
            {authMode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
            <button
              onClick={() => {
                setAuthMode(authMode === "login" ? "signup" : "login");
                setAuthMessage("");
              }}
              style={{
                border: 0, background: "transparent",
                color: "#24734d", fontWeight: 700
              }}
            >
              {authMode === "login" ? "Créer un compte" : "Se connecter"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "Arial,sans-serif",
      background: "#f5f7f5",
      minHeight: "100vh",
      color: "#20352a"
    }}>
      <header style={{
        background: "#174d35", color: "white", padding: "17px 22px",
        display: "flex", justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1 }}>
            GESTFARM
          </div>
          <div style={{ fontSize: 11, color: "#c8dfcf" }}>
            by kenfack sobtia
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={handleLogout}
            title="Déconnexion"
            style={{
              background: "transparent", border: 0,
              color: "white", cursor: "pointer"
            }}
          >
            <LogOut size={21} />
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: "transparent", border: 0,
              color: "white", fontSize: 24
            }}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <nav style={{
          background: "#fff", padding: 12, display: "grid", gap: 8
        }}>
          {navigation.map(item => (
            <button
              key={item.name}
              onClick={() => {
                setActive(item.name);
                setMenuOpen(false);
              }}
              style={{
                padding: 12, textAlign: "left", border: 0,
                borderRadius: 8,
                background: active === item.name ? "#e5f1e8" : "white",
                color: "#174d35"
              }}
            >
              {item.name}
            </button>
          ))}
        </nav>
      )}

      <main style={{ padding: 20, maxWidth: 1100, margin: "auto" }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", gap: 10, flexWrap: "wrap"
        }}>
          <div>
            <p style={{ color: "#6b7c70", fontSize: 13 }}>
              GESTION INTELLIGENTE DES ÉLEVAGES
            </p>
            <h1 style={{ fontSize: 25, margin: "5px 0" }}>{active}</h1>
            <p style={{ color: "#718078", fontSize: 14 }}>
              Bienvenue dans votre espace de gestion.
            </p>
          </div>

          <button
            onClick={() => setShowFarmForm(!showFarmForm)}
            style={{
              background: "#24734d", color: "white", border: 0,
              padding: "12px 16px", borderRadius: 9, fontWeight: 600
            }}
          >
            <Plus size={16} style={{ verticalAlign: "middle" }} />
            {" "}Nouvel élevage
          </button>
        </div>

        {showFarmForm && (
          <form
            onSubmit={createFarm}
            style={{
              background: "white", padding: 18, borderRadius: 12,
              marginTop: 18, border: "1px solid #e8eee9"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Enregistrer une exploitation</h3>

            <input
              required
              value={farmName}
              onChange={e => setFarmName(e.target.value)}
              placeholder="Nom de l'exploitation"
              style={{
                width: "100%", boxSizing: "border-box", padding: 12,
                border: "1px solid #dce5de", borderRadius: 8,
                marginBottom: 10
              }}
            />

            <input
              value={farmLocation}
              onChange={e => setFarmLocation(e.target.value)}
              placeholder="Localisation (facultatif)"
              style={{
                width: "100%", boxSizing: "border-box", padding: 12,
                border: "1px solid #dce5de", borderRadius: 8,
                marginBottom: 12
              }}
            />

            <button
              type="submit"
              disabled={busy}
              style={{
                background: "#24734d", color: "white", border: 0,
                padding: "11px 16px", borderRadius: 8
              }}
            >
              {busy ? "Enregistrement..." : "Enregistrer"}
            </button>

            <button
              type="button"
              onClick={() => setShowFarmForm(false)}
              style={{
                background: "transparent", color: "#53695b",
                border: 0, padding: 11
              }}
            >
              Annuler
            </button>
          </form>
        )}

        {dataMessage && (
          <p style={{
            color: "#a13c36", background: "#fff0ef",
            padding: 12, borderRadius: 8, fontSize: 13
          }}>{dataMessage}</p>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))",
          gap: 12, marginTop: 25
        }}>
          {[
            ["Élevages actifs", String(farms.length), Sprout],
            ["Animaux", animalCount.toLocaleString("fr-FR"), Bird],
            ["Dépenses", expenses.toLocaleString("fr-FR") + " FCFA", Wallet],
            ["Recettes", income.toLocaleString("fr-FR") + " FCFA", TrendingUp]
          ].map(([label, value, Icon]) => (
            <div key={label} style={{
              background: "white", padding: 17, borderRadius: 12,
              boxShadow: "0 2px 8px #173c1710"
            }}>
              <Icon color="#24734d" size={22} />
              <div style={{
                fontSize: 12, color: "#718078", marginTop: 12
              }}>{label}</div>
              <strong style={{ fontSize: 22 }}>{value}</strong>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 19, marginTop: 30 }}>
          Mes filières d'élevage
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
          gap: 14
        }}>
          {species.map(s => {
            const Icon = s.icon;
            const matchingFarms = farms.filter(farm =>
              (farm.name || "").toLowerCase().includes(
                s.name.toLowerCase()
              )
            );

            return (
              <div key={s.name} style={{
                background: "white", padding: 19, borderRadius: 13,
                border: "1px solid #e8eee9"
              }}>
                <div style={{
                  background: s.color + "20", width: 43, height: 43,
                  borderRadius: 12, display: "grid", placeItems: "center"
                }}>
                  <Icon color={s.color} size={23} />
                </div>
                <h3 style={{ fontSize: 16 }}>{s.name}</h3>
                <p style={{ fontSize: 13, color: "#718078" }}>
                  {matchingFarms.length} exploitation(s) correspondante(s)
                </p>
                <button
                  onClick={() => setActive(s.name)}
                  style={{
                    border: 0, background: "transparent",
                    color: "#24734d", fontWeight: 600, padding: 0
                  }}
                >
                  Consulter <ChevronRight size={15} style={{
                    verticalAlign: "middle"
                  }} />
                </button>
              </div>
            );
          })}
        </div>

        {active === "Mes élevages" && (
          <div style={{ marginTop: 25 }}>
            <h2 style={{ fontSize: 19 }}>Exploitations enregistrées</h2>
            {farms.length === 0 ? (
              <p style={{ color: "#718078" }}>
                Aucune exploitation enregistrée pour le moment.
              </p>
            ) : farms.map(farm => (
              <div key={farm.id} style={{
                background: "white", padding: 17, borderRadius: 10,
                marginBottom: 10, border: "1px solid #e8eee9"
              }}>
                <strong>{farm.name}</strong>
                <p style={{
                  color: "#718078", fontSize: 13, marginBottom: 0
                }}>
                  {farm.location || "Localisation non renseignée"}
                </p>
              </div>
            ))}
          </div>
        )}

        <div style={{
          marginTop: 25, background: "#e8f2eb",
          padding: 20, borderRadius: 13
        }}>
          <h3 style={{ marginTop: 0 }}>
            Votre exploitation, mieux pilotée.
          </h3>
          <p style={{
            fontSize: 14, lineHeight: 1.6, color: "#53695b"
          }}>
            GESTFARM vous accompagne dans le suivi technique et économique
            de vos élevages : performances, alimentation, santé,
            dépenses et rentabilité.
          </p>
        </div>

        <footer style={{
          textAlign: "center", padding: 30,
          color: "#849188", fontSize: 12
        }}>
          GESTFARM by kenfack sobtia · Version 1.0
        </footer>
      </main>
    </div>
  );
}
