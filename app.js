// APP STATE AND FIREBASE INITIALIZATION
const firebaseConfig = {
    apiKey: "AIzaSyBb-wxxD_oga11Jj8eM6lrw7K3n7p4MwAQ",
    authDomain: "gestion-de-stock-c36d1.firebaseapp.com",
    projectId: "gestion-de-stock-c36d1",
    storageBucket: "gestion-de-stock-c36d1.firebasestorage.app",
    messagingSenderId: "715879939275",
    appId: "1:715879939275:web:cd513174f4624d0dc66f4e"
};
firebase.initializeApp(firebaseConfig);
const secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");

const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null; // { uid, username, role, fullName, storeId }
let cart = [];
let storeUnsubscribe = null;

let localData = {
    users: [], categories: [], products: [], suppliers: [], sales: [], stock_entries: []
};

// Virtual DB wrapper that syncs with Firestore
const DB = {
    get: (key, defaultValue = []) => {
        return localData[key] || defaultValue;
    },
    set: (key, data) => {
        localData[key] = data;
        if (currentUser && currentUser.storeId) {
            db.collection('stores').doc(currentUser.storeId).set({
                [key]: data
            }, { merge: true }).catch(err => console.error("Firestore sync error:", err));
        }
    }
};

function ensureDefaults() {
    if (localData.categories.length === 0) {
        DB.set('categories', [
            { id: 1, name: 'Alimentation', colorHex: '#4CAF50', description: 'Produits alimentaires' },
            { id: 2, name: 'Électronique', colorHex: '#2196F3', description: 'Matériel électronique' },
            { id: 3, name: 'Vêtements', colorHex: '#9C27B0', description: 'Habillements' },
            { id: 4, name: 'Hygiène', colorHex: '#00BCD4', description: 'Produits de soin' },
            { id: 5, name: 'Autres', colorHex: '#FF9800', description: 'Objets divers' }
        ]);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupLogin();
    setupNavigation();
    setupPOS();
    setupProducts();
    setupCategories();
    setupStockEntries();
    setupSuppliers();
    setupReports();
    setupMobileMenu();
    setupSettings();
    setupModals();
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                currentUser = { uid: user.uid, ...doc.data() };
                loadStoreData();
            } else {
                auth.signOut();
            }
        } else {
            showLoginScreen();
        }
    });
});

function loadStoreData() {
    if (storeUnsubscribe) storeUnsubscribe();
    
    // Listen to users of this store
    db.collection('users').where('storeId', '==', currentUser.storeId).onSnapshot(snap => {
        const users = [];
        snap.forEach(doc => users.push({ uid: doc.id, ...doc.data() }));
        localData.users = users;
        if (currentUser.role === 'ADMIN' && document.getElementById('view-settings').classList.contains('active')) {
            renderUsersTable();
        }
    });

    // Listen to store data
    storeUnsubscribe = db.collection('stores').doc(currentUser.storeId).onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            localData.categories = data.categories || [];
            localData.products = data.products || [];
            localData.suppliers = data.suppliers || [];
            localData.sales = data.sales || [];
            localData.stock_entries = data.stock_entries || [];
        }
        ensureDefaults();
        
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('app-container').classList.add('active');
        
        // UI role setup
        const userBadge = document.getElementById('user-badge');
        const headerUsername = document.getElementById('header-username');
        userBadge.textContent = currentUser.role === 'ADMIN' ? 'Administrateur' : 'Caissier';
        userBadge.className = 'badge ' + (currentUser.role === 'ADMIN' ? 'badge-admin' : 'badge-cashier');
        headerUsername.textContent = currentUser.fullName;

        // Apply role-based navigation restrictions
        const isCashier = currentUser.role !== 'ADMIN';
        document.getElementById('menu-dashboard').style.display = isCashier ? 'none' : 'flex';
        document.getElementById('menu-products').style.display = isCashier ? 'none' : 'flex';
        document.getElementById('menu-categories').style.display = isCashier ? 'none' : 'flex';
        document.getElementById('menu-stock-entries').style.display = isCashier ? 'none' : 'flex';
        document.getElementById('menu-suppliers').style.display = isCashier ? 'none' : 'flex';
        document.getElementById('menu-reports').style.display = isCashier ? 'none' : 'flex';
        
        const activeItem = document.querySelector('.menu-item.active');
        let activeView = activeItem ? activeItem.getAttribute('data-target') : 'view-pos';
        
        if (isCashier && activeView !== 'view-pos' && activeView !== 'view-settings') {
            switchView('view-pos', 'Caisse (POS)');
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            document.getElementById('menu-pos').classList.add('active');
        } else {
            switchView(activeView, activeItem ? activeItem.textContent.trim() : 'Caisse (POS)');
        }
    });
}

function showLoginScreen() {
    currentUser = null;
    cart = [];
    if (storeUnsubscribe) storeUnsubscribe();
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('app-container').classList.remove('active');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('login-error').textContent = '';
}

// LOGIN MANAGEMENT
function setupLogin() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');

    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

    if (tabLogin && tabRegister) {
        tabLogin.addEventListener('click', () => {
            tabLogin.style.borderBottomColor = '#0ea5e9';
            tabLogin.style.color = '#0ea5e9';
            tabRegister.style.borderBottomColor = 'transparent';
            tabRegister.style.color = '#64748b';
            loginForm.style.display = 'block';
            if (registerForm) registerForm.style.display = 'none';
        });

        tabRegister.addEventListener('click', () => {
            tabRegister.style.borderBottomColor = '#0ea5e9';
            tabRegister.style.color = '#0ea5e9';
            tabLogin.style.borderBottomColor = 'transparent';
            tabLogin.style.color = '#64748b';
            if (registerForm) registerForm.style.display = 'block';
            loginForm.style.display = 'none';
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        let username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        let email = username;
        if (!email.includes('@')) {
            email = username + '@boutiquevisiontech.bf';
        }
        
        loginError.textContent = "Connexion en cours...";
        try {
            await auth.signInWithEmailAndPassword(email, password);
            loginError.textContent = "";
        } catch (err) {
            loginError.textContent = "Identifiant ou mot de passe incorrect";
        }
    });

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const storeName = document.getElementById('reg-store-name').value.trim();
            const fullName = document.getElementById('reg-fullname').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value.trim();

            registerError.textContent = "Création de la boutique...";
            try {
                const res = await auth.createUserWithEmailAndPassword(email, password);
                
                await db.collection('users').doc(res.user.uid).set({
                    username: email,
                    role: 'ADMIN',
                    fullName: fullName,
                    storeId: res.user.uid
                });

                await db.collection('stores').doc(res.user.uid).set({
                    storeName: storeName
                });

                registerError.textContent = "";
            } catch (err) {
                registerError.textContent = "Erreur: L'adresse e-mail est peut-être déjà utilisée.";
            }
        });
    }

    document.getElementById('btn-logout').addEventListener('click', () => {
        auth.signOut();
    });
}

// NAVIGATION
function setupNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const target = item.getAttribute('data-target');
            const title = item.textContent.trim();
            switchView(target, title);
        });
    });
}

function switchView(viewId, title) {
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');
    document.getElementById('view-title').textContent = title;
    
    if (viewId === 'view-dashboard') renderDashboard();
    else if (viewId === 'view-pos') renderPOSProducts();
    else if (viewId === 'view-products') renderProductsTable();
    else if (viewId === 'view-categories') renderCategoriesTable();
    else if (viewId === 'view-stock-entries') renderStockEntriesTable();
    else if (viewId === 'view-suppliers') renderSuppliersTable();
    else if (viewId === 'view-settings') renderSettings();
}

// DASHBOARD
function renderDashboard() {
    if (!currentUser || currentUser.role !== 'ADMIN') return;
    const sales = DB.get('sales');
    const products = DB.get('products');
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const startOfDay = now.getTime();
    
    const todaySales = sales.filter(s => s.createdAt >= startOfDay && s.status === 'COMPLETED');
    const totalTodayAmount = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
    document.getElementById('stat-sales-today').textContent = `${totalTodayAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA`;
    document.getElementById('stat-sales-count').textContent = `${todaySales.length} transaction(s)`;
    
    const stockValue = products.reduce((acc, p) => acc + (p.stockQuantity * p.purchasePrice), 0);
    document.getElementById('stat-stock-value').textContent = `${stockValue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA`;
    
    const alertProducts = products.filter(p => p.stockQuantity <= p.minStockAlert);
    document.getElementById('stat-stock-alerts').textContent = alertProducts.length;
    
    const alertsTbody = document.getElementById('dashboard-alerts-tbody');
    alertsTbody.innerHTML = '';
    if (alertProducts.length === 0) {
        alertsTbody.innerHTML = '<tr><td colspan="3" class="text-muted text-center">Aucune alerte de stock</td></tr>';
    } else {
        alertProducts.slice(0, 5).forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${p.name}</strong></td>
                <td><span class="text-danger font-weight-bold">${p.stockQuantity} ${p.unit}</span></td>
                <td>${p.minStockAlert} ${p.unit}</td>
            `;
            alertsTbody.appendChild(tr);
        });
    }

    renderDashboardChart(sales);
}

function renderDashboardChart(sales) {
    const canvas = document.getElementById('sales-canvas-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    
    const width = canvas.width;
    const height = canvas.height;
    
    const days = [];
    const salesSums = [];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toLocaleDateString('fr-FR', { weekday: 'short' }));
        
        d.setHours(0,0,0,0);
        const start = d.getTime();
        d.setHours(23,59,59,999);
        const end = d.getTime();
        
        const sum = sales
            .filter(s => s.createdAt >= start && s.createdAt <= end && s.status === 'COMPLETED')
            .reduce((acc, s) => acc + s.totalAmount, 0);
        salesSums.push(sum);
    }
    
    const maxVal = Math.max(...salesSums, 1000);
    ctx.clearRect(0, 0, width, height);
    
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
        const y = (height - 30) * (i / 4);
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
    }
    
    const graphWidth = width - 50;
    const graphHeight = height - 50;
    const stepX = graphWidth / 6;
    
    ctx.beginPath();
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 3;
    
    const points = [];
    salesSums.forEach((val, idx) => {
        const x = 40 + (idx * stepX);
        const y = 20 + graphHeight - (val / maxVal * graphHeight);
        points.push({ x, y });
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    ctx.lineTo(points[points.length - 1].x, height - 30);
    ctx.lineTo(points[0].x, height - 30);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(14, 165, 233, 0.2)');
    grad.addColorStop(1, 'rgba(14, 165, 233, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();
    
    ctx.fillStyle = '#f8fafc';
    ctx.font = '10px Plus Jakarta Sans';
    ctx.textAlign = 'center';
    
    points.forEach((pt, idx) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#0ea5e9';
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = '#94a3b8';
        if (salesSums[idx] > 0) {
            ctx.fillText(`${salesSums[idx]} FCFA`, pt.x, pt.y - 10);
        }
        ctx.fillText(days[idx], pt.x, height - 10);
    });
}

// POINT OF SALE
function setupPOS() {
    const searchInput = document.getElementById('pos-search');
    const filterCat = document.getElementById('pos-category-filter');
    const discountInput = document.getElementById('pos-discount');
    const taxInput = document.getElementById('pos-tax');
    const btnCheckout = document.getElementById('btn-checkout');

    searchInput.addEventListener('input', renderPOSProducts);
    filterCat.addEventListener('change', renderPOSProducts);
    discountInput.addEventListener('input', updateCartTotals);
    taxInput.addEventListener('input', updateCartTotals);
    btnCheckout.addEventListener('click', handlePOSCheckout);
}

function renderPOSProducts() {
    const products = DB.get('products');
    const categories = DB.get('categories');
    const filterCat = document.getElementById('pos-category-filter');
    const searchVal = document.getElementById('pos-search').value.toLowerCase();
    const selectedCat = filterCat.value;

    filterCat.innerHTML = '<option value="">Toutes les catégories</option>';
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        if (selectedCat == c.id) opt.selected = true;
        filterCat.appendChild(opt);
    });

    const grid = document.getElementById('pos-products-container');
    grid.innerHTML = '';

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchVal) || p.reference.toLowerCase().includes(searchVal);
        const matchesCategory = selectedCat === "" || p.categoryId == selectedCat;
        return matchesSearch && matchesCategory && p.stockQuantity > 0;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="text-center text-muted col-span-full">Aucun produit en stock trouvé</div>';
        return;
    }

    filtered.forEach(p => {
        const card = document.createElement('div');
        const isLow = p.stockQuantity <= p.minStockAlert;
        card.className = `pos-product-card ${isLow ? 'low-stock' : ''}`;
        card.innerHTML = `
            <div>
                <h4>${p.name}</h4>
                <span class="stock">Stock: ${p.stockQuantity} ${p.unit}</span>
            </div>
            <div class="price">${p.salePrice.toLocaleString('fr-FR')} FCFA</div>
        `;
        card.addEventListener('click', () => addToCart(p));
        grid.appendChild(card);
    });
}

function addToCart(product) {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
        if (existing.quantity < product.stockQuantity) {
            existing.quantity++;
        } else {
            alert(`Impossible de vendre plus de ${product.stockQuantity} unités.`);
        }
    } else {
        cart.push({ product, quantity: 1 });
    }
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    container.innerHTML = '';

    cart.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-info">
                <h5>${item.product.name}</h5>
                <span>${item.product.salePrice.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div class="cart-item-qty">
                <button onclick="updateCartQty(${index}, -1)">-</button>
                <span><strong>${item.quantity}</strong></span>
                <button onclick="updateCartQty(${index}, 1)">+</button>
            </div>
        `;
        container.appendChild(div);
    });
    updateCartTotals();
}

window.updateCartQty = (index, delta) => {
    const item = cart[index];
    item.quantity += delta;
    if (item.quantity <= 0) {
        cart.splice(index, 1);
    } else if (item.quantity > item.product.stockQuantity) {
        item.quantity = item.product.stockQuantity;
        alert("Stock insuffisant.");
    }
    renderCart();
};

function updateCartTotals() {
    const subtotal = cart.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);
    const discount = parseFloat(document.getElementById('pos-discount').value) || 0;
    const taxRate = (parseFloat(document.getElementById('pos-tax').value) || 0) / 100;
    
    const taxAmount = (subtotal - discount) * taxRate;
    const total = (subtotal - discount) + taxAmount;

    document.getElementById('pos-subtotal').textContent = `${subtotal.toLocaleString('fr-FR')} FCFA`;
    document.getElementById('pos-total').textContent = `${Math.max(0, total).toLocaleString('fr-FR')} FCFA`;
}

function handlePOSCheckout() {
    if (cart.length === 0) {
        alert("Votre panier est vide.");
        return;
    }

    const sales = DB.get('sales');
    const products = DB.get('products');
    
    const subtotal = cart.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);
    const discount = parseFloat(document.getElementById('pos-discount').value) || 0;
    const taxRate = (parseFloat(document.getElementById('pos-tax').value) || 0) / 100;
    const total = Math.max(0, (subtotal - discount) + ((subtotal - discount) * taxRate));
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;

    const newSale = {
        id: Date.now().toString(),
        cashierName: currentUser.fullName,
        cashierId: currentUser.uid,
        totalAmount: total,
        discountAmount: discount,
        taxRate: taxRate,
        paymentMethod: paymentMethod,
        notes: '',
        status: 'COMPLETED',
        createdAt: Date.now()
    };

    cart.forEach(item => {
        const prod = products.find(p => p.id === item.product.id);
        if (prod) prod.stockQuantity = Math.max(0, prod.stockQuantity - item.quantity);
    });

    sales.push(newSale);
    DB.set('products', products); // virtual DB handles syncing
    DB.set('sales', sales);

    alert("Vente validée et enregistrée avec succès !");
    cart = [];
    document.getElementById('pos-discount').value = 0;
    renderCart();
}

// INVENTORY & PRODUCTS
function setupProducts() {
    document.getElementById('btn-add-product').addEventListener('click', () => { openProductModal(); });
    document.getElementById('product-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const products = DB.get('products');
        
        const id = document.getElementById('product-id').value;
        const name = document.getElementById('prod-name').value.trim();
        const ref = document.getElementById('prod-ref').value.trim();
        const cat = parseInt(document.getElementById('prod-category').value);
        const unit = document.getElementById('prod-unit').value.trim();
        const alertStock = parseInt(document.getElementById('prod-min-stock').value);
        const desc = document.getElementById('prod-desc').value.trim();
        
        const purchaseVal = parseFloat(document.getElementById('prod-price-purchase').value) || 0;
        const saleVal = parseFloat(document.getElementById('prod-price-sale').value) || 0;
        const initStockVal = parseInt(document.getElementById('prod-stock').value) || 0;

        if (id) {
            const prod = products.find(p => p.id == id);
            if (prod) {
                prod.name = name; prod.reference = ref; prod.categoryId = cat;
                prod.unit = unit; prod.purchasePrice = purchaseVal; prod.salePrice = saleVal;
                prod.minStockAlert = alertStock; prod.description = desc;
            }
        } else {
            products.push({
                id: Date.now().toString(),
                name: name, reference: ref, categoryId: cat, purchasePrice: purchaseVal,
                salePrice: saleVal, stockQuantity: initStockVal, minStockAlert: alertStock,
                unit: unit, description: desc
            });
        }

        DB.set('products', products);
        closeModal('modal-product');
    });
    document.getElementById('product-search').addEventListener('input', renderProductsTable);
}

function renderProductsTable() {
    const products = DB.get('products');
    const categories = DB.get('categories');
    const searchVal = document.getElementById('product-search').value.toLowerCase();
    
    const tbody = document.getElementById('products-tbody');
    tbody.innerHTML = '';

    const filtered = products.filter(p => p.name.toLowerCase().includes(searchVal) || p.reference.toLowerCase().includes(searchVal));

    filtered.forEach(p => {
        const catName = categories.find(c => c.id == p.categoryId)?.name || 'Non classé';
        const isLow = p.stockQuantity <= p.minStockAlert;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.reference}</strong></td>
            <td>${p.name}</td>
            <td>${catName}</td>
            <td>${p.purchasePrice.toLocaleString('fr-FR')} FCFA</td>
            <td>${p.salePrice.toLocaleString('fr-FR')} FCFA</td>
            <td><span class="${isLow ? 'badge badge-danger' : ''}">${p.stockQuantity}</span></td>
            <td>${p.unit}</td>
            <td>
                <div class="action-icons">
                    <button class="btn-edit" onclick="openProductModal('${p.id}')"><i class="fa fa-pen"></i></button>
                    <button class="btn-delete" onclick="deleteProduct('${p.id}')"><i class="fa fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openProductModal = (id = null) => {
    const categories = DB.get('categories');
    const select = document.getElementById('prod-category');
    select.innerHTML = '';
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id; opt.textContent = c.name;
        select.appendChild(opt);
    });

    const modal = document.getElementById('modal-product');
    const form = document.getElementById('product-form');
    const initStockInput = document.getElementById('prod-stock');
    form.reset();

    if (id) {
        document.getElementById('product-modal-title').textContent = "Modifier le Produit";
        document.getElementById('product-id').value = id;
        initStockInput.parentElement.style.display = 'none';

        const p = DB.get('products').find(prod => prod.id == id);
        if (p) {
            document.getElementById('prod-name').value = p.name;
            document.getElementById('prod-ref').value = p.reference;
            document.getElementById('prod-category').value = p.categoryId;
            document.getElementById('prod-unit').value = p.unit;
            document.getElementById('prod-price-purchase').value = p.purchasePrice;
            document.getElementById('prod-price-sale').value = p.salePrice;
            document.getElementById('prod-min-stock').value = p.minStockAlert;
            document.getElementById('prod-desc').value = p.description;
        }
    } else {
        document.getElementById('product-modal-title').textContent = "Nouveau Produit";
        document.getElementById('product-id').value = '';
        initStockInput.parentElement.style.display = 'flex';
    }
    modal.classList.add('active');
};

window.deleteProduct = (id) => {
    if (confirm("Voulez-vous vraiment supprimer ce produit ?")) {
        const products = DB.get('products');
        const index = products.findIndex(p => p.id == id);
        if (index > -1) {
            products.splice(index, 1);
            DB.set('products', products);
        }
    }
};

// CATEGORIES MANAGEMENT
function setupCategories() {
    document.getElementById('btn-add-category').addEventListener('click', () => { openModal('modal-category'); });
    document.getElementById('category-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const categories = DB.get('categories');
        categories.push({
            id: Date.now(),
            name: document.getElementById('cat-name').value.trim(),
            colorHex: document.getElementById('cat-color').value,
            description: document.getElementById('cat-desc').value.trim()
        });
        DB.set('categories', categories);
        closeModal('modal-category');
    });
}

function renderCategoriesTable() {
    const tbody = document.getElementById('categories-tbody');
    tbody.innerHTML = '';
    DB.get('categories').forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><div style="width: 24px; height: 24px; border-radius: 50%; background-color: ${c.colorHex}"></div></td>
            <td><strong>${c.name}</strong></td>
            <td>${c.description || '<span class="text-muted">Aucune description</span>'}</td>
            <td>
                <div class="action-icons">
                    <button class="btn-delete" onclick="deleteCategory(${c.id})"><i class="fa fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.deleteCategory = (id) => {
    if (confirm("Voulez-vous vraiment supprimer cette catégorie ?")) {
        const categories = DB.get('categories');
        const index = categories.findIndex(c => c.id == id);
        if (index > -1) {
            categories.splice(index, 1);
            DB.set('categories', categories);
        }
    }
};

// STOCK ENTRIES
function setupStockEntries() {
    document.getElementById('btn-add-entry').addEventListener('click', () => {
        const products = DB.get('products');
        const suppliers = DB.get('suppliers');
        
        const selectProd = document.getElementById('entry-product');
        const selectSup = document.getElementById('entry-supplier');

        selectProd.innerHTML = '<option value="">Choisir un produit...</option>';
        products.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id; opt.textContent = `${p.name} (Stock actuel: ${p.stockQuantity})`;
            selectProd.appendChild(opt);
        });

        selectSup.innerHTML = '<option value="">Aucun fournisseur</option>';
        suppliers.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id; opt.textContent = s.name;
            selectSup.appendChild(opt);
        });

        openModal('modal-stock-entry');
    });

    document.getElementById('stock-entry-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const entries = DB.get('stock_entries');
        const products = DB.get('products');
        
        const prodId = document.getElementById('entry-product').value;
        const supId = document.getElementById('entry-supplier').value || null;
        const qty = parseInt(document.getElementById('entry-qty').value);
        const cost = parseFloat(document.getElementById('entry-cost').value);

        entries.push({
            id: Date.now().toString(),
            productId: prodId, supplierId: supId, quantity: qty, unitCost: cost, totalCost: qty * cost, createdAt: Date.now()
        });

        const prod = products.find(p => p.id == prodId);
        if (prod) prod.stockQuantity += qty;

        DB.set('stock_entries', entries);
        DB.set('products', products);
        closeModal('modal-stock-entry');
    });
}

function renderStockEntriesTable() {
    const tbody = document.getElementById('entries-tbody');
    tbody.innerHTML = '';
    DB.get('stock_entries').forEach(e => {
        const prodName = DB.get('products').find(p => p.id == e.productId)?.name || 'Produit inconnu';
        const supName = DB.get('suppliers').find(s => s.id == e.supplierId)?.name || '<span class="text-muted">Aucun</span>';
        const dateStr = new Date(e.createdAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dateStr}</td><td><strong>${prodName}</strong></td><td>${supName}</td>
            <td>+${e.quantity}</td><td>${e.unitCost.toLocaleString('fr-FR')} FCFA</td>
            <td>${e.totalCost.toLocaleString('fr-FR')} FCFA</td>
        `;
        tbody.appendChild(tr);
    });
}

// SUPPLIERS
function setupSuppliers() {
    document.getElementById('btn-add-supplier').addEventListener('click', () => { openModal('modal-supplier'); });
    document.getElementById('supplier-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const suppliers = DB.get('suppliers');
        suppliers.push({
            id: Date.now().toString(),
            name: document.getElementById('sup-name').value.trim(),
            phone: document.getElementById('sup-phone').value.trim(),
            email: document.getElementById('sup-email').value.trim(),
            address: document.getElementById('sup-address').value.trim()
        });
        DB.set('suppliers', suppliers);
        closeModal('modal-supplier');
    });
}

function renderSuppliersTable() {
    const tbody = document.getElementById('suppliers-tbody');
    tbody.innerHTML = '';
    DB.get('suppliers').forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.name}</strong></td><td>${s.phone || '-'}</td><td>${s.email || '-'}</td>
            <td>${s.address || '-'}</td>
            <td><button class="btn-delete" onclick="deleteSupplier('${s.id}')"><i class="fa fa-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
}

window.deleteSupplier = (id) => {
    if (confirm("Voulez-vous vraiment supprimer ce fournisseur ?")) {
        const suppliers = DB.get('suppliers');
        const index = suppliers.findIndex(s => s.id == id);
        if (index > -1) {
            suppliers.splice(index, 1);
            DB.set('suppliers', suppliers);
        }
    }
};

// REPORTS
function setupReports() {
    const monthInput = document.getElementById('report-month');
    const now = new Date();
    monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    document.getElementById('btn-generate-report').addEventListener('click', () => {
        const selectedMonth = monthInput.value;
        const enterprise = document.getElementById('report-enterprise').value.trim() || "Mon Entreprise";
        if (!selectedMonth) return alert("Veuillez sélectionner un mois.");
        generatePDFReport(selectedMonth, enterprise);
    });
}

function generatePDFReport(yearMonth, enterprise) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const monthSales = DB.get('sales').filter(s => {
        const d = new Date(s.createdAt);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === yearMonth && s.status === 'COMPLETED';
    });

    const totalRev = monthSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const netRev = totalRev - monthSales.reduce((acc, s) => acc + s.discountAmount, 0);

    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(255, 255, 255);
    doc.text(enterprise.toUpperCase(), 15, 18);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Rapport mensuel généré le : ${new Date().toLocaleDateString('fr-FR')}`, 15, 28);

    doc.setTextColor(15, 23, 42); doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text(`BILAN MENSUEL - ${yearMonth}`, 15, 55);
    doc.setDrawColor(14, 165, 233); doc.setLineWidth(1.5); doc.line(15, 58, 195, 58);

    doc.setFillColor(248, 250, 252); doc.rect(15, 68, 85, 45, 'F'); doc.rect(110, 68, 85, 45, 'F');
    doc.setFontSize(11); doc.setTextColor(100, 116, 139); doc.text("RÉSUMÉ FINANCIER", 20, 78); doc.text("VALEUR DU STOCK ACTUEL", 115, 78);

    doc.setFontSize(10); doc.setTextColor(15, 23, 42);
    doc.text(`CA Mensuel Brut: ${totalRev.toLocaleString('fr-FR')} FCFA`, 20, 90);
    doc.text(`CA Mensuel Net: ${netRev.toLocaleString('fr-FR')} FCFA`, 20, 98);
    doc.text(`Transactions: ${monthSales.length}`, 20, 106);

    const products = DB.get('products');
    const stockVal = products.reduce((acc, p) => acc + (p.stockQuantity * p.purchasePrice), 0);
    const stockSaleVal = products.reduce((acc, p) => acc + (p.stockQuantity * p.salePrice), 0);
    doc.text(`Valeur d'achat: ${stockVal.toLocaleString('fr-FR')} FCFA`, 115, 90);
    doc.text(`Marge estimée: ${(stockSaleVal - stockVal).toLocaleString('fr-FR')} FCFA`, 115, 98);

    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text("DÉTAIL DES DERNIÈRES VENTES DU MOIS", 15, 130);
    
    doc.setFillColor(15, 23, 42); doc.rect(15, 136, 180, 10, 'F');
    doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text("Caissier", 20, 142); doc.text("Date", 60, 142); doc.text("Paiement", 110, 142); doc.text("Montant Net", 150, 142);

    let y = 153; doc.setFont("helvetica", "normal"); doc.setTextColor(15, 23, 42);
    monthSales.slice(0, 15).forEach(s => {
        doc.text(`${s.cashierName || 'Admin'}`, 20, y);
        doc.text(new Date(s.createdAt).toLocaleDateString('fr-FR'), 60, y);
        doc.text(s.paymentMethod, 110, y);
        doc.text(`${s.totalAmount.toLocaleString('fr-FR')} FCFA`, 150, y);
        doc.setDrawColor(241, 245, 249); doc.setLineWidth(0.5); doc.line(15, y + 3, 195, y + 3);
        y += 10;
    });

    if (monthSales.length === 0) {
        doc.setTextColor(148, 163, 184); doc.text("Aucune transaction enregistrée pour cette période.", 20, y);
    }
    doc.save(`Rapport_${yearMonth}.pdf`);
}

// MODALS
function setupModals() {
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.getAttribute('data-target')));
    });
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) e.target.classList.remove('active');
    });
}
function openModal(modalId) { document.getElementById(modalId).classList.add('active'); }
function closeModal(modalId) { document.getElementById(modalId).classList.remove('active'); }

// SETTINGS

function setupMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    
    if (btn && sidebar && backdrop) {
        btn.addEventListener('click', () => {
            sidebar.classList.add('open');
            backdrop.classList.add('open');
        });
        backdrop.addEventListener('click', () => {
            sidebar.classList.remove('open');
            backdrop.classList.remove('open');
        });
        
        // Also close menu when a menu item is clicked
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                sidebar.classList.remove('open');
                backdrop.classList.remove('open');
            });
        });
    }
}

function setupSettings() {
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameVal = document.getElementById('prof-username').value.trim();
        const fullnameVal = document.getElementById('prof-fullname').value.trim();
        const passwordVal = document.getElementById('prof-password').value.trim();

        try {
            await db.collection('users').doc(currentUser.uid).update({
                username: usernameVal, fullName: fullnameVal
            });
            if (passwordVal) {
                await auth.currentUser.updatePassword(passwordVal);
            }
            alert("Profil mis à jour avec succès !");
            document.getElementById('prof-password').value = '';
        } catch(err) {
            alert("Erreur de mise à jour: " + err.message);
        }
    });

    document.getElementById('btn-add-user').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openUserModal();
    });

    document.getElementById('user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('user-edit-id').value;
        const usernameVal = document.getElementById('usr-username').value.trim();
        const fullnameVal = document.getElementById('usr-fullname').value.trim();
        const roleVal = document.getElementById('usr-role').value;
        const passwordVal = document.getElementById('usr-password').value.trim();

        if (editId) {
            try {
                await db.collection('users').doc(editId).update({
                    username: usernameVal, fullName: fullnameVal, role: roleVal
                });
                alert("Utilisateur mis à jour avec succès !");
                closeModal('modal-user');
            } catch (err) {
                alert("Erreur lors de la mise à jour : " + err.message);
            }
        } else {
            const email = usernameVal + '@boutiquevisiontech.bf';
            try {
                const res = await secondaryApp.auth().createUserWithEmailAndPassword(email, passwordVal);
                await db.collection('users').doc(res.user.uid).set({
                    username: usernameVal, role: roleVal, fullName: fullnameVal, storeId: currentUser.storeId
                });
                await secondaryApp.auth().signOut();
                alert("Nouvel utilisateur créé avec succès ! Il apparaîtra dans la liste d'ici quelques secondes.");
                closeModal('modal-user');
            } catch (err) {
                let msg = err.message;
                if (err.code === 'auth/weak-password') msg = "Le mot de passe doit contenir au moins 6 caractères.";
                if (err.code === 'auth/email-already-in-use') msg = "Ce nom d'utilisateur est déjà utilisé par un autre caissier.";
                if (err.code === 'auth/network-request-failed') msg = "Problème de connexion internet.";
                alert("Erreur lors de la création du compte : " + msg);
            }
        }
    });
}

function renderSettings() {
    if (!currentUser) return;
    document.getElementById('prof-username').value = currentUser.username;
    document.getElementById('prof-fullname').value = currentUser.fullName;
    document.getElementById('prof-password').value = '';

    const usersCard = document.getElementById('admin-users-card');
    const resetCard = document.getElementById('system-reset-card');
    if (currentUser.role !== 'ADMIN') {
        usersCard.style.display = 'none'; resetCard.style.display = 'none';
    } else {
        usersCard.style.display = 'block'; resetCard.style.display = 'none';
        renderUsersTable();
    }
}

function renderUsersTable() {
    const users = DB.get('users');
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '';
    users.forEach(u => {
        const isSelf = u.uid === currentUser.uid;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${u.username}</strong></td>
            <td>${u.fullName}</td>
            <td><span class="badge ${u.role === 'ADMIN' ? 'badge-admin' : 'badge-cashier'}">${u.role}</span></td>
            <td>
                <div class="action-icons">
                    <button class="btn-edit" onclick="openUserModal('${u.uid}')"><i class="fa fa-pen"></i></button>
                    ${isSelf ? '' : `<button class="btn-delete" onclick="deleteUser('${u.uid}')"><i class="fa fa-trash"></i></button>`}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openUserModal = (id = null) => {
    if (typeof id !== 'string') id = null;
    const modal = document.getElementById('modal-user');
    const form = document.getElementById('user-form');
    const passInput = document.getElementById('usr-password');
    form.reset();

    if (id) {
        document.getElementById('user-modal-title').textContent = "Modifier l'Utilisateur";
        document.getElementById('user-edit-id').value = id;
        passInput.parentElement.style.display = 'none';

        const u = DB.get('users').find(user => user.uid === id);
        if (u) {
            document.getElementById('usr-username').value = u.username;
            document.getElementById('usr-fullname').value = u.fullName;
            document.getElementById('usr-role').value = u.role;
        }
    } else {
        document.getElementById('user-modal-title').textContent = "Créer un Utilisateur";
        document.getElementById('user-edit-id').value = '';
        passInput.parentElement.style.display = 'block';
        passInput.required = true;
    }
    modal.classList.add('active');
};

window.deleteUser = async (id) => {
    if (confirm("Voulez-vous vraiment supprimer cet utilisateur (il ne pourra plus se connecter) ?")) {
        await db.collection('users').doc(id).delete();
    }
};
