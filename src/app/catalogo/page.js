"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const fmt = (n) => "$" + Math.round(n).toLocaleString("es-CL");

export default function CatalogoPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginSent, setLoginSent] = useState(false);
  const [member, setMember] = useState(null);

  // Data
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [cycle, setCycle] = useState(null);
  const [orders, setOrders] = useState([]);

  // UI state
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState({});
  const [showCart, setShowCart] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN') setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (!session) return;
    const loadData = async () => {
      const email = session.user.email;

      // Upsert member
      const { data: existingMember } = await supabase.from("members").select("*").eq("email", email).single();
      if (existingMember) {
        setMember(existingMember);
      } else {
        const { data: newMember } = await supabase.from("members").insert({ email, full_name: session.user.user_metadata?.full_name || email }).select().single();
        setMember(newMember);
      }

      // Load catalog
      const { data: cats } = await supabase.from("categories").select("*").order("sort_order");
      setCategories(cats || []);

      const { data: prods } = await supabase.from("products").select("*").eq("is_active", true).order("name");
      setProducts(prods || []);

      // Active cycle
      const { data: activeCycle } = await supabase.from("cycles").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(1).single();
      setCycle(activeCycle);

      // My orders
      if (existingMember) {
        const { data: myOrders } = await supabase.from("orders").select("*, order_items(*)").eq("member_id", existingMember.id).order("created_at", { ascending: false });
        setOrders(myOrders || []);
      }
    };
    loadData();
  }, [session]);

  // Login handler
  const handleLogin = async () => {
    if (!loginEmail.trim()) return;
    const { error } = await supabase.auth.signInWithOtp({
      email: loginEmail.trim().toLowerCase(),
      options: {
        data: { full_name: loginName.trim() },
        emailRedirectTo: `${window.location.origin}/catalogo`,
      },
    });
    if (!error) setLoginSent(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setMember(null);
    setCart({});
  };

  // Cart operations
  const updateCart = (pid, delta) => {
    const newQty = Math.max(0, (cart[pid] || 0) + delta);
    const updated = { ...cart, [pid]: newQty };
    if (newQty === 0) delete updated[pid];
    setCart(updated);
  };

  const cartItems = Object.entries(cart).filter(([, q]) => q > 0);
  const cartTotal = cartItems.reduce((sum, [pid, qty]) => {
    const prod = products.find(p => p.id === pid);
    return sum + (prod ? prod.price * qty : 0);
  }, 0);
  const cartCount = cartItems.reduce((s, [, q]) => s + q, 0);

  // Submit order
  const submitOrder = async () => {
    if (!member || !cycle || cartItems.length === 0) return;
    const { data: order, error: orderError } = await supabase.from("orders").insert({
      member_id: member.id,
      cycle_id: cycle.id,
      total: cartTotal,
      status: "confirmado"
    }).select().single();

    if (orderError) { showToast("Error al enviar pedido"); return; }

    const items = cartItems.map(([pid, qty]) => {
      const prod = products.find(p => p.id === pid);
      return {
        order_id: order.id,
        product_id: pid,
        product_name: prod.name,
        product_unit: prod.unit,
        price: prod.price,
        quantity: qty,
        subtotal: prod.price * qty
      };
    });

    await supabase.from("order_items").insert(items);
    setCart({});
    setShowCart(false);

    // Enviar email de confirmación
    try {
      await fetch("/api/send-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.user.email,
          name: member?.full_name || "Cooperado",
          items: items,
          total: cartTotal,
          cycleName: cycle.name,
          orderId: order.id.slice(0, 8).toUpperCase(),
          date: new Date().toLocaleDateString("es-CL"),
        }),
      });
    } catch (e) { console.log("Email error:", e); }

    showToast("¡Pedido enviado correctamente!");

    // Refresh orders
    const { data: myOrders } = await supabase.from("orders").select("*, order_items(*)").eq("member_id", member.id).order("created_at", { ascending: false });
    setOrders(myOrders || []);
  };

  const filteredProducts = products.filter(p => {
    const matchCat = activeCategory === "all" || p.category_id === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // ---- RENDER ----
  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 48 }}>🌱</span></div>;

  // Login screen
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
              <p style={{ color: "#888", fontSize: 14 }}>Te enviamos un enlace de acceso a <strong>{loginEmail}</strong>. Haz click en el enlace para ingresar.</p>
              <button onClick={() => setLoginSent(false)} style={{ marginTop: 16, background: "none", border: "1px solid #ddd", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>Intentar con otro correo</button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 4 }}>Nombre completo</label>
                <input style={inputStyle} value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="Ej: María González" />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 4 }}>Correo electrónico</label>
                <input style={inputStyle} type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="maria@ejemplo.cl" onKeyDown={e => e.key === "Enter" && handleLogin()} />
              </div>
              <button onClick={handleLogin} style={{ width: "100%", background: "var(--green-700)", color: "#fff", border: "none", borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 600, cursor: "pointer" }} disabled={!loginEmail.trim()}>
                Recibir enlace de acceso
              </button>
              <p style={{ textAlign: "center", fontSize: 12, color: "#aaa", marginTop: 12 }}>Te enviaremos un enlace seguro a tu correo. Sin contraseñas.</p>
            </>
          )}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <Link href="/" style={{ color: "#999", fontSize: 12, textDecoration: "underline" }}>← Volver al inicio</Link>
          </div>
        </div>
      </div>
    );
  }

  // Order history
  if (showHistory) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", padding: 20 }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <button onClick={() => setShowHistory(false)} style={pillBtn}>← Volver al catálogo</button>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "16px 0" }}>📋 Historial de Pedidos</h2>
          {orders.length === 0 ? (
            <p style={{ color: "#888" }}>No tienes pedidos anteriores.</p>
          ) : orders.map(o => (
            <div key={o.id} style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #eee" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 4 }}>
                <span style={{ fontSize: 12, background: "#d4edda", color: "#155724", padding: "2px 8px", borderRadius: 20 }}>✓ {o.status}</span>
                <span style={{ fontSize: 12, color: "#888" }}>{new Date(o.created_at).toLocaleDateString("es-CL")}</span>
              </div>
              {o.order_items?.map((it, i) => (
                <div key={i} style={{ fontSize: 13, color: "#555", display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                  <span>{it.product_name} × {it.quantity}</span><span>{fmt(it.subtotal)}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid #eee", marginTop: 8, paddingTop: 8, textAlign: "right", fontWeight: 700, color: "var(--green-700)" }}>{fmt(o.total)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Main shop view
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {toast && <div className="toast" style={{ position: "fixed", top: 16, right: 16, zIndex: 999, background: "var(--green-700)", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>✅ {toast}</div>}

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "12px 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🌾</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>Cooperativa Origen</div>
              <div style={{ fontSize: 11, color: "#888" }}>Hola, {member?.full_name?.split(" ")[0] || "cooperado"}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setShowHistory(true)} style={pillBtn}>📋</button>
            <button onClick={() => setShowCart(true)} style={{ ...pillBtn, background: cartCount > 0 ? "var(--green-700)" : "#f0f0f0", color: cartCount > 0 ? "#fff" : "#333" }}>
              🛒 {cartCount > 0 && cartCount}
            </button>
            {member?.is_admin && <Link href="/admin" style={{ ...pillBtn, background: "#222", color: "var(--gold)", fontSize: 11, display: "inline-block", padding: "8px 14px", borderRadius: 20 }}>⚙️ Admin</Link>}
            <button onClick={handleLogout} style={{ ...pillBtn, fontSize: 11 }}>Salir</button>
          </div>
        </div>
      </div>

      {/* Cycle Banner */}
      <div style={{ maxWidth: 900, margin: "16px auto", padding: "0 20px" }}>
        <div style={{ background: cycle ? "linear-gradient(135deg, #2d6a4f, #40916c)" : "#6c757d", borderRadius: 12, padding: "14px 20px", color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: 1 }}>{cycle ? "📦 CICLO ABIERTO" : "🔒 SIN CICLO ACTIVO"}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{cycle?.name || "No hay ciclo de pedidos abierto"}</div>
            </div>
            {cycle && <div style={{ fontSize: 12, opacity: 0.9 }}>{cycle.start_date} → {cycle.end_date}</div>}
          </div>
        </div>
      </div>

      {/* Search + Categories */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>
        <input style={{ ...inputStyle, marginBottom: 12 }} placeholder="🔍 Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8 }}>
          <button onClick={() => setActiveCategory("all")} style={{ ...catBtn, background: activeCategory === "all" ? "#1a1a1a" : "#f0f0f0", color: activeCategory === "all" ? "#fff" : "#555" }}>Todos</button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setActiveCategory(c.id)} style={{ ...catBtn, background: activeCategory === c.id ? (c.color || "#333") : "#f0f0f0", color: activeCategory === c.id ? "#fff" : "#555" }}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div style={{ maxWidth: 900, margin: "16px auto", padding: "0 20px 100px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {filteredProducts.map(p => {
          const cat = categories.find(c => c.id === p.category_id);
          const qty = cart[p.id] || 0;
          return (
            <div key={p.id} style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #eee", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 11, background: (cat?.color || "#333") + "18", color: cat?.color || "#333", padding: "2px 8px", borderRadius: 20, fontWeight: 600, alignSelf: "flex-start", marginBottom: 8 }}>
                {cat?.icon} {cat?.name}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>por {p.unit}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--green-700)" }}>{fmt(p.price)}</div>
                {cycle ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {qty > 0 && <button onClick={() => updateCart(p.id, -1)} style={qtyBtn}>−</button>}
                    {qty > 0 && <span style={{ fontSize: 16, fontWeight: 700, minWidth: 24, textAlign: "center" }}>{qty}</span>}
                    <button onClick={() => updateCart(p.id, 1)} style={{ ...qtyBtn, background: "var(--green-700)", color: "#fff", border: "none" }}>+</button>
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: "#999" }}>Sin ciclo activo</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Cart Button */}
      {cartCount > 0 && !showCart && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 200 }}>
          <button onClick={() => setShowCart(true)} style={{ background: "var(--green-700)", color: "#fff", border: "none", borderRadius: 50, padding: "14px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "0 6px 24px rgba(45,106,79,0.4)", display: "flex", alignItems: "center", gap: 8 }}>
            🛒 Ver carrito ({cartCount}) — {fmt(cartTotal)}
          </button>
        </div>
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "flex-end" }} onClick={(e) => { if (e.target === e.currentTarget) setShowCart(false); }}>
          <div style={{ width: "100%", maxWidth: 440, background: "#fff", height: "100%", overflowY: "auto", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>🛒 Tu Pedido</h2>
              <button onClick={() => setShowCart(false)} style={{ background: "none", border: "none", fontSize: 24, color: "#999", cursor: "pointer" }}>✕</button>
            </div>
            {cartItems.length === 0 ? (
              <p style={{ color: "#888", textAlign: "center", marginTop: 40 }}>Tu carrito está vacío</p>
            ) : (
              <>
                {cartItems.map(([pid, qty]) => {
                  const prod = products.find(p => p.id === pid);
                  if (!prod) return null;
                  return (
                    <div key={pid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f0f0f0" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{prod.name}</div>
                        <div style={{ fontSize: 12, color: "#888" }}>{fmt(prod.price)} × {qty} = {fmt(prod.price * qty)}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => updateCart(pid, -1)} style={qtyBtn}>−</button>
                        <span style={{ fontWeight: 700, minWidth: 20, textAlign: "center" }}>{qty}</span>
                        <button onClick={() => updateCart(pid, 1)} style={{ ...qtyBtn, background: "var(--green-700)", color: "#fff", border: "none" }}>+</button>
                      </div>
                    </div>
                  );
                })}
                <div style={{ marginTop: 20, padding: "16px 0", borderTop: "2px solid #1a1a1a", display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700 }}>
                  <span>Total</span><span style={{ color: "var(--green-700)" }}>{fmt(cartTotal)}</span>
                </div>
                <button onClick={submitOrder} style={{ width: "100%", marginTop: 12, background: "var(--green-700)", color: "#fff", border: "none", borderRadius: 10, padding: "14px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
                  ✅ Confirmar Pedido
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, boxSizing: "border-box" };
const pillBtn = { background: "#f0f0f0", border: "none", borderRadius: 20, padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" };
const catBtn = { border: "none", borderRadius: 20, padding: "8px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" };
const qtyBtn = { width: 32, height: 32, borderRadius: "50%", border: "1px solid #ddd", background: "#f8f8f8", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, lineHeight: 1 };
