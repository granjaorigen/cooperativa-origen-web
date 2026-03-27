import "./globals.css";

export const metadata = {
  title: "Cooperativa Origen — Plataforma de Pedidos",
  description: "Plataforma de pedidos cooperativos para trabajadores de Fundación Origen. Accede a productos de calidad a precios mayoristas.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
