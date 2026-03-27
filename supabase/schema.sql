-- ============================================================
-- COOPERATIVA ORIGEN — ESQUEMA DE BASE DE DATOS
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- Tabla de miembros/cooperados
CREATE TABLE members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  area TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorías de productos
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  sort_order INT DEFAULT 0
);

-- Productos
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  unit TEXT NOT NULL,
  price INTEGER NOT NULL,
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ciclos de pedido
CREATE TABLE cycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
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
  total INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detalle de pedidos
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  product_unit TEXT NOT NULL,
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal INTEGER NOT NULL
);

-- ============================================================
-- DATOS INICIALES
-- ============================================================

INSERT INTO categories (id, name, icon, color, sort_order) VALUES
  ('frutas', 'Frutas y Verduras', '🥬', '#2d6a4f', 1),
  ('abarrotes', 'Abarrotes', '🛒', '#b5651d', 2),
  ('lacteos', 'Lácteos', '🧀', '#457b9d', 3),
  ('carnes', 'Carnes', '🥩', '#9b2226', 4),
  ('aseo', 'Productos de Aseo', '🧴', '#6c757d', 5),
  ('ecorioclaro', 'Producción Eco Río Claro', '🌿', '#606c38', 6);

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

INSERT INTO cycles (name, status, start_date, end_date) VALUES
  ('Ciclo Abril Q1 2026', 'open', '2026-04-01', '2026-04-15');

-- ADMIN INICIAL: Cambiar email por el real
INSERT INTO members (email, full_name, is_admin) VALUES
  ('jaime@fundacionorigen.cl', 'Jaime Fernández López', TRUE);

-- ============================================================
-- SEGURIDAD (Row Level Security)
-- ============================================================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories readable" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Products readable" ON products FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Cycles readable" ON cycles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Own orders select" ON orders FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM members WHERE email = auth.jwt()->>'email'));
CREATE POLICY "Own orders insert" ON orders FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM members WHERE email = auth.jwt()->>'email'));

CREATE POLICY "Own items select" ON order_items FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM orders WHERE member_id IN (SELECT id FROM members WHERE email = auth.jwt()->>'email')));
CREATE POLICY "Own items insert" ON order_items FOR INSERT TO authenticated
  WITH CHECK (order_id IN (SELECT id FROM orders WHERE member_id IN (SELECT id FROM members WHERE email = auth.jwt()->>'email')));

CREATE POLICY "Admin members" ON members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE email = auth.jwt()->>'email' AND is_admin = true));
CREATE POLICY "Admin products" ON products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE email = auth.jwt()->>'email' AND is_admin = true));
CREATE POLICY "Admin cycles" ON cycles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE email = auth.jwt()->>'email' AND is_admin = true));
CREATE POLICY "Admin orders" ON orders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE email = auth.jwt()->>'email' AND is_admin = true));
CREATE POLICY "Admin items" ON order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE email = auth.jwt()->>'email' AND is_admin = true));

CREATE POLICY "Own profile" ON members FOR SELECT TO authenticated
  USING (email = auth.jwt()->>'email');
