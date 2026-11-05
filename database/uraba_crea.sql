CREATE DATABASE IF NOT EXISTS uraba_crea CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE uraba_crea;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('cliente','artesano','admin') NOT NULL DEFAULT 'cliente',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seller_id INT UNSIGNED NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  category VARCHAR(80) NOT NULL,
  material VARCHAR(100) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  image_url VARCHAR(500) NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_products_status (status),
  INDEX idx_products_seller (seller_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  status ENUM('pending','confirmed','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  seller_id INT UNSIGNED NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_items_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Productos iniciales del catálogo que ya aparece en el frontend.
INSERT INTO products (name, description, category, material, price, image_url, stock, status)
SELECT 'Canasto de fibras naturales','Canasto tejido a mano con fibras naturales. Cada pieza conserva pequeñas variaciones que la hacen única.','Tejidos','Fibras naturales',90000,'img/productos/canastos.jpg',8,'active'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Canasto de fibras naturales');
INSERT INTO products (name, description, category, material, price, image_url, stock, status)
SELECT 'Jarrón tierra viva','Jarrón artesanal con acabado natural, pensado para acompañar espacios cálidos y tranquilos.','Cerámica','Cerámica',72000,'img/productos/Jarron.jpg',5,'active'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Jarrón tierra viva');
INSERT INTO products (name, description, category, material, price, image_url, stock, status)
SELECT 'Tabla tallada en madera','Pieza tallada y pulida artesanalmente.','Decoración','Madera',74000,'img/productos/Tabla-tallada.jpg',4,'active'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Tabla tallada en madera');
INSERT INTO products (name, description, category, material, price, image_url, stock, status)
SELECT 'Bolso del diario','Bolso liviano de elaboración artesanal.','Tejidos','Textil',109000,'img/productos/Bolso.jpg',3,'active'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Bolso del diario');
INSERT INTO products (name, description, category, material, price, image_url, stock, status)
SELECT 'Cuenco de barro','Juego de cuencos con formas orgánicas.','Cerámica','Cerámica',61000,'img/productos/Cuencos.jpg',6,'active'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Cuenco de barro');
INSERT INTO products (name, description, category, material, price, image_url, stock, status)
SELECT 'Aretes en chaquiras','Accesorios livianos inspirados en las formas y colores de la naturaleza.','Accesorios','Chaquiras',32000,'img/productos/Aretes.jpg',12,'active'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Aretes en chaquiras');
INSERT INTO products (name, description, category, material, price, image_url, stock, status)
SELECT 'Centro de mesa natural','Un detalle decorativo de líneas sencillas elaborado en madera.','Decoración','Madera',57000,'img/productos/Centro-mesa.jpg',2,'active'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Centro de mesa natural');
INSERT INTO products (name, description, category, material, price, image_url, stock, status)
SELECT 'Camino de mesa tejido','Camino de mesa tejido con cuidado para vestir la mesa con calidez.','Tejidos','Textil',86500,'img/productos/Camino-tejido.jpg',7,'active'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Camino de mesa tejido');
