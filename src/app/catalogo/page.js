"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const fmt = (n) => "$" + Math.round(n).toLocaleString("es-CL");
const fmtH = (h) => {
  if (h === 0) return "0 hrs";
  if (h < 0.01) return "< 0,01 hrs";
  return h.toFixed(2).replace(".", ",") + " hrs";
};

export default function CatalogoPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginSent, setLoginSent] = useState(false);
  const [member, setMember] = useState(null);
  const [hourValue, setHourValue] = useState(3750);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [cycle, setCycle] = useState(null);
  const [orders, setOrders] = useState([]);
  const [myWorkHours, setMyWorkHours] = useState([]);
  const [availableShifts, setAvailableShifts] = useState([]);
  const [mySignups, setMySignups] = useState([]);

  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState({});
  const [showCart, setShowCart] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showHoursPanel, setShowHoursPanel] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [payWithHours, setPayWithHours] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => { setSession(session); if (event === "SIGNED_IN") setLoading(false); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    const loadData = async () => {
      const email = session.user.email;
      const { data: existingMember } = await supabase.from("members").select("*").eq("email", email).single();
      if (existingMember) { setMember(existingMember); } else {
        const { data: newMember } = await supabase.from("members").insert({ email, full_name: session.user.user_metadata?.full_name || email }).select().single();
        setMember(newMember);
      }
      const { data: cats } = await supabase.from("categories").select("*").order("sort_order");
      setCategories(cats || []);
      const { data: prods } = await supabase.from("products").select("*").eq("is_active", true).order("name");
      setProducts(prods || []);
      const { data: activeCycle } = await supabase.from("cycles").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(1).single();
      setCycle(activeCycle);
      const { data: settingHour } = await supabase.from("settings").select("value").eq("key", "hour_value_clp").single();
      if (settingHour) setHourValue(parseInt(settingHour.value));
      if (existingMember) {
        const { data: myOrders } = await supabase.from("orders").select("*, order_items(*)").eq("member_id", existingMember.id).order("created_at", { ascending: false });
        setOrders(myOrders || []);
        const { data: wh } = await supabase.from("work_hours").select("*").eq("member_id", existingMember.id).order("created_at", { ascending: false });
        setMyWorkHours(wh || []);
        const { data: shifts } = await supabase.from("work_shifts").select("*").eq("status", "open").order("shift_date", { ascending: true });
        setAvailableShifts(shifts || []);
        const { data: signups } = await supabase.from("shift_signups").select("*").eq("member_id", existingMember.id);
        setMySignups(signups || []);
      }
    };
    loadData();
  }, [session]);

  const handleLogin = async () => {
    if (!loginEmail.trim()) return;
    const { error } = await supabase.auth.signInWithOtp({ email: loginEmail.trim().toLowerCase(), options: { data: { full_name: loginName.trim() }, emailRedirectTo: window.location.origin + "/catalogo" } });
    if (!error) setLoginSent(true);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setSession(null); setMember(null); setCart({}); };

  const updateCart = (pid, delta) => {
    const prod = products.find(p => p.id === pid);
    const currentQty = cart[pid] || 0;
    const newQty = Math.max(0, currentQty + delta);
    if (delta > 0 && prod && newQty > prod.stock) { showToast("Stock insuficiente"); return; }
    const updated = { ...cart, [pid]: newQty };
    if (newQty === 0) delete updated[pid];
    setCart(updated);
  };

  const cartItems = Object.entries(cart).filter(([, q]) => q > 0);
  const cartTotal = cartItems.reduce((sum, [pid, qty]) => { const prod = products.find(p => p.id === pid); return sum + (prod ? prod.price * qty : 0); }, 0);
  const cartTotalHours = cartItems.reduce((sum, [pid, qty]) => { const prod = products.find(p => p.id === pid); return sum + (prod ? (parseFloat(prod.hours_component) || 0) * qty : 0); }, 0);
  const cartCount = cartItems.reduce((s, [, q]) => s + q, 0);

  const hoursBalance = parseFloat(member?.hours_balance) || 0;
  const hoursToUse = payWithHours ? Math.min(hoursBalance, cartTotalHours) : 0;
  const hoursToPayInMoney = cartTotalHours - hoursToUse;
  const hoursMoneyEquivalent = Math.round(hoursToPayInMoney * hourValue);
  const grandTotal = cartTotal + hoursMoneyEquivalent;

  const signUpForShift = async (shiftId) => {
    if (!member) return;
    const shift = availableShifts.find(s => s.id === shiftId);
    if (!shift || shift.slots_taken >= shift.slots) { showToast("Turno completo"); return; }
    if (mySignups.some(s => s.shift_id === shiftId)) { showToast("Ya estas inscrito"); return; }
    const { error } = await supabase.from("shift_signups").insert({ shift_id: shiftId, member_id: member.id, status: "inscrito" });
    if (error) { showToast("Error al inscribirse"); return; }
    await supabase.from("work_shifts").update({ slots_taken: shift.slots_taken + 1 }).eq("id", shiftId);
    setAvailableShifts(availableShifts.map(s => s.id === shiftId ? { ...s, slots_taken: s.slots_taken + 1 } : s));
    setMySignups([...mySignups, { shift_id: shiftId, member_id: member.id, status: "inscrito" }]);
    showToast("Inscrito en el turno");
  };

  const cancelSignup = async (shiftId) => {
    if (!member) return;
    await supabase.from("shift_signups").delete().eq("shift_id", shiftId).eq("member_id", member.id);
    const shift = availableShifts.find(s => s.id === shiftId);
    if (shift) { await supabase.from("work_shifts").update({ slots_taken: Math.max(0, shift.slots_taken - 1) }).eq("id", shiftId); setAvailableShifts(availableShifts.map(s => s.id === shiftId ? { ...s, slots_taken: Math.max(0, s.slots_taken - 1) } : s)); }
    setMySignups(mySignups.filter(s => s.shift_id !== shiftId));
    showToast("Inscripcion cancelada");
  };

  const submitOrder = async () => {
    if (!member || !cycle || cartItems.length === 0) return;
    const { data: order, error: orderError } = await supabase.from("orders").insert({ member_id: member.id, cycle_id: cycle.id, total: grandTotal, total_hours: cartTotalHours, hours_paid_with_balance: hoursToUse, hours_paid_with_money: hoursToPayInMoney, payment_method: "pending", status: "pendiente_pago" }).select().single();
    if (orderError) { showToast("Error al enviar pedido"); return; }
    const items = cartItems.map(([pid, qty]) => { const prod = products.find(p => p.id === pid); const hc = parseFloat(prod.hours_component) || 0; return { order_id: order.id, product_id: pid, product_name: prod.name, product_unit: prod.unit, price: prod.price, quantity: qty, subtotal: prod.price * qty, hours_component: hc, hours_subtotal: hc * qty }; });
    await supabase.from("order_items").insert(items);
    for (const [pid, qty] of cartItems) { const prod = products.find(p => p.id === pid); if (prod) await supabase.from("products").update({ stock: Math.max(0, prod.stock - qty) }).eq("id", pid); }
    if (hoursToUse > 0) { await supabase.from("members").update({ hours_balance: hoursBalance - hoursToUse }).eq("id", member.id); setMember({ ...member, hours_balance: hoursBalance - hoursToUse }); }
    setCart({}); setShowCart(false); setShowPayment(false);
    try { await fetch("/api/send-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: session.user.email, name: member?.full_name || "Cooperado", items, total: grandTotal, totalHours: cartTotalHours, hoursUsed: hoursToUse, hoursInMoney: hoursMoneyEquivalent, cycleName: cycle.name, orderId: order.id.slice(0, 8).toUpperCase(), date: new Date().toLocaleDateString("es-CL"), hourValue }) }); } catch (e) { console.log("Email error:", e); }
    showToast("Pedido enviado! Pendiente de pago.");
    const { data: prods } = await supabase.from("products").select("*").eq("is_active", true).order("name"); setProducts(prods || []);
    const { data: myOrders } = await supabase.from("orders").select("*, order_items(*)").eq("member_id", member.id).order("created_at", { ascending: false }); setOrders(myOrders || []);
  };

  const filteredProducts = products.filter(p => { const matchCat = activeCategory === "all" || p.category_id === activeCategory; const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()); return matchCat && matchSearch; });

  const statusLabels = {
    pendiente_pago: { text: "Pendiente de pago", bg: "#fff3cd", color: "#856404" },
    cobrar_en_caja: { text: "Cobrar en caja", bg: "#ffe0b2", color: "#e65100" },
    pagado: { text: "Pagado", bg: "#d4edda", color: "#155724" },
    preparando: { text: "Preparando", bg: "#d1ecf1", color: "#0c5460" },
    listo: { text: "Listo para retiro", bg: "#d4edda", color: "#155724" },
    entregado: { text: "Entregado", bg: "#e2e3e5", color: "#383d41" },
    cancelado: { text: "Cancelado", bg: "#f8d7da", color: "#721c24" },
  };
  const whStatusColors = { pendiente: "#e8c547", aprobado: "#40916c", rechazado: "#e63946" };

  if (loading) return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 20 }}>Cargando...</span></div>);

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #faf9f6 0%, #e8e4dd 100%)", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 16, padding: "40px 32px", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🌾</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Cooperativa Origen</h1>
            <p style={{ fontSize: 13, color: "#888", marginTop: 6 }}>PLATAFORMA DE PEDIDOS</p>
          </div>
          {loginSent ? (
            <div style={{ textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <h3 style={{ marginBottom: 8 }}>Revisa tu correo</h3>
              <p style={{ color: "#888", fontSize: 14 }}>Te enviamos un enlace de acceso a <strong>{loginEmail}</strong>.</p>
              <button onClick={() => setLoginSent(false)} style={{ marginTop: 16, background: "none", border: "1px solid #ddd", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>Intentar con otro correo</button>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 16 }}><label style={labelStyle}>Nombre completo</label><input style={inputStyle} value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="Ej: Maria Gonzalez" /></div>
              <div style={{ marginBottom: 24 }}><label style={labelStyle}>Correo electronico</label><input style={inputStyle} type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="maria@ejemplo.cl" onKeyDown={e => e.key === "Enter" && handleLogin()} /></div>
              <button onClick={handleLogin} style={{ width: "100%", background: "#2d6a4f", color: "#fff", border: "none", borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 600, cursor: "pointer" }} disabled={!loginEmail.trim()}>Recibir enlace de acceso</button>
              <p style={{ textAlign: "center", fontSize: 12, color: "#aaa", marginTop: 12 }}>Enlace seguro a tu correo. Sin contrasenas.</p>
            </div>
          )}
          <div style={{ textAlign: "center", marginTop: 20 }}><Link href="/" style={{ color: "#999", fontSize: 12, textDecoration: "underline" }}>Volver al inicio</Link></div>
        </div>
      </div>
    );
  }

  // HOURS PANEL
  if (showHoursPanel) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", padding: 20 }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <button onClick={() => setShowHoursPanel(false)} style={pillBtn}>Volver al catalogo</button>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "16px 0" }}>Mis Horas de Trabajo</h2>
          <div style={{ background: "linear-gradient(135deg, #2d6a4f, #40916c)", borderRadius: 12, padding: 20, color: "#fff", marginBottom: 20 }}>
            <div style={{ fontSize: 12, opacity: 0.8, letterSpacing: 1 }}>MI SALDO DE HORAS</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>{fmtH(hoursBalance)}</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Equivalente a {fmt(hoursBalance * hourValue)} (a {fmt(hourValue)}/hr)</div>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Turnos Disponibles</h3>
          {availableShifts.length === 0 ? (<p style={{ color: "#888", fontSize: 14, marginBottom: 20 }}>No hay turnos disponibles.</p>) : (
            <div style={{ marginBottom: 24 }}>
              {availableShifts.map(shift => {
                const isSignedUp = mySignups.some(s => s.shift_id === shift.id);
                const isFull = shift.slots_taken >= shift.slots;
                return (
                  <div key={shift.id} style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 10, border: "1px solid #eee" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{shift.title}</div>
                        {shift.description && <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{shift.description}</div>}
                        <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>Fecha: {shift.shift_date}{shift.start_time && " | " + shift.start_time}{shift.end_time && " - " + shift.end_time}</div>
                        <div style={{ fontSize: 13, marginTop: 4 }}><span style={{ color: "#b5651d", fontWeight: 600 }}>{fmtH(parseFloat(shift.hours))}</span><span style={{ color: "#888", marginLeft: 12 }}>Cupos: {shift.slots_taken}/{shift.slots}</span></div>
                      </div>
                      <div>
                        {isSignedUp ? (<div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#2d6a4f", fontWeight: 600, marginBottom: 4 }}>Inscrito</div><button onClick={() => cancelSignup(shift.id)} style={{ ...pillBtn, background: "#f8d7da", color: "#721c24", fontSize: 11 }}>Cancelar</button></div>)
                        : isFull ? (<span style={{ fontSize: 12, color: "#999" }}>Completo</span>)
                        : (<button onClick={() => signUpForShift(shift.id)} style={{ ...pillBtn, background: "#2d6a4f", color: "#fff" }}>Inscribirme</button>)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Historial de Horas Trabajadas</h3>
          {myWorkHours.length === 0 ? (<p style={{ color: "#888", fontSize: 14 }}>Aun no tienes horas registradas.</p>) : myWorkHours.map(wh => (
            <div key={wh.id} style={{ background: "#fff", borderRadius: 10, padding: "12px 16px", marginBottom: 6, border: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontSize: 14, fontWeight: 600 }}>{wh.description}</div><div style={{ fontSize: 12, color: "#888" }}>{wh.work_date} | {fmtH(parseFloat(wh.hours))}</div></div>
              <span style={{ fontSize: 12, fontWeight: 600, color: whStatusColors[wh.status] || "#888" }}>{wh.status === "aprobado" ? "Aprobado" : wh.status === "pendiente" ? "Pendiente" : "Rechazado"}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ORDER HISTORY
  if (showHistory) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", padding: 20 }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <button onClick={() => setShowHistory(false)} style={pillBtn}>Volver al catalogo</button>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "16px 0" }}>Historial de Pedidos</h2>
          {orders.length === 0 ? (<p style={{ color: "#888" }}>No tienes pedidos anteriores.</p>) : orders.map(o => {
            const st = statusLabels[o.status] || statusLabels.pendiente_pago;
            return (
              <div key={o.id} style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #eee" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 4 }}>
                  <span style={{ fontSize: 12, background: st.bg, color: st.color, padding: "2px 8px", borderRadius: 20 }}>{st.text}</span>
                  <span style={{ fontSize: 12, color: "#888" }}>{new Date(o.created_at).toLocaleDateString("es-CL")}</span>
                </div>
                {o.order_items?.map((it, i) => (<div key={i} style={{ fontSize: 13, color: "#555", display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span>{it.product_name} x {it.quantity}</span><span>{fmt(it.subtotal)} {parseFloat(it.hours_subtotal) > 0 ? "+ " + fmtH(parseFloat(it.hours_subtotal)) : ""}</span></div>))}
                <div style={{ borderTop: "1px solid #eee", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                  <span>Total</span><span style={{ color: "#2d6a4f" }}>{fmt(o.total)} {parseFloat(o.total_hours) > 0 ? "+ " + fmtH(parseFloat(o.total_hours)) : ""}</span>
                </div>
                {o.status === "pendiente_pago" && (<div style={{ marginTop: 8, padding: 10, background: "#fff3cd", borderRadius: 8, fontSize: 12, color: "#856404" }}>Paga por transferencia o en caja de Mercado Origen.</div>)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // MAIN SHOP
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {toast && (<div className="toast" style={{ position: "fixed", top: 16, right: 16, zIndex: 999, background: "#2d6a4f", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>{toast}</div>)}

      <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "12px 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🌾</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>Cooperativa Origen</div>
              <div style={{ fontSize: 11, color: "#888" }}>Hola, {member?.full_name?.split(" ")[0] || "cooperado"} · <span style={{ color: "#b5651d", fontWeight: 600 }}>{fmtH(hoursBalance)}</span></div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setShowHoursPanel(true)} style={{ ...pillBtn, background: "#b5651d", color: "#fff" }}>Mis Horas</button>
            <button onClick={() => setShowHistory(true)} style={pillBtn}>Pedidos</button>
            <button onClick={() => setShowCart(true)} style={{ ...pillBtn, background: cartCount > 0 ? "#2d6a4f" : "#f0f0f0", color: cartCount > 0 ? "#fff" : "#333" }}>{cartCount > 0 ? cartCount + " items" : "Carrito"}</button>
            {member?.is_admin && <Link href="/admin" style={{ ...pillBtn, background: "#222", color: "#e8c547", fontSize: 11, display: "inline-block", padding: "8px 14px", borderRadius: 20 }}>Admin</Link>}
            <button onClick={handleLogout} style={{ ...pillBtn, fontSize: 11 }}>Salir</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "16px auto", padding: "0 20px" }}>
        <div style={{ background: cycle ? "linear-gradient(135deg, #2d6a4f, #40916c)" : "#6c757d", borderRadius: 12, padding: "14px 20px", color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: 1 }}>{cycle ? "CICLO ABIERTO" : "SIN CICLO ACTIVO"}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{cycle?.name || "No hay ciclo de pedidos abierto"}</div>
            </div>
            {cycle && <div style={{ fontSize: 12, opacity: 0.9 }}>{cycle.start_date} - {cycle.end_date}</div>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>
        <input style={{ ...inputStyle, marginBottom: 12 }} placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8 }}>
          <button onClick={() => setActiveCategory("all")} style={{ ...catBtn, background: activeCategory === "all" ? "#1a1a1a" : "#f0f0f0", color: activeCategory === "all" ? "#fff" : "#555" }}>Todos</button>
          {categories.map(c => (<button key={c.id} onClick={() => setActiveCategory(c.id)} style={{ ...catBtn, background: activeCategory === c.id ? (c.color || "#333") : "#f0f0f0", color: activeCategory === c.id ? "#fff" : "#555" }}>{c.icon} {c.name}</button>))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "16px auto", padding: "0 20px 100px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {filteredProducts.map(p => {
          const cat = categories.find(c => c.id === p.category_id);
          const qty = cart[p.id] || 0;
          const hc = parseFloat(p.hours_component) || 0;
          const outOfStock = p.stock <= 0;
          return (
            <div key={p.id} style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #eee", display: "flex", flexDirection: "column", opacity: outOfStock ? 0.5 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontSize: 11, background: (cat?.color || "#333") + "18", color: cat?.color || "#333", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{cat?.icon} {cat?.name}</div>
                <div style={{ fontSize: 10, color: outOfStock ? "#e63946" : "#888" }}>{outOfStock ? "Agotado" : "Stock: " + p.stock}</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>por {p.unit}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#2d6a4f" }}>{fmt(p.price)}</div>
                  {hc > 0 && <div style={{ fontSize: 11, color: "#b5651d", fontWeight: 600 }}>+ {fmtH(hc)}</div>}
                </div>
                {cycle && !outOfStock ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {qty > 0 && <button onClick={() => updateCart(p.id, -1)} style={qtyBtn}>-</button>}
                    {qty > 0 && <span style={{ fontSize: 16, fontWeight: 700, minWidth: 24, textAlign: "center" }}>{qty}</span>}
                    <button onClick={() => updateCart(p.id, 1)} style={{ ...qtyBtn, background: "#2d6a4f", color: "#fff", border: "none" }}>+</button>
                  </div>
                ) : !cycle ? (<span style={{ fontSize: 11, color: "#999" }}>Sin ciclo activo</span>) : (<span style={{ fontSize: 11, color: "#e63946" }}>Agotado</span>)}
              </div>
            </div>
          );
        })}
      </div>

      {cartCount > 0 && !showCart && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 200 }}>
          <button onClick={() => setShowCart(true)} style={{ background: "#2d6a4f", color: "#fff", border: "none", borderRadius: 50, padding: "14px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "0 6px 24px rgba(45,106,79,0.4)", display: "flex", alignItems: "center", gap: 8 }}>
            Carrito ({cartCount}) - {fmt(cartTotal)} {cartTotalHours > 0 ? "+ " + fmtH(cartTotalHours) : ""}
          </button>
        </div>
      )}

      {showCart && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "flex-end" }} onClick={(e) => { if (e.target === e.currentTarget) setShowCart(false); }}>
          <div style={{ width: "100%", maxWidth: 440, background: "#fff", height: "100%", overflowY: "auto", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Tu Pedido</h2>
              <button onClick={() => setShowCart(false)} style={{ background: "none", border: "none", fontSize: 24, color: "#999", cursor: "pointer" }}>X</button>
            </div>
            {cartItems.length === 0 ? (<p style={{ color: "#888", textAlign: "center", marginTop: 40 }}>Carrito vacio</p>
            ) : showPayment ? (
              <div>
                <h3 style={{ fontSize: 16, marginBottom: 16 }}>Resumen de Pago</h3>
                <div style={{ background: "#f8f8f8", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}><span>Productos (pesos)</span><span style={{ fontWeight: 700 }}>{fmt(cartTotal)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}><span>Componente horas</span><span style={{ fontWeight: 700, color: "#b5651d" }}>{fmtH(cartTotalHours)}</span></div>
                  {hoursBalance > 0 && (<div style={{ borderTop: "1px solid #ddd", paddingTop: 8, marginTop: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={payWithHours} onChange={e => setPayWithHours(e.target.checked)} />Usar mi saldo ({fmtH(hoursBalance)})</label>
                    {payWithHours && hoursToUse > 0 && (<div style={{ fontSize: 12, color: "#2d6a4f", marginTop: 4 }}>Se descontaran {fmtH(hoursToUse)}</div>)}
                  </div>)}
                </div>
                {hoursToPayInMoney > 0 && (<div style={{ background: "#fff3cd", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: "#856404" }}>{fmtH(hoursToPayInMoney)} = {fmt(hoursMoneyEquivalent)} (a {fmt(hourValue)}/hr)</div>)}
                <div style={{ background: "#2d6a4f", borderRadius: 10, padding: 16, marginBottom: 16, color: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700 }}><span>Total a pagar</span><span>{fmt(grandTotal)}</span></div>
                  {hoursToUse > 0 && (<div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>+ {fmtH(hoursToUse)} de tu saldo</div>)}
                </div>
                <div style={{ background: "#f0f4f8", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: "#555" }}>
                  <strong>Formas de pago:</strong><div style={{ marginTop: 4 }}>Transferencia bancaria</div><div>Pago en caja Mercado Origen</div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#888" }}>Pedido queda "Pendiente de pago" hasta confirmacion.</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setShowPayment(false)} style={{ flex: 1, background: "#f0f0f0", border: "none", borderRadius: 10, padding: "14px", fontSize: 14, cursor: "pointer" }}>Volver</button>
                  <button onClick={submitOrder} style={{ flex: 2, background: "#2d6a4f", color: "#fff", border: "none", borderRadius: 10, padding: "14px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>Confirmar Pedido</button>
                </div>
              </div>
            ) : (
              <div>
                {cartItems.map(([pid, qty]) => {
                  const prod = products.find(p => p.id === pid); if (!prod) return null;
                  const hc = parseFloat(prod.hours_component) || 0;
                  return (
                    <div key={pid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f0f0f0" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{prod.name}</div>
                        <div style={{ fontSize: 12, color: "#888" }}>{fmt(prod.price)} x {qty} = {fmt(prod.price * qty)}</div>
                        {hc > 0 && <div style={{ fontSize: 11, color: "#b5651d" }}>+ {fmtH(hc)} x {qty} = {fmtH(hc * qty)}</div>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => updateCart(pid, -1)} style={qtyBtn}>-</button>
                        <span style={{ fontWeight: 700, minWidth: 20, textAlign: "center" }}>{qty}</span>
                        <button onClick={() => updateCart(pid, 1)} style={{ ...qtyBtn, background: "#2d6a4f", color: "#fff", border: "none" }}>+</button>
                      </div>
                    </div>
                  );
                })}
                <div style={{ marginTop: 20, padding: "16px 0", borderTop: "2px solid #1a1a1a" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700 }}><span>Subtotal</span><span style={{ color: "#2d6a4f" }}>{fmt(cartTotal)}</span></div>
                  {cartTotalHours > 0 && (<div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#b5651d", fontWeight: 600, marginTop: 4 }}><span>Horas</span><span>{fmtH(cartTotalHours)}</span></div>)}
                </div>
                <button onClick={() => setShowPayment(true)} style={{ width: "100%", marginTop: 12, background: "#2d6a4f", color: "#fff", border: "none", borderRadius: 10, padding: "14px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>Continuar al pago</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 4 };
const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, boxSizing: "border-box" };
const pillBtn = { background: "#f0f0f0", border: "none", borderRadius: 20, padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" };
const catBtn = { border: "none", borderRadius: 20, padding: "8px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" };
const qtyBtn = { width: 32, height: 32, borderRadius: "50%", border: "1px solid #ddd", background: "#f8f8f8", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, lineHeight: 1 };
