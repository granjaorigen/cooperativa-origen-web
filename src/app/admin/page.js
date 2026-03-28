"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const fmt = (n) => "$" + Math.round(n).toLocaleString("es-CL");
const fmtH = (h) => {
  const v = parseFloat(h) || 0;
  if (v === 0) return "0 hrs";
  return v.toFixed(2).replace(".", ",") + " hrs";
};

const CATEGORIES = [
  { id: "frutas", name: "Frutas y Verduras", icon: "🥬" },
  { id: "abarrotes", name: "Abarrotes", icon: "🛒" },
  { id: "lacteos", name: "Lacteos", icon: "🧀" },
  { id: "carnes", name: "Carnes", icon: "🥩" },
  { id: "aseo", name: "Productos de Aseo", icon: "🧴" },
  { id: "ecorioclaro", name: "Produccion Eco Rio Claro", icon: "🌿" },
];

const STATUS_LABELS = {
  pendiente_pago: { text: "Pendiente pago", bg: "#fff3cd", color: "#856404" },
  cobrar_en_caja: { text: "Cobrar en caja", bg: "#ffe0b2", color: "#e65100" },
  pagado: { text: "Pagado", bg: "#d4edda", color: "#155724" },
  preparando: { text: "Preparando", bg: "#d1ecf1", color: "#0c5460" },
  listo: { text: "Listo", bg: "#d4edda", color: "#155724" },
  entregado: { text: "Entregado", bg: "#e2e3e5", color: "#383d41" },
  cancelado: { text: "Cancelado", bg: "#f8d7da", color: "#721c24" },
};

function generatePickingDoc(order, hourValue) {
  const isCaja = order.status === "cobrar_en_caja" || order.payment_method === "cash";
  const isPaid = order.status === "pagado" || order.payment_method === "transfer";
  const paymentLabel = isPaid ? "PAGADO CON TRANSFERENCIA" : "COBRAR EN CAJA";
  const paymentColor = isPaid ? "#155724" : "#e65100";
  const paymentBg = isPaid ? "#d4edda" : "#ffe0b2";

  const itemsRows = order.order_items?.map(it => {
    const hrs = parseFloat(it.hours_subtotal) || 0;
    return "<tr><td style='padding:6px 10px;border-bottom:1px solid #ddd'>" + it.product_name + "</td><td style='padding:6px 10px;border-bottom:1px solid #ddd;text-align:center'>" + it.quantity + " " + it.product_unit + "</td><td style='padding:6px 10px;border-bottom:1px solid #ddd;text-align:right'>$" + (it.subtotal).toLocaleString("es-CL") + "</td><td style='padding:6px 10px;border-bottom:1px solid #ddd;text-align:center;width:40px'>[ ]</td></tr>";
  }).join("") || "";

  const totalHours = parseFloat(order.total_hours) || 0;
  const hoursUsed = parseFloat(order.hours_paid_with_balance) || 0;
  const hoursInMoney = parseFloat(order.hours_paid_with_money) || 0;
  const hoursMoneyValue = Math.round(hoursInMoney * hourValue);

  const html = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Pedido " + order.id.slice(0,8).toUpperCase() + "</title><style>body{font-family:Arial,sans-serif;margin:20px;color:#333}@media print{body{margin:10px}.no-print{display:none}}</style></head><body>" +
    "<div style='text-align:center;margin-bottom:20px'>" +
    "<h1 style='margin:0;font-size:22px'>Cooperativa Origen</h1>" +
    "<p style='margin:4px 0;font-size:13px;color:#888'>Documento de Picking</p>" +
    "</div>" +
    "<div style='background:" + paymentBg + ";border:3px solid " + paymentColor + ";border-radius:10px;padding:20px;text-align:center;margin-bottom:20px'>" +
    "<div style='font-size:28px;font-weight:900;color:" + paymentColor + "'>" + paymentLabel + "</div>" +
    "</div>" +
    "<table style='width:100%;margin-bottom:16px;font-size:14px'>" +
    "<tr><td><strong>Pedido:</strong> " + order.id.slice(0,8).toUpperCase() + "</td><td style='text-align:right'><strong>Fecha:</strong> " + new Date(order.created_at).toLocaleDateString("es-CL") + "</td></tr>" +
    "<tr><td><strong>Cooperado:</strong> " + (order.members?.full_name || "---") + "</td><td style='text-align:right'><strong>Email:</strong> " + (order.members?.email || "---") + "</td></tr>" +
    "</table>" +
    "<table style='width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px'>" +
    "<thead><tr style='background:#2d6a4f;color:#fff'><th style='padding:8px 10px;text-align:left'>Producto</th><th style='padding:8px 10px;text-align:center'>Cantidad</th><th style='padding:8px 10px;text-align:right'>Subtotal</th><th style='padding:8px 10px;text-align:center'>OK</th></tr></thead>" +
    "<tbody>" + itemsRows + "</tbody>" +
    "</table>" +
    "<div style='border-top:2px solid #333;padding-top:12px;font-size:14px'>" +
    "<div style='display:flex;justify-content:space-between;margin-bottom:4px'><span>Total productos:</span><strong>$" + order.total.toLocaleString("es-CL") + "</strong></div>" +
    (totalHours > 0 ? "<div style='display:flex;justify-content:space-between;margin-bottom:4px;color:#b5651d'><span>Horas operacionales:</span><strong>" + fmtH(totalHours) + "</strong></div>" : "") +
    (hoursUsed > 0 ? "<div style='display:flex;justify-content:space-between;margin-bottom:4px;color:#2d6a4f'><span>Horas pagadas con saldo:</span><strong>-" + fmtH(hoursUsed) + "</strong></div>" : "") +
    (hoursInMoney > 0 ? "<div style='display:flex;justify-content:space-between;margin-bottom:4px'><span>Horas a pagar en pesos (" + fmtH(hoursInMoney) + " x $" + hourValue.toLocaleString("es-CL") + "):</span><strong>$" + hoursMoneyValue.toLocaleString("es-CL") + "</strong></div>" : "") +
    "</div>" +
    (isCaja ? "<div style='margin-top:20px;border:2px dashed " + paymentColor + ";border-radius:10px;padding:16px;text-align:center'><div style='font-size:20px;font-weight:700;color:" + paymentColor + "'>MONTO A COBRAR: $" + order.total.toLocaleString("es-CL") + "</div></div>" : "") +
    "<div style='margin-top:30px;display:flex;justify-content:space-between;font-size:12px;color:#888'>" +
    "<span>Preparado por: _______________</span>" +
    "<span>Revisado por: _______________</span>" +
    "<span>Entregado por: _______________</span>" +
    "</div>" +
    "<div class='no-print' style='text-align:center;margin-top:30px'><button onclick='window.print()' style='background:#2d6a4f;color:#fff;border:none;border-radius:10px;padding:12px 32px;font-size:16px;cursor:pointer'>Imprimir</button></div>" +
    "</body></html>";

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
}

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [hourValue, setHourValue] = useState(3750);
  const [products, setProducts] = useState([]);
  const [cycle, setCycle] = useState(null);
  const [allCycles, setAllCycles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [members, setMembers] = useState([]);
  const [workHours, setWorkHours] = useState([]);
  const [editProd, setEditProd] = useState(null);
  const [newProd, setNewProd] = useState(false);
  const [showAddHours, setShowAddHours] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const refreshData = async () => {
    const { data: prods } = await supabase.from("products").select("*").order("name");
    setProducts(prods || []);
    const { data: cycles } = await supabase.from("cycles").select("*").order("created_at", { ascending: false });
    setAllCycles(cycles || []);
    setCycle(cycles?.find(c => c.status === "open") || cycles?.[0]);
    const { data: allOrders } = await supabase.from("orders").select("*, order_items(*), members(full_name, email, hours_balance)").order("created_at", { ascending: false });
    setOrders(allOrders || []);
    const { data: allMembers } = await supabase.from("members").select("*").order("full_name");
    setMembers(allMembers || []);
    const { data: wh } = await supabase.from("work_hours").select("*, members(full_name, email)").order("created_at", { ascending: false });
    setWorkHours(wh || []);
    const { data: sh } = await supabase.from("settings").select("value").eq("key", "hour_value_clp").single();
    if (sh) setHourValue(parseInt(sh.value));
  };

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      const { data: m } = await supabase.from("members").select("*").eq("email", session.user.email).single();
      if (!m || !m.is_admin) { setMember(null); setLoading(false); return; }
      setMember(m);
      await refreshData();
    };
    load();
  }, [session]);

  const handleLogout = async () => { await supabase.auth.signOut(); };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#121212", color: "#fff" }}>
        <span style={{ fontSize: 20 }}>Cargando...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#121212", color: "#fff", padding: 20 }}>
        <div style={{ textAlign: "center" }}>
          <h2>Acceso Administrador</h2>
          <p style={{ color: "#888", margin: "12px 0 20px" }}>Debes iniciar sesion primero.</p>
          <Link href="/catalogo" style={{ background: "#e8c547", color: "#1a1a1a", padding: "12px 24px", borderRadius: 10, fontWeight: 600, display: "inline-block" }}>Ir al Login</Link>
        </div>
      </div>
    );
  }

  if (!member || !member.is_admin) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#121212", color: "#fff", padding: 20 }}>
        <div style={{ textAlign: "center" }}>
          <h2>Sin permisos</h2>
          <Link href="/catalogo" style={{ background: "#2d6a4f", color: "#fff", padding: "12px 24px", borderRadius: 10, fontWeight: 600, display: "inline-block", marginTop: 16 }}>Volver</Link>
        </div>
      </div>
    );
  }

  const cycleOrders = orders.filter(o => o.cycle_id === cycle?.id);
  const totalRevenue = cycleOrders.reduce((s, o) => s + o.total, 0);
  const uniqueUsers = new Set(cycleOrders.map(o => o.member_id)).size;
  const pendingPayment = cycleOrders.filter(o => o.status === "pendiente_pago").length;
  const pendingCaja = cycleOrders.filter(o => o.status === "cobrar_en_caja").length;

  const consolidated = {};
  cycleOrders.filter(o => o.status !== "cancelado").forEach(o => {
    o.order_items?.forEach(it => {
      if (!consolidated[it.product_id]) {
        consolidated[it.product_id] = { ...it, totalQty: 0, totalAmount: 0, totalHours: 0 };
      }
      consolidated[it.product_id].totalQty += it.quantity;
      consolidated[it.product_id].totalAmount += it.subtotal;
      consolidated[it.product_id].totalHours += parseFloat(it.hours_subtotal) || 0;
    });
  });

  const toggleCycle = async () => {
    const ns = cycle.status === "open" ? "closed" : "open";
    await supabase.from("cycles").update({ status: ns }).eq("id", cycle.id);
    setCycle({ ...cycle, status: ns });
    showToast(ns === "open" ? "Ciclo abierto" : "Ciclo cerrado");
  };

  const createNewCycle = async () => {
    const t = new Date();
    const e = new Date(t);
    e.setDate(e.getDate() + 14);
    const name = "Ciclo " + t.toLocaleDateString("es-CL", { month: "long" }) + " Q" + Math.ceil(t.getDate() / 15) + " " + t.getFullYear();
    const { data } = await supabase.from("cycles").insert({ name: name, status: "open", start_date: t.toISOString().slice(0, 10), end_date: e.toISOString().slice(0, 10) }).select().single();
    if (data) { setCycle(data); setAllCycles([data, ...allCycles]); showToast("Nuevo ciclo creado"); }
  };

  const saveProduct = async (prod) => {
    if (prod.id) {
      await supabase.from("products").update({ name: prod.name, category_id: prod.category_id, unit: prod.unit, price: prod.price, stock: prod.stock, hours_component: prod.hours_component, is_active: prod.is_active }).eq("id", prod.id);
      setProducts(products.map(p => p.id === prod.id ? { ...p, ...prod } : p));
      showToast("Producto actualizado");
    } else {
      const { data } = await supabase.from("products").insert({ name: prod.name, category_id: prod.category_id, unit: prod.unit, price: prod.price, stock: prod.stock, hours_component: prod.hours_component || 0, is_active: true }).select().single();
      if (data) setProducts([...products, data]);
      showToast("Producto agregado");
    }
    setEditProd(null);
    setNewProd(false);
  };

  const deleteProduct = async (id) => {
    await supabase.from("products").delete().eq("id", id);
    setProducts(products.filter(p => p.id !== id));
    showToast("Producto eliminado");
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    showToast("Estado actualizado");
  };

  const handleTransferPayment = async (order) => {
    await supabase.from("orders").update({ status: "pagado", payment_method: "transfer" }).eq("id", order.id);
    setOrders(orders.map(o => o.id === order.id ? { ...o, status: "pagado", payment_method: "transfer" } : o));
    showToast("Pago por transferencia confirmado");
  };

  const handleCajaPayment = async (order) => {
    await supabase.from("orders").update({ status: "cobrar_en_caja", payment_method: "cash" }).eq("id", order.id);
    setOrders(orders.map(o => o.id === order.id ? { ...o, status: "cobrar_en_caja", payment_method: "cash" } : o));
    showToast("Marcado para cobrar en caja");
  };

  const confirmCajaPayment = async (order) => {
    await supabase.from("orders").update({ status: "pagado" }).eq("id", order.id);
    setOrders(orders.map(o => o.id === order.id ? { ...o, status: "pagado" } : o));
    showToast("Pago en caja confirmado");
  };

  const addWorkHoursForMember = async (memberId, hours, description, workDate) => {
    try {
      const { data, error } = await supabase.from("work_hours").insert({
        member_id: memberId,
        hours: parseFloat(hours),
        description: description,
        work_date: workDate,
        status: "aprobado",
        approved_by: member.id,
        approved_at: new Date().toISOString()
      }).select().single();
      if (error) { console.log("Error work_hours:", error); showToast("Error al registrar"); return; }
      const target = members.find(m => m.id === memberId);
      if (target) {
        const currentBalance = parseFloat(target.hours_balance) || 0;
        const newBalance = currentBalance + parseFloat(hours);
        const { error: errMember } = await supabase.from("members").update({ hours_balance: newBalance }).eq("id", memberId);
        if (errMember) { console.log("Error balance:", errMember); }
        setMembers(members.map(m => m.id === memberId ? { ...m, hours_balance: newBalance } : m));
      }
      const { data: wh } = await supabase.from("work_hours").select("*, members(full_name, email)").order("created_at", { ascending: false });
      setWorkHours(wh || []);
      showToast("Horas registradas y acreditadas");
    } catch (e) { console.log("Catch error:", e); showToast("Error inesperado"); }
    setShowAddHours(false);
  };

  const approveWorkHours = async (wh) => {
    await supabase.from("work_hours").update({ status: "aprobado", approved_by: member.id, approved_at: new Date().toISOString() }).eq("id", wh.id);
    const target = members.find(m => m.id === wh.member_id);
    if (target) {
      const newBalance = (parseFloat(target.hours_balance) || 0) + parseFloat(wh.hours);
      await supabase.from("members").update({ hours_balance: newBalance }).eq("id", wh.member_id);
      setMembers(members.map(m => m.id === wh.member_id ? { ...m, hours_balance: newBalance } : m));
    }
    setWorkHours(workHours.map(w => w.id === wh.id ? { ...w, status: "aprobado" } : w));
    showToast("Horas aprobadas");
  };

  const rejectWorkHours = async (wh) => {
    await supabase.from("work_hours").update({ status: "rechazado" }).eq("id", wh.id);
    setWorkHours(workHours.map(w => w.id === wh.id ? { ...w, status: "rechazado" } : w));
    showToast("Horas rechazadas");
  };

  const exportCSV = () => {
    const rows = [["Producto", "Unidad", "Precio Unit.", "Horas Unit.", "Cant. Total", "Monto Total", "Horas Total"]];
    Object.values(consolidated).forEach(c => {
      rows.push([c.product_name, c.product_unit, c.price, parseFloat(c.hours_component) || 0, c.totalQty, c.totalAmount, c.totalHours.toFixed(2)]);
    });
    rows.push(["", "", "", "", "TOTAL", totalRevenue, Object.values(consolidated).reduce((s, c) => s + c.totalHours, 0).toFixed(2)]);
    const blob = new Blob(["\uFEFF" + rows.map(r => r.join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "consolidado_" + (cycle?.name?.replace(/ /g, "_") || "export") + ".csv";
    a.click();
    showToast("CSV exportado");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#121212", color: "#e0e0e0" }}>
      {toast && (
        <div className="toast" style={{ position: "fixed", top: 16, right: 16, zIndex: 999, background: "#2d6a4f", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}

      <div style={{ background: "#1a1a1a", borderBottom: "1px solid #333", padding: "12px 20px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#e8c547" }}>Admin - Cooperativa Origen</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/catalogo" style={pillD}>Catalogo</Link>
            <button onClick={handleLogout} style={pillD}>Salir</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "16px auto", padding: "0 20px", display: "flex", gap: 8, overflowX: "auto" }}>
        {[["dashboard", "Dashboard"], ["products", "Productos"], ["orders", "Pedidos"], ["consolidated", "Consolidado"], ["hours", "Horas"], ["members", "Miembros"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: tab === key ? 700 : 400, background: tab === key ? "#e8c547" : "#222", color: tab === key ? "#1a1a1a" : "#999", cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px 40px" }}>

        {tab === "dashboard" && (
          <div>
            <div style={{ background: "#1e1e1e", borderRadius: 12, padding: 20, marginBottom: 16, border: "1px solid #333" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#888", letterSpacing: 1 }}>CICLO ACTUAL</div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{cycle?.name || "Sin ciclo"}</div>
                  <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{cycle ? cycle.start_date + " - " + cycle.end_date + " | " + cycle.status : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {cycle && <button onClick={toggleCycle} style={{ ...pillD, background: cycle.status === "open" ? "#e63946" : "#2d6a4f", color: "#fff" }}>{cycle.status === "open" ? "Cerrar" : "Abrir"}</button>}
                  <button onClick={createNewCycle} style={{ ...pillD, color: "#e8c547" }}>+ Nuevo Ciclo</button>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              {[
                { l: "Pedidos", v: cycleOrders.length },
                { l: "Pago pendiente", v: pendingPayment },
                { l: "Cobrar en caja", v: pendingCaja },
                { l: "Cooperados", v: uniqueUsers },
                { l: "Venta total", v: fmt(totalRevenue) },
                { l: "Productos", v: products.filter(p => p.is_active).length },
              ].map((x, i) => (
                <div key={i} style={{ background: "#1e1e1e", borderRadius: 12, padding: 16, border: "1px solid #333" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#e8c547" }}>{x.v}</div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{x.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "products" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ color: "#e8c547" }}>Catalogo ({products.length})</h3>
              <button onClick={() => { setNewProd(true); setEditProd(null); }} style={{ ...pillD, background: "#2d6a4f", color: "#fff" }}>+ Agregar</button>
            </div>
            {(newProd || editProd) && <ProductForm product={editProd} onSave={saveProduct} onCancel={() => { setEditProd(null); setNewProd(false); }} />}
            {products.map(p => {
              const cat = CATEGORIES.find(c => c.id === p.category_id);
              const hc = parseFloat(p.hours_component) || 0;
              return (
                <div key={p.id} style={{ background: "#1e1e1e", borderRadius: 10, padding: "12px 16px", marginBottom: 6, border: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: p.is_active ? 1 : 0.5 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{cat?.icon} {p.name}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{fmt(p.price)} {hc > 0 ? "+ " + fmtH(hc) : ""} / {p.unit} | Stock: {p.stock}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setEditProd(p); setNewProd(false); }} style={{ ...pillD, fontSize: 11 }}>Editar</button>
                    <button onClick={async () => { await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id); setProducts(products.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x)); }} style={{ ...pillD, color: p.is_active ? "#e63946" : "#2d6a4f", fontSize: 11 }}>{p.is_active ? "Pausar" : "Activar"}</button>
                    <button onClick={() => deleteProduct(p.id)} style={{ ...pillD, color: "#e63946", fontSize: 11 }}>Borrar</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "orders" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <h3 style={{ color: "#e8c547" }}>Pedidos: {cycle?.name}</h3>
              <select style={selectDark} value={cycle?.id || ""} onChange={e => setCycle(allCycles.find(c => c.id === e.target.value))}>
                {allCycles.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.status})</option>))}
              </select>
            </div>
            {cycleOrders.length === 0 ? (<p style={{ color: "#888" }}>Sin pedidos.</p>) : cycleOrders.map(o => {
              const st = STATUS_LABELS[o.status] || STATUS_LABELS.pendiente_pago;
              return (
                <div key={o.id} style={{ background: "#1e1e1e", borderRadius: 10, padding: 16, marginBottom: 10, border: "1px solid #333" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 4 }}>
                    <div>
                      <strong>{o.members?.full_name}</strong>
                      <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>{o.members?.email}</span>
                    </div>
                    <span style={{ fontSize: 11, background: st.bg, color: st.color, padding: "2px 8px", borderRadius: 20 }}>{st.text}</span>
                  </div>
                  {o.order_items?.map((it, i) => (
                    <div key={i} style={{ fontSize: 13, color: "#aaa", display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
                      <span>{it.product_name} x {it.quantity}</span>
                      <span>{fmt(it.subtotal)} {parseFloat(it.hours_subtotal) > 0 ? "+ " + fmtH(it.hours_subtotal) : ""}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid #333", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <span style={{ fontWeight: 700, color: "#e8c547" }}>{fmt(o.total)}</span>
                      {parseFloat(o.total_hours) > 0 && (<span style={{ color: "#b5651d", fontSize: 12, marginLeft: 8 }}>({fmtH(o.total_hours)})</span>)}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button onClick={() => generatePickingDoc(o, hourValue)} style={{ ...pillD, background: "#444", color: "#fff", fontSize: 11 }}>Imprimir</button>
                      {o.status === "pendiente_pago" && (
                        <>
                          <button onClick={() => handleTransferPayment(o)} style={{ ...pillD, background: "#2d6a4f", color: "#fff", fontSize: 11 }}>Transferencia</button>
                          <button onClick={() => handleCajaPayment(o)} style={{ ...pillD, background: "#e65100", color: "#fff", fontSize: 11 }}>Cobrar en caja</button>
                        </>
                      )}
                      {o.status === "cobrar_en_caja" && (
                        <button onClick={() => confirmCajaPayment(o)} style={{ ...pillD, background: "#2d6a4f", color: "#fff", fontSize: 11 }}>Confirmar pago caja</button>
                      )}
                      {(o.status === "pagado" || o.status === "preparando" || o.status === "listo") && (
                        <select style={selectDark} value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)}>
                          <option value="pagado">pagado</option>
                          <option value="preparando">preparando</option>
                          <option value="listo">listo</option>
                          <option value="entregado">entregado</option>
                          <option value="cancelado">cancelado</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "consolidated" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <h3 style={{ color: "#e8c547" }}>Consolidado - Eco Rio Claro</h3>
              <button onClick={exportCSV} style={{ ...pillD, background: "#2d6a4f", color: "#fff" }}>Exportar CSV</button>
            </div>
            {Object.keys(consolidated).length === 0 ? (<p style={{ color: "#888" }}>Sin pedidos.</p>) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr style={{ background: "#222" }}>
                    {["Producto", "Unidad", "$ Unit.", "Hrs Unit.", "Cant.", "$ Total", "Hrs Total"].map(h => (<th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#e8c547", fontWeight: 600, borderBottom: "1px solid #444", fontSize: 11 }}>{h}</th>))}
                  </tr></thead>
                  <tbody>{Object.values(consolidated).map((c, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#1a1a1a" : "#1e1e1e" }}>
                      <td style={{ padding: "6px 10px" }}>{c.product_name}</td>
                      <td style={{ padding: "6px 10px", color: "#888" }}>{c.product_unit}</td>
                      <td style={{ padding: "6px 10px" }}>{fmt(c.price)}</td>
                      <td style={{ padding: "6px 10px", color: "#b5651d" }}>{fmtH(parseFloat(c.hours_component) || 0)}</td>
                      <td style={{ padding: "6px 10px", fontWeight: 700 }}>{c.totalQty}</td>
                      <td style={{ padding: "6px 10px", fontWeight: 700, color: "#e8c547" }}>{fmt(c.totalAmount)}</td>
                      <td style={{ padding: "6px 10px", fontWeight: 700, color: "#b5651d" }}>{fmtH(c.totalHours)}</td>
                    </tr>
                  ))}</tbody>
                  <tfoot><tr style={{ background: "#2d6a4f" }}>
                    <td colSpan={4} style={{ padding: "8px 10px", fontWeight: 700, color: "#fff" }}>TOTAL</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#fff" }}>{Object.values(consolidated).reduce((s, c) => s + c.totalQty, 0)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#fff" }}>{fmt(totalRevenue)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#fff" }}>{fmtH(Object.values(consolidated).reduce((s, c) => s + c.totalHours, 0))}</td>
                  </tr></tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "hours" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <h3 style={{ color: "#e8c547" }}>Registro de Horas de Trabajo</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#888" }}>Valor hora: {fmt(hourValue)}</span>
                <button onClick={() => setShowAddHours(true)} style={{ ...pillD, background: "#2d6a4f", color: "#fff" }}>+ Registrar horas</button>
              </div>
            </div>
            {showAddHours && <AddHoursForm members={members} onSave={addWorkHoursForMember} onCancel={() => setShowAddHours(false)} />}
            {workHours.length === 0 ? (<p style={{ color: "#888" }}>Sin registros.</p>) : workHours.map(wh => (
              <div key={wh.id} style={{ background: "#1e1e1e", borderRadius: 10, padding: "12px 16px", marginBottom: 6, border: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{wh.members?.full_name || "---"}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>{wh.description} | {wh.work_date} | {fmtH(wh.hours)}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {wh.status === "pendiente" ? (
                    <>
                      <button onClick={() => approveWorkHours(wh)} style={{ ...pillD, background: "#2d6a4f", color: "#fff", fontSize: 11 }}>Aprobar</button>
                      <button onClick={() => rejectWorkHours(wh)} style={{ ...pillD, background: "#e63946", color: "#fff", fontSize: 11 }}>Rechazar</button>
                    </>
                  ) : (
                    <span style={{ fontSize: 11, color: wh.status === "aprobado" ? "#40916c" : "#e63946" }}>{wh.status === "aprobado" ? "Aprobado" : "Rechazado"}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "members" && (
          <div>
            <h3 style={{ color: "#e8c547", marginBottom: 16 }}>Miembros ({members.length})</h3>
            {members.map(m => (
              <div key={m.id} style={{ background: "#1e1e1e", borderRadius: 10, padding: "10px 16px", marginBottom: 6, border: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{m.full_name}</span>
                  <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>{m.email}</span>
                  {m.is_admin && <span style={{ marginLeft: 8, background: "#e8c547", color: "#1a1a1a", padding: "1px 6px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>ADMIN</span>}
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#b5651d", fontWeight: 600 }}>{fmtH(m.hours_balance)}</span>
                  <span style={{ fontSize: 11, color: m.is_active ? "#40916c" : "#e63946" }}>{m.is_active ? "Activo" : "Inactivo"}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

function ProductForm({ product, onSave, onCancel }) {
  const [f, setF] = useState(product || { name: "", category_id: "frutas", unit: "kg", price: 0, stock: 100, hours_component: 0, is_active: true });
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <div style={{ background: "#2a2a2a", borderRadius: 10, padding: 16, marginBottom: 16, border: "1px solid #444" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}><label style={labD}>Nombre</label><input style={inpD} value={f.name} onChange={e => set("name", e.target.value)} /></div>
        <div><label style={labD}>Categoria</label><select style={inpD} value={f.category_id} onChange={e => set("category_id", e.target.value)}>{CATEGORIES.map(c => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}</select></div>
        <div><label style={labD}>Unidad</label><input style={inpD} value={f.unit} onChange={e => set("unit", e.target.value)} /></div>
        <div><label style={labD}>Precio (CLP)</label><input style={inpD} type="number" value={f.price} onChange={e => set("price", parseInt(e.target.value) || 0)} /></div>
        <div><label style={labD}>Horas componente</label><input style={inpD} type="number" step="0.01" value={f.hours_component} onChange={e => set("hours_component", parseFloat(e.target.value) || 0)} /></div>
        <div><label style={labD}>Stock</label><input style={inpD} type="number" value={f.stock} onChange={e => set("stock", parseInt(e.target.value) || 0)} /></div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={onCancel} style={pillD}>Cancelar</button>
        <button onClick={() => { if (f.name) onSave(f); }} style={{ ...pillD, background: "#e8c547", color: "#1a1a1a" }}>Guardar</button>
      </div>
    </div>
  );
}

function AddHoursForm({ members, onSave, onCancel }) {
  const [memberId, setMemberId] = useState("");
  const [hours, setHours] = useState(1);
  const [desc, setDesc] = useState("");
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (!memberId || hours <= 0 || !desc.trim()) return;
    setSaving(true);
    await onSave(memberId, hours, desc.trim(), workDate);
    setSaving(false);
  };
  return (
    <div style={{ background: "#2a2a2a", borderRadius: 10, padding: 16, marginBottom: 16, border: "1px solid #444" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}><label style={labD}>Cooperado</label><select style={inpD} value={memberId} onChange={e => setMemberId(e.target.value)}><option value="">Seleccionar...</option>{members.map(m => (<option key={m.id} value={m.id}>{m.full_name} ({m.email})</option>))}</select></div>
        <div><label style={labD}>Horas</label><input style={inpD} type="number" step="0.25" min="0.25" value={hours} onChange={e => setHours(parseFloat(e.target.value) || 0)} /></div>
        <div><label style={labD}>Fecha</label><input style={inpD} type="date" value={workDate} onChange={e => setWorkDate(e.target.value)} /></div>
        <div style={{ gridColumn: "1 / -1" }}><label style={labD}>Descripcion del trabajo</label><input style={inpD} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ej: Descarga mercaderia, picking..." /></div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={onCancel} style={pillD}>Cancelar</button>
        <button onClick={handleSave} disabled={saving || !memberId || hours <= 0 || !desc.trim()} style={{ ...pillD, background: saving ? "#555" : "#e8c547", color: "#1a1a1a", opacity: (!memberId || hours <= 0 || !desc.trim()) ? 0.5 : 1 }}>{saving ? "Guardando..." : "Registrar horas"}</button>
      </div>
    </div>
  );
}

const pillD = { background: "#333", color: "#ccc", border: "none", borderRadius: 20, padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" };
const labD = { display: "block", fontSize: 12, fontWeight: 600, color: "#aaa", marginBottom: 4 };
const inpD = { width: "100%", padding: "10px 12px", background: "#333", color: "#fff", border: "1px solid #444", borderRadius: 8, fontSize: 14, boxSizing: "border-box" };
const selectDark = { background: "#333", color: "#fff", border: "1px solid #444", borderRadius: 8, padding: "6px 12px", fontSize: 12 };
