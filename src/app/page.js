"use client";
import Link from "next/link";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* NAV */}
      <nav style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>🌾</span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Cooperativa Origen</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/catalogo" style={{ background: "var(--green-700)", color: "#fff", padding: "10px 20px", borderRadius: "var(--radius-pill)", fontSize: 14, fontWeight: 600 }}>
            Ingresar
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px 60px", textAlign: "center" }}>
        <div style={{ fontSize: 14, color: "var(--green-700)", fontWeight: 600, letterSpacing: 2, marginBottom: 16 }}>
          COOPERATIVA DE CONSUMO
        </div>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 700, lineHeight: 1.1, marginBottom: 20, color: "var(--green-900)" }}>
          Alimentos de calidad a precios justos
        </h1>
        <p style={{ fontSize: 18, color: "var(--text-muted)", maxWidth: 600, margin: "0 auto 32px", lineHeight: 1.6 }}>
          Somos los trabajadores de Fundación Origen organizados para comprar juntos.
          Accedemos a precios mayoristas y ahorramos hasta un 35% respecto al supermercado.
        </p>
        <Link href="/catalogo" style={{ display: "inline-block", background: "var(--green-700)", color: "#fff", padding: "14px 32px", borderRadius: "var(--radius-pill)", fontSize: 16, fontWeight: 600 }}>
          Hacer mi pedido →
        </Link>
      </section>

      {/* CÓMO FUNCIONA */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px 80px" }}>
        <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 700, marginBottom: 40, color: "var(--green-900)" }}>¿Cómo funciona?</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {[
            { icon: "📋", title: "1. Elige tus productos", desc: "Navega el catálogo con frutas, verduras, abarrotes, lácteos, carnes y producción local de Eco Río Claro." },
            { icon: "🛒", title: "2. Arma tu pedido", desc: "Agrega productos a tu carrito y confirma tu pedido quincenal. Los precios son mayoristas." },
            { icon: "📦", title: "3. Retira tu canasta", desc: "Eco Río Claro consolida todos los pedidos, compra al por mayor y prepara tu canasta." },
            { icon: "💰", title: "4. Ahorra de verdad", desc: "Entre 20-35% menos que el supermercado. Tu bolsillo y tu familia lo agradecen." },
          ].map((step, i) => (
            <div key={i} style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: 24, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{step.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{step.title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section style={{ background: "var(--green-900)", padding: "60px 24px", color: "#fff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 32 }}>Nuestras categorías</h2>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
            {[
              { icon: "🥬", name: "Frutas y Verduras" },
              { icon: "🛒", name: "Abarrotes" },
              { icon: "🧀", name: "Lácteos" },
              { icon: "🥩", name: "Carnes" },
              { icon: "🧴", name: "Aseo" },
              { icon: "🌿", name: "Eco Río Claro" },
            ].map((c, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.1)", borderRadius: "var(--radius)", padding: "16px 24px", minWidth: 140 }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>{c.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "32px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
        <p>Cooperativa de Consumo y Agrícola — Trabajadores de Fundación Educacional Origen</p>
        <p style={{ marginTop: 4 }}>Pirque, Región Metropolitana, Chile</p>
        <p style={{ marginTop: 12 }}>
          <Link href="/admin" style={{ color: "var(--text-muted)", textDecoration: "underline" }}>Acceso administrador</Link>
        </p>
      </footer>
    </div>
  );
}
