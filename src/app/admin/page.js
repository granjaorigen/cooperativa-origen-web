"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const fmt = (n) => "$" + Math.round(n).toLocaleString("es-CL");
const CATEGORIES = [
  { id: "frutas", name: "Frutas y Verduras", icon: "🥬" },
  { id: "abarrotes", name: "Abarrotes", icon: "🛒" },
  { id: "lacteos", name: "Lácteos", icon: "🧀" },
  { id: "carnes", name: "Carnes", icon: "🥩" },
  { id: "aseo", name: "Productos de Aseo", icon: "🧴" },
  { id: "ecorioclaro", name: "Producción Eco Río Claro", icon: "🌿" },
];

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);

  // Data
  const [products, setProducts] = useState([]);
  const [cycle, setCycle] = useState(null);
  const [allCycles, setAllCycles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [members, setMembers] = useState([]);

  // Forms
  const [editProd, setEditProd] = useState(null);
  const [newProd, setNewProd] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // Check admin & load data
  useEffect(() => {
    if (!session) return;
    const load = async () => {
      const { data: m } = await supabase.from("members").select("*").eq("email", session.user.email).single();
      if (!m || !m.is_admin) { setMember(null); setLoading(false); return; }
      setMember(m);

      const { data: prods } = await supabase.from("products").select("*").order("name");
      setProducts(prods || []);

      const { data: cycles } = await supabase.from("cycles").select("*").order("created_at", { ascending: false });
      setAllCycles(cycles || []);
      const activeCycle = cycles?.find(c => c.status === "open") || cycles?.[0];
      setCycle(activeCycle);

      const { data: allOrders } = await supabase.from("orders").select("*, order_items(*), members(full_name, email)").order("created_at", { ascending: false });
      setOrders(allOrders || []);

      const { data: allMembers } = await supabase.from("members").select("*").order("full_name");
      setMembers(allMembers || []);
    };
    load();
  }, [session]);

  const handleLogout = async () => { await supabase.auth.signOut(); };

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#121212", color: "#fff" }}><span style={{ fontSize: 48 }}>⚙️</span></div>;

  if (!session) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#121212", color: "#fff", padding: 20 }}>
      <div style={{ textAlign: "center" }}>
        <h2>Acceso Administrador</h2>
        <p style={{ color: "#888", margin: "12px 0 20px" }}>Debes iniciar sesión primero como cooperado y tener permisos de administrador.</p>
        <Link href="/catalogo" style={{ background: "var(--gold)", color: "#1a1a1a", padding: "12px 24px", borderRadius: 10, fontWeight: 600, display: "inline-block" }}>Ir al Login</Link>
      </div>
    </div>
  );

  if (!member?.is_admin) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#121212", color: "#fff", padding: 20 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2>Sin permisos de administrador</h2>
        <p style={{ color: "#888", margin: "12px 0 20px" }}>Tu cuenta ({session.user.email}) no tiene permisos de administrador.</p>
        <Link href="/catalogo" style={{ background: "var(--green-700)", color: "#fff", padding: "12px 24px", borderRadius: 10, fontWeight: 600, display: "inline-block" }}>Volver al catálogo</Link>
      </div>
    </div>
  );

  // ---- Data helpers ----
  const cycleOrders = orders.filter(o => o.cycle_id === cycle?.id);
  const totalRevenue = cycleOrders.reduce((s, o) => s + o.total, 0);
  const uniqueUsers = new Set(cycleOrders.map(o => o.member_id)).size;

  const consolidated = {};
  cycleOrders.forEach(o => {
    o.order_items?.forEach(it => {
      if (!consolidated[it.product_id]) consolidated[it.product_id] = { ...it, totalQty: 0, totalAmount: 0 };
      consolidated[it.product_id].totalQty += it.quantity;
      consolidated[it.product_id].totalAmount += it.subtotal;
    });
  });

  // ---- Actions ----
  const toggleCycle = async () => {
    const newStatus = cycle.status === "open" ? "closed" : "open";
    await supabase.from("cycles").update({ status: newStatus }).eq("id", cycle.id);
    setCycle({ ...cycle, status: newStatus });
    showToast(newStatus === "open" ? "Ciclo abierto" : "Ciclo cerrado");
  };

  const createNewCycle = async () => {
    const today = new Date();
    const end = new Date(today); end.setDate(end.getDate() + 14);
    const { data } = await supabase.from("cycles").insert({
      name: `Ciclo ${today.toLocaleDateString("es-CL", { month: "long" })} Q${Math.ceil(today.getDate() / 15)} ${today.getFullYear()}`,
      status: "open",
      start_date: today.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10)
    }).select().single();
    if (data) { setCycle(data); setAllCycles([data, ...allCycles]); showToast("Nuevo ciclo creado"); }
  };

  const saveProduct = async (prod) => {
    if (prod.id) {
      await supabase.from("products").update({ name: prod.name, category_id: prod.category_id, unit: prod.unit, price: prod.price, stock: prod.stock, is_active: prod.is_active }).eq("id", prod.id);
      setProducts(products.map(p => p.id === prod.id ? { ...p, ...prod } : p));
      showToast("Producto actualizado");
    } else {
      const { data } = await supabase.from("products").insert({ name: prod.name, category_id: prod.category_id, unit: prod.unit, price: prod.price, stock: prod.stock, is_active: true }).select().single();
      if (data) setProducts([...products, data]);
      showToast("Producto agregado");
    }
    setEditProd(null); setNewProd(false);
  };

  const deleteProduct = async (id) => {
    await supabase.from("products").delete().eq("id", id);
    setProducts(products.filter(p => p.id !== id));
    showToast("Producto eliminado");
  };

  const exportCSV = () => {
    const rows = [["Producto", "Unidad", "Precio Unitario", "Cantidad Total", "Monto Total"]];
    Object.values(consolidated).forEach(c => rows.push([c.product_name, c.product_unit, c.price, c.totalQty, c.totalAmount]));
    rows.push(["", "", "", "TOTAL", totalRevenue]);
    rows.push(["", "", "", "Margen 15%", Math.round(totalRevenue * 0.15)]);
    const blob = new Blob(["\uFEFF" + rows.map(r => r.join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `pedido_consolidado_${cycle?.name?.replace(/ /g, "_") || "export"}.csv`;
    a.click(); showToast("CSV exportado");
  };

  const s = { bg: "#1e1e1e", border: "1px solid #333", radius: 12 };

  return (
    <div style={{ minHeight: "100vh", background: "#121212", color: "#e0e0e0" }}>
      {toast && <div className="toast" style={{ position: "fixed", top: 16, right: 16, zIndex: 999, background: "var(--green-700)", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>✅ {toast}</div>}

      {/* Header */}
      <div style={{ background: "#1a1a1a", borderBottom: "1px solid #333", padding: "12px 20px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>⚙️</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)" }}>Admin — Cooperativa Origen</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/catalogo" style={pillBtnDark}>🛒 Ver catálogo</Link>
            <button onClick={handleLogout} style={pillBtnDark}>Salir</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ maxWidth: 1000, margin: "16px auto", padding: "0 20px", display: "flex", gap: 8, overflowX: "auto" }}>
        {[["dashboard", "📊 Dashboard"], ["products", "📦 Productos"], ["orders", "📋 Pedidos"], ["consolidated", "🏭 Consolidado"], ["members", "👥 Miembros"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: tab === key ? 700 : 400, background: tab === key ? "var(--gold)" : "#222", color: tab === key ? "#1a1a1a" : "#999", cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px 40px" }}>
        {/* DASHBOARD */}
        {tab === "dashboard" && (<>
          <div style={{ background: s.bg, borderRadius: s.radius, padding: 20, marginBottom: 16, border: s.border }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "#888", letterSpacing: 1 }}>CICLO ACTUAL</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{cycle?.name || "Sin ciclo"}</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{cycle ? `${cycle.start_date} → ${cycle.end_date} · Estado: ${cycle.status}` : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {cycle && <button onClick={toggleCycle} style={{ ...pillBtnDark, background: cycle.status === "open" ? "var(--red)" : "var(--green-700)", color: "#fff" }}>{cycle.status === "open" ? "🔒 Cerrar" : "📦 Abrir"}</button>}
                <button onClick={createNewCycle} style={{ ...pillBtnDark, background: "#333", color: "var(--gold)" }}>+ Nuevo Ciclo</button>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {[{ l: "Pedidos ciclo", v: cycleOrders.length, i: "📋" }, { l: "Cooperados activos", v: uniqueUsers, i: "👥" }, { l: "Venta total", v: fmt(totalRevenue), i: "💰" }, { l: "Productos activos", v: products.filter(p => p.is_active).length, i: "📦" }, { l: "Total miembros", v: members.length, i: "🤝" }].map((x, i) => (
              <div key={i} style={{ background: s.bg, borderRadius: s.radius, padding: 20, border: s.border }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{x.i}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--gold)" }}>{x.v}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{x.l}</div>
              </div>
            ))}
          </div>
        </>)}

        {/* PRODUCTS */}
        {tab === "products" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ color: "var(--gold)" }}>Catálogo ({products.length} productos)</h3>
            <button onClick={() => { setNewProd(true); setEditProd(null); }} style={{ ...pillBtnDark, background: "var(--green-700)", color: "#fff" }}>+ Agregar</button>
          </div>
          {(newProd || editProd) && (
            <div style={{ background: "#2a2a2a", borderRadius: 10, padding: 16, marginBottom: 16, border: "1px solid #444" }}>
              <ProductForm product={editProd} onSave={saveProduct} onCancel={() => { setEditProd(null); setNewProd(false); }} />
            </div>
          )}
          {products.map(p => {
            const cat = CATEGORIES.find(c => c.id === p.category_id);
            return (
              <div key={p.id} style={{ background: s.bg, borderRadius: 10, padding: "12px 16px", marginBottom: 8, border: s.border, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: p.is_active ? 1 : 0.5 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{cat?.icon} {p.name}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>{fmt(p.price)} / {p.unit} — Stock: {p.stock}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setEditProd(p); setNewProd(false); }} style={{ ...pillBtnDark, fontSize: 11 }}>✏️</button>
                  <button onClick={async () => { await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id); setProducts(products.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x)); }} style={{ ...pillBtnDark, color: p.is_active ? "var(--red)" : "var(--green-700)", fontSize: 11 }}>{p.is_active ? "⏸" : "▶"}</button>
                  <button onClick={() => deleteProduct(p.id)} style={{ ...pillBtnDark, color: "var(--red)", fontSize: 11 }}>🗑</button>
                </div>
              </div>
            );
          })}
        </>)}

        {/* ORDERS */}
        {tab === "orders" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ color: "var(--gold)" }}>Pedidos: {cycle?.name}</h3>
            <select style={{ background: "#333", color: "#fff", border: "1px solid #444", borderRadius: 8, padding: "6px 12px", fontSize: 12 }} value={cycle?.id || ""} onChange={e => setCycle(allCycles.find(c => c.id === e.target.value))}>
              {allCycles.map(c => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
            </select>
          </div>
          {cycleOrders.length === 0 ? <p style={{ color: "#888" }}>Sin pedidos en este ciclo.</p> :
            cycleOrders.map(o => (
              <div key={o.id} style={{ background: s.bg, borderRadius: 10, padding: 16, marginBottom: 10, border: s.border }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 4 }}>
                  <div><strong>{o.members?.full_name}</strong> <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>{o.members?.email}</span></div>
                  <div style={{ fontSize: 12, color: "#888" }}>{new Date(o.created_at).toLocaleString("es-CL")}</div>
                </div>
                {o.order_items?.map((it, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#aaa", display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
                    <span>{it.product_name} × {it.quantity}</span><span>{fmt(it.subtotal)}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid #333", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <select style={{ background: "#333", color: "#fff", border: "1px solid #444", borderRadius: 6, padding: "4px 8px", fontSize: 11 }} value={o.status} onChange={async (e) => { await supabase.from("orders").update({ status: e.target.value }).eq("id", o.id); setOrders(orders.map(x => x.id === o.id ? { ...x, status: e.target.value } : x)); showToast("Estado actualizado"); }}>
                    {["confirmado", "preparando", "listo", "entregado", "cancelado"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span style={{ fontWeight: 700, color: "var(--gold)" }}>{fmt(o.total)}</span>
                </div>
              </div>
            ))
          }
        </>)}

        {/* CONSOLIDATED */}
        {tab === "consolidated" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ color: "var(--gold)" }}>Orden Consolidada — Eco Río Claro</h3>
            <button onClick={exportCSV} style={{ ...pillBtnDark, background: "var(--green-700)", color: "#fff" }}>📥 Exportar CSV</button>
          </div>
          {Object.keys(consolidated).length === 0 ? <p style={{ color: "#888" }}>Sin pedidos para consolidar.</p> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#222" }}>
                  {["Producto", "Unidad", "Precio Unit.", "Cant. Total", "Monto Total"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "var(--gold)", fontWeight: 600, borderBottom: "1px solid #444" }}>{h}</th>)}
                </tr></thead>
                <tbody>{Object.values(consolidated).map((c, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#1a1a1a" : s.bg }}>
                    <td style={{ padding: "8px 12px" }}>{c.product_name}</td>
                    <td style={{ padding: "8px 12px", color: "#888" }}>{c.product_unit}</td>
                    <td style={{ padding: "8px 12px" }}>{fmt(c.price)}</td>
                    <td style={{ padding: "8px 12px", fontWeight: 700 }}>{c.totalQty}</td>
                    <td style={{ padding: "8px 12px", fontWeight: 700, color: "var(--gold)" }}>{fmt(c.totalAmount)}</td>
                  </tr>
                ))}</tbody>
                <tfoot><tr style={{ background: "var(--green-700)" }}>
                  <td colSpan={3} style={{ padding: "10px 12px", fontWeight: 700, color: "#fff" }}>TOTAL</td>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: "#fff" }}>{Object.values(consolidated).reduce((s, c) => s + c.totalQty, 0)}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: "#fff" }}>{fmt(totalRevenue)}</td>
                </tr></tfoot>
              </table>
            </div>
          )}
          <div style={{ background: s.bg, borderRadius: 10, padding: 16, marginTop: 16, border: s.border, fontSize: 14, color: "#ccc" }}>
            <strong>Resumen para Eco Río Claro:</strong> {cycleOrders.length} pedidos | {uniqueUsers} cooperados | Total: {fmt(totalRevenue)} | Margen 15%: {fmt(totalRevenue * 0.15)}
          </div>
        </>)}

        {/* MEMBERS */}
        {tab === "members" && (<>
          <h3 style={{ color: "var(--gold)", marginBottom: 16 }}>Miembros ({members.length})</h3>
          {members.map(m => (
            <div key={m.id} style={{ background: s.bg, borderRadius: 10, padding: "10px 16px", marginBottom: 6, border: s.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{m.full_name}</span>
                <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>{m.email}</span>
                {m.is_admin && <span style={{ marginLeft: 8, background: "var(--gold)", color: "#1a1a1a", padding: "1px 6px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>ADMIN</span>}
              </div>
              <span style={{ fontSize: 11, color: m.is_active ? "var(--green-500)" : "var(--red)" }}>{m.is_active ? "Activo" : "Inactivo"}</span>
            </div>
          ))}
        </>)}
      </div>
    </div>
  );
}

function ProductForm({ product, onSave, onCancel }) {
  const [f, setF] = useState(product || { name: "", category_id: "frutas", unit: "kg", price: 0, stock: 100, is_active: true });
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelDark}>Nombre</label>
          <input style={inputDark} value={f.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div><label style={labelDark}>Categoría</label>
          <select style={inputDark} value={f.category_id} onChange={e => set("category_id", e.target.value)}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select></div>
        <div><label style={labelDark}>Unidad</label><input style={inputDark} value={f.unit} onChange={e => set("unit", e.target.value)} /></div>
        <div><label style={labelDark}>Precio (CLP)</label><input style={inputDark} type="number" value={f.price} onChange={e => set("price", parseInt(e.target.value) || 0)} /></div>
        <div><label style={labelDark}>Stock</label><input style={inputDark} type="number" value={f.stock} onChange={e => set("stock", parseInt(e.target.value) || 0)} /></div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={onCancel} style={pillBtnDark}>Cancelar</button>
        <button onClick={() => { if (f.name) onSave(f); }} style={{ ...pillBtnDark, background: "var(--gold)", color: "#1a1a1a" }}>💾 Guardar</button>
      </div>
    </div>
  );
}

const pillBtnDark = { background: "#333", color: "#ccc", border: "none", borderRadius: 20, padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" };
const labelDark = { display: "block", fontSize: 12, fontWeight: 600, color: "#aaa", marginBottom: 4 };
const inputDark = { width: "100%", padding: "10px 12px", background: "#333", color: "#fff", border: "1px solid #444", borderRadius: 8, fontSize: 14, boxSizing: "border-box" };
