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
  const pLabel = isPaid ? "PAGADO CON TRANSFERENCIA" : "COBRAR EN CAJA";
  const pColor = isPaid ? "#155724" : "#e65100";
  const pBg = isPaid ? "#d4edda" : "#ffe0b2";
  const tH = parseFloat(order.total_hours) || 0;
  const hU = parseFloat(order.hours_paid_with_balance) || 0;
  const hM = parseFloat(order.hours_paid_with_money) || 0;
  const hMV = Math.round(hM * hourValue);
  const rows = order.order_items?.map(it => "<tr><td style='padding:6px 10px;border-bottom:1px solid #ddd'>" + it.product_name + "</td><td style='padding:6px 10px;border-bottom:1px solid #ddd;text-align:center'>" + it.quantity + " " + it.product_unit + "</td><td style='padding:6px 10px;border-bottom:1px solid #ddd;text-align:right'>$" + it.subtotal.toLocaleString("es-CL") + "</td><td style='padding:6px 10px;border-bottom:1px solid #ddd;text-align:center;width:40px'>[ ]</td></tr>").join("") || "";
  const html = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Pedido " + order.id.slice(0,8).toUpperCase() + "</title><style>body{font-family:Arial,sans-serif;margin:20px;color:#333}@media print{body{margin:10px}.no-print{display:none}}</style></head><body><div style='text-align:center;margin-bottom:20px'><h1 style='margin:0;font-size:22px'>Cooperativa Origen</h1><p style='margin:4px 0;font-size:13px;color:#888'>Documento de Picking</p></div><div style='background:" + pBg + ";border:3px solid " + pColor + ";border-radius:10px;padding:20px;text-align:center;margin-bottom:20px'><div style='font-size:28px;font-weight:900;color:" + pColor + "'>" + pLabel + "</div></div><table style='width:100%;margin-bottom:16px;font-size:14px'><tr><td><strong>Pedido:</strong> " + order.id.slice(0,8).toUpperCase() + "</td><td style='text-align:right'><strong>Fecha:</strong> " + new Date(order.created_at).toLocaleDateString("es-CL") + "</td></tr><tr><td><strong>Cooperado:</strong> " + (order.members?.full_name || "---") + "</td><td style='text-align:right'>" + (order.members?.email || "") + "</td></tr></table><table style='width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px'><thead><tr style='background:#2d6a4f;color:#fff'><th style='padding:8px 10px;text-align:left'>Producto</th><th style='padding:8px 10px;text-align:center'>Cantidad</th><th style='padding:8px 10px;text-align:right'>Subtotal</th><th style='padding:8px 10px;text-align:center'>OK</th></tr></thead><tbody>" + rows + "</tbody></table><div style='border-top:2px solid #333;padding-top:12px;font-size:14px'><div style='display:flex;justify-content:space-between;margin-bottom:4px'><span>Total:</span><strong>$" + order.total.toLocaleString("es-CL") + "</strong></div>" + (tH > 0 ? "<div style='display:flex;justify-content:space-between;margin-bottom:4px;color:#b5651d'><span>Horas:</span><strong>" + fmtH(tH) + "</strong></div>" : "") + (hU > 0 ? "<div style='display:flex;justify-content:space-between;margin-bottom:4px;color:#2d6a4f'><span>Saldo:</span><strong>-" + fmtH(hU) + "</strong></div>" : "") + (hM > 0 ? "<div style='display:flex;justify-content:space-between'><span>Horas $:</span><strong>$" + hMV.toLocaleString("es-CL") + "</strong></div>" : "") + "</div>" + (isCaja ? "<div style='margin-top:20px;border:2px dashed " + pColor + ";border-radius:10px;padding:16px;text-align:center'><div style='font-size:20px;font-weight:700;color:" + pColor + "'>COBRAR: $" + order.total.toLocaleString("es-CL") + "</div></div>" : "") + "<div style='margin-top:30px;display:flex;justify-content:space-between;font-size:12px;color:#888'><span>Preparado: ___________</span><span>Revisado: ___________</span><span>Entregado: ___________</span></div><div class='no-print' style='text-align:center;margin-top:30px'><button onclick='window.print()' style='background:#2d6a4f;color:#fff;border:none;border-radius:10px;padding:12px 32px;font-size:16px;cursor:pointer'>Imprimir</button></div></body></html>";
  const w = window.open("", "_blank"); w.document.write(html); w.document.close();
}

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [hourValue, setHourValue] = useState(3750);
  const [cycleMode, setCycleMode] = useState("cycles");
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
  const [showNewCycle, setShowNewCycle] = useState(false);
  const [hoursSubTab, setHoursSubTab] = useState("shifts");
  const [membersSubTab, setMembersSubTab] = useState("pending");
  const [sendingNotif, setSendingNotif] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

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
    const { data: cm } = await supabase.from("settings").select("value").eq("key", "cycle_mode").single(); if (cm) setCycleMode(cm.value);
    const { data: allShifts } = await supabase.from("work_shifts").select("*").order("shift_date", { ascending: false }); setShifts(allShifts || []);
    const { data: allSignups } = await supabase.from("shift_signups").select("*, members(full_name, email)").order("created_at", { ascending: false }); setShiftSignups(allSignups || []);
  };

  useEffect(() => { if (!session) return; const load = async () => { const { data: m } = await supabase.from("members").select("*").eq("email", session.user.email).single(); if (!m || !m.is_admin) { setMember(null); setLoading(false); return; } setMember(m); await refreshData(); }; load(); }, [session]);

  const handleLogout = async () => { await supabase.auth.signOut(); };

  if (loading) return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#121212", color: "#fff" }}><span>Cargando...</span></div>);
  if (!session) return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#121212", color: "#fff", padding: 20 }}><div style={{ textAlign: "center" }}><h2>Acceso Administrador</h2><p style={{ color: "#888", margin: "12px 0 20px" }}>Inicia sesion primero.</p><Link href="/catalogo" style={{ background: "#e8c547", color: "#1a1a1a", padding: "12px 24px", borderRadius: 10, fontWeight: 600, display: "inline-block" }}>Ir al Login</Link></div></div>);
  if (!member || !member.is_admin) return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#121212", color: "#fff", padding: 20 }}><div style={{ textAlign: "center" }}><h2>Sin permisos</h2><Link href="/catalogo" style={{ background: "#2d6a4f", color: "#fff", padding: "12px 24px", borderRadius: 10, fontWeight: 600, display: "inline-block", marginTop: 16 }}>Volver</Link></div></div>);

  const cycleOrders = cycle ? orders.filter(o => o.cycle_id === cycle.id) : orders;
  const totalRevenue = cycleOrders.reduce((s, o) => s + o.total, 0);
  const uniqueUsers = new Set(cycleOrders.map(o => o.member_id)).size;
  const pendingPayment = cycleOrders.filter(o => o.status === "pendiente_pago").length;
  const pendingCaja = cycleOrders.filter(o => o.status === "cobrar_en_caja").length;
  const pendingApproval = members.filter(m => m.approval_status === "pendiente").length;
  const consolidated = {}; cycleOrders.filter(o => o.status !== "cancelado").forEach(o => { o.order_items?.forEach(it => { if (!consolidated[it.product_id]) consolidated[it.product_id] = { ...it, totalQty: 0, totalAmount: 0, totalHours: 0 }; consolidated[it.product_id].totalQty += it.quantity; consolidated[it.product_id].totalAmount += it.subtotal; consolidated[it.product_id].totalHours += parseFloat(it.hours_subtotal) || 0; }); });

  const toggleCycleMode = async () => { const nm = cycleMode === "cycles" ? "always_open" : "cycles"; await supabase.from("settings").update({ value: nm }).eq("key", "cycle_mode"); setCycleMode(nm); showToast(nm === "cycles" ? "Modo ciclos" : "Siempre abierto"); };

  const closeCycle = async () => { if (!cycle) return; await supabase.from("cycles").update({ status: "closed" }).eq("id", cycle.id); setCycle({ ...cycle, status: "closed" }); showToast("Ciclo cerrado"); };

  const createNewCycle = async (name, closeDate, notify) => {
    const t = new Date();
    const { data } = await supabase.from("cycles").insert({ name, status: "open", start_date: t.toISOString().slice(0, 10), end_date: closeDate ? new Date(closeDate).toISOString().slice(0, 10) : t.toISOString().slice(0, 10), close_date: closeDate || null }).select().single();
    if (data) {
      setCycle(data); setAllCycles([data, ...allCycles]); showToast("Ciclo creado y abierto");
      if (notify) {
        setSendingNotif(true);
        try {
          const res = await fetch("/api/send-cycle-notification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cycleName: name, closeDate }) });
          const result = await res.json();
          showToast("Notificacion enviada a " + (result.sent || 0) + " cooperados");
        } catch (e) { showToast("Ciclo creado pero error al notificar"); }
        setSendingNotif(false);
      }
    }
    setShowNewCycle(false);
  };

  const saveProduct = async (prod) => {
    const u = { name: prod.name, category_id: prod.category_id, unit: prod.unit, price: prod.price, stock: prod.stock, hours_component: prod.hours_component, is_active: prod.is_active, is_origen: prod.is_origen || false, is_regenerativo: prod.is_regenerativo || false };
    if (prod.id) { await supabase.from("products").update(u).eq("id", prod.id); setProducts(products.map(p => p.id === prod.id ? { ...p, ...u } : p)); showToast("Actualizado"); }
    else { const { data } = await supabase.from("products").insert({ ...u, is_active: true }).select().single(); if (data) setProducts([...products, data]); showToast("Agregado"); }
    setEditProd(null); setNewProd(false);
  };
  const deleteProduct = async (id) => { await supabase.from("products").delete().eq("id", id); setProducts(products.filter(p => p.id !== id)); showToast("Eliminado"); };
  const updateOrderStatus = async (oid, ns) => { await supabase.from("orders").update({ status: ns }).eq("id", oid); setOrders(orders.map(o => o.id === oid ? { ...o, status: ns } : o)); showToast("Actualizado"); };
  const handleTransfer = async (o) => { await supabase.from("orders").update({ status: "pagado", payment_method: "transfer" }).eq("id", o.id); setOrders(orders.map(x => x.id === o.id ? { ...x, status: "pagado", payment_method: "transfer" } : x)); showToast("Transferencia OK"); };
  const handleCaja = async (o) => { await supabase.from("orders").update({ status: "cobrar_en_caja", payment_method: "cash" }).eq("id", o.id); setOrders(orders.map(x => x.id === o.id ? { ...x, status: "cobrar_en_caja", payment_method: "cash" } : x)); showToast("Cobrar en caja"); };
  const confirmCaja = async (o) => { await supabase.from("orders").update({ status: "pagado" }).eq("id", o.id); setOrders(orders.map(x => x.id === o.id ? { ...x, status: "pagado" } : x)); showToast("Pago OK"); };
  const approveMember = async (id) => { await supabase.from("members").update({ approval_status: "aprobado" }).eq("id", id); setMembers(members.map(m => m.id === id ? { ...m, approval_status: "aprobado" } : m)); showToast("Aprobado"); };
  const rejectMember = async (id) => { await supabase.from("members").update({ approval_status: "rechazado" }).eq("id", id); setMembers(members.map(m => m.id === id ? { ...m, approval_status: "rechazado" } : m)); showToast("Rechazado"); };

  const submitStockEntry = async (e) => {
    try { const mp = masterProducts.find(m => m.id === e.masterProductId); if (!mp) return;
    let pid; const ex = products.find(p => p.name === mp.name);
    if (ex) { await supabase.from("products").update({ stock: ex.stock + e.quantity, price: e.totalPrice, hours_component: e.hoursComponent || ex.hours_component, is_origen: e.isOrigen, is_regenerativo: e.isRegenerativo }).eq("id", ex.id); pid = ex.id; setProducts(products.map(p => p.id === ex.id ? { ...p, stock: ex.stock + e.quantity, price: e.totalPrice, is_origen: e.isOrigen, is_regenerativo: e.isRegenerativo } : p)); }
    else { const { data: np } = await supabase.from("products").insert({ name: mp.name, category_id: mp.category_id, unit: mp.unit, price: e.totalPrice, stock: e.quantity, hours_component: e.hoursComponent || 0, is_active: true, is_origen: e.isOrigen, is_regenerativo: e.isRegenerativo }).select().single(); if (np) { pid = np.id; setProducts([...products, np]); } }
    await supabase.from("stock_entries").insert({ product_id: pid, master_product_id: e.masterProductId, quantity: e.quantity, net_price: e.netPrice, iva: e.iva, total_price: e.totalPrice, doc_type: e.docType, doc_number: e.docNumber, supplier_name: e.supplierName, supplier_rut: e.supplierRut, cycle_id: cycle?.id, notes: e.notes });
    const { data: se } = await supabase.from("stock_entries").select("*, products(name)").order("created_at", { ascending: false }); setStockEntries(se || []); showToast("Ingreso OK"); } catch (err) { showToast("Error"); }
    setShowStockEntry(false);
  };
  const addMaster = async (n, c, u, o, r) => { const { data } = await supabase.from("master_products").insert({ name: n, category_id: c, unit: u, is_origen: o, is_regenerativo: r }).select().single(); if (data) { setMasterProducts([...masterProducts, data]); showToast("Agregado"); } setShowAddMaster(false); };
  const addWH = async (mid, h, d, wd) => { try { await supabase.from("work_hours").insert({ member_id: mid, hours: parseFloat(h), description: d, work_date: wd, status: "aprobado", approved_by: member.id, approved_at: new Date().toISOString() }); const t = members.find(m => m.id === mid); if (t) { const nb = (parseFloat(t.hours_balance)||0)+parseFloat(h); await supabase.from("members").update({ hours_balance: nb }).eq("id", mid); setMembers(members.map(m => m.id === mid ? { ...m, hours_balance: nb } : m)); } const { data: wh } = await supabase.from("work_hours").select("*, members(full_name, email)").order("created_at", { ascending: false }); setWorkHours(wh||[]); showToast("Horas OK"); } catch(e) { showToast("Error"); } setShowAddHours(false); };
  const createShift = async (s) => { const { data } = await supabase.from("work_shifts").insert({ title: s.title, description: s.description, shift_date: s.shiftDate, start_time: s.startTime, end_time: s.endTime, hours: parseFloat(s.hours), slots: parseInt(s.slots), status: "open", created_by: member.id }).select().single(); if (data) { setShifts([data, ...shifts]); showToast("Turno OK"); } setShowAddShift(false); };
  const closeShift = async (id) => { await supabase.from("work_shifts").update({ status: "closed" }).eq("id", id); setShifts(shifts.map(s => s.id === id ? { ...s, status: "closed" } : s)); showToast("Cerrado"); };
  const completeShift = async (shift) => { const su = shiftSignups.filter(s => s.shift_id === shift.id && s.status === "inscrito"); for (const s of su) { await supabase.from("work_hours").insert({ member_id: s.member_id, hours: parseFloat(shift.hours), description: "Turno: " + shift.title, work_date: shift.shift_date, status: "aprobado", approved_by: member.id, approved_at: new Date().toISOString() }); const t = members.find(m => m.id === s.member_id); if (t) { const nb = (parseFloat(t.hours_balance)||0)+parseFloat(shift.hours); await supabase.from("members").update({ hours_balance: nb }).eq("id", s.member_id); setMembers(prev => prev.map(m => m.id === s.member_id ? { ...m, hours_balance: nb } : m)); } await supabase.from("shift_signups").update({ status: "completado" }).eq("id", s.id); } await supabase.from("work_shifts").update({ status: "completed" }).eq("id", shift.id); setShifts(shifts.map(s => s.id === shift.id ? { ...s, status: "completed" } : s)); setShiftSignups(shiftSignups.map(s => s.shift_id === shift.id ? { ...s, status: "completado" } : s)); const { data: wh } = await supabase.from("work_hours").select("*, members(full_name, email)").order("created_at", { ascending: false }); setWorkHours(wh||[]); showToast(su.length + " acreditados"); };
  const exportCSV = () => { const r = [["Producto","Unidad","$","Hrs","Cant","$Total","HrsTotal"]]; Object.values(consolidated).forEach(c => r.push([c.product_name,c.product_unit,c.price,parseFloat(c.hours_component)||0,c.totalQty,c.totalAmount,c.totalHours.toFixed(2)])); r.push(["","","","","TOTAL",totalRevenue,Object.values(consolidated).reduce((s,c)=>s+c.totalHours,0).toFixed(2)]); const b = new Blob(["\uFEFF"+r.map(x=>x.join(";")).join("\n")],{type:"text/csv;charset=utf-8"}); const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="consolidado.csv"; a.click(); showToast("CSV OK"); };
  const sB = (p) => (<span style={{ display:"inline-flex",gap:4,marginLeft:6 }}>{p.is_origen && <span style={{ background:"#2d6a4f",color:"#fff",fontSize:8,padding:"2px 5px",borderRadius:10 }}>ORIGEN</span>}{p.is_regenerativo && <span style={{ background:"#6b4226",color:"#fff",fontSize:8,padding:"2px 5px",borderRadius:10 }}>L2M</span>}</span>);

  return (
    <div style={{ minHeight:"100vh",background:"#121212",color:"#e0e0e0" }}>
      {toast && (<div style={{ position:"fixed",top:16,right:16,zIndex:999,background:"#2d6a4f",color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:14,fontWeight:600,boxShadow:"0 4px 16px rgba(0,0,0,0.2)" }}>{toast}</div>)}
      <div style={{ background:"#1a1a1a",borderBottom:"1px solid #333",padding:"12px 20px" }}><div style={{ maxWidth:1100,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}><span style={{ fontSize:16,fontWeight:700,color:"#e8c547" }}>Admin - Cooperativa Origen</span><div style={{ display:"flex",gap:8 }}><Link href="/catalogo" style={pillD}>Catalogo</Link><button onClick={handleLogout} style={pillD}>Salir</button></div></div></div>

      <div style={{ maxWidth:1100,margin:"16px auto",padding:"0 20px",display:"flex",gap:6,overflowX:"auto" }}>
        {[["dashboard","Dashboard"],["stock","Ingreso"],["products","Productos"],["orders","Pedidos"],["consolidated","Consolidado"],["hours","Horas/Turnos"],["members","Miembros"+(pendingApproval>0?" ("+pendingApproval+")":"")]].map(([k,l]) => (<button key={k} onClick={()=>setTab(k)} style={{ border:"none",borderRadius:20,padding:"8px 14px",fontSize:11,fontWeight:tab===k?700:400,background:tab===k?"#e8c547":k==="members"&&pendingApproval>0?"#e65100":"#222",color:tab===k?"#1a1a1a":k==="members"&&pendingApproval>0?"#fff":"#999",cursor:"pointer",whiteSpace:"nowrap" }}>{l}</button>))}
      </div>

      <div style={{ maxWidth:1100,margin:"0 auto",padding:"0 20px 40px" }}>

        {tab === "dashboard" && (<div>
          <div style={{ background:"#1e1e1e",borderRadius:12,padding:20,marginBottom:16,border:"1px solid #333" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12 }}>
              <div>
                <div style={{ fontSize:12,color:"#888",letterSpacing:1 }}>MODO: {cycleMode==="cycles"?"CICLOS":"SIEMPRE ABIERTO"}</div>
                {cycleMode==="cycles" ? (<div>
                  <div style={{ fontSize:18,fontWeight:700,marginTop:4 }}>{cycle?.name || "Sin ciclo"} {cycle && <span style={{ fontSize:12,color:cycle.status==="open"?"#40916c":"#e63946",marginLeft:8 }}>({cycle.status})</span>}</div>
                  {cycle?.close_date && <div style={{ fontSize:13,color:"#888",marginTop:2 }}>Cierre: {new Date(cycle.close_date).toLocaleDateString("es-CL",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>}
                  {!cycle?.close_date && cycle && <div style={{ fontSize:13,color:"#888",marginTop:2 }}>{cycle.start_date} - {cycle.end_date}</div>}
                </div>) : (<div style={{ fontSize:18,fontWeight:700,marginTop:4 }}>Tienda abierta permanentemente</div>)}
              </div>
              <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                <button onClick={toggleCycleMode} style={{ ...pillD,background:"#444",color:cycleMode==="cycles"?"#e8c547":"#40916c" }}>{cycleMode==="cycles"?"Modo siempre abierto":"Modo ciclos"}</button>
                {cycleMode==="cycles" && (<>
                  {cycle && cycle.status==="open" && <button onClick={closeCycle} style={{ ...pillD,background:"#e63946",color:"#fff" }}>Cerrar ciclo</button>}
                  <button onClick={()=>setShowNewCycle(true)} style={{ ...pillD,color:"#e8c547" }}>+ Nuevo Ciclo</button>
                </>)}
              </div>
            </div>
          </div>
          {showNewCycle && <NewCycleForm onSave={createNewCycle} onCancel={()=>setShowNewCycle(false)} sending={sendingNotif} />}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))",gap:10 }}>
            {[{l:"Pedidos",v:cycleOrders.length},{l:"Pago pend.",v:pendingPayment},{l:"Cobrar caja",v:pendingCaja},{l:"Cooperados",v:uniqueUsers},{l:"Venta",v:fmt(totalRevenue)},{l:"Productos",v:products.filter(p=>p.is_active).length},{l:"Por aprobar",v:pendingApproval},{l:"Turnos",v:shifts.filter(s=>s.status==="open").length}].map((x,i) => (<div key={i} style={{ background:"#1e1e1e",borderRadius:12,padding:14,border:"1px solid #333" }}><div style={{ fontSize:20,fontWeight:700,color:x.l==="Por aprobar"&&x.v>0?"#e65100":"#e8c547" }}>{x.v}</div><div style={{ fontSize:10,color:"#888",marginTop:2 }}>{x.l}</div></div>))}
          </div>
        </div>)}

        {tab==="stock" && (<div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8 }}><h3 style={{ color:"#e8c547" }}>Ingreso Mercaderia</h3><div style={{ display:"flex",gap:8 }}><button onClick={()=>setShowAddMaster(true)} style={{ ...pillD,background:"#444",color:"#e8c547" }}>+ Maestra</button><button onClick={()=>setShowStockEntry(true)} style={{ ...pillD,background:"#2d6a4f",color:"#fff" }}>+ Ingreso</button></div></div>
          {showAddMaster && <AddMasterForm onSave={addMaster} onCancel={()=>setShowAddMaster(false)} />}
          {showStockEntry && <StockEntryForm masterProducts={masterProducts} onSave={submitStockEntry} onCancel={()=>setShowStockEntry(false)} />}
          <h4 style={{ color:"#888",fontSize:13,marginBottom:8 }}>Ultimos ingresos</h4>
          {stockEntries.length===0?(<p style={{ color:"#888" }}>Sin ingresos.</p>):stockEntries.slice(0,20).map(se=>(<div key={se.id} style={{ background:"#1e1e1e",borderRadius:10,padding:"12px 16px",marginBottom:6,border:"1px solid #333" }}><div style={{ display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4 }}><div><span style={{ fontWeight:600 }}>{se.products?.name||"---"}</span><span style={{ color:"#888",fontSize:12,marginLeft:8 }}>x{se.quantity}</span></div><span style={{ fontSize:12,color:"#888" }}>{new Date(se.created_at).toLocaleDateString("es-CL")}</span></div><div style={{ fontSize:12,color:"#888",marginTop:4 }}>{se.doc_type.toUpperCase()} {se.doc_number||""} | {fmt(se.net_price)}+{fmt(se.iva)}={fmt(se.total_price)}/u {se.supplier_name?"| "+se.supplier_name:""}</div></div>))}
          <h4 style={{ color:"#888",fontSize:13,marginTop:24,marginBottom:8 }}>Maestra ({masterProducts.length})</h4>
          {masterProducts.map(mp=>{const cat=CATEGORIES.find(c=>c.id===mp.category_id);return(<div key={mp.id} style={{ background:"#1e1e1e",borderRadius:8,padding:"8px 14px",marginBottom:4,border:"1px solid #333",fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center" }}><span>{cat?.icon} {mp.name}{sB(mp)}</span><span style={{ color:"#888" }}>{mp.unit}</span></div>);})}
        </div>)}

        {tab==="products" && (<div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}><h3 style={{ color:"#e8c547" }}>Catalogo ({products.length})</h3><button onClick={()=>{setNewProd(true);setEditProd(null);}} style={{ ...pillD,background:"#2d6a4f",color:"#fff" }}>+ Agregar</button></div>
          {(newProd||editProd) && <ProductForm product={editProd} onSave={saveProduct} onCancel={()=>{setEditProd(null);setNewProd(false);}} />}
          {products.map(p=>{const cat=CATEGORIES.find(c=>c.id===p.category_id);const hc=parseFloat(p.hours_component)||0;return(
            <div key={p.id} style={{ background:"#1e1e1e",borderRadius:10,padding:"12px 16px",marginBottom:6,border:"1px solid #333",display:"flex",justifyContent:"space-between",alignItems:"center",opacity:p.is_active?1:0.5 }}>
              <div style={{ flex:1 }}><div style={{ fontSize:14,fontWeight:600 }}>{cat?.icon} {p.name}{sB(p)}</div><div style={{ fontSize:12,color:"#888" }}>{fmt(p.price)} {hc>0?"+ "+fmtH(hc):""} / {p.unit} | Stock: {p.stock}</div></div>
              <div style={{ display:"flex",gap:6 }}><button onClick={()=>{setEditProd(p);setNewProd(false);}} style={{ ...pillD,fontSize:11 }}>Editar</button><button onClick={async()=>{await supabase.from("products").update({is_active:!p.is_active}).eq("id",p.id);setProducts(products.map(x=>x.id===p.id?{...x,is_active:!x.is_active}:x));}} style={{ ...pillD,color:p.is_active?"#e63946":"#2d6a4f",fontSize:11 }}>{p.is_active?"Pausar":"Activar"}</button><button onClick={()=>deleteProduct(p.id)} style={{ ...pillD,color:"#e63946",fontSize:11 }}>Borrar</button></div>
            </div>);})}
        </div>)}

        {tab==="orders" && (<div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8 }}><h3 style={{ color:"#e8c547" }}>Pedidos{cycle?": "+cycle.name:""}</h3>{cycleMode==="cycles"&&<select style={selectDark} value={cycle?.id||""} onChange={e=>setCycle(allCycles.find(c=>c.id===e.target.value))}>{allCycles.map(c=>(<option key={c.id} value={c.id}>{c.name} ({c.status})</option>))}</select>}</div>
          {cycleOrders.length===0?(<p style={{ color:"#888" }}>Sin pedidos.</p>):cycleOrders.map(o=>{const st=STATUS_LABELS[o.status]||STATUS_LABELS.pendiente_pago;return(
            <div key={o.id} style={{ background:"#1e1e1e",borderRadius:10,padding:16,marginBottom:10,border:"1px solid #333" }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:4 }}><div><strong>{o.members?.full_name}</strong><span style={{ color:"#888",fontSize:12,marginLeft:8 }}>{o.members?.email}</span></div><span style={{ fontSize:11,background:st.bg,color:st.color,padding:"2px 8px",borderRadius:20 }}>{st.text}</span></div>
              {o.order_items?.map((it,i)=>(<div key={i} style={{ fontSize:13,color:"#aaa",display:"flex",justifyContent:"space-between",padding:"1px 0" }}><span>{it.product_name} x {it.quantity}</span><span>{fmt(it.subtotal)}</span></div>))}
              <div style={{ borderTop:"1px solid #333",marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}>
                <div><span style={{ fontWeight:700,color:"#e8c547" }}>{fmt(o.total)}</span>{parseFloat(o.total_hours)>0&&(<span style={{ color:"#b5651d",fontSize:12,marginLeft:8 }}>({fmtH(o.total_hours)})</span>)}</div>
                <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                  <button onClick={()=>generatePickingDoc(o,hourValue)} style={{ ...pillD,background:"#444",color:"#fff",fontSize:11 }}>Imprimir</button>
                  {o.status==="pendiente_pago"&&(<><button onClick={()=>handleTransfer(o)} style={{ ...pillD,background:"#2d6a4f",color:"#fff",fontSize:11 }}>Transferencia</button><button onClick={()=>handleCaja(o)} style={{ ...pillD,background:"#e65100",color:"#fff",fontSize:11 }}>Cobrar caja</button></>)}
                  {o.status==="cobrar_en_caja"&&(<button onClick={()=>confirmCaja(o)} style={{ ...pillD,background:"#2d6a4f",color:"#fff",fontSize:11 }}>Confirmar pago</button>)}
                  {(o.status==="pagado"||o.status==="preparando"||o.status==="listo")&&(<select style={selectDark} value={o.status} onChange={e=>updateOrderStatus(o.id,e.target.value)}><option value="pagado">pagado</option><option value="preparando">preparando</option><option value="listo">listo</option><option value="entregado">entregado</option><option value="cancelado">cancelado</option></select>)}
                </div>
              </div>
            </div>);})}
        </div>)}

        {tab==="consolidated" && (<div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8 }}><h3 style={{ color:"#e8c547" }}>Consolidado</h3><button onClick={exportCSV} style={{ ...pillD,background:"#2d6a4f",color:"#fff" }}>CSV</button></div>
          {Object.keys(consolidated).length===0?(<p style={{ color:"#888" }}>Sin pedidos.</p>):(<div style={{ overflowX:"auto" }}><table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}><thead><tr style={{ background:"#222" }}>{["Producto","Unidad","$","Hrs","Cant.","$Total","HrsTotal"].map(h=>(<th key={h} style={{ padding:"8px 10px",textAlign:"left",color:"#e8c547",fontWeight:600,borderBottom:"1px solid #444",fontSize:11 }}>{h}</th>))}</tr></thead><tbody>{Object.values(consolidated).map((c,i)=>(<tr key={i} style={{ background:i%2===0?"#1a1a1a":"#1e1e1e" }}><td style={{ padding:"6px 10px" }}>{c.product_name}</td><td style={{ padding:"6px 10px",color:"#888" }}>{c.product_unit}</td><td style={{ padding:"6px 10px" }}>{fmt(c.price)}</td><td style={{ padding:"6px 10px",color:"#b5651d" }}>{fmtH(parseFloat(c.hours_component)||0)}</td><td style={{ padding:"6px 10px",fontWeight:700 }}>{c.totalQty}</td><td style={{ padding:"6px 10px",fontWeight:700,color:"#e8c547" }}>{fmt(c.totalAmount)}</td><td style={{ padding:"6px 10px",fontWeight:700,color:"#b5651d" }}>{fmtH(c.totalHours)}</td></tr>))}</tbody><tfoot><tr style={{ background:"#2d6a4f" }}><td colSpan={4} style={{ padding:"8px 10px",fontWeight:700,color:"#fff" }}>TOTAL</td><td style={{ padding:"8px 10px",fontWeight:700,color:"#fff" }}>{Object.values(consolidated).reduce((s,c)=>s+c.totalQty,0)}</td><td style={{ padding:"8px 10px",fontWeight:700,color:"#fff" }}>{fmt(totalRevenue)}</td><td style={{ padding:"8px 10px",fontWeight:700,color:"#fff" }}>{fmtH(Object.values(consolidated).reduce((s,c)=>s+c.totalHours,0))}</td></tr></tfoot></table></div>)}
        </div>)}

        {tab==="hours" && (<div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8 }}><h3 style={{ color:"#e8c547" }}>Horas y Turnos</h3><span style={{ fontSize:12,color:"#888" }}>Valor: {fmt(hourValue)}/hr</span></div>
          <div style={{ display:"flex",gap:6,marginBottom:16 }}>{[["shifts","Turnos"],["manual","Manual"],["history","Historial"]].map(([k,l])=>(<button key={k} onClick={()=>setHoursSubTab(k)} style={{ border:"none",borderRadius:16,padding:"6px 12px",fontSize:11,background:hoursSubTab===k?"#b5651d":"#222",color:hoursSubTab===k?"#fff":"#888",cursor:"pointer" }}>{l}</button>))}</div>
          {hoursSubTab==="shifts"&&(<div>
            <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:12 }}><button onClick={()=>setShowAddShift(true)} style={{ ...pillD,background:"#2d6a4f",color:"#fff" }}>+ Turno</button></div>
            {showAddShift&&<ShiftForm onSave={createShift} onCancel={()=>setShowAddShift(false)} />}
            {shifts.length===0?(<p style={{ color:"#888" }}>Sin turnos.</p>):shifts.map(sh=>{const su=shiftSignups.filter(s=>s.shift_id===sh.id);const sc=sh.status==="open"?"#2d6a4f":sh.status==="completed"?"#888":"#e63946";return(
              <div key={sh.id} style={{ background:"#1e1e1e",borderRadius:10,padding:16,marginBottom:10,border:"1px solid #333" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8 }}>
                  <div><div style={{ fontSize:15,fontWeight:700 }}>{sh.title}</div>{sh.description&&<div style={{ fontSize:12,color:"#888",marginTop:2 }}>{sh.description}</div>}<div style={{ fontSize:12,color:"#888",marginTop:4 }}>{sh.shift_date} {sh.start_time?"| "+sh.start_time:""} {sh.end_time?"- "+sh.end_time:""} | {fmtH(parseFloat(sh.hours))} | {sh.slots_taken}/{sh.slots}</div></div>
                  <div style={{ display:"flex",gap:6,alignItems:"center" }}><span style={{ fontSize:11,color:sc,fontWeight:600 }}>{sh.status==="open"?"Abierto":sh.status==="completed"?"Completado":"Cerrado"}</span>{sh.status==="open"&&(<><button onClick={()=>closeShift(sh.id)} style={{ ...pillD,fontSize:11,color:"#e63946" }}>Cerrar</button><button onClick={()=>completeShift(sh)} style={{ ...pillD,fontSize:11,background:"#2d6a4f",color:"#fff" }}>Completar</button></>)}</div>
                </div>
                {su.length>0&&(<div style={{ marginTop:8,borderTop:"1px solid #333",paddingTop:8 }}><div style={{ fontSize:11,color:"#888",marginBottom:4 }}>Inscritos:</div>{su.map(s=>(<div key={s.id} style={{ fontSize:12,color:"#ccc",padding:"2px 0" }}>{s.members?.full_name||"---"} <span style={{ color:"#888" }}>({s.members?.email})</span><span style={{ marginLeft:8,fontSize:10,color:s.status==="completado"?"#40916c":"#e8c547" }}>{s.status}</span></div>))}</div>)}
              </div>);})}
          </div>)}
          {hoursSubTab==="manual"&&(<div><div style={{ display:"flex",justifyContent:"flex-end",marginBottom:12 }}><button onClick={()=>setShowAddHours(true)} style={{ ...pillD,background:"#2d6a4f",color:"#fff" }}>+ Horas</button></div>{showAddHours&&<AddHoursForm members={members} onSave={addWH} onCancel={()=>setShowAddHours(false)} />}</div>)}
          {(hoursSubTab==="manual"||hoursSubTab==="history")&&(<div><h4 style={{ color:"#888",fontSize:13,marginBottom:8,marginTop:hoursSubTab==="history"?0:16 }}>Historial</h4>{workHours.length===0?(<p style={{ color:"#888" }}>Sin registros.</p>):workHours.slice(0,30).map(wh=>(<div key={wh.id} style={{ background:"#1e1e1e",borderRadius:8,padding:"10px 14px",marginBottom:4,border:"1px solid #333",display:"flex",justifyContent:"space-between",alignItems:"center" }}><div><span style={{ fontSize:13,fontWeight:600 }}>{wh.members?.full_name||"---"}</span><span style={{ color:"#888",fontSize:11,marginLeft:8 }}>{wh.description} | {wh.work_date} | {fmtH(wh.hours)}</span></div><span style={{ fontSize:11,color:wh.status==="aprobado"?"#40916c":wh.status==="pendiente"?"#e8c547":"#e63946" }}>{wh.status}</span></div>))}</div>)}
        </div>)}

        {tab==="members" && (<div>
          <h3 style={{ color:"#e8c547",marginBottom:16 }}>Miembros ({members.length})</h3>
          <div style={{ display:"flex",gap:6,marginBottom:16 }}>{[["pending","Pendientes ("+pendingApproval+")"],["approved","Aprobados"],["rejected","Rechazados"]].map(([k,l])=>(<button key={k} onClick={()=>setMembersSubTab(k)} style={{ border:"none",borderRadius:16,padding:"6px 12px",fontSize:11,background:membersSubTab===k?(k==="pending"?"#e65100":"#2d6a4f"):"#222",color:membersSubTab===k?"#fff":"#888",cursor:"pointer" }}>{l}</button>))}</div>
          {membersSubTab==="pending"&&(<div>{members.filter(m=>m.approval_status==="pendiente").length===0?(<p style={{ color:"#888" }}>Sin pendientes.</p>):members.filter(m=>m.approval_status==="pendiente").map(m=>(<div key={m.id} style={{ background:"#1e1e1e",borderRadius:10,padding:"14px 16px",marginBottom:8,border:"1px solid #e65100",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}><div><div style={{ fontWeight:600,fontSize:14 }}>{m.full_name}</div><div style={{ color:"#888",fontSize:12 }}>{m.email}</div><div style={{ color:"#888",fontSize:11,marginTop:2 }}>Registro: {new Date(m.created_at).toLocaleDateString("es-CL")}</div></div><div style={{ display:"flex",gap:6 }}><button onClick={()=>approveMember(m.id)} style={{ ...pillD,background:"#2d6a4f",color:"#fff",fontSize:12 }}>Aprobar</button><button onClick={()=>rejectMember(m.id)} style={{ ...pillD,background:"#e63946",color:"#fff",fontSize:12 }}>Rechazar</button></div></div>))}</div>)}
          {membersSubTab==="approved"&&(<div>{members.filter(m=>m.approval_status==="aprobado"||!m.approval_status).map(m=>(<div key={m.id} style={{ background:"#1e1e1e",borderRadius:10,padding:"10px 16px",marginBottom:6,border:"1px solid #333",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}><div><span style={{ fontWeight:600,fontSize:14 }}>{m.full_name}</span><span style={{ color:"#888",fontSize:12,marginLeft:8 }}>{m.email}</span>{m.is_admin&&<span style={{ marginLeft:8,background:"#e8c547",color:"#1a1a1a",padding:"1px 6px",borderRadius:10,fontSize:10,fontWeight:700 }}>ADMIN</span>}</div><div style={{ display:"flex",gap:12,alignItems:"center" }}><span style={{ fontSize:12,color:"#b5651d",fontWeight:600 }}>{fmtH(m.hours_balance)}</span></div></div>))}</div>)}
          {membersSubTab==="rejected"&&(<div>{members.filter(m=>m.approval_status==="rechazado").length===0?(<p style={{ color:"#888" }}>Sin rechazados.</p>):members.filter(m=>m.approval_status==="rechazado").map(m=>(<div key={m.id} style={{ background:"#1e1e1e",borderRadius:10,padding:"10px 16px",marginBottom:6,border:"1px solid #333",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}><div><span style={{ fontWeight:600 }}>{m.full_name}</span><span style={{ color:"#888",fontSize:12,marginLeft:8 }}>{m.email}</span></div><div style={{ display:"flex",gap:6 }}><span style={{ fontSize:11,color:"#e63946" }}>Rechazado</span><button onClick={()=>approveMember(m.id)} style={{ ...pillD,background:"#2d6a4f",color:"#fff",fontSize:11 }}>Aprobar</button></div></div>))}</div>)}
        </div>)}
      </div>
    </div>
  );
}

function NewCycleForm({ onSave, onCancel, sending }) {
  const [name, setName] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [closeTime, setCloseTime] = useState("18:00");
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const cd = closeDate ? closeDate + "T" + closeTime + ":00" : null;
    await onSave(name.trim(), cd, notify);
    setSaving(false);
  };
  return (<div style={{ background:"#2a2a2a",borderRadius:10,padding:16,marginBottom:16,border:"1px solid #444" }}>
    <h4 style={{ color:"#e8c547",marginBottom:12,fontSize:14 }}>Nuevo Ciclo de Pedidos</h4>
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
      <div style={{ gridColumn:"1 / -1" }}><label style={labD}>Nombre del ciclo</label><input style={inpD} value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: Ciclo abril Q1 2026" /></div>
      <div><label style={labD}>Fecha de cierre</label><input style={inpD} type="date" value={closeDate} onChange={e=>setCloseDate(e.target.value)} /></div>
      <div><label style={labD}>Hora de cierre</label><input style={inpD} type="time" value={closeTime} onChange={e=>setCloseTime(e.target.value)} /></div>
      <div style={{ gridColumn:"1 / -1" }}>
        <label style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#ccc",cursor:"pointer" }}>
          <input type="checkbox" checked={notify} onChange={e=>setNotify(e.target.checked)} />
          Enviar correo a todos los cooperados aprobados avisando del nuevo ciclo
        </label>
      </div>
    </div>
    <div style={{ display:"flex",gap:8,marginTop:12 }}>
      <button onClick={onCancel} style={pillD}>Cancelar</button>
      <button onClick={handleSave} disabled={saving||sending||!name.trim()} style={{ ...pillD,background:(saving||sending)?"#555":"#e8c547",color:"#1a1a1a",opacity:!name.trim()?0.5:1 }}>
        {saving ? "Creando..." : sending ? "Enviando correos..." : notify ? "Crear y notificar" : "Crear ciclo"}
      </button>
    </div>
  </div>);
}

function ShiftForm({ onSave, onCancel }) {
  const [title,setTitle]=useState("");const [description,setDescription]=useState("");const [shiftDate,setShiftDate]=useState(new Date().toISOString().slice(0,10));const [startTime,setStartTime]=useState("09:00");const [endTime,setEndTime]=useState("12:00");const [hours,setHours]=useState("3");const [slots,setSlots]=useState(5);const [saving,setSaving]=useState(false);
  const handleSave=async()=>{if(!title.trim()||parseFloat(hours)<=0||slots<=0)return;setSaving(true);await onSave({title:title.trim(),description:description.trim(),shiftDate,startTime,endTime,hours:parseFloat(hours),slots});setSaving(false);};
  return(<div style={{ background:"#2a2a2a",borderRadius:10,padding:16,marginBottom:16,border:"1px solid #444" }}><h4 style={{ color:"#e8c547",marginBottom:12,fontSize:14 }}>Publicar Turno</h4><div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}><div style={{ gridColumn:"1 / -1" }}><label style={labD}>Titulo</label><input style={inpD} value={title} onChange={e=>setTitle(e.target.value)} /></div><div style={{ gridColumn:"1 / -1" }}><label style={labD}>Descripcion</label><input style={inpD} value={description} onChange={e=>setDescription(e.target.value)} /></div><div><label style={labD}>Fecha</label><input style={inpD} type="date" value={shiftDate} onChange={e=>setShiftDate(e.target.value)} /></div><div><label style={labD}>Cupos</label><input style={inpD} type="number" min="1" value={slots} onChange={e=>setSlots(parseInt(e.target.value)||1)} /></div><div><label style={labD}>Hora inicio</label><input style={inpD} type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} /></div><div><label style={labD}>Hora fin</label><input style={inpD} type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} /></div><div><label style={labD}>Horas a acreditar</label><input style={inpD} value={hours} onChange={e=>setHours(e.target.value)} /></div></div><div style={{ display:"flex",gap:8,marginTop:12 }}><button onClick={onCancel} style={pillD}>Cancelar</button><button onClick={handleSave} disabled={saving} style={{ ...pillD,background:saving?"#555":"#e8c547",color:"#1a1a1a" }}>{saving?"...":"Publicar"}</button></div></div>);
}

function StockEntryForm({ masterProducts, onSave, onCancel }) {
  const [mid,setMid]=useState("");const [qty,setQty]=useState(1);const [np,setNp]=useState(0);const [ir,setIr]=useState(19);const [dt,setDt]=useState("factura");const [dn,setDn]=useState("");const [sn,setSn]=useState("");const [sr,setSr]=useState("");const [hc,setHc]=useState(0);const [io,setIo]=useState(false);const [irg,setIrg]=useState(false);const [notes,setNotes]=useState("");const [saving,setSaving]=useState(false);
  const iva=Math.round(np*ir/100);const tp=np+iva;
  const sel=masterProducts.find(m=>m.id===mid);
  useEffect(()=>{if(sel){setIo(sel.is_origen||false);setIrg(sel.is_regenerativo||false);}},[mid]);
  const handleSave=async()=>{if(!mid||qty<=0||np<=0)return;setSaving(true);await onSave({masterProductId:mid,quantity:qty,netPrice:np,iva,totalPrice:tp,docType:dt,docNumber:dn,supplierName:sn,supplierRut:sr,hoursComponent:hc,isOrigen:io,isRegenerativo:irg,notes});setSaving(false);};
  return(<div style={{ background:"#2a2a2a",borderRadius:10,padding:16,marginBottom:16,border:"1px solid #444" }}><h4 style={{ color:"#e8c547",marginBottom:12,fontSize:14 }}>Nuevo Ingreso</h4><div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
    <div style={{ gridColumn:"1 / -1" }}><label style={labD}>Producto</label><select style={inpD} value={mid} onChange={e=>setMid(e.target.value)}><option value="">Seleccionar...</option>{masterProducts.map(mp=>{const cat=CATEGORIES.find(c=>c.id===mp.category_id);return(<option key={mp.id} value={mp.id}>{cat?.icon||""} {mp.name} ({mp.unit})</option>);})}</select></div>
    <div><label style={labD}>Cantidad</label><input style={inpD} type="number" min="1" value={qty} onChange={e=>setQty(parseInt(e.target.value)||0)} /></div>
    <div><label style={labD}>Horas/u</label><input style={inpD} type="number" step="0.01" value={hc} onChange={e=>setHc(parseFloat(e.target.value)||0)} /></div>
    <div><label style={labD}>Neto/u</label><input style={inpD} type="number" value={np} onChange={e=>setNp(parseInt(e.target.value)||0)} /></div>
    <div><label style={labD}>IVA</label><select style={inpD} value={ir} onChange={e=>setIr(parseInt(e.target.value))}><option value={19}>19%</option><option value={0}>Exento</option></select></div>
    <div style={{ gridColumn:"1 / -1",background:"#333",borderRadius:8,padding:10,fontSize:13 }}><div style={{ display:"flex",justifyContent:"space-between" }}><span>Neto:</span><strong>{fmt(np)}</strong></div><div style={{ display:"flex",justifyContent:"space-between" }}><span>IVA:</span><strong>{fmt(iva)}</strong></div><div style={{ display:"flex",justifyContent:"space-between",color:"#e8c547",fontSize:15 }}><span>Total/u:</span><strong>{fmt(tp)}</strong></div><div style={{ display:"flex",justifyContent:"space-between",color:"#888",marginTop:4 }}><span>Total ({qty}u):</span><strong>{fmt(tp*qty)}</strong></div></div>
    <div><label style={labD}>Tipo doc.</label><select style={inpD} value={dt} onChange={e=>setDt(e.target.value)}><option value="factura">Factura</option><option value="boleta">Boleta</option><option value="otro">Otro</option></select></div>
    <div><label style={labD}>N doc.</label><input style={inpD} value={dn} onChange={e=>setDn(e.target.value)} /></div>
    <div><label style={labD}>Razon social</label><input style={inpD} value={sn} onChange={e=>setSn(e.target.value)} /></div>
    <div><label style={labD}>RUT</label><input style={inpD} value={sr} onChange={e=>setSr(e.target.value)} /></div>
    <div style={{ gridColumn:"1 / -1",display:"flex",gap:16 }}><label style={{ display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#ccc",cursor:"pointer" }}><input type="checkbox" checked={io} onChange={e=>setIo(e.target.checked)} /><span style={{ background:"#2d6a4f",color:"#fff",fontSize:9,padding:"2px 6px",borderRadius:10 }}>ORIGEN</span></label><label style={{ display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#ccc",cursor:"pointer" }}><input type="checkbox" checked={irg} onChange={e=>setIrg(e.target.checked)} /><span style={{ background:"#6b4226",color:"#fff",fontSize:9,padding:"2px 6px",borderRadius:10 }}>L2M</span></label></div>
    <div style={{ gridColumn:"1 / -1" }}><label style={labD}>Notas</label><input style={inpD} value={notes} onChange={e=>setNotes(e.target.value)} /></div>
  </div><div style={{ display:"flex",gap:8,marginTop:12 }}><button onClick={onCancel} style={pillD}>Cancelar</button><button onClick={handleSave} disabled={saving||!mid||qty<=0||np<=0} style={{ ...pillD,background:saving?"#555":"#e8c547",color:"#1a1a1a",opacity:(!mid||qty<=0||np<=0)?0.5:1 }}>{saving?"...":"Registrar"}</button></div></div>);
}

function AddMasterForm({ onSave, onCancel }) {
  const [n,setN]=useState("");const [c,setC]=useState("frutas");const [u,setU]=useState("kg");const [io,setIo]=useState(false);const [ir,setIr]=useState(false);
  return(<div style={{ background:"#2a2a2a",borderRadius:10,padding:16,marginBottom:16,border:"1px solid #444" }}><div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}><div style={{ gridColumn:"1 / -1" }}><label style={labD}>Nombre</label><input style={inpD} value={n} onChange={e=>setN(e.target.value)} /></div><div><label style={labD}>Categoria</label><select style={inpD} value={c} onChange={e=>setC(e.target.value)}>{CATEGORIES.map(cat=>(<option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>))}</select></div><div><label style={labD}>Unidad</label><input style={inpD} value={u} onChange={e=>setU(e.target.value)} /></div><div style={{ gridColumn:"1 / -1",display:"flex",gap:16 }}><label style={{ display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#ccc",cursor:"pointer" }}><input type="checkbox" checked={io} onChange={e=>setIo(e.target.checked)} /><span style={{ background:"#2d6a4f",color:"#fff",fontSize:9,padding:"2px 6px",borderRadius:10 }}>ORIGEN</span></label><label style={{ display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#ccc",cursor:"pointer" }}><input type="checkbox" checked={ir} onChange={e=>setIr(e.target.checked)} /><span style={{ background:"#6b4226",color:"#fff",fontSize:9,padding:"2px 6px",borderRadius:10 }}>L2M</span></label></div></div><div style={{ display:"flex",gap:8,marginTop:12 }}><button onClick={onCancel} style={pillD}>Cancelar</button><button onClick={()=>{if(n.trim())onSave(n.trim(),c,u,io,ir);}} style={{ ...pillD,background:"#e8c547",color:"#1a1a1a" }}>Agregar</button></div></div>);
}

function ProductForm({ product, onSave, onCancel }) {
  const [f,setF]=useState(product||{name:"",category_id:"frutas",unit:"kg",price:0,stock:100,hours_component:0,is_active:true,is_origen:false,is_regenerativo:false});
  const s=(k,v)=>setF({...f,[k]:v});
  return(<div style={{ background:"#2a2a2a",borderRadius:10,padding:16,marginBottom:16,border:"1px solid #444" }}><div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
    <div style={{ gridColumn:"1 / -1" }}><label style={labD}>Nombre</label><input style={inpD} value={f.name} onChange={e=>s("name",e.target.value)} /></div>
    <div><label style={labD}>Categoria</label><select style={inpD} value={f.category_id} onChange={e=>s("category_id",e.target.value)}>{CATEGORIES.map(c=>(<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}</select></div>
    <div><label style={labD}>Unidad</label><input style={inpD} value={f.unit} onChange={e=>s("unit",e.target.value)} /></div>
    <div><label style={labD}>Precio</label><input style={inpD} type="number" value={f.price} onChange={e=>s("price",parseInt(e.target.value)||0)} /></div>
    <div><label style={labD}>Horas</label><input style={inpD} type="number" step="0.01" value={f.hours_component} onChange={e=>s("hours_component",parseFloat(e.target.value)||0)} /></div>
    <div><label style={labD}>Stock</label><input style={inpD} type="number" value={f.stock} onChange={e=>s("stock",parseInt(e.target.value)||0)} /></div>
    <div style={{ gridColumn:"1 / -1",display:"flex",gap:16 }}><label style={{ display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#ccc",cursor:"pointer" }}><input type="checkbox" checked={f.is_origen} onChange={e=>s("is_origen",e.target.checked)} /><span style={{ background:"#2d6a4f",color:"#fff",fontSize:9,padding:"2px 6px",borderRadius:10 }}>ORIGEN</span></label><label style={{ display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#ccc",cursor:"pointer" }}><input type="checkbox" checked={f.is_regenerativo} onChange={e=>s("is_regenerativo",e.target.checked)} /><span style={{ background:"#6b4226",color:"#fff",fontSize:9,padding:"2px 6px",borderRadius:10 }}>L2M</span></label></div>
  </div><div style={{ display:"flex",gap:8,marginTop:12 }}><button onClick={onCancel} style={pillD}>Cancelar</button><button onClick={()=>{if(f.name)onSave(f);}} style={{ ...pillD,background:"#e8c547",color:"#1a1a1a" }}>Guardar</button></div></div>);
}

function AddHoursForm({ members, onSave, onCancel }) {
  const [mid,setMid]=useState("");const [h,setH]=useState(1);const [d,setD]=useState("");const [wd,setWd]=useState(new Date().toISOString().slice(0,10));const [saving,setSaving]=useState(false);
  const go=async()=>{if(!mid||h<=0||!d.trim())return;setSaving(true);await onSave(mid,h,d.trim(),wd);setSaving(false);};
  return(<div style={{ background:"#2a2a2a",borderRadius:10,padding:16,marginBottom:16,border:"1px solid #444" }}><div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}><div style={{ gridColumn:"1 / -1" }}><label style={labD}>Cooperado</label><select style={inpD} value={mid} onChange={e=>setMid(e.target.value)}><option value="">Seleccionar...</option>{members.filter(m=>m.approval_status==="aprobado").map(m=>(<option key={m.id} value={m.id}>{m.full_name} ({m.email})</option>))}</select></div><div><label style={labD}>Horas</label><input style={inpD} type="number" step="0.25" min="0.25" value={h} onChange={e=>setH(parseFloat(e.target.value)||0)} /></div><div><label style={labD}>Fecha</label><input style={inpD} type="date" value={wd} onChange={e=>setWd(e.target.value)} /></div><div style={{ gridColumn:"1 / -1" }}><label style={labD}>Descripcion</label><input style={inpD} value={d} onChange={e=>setD(e.target.value)} /></div></div><div style={{ display:"flex",gap:8,marginTop:12 }}><button onClick={onCancel} style={pillD}>Cancelar</button><button onClick={go} disabled={saving||!mid||h<=0||!d.trim()} style={{ ...pillD,background:saving?"#555":"#e8c547",color:"#1a1a1a",opacity:(!mid||h<=0||!d.trim())?0.5:1 }}>{saving?"...":"Registrar"}</button></div></div>);
}

const pillD={background:"#333",color:"#ccc",border:"none",borderRadius:20,padding:"8px 14px",fontSize:13,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap"};
const labD={display:"block",fontSize:12,fontWeight:600,color:"#aaa",marginBottom:4};
const inpD={width:"100%",padding:"10px 12px",background:"#333",color:"#fff",border:"1px solid #444",borderRadius:8,fontSize:14,boxSizing:"border-box"};
const selectDark={background:"#333",color:"#fff",border:"1px solid #444",borderRadius:8,padding:"6px 12px",fontSize:12};
