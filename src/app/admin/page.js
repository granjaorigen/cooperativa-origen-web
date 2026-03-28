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
{ id: "lacteos", name: "Lácteos", icon: "🧀" },
{ id: "carnes", name: "Carnes", icon: "🥩" },
{ id: "aseo", name: "Productos de Aseo", icon: "🧴" },
{ id: "ecorioclaro", name: "Producción Eco Río Claro", icon: "🌿" },
];

const STATUS_LABELS = {
pendiente_pago: { text: "⏳ Pendiente pago", bg: "#fff3cd", color: "#856404" },
pagado: { text: "💰 Pagado", bg: "#d4edda", color: "#155724" },
preparando: { text: "📦 Preparando", bg: "#d1ecf1", color: "#0c5460" },
listo: { text: "✅ Listo", bg: "#d4edda", color: "#155724" },
entregado: { text: "🤝 Entregado", bg: "#e2e3e5", color: "#383d41" },
cancelado: { text: "❌ Cancelado", bg: "#f8d7da", color: "#721c24" },
};

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

const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

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

if (loading) return
⚙️
;
if (!session) return
Acceso Administrador
Debes iniciar sesión primero.

Ir al Login
;
if (!member?.is_admin) return
🔒
Sin permisos
Volver
;

const cycleOrders = orders.filter(o => o.cycle_id === cycle?.id);
const totalRevenue = cycleOrders.reduce((s, o) => s + o.total, 0);
const uniqueUsers = new Set(cycleOrders.map(o => o.member_id)).size;
const pendingPayment = cycleOrders.filter(o => o.status === "pendiente_pago").length;

const consolidated = {};
cycleOrders.filter(o => o.status !== "cancelado").forEach(o => {
o.order_items?.forEach(it => {
if (!consolidated[it.product_id]) consolidated[it.product_id] = { ...it, totalQty: 0, totalAmount: 0, totalHours: 0 };
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
const t = new Date(); const e = new Date(t); e.setDate(e.getDate() + 14);
const { data } = await supabase.from("cycles").insert({ name: `Ciclo ${t.toLocaleDateString("es-CL", { month: "long" })} Q${Math.ceil(t.getDate() / 15)} ${t.getFullYear()}`, status: "open", start_date: t.toISOString().slice(0, 10), end_date: e.toISOString().slice(0, 10) }).select().single();
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
setEditProd(null); setNewProd(false);
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

const confirmPayment = async (order, method) => {
await supabase.from("orders").update({ status: "pagado", payment_method: method }).eq("id", order.id);
setOrders(orders.map(o => o.id === order.id ? { ...o, status: "pagado", payment_method: method } : o));
showToast("Pago confirmado");
};

const addWorkHoursForMember = async (memberId, hours, description, workDate) => {
try {
// 1. Insertar registro de horas
const insertResult = await supabase.from("work_hours").insert({
member_id: memberId,
hours: parseFloat(hours),
description: description,
work_date: workDate,
status: "aprobado",
approved_by: member.id,
approved_at: new Date().toISOString()
}).select().single();

if (insertResult.error) {
console.log("Error inserting work_hours:", insertResult.error);
showToast("Error al registrar horas");
return;
}

// 2. Actualizar balance del miembro
const target = members.find(m => m.id === memberId);
if (target) {
const currentBalance = parseFloat(target.hours_balance) || 0;
const newBalance = currentBalance + parseFloat(hours);

const updateResult = await supabase.from("members").update({ hours_balance: newBalance }).eq("id", memberId);

if (updateResult.error) {
console.log("Error updating balance:", updateResult.error);
showToast("Horas registradas pero error al actualizar balance");
return;
}

// 3. Actualizar estado local
setMembers(members.map(m => m.id === memberId ? { ...m, hours_balance: newBalance } : m));
}

// 4. Refrescar lista de horas
const { data: wh } = await supabase.from("work_hours").select("*, members(full_name, email)").order("created_at", { ascending: false });
setWorkHours(wh || []);

showToast("Horas registradas y acreditadas");
} catch (e) {
console.log("Catch error:", e);
showToast("Error inesperado");
}
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
showToast("Horas aprobadas y acreditadas");
};

const rejectWorkHours = async (wh) => {
await supabase.from("work_hours").update({ status: "rechazado" }).eq("id", wh.id);
setWorkHours(workHours.map(w => w.id === wh.id ? { ...w, status: "rechazado" } : w));
showToast("Horas rechazadas");
};

const exportCSV = () => {
const rows = [["Producto", "Unidad", "Precio Unit.", "Horas Unit.", "Cant. Total", "Monto Total", "Horas Total"]];
Object.values(consolidated).forEach(c => rows.push([c.product_name, c.product_unit, c.price, parseFloat(c.hours_component) || 0, c.totalQty, c.totalAmount, c.totalHours.toFixed(2)]));
rows.push(["", "", "", "", "TOTAL", totalRevenue, Object.values(consolidated).reduce((s, c) => s + c.totalHours, 0).toFixed(2)]);
const blob = new Blob(["\uFEFF" + rows.map(r => r.join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
a.download = `consolidado_${cycle?.name?.replace(/ /g, "_") || "export"}.csv`;
a.click(); showToast("CSV exportado");
};

const s = { bg: "#1e1e1e", border: "1px solid #333", radius: 12 };

return (

{toast &&
✅ {toast}
}




⚙️
Admin — Cooperativa Origen


🛒 Catálogo
Salir





{[["dashboard", "📊 Dashboard"], ["products", "📦 Productos"], ["orders", "📋 Pedidos"], ["consolidated", "🏭 Consolidado"], ["hours", "⏱ Horas"], ["members", "👥 Miembros"]].map(([key, label]) => (
setTab(key)} style={{ border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: tab === key ? 700 : 400, background: tab === key ? "var(--gold)" : "#222", color: tab === key ? "#1a1a1a" : "#999", cursor: "pointer", whiteSpace: "nowrap" }}>{label}
))}




{tab === "dashboard" && (<>



CICLO ACTUAL

{cycle?.name || "Sin ciclo"}

{cycle ? `${cycle.start_date} → ${cycle.end_date} · ${cycle.status}` : ""}



{cycle && {cycle.status === "open" ? "🔒 Cerrar" : "📦 Abrir"}}
+ Nuevo Ciclo




{[
{ l: "Pedidos", v: cycleOrders.length, i: "📋" },
{ l: "Pago pendiente", v: pendingPayment, i: "⏳" },
{ l: "Cooperados", v: uniqueUsers, i: "👥" },
{ l: "Venta total", v: fmt(totalRevenue), i: "💰" },
{ l: "Productos", v: products.filter(p => p.is_active).length, i: "📦" },
{ l: "Miembros", v: members.length, i: "🤝" },
].map((x, i) => (

{x.i}

{x.v}

{x.l}


))}

</>)}

{tab === "products" && (<>

Catálogo ({products.length})

{ setNewProd(true); setEditProd(null); }} style={{ ...pillD, background: "var(--green-700)", color: "#fff" }}>+ Agregar

{(newProd || editProd) && { setEditProd(null); setNewProd(false); }} />}
{products.map(p => {
const cat = CATEGORIES.find(c => c.id === p.category_id);
const hc = parseFloat(p.hours_component) || 0;
return (


{cat?.icon} {p.name}


{fmt(p.price)} {hc > 0 ? `+ ${fmtH(hc)}` : ""} / {p.unit} — Stock: {p.stock}



{ setEditProd(p); setNewProd(false); }} style={{ ...pillD, fontSize: 11 }}>✏️
{ await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id); setProducts(products.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x)); }} style={{ ...pillD, color: p.is_active ? "var(--red)" : "var(--green-700)", fontSize: 11 }}>{p.is_active ? "⏸" : "▶"}
deleteProduct(p.id)} style={{ ...pillD, color: "var(--red)", fontSize: 11 }}>🗑


);
})}
</>)}

{tab === "orders" && (<>

Pedidos: {cycle?.name}




{c.name} ({c.status})



{cycleOrders.length === 0 ?
Sin pedidos.

:
cycleOrders.map(o => {
const st = STATUS_LABELS[o.status] || STATUS_LABELS.pendiente_pago;
return (


{o.members?.full_name} {o.members?.email}

{st.text}

{o.order_items?.map((it, i) => (

{it.product_name} × {it.quantity}
{fmt(it.subtotal)} {parseFloat(it.hours_subtotal) > 0 ? `+ ${fmtH(it.hours_subtotal)}` : ""}

))}


{fmt(o.total)}
{parseFloat(o.total_hours) > 0 && ({fmtH(o.total_hours)})}


{o.status === "pendiente_pago" && (
<>
confirmPayment(o, "transfer")} style={{ ...pillD, background: "#2d6a4f", color: "#fff", fontSize: 11 }}>💳 Transferencia
confirmPayment(o, "cash")} style={{ ...pillD, background: "#2d6a4f", color: "#fff", fontSize: 11 }}>💵 Caja
</>
)}
{o.status !== "pendiente_pago" && o.status !== "cancelado" && (



{s}


)}



);
})
}
</>)}

{tab === "consolidated" && (<>

Consolidado — Eco Río Claro

📥 Exportar CSV

{Object.keys(consolidated).length === 0 ?
Sin pedidos.

: (

{["Producto", "Unidad", "$ Unit.", "Hrs Unit.", "Cant.", "$ Total", "Hrs Total"].map(h =>)}{Object.values(consolidated).map((c, i) => ( ))}
{h}
{c.product_name}	{c.product_unit}	{fmt(c.price)}	{fmtH(parseFloat(c.hours_component) || 0)}	{c.totalQty}	{fmt(c.totalAmount)}	{fmtH(c.totalHours)}
TOTAL	{Object.values(consolidated).reduce((s, c) => s + c.totalQty, 0)}	{fmt(totalRevenue)}	{fmtH(Object.values(consolidated).reduce((s, c) => s + c.totalHours, 0))}


)}
</>)}

{tab === "hours" && (<>

⏱ Registro de Horas de Trabajo


Valor hora: {fmt(hourValue)}
setShowAddHours(true)} style={{ ...pillD, background: "var(--green-700)", color: "#fff" }}>+ Registrar horas



{showAddHours && setShowAddHours(false)} />}

{workHours.length === 0 ?
Sin registros de horas.

:
workHours.map(wh => (


{wh.members?.full_name || "—"}

{wh.description} · {wh.work_date} · {fmtH(wh.hours)}



{wh.status === "pendiente" ? (
<>
approveWorkHours(wh)} style={{ ...pillD, background: "var(--green-700)", color: "#fff", fontSize: 11 }}>✅ Aprobar
rejectWorkHours(wh)} style={{ ...pillD, background: "var(--red)", color: "#fff", fontSize: 11 }}>❌ Rechazar
</>
) : (
{wh.status === "aprobado" ? "✅ Aprobado" : "❌ Rechazado"}
)}


))
}
</>)}

{tab === "members" && (<>
Miembros ({members.length})

{members.map(m => (


{m.full_name}
{m.email}
{m.is_admin && ADMIN}


⏱ {fmtH(m.hours_balance)}
{m.is_active ? "Activo" : "Inactivo"}


))}
</>)}


);
}

function ProductForm({ product, onSave, onCancel }) {
const [f, setF] = useState(product || { name: "", category_id: "frutas", unit: "kg", price: 0, stock: 100, hours_component: 0, is_active: true });
const set = (k, v) => setF({ ...f, [k]: v });
return (


Nombre
{f.name}
 set("name", e.target.value)} />

Categoría
{c.icon} {c.name}

Unidad
{f.unit}
 set("unit", e.target.value)} />

Precio (CLP)
 set("price", parseInt(e.target.value) || 0)} />

Horas componente
 set("hours_component", parseFloat(e.target.value) || 0)} />

Stock
 set("stock", parseInt(e.target.value) || 0)} />



Cancelar
{ if (f.name) onSave(f); }} style={{ ...pillD, background: "var(--gold)", color: "#1a1a1a" }}>💾 Guardar


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



Cooperado



Seleccionar cooperado...


{m.full_name} ({m.email})



Horas
 setHours(parseFloat(e.target.value) || 0)} />

Fecha
dd-mm-aaaa
 setWorkDate(e.target.value)} />

Descripción del trabajo
{desc}
 setDesc(e.target.value)} placeholder="Ej: Descarga de mercadería, picking de pedidos..." />



Cancelar

{saving ? "Guardando..." : "⏱ Registrar horas"}



);
}

const pillD = { background: "#333", color: "#ccc", border: "none", borderRadius: 20, padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" };
const labD = { display: "block", fontSize: 12, fontWeight: 600, color: "#aaa", marginBottom: 4 };
const inpD = { width: "100%", padding: "10px 12px", background: "#333", color: "#fff", border: "1px solid #444", borderRadius: 8, fontSize: 14, boxSizing: "border-box" };
const selectDark = { background: "#333", color: "#fff", border: "1px solid #444", borderRadius: 8, padding: "6px 12px", fontSize: 12 };
