
import React, { useState } from "react";
import {
  LayoutDashboard, Bird, Rabbit, PiggyBank,
  Wallet, Package, Activity, Menu, X,
  TrendingUp, Users, Bell, Settings,
  ChevronRight, Plus, Sprout
} from "lucide-react";

const species = [
  { name: "Poulets de chair", icon: Bird, color: "#e9a23b", count: 0 },
  { name: "Poules pondeuses", icon: Bird, color: "#4b9b75", count: 0 },
  { name: "Lapins", icon: Rabbit, color: "#9b83c9", count: 0 },
  { name: "Porcs", icon: PiggyBank, color: "#d77d83", count: 0 }
];

export default function App() {
  const [active, setActive] = useState("Tableau de bord");
  const [menuOpen, setMenuOpen] = useState(false);

  const navigation = [
    { name: "Tableau de bord", icon: LayoutDashboard },
    { name: "Mes élevages", icon: Sprout },
    { name: "Suivi technique", icon: Activity },
    { name: "Finances", icon: Wallet },
    { name: "Stocks", icon: Package },
    { name: "Rapports", icon: TrendingUp }
  ];

  return (
    <div style={{fontFamily:"Arial,sans-serif",background:"#f5f7f5",minHeight:"100vh",color:"#20352a"}}>
      <header style={{background:"#174d35",color:"white",padding:"17px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:24,fontWeight:800,letterSpacing:1}}>GESTFARM</div>
          <div style={{fontSize:11,color:"#c8dfcf"}}>by kenfack sobtia</div>
        </div>
        <button onClick={()=>setMenuOpen(!menuOpen)} style={{background:"transparent",border:0,color:"white",fontSize:24}}>
          {menuOpen ? <X/> : <Menu/>}
        </button>
      </header>

      {menuOpen && <nav style={{background:"#fff",padding:12,display:"grid",gap:8}}>
        {navigation.map(item=><button key={item.name} onClick={()=>{setActive(item.name);setMenuOpen(false)}} style={{padding:12,textAlign:"left",border:0,borderRadius:8,background:active===item.name?"#e5f1e8":"white",color:"#174d35"}}>
          {item.name}
        </button>)}
      </nav>}

      <main style={{padding:20,maxWidth:1100,margin:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div>
            <p style={{color:"#6b7c70",fontSize:13}}>GESTION INTELLIGENTE DES ÉLEVAGES</p>
            <h1 style={{fontSize:25,margin:"5px 0"}}>{active}</h1>
            <p style={{color:"#718078",fontSize:14}}>Bienvenue dans votre espace de gestion.</p>
          </div>
          <button onClick={()=>alert("Le module sera bientôt disponible.")} style={{background:"#24734d",color:"white",border:0,padding:"12px 16px",borderRadius:9,fontWeight:600}}>
            <Plus size={16} style={{verticalAlign:"middle"}}/> Nouvel élevage
          </button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:12,marginTop:25}}>
          {[
            ["Élevages actifs","0",Sprout],
            ["Animaux","0",Bird],
            ["Dépenses","0 FCFA",Wallet],
            ["Recettes","0 FCFA",TrendingUp]
          ].map(([label,value,Icon])=><div key={label} style={{background:"white",padding:17,borderRadius:12,boxShadow:"0 2px 8px #173c1710"}}>
            <Icon color="#24734d" size={22}/>
            <div style={{fontSize:12,color:"#718078",marginTop:12}}>{label}</div>
            <strong style={{fontSize:22}}>{value}</strong>
          </div>)}
        </div>

        <h2 style={{fontSize:19,marginTop:30}}>Mes filières d'élevage</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14}}>
          {species.map(s=><div key={s.name} style={{background:"white",padding:19,borderRadius:13,border:"1px solid #e8eee9"}}>
            <div style={{background:s.color+"20",width:43,height:43,borderRadius:12,display:"grid",placeItems:"center"}}>
              <s.icon color={s.color} size={23}/>
            </div>
            <h3 style={{fontSize:16}}>{s.name}</h3>
            <p style={{fontSize:13,color:"#718078"}}>0 lot enregistré</p>
            <button onClick={()=>setActive(s.name)} style={{border:0,background:"transparent",color:"#24734d",fontWeight:600,padding:0}}>
              Consulter <ChevronRight size={15} style={{verticalAlign:"middle"}}/>
            </button>
          </div>)}
        </div>

        <div style={{marginTop:25,background:"#e8f2eb",padding:20,borderRadius:13}}>
          <h3 style={{marginTop:0}}>Votre exploitation, mieux pilotée.</h3>
          <p style={{fontSize:14,lineHeight:1.6,color:"#53695b"}}>
            GESTFARM vous accompagne dans le suivi technique et économique de vos élevages : performances, alimentation, santé, dépenses et rentabilité.
          </p>
        </div>

        <footer style={{textAlign:"center",padding:30,color:"#849188",fontSize:12}}>
          GESTFARM by kenfack sobtia · Version 1.0
        </footer>
      </main>
    </div>
  );
}
