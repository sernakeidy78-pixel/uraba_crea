<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/../config/database.php';

function respond($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function body() {
    $data = json_decode(file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}
function currentUser() {
    return $_SESSION['user'] ?? null;
}
function requireRole($roles) {
    $u = currentUser();
    if (!$u || !in_array($u['role'], (array)$roles, true)) respond(['ok'=>false,'error'=>'Debes iniciar sesión con un perfil autorizado.'], 401);
    return $u;
}
function productData($row) {
    return [
      'id'=>(int)$row['id'], 'name'=>$row['name'], 'description'=>$row['description'],
      'category'=>$row['category'], 'material'=>$row['material'], 'price'=>(float)$row['price'],
      'stock'=>(int)$row['stock'], 'image'=>$row['image_url'], 'sellerId'=>$row['seller_id'] ? (int)$row['seller_id'] : null,
      'craftsperson'=>$row['seller_name'] ?: 'Artesano de Urabá'
    ];
}
$method = $_SERVER['REQUEST_METHOD'];
$resource = $_GET['resource'] ?? '';
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$data = body();

try {
  if ($resource === 'health' && $method === 'GET') {
    $pdo->query('SELECT 1');
    respond(['ok'=>true,'message'=>'API Urabá Crea conectada con MySQL.','database'=>'uraba_crea']);
  }

  if ($resource === 'auth' && $method === 'GET') {
    respond(['ok'=>true,'user'=>currentUser()]);
  }
  if ($resource === 'auth' && $method === 'POST') {
    $action = $_GET['action'] ?? '';
    if ($action === 'register') {
      $name = trim($data['name'] ?? ''); $email = strtolower(trim($data['email'] ?? ''));
      $password = $data['password'] ?? ''; $role = $data['role'] ?? 'cliente';
      if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8 || !in_array($role, ['cliente','artesano'], true)) respond(['ok'=>false,'error'=>'Completa los datos. La contraseña debe tener al menos 8 caracteres.'], 422);
      $stmt = $pdo->prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)');
      try { $stmt->execute([$name,$email,password_hash($password,PASSWORD_DEFAULT),$role]); }
      catch (PDOException $e) { if ($e->getCode()==='23000') respond(['ok'=>false,'error'=>'Ese correo ya está registrado.'],409); throw $e; }
      session_regenerate_id(true); $_SESSION['user']=['id'=>(int)$pdo->lastInsertId(),'name'=>$name,'email'=>$email,'role'=>$role];
      respond(['ok'=>true,'message'=>'Cuenta creada correctamente.','user'=>$_SESSION['user']],201);
    }
    if ($action === 'login') {
      $email = strtolower(trim($data['email'] ?? '')); $password = $data['password'] ?? '';
      $stmt=$pdo->prepare('SELECT id,name,email,password_hash,role FROM users WHERE email=?'); $stmt->execute([$email]); $u=$stmt->fetch();
      if (!$u || !password_verify($password,$u['password_hash'])) respond(['ok'=>false,'error'=>'Correo o contraseña incorrectos.'],401);
      session_regenerate_id(true); unset($u['password_hash']); $u['id']=(int)$u['id']; $_SESSION['user']=$u;
      respond(['ok'=>true,'message'=>'Sesión iniciada.','user'=>$u]);
    }
    if ($action === 'logout') { $_SESSION=[]; session_destroy(); respond(['ok'=>true,'message'=>'Sesión cerrada.']); }
  }

  if ($resource === 'products' && $method === 'GET') {
    if ($id) {
      $q=$pdo->prepare("SELECT p.*,u.name seller_name FROM products p LEFT JOIN users u ON u.id=p.seller_id WHERE p.id=? AND p.status='active'"); $q->execute([$id]); $p=$q->fetch();
      if (!$p) respond(['ok'=>false,'error'=>'Producto no encontrado.'],404);
      respond(['ok'=>true,'product'=>productData($p)]);
    }
    $q=$pdo->query("SELECT p.*,u.name seller_name FROM products p LEFT JOIN users u ON u.id=p.seller_id WHERE p.status='active' ORDER BY p.id DESC");
    respond(['ok'=>true,'products'=>array_map('productData',$q->fetchAll())]);
  }

  if ($resource === 'seller-products') {
    $user=requireRole(['artesano','admin']);
    if ($method === 'GET') {
      $q=$pdo->prepare('SELECT p.*,u.name seller_name FROM products p LEFT JOIN users u ON u.id=p.seller_id WHERE p.seller_id=? AND p.status="active" ORDER BY p.id DESC'); $q->execute([$user['id']]);
      respond(['ok'=>true,'products'=>array_map('productData',$q->fetchAll())]);
    }
    if ($method === 'POST') {
      $name=trim($data['name']??''); $price=(float)($data['price']??0); $stock=$data['stock']??null;
      if ($name==='' || $price<=0 || filter_var($stock,FILTER_VALIDATE_INT)===false || $stock<0) respond(['ok'=>false,'error'=>'Nombre, precio y existencias no válidos.'],422);
      $q=$pdo->prepare('INSERT INTO products(seller_id,name,description,category,material,price,image_url,stock) VALUES(?,?,?,?,?,?,?,?)');
      $q->execute([$user['id'],$name,$data['description']??'',trim($data['category']??'General'),trim($data['material']??'No especificado'),$price,$data['image']??null,(int)$stock]);
      respond(['ok'=>true,'id'=>(int)$pdo->lastInsertId(),'message'=>'Producto creado.'],201);
    }
    if ($id && $method === 'PUT') {
      $q=$pdo->prepare('UPDATE products SET name=?,description=?,category=?,material=?,price=?,image_url=?,stock=? WHERE id=? AND seller_id=?');
      $q->execute([trim($data['name']??''),$data['description']??'',trim($data['category']??''),trim($data['material']??''),(float)($data['price']??0),$data['image']??null,(int)($data['stock']??0),$id,$user['id']]);
      if (!$q->rowCount()) respond(['ok'=>false,'error'=>'No se modificó: producto inexistente o no pertenece a tu cuenta.'],404);
      respond(['ok'=>true,'message'=>'Producto actualizado.']);
    }
    if ($id && $method === 'DELETE') {
      $q=$pdo->prepare("UPDATE products SET status='inactive' WHERE id=? AND seller_id=?"); $q->execute([$id,$user['id']]);
      if (!$q->rowCount()) respond(['ok'=>false,'error'=>'Producto inexistente o no pertenece a tu cuenta.'],404);
      respond(['ok'=>true,'message'=>'Producto retirado del catálogo.']);
    }
    if ($id && $method === 'PATCH') {
      $stock=$data['stock']??null;
      if (filter_var($stock,FILTER_VALIDATE_INT)===false || $stock<0) respond(['ok'=>false,'error'=>'Las existencias deben ser un entero no negativo.'],422);
      $q=$pdo->prepare('UPDATE products SET stock=? WHERE id=? AND seller_id=?'); $q->execute([(int)$stock,$id,$user['id']]);
      if (!$q->rowCount()) respond(['ok'=>false,'error'=>'Producto no encontrado o sin permisos.'],404);
      respond(['ok'=>true,'message'=>'Existencias actualizadas.']);
    }
  }

  if ($resource === 'orders' && $method === 'POST') {
    $user=requireRole(['cliente','artesano','admin']); $items=$data['items']??[];
    if (!is_array($items) || count($items)===0) respond(['ok'=>false,'error'=>'El carrito está vacío.'],422);
    $pdo->beginTransaction(); $total=0; $validated=[];
    foreach ($items as $item) {
      $pid=(int)($item['productId']??0); $qty=(int)($item['quantity']??0);
      if ($pid<1 || $qty<1) { $pdo->rollBack(); respond(['ok'=>false,'error'=>'Producto o cantidad inválidos.'],422); }
      $q=$pdo->prepare("SELECT id,seller_id,price,stock FROM products WHERE id=? AND status='active' FOR UPDATE"); $q->execute([$pid]); $p=$q->fetch();
      if (!$p || $p['stock']<$qty) { $pdo->rollBack(); respond(['ok'=>false,'error'=>'Un producto no tiene existencias suficientes. Actualiza el carrito.'],409); }
      $total+=(float)$p['price']*$qty; $validated[]=['product'=>$p,'quantity'=>$qty];
    }
    $q=$pdo->prepare('INSERT INTO orders(customer_id,total) VALUES(?,?)'); $q->execute([$user['id'],$total]); $orderId=(int)$pdo->lastInsertId();
    foreach ($validated as $v) {
      $p=$v['product']; $qty=$v['quantity'];
      $q=$pdo->prepare('INSERT INTO order_items(order_id,product_id,seller_id,quantity,unit_price) VALUES(?,?,?,?,?)'); $q->execute([$orderId,$p['id'],$p['seller_id'],$qty,$p['price']]);
      $q=$pdo->prepare('UPDATE products SET stock=stock-? WHERE id=?'); $q->execute([$qty,$p['id']]);
    }
    $pdo->commit(); respond(['ok'=>true,'orderId'=>$orderId,'total'=>$total,'message'=>'Pedido registrado y existencias actualizadas.'],201);
  }
  if ($resource === 'orders' && $method === 'GET' && $id) {
    $user=requireRole(['cliente','artesano','admin']);
    $q=$pdo->prepare('SELECT * FROM orders WHERE id=? AND (customer_id=? OR ?="admin")'); $q->execute([$id,$user['id'],$user['role']]); $order=$q->fetch();
    if (!$order) respond(['ok'=>false,'error'=>'Pedido no encontrado o sin permisos.'],404);
    $q=$pdo->prepare('SELECT oi.product_id, p.name, oi.quantity, oi.unit_price FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id=?'); $q->execute([$id]);
    respond(['ok'=>true,'order'=>$order,'items'=>$q->fetchAll()]);
  }
  respond(['ok'=>false,'error'=>'Ruta o método no reconocido.'],404);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  error_log($e->getMessage());
  respond(['ok'=>false,'error'=>'Error interno del servidor. Revisa Apache/PHP y la base de datos.'],500);
}
