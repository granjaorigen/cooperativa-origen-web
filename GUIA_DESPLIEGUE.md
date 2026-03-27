# Cooperativa Origen — Plataforma de Pedidos
## Guía Completa de Despliegue y Mantenimiento

---

## 1. RESUMEN DE ARQUITECTURA

```
┌─────────────────────────────────────────────────┐
│              USUARIO (navegador)                │
│  Cooperado (110 personas) / Admin (3-5 personas)│
└──────────────────┬──────────────────────────────┘
                   │ HTTPS
                   ▼
┌─────────────────────────────────────────────────┐
│           VERCEL (hosting gratuito)             │
│         cooperativa-origen.cl (dominio)         │
│         Next.js App (React + SSR)               │
│                                                 │
│  Páginas:                                       │
│  - / (landing pública)                          │
│  - /catalogo (portal cooperado, login requerido)│
│  - /admin (panel administrador)                 │
└──────────────────┬──────────────────────────────┘
                   │ API REST automática
                   ▼
┌─────────────────────────────────────────────────┐
│          SUPABASE (base de datos gratuita)       │
│          PostgreSQL + Auth + Storage             │
│                                                 │
│  Tablas:                                        │
│  - members (cooperados)                         │
│  - products (catálogo)                           │
│  - categories (categorías)                       │
│  - cycles (ciclos quincenales)                   │
│  - orders (pedidos)                              │
│  - order_items (detalle de pedidos)              │
└─────────────────────────────────────────────────┘
```

### ¿Por qué Vercel + Supabase?

| Criterio | Vercel | Supabase |
|----------|--------|----------|
| Costo | $0 (tier gratuito) | $0 (tier gratuito) |
| Límites gratuitos | 100GB bandwidth/mes | 500MB DB, 50K requests/mes |
| Suficiente para cooperativa | ✅ Sobra | ✅ Sobra por años |
| Dominio personalizado | ✅ Incluido, SSL automático | N/A |
| Facilidad de deploy | `git push` y listo | Dashboard visual |
| Mantenimiento | Bajo (Jaime puede hacerlo) | Bajo (interfaz web) |

---

## 2. PASO A PASO: CONFIGURACIÓN INICIAL

### 2.1 Crear cuenta en Supabase (5 minutos)

1. Ir a https://supabase.com y crear cuenta con GitHub o email
2. Click "New Project"
3. Nombre: `cooperativa-origen`
4. Región: `South America (São Paulo)` (la más cercana a Chile)
5. Crear una contraseña segura para la base de datos (guardarla)
6. Esperar ~2 minutos a que se cree el proyecto

### 2.2 Crear las tablas (10 minutos)

En Supabase, ir a **SQL Editor** y ejecutar el siguiente script:

```sql
-- ============================================================
-- ESQUEMA DE BASE DE DATOS: COOPERATIVA ORIGEN
-- ============================================================

-- Tabla de miembros/cooperados
CREATE TABLE members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  area TEXT, -- área de trabajo en Fundación Origen
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorías de productos
CREATE TABLE categories (
  id TEXT PRIMARY KEY, -- ej: 'frutas', 'abarrotes'
  name TEXT NOT NULL,
  icon TEXT, -- emoji
  color TEXT, -- hex color
  sort_order INT DEFAULT 0
);

-- Productos
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  unit TEXT NOT NULL, -- kg, litro, unidad, pack, etc.
  price INTEGER NOT NULL, -- precio en CLP (sin decimales)
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ciclos de pedido (quincenales)
CREATE TABLE cycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- ej: "Ciclo Abril Q1 2026"
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'delivered')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pedidos
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id),
  cycle_id UUID REFERENCES cycles(id),
  status TEXT DEFAULT 'confirmado' CHECK (status IN ('confirmado', 'preparando', 'listo', 'entregado', 'cancelado')),
  total INTEGER DEFAULT 0, -- total en CLP
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detalle de pedidos
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL, -- snapshot del nombre al momento del pedido
  product_unit TEXT NOT NULL,
  price INTEGER NOT NULL, -- precio al momento del pedido
  quantity INTEGER NOT NULL,
  subtotal INTEGER NOT NULL -- price * quantity
);

-- ============================================================
-- DATOS INICIALES
-- ============================================================

-- Categorías
INSERT INTO categories (id, name, icon, color, sort_order) VALUES
  ('frutas', 'Frutas y Verduras', '🥬', '#2d6a4f', 1),
  ('abarrotes', 'Abarrotes', '🛒', '#b5651d', 2),
  ('lacteos', 'Lácteos', '🧀', '#457b9d', 3),
  ('carnes', 'Carnes', '🥩', '#9b2226', 4),
  ('aseo', 'Productos de Aseo', '🧴', '#6c757d', 5),
  ('ecorioclaro', 'Producción Eco Río Claro', '🌿', '#606c38', 6);

-- Productos ejemplo (precios mayoristas estimados)
INSERT INTO products (name, category_id, unit, price, stock) VALUES
  ('Manzanas Royal Gala', 'frutas', 'kg', 890, 200),
  ('Plátanos', 'frutas', 'kg', 690, 150),
  ('Tomates', 'frutas', 'kg', 990, 180),
  ('Lechugas', 'frutas', 'unidad', 590, 120),
  ('Papas', 'frutas', 'kg', 590, 300),
  ('Cebollas', 'frutas', 'kg', 490, 200),
  ('Zanahorias', 'frutas', 'kg', 590, 150),
  ('Palta Hass', 'frutas', 'kg', 2990, 100),
  ('Arroz Grado 2', 'abarrotes', 'kg', 790, 200),
  ('Fideos Spaghetti 400g', 'abarrotes', 'paquete', 490, 300),
  ('Aceite Vegetal 1L', 'abarrotes', 'botella', 1490, 150),
  ('Azúcar 1kg', 'abarrotes', 'kg', 690, 200),
  ('Harina 1kg', 'abarrotes', 'kg', 590, 150),
  ('Lentejas 1kg', 'abarrotes', 'kg', 1290, 100),
  ('Leche Entera 1L', 'lacteos', 'litro', 790, 200),
  ('Yogurt Natural 1L', 'lacteos', 'litro', 990, 100),
  ('Mantequilla 250g', 'lacteos', 'unidad', 1890, 80),
  ('Pollo Entero', 'carnes', 'kg', 2490, 100),
  ('Carne Molida', 'carnes', 'kg', 4990, 80),
  ('Pulpa de Cerdo', 'carnes', 'kg', 3990, 80),
  ('Detergente Líquido 3L', 'aseo', 'bidón', 3490, 100),
  ('Papel Higiénico 12 rollos', 'aseo', 'pack', 3990, 100),
  ('Jabón Barra x3', 'aseo', 'pack', 1290, 120),
  ('Queso de Cabra Fresco', 'ecorioclaro', '250g', 3490, 60),
  ('Queso de Cabra Maduro', 'ecorioclaro', '250g', 4490, 40),
  ('Huevos Pastoreo x12', 'ecorioclaro', 'docena', 3290, 80),
  ('Huevos Pastoreo x30', 'ecorioclaro', 'bandeja', 6990, 50);

-- Primer ciclo
INSERT INTO cycles (name, status, start_date, end_date) VALUES
  ('Ciclo Abril Q1 2026', 'open', '2026-04-01', '2026-04-15');

-- Admin inicial (CAMBIAR el email por el real)
INSERT INTO members (email, full_name, is_admin) VALUES
  ('jaime@fundacionorigen.cl', 'Jaime Fernández López', TRUE);

-- ============================================================
-- POLÍTICAS DE SEGURIDAD (Row Level Security)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de lectura (catálogo visible para todos los autenticados)
CREATE POLICY "Categories visible for authenticated" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Active products visible for authenticated" ON products FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Active cycles visible for authenticated" ON cycles FOR SELECT TO authenticated USING (true);

-- Políticas de pedidos (cada usuario ve solo los suyos)
CREATE POLICY "Users see own orders" ON orders FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE email = auth.jwt()->>'email'));
CREATE POLICY "Users create own orders" ON orders FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM members WHERE email = auth.jwt()->>'email'));

CREATE POLICY "Users see own order items" ON order_items FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM orders WHERE member_id IN (SELECT id FROM members WHERE email = auth.jwt()->>'email')));
CREATE POLICY "Users create own order items" ON order_items FOR INSERT TO authenticated
  WITH CHECK (order_id IN (SELECT id FROM orders WHERE member_id IN (SELECT id FROM members WHERE email = auth.jwt()->>'email')));

-- Políticas admin (acceso completo)
CREATE POLICY "Admins full access members" ON members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE email = auth.jwt()->>'email' AND is_admin = true));
CREATE POLICY "Admins full access products" ON products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE email = auth.jwt()->>'email' AND is_admin = true));
CREATE POLICY "Admins full access cycles" ON cycles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE email = auth.jwt()->>'email' AND is_admin = true));
CREATE POLICY "Admins full access orders" ON orders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE email = auth.jwt()->>'email' AND is_admin = true));
CREATE POLICY "Admins full access order_items" ON order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE email = auth.jwt()->>'email' AND is_admin = true));

-- Miembros pueden ver su propio perfil
CREATE POLICY "Members see own profile" ON members FOR SELECT TO authenticated
  USING (email = auth.jwt()->>'email');
```

### 2.3 Configurar autenticación en Supabase (5 minutos)

1. En Supabase, ir a **Authentication > Providers**
2. Verificar que **Email** esté habilitado
3. En **Authentication > URL Configuration**:
   - Site URL: `https://tu-dominio.cl` (o `http://localhost:3000` para desarrollo)
   - Redirect URLs: agregar `https://tu-dominio.cl/auth/callback`
4. En **Authentication > Email Templates**, personalizar el email de magic link:
   - Subject: "Tu acceso a Cooperativa Origen"
   - Body: personalizar con la marca de la cooperativa

### 2.4 Obtener las credenciales de Supabase

En Supabase, ir a **Settings > API** y copiar:
- `Project URL` (algo como `https://xxxxx.supabase.co`)
- `anon public key` (la clave pública, NO la service_role)

### 2.5 Crear cuenta en Vercel y desplegar (10 minutos)

1. Ir a https://vercel.com y crear cuenta con GitHub
2. Subir el código del proyecto a un repositorio en GitHub
3. En Vercel, "New Project" > importar el repositorio
4. En **Environment Variables**, agregar:
   - `NEXT_PUBLIC_SUPABASE_URL` = tu Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu anon public key
5. Deploy automático
6. En **Settings > Domains**, agregar tu dominio personalizado

---

## 3. ESTRUCTURA DEL PROYECTO

```
cooperativa-origen-web/
├── package.json
├── next.config.js
├── .env.local              ← credenciales Supabase (NO subir a Git)
├── .env.example             ← template de credenciales
├── public/
│   └── favicon.ico
├── src/
│   ├── lib/
│   │   └── supabase.js      ← cliente Supabase
│   ├── app/
│   │   ├── layout.js         ← layout global + fonts
│   │   ├── page.js           ← landing pública
│   │   ├── globals.css        ← estilos globales
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.js   ← callback de magic link
│   │   ├── catalogo/
│   │   │   └── page.js        ← portal cooperado
│   │   └── admin/
│   │       └── page.js        ← panel administrativo
│   └── components/
│       ├── Navbar.js
│       ├── ProductCard.js
│       ├── Cart.js
│       ├── OrderHistory.js
│       ├── AdminDashboard.js
│       ├── AdminProducts.js
│       ├── AdminOrders.js
│       └── AdminConsolidated.js
└── supabase/
    └── schema.sql             ← el SQL de arriba
```

---

## 4. OPERACIÓN DIARIA

### Para el Administrador:

| Tarea | Frecuencia | Cómo |
|-------|------------|------|
| Actualizar precios | Antes de cada ciclo | Panel Admin > Productos > Editar |
| Abrir nuevo ciclo | Quincenal | Panel Admin > Dashboard > Nuevo Ciclo |
| Cerrar ciclo | Quincenal | Panel Admin > Dashboard > Cerrar Ciclo |
| Exportar orden para Eco Río Claro | Al cerrar ciclo | Panel Admin > Consolidado > Exportar CSV |
| Agregar cooperado nuevo | Cuando ingresa | Panel Admin > Miembros > Agregar |
| Marcar pedido como entregado | Al entregar | Panel Admin > Pedidos > Cambiar estado |

### Para Jaime (mantenimiento técnico):

| Tarea | Frecuencia | Cómo |
|-------|------------|------|
| Agregar/quitar admin | Cuando se necesite | Supabase Dashboard > members > is_admin |
| Ver logs de errores | Si hay problemas | Vercel Dashboard > Deployments > Logs |
| Actualizar código | Cuando se necesite | Editar en GitHub > push > deploy automático |
| Backup de datos | Mensual (recomendado) | Supabase Dashboard > Database > Backups |

---

## 5. COSTOS PROYECTADOS

| Servicio | Costo Mensual | Límite Gratuito |
|----------|--------------|-----------------|
| Vercel (hosting) | $0 | 100GB bandwidth, builds ilimitados |
| Supabase (base de datos) | $0 | 500MB DB, 50K requests/mes, 5GB storage |
| Dominio (.cl) | ~$833/mes ($10.000/año) | N/A |
| **Total** | **~$833 CLP/mes** | Solo el dominio |

Con 110 cooperados haciendo 2 pedidos/mes de ~20 productos cada uno:
- Registros en base de datos: ~52.800/año → muy lejos de los 500MB
- Requests: ~22.000/mes → dentro de los 50.000 gratuitos
- **El tier gratuito alcanza para varios años de operación.**

---

## 6. CÓMO AGREGAR UN NUEVO ADMINISTRADOR

1. El cooperado debe estar registrado (haber ingresado al menos una vez)
2. Ir a Supabase Dashboard > Table Editor > members
3. Buscar al cooperado por email
4. Cambiar `is_admin` de `false` a `true`
5. Guardar. El próximo login, esa persona verá el Panel Admin.

---

## 7. TROUBLESHOOTING

| Problema | Solución |
|----------|----------|
| "No me llega el email de acceso" | Revisar carpeta spam. En Supabase, verificar que el email provider esté configurado. |
| "El ciclo no aparece abierto" | En Admin, verificar estado del ciclo. Puede que esté en 'draft'. |
| "Un cooperado no puede hacer pedidos" | Verificar que esté en la tabla `members` con `is_active = true`. |
| "Los precios no se actualizaron" | Limpiar caché del navegador (Ctrl+F5). Los productos se cargan en tiempo real desde Supabase. |
| "Error al desplegar en Vercel" | Revisar que las variables de entorno estén configuradas correctamente. |
