"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const money = value => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value) || 0);

  const placeholderImage = "img/productos/canasto.jpg";

  const seedProducts = [
    {
      id: "p1",
      name: "Canasto de fibras naturales",
      category: "Tejidos",
      material: "Fibras naturales",
      price: 90000,
      stock: 8,
      craftsperson: "Luz Marina",
      sellerId: "luz",
      description: "Canasto tejido a mano con fibras naturales. Cada pieza conserva pequeñas variaciones que la hacen única.",
      image: "img/productos/canastos.jpg"
    },
    {
      id: "p2",
      name: "Jarrón tierra viva",
      category: "Cerámica",
      material: "Cerámica",
      price: 72000,
      stock: 5,
      craftsperson: "María Elena",
      sellerId: "maria",
      description: "Jarrón artesanal con acabado natural, pensado para acompañar espacios cálidos y tranquilos.",
      image: "img/productos/jarron.jpg"
    },
    {
      id: "p3",
      name: "Tabla tallada en madera",
      category: "Decoración",
      material: "Madera",
      price: 74000,
      stock: 4,
      craftsperson: "Andrés",
      sellerId: "andres",
      description: "Pieza tallada y pulida artesanalmente. El patrón de la madera hace que cada producto sea diferente.",
      image: "img/productos/Tabla-tallada.jpg"
    },
    {
      id: "p4",
      name: "Bolso del diario",
      category: "Tejidos",
      material: "Textil",
      price: 109000,
      stock: 3,
      craftsperson: "Luz Marina",
      sellerId: "luz",
      description: "Bolso liviano de elaboración artesanal, pensado para acompañar el día a día.",
      image: "img/productos/Bolso.jpg"
    },
    {
      id: "p5",
      name: "Cuenco de barro",
      category: "Cerámica",
      material: "Cerámica",
      price: 61000,
      stock: 6,
      craftsperson: "María Elena",
      sellerId: "maria",
      description: "Juego de cuencos con formas orgánicas. Elaborados en pequeños lotes.",
      image: "img/productos/Cuencos.jpg"
    },
    {
      id: "p6",
      name: "Aretes en chaquiras",
      category: "Accesorios",
      material: "Chaquiras",
      price: 32000,
      stock: 12,
      craftsperson: "Luz Marina",
      sellerId: "luz",
      description: "Accesorios livianos inspirados en las formas y colores de la naturaleza.",
      image: "img/productos/Aretes.jpg"
    },
    {
      id: "p7",
      name: "Centro de mesa natural",
      category: "Decoración",
      material: "Madera",
      price: 57000,
      stock: 2,
      craftsperson: "Andrés",
      sellerId: "andres",
      description: "Un detalle decorativo de líneas sencillas elaborado en madera.",
      image: "img/productos/Centro-mesa.jpg"
    },
    {
      id: "p8",
      name: "Camino de mesa tejido",
      category: "Tejidos",
      material: "Textil",
      price: 86500,
      stock: 7,
      craftsperson: "Luz Marina",
      sellerId: "luz",
      description: "Camino de mesa tejido con cuidado para vestir la mesa con calidez.",
      image: "img/productos/Camino-tejido.jpg"
    }
  ];
  const STORAGE_PRODUCTS = "urabaCreaProductsV1";
  const STORAGE_CART = "urabaCreaCartV1";

  let products = loadJSON(STORAGE_PRODUCTS, seedProducts);
  let cart = loadJSON(STORAGE_CART, []);
  let currentSeller = "luz";
  let productModal, loginModal, sellerModal, cartCanvas, toast;

  const $ = id => document.getElementById(id);
  const productGrid = $("productGrid");
  const cartCount = $("cartCount");

  function loadJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : structuredClone(fallback);
    } catch (error) {
      console.warn("No se pudo leer el almacenamiento local:", error);
      return fallback;
    }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { console.warn("No se pudo guardar en el navegador:", error); showToast("No fue posible guardar los cambios en este navegador."); }
  }

  const API_URL = "api/index.php";
  let currentUser = null;

  async function apiRequest(resource, options = {}, params = {}) {
    const query = new URLSearchParams({ resource, ...params });
    const config = {
      method: options.method || "GET",
      credentials: "same-origin",
      headers: { "Accept": "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) },
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    };
    const response = await fetch(`${API_URL}?${query.toString()}`, config);
    let result;
    try { result = await response.json(); }
    catch (_) { throw new Error("El servidor no devolvió JSON. Revisa Apache, PHP y la API."); }
    if (!response.ok || result.ok === false) throw new Error(result.error || `Error del servidor (${response.status}).`);
    return result;
  }

  function normalizeProduct(product) {
    return { ...product, id: String(product.id), image: product.image || placeholderImage,
      sellerId: product.sellerId == null ? "" : String(product.sellerId),
      craftsperson: product.craftsperson || "Artesano de Urabá",
      price: Number(product.price), stock: Number(product.stock) };
  }

  async function loadProductsFromAPI() {
    const result = await apiRequest("products");
    products = (result.products || []).map(normalizeProduct);
    cart = cart.map(item => {
      const product = products.find(p => p.id === String(item.id));
      return product ? { id: product.id, quantity: Math.min(Number(item.quantity) || 1, product.stock) } : null;
    }).filter(item => item && item.quantity > 0);
    persistCart();
    renderProducts(); renderCart(); renderSellerPanel();
  }

  function updateAuthInterface() {
    const loginButton = $("openLogin");
    if (loginButton) {
      loginButton.innerHTML = currentUser
        ? `<i class="bi bi-person-check me-1"></i> ${escapeHTML(currentUser.name.split(" ")[0])}`
        : `<i class="bi bi-person me-1"></i> Ingresar`;
      loginButton.title = currentUser ? `Sesión: ${currentUser.email}` : "Ingresar";
    }
    ["openSellerFromNav", "heroSeller", "storySeller", "sellerCta"].forEach(id => {
      const el = $(id);
      if (el) el.classList.toggle("d-none", !currentUser || !["artesano", "admin"].includes(currentUser.role));
    });
  }

  async function refreshSession() {
    const result = await apiRequest("auth");
    currentUser = result.user || null;
    updateAuthInterface();
  }
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }
  function safeImage(value) {
    if (!value) return placeholderImage;

    return new URL(value.replace(/^\/+/, ""), document.baseURI).href;
  }
  function showToast(message) {
    $("toastMessage").textContent = message;
    if (toast) toast.show();
  }
  function persistProducts() { saveJSON(STORAGE_PRODUCTS, products); }
  function persistCart() { saveJSON(STORAGE_CART, cart); }

  function renderProducts() {
    const query = $("searchInput").value.trim().toLocaleLowerCase("es");
    const category = $("categoryFilter").value;
    const material = $("materialFilter").value;
    const sort = $("sortFilter").value;
    let filtered = products.filter(product => {
      const text = [product.name, product.material, product.category, product.craftsperson, product.description].join(" ").toLocaleLowerCase("es");
      return text.includes(query) && (category === "all" || product.category === category) && (material === "all" || product.material === material);
    });
    if (sort === "low") filtered.sort((a, b) => a.price - b.price);
    if (sort === "high") filtered.sort((a, b) => b.price - a.price);
    if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name, "es"));
    productGrid.innerHTML = filtered.map(product => `
      <div class="col-6 col-md-4 col-xl-3">
        <article class="product-card">
          <div class="product-photo-wrap">
            <img class="product-photo" src="${escapeHTML(safeImage(product.image))}" alt="${escapeHTML(product.name)}" loading="lazy" onerror="this.onerror=null;this.src='${placeholderImage}'">
            <span class="product-category">${escapeHTML(product.category)}</span>
          </div>
          <div class="product-body">
            <p class="product-maker">Por ${escapeHTML(product.craftsperson)}</p>
            <h3 class="product-title">${escapeHTML(product.name)}</h3>
            <p class="product-material mb-0">${escapeHTML(product.material)}</p>
            <div class="product-bottom">
              <div><div class="product-price">${money(product.price)}</div><span class="stock-label">${product.stock > 0 ? `${product.stock} disponibles` : "Agotado"}</span></div>
              <button class="btn btn-brand product-add" type="button" data-add="${escapeHTML(product.id)}" aria-label="Agregar ${escapeHTML(product.name)} al carrito" ${product.stock <= 0 ? "disabled" : ""}><i class="bi bi-plus-lg"></i></button>
            </div>
            <button class="btn btn-link p-0 mt-3 text-decoration-none reset-link" type="button" data-detail="${escapeHTML(product.id)}">Ver detalles <i class="bi bi-arrow-up-right"></i></button>
          </div>
        </article>
      </div>`).join("");
    $("resultsCount").textContent = `${filtered.length} ${filtered.length === 1 ? "producto encontrado" : "productos encontrados"}`;
    $("emptyProducts").classList.toggle("d-none", filtered.length > 0);
  }

  function renderCart() {
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalQuantity;
    $("cartItems").innerHTML = cart.length ? cart.map(item => {
      const product = products.find(p => p.id === item.id);
      if (!product) return "";
      return `<div class="cart-item">
        <img src="${escapeHTML(safeImage(product.image))}" alt="">
        <div><h3>${escapeHTML(product.name)}</h3><p>${money(product.price)} c/u</p>
          <div class="quantity-control"><button type="button" data-qty="${escapeHTML(product.id)}" data-delta="-1" aria-label="Reducir cantidad">−</button><span>${item.quantity}</span><button type="button" data-qty="${escapeHTML(product.id)}" data-delta="1" aria-label="Aumentar cantidad" ${item.quantity >= product.stock ? "disabled" : ""}>+</button></div>
        </div><div class="cart-item-price">${money(product.price * item.quantity)}<button type="button" class="btn btn-link text-danger d-block p-0 ms-auto" data-remove="${escapeHTML(product.id)}" aria-label="Quitar ${escapeHTML(product.name)}"><i class="bi bi-trash"></i></button></div>
      </div>`;
    }).join("") : `<div class="cart-empty"><i class="bi bi-bag"></i><h3>Tu carrito está vacío</h3><p>Encuentra una pieza que te enamore.</p></div>`;
    const total = cart.reduce((sum, item) => {
      const product = products.find(p => p.id === item.id);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
    $("cartSubtotal").textContent = money(total);
    $("checkoutButton").disabled = cart.length === 0;
  }

  function addToCart(id) {
    const product = products.find(p => p.id === id);
    if (!product || product.stock < 1) return showToast("Este producto no tiene existencias disponibles.");
    const existing = cart.find(item => item.id === id);
    if (existing && existing.quantity >= product.stock) return showToast("No hay más unidades disponibles.");
    if (existing) existing.quantity += 1; else cart.push({ id, quantity: 1 });
    persistCart(); renderCart(); showToast("Producto agregado al carrito.");
  }
  function updateQuantity(id, delta) {
    const item = cart.find(entry => entry.id === id);
    const product = products.find(entry => entry.id === id);
    if (!item || !product) return;
    item.quantity += delta;
    if (item.quantity <= 0) cart = cart.filter(entry => entry.id !== id);
    else if (item.quantity > product.stock) { item.quantity = product.stock; showToast("Llegaste al máximo de unidades disponibles."); }
    persistCart(); renderCart();
  }
  function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    persistCart(); renderCart(); showToast("Producto retirado del carrito.");
  }
  function openProductDetail(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    $("productModalBody").innerHTML = `<div class="row g-4 align-items-center">
      <div class="col-md-6"><img class="detail-image" src="${escapeHTML(safeImage(product.image))}" alt="${escapeHTML(product.name)}"></div>
      <div class="col-md-6"><p class="eyebrow mb-2">${escapeHTML(product.category)} · ${escapeHTML(product.material)}</p><h2 id="productModalTitle">${escapeHTML(product.name)}</h2><p class="text-secondary">Creado por ${escapeHTML(product.craftsperson)}</p><p class="detail-price">${money(product.price)}</p><p class="detail-copy">${escapeHTML(product.description)}</p><p class="small text-secondary">${product.stock > 0 ? `${product.stock} unidades disponibles` : "Producto agotado"}</p><button class="btn btn-brand" data-detail-add="${escapeHTML(product.id)}" ${product.stock <= 0 ? "disabled" : ""}>Agregar al carrito <i class="bi bi-bag-plus ms-2"></i></button></div>
    </div>`;
    productModal.show();
  }

  async function openSellerPanel() {
    if (!currentUser || !["artesano", "admin"].includes(currentUser.role)) {
      showToast("Inicia sesión con una cuenta de artesano para administrar tus productos.");
      showLogin(); return;
    }
    try { await loadSellerProducts(); renderSellerPanel(); sellerModal.show(); }
    catch (error) { showToast(error.message); }
  }
  function sellerProducts() { return products.filter(product => product.sellerId === String(currentUser?.id || "")); }
  async function loadSellerProducts() {
    const result = await apiRequest("seller-products");
    const mine = (result.products || []).map(normalizeProduct);
    products = products.filter(p => p.sellerId !== String(currentUser.id)).concat(mine);
    renderProducts();
  }
  function renderSellerPanel() {
    const identity = $("sellerIdentity");
    if (identity) identity.textContent = currentUser ? `${currentUser.name} · ${currentUser.email}` : "Inicia sesión como artesano";
    const mine = sellerProducts();
    const stockTotal = mine.reduce((sum, product) => sum + Number(product.stock), 0);
    const lowStock = mine.filter(product => product.stock > 0 && product.stock <= 3).length;
    $("sellerStats").innerHTML = `
      <div class="col-6 col-lg-4"><div class="stat-card"><span>Mis productos</span><strong>${mine.length}</strong></div></div>
      <div class="col-6 col-lg-4"><div class="stat-card"><span>Unidades en inventario</span><strong>${stockTotal}</strong></div></div>
      <div class="col-12 col-lg-4"><div class="stat-card"><span>Productos con pocas unidades</span><strong>${lowStock}</strong></div></div>`;
    $("sellerProductRows").innerHTML = mine.length ? mine.map(product => {
      const stockClass = product.stock === 0 ? "out" : product.stock <= 3 ? "low" : "";
      const stockText = product.stock === 0 ? "Agotado" : product.stock <= 3 ? "Pocas unidades" : "Disponible";
      return `<tr><td><div class="table-product"><img src="${escapeHTML(safeImage(product.image))}" alt=""><div><strong>${escapeHTML(product.name)}</strong><small>${escapeHTML(product.material)} · ${escapeHTML(product.category)}</small></div></div></td>
        <td class="fw-bold">${money(product.price)}</td><td>${product.stock}</td><td><span class="stock-badge ${stockClass}">${stockText}</span></td>
        <td class="text-end text-nowrap"><button class="table-action" type="button" data-edit="${escapeHTML(product.id)}" aria-label="Editar ${escapeHTML(product.name)}"><i class="bi bi-pencil"></i></button><button class="table-action" type="button" data-delete="${escapeHTML(product.id)}" aria-label="Eliminar ${escapeHTML(product.name)}"><i class="bi bi-trash"></i></button></td></tr>`;
    }).join("") : `<tr><td colspan="5" class="text-center py-5 text-secondary">Aún no tienes productos. Usa “Agregar producto” para crear el primero.</td></tr>`;
  }
  function resetSellerForm() {
    $("sellerProductForm").reset();
    $("editProductId").value = "";
    $("productStock").value = 1;
    $("sellerFormTitle").textContent = "Nuevo producto";
    $("sellerFormWrap").classList.add("d-none");
  }
  function showSellerForm(product = null) {
    $("sellerProductForm").reset();
    $("sellerFormWrap").classList.remove("d-none");
    if (product) {
      $("editProductId").value = product.id;
      $("productName").value = product.name;
      $("productCraftsperson").value = product.craftsperson;
      $("productCategory").value = product.category;
      $("productMaterial").value = product.material;
      $("productPrice").value = product.price;
      $("productStock").value = product.stock;
      $("productImage").value = product.image || "";
      $("productDescription").value = product.description;
      $("sellerFormTitle").textContent = "Editar producto";
    } else {
      $("editProductId").value = "";
      $("productStock").value = 1;
      $("productCraftsperson").value = currentUser?.name || "";
      $("sellerFormTitle").textContent = "Nuevo producto";
    }
    $("sellerFormWrap").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  async function saveSellerProduct(event) {
    event.preventDefault();
    if (!currentUser || !["artesano", "admin"].includes(currentUser.role)) return showToast("Debes ingresar con una cuenta de artesano.");
    const id = $("editProductId").value;
    const name = $("productName").value.trim();
    const price = Number($("productPrice").value);
    const stock = Number($("productStock").value);
    if (!name || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) return showToast("Revisa el nombre, precio y existencias.");
    const payload = { name, description: $("productDescription").value.trim(),
      category: $("productCategory").value, material: $("productMaterial").value,
      price, stock, image: $("productImage").value.trim() || placeholderImage };
    try {
      if (id) {
        await apiRequest("seller-products", { method: "PUT", body: payload }, { id });
        showToast("Producto actualizado en la base de datos.");
      } else {
        await apiRequest("seller-products", { method: "POST", body: payload });
        showToast("Producto publicado en el catálogo.");
      }
      await loadProductsFromAPI();
      await loadSellerProducts();
      resetSellerForm(); renderSellerPanel();
    } catch (error) { showToast(error.message); }
  }

  async function deleteSellerProduct(id) {
    const product = products.find(p => p.id === String(id));
    if (!product) return showToast("No se encontró el producto.");
    if (!window.confirm(`¿Retirar "${product.name}" del catálogo?`)) return;
    try {
      await apiRequest("seller-products", { method: "DELETE" }, { id });
      cart = cart.filter(item => item.id !== String(id));
      persistCart(); await loadProductsFromAPI(); await loadSellerProducts();
      renderCart(); renderSellerPanel(); showToast("Producto retirado del catálogo.");
    } catch (error) { showToast(error.message); }
  }

  function showLogin() { loginModal.show(); }

  async function loginUser(event) {
    event.preventDefault();
    const submit = $("loginForm").querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const result = await apiRequest("auth", { method: "POST", body: {
        email: $("loginEmail").value.trim(), password: $("loginPassword").value
      } }, { action: "login" });
      currentUser = result.user; $("loginForm").reset(); loginModal.hide(); updateAuthInterface();
      if (["artesano", "admin"].includes(currentUser.role)) await loadSellerProducts();
      showToast(`Sesión iniciada. Bienvenida/o, ${currentUser.name}.`);
    } catch (error) { showToast(error.message); }
    finally { submit.disabled = false; }
  }

  async function registerUser(event) {
    event.preventDefault();
    const submit = $("registerForm").querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const result = await apiRequest("auth", { method: "POST", body: {
        name: $("registerName").value.trim(), email: $("registerEmail").value.trim(),
        role: $("registerRole").value, password: $("registerPassword").value
      } }, { action: "register" });
      currentUser = result.user; $("registerForm").reset(); loginModal.hide(); updateAuthInterface();
      showToast(`Cuenta creada correctamente. Bienvenida/o, ${currentUser.name}.`);
      if (["artesano", "admin"].includes(currentUser.role)) {
        await loadSellerProducts(); renderSellerPanel(); sellerModal.show();
      }
    } catch (error) { showToast(error.message); }
    finally { submit.disabled = false; }
  }

  async function checkout() {
    if (!cart.length) return showToast("Tu carrito está vacío.");
    if (!currentUser) { showToast("Inicia sesión o crea una cuenta para registrar tu pedido."); showLogin(); return; }
    try {
      const result = await apiRequest("orders", { method: "POST", body: {
        items: cart.map(item => ({ productId: Number(item.id), quantity: item.quantity }))
      } });
      cart = []; persistCart(); await loadProductsFromAPI(); renderCart(); cartCanvas.hide();
      showToast(`¡Pedido #${result.orderId} registrado! Total: ${money(result.total)}.`);
    } catch (error) { showToast(error.message); }
  }

  // Inicialización Bootstrap
  productModal = new bootstrap.Modal($("productModal"));
  loginModal = new bootstrap.Modal($("loginModal"));
  sellerModal = new bootstrap.Modal($("sellerModal"));
  cartCanvas = bootstrap.Offcanvas.getOrCreateInstance($("cartPanel"));
  toast = bootstrap.Toast.getOrCreateInstance($("appToast"), { delay: 3000 });
  $("currentYear").textContent = new Date().getFullYear();

  // Catálogo, carrito y detalle
  ["searchInput", "categoryFilter", "materialFilter", "sortFilter"].forEach(id => $(id).addEventListener(id === "searchInput" ? "input" : "change", renderProducts));
  $("clearFilters").addEventListener("click", () => { $("searchInput").value = ""; $("categoryFilter").value = "all"; $("materialFilter").value = "all"; $("sortFilter").value = "featured"; renderProducts(); });
  productGrid.addEventListener("click", event => {
    const add = event.target.closest("[data-add]");
    const detail = event.target.closest("[data-detail]");
    if (add) addToCart(add.dataset.add);
    if (detail) openProductDetail(detail.dataset.detail);
  });
  $("productModalBody").addEventListener("click", event => {
    const button = event.target.closest("[data-detail-add]");
    if (button) { addToCart(button.dataset.detailAdd); productModal.hide(); }
  });
  $("openCart").addEventListener("click", () => { renderCart(); cartCanvas.show(); });
  $("cartItems").addEventListener("click", event => {
    const qty = event.target.closest("[data-qty]");
    const remove = event.target.closest("[data-remove]");
    if (qty) updateQuantity(qty.dataset.qty, Number(qty.dataset.delta));
    if (remove) removeFromCart(remove.dataset.remove);
  });
  $("checkoutButton").addEventListener("click", checkout);
  // Acceso y panel del artesano autenticado
  $("openLogin").addEventListener("click", async () => {
    if (!currentUser) return showLogin();
    if (!window.confirm(`¿Cerrar la sesión de ${currentUser.name}?`)) return;
    try {
      await apiRequest("auth", { method: "POST" }, { action: "logout" });
      currentUser = null;
      updateAuthInterface();
      await loadProductsFromAPI();
      showToast("Sesión cerrada correctamente.");
    } catch (error) { showToast(error.message); }
  });
  $("loginForm").addEventListener("submit", loginUser);
  $("registerForm").addEventListener("submit", registerUser);
  ["openSellerFromNav", "heroSeller", "storySeller", "sellerCta"].forEach(id => {
    const el = $(id); if (el) el.addEventListener("click", openSellerPanel);
  });
  $("newProductButton").addEventListener("click", () => showSellerForm());
  $("cancelProductForm").addEventListener("click", resetSellerForm);
  $("cancelProductForm2").addEventListener("click", resetSellerForm);
  $("sellerProductForm").addEventListener("submit", saveSellerProduct);
  $("sellerProductRows").addEventListener("click", event => {
    const edit = event.target.closest("[data-edit]");
    const del = event.target.closest("[data-delete]");
    if (edit) {
      const product = products.find(p => p.id === edit.dataset.edit);
      if (product && product.sellerId === String(currentUser?.id || "")) showSellerForm(product);
    }
    if (del) deleteSellerProduct(del.dataset.delete);
  });

  // Inicialización conectada a PHP/MySQL.
  try {
    await refreshSession();
    await loadProductsFromAPI();
    if (currentUser && ["artesano", "admin"].includes(currentUser.role)) await loadSellerProducts();
    console.info("Sesión y catálogo conectados con la API PHP/MySQL.");
  } catch (error) {
    console.error("No se pudo iniciar la aplicación conectada:", error);
    showToast(`No se pudo conectar con el backend: ${error.message}`);
    renderProducts(); renderCart(); renderSellerPanel();
  }
});