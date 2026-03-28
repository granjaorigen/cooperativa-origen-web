"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const fmt = (n) => "$" + Math.round(n).toLocaleString("es-CL");
const fmtH = (h) => { const v = parseFloat(h) || 0; if (v === 0) return "0 hrs"; return v.toFixed(2).replace(".", ",") + " hrs"; };

const CATEGORIES = [
  { id: "frutas", name: "Frutas y Verduras", icon: "🥬" },
  { id: "abarrotes", name: "Abarrotes", icon: "🛒" },
  { id: "lacteos", name: "Lacteos", icon: "🧀" },
  { id: "carnes", name: "Carnes", icon: "🥩" },
  { id: "aseo", name: "Productos de Aseo", icon: "🧴" },
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
  const totalHours = parseFloat(order.total_hours) || 0;
  const hoursUsed = parseFloat(order.hours_paid_with_balance) || 0;
  const hoursInMoney = parseFloat(order.hours_paid_with_money) || 0;
  const hoursMoneyValue = Math.round(hoursInMoney * hourValue);
  const itemsRows = order.order_items?.map(it => "<tr><td style='padding:6px 10px;border-bottom:1px solid #ddd'>" + it.product_name + "</td><td style='padding:6px 10px;border-bottom:1px solid #ddd;text-align:center'>" + it.quantity + " " + it.product_unit + "</td><td style='padding:6px 10px;border-bottom:1px solid #ddd;text-align:right'>$" + it.subtotal.toLocaleString("es-CL") + "</td><td style='padding:6px 10px;border-bottom:1px solid #ddd;text-align:center;width:40px'>[ ]</td></tr>").join("") || "";
  const html = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Pedido " + order.id.slice(0,8).toUpperCase() + "</title><style>body{font-family:Arial,sans-serif;margin:20px;color:#333}@media print{body{margin:10px}.no-print{display:none}}</style></head><body><div style='text-align:center;margin-bottom:20px'><h1 style='margin:0;font-size:22px'>Cooperativa Origen</h1><p style='margin:4px 0;font-size:13px;color:#888'>Documento de Picking</p></div><div style='background:" + paymentBg + ";border:3px solid " + paymentColor + ";border-radius:10px;padding:20px;text-align:center;margin-bottom:20px'><div style='font-size:28px;font-weight:900;color:" + paymentColor + "'>" + paymentLabel + "</div></div><table style='width:100%;margin-bottom:16px;font-size:14px'><tr><td><strong>Pedido:</strong> " + order.id.slice(0,8).toUpperCase() + "</td><td style='text-align:right'><strong>Fecha:</strong> " + new Date(order.created_at).toLocaleDateString("es-CL") + "</td></tr><tr><td><strong>Cooperado:</strong> " + (order.members?.full_name || "---") + "</td><td style='text-align:right'><strong>Email:</strong> " + (order.members?.email || "---") + "</td></tr></table><table style='width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px'><thead><tr style='background:#2d6a4f;color:#fff'><th style='padding:8px 10px;text-align:left'>Producto</th><th style='padding:8px 10px;text-align:center'>Cantidad</th><th style='padding:8px 10px;text-align:right'>Subtotal</th><th style='padding:8px 10px;text-align:center'>OK</th></tr></thead><tbody>" + itemsRows + "</tbody></table><div style='border-top:2px solid #333;padding-top:12px;font-size:14px'><div style='display:flex;justify-content:space-between;margin-bottom:4px'><span>Total:</span><strong>$" + order.total.toLocaleString("es-CL") + "</strong></div>" + (totalHours > 0 ? "<div style='display:flex;justify-content:space-between;margin-bottom:4px;color:#b5651d'><span>Horas:</span><strong>" + fmtH(totalHours) + "</strong></div>" : "") + (hoursUsed > 0 ? "<div style='display:flex;justify-content:space-between;margin-bottom:4px;color:#2d6a4f'><span>Horas saldo:</span><strong>-" + fmtH(hoursUsed) + "</strong></div>" : "") + (hoursInMoney > 0 ? "<div style='display:flex;justify-content:space-between;margin-bottom:4px'><span>Horas en $:</span><strong>$" + hoursMoneyValue.toLocaleString("es-CL") + "</strong></div>" : "") + "</div>" + (isCaja ? "<div style='margin-top:20px;border:2px dashed " + paymentColor + ";border-radius:10px;padding:16px;text-align:center'><div style='font-size:20px;font-weight:700;color:" + paymentColor + "'>MONTO A COBRAR: $" + order.total.toLocaleString("es-CL") + "</div></div>" : "") + "<div style='margin-top:30px;display:flex;justify-content:space-between;font-size:12px;color:#888'><span>Preparado: ___________</span><span>Revisado: ___________</span><span>Entregado: ___________</span></div><div class='no-print' style='text-align:center;margin-top:30px'><button onclick='window.print()' style='background:#2d6a4f;color:#fff;border:none;border-radius:10px;padding:12px 32px;font-size:16px;cursor:pointer'>Imprimir</button></div></body></html>";
  const w = window.open("", "_blank"); w.document.write(html); w.document.close();
}

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [hourValue, setHourValue] = useState(3750);
  const [products, setProducts] = useState([]);
  const [masterProducts, setMasterProducts] = useState([]);
  const [cycle, setCycle] = useState(null);
  const [allCycles, setAllCycles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [members, setMembers] = useState([]);
  const [workHours, setWorkHours] = useState([]);
  const [stockEntries, setStockEntries] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [shiftSignups, setShiftSignups] = useState([]);
  const [editProd, setEditProd] = useState(null);
  const [newProd, setNewProd] = useState(false);
  const [showAddHours, setShowAddHours] = useState(false);
  const [showStockEntry, setShowStockEntry] = useState(false);
  const [showAddMaster, setShowAddMaster] = useState(false);
  const [showAddShift, setShowAddShift] = useState(false);
  const [hoursSubTab, setHoursSubTab] = useState("shifts");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const refreshData = async () => {
    const { data: prods } = await supabase.from("products").select("*").order("name"); setProducts(prods || []);
    const { data: mp } = await supabase.from("master_products").select("*").order("name"); setMasterProducts(mp || []);
    const { data: cycles } = await supabase.from("cycles").select("*").order("created_at", { ascending: false }); setAllCycles(cycles || []); setCycle(cycles?.find(c => c.status === "open") || cycles?.[0]);
    const { data: allOrders } = await supabase.from("orders").select("*, order_items(*), members(full_name, email, hours_balance)").order("created_at", { ascending: false }); setOrders(allOrders || []);
    const { data: allMembers } = await supabase.from("members").select("*").order("full_name"); setMembers(allMembers || []);
    const { data: wh } = await supabase.from("work_hours").select("*, members(full_name, email)").order("created_at", { ascending: false }); setWorkHours(wh || []);
    const { data: se } = await supabase.from("stock_entries").select("*, products(name)").order("created_at", { ascending: false }); setStockEntries(se || []);
    const { data: sh } = await supabase.from("settings").select("value").eq("key", "hour_value_clp").single(); if (sh) setHourValue(parseInt(sh.value));
    const { data: allShifts } = await supabase.from("work_shifts").select("*").order("shift_date", { ascending: false }); setShifts(allShifts || []);
    const { data: allSignups } = await supabase.from("shift_signups").select("*, members(full_name, email)").order("created_at", { ascending: false }); setShiftSignups(allSignups || []);
  };

  useEffect(() => { if (!session) return; const load = async () => { const { data: m } = await supabase.from("members").select("*").eq("email", session.user.email).single(); if (!m || !m.is_admin) { setMember(null); setLoading(false); return; } setMember(m); await refreshData(); }; load(); }, [session]);

  const handleLogout = async () => { await supabase.auth.signOut(); };

  if (loading) return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#121212", color: "#fff" }}><span>Cargando...</span></div>);
  if (!session) return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#121212", color: "#fff", padding: 20 }}><div style={{ textAlign: "center" }}><h2>Acceso Administrador</h2><p style={{ color: "#888", margin: "12px 0 20px" }}>Debes iniciar sesion primero.</p><Link href="/catalogo" style={{ background: "#e8c547", color: "#1a1a1a", padding: "12px 24px", borderRadius: 10, fontWeight: 600, display: "inline-block" }}>Ir al Login</Link></div></div>);
  if (!member || !member.is_admin) return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#121212", color: "#fff", padding: 20 }}><div style={{ textAlign: "center" }}><h2>Sin permisos</h2><Link href="/catalogo" style={{ background: "#2d6a4f", color: "#fff", padding: "12px 24px", borderRadius: 10, fontWeight: 600, display: "inline-block", marginTop: 16 }}>Volver</Link></div></div>);

  const cycleOrders = orders.filter(o => o.cycle_id === cycle?.id);
  const totalRevenue = cycleOrders.reduce((s, o) => s + o.total, 0);
  const uniqueUsers = new Set(cycleOrders.map(o => o.member_id)).size;
  const pendingPayment = cycleOrders.filter(o => o.status === "pendiente_pago").length;
  const pendingCaja = cycleOrders.filter(o => o.status === "cobrar_en_caja").length;
  const consolidated = {}; cycleOrders.filter(o => o.status !== "cancelado").forEach(o => { o.order_items?.forEach(it => { if (!consolidated[it.product_id]) consolidated[it.product_id] = { ...it, totalQty: 0, totalAmount: 0, totalHours: 0 }; consolidated[it.product_id].totalQty += it.quantity; consolidated[it.product_id].totalAmount += it.subtotal; consolidated[it.product_id].totalHours += parseFloat(it.hours_subtotal) || 0; }); });

  const toggleCycle = async () => { const ns = cycle.status === "open" ? "closed" : "open"; await supabase.from("cycles").update({ status: ns }).eq("id", cycle.id); setCycle({ ...cycle, status: ns }); showToast(ns === "open" ? "Ciclo abierto" : "Ciclo cerrado"); };
  const createNewCycle = async () => { const t = new Date(); const e = new Date(t); e.setDate(e.getDate() + 14); const name = "Ciclo " + t.toLocaleDateString("es-CL", { month: "long" }) + " Q" + Math.ceil(t.getDate() / 15) + " " + t.getFullYear(); const { data } = await supabase.from("cycles").insert({ name, status: "open", start_date: t.toISOString().slice(0, 10), end_date: e.toISOString().slice(0, 10) }).select().single(); if (data) { setCycle(data); setAllCycles([data, ...allCycles]); showToast("Nuevo ciclo creado"); } };

  const saveProduct = async (prod) => {
    const updates = { name: prod.name, category_id: prod.category_id, unit: prod.unit, price: prod.price, stock: prod.stock, hours_component: prod.hours_component, is_active: prod.is_active, is_origen: prod.is_origen || false, is_regenerativo: prod.is_regenerativo || false };
    if (prod.id) { await supabase.from("products").update(updates).eq("id", prod.id); setProducts(products.map(p => p.id === prod.id ? { ...p, ...updates } : p)); showToast("Producto actualizado"); }
    else { const { data } = await supabase.from("products").insert({ ...updates, is_active: true }).select().single(); if (data) setProducts([...products, data]); showToast("Producto agregado"); }
    setEditProd(null); setNewProd(false);
  };
  const deleteProduct = async (id) => { await supabase.from("products").delete().eq("id", id); setProducts(products.filter(p => p.id !== id)); showToast("Producto eliminado"); };
  const updateOrderStatus = async (orderId, newStatus) => { await supabase.from("orders").update({ status: newStatus }).eq("id", orderId); setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o)); showToast("Estado actualizado"); };
  const handleTransferPayment = async (order) => { await supabase.from("orders").update({ status: "pagado", payment_method: "transfer" }).eq("id", order.id); setOrders(orders.map(o => o.id === order.id ? { ...o, status: "pagado", payment_method: "transfer" } : o)); showToast("Transferencia confirmada"); };
  const handleCajaPayment = async (order) => { await supabase.from("orders").update({ status: "cobrar_en_caja", payment_method: "cash" }).eq("id", order.id); setOrders(orders.map(o => o.id === order.id ? { ...o, status: "cobrar_en_caja", payment_method: "cash" } : o)); showToast("Marcado cobrar en caja"); };
  const confirmCajaPayment = async (order) => { await supabase.from("orders").update({ status: "pagado" }).eq("id", order.id); setOrders(orders.map(o => o.id === order.id ? { ...o, status: "pagado" } : o)); showToast("Pago confirmado"); };

  const submitStockEntry = async (entry) => {
    try {
      const mp = masterProducts.find(m => m.id === entry.masterProductId); if (!mp) { showToast("Producto no encontrado"); return; }
      let productId; const existingProduct = products.find(p => p.name === mp.name);
      if (existingProduct) { const newStock = existingProduct.stock + entry.quantity; await supabase.from("products").update({ stock: newStock, price: entry.totalPrice, hours_component: entry.hoursComponent || existingProduct.hours_component, is_origen: entry.isOrigen, is_regenerativo: entry.isRegenerativo }).eq("id", existingProduct.id); productId = existingProduct.id; setProducts(products.map(p => p.id === existingProduct.id ? { ...p, stock: newStock, price: entry.totalPrice, is_origen: entry.isOrigen, is_regenerativo: entry.isRegenerativo } : p)); }
      else { const { data: newP } = await supabase.from("products").insert({ name: mp.name, category_id: mp.category_id, unit: mp.unit, price: entry.totalPrice, stock: entry.quantity, hours_component: entry.hoursComponent || 0, is_active: true, is_origen: entry.isOrigen, is_regenerativo: entry.isRegenerativo }).select().single(); if (newP) { productId = newP.id; setProducts([...products, newP]); } }
      await supabase.from("stock_entries").insert({ product_id: productId, master_product_id: entry.masterProductId, quantity: entry.quantity, net_price: entry.netPrice, iva: entry.iva, total_price: entry.totalPrice, doc_type: entry.docType, doc_number: entry.docNumber, supplier_name: entry.supplierName, supplier_rut: entry.supplierRut, cycle_id: cycle?.id, notes: entry.notes });
      const { data: se } = await supabase.from("stock_entries").select("*, products(name)").order("created_at", { ascending: false }); setStockEntries(se || []);
      showToast("Ingreso registrado");
    } catch (e) { console.log("Error:", e); showToast("Error inesperado"); }
    setShowStockEntry(false);
  };

  const addMasterProduct = async (name, categoryId, unit, isOrigen, isRegenerativo) => { const { data } = await supabase.from("master_products").insert({ name, category_id: categoryId, unit, is_origen: isOrigen, is_regenerativo: isRegenerativo }).select().single(); if (data) { setMasterProducts([...masterProducts, data]); showToast("Agregado a maestra"); } setShowAddMaster(false); };

  const addWorkHoursForMember = async (memberId, hours, description, workDate) => {
    try { const { error } = await supabase.from("work_hours").insert({ member_id: memberId, hours: parseFloat(hours), description, work_date: workDate, status: "aprobado", approved_by: member.id, approved_at: new Date().toISOString() }).select().single(); if (error) { showToast("Error"); return; }
    const target = members.find(m => m.id === memberId); if (target) { const nb = (parseFloat(target.hours_balance) || 0) + parseFloat(hours); await supabase.from("members").update({ hours_balance: nb }).eq("id", memberId); setMembers(members.map(m => m.id === memberId ? { ...m, hours_balance: nb } : m)); }
    const { data: wh } = await supabase.from("work_hours").select("*, members(full_name, email)").order("created_at", { ascending: false }); setWorkHours(wh || []); showToast("Horas registradas"); } catch (e) { showToast("Error"); } setShowAddHours(false);
  };

  const createShift = async (shift) => { const { data, error } = await supabase.from("work_shifts").insert({ title: shift.title, description: shift.description, shift_date: shift.shiftDate, start_time: shift.startTime, end_time: shift.endTime, hours: parseFloat(shift.hours), slots: parseInt(shift.slots), status: "open", created_by: member.id }).select().single(); if (error) { showToast("Error"); return; } setShifts([data, ...shifts]); showToast("Turno publicado"); setShowAddShift(false); };
  const closeShift = async (shiftId) => { await supabase.from("work_shifts").update({ status: "closed" }).eq("id", shiftId); setShifts(shifts.map(s => s.id === shiftId ? { ...s, status: "closed" } : s)); showToast("Turno cerrado"); };
  const completeShift = async (shift) => {
    const signups = shiftSignups.filter(s => s.shift_id === shift.id && s.status === "inscrito");
    for (const signup of signups) { await supabase.from("work_hours").insert({ member_id: signup.member_id, hours: parseFloat(shift.hours), description: "Turno: " + shift.title, work_date: shift.shift_date, status: "aprobado", approved_by: member.id, approved_at: new Date().toISOString() });
      const target = members.find(m => m.id === signup.member_id); if (target) { const nb = (parseFloat(target.hours_balance) || 0) + parseFloat(shift.hours); await supabase.from("members").update({ hours_balance: nb }).eq("id", signup.member_id); setMembers(prev => prev.map(m => m.id === signup.member_id ? { ...m, hours_balance: nb } : m)); }
      await supabase.from("shift_signups").update({ status: "completado" }).eq("id", signup.id); }
    await supabase.from("work_shifts").update({ status: "completed" }).eq("id", shift.id); setShifts(shifts.map(s => s.id === shift.id ? { ...s, status: "completed" } : s)); setShiftSignups(shiftSignups.map(s => s.shift_id === shift.id ? { ...s, status: "completado" } : s));
    const { data: wh } = await supabase.from("work_hours").select("*, members(full_name, email)").order("created_at", { ascending: false }); setWorkHours(wh || []); showToast(signups.length + " cooperados acreditados");
  };

  const exportCSV = () => { const rows = [["Producto", "Unidad", "$ Unit.", "Hrs Unit.", "Cant.", "$ Total", "Hrs Total"]]; Object.values(consolidated).forEach(c => rows.push([c.product_name, c.product_unit, c.price, parseFloat(c.hours_component) || 0, c.totalQty, c.totalAmount, c.totalHours.toFixed(2)])); rows.push(["", "", "", "", "TOTAL", totalRevenue, Object.values(consolidated).reduce((s, c) => s + c.totalHours, 0).toFixed(2)]); const blob = new Blob(["\uFEFF" + rows.map(r => r.join(";")).join("\n")], { type: "text/csv;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "consolidado_" + (cycle?.name?.replace(/ /g, "_") || "export") + ".csv"; a.click(); showToast("CSV exportado"); };

  const sealBadge = (p) => (<span style={{ display: "inline-flex", gap: 4, marginLeft: 6 }}>{p.is_origen && <span style={{ background: "#2d6a4f", color: "#fff", fontSize: 8, padding: "2px 5px", borderRadius: 10 }}>ORIGEN</span>}{p.is_regenerativo && <span style={{ background: "#6b4226", color: "#fff", fontSize: 8, padding: "2px 5px", borderRadius: 10 }}>L2M</span>}</span>);

  return (
    <div style={{ minHeight: "100vh", background: "#121212", color: "#e0e0e0" }}>
      {toast && (<div style={{ position: "fixed", top: 16, right: 16, zIndex: 999, background: "#2d6a4f", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>{toast}</div>)}
      <div style={{ background: "#1a1a1a", borderBottom: "1px solid #333", padding: "12px 20px" }}><div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}><span style={{ fontSize: 16, fontWeight: 700, color: "#e8c547" }}>Admin - Cooperativa Origen</span><div style={{ display: "flex", gap: 8 }}><Link href="/catalogo" style={pillD}>Catalogo</Link><button onClick={handleLogout} style={pillD}>Salir</button></div></div></div>

      <div style={{ maxWidth: 1100, margin: "16px auto", padding: "0 20px", display: "flex", gap: 6, overflowX: "auto" }}>
        {[["dashboard", "Dashboard"], ["stock", "Ingreso"], ["products", "Productos"], ["orders", "Pedidos"], ["consolidated", "Consolidado"], ["hours", "Horas/Turnos"], ["members", "Miembros"]].map(([key, label]) => (<button key={key} onClick={() => setTab(key)} style={{ border: "none", borderRadius: 20, padding: "8px 14px", fontSize: 11, fontWeight: tab === key ? 700 : 400, background: tab === key ? "#e8c547" : "#222", color: tab === key ? "#1a1a1a" : "#999", cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>))}
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 40px" }}>

        {tab === "dashboard" && (<div>
          <div style={{ background: "#1e1e1e", borderRadius: 12, padding: 20, marginBottom: 16, border: "1px solid #333" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}><div><div style={{ fontSize: 12, color: "#888", letterSpacing: 1 }}>CICLO ACTUAL</div><div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{cycle?.name || "Sin ciclo"}</div><div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{cycle ? cycle.start_date + " - " + cycle.end_date + " | " + cycle.status : ""}</div></div><div style={{ display: "flex", gap: 8 }}>{cycle && <button onClick={toggleCycle} style={{ ...pillD, background: cycle.status === "open" ? "#e63946" : "#2d6a4f", color: "#fff" }}>{cycle.status === "open" ? "Cerrar" : "Abrir"}</button>}<button onClick={createNewCycle} style={{ ...pillD, color: "#e8c547" }}>+ Nuevo Ciclo</button></div></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            {[{ l: "Pedidos", v: cycleOrders.length }, { l: "Pago pendiente", v: pendingPayment }, { l: "Cobrar caja", v: pendingCaja }, { l: "Cooperados", v: uniqueUsers }, { l: "Venta total", v: fmt(totalRevenue) }, { l: "Productos", v: products.filter(p => p.is_active).length }, { l: "Turnos abiertos", v: shifts.filter(s => s.status === "open").length }].map((x, i) => (<div key={i} style={{ background: "#1e1e1e", borderRadius: 12, padding: 14, border: "1px solid #333" }}><div style={{ fontSize: 20, fontWeight: 700, color: "#e8c547" }}>{x.v}</div><div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{x.l}</div></div>))}
          </div>
        </div>)}

        {tab === "stock" && (<div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}><h3 style={{ color: "#e8c547" }}>Ingreso de Mercaderia</h3><div style={{ display: "flex", gap: 8 }}><button onClick={() => setShowAddMaster(true)} style={{ ...pillD, background: "#444", color: "#e8c547" }}>+ Maestra</button><button onClick={() => setShowStockEntry(true)} style={{ ...pillD, background: "#2d6a4f", color: "#fff" }}>+ Ingreso</button></div></div>
          {showAddMaster && <AddMasterForm onSave={addMasterProduct} onCancel={() => setShowAddMaster(false)} />}
          {showStockEntry && <StockEntryForm masterProducts={masterProducts} onSave={submitStockEntry} onCancel={() => setShowStockEntry(false)} />}
          <h4 style={{ color: "#888", fontSize: 13, marginBottom: 8 }}>Ultimos ingresos</h4>
          {stockEntries.length === 0 ? (<p style={{ color: "#888" }}>Sin ingresos.</p>) : stockEntries.slice(0, 20).map(se => (<div key={se.id} style={{ background: "#1e1e1e", borderRadius: 10, padding: "12px 16px", marginBottom: 6, border: "1px solid #333" }}><div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}><div><span style={{ fontWeight: 600 }}>{se.products?.name || "---"}</span><span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>x{se.quantity}</span></div><span style={{ fontSize: 12, color: "#888" }}>{new Date(se.created_at).toLocaleDateString("es-CL")}</span></div><div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{se.doc_type.toUpperCase()} {se.doc_number || ""} | Neto: {fmt(se.net_price)} + IVA: {fmt(se.iva)} = {fmt(se.total_price)}/u {se.supplier_name ? "| " + se.supplier_name : ""} {se.supplier_rut ? "- " + se.supplier_rut : ""}</div></div>))}
          <h4 style={{ color: "#888", fontSize: 13, marginTop: 24, marginBottom: 8 }}>Maestra ({masterProducts.length})</h4>
          {masterProducts.map(mp => { const cat = CATEGORIES.find(c => c.id === mp.category_id); return (<div key={mp.id} style={{ background: "#1e1e1e", borderRadius: 8, padding: "8px 14px", marginBottom: 4, border: "1px solid #333", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>{cat?.icon} {mp.name}{sealBadge(mp)}</span><span style={{ color: "#888" }}>{mp.unit}</span></div>); })}
        </div>)}

        {tab === "products" && (<div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={{ color: "#e8c547" }}>Catalogo ({products.length})</h3><button onClick={() => { setNewProd(true); setEditProd(null); }} style={{ ...pillD, background: "#2d6a4f", color: "#fff" }}>+ Agregar</button></div>
          {(newProd || editProd) && <ProductForm product={editProd} onSave={saveProduct} onCancel={() => { setEditProd(null); setNewProd(false); }} />}
          {products.map(p => { const cat = CATEGORIES.find(c => c.id === p.category_id); const hc = parseFloat(p.hours_component) || 0; return (
            <div key={p.id} style={{ background: "#1e1e1e", borderRadius: 10, padding: "12px 16px", marginBottom: 6, border: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: p.is_active ? 1 : 0.5 }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{cat?.icon} {p.name}{sealBadge(p)}</div><div style={{ fontSize: 12, color: "#888" }}>{fmt(p.price)} {hc > 0 ? "+ " + fmtH(hc) : ""} / {p.unit} | Stock: {p.stock}</div></div>
              <div style={{ display: "flex", gap: 6 }}><button onClick={() => { setEditProd(p); setNewProd(false); }} style={{ ...pillD, fontSize: 11 }}>Editar</button><button onClick={async () => { await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id); setProducts(products.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x)); }} style={{ ...pillD, color: p.is_active ? "#e63946" : "#2d6a4f", fontSize: 11 }}>{p.is_active ? "Pausar" : "Activar"}</button><button onClick={() => deleteProduct(p.id)} style={{ ...pillD, color: "#e63946", fontSize: 11 }}>Borrar</button></div>
            </div>); })}
        </div>)}

        {tab === "orders" && (<div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}><h3 style={{ color: "#e8c547" }}>Pedidos: {cycle?.name}</h3><select style={selectDark} value={cycle?.id || ""} onChange={e => setCycle(allCycles.find(c => c.id === e.target.value))}>{allCycles.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.status})</option>))}</select></div>
          {cycleOrders.length === 0 ? (<p style={{ color: "#888" }}>Sin pedidos.</p>) : cycleOrders.map(o => { const st = STATUS_LABELS[o.status] || STATUS_LABELS.pendiente_pago; return (
            <div key={o.id} style={{ background: "#1e1e1e", borderRadius: 10, padding: 16, marginBottom: 10, border: "1px solid #333" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 4 }}><div><strong>{o.members?.full_name}</strong><span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>{o.members?.email}</span></div><span style={{ fontSize: 11, background: st.bg, color: st.color, padding: "2px 8px", borderRadius: 20 }}>{st.text}</span></div>
              {o.order_items?.map((it, i) => (<div key={i} style={{ fontSize: 13, color: "#aaa", display: "flex", justifyContent: "space-between", padding: "1px 0" }}><span>{it.product_name} x {it.quantity}</span><span>{fmt(it.subtotal)} {parseFloat(it.hours_subtotal) > 0 ? "+ " + fmtH(it.hours_subtotal) : ""}</span></div>))}
              <div style={{ borderTop: "1px solid #333", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div><span style={{ fontWeight: 700, color: "#e8c547" }}>{fmt(o.total)}</span>{parseFloat(o.total_hours) > 0 && (<span style={{ color: "#b5651d", fontSize: 12, marginLeft: 8 }}>({fmtH(o.total_hours)})</span>)}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button onClick={() => generatePickingDoc(o, hourValue)} style={{ ...pillD, background: "#444", color: "#fff", fontSize: 11 }}>Imprimir</button>
                  {o.status === "pendiente_pago" && (<><button onClick={() => handleTransferPayment(o)} style={{ ...pillD, background: "#2d6a4f", color: "#fff", fontSize: 11 }}>Transferencia</button><button onClick={() => handleCajaPayment(o)} style={{ ...pillD, background: "#e65100", color: "#fff", fontSize: 11 }}>Cobrar caja</button></>)}
                  {o.status === "cobrar_en_caja" && (<button onClick={() => confirmCajaPayment(o)} style={{ ...pillD, background: "#2d6a4f", color: "#fff", fontSize: 11 }}>Confirmar pago</button>)}
                  {(o.status === "pagado" || o.status === "preparando" || o.status === "listo") && (<select style={selectDark} value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)}><option value="pagado">pagado</option><option value="preparando">preparando</option><option value="listo">listo</option><option value="entregado">entregado</option><option value="cancelado">cancelado</option></select>)}
                </div>
              </div>
            </div>); })}
        </div>)}

        {tab === "consolidated" && (<div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}><h3 style={{ color: "#e8c547" }}>Consolidado - Eco Rio Claro</h3><button onClick={exportCSV} style={{ ...pillD, background: "#2d6a4f", color: "#fff" }}>Exportar CSV</button></div>
          {Object.keys(consolidated).length === 0 ? (<p style={{ color: "#888" }}>Sin pedidos.</p>) : (<div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr style={{ background: "#222" }}>{["Producto", "Unidad", "$ Unit.", "Hrs Unit.", "Cant.", "$ Total", "Hrs Total"].map(h => (<th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#e8c547", fontWeight: 600, borderBottom: "1px solid #444", fontSize: 11 }}>{h}</th>))}</tr></thead><tbody>{Object.values(consolidated).map((c, i) => (<tr key={i} style={{ background: i % 2 === 0 ? "#1a1a1a" : "#1e1e1e" }}><td style={{ padding: "6px 10px" }}>{c.product_name}</td><td style={{ padding: "6px 10px", color: "#888" }}>{c.product_unit}</td><td style={{ padding: "6px 10px" }}>{fmt(c.price)}</td><td style={{ padding: "6px 10px", color: "#b5651d" }}>{fmtH(parseFloat(c.hours_component) || 0)}</td><td style={{ padding: "6px 10px", fontWeight: 700 }}>{c.totalQty}</td><td style={{ padding: "6px 10px", fontWeight: 700, color: "#e8c547" }}>{fmt(c.totalAmount)}</td><td style={{ padding: "6px 10px", fontWeight: 700, color: "#b5651d" }}>{fmtH(c.totalHours)}</td></tr>))}</tbody><tfoot><tr style={{ background: "#2d6a4f" }}><td colSpan={4} style={{ padding: "8px 10px", fontWeight: 700, color: "#fff" }}>TOTAL</td><td style={{ padding: "8px 10px", fontWeight: 700, color: "#fff" }}>{Object.values(consolidated).reduce((s, c) => s + c.totalQty, 0)}</td><td style={{ padding: "8px 10px", fontWeight: 700, color: "#fff" }}>{fmt(totalRevenue)}</td><td style={{ padding: "8px 10px", fontWeight: 700, color: "#fff" }}>{fmtH(Object.values(consolidated).reduce((s, c) => s + c.totalHours, 0))}</td></tr></tfoot></table></div>)}
        </div>)}

        {tab === "hours" && (<div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}><h3 style={{ color: "#e8c547" }}>Horas y Turnos</h3><span style={{ fontSize: 12, color: "#888" }}>Valor hora: {fmt(hourValue)}</span></div>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>{[["shifts", "Turnos"], ["manual", "Registro Manual"], ["history", "Historial"]].map(([key, label]) => (<button key={key} onClick={() => setHoursSubTab(key)} style={{ border: "none", borderRadius: 16, padding: "6px 12px", fontSize: 11, background: hoursSubTab === key ? "#b5651d" : "#222", color: hoursSubTab === key ? "#fff" : "#888", cursor: "pointer" }}>{label}</button>))}</div>

          {hoursSubTab === "shifts" && (<div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><button onClick={() => setShowAddShift(true)} style={{ ...pillD, background: "#2d6a4f", color: "#fff" }}>+ Publicar Turno</button></div>
            {showAddShift && <ShiftForm onSave={createShift} onCancel={() => setShowAddShift(false)} />}
            {shifts.length === 0 ? (<p style={{ color: "#888" }}>Sin turnos.</p>) : shifts.map(shift => { const signups = shiftSignups.filter(s => s.shift_id === shift.id); const sc = shift.status === "open" ? "#2d6a4f" : shift.status === "completed" ? "#888" : "#e63946"; return (
              <div key={shift.id} style={{ background: "#1e1e1e", borderRadius: 10, padding: 16, marginBottom: 10, border: "1px solid #333" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div><div style={{ fontSize: 15, fontWeight: 700 }}>{shift.title}</div>{shift.description && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{shift.description}</div>}<div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{shift.shift_date} {shift.start_time ? "| " + shift.start_time : ""} {shift.end_time ? "- " + shift.end_time : ""} | {fmtH(parseFloat(shift.hours))} | Cupos: {shift.slots_taken}/{shift.slots}</div></div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontSize: 11, color: sc, fontWeight: 600 }}>{shift.status === "open" ? "Abierto" : shift.status === "completed" ? "Completado" : "Cerrado"}</span>
                    {shift.status === "open" && (<><button onClick={() => closeShift(shift.id)} style={{ ...pillD, fontSize: 11, color: "#e63946" }}>Cerrar</button><button onClick={() => completeShift(shift)} style={{ ...pillD, fontSize: 11, background: "#2d6a4f", color: "#fff" }}>Completar</button></>)}</div>
                </div>
                {signups.length > 0 && (<div style={{ marginTop: 8, borderTop: "1px solid #333", paddingTop: 8 }}><div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Inscritos:</div>{signups.map(su => (<div key={su.id} style={{ fontSize: 12, color: "#ccc", padding: "2px 0" }}>{su.members?.full_name || "---"} <span style={{ color: "#888" }}>({su.members?.email})</span><span style={{ marginLeft: 8, fontSize: 10, color: su.status === "completado" ? "#40916c" : "#e8c547" }}>{su.status}</span></div>))}</div>)}
              </div>); })}
          </div>)}

          {hoursSubTab === "manual" && (<div><div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><button onClick={() => setShowAddHours(true)} style={{ ...pillD, background: "#2d6a4f", color: "#fff" }}>+ Registrar horas</button></div>{showAddHours && <AddHoursForm members={members} onSave={addWorkHoursForMember} onCancel={() => setShowAddHours(false)} />}</div>)}

          {(hoursSubTab === "manual" || hoursSubTab === "history") && (<div>
            <h4 style={{ color: "#888", fontSize: 13, marginBottom: 8, marginTop: hoursSubTab === "history" ? 0 : 16 }}>Historial</h4>
            {workHours.length === 0 ? (<p style={{ color: "#888" }}>Sin registros.</p>) : workHours.slice(0, 30).map(wh => (<div key={wh.id} style={{ background: "#1e1e1e", borderRadius: 8, padding: "10px 14px", marginBottom: 4, border: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><span style={{ fontSize: 13, fontWeight: 600 }}>{wh.members?.full_name || "---"}</span><span style={{ color: "#888", fontSize: 11, marginLeft: 8 }}>{wh.description} | {wh.work_date} | {fmtH(wh.hours)}</span></div><span style={{ fontSize: 11, color: wh.status === "aprobado" ? "#40916c" : wh.status === "pendiente" ? "#e8c547" : "#e63946" }}>{wh.status}</span></div>))}
          </div>)}
        </div>)}

        {tab === "members" && (<div>
          <h3 style={{ color: "#e8c547", marginBottom: 16 }}>Miembros ({members.length})</h3>
          {members.map(m => (<div key={m.id} style={{ background: "#1e1e1e", borderRadius: 10, padding: "10px 16px", marginBottom: 6, border: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}><div><span style={{ fontWeight: 600, fontSize: 14 }}>{m.full_name}</span><span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>{m.email}</span>{m.is_admin && <span style={{ marginLeft: 8, background: "#e8c547", color: "#1a1a1a", padding: "1px 6px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>ADMIN</span>}</div><div style={{ display: "flex", gap: 12, alignItems: "center" }}><span style={{ fontSize: 12, color: "#b5651d", fontWeight: 600 }}>{fmtH(m.hours_balance)}</span><span style={{ fontSize: 11, color: m.is_active ? "#40916c" : "#e63946" }}>{m.is_active ? "Activo" : "Inactivo"}</span></div></div>))}
        </div>)}
      </div>
    </div>
  );
}

function ShiftForm({ onSave, onCancel }) {
  const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10)); const [startTime, setStartTime] = useState("09:00"); const [endTime, setEndTime] = useState("12:00"); const [hours, setHours] = useState("3"); const [slots, setSlots] = useState(5); const [saving, setSaving] = useState(false);
  const handleSave = async () => { if (!title.trim() || parseFloat(hours) <= 0 || slots <= 0) return; setSaving(true); await onSave({ title: title.trim(), description: description.trim(), shiftDate, startTime, endTime, hours: parseFloat(hours), slots }); setSaving(false); };
  return (<div style={{ background: "#2a2a2a", borderRadius: 10, padding: 16, marginBottom: 16, border: "1px solid #444" }}><h4 style={{ color: "#e8c547", marginBottom: 12, fontSize: 14 }}>Publicar Turno</h4><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><div style={{ gridColumn: "1 / -1" }}><label style={labD}>Titulo</label><input style={inpD} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Descarga mercaderia" /></div><div style={{ gridColumn: "1 / -1" }}><label style={labD}>Descripcion (opcional)</label><input style={inpD} value={description} onChange={e => setDescription(e.target.value)} /></div><div><label style={labD}>Fecha</label><input style={inpD} type="date" value={shiftDate} onChange={e => setShiftDate(e.target.value)} /></div><div><label style={labD}>Cupos</label><input style={inpD} type="number" min="1" value={slots} onChange={e => setSlots(parseInt(e.target.value) || 1)} /></div><div><label style={labD}>Hora inicio</label><input style={inpD} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div><div><label style={labD}>Hora fin</label><input style={inpD} type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div><div><label style={labD}>Horas a acreditar</label><input style={inpD} value={hours} onChange={e => setHours(e.target.value)} placeholder="Ej: 3" /></div></div><div style={{ display: "flex", gap: 8, marginTop: 12 }}><button onClick={onCancel} style={pillD}>Cancelar</button><button onClick={handleSave} disabled={saving} style={{ ...pillD, background: saving ? "#555" : "#e8c547", color: "#1a1a1a" }}>{saving ? "Publicando..." : "Publicar"}</button></div></div>);
}

function StockEntryForm({ masterProducts, onSave, onCancel }) {
  const [masterProductId, setMasterProductId] = useState(""); const [quantity, setQuantity] = useState(1); const [netPrice, setNetPrice] = useState(0); const [ivaRate, setIvaRate] = useState(19); const [docType, setDocType] = useState("factura"); const [docNumber, setDocNumber] = useState(""); const [supplierName, setSupplierName] = useState(""); const [supplierRut, setSupplierRut] = useState(""); const [hoursComponent, setHoursComponent] = useState(0); const [isOrigen, setIsOrigen] = useState(false); const [isRegenerativo, setIsRegenerativo] = useState(false); const [notes, setNotes] = useState(""); const [saving, setSaving] = useState(false);
  const iva = Math.round(netPrice * ivaRate / 100); const totalPrice = netPrice + iva;
  const selectedMp = masterProducts.find(m => m.id === masterProductId);
  useEffect(() => { if (selectedMp) { setIsOrigen(selectedMp.is_origen || false); setIsRegenerativo(selectedMp.is_regenerativo || false); } }, [masterProductId]);
  const handleSave = async () => { if (!masterProductId || quantity <= 0 || netPrice <= 0) return; setSaving(true); await onSave({ masterProductId, quantity, netPrice, iva, totalPrice, docType, docNumber, supplierName, supplierRut, hoursComponent, isOrigen, isRegenerativo, notes }); setSaving(false); };
  return (<div style={{ background: "#2a2a2a", borderRadius: 10, padding: 16, marginBottom: 16, border: "1px solid #444" }}><h4 style={{ color: "#e8c547", marginBottom: 12, fontSize: 14 }}>Nuevo Ingreso</h4><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
    <div style={{ gridColumn: "1 / -1" }}><label style={labD}>Producto</label><select style={inpD} value={masterProductId} onChange={e => setMasterProductId(e.target.value)}><option value="">Seleccionar...</option>{masterProducts.map(mp => { const cat = CATEGORIES.find(c => c.id === mp.category_id); return (<option key={mp.id} value={mp.id}>{cat?.icon || ""} {mp.name} ({mp.unit})</option>); })}</select></div>
    <div><label style={labD}>Cantidad</label><input style={inpD} type="number" min="1" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 0)} /></div>
    <div><label style={labD}>Horas comp./u</label><input style={inpD} type="number" step="0.01" value={hoursComponent} onChange={e => setHoursComponent(parseFloat(e.target.value) || 0)} /></div>
    <div><label style={labD}>Precio neto/u</label><input style={inpD} type="number" value={netPrice} onChange={e => setNetPrice(parseInt(e.target.value) || 0)} /></div>
    <div><label style={labD}>IVA %</label><select style={inpD} value={ivaRate} onChange={e => setIvaRate(parseInt(e.target.value))}><option value={19}>19%</option><option value={0}>Exento</option></select></div>
    <div style={{ gridColumn: "1 / -1", background: "#333", borderRadius: 8, padding: 10, fontSize: 13 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span>Neto:</span><strong>{fmt(netPrice)}</strong></div><div style={{ display: "flex", justifyContent: "space-between" }}><span>IVA:</span><strong>{fmt(iva)}</strong></div><div style={{ display: "flex", justifyContent: "space-between", color: "#e8c547", fontSize: 15 }}><span>Total/u:</span><strong>{fmt(totalPrice)}</strong></div><div style={{ display: "flex", justifyContent: "space-between", color: "#888", marginTop: 4 }}><span>Total ({quantity} u.):</span><strong>{fmt(totalPrice * quantity)}</strong></div></div>
    <div><label style={labD}>Tipo doc.</label><select style={inpD} value={docType} onChange={e => setDocType(e.target.value)}><option value="factura">Factura</option><option value="boleta">Boleta</option><option value="otro">Otro</option></select></div>
    <div><label style={labD}>N doc.</label><input style={inpD} value={docNumber} onChange={e => setDocNumber(e.target.value)} /></div>
    <div><label style={labD}>Razon social</label><input style={inpD} value={supplierName} onChange={e => setSupplierName(e.target.value)} /></div>
    <div><label style={labD}>RUT proveedor</label><input style={inpD} value={supplierRut} onChange={e => setSupplierRut(e.target.value)} /></div>
    <div style={{ gridColumn: "1 / -1", display: "flex", gap: 16 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#ccc", cursor: "pointer" }}><input type="checkbox" checked={isOrigen} onChange={e => setIsOrigen(e.target.checked)} /><span style={{ background: "#2d6a4f", color: "#fff", fontSize: 9, padding: "2px 6px", borderRadius: 10 }}>PRODUCTO ORIGEN</span></label>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#ccc", cursor: "pointer" }}><input type="checkbox" checked={isRegenerativo} onChange={e => setIsRegenerativo(e.target.checked)} /><span style={{ background: "#6b4226", color: "#fff", fontSize: 9, padding: "2px 6px", borderRadius: 10 }}>REGENERATIVO L2M</span></label>
    </div>
    <div style={{ gridColumn: "1 / -1" }}><label style={labD}>Notas</label><input style={inpD} value={notes} onChange={e => setNotes(e.target.value)} /></div>
  </div><div style={{ display: "flex", gap: 8, marginTop: 12 }}><button onClick={onCancel} style={pillD}>Cancelar</button><button onClick={handleSave} disabled={saving || !masterProductId || quantity <= 0 || netPrice <= 0} style={{ ...pillD, background: saving ? "#555" : "#e8c547", color: "#1a1a1a", opacity: (!masterProductId || quantity <= 0 || netPrice <= 0) ? 0.5 : 1 }}>{saving ? "Guardando..." : "Registrar"}</button></div></div>);
}

function AddMasterForm({ onSave, onCancel }) {
  const [name, setName] = useState(""); const [categoryId, setCategoryId] = useState("frutas"); const [unit, setUnit] = useState("kg"); const [isOrigen, setIsOrigen] = useState(false); const [isRegenerativo, setIsRegenerativo] = useState(false);
  return (<div style={{ background: "#2a2a2a", borderRadius: 10, padding: 16, marginBottom: 16, border: "1px solid #444" }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><div style={{ gridColumn: "1 / -1" }}><label style={labD}>Nombre</label><input style={inpD} value={name} onChange={e => setName(e.target.value)} /></div><div><label style={labD}>Categoria</label><select style={inpD} value={categoryId} onChange={e => setCategoryId(e.target.value)}>{CATEGORIES.map(c => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}</select></div><div><label style={labD}>Unidad</label><input style={inpD} value={unit} onChange={e => setUnit(e.target.value)} /></div>
    <div style={{ gridColumn: "1 / -1", display: "flex", gap: 16 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#ccc", cursor: "pointer" }}><input type="checkbox" checked={isOrigen} onChange={e => setIsOrigen(e.target.checked)} /><span style={{ background: "#2d6a4f", color: "#fff", fontSize: 9, padding: "2px 6px", borderRadius: 10 }}>PRODUCTO ORIGEN</span></label>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#ccc", cursor: "pointer" }}><input type="checkbox" checked={isRegenerativo} onChange={e => setIsRegenerativo(e.target.checked)} /><span style={{ background: "#6b4226", color: "#fff", fontSize: 9, padding: "2px 6px", borderRadius: 10 }}>REGENERATIVO L2M</span></label>
    </div>
  </div><div style={{ display: "flex", gap: 8, marginTop: 12 }}><button onClick={onCancel} style={pillD}>Cancelar</button><button onClick={() => { if (name.trim()) onSave(name.trim(), categoryId, unit, isOrigen, isRegenerativo); }} style={{ ...pillD, background: "#e8c547", color: "#1a1a1a" }}>Agregar</button></div></div>);
}

function ProductForm({ product, onSave, onCancel }) {
  const [f, setF] = useState(product || { name: "", category_id: "frutas", unit: "kg", price: 0, stock: 100, hours_component: 0, is_active: true, is_origen: false, is_regenerativo: false });
  const set = (k, v) => setF({ ...f, [k]: v });
  return (<div style={{ background: "#2a2a2a", borderRadius: 10, padding: 16, marginBottom: 16, border: "1px solid #444" }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
    <div style={{ gridColumn: "1 / -1" }}><label style={labD}>Nombre</label><input style={inpD} value={f.name} onChange={e => set("name", e.target.value)} /></div>
    <div><label style={labD}>Categoria</label><select style={inpD} value={f.category_id} onChange={e => set("category_id", e.target.value)}>{CATEGORIES.map(c => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}</select></div>
    <div><label style={labD}>Unidad</label><input style={inpD} value={f.unit} onChange={e => set("unit", e.target.value)} /></div>
    <div><label style={labD}>Precio (CLP)</label><input style={inpD} type="number" value={f.price} onChange={e => set("price", parseInt(e.target.value) || 0)} /></div>
    <div><label style={labD}>Horas comp.</label><input style={inpD} type="number" step="0.01" value={f.hours_component} onChange={e => set("hours_component", parseFloat(e.target.value) || 0)} /></div>
    <div><label style={labD}>Stock</label><input style={inpD} type="number" value={f.stock} onChange={e => set("stock", parseInt(e.target.value) || 0)} /></div>
    <div style={{ gridColumn: "1 / -1", display: "flex", gap: 16 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#ccc", cursor: "pointer" }}><input type="checkbox" checked={f.is_origen} onChange={e => set("is_origen", e.target.checked)} /><span style={{ background: "#2d6a4f", color: "#fff", fontSize: 9, padding: "2px 6px", borderRadius: 10 }}>PRODUCTO ORIGEN</span></label>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#ccc", cursor: "pointer" }}><input type="checkbox" checked={f.is_regenerativo} onChange={e => set("is_regenerativo", e.target.checked)} /><span style={{ background: "#6b4226", color: "#fff", fontSize: 9, padding: "2px 6px", borderRadius: 10 }}>REGENERATIVO L2M</span></label>
    </div>
  </div><div style={{ display: "flex", gap: 8, marginTop: 12 }}><button onClick={onCancel} style={pillD}>Cancelar</button><button onClick={() => { if (f.name) onSave(f); }} style={{ ...pillD, background: "#e8c547", color: "#1a1a1a" }}>Guardar</button></div></div>);
}

function AddHoursForm({ members, onSave, onCancel }) {
  const [memberId, setMemberId] = useState(""); const [hours, setHours] = useState(1); const [desc, setDesc] = useState(""); const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10)); const [saving, setSaving] = useState(false);
  const handleSave = async () => { if (!memberId || hours <= 0 || !desc.trim()) return; setSaving(true); await onSave(memberId, hours, desc.trim(), workDate); setSaving(false); };
  return (<div style={{ background: "#2a2a2a", borderRadius: 10, padding: 16, marginBottom: 16, border: "1px solid #444" }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><div style={{ gridColumn: "1 / -1" }}><label style={labD}>Cooperado</label><select style={inpD} value={memberId} onChange={e => setMemberId(e.target.value)}><option value="">Seleccionar...</option>{members.map(m => (<option key={m.id} value={m.id}>{m.full_name} ({m.email})</option>))}</select></div><div><label style={labD}>Horas</label><input style={inpD} type="number" step="0.25" min="0.25" value={hours} onChange={e => setHours(parseFloat(e.target.value) || 0)} /></div><div><label style={labD}>Fecha</label><input style={inpD} type="date" value={workDate} onChange={e => setWorkDate(e.target.value)} /></div><div style={{ gridColumn: "1 / -1" }}><label style={labD}>Descripcion</label><input style={inpD} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ej: Descarga mercaderia..." /></div></div><div style={{ display: "flex", gap: 8, marginTop: 12 }}><button onClick={onCancel} style={pillD}>Cancelar</button><button onClick={handleSave} disabled={saving || !memberId || hours <= 0 || !desc.trim()} style={{ ...pillD, background: saving ? "#555" : "#e8c547", color: "#1a1a1a", opacity: (!memberId || hours <= 0 || !desc.trim()) ? 0.5 : 1 }}>{saving ? "Guardando..." : "Registrar"}</button></div></div>);
}

const pillD = { background: "#333", color: "#ccc", border: "none", borderRadius: 20, padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" };
const labD = { display: "block", fontSize: 12, fontWeight: 600, color: "#aaa", marginBottom: 4 };
const inpD = { width: "100%", padding: "10px 12px", background: "#333", color: "#fff", border: "1px solid #444", borderRadius: 8, fontSize: 14, boxSizing: "border-box" };
const selectDark = { background: "#333", color: "#fff", border: "1px solid #444", borderRadius: 8, padding: "6px 12px", fontSize: 12 };
