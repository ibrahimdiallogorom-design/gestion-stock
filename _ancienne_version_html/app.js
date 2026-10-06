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
let isRegistering = false;

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
    setupAllocation();
    setupCredits();
    setupModals();
    
    auth.onAuthStateChanged(async (user) => {
        if (isRegistering) {
            return;
        }
        if (user) {
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists) {
                    currentUser = { uid: user.uid, ...doc.data() };
                    loadStoreData();
                } else {
                    console.warn("Utilisateur non trouvé dans Firestore.");
                    auth.signOut();
                }
            } catch (err) {
                console.error("Erreur d'accès aux données utilisateur :", err);
                const loginError = document.getElementById('login-error');
                if (loginError) {
                    loginError.textContent = "Erreur de connexion aux données : " + (err.message || err);
                }
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
        document.getElementById('menu-credits').style.display = 'flex';
        document.getElementById('menu-products').style.display = isCashier ? 'none' : 'flex';
        document.getElementById('menu-categories').style.display = isCashier ? 'none' : 'flex';
        document.getElementById('menu-stock-entries').style.display = isCashier ? 'none' : 'flex';
        document.getElementById('menu-suppliers').style.display = isCashier ? 'none' : 'flex';
        document.getElementById('menu-reports').style.display = isCashier ? 'none' : 'flex';
        
        const activeItem = document.querySelector('.menu-item.active');
        let activeView = activeItem ? activeItem.getAttribute('data-target') : 'view-pos';
        
        if (isCashier && activeView !== 'view-pos' && activeView !== 'view-credits' && activeView !== 'view-settings') {
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
            console.error("Erreur de connexion :", err);
            let msg = "Identifiant ou mot de passe incorrect";
            if (err.code === 'auth/network-request-failed') {
                msg = "Problème de connexion internet. Vérifiez votre réseau.";
            } else if (err.code === 'auth/too-many-requests') {
                msg = "Trop de tentatives échouées. Veuillez patienter avant de réessayer.";
            }
            loginError.textContent = msg;
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
            isRegistering = true;
            try {
                const res = await auth.createUserWithEmailAndPassword(email, password);
                
                await db.collection('users').doc(res.user.uid).set({
                    username: email,
                    role: 'ADMIN',
                    fullName: fullName,
                    storeId: res.user.uid
                });

                await db.collection('stores').doc(res.user.uid).set({
                    storeName: storeName,
                    categories: [],
                    products: [],
                    suppliers: [],
                    sales: [],
                    stock_entries: []
                });

                registerError.textContent = "";
                currentUser = {
                    uid: res.user.uid,
                    username: email,
                    role: 'ADMIN',
                    fullName: fullName,
                    storeId: res.user.uid
                };
                isRegistering = false;
                loadStoreData();
            } catch (err) {
                isRegistering = false;
                console.error("Erreur création boutique :", err);
                let msg = err.message;
                if (err.code === 'auth/email-already-in-use') msg = "Cette adresse e-mail est déjà utilisée.";
                if (err.code === 'auth/weak-password') msg = "Le mot de passe doit comporter au moins 6 caractères.";
                registerError.textContent = "Erreur: " + msg;
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
    else if (viewId === 'view-credits') renderCreditsTable();
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
    
    // Total actually collected today (comptant + acomptes versés aujourd'hui)
    let todayCollected = 0;
    let todayCount = 0;
    sales.forEach(s => {
        if (s.payments && Array.isArray(s.payments)) {
            s.payments.forEach(p => {
                if (p.date >= startOfDay) {
                    todayCollected += p.amount;
                    todayCount++;
                }
            });
        } else if (s.createdAt >= startOfDay && s.status === 'COMPLETED') {
            todayCollected += (s.amountPaid !== undefined ? s.amountPaid : s.totalAmount);
            todayCount++;
        }
    });

    document.getElementById('stat-sales-today').textContent = `${todayCollected.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA`;
    document.getElementById('stat-sales-count').textContent = `${todayCount} encaissement(s)`;
    
    // Stock value & Profit
    const stockPurchaseVal = products.reduce((acc, p) => acc + (p.stockQuantity * p.purchasePrice), 0);
    const stockSaleVal = products.reduce((acc, p) => acc + (p.stockQuantity * p.salePrice), 0);
    const stockProfitVal = stockSaleVal - stockPurchaseVal;
    
    document.getElementById('stat-stock-value').textContent = `${stockPurchaseVal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA`;
    const statStockProfit = document.getElementById('stat-stock-profit');
    if (statStockProfit) {
        statStockProfit.textContent = `Bénéfice estimé : +${stockProfitVal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA`;
    }

    // Credits / Acomptes
    const pendingSales = sales.filter(s => (s.remainingAmount || 0) > 0);
    const totalRemaining = pendingSales.reduce((acc, s) => acc + s.remainingAmount, 0);
    const statCreditDue = document.getElementById('stat-credit-due');
    const statCreditCount = document.getElementById('stat-credit-count');
    if (statCreditDue) {
        statCreditDue.textContent = `${totalRemaining.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA`;
    }
    if (statCreditCount) {
        statCreditCount.textContent = `${pendingSales.length} solde(s) en attente`;
    }
    
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
    const acompteInput = document.getElementById('pos-acompte-amount');

    searchInput.addEventListener('input', renderPOSProducts);
    filterCat.addEventListener('change', renderPOSProducts);
    discountInput.addEventListener('input', updateCartTotals);
    taxInput.addEventListener('input', updateCartTotals);
    if (acompteInput) acompteInput.addEventListener('input', updateCartTotals);
    btnCheckout.addEventListener('click', handlePOSCheckout);

    // Payment Type Toggle (FULL vs PARTIAL)
    const typeComptantLabel = document.getElementById('type-comptant-label');
    const typeAcompteLabel = document.getElementById('type-acompte-label');
    const acompteBox = document.getElementById('pos-acompte-box');
    const paymentMethodLabel = document.getElementById('pos-payment-method-label');
    const saleTypeRadios = document.querySelectorAll('input[name="sale-type"]');

    saleTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'PARTIAL') {
                if (typeComptantLabel) {
                    typeComptantLabel.classList.remove('active');
                    typeComptantLabel.style.borderColor = 'var(--border-color)';
                    typeComptantLabel.style.background = 'var(--bg-surface-light)';
                    typeComptantLabel.style.color = 'var(--text-muted)';
                }
                if (typeAcompteLabel) {
                    typeAcompteLabel.classList.add('active');
                    typeAcompteLabel.style.borderColor = '#f59e0b';
                    typeAcompteLabel.style.background = 'rgba(245, 158, 11, 0.15)';
                    typeAcompteLabel.style.color = '#f59e0b';
                }
                if (acompteBox) acompteBox.style.display = 'block';
                if (paymentMethodLabel) paymentMethodLabel.textContent = "Mode de paiement de l'acompte :";
                btnCheckout.textContent = "Valider Vente & Acompte";
                btnCheckout.className = "btn-warning btn-block btn-lg";
            } else {
                if (typeAcompteLabel) {
                    typeAcompteLabel.classList.remove('active');
                    typeAcompteLabel.style.borderColor = 'var(--border-color)';
                    typeAcompteLabel.style.background = 'var(--bg-surface-light)';
                    typeAcompteLabel.style.color = 'var(--text-muted)';
                }
                if (typeComptantLabel) {
                    typeComptantLabel.classList.add('active');
                    typeComptantLabel.style.borderColor = 'var(--primary)';
                    typeComptantLabel.style.background = 'rgba(16, 185, 129, 0.15)';
                    typeComptantLabel.style.color = 'var(--primary)';
                }
                if (acompteBox) acompteBox.style.display = 'none';
                if (paymentMethodLabel) paymentMethodLabel.textContent = "Mode de paiement du versement :";
                btnCheckout.textContent = "Valider & Encaisser";
                btnCheckout.className = "btn-success btn-block btn-lg";
            }
            updateCartTotals();
        });
    });

    // Payment Method selection style toggle
    document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
        radio.addEventListener('change', () => {
            document.querySelectorAll('.methods-group .method-btn').forEach(btn => btn.classList.remove('active'));
            radio.closest('.method-btn')?.classList.add('active');
        });
    });
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
        const availableStock = currentUser.role === 'ADMIN' ? p.stockQuantity : ((p.cashierStocks && p.cashierStocks[currentUser.uid]) || 0);
        return matchesSearch && matchesCategory && availableStock > 0;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="text-center text-muted col-span-full">Aucun produit en stock trouvé</div>';
        return;
    }

    filtered.forEach(p => {
        const availableStock = currentUser.role === 'ADMIN' ? p.stockQuantity : ((p.cashierStocks && p.cashierStocks[currentUser.uid]) || 0);
        const card = document.createElement('div');
        const isLow = availableStock <= p.minStockAlert;
        card.className = `pos-product-card ${isLow ? 'low-stock' : ''}`;
        card.innerHTML = `
            <div>
                <h4>${p.name}</h4>
                <span class="stock">Stock: ${availableStock} ${p.unit}</span>
            </div>
            <div class="price">${p.salePrice.toLocaleString('fr-FR')} FCFA</div>
        `;
        card.addEventListener('click', () => addToCart(p));
        grid.appendChild(card);
    });
}

function addToCart(product) {
    const availableStock = currentUser.role === 'ADMIN' ? product.stockQuantity : ((product.cashierStocks && product.cashierStocks[currentUser.uid]) || 0);
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
        if (existing.quantity < availableStock) {
            existing.quantity++;
        } else {
            alert(`Impossible de vendre plus de ${availableStock} unités.`);
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
    const availableStock = currentUser.role === 'ADMIN' ? item.product.stockQuantity : ((item.product.cashierStocks && item.product.cashierStocks[currentUser.uid]) || 0);
    
    item.quantity += delta;
    if (item.quantity <= 0) {
        cart.splice(index, 1);
    } else if (item.quantity > availableStock) {
        item.quantity = availableStock;
        alert("Stock insuffisant.");
    }
    renderCart();
};

function updateCartTotals() {
    const subtotal = cart.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);
    const discount = parseFloat(document.getElementById('pos-discount').value) || 0;
    const taxRate = (parseFloat(document.getElementById('pos-tax').value) || 0) / 100;
    
    const taxAmount = (subtotal - discount) * taxRate;
    const total = Math.max(0, (subtotal - discount) + taxAmount);

    document.getElementById('pos-subtotal').textContent = `${subtotal.toLocaleString('fr-FR')} FCFA`;
    document.getElementById('pos-total').textContent = `${total.toLocaleString('fr-FR')} FCFA`;

    // Acompte remaining calculation
    const acompte = parseFloat(document.getElementById('pos-acompte-amount')?.value) || 0;
    const remaining = Math.max(0, total - acompte);
    const remainingEl = document.getElementById('pos-acompte-remaining');
    if (remainingEl) {
        remainingEl.textContent = `${remaining.toLocaleString('fr-FR')} FCFA`;
    }
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
    const saleType = document.querySelector('input[name="sale-type"]:checked')?.value || 'FULL';

    let isPartial = (saleType === 'PARTIAL');
    let customerName = 'Comptant';
    let customerPhone = '';
    let acompteAmount = total;
    let remainingAmount = 0;
    let saleStatus = 'COMPLETED';

    if (isPartial) {
        customerName = document.getElementById('pos-customer-name').value.trim();
        customerPhone = document.getElementById('pos-customer-phone').value.trim();
        acompteAmount = parseFloat(document.getElementById('pos-acompte-amount').value) || 0;

        if (!customerName) {
            alert("Veuillez saisir le nom du client pour enregistrer une vente avec acompte.");
            document.getElementById('pos-customer-name').focus();
            return;
        }

        if (acompteAmount < 0) {
            alert("Le montant de l'acompte ne peut pas être négatif.");
            return;
        }

        if (acompteAmount > total) {
            alert("Le montant de l'acompte ne peut pas dépasser le montant total de la vente.");
            return;
        }

        remainingAmount = total - acompteAmount;
        if (remainingAmount <= 0) {
            isPartial = false;
            saleStatus = 'COMPLETED';
            remainingAmount = 0;
            acompteAmount = total;
        } else {
            saleStatus = 'PARTIAL';
        }
    }

    const newSale = {
        id: Date.now().toString(),
        cashierName: currentUser.fullName,
        cashierId: currentUser.uid,
        totalAmount: total,
        discountAmount: discount,
        taxRate: taxRate,
        paymentMethod: paymentMethod,
        paymentType: isPartial ? 'PARTIAL' : 'FULL',
        customerName: isPartial ? customerName : 'Vente directe',
        customerPhone: customerPhone,
        amountPaid: acompteAmount,
        remainingAmount: remainingAmount,
        notes: isPartial ? `Vente avec acompte de ${acompteAmount.toLocaleString('fr-FR')} FCFA` : '',
        status: saleStatus,
        items: cart.map(item => ({
            id: item.product.id,
            name: item.product.name,
            reference: item.product.reference,
            salePrice: item.product.salePrice,
            purchasePrice: item.product.purchasePrice,
            quantity: item.quantity,
            unit: item.product.unit
        })),
        payments: [
            {
                date: Date.now(),
                amount: acompteAmount,
                method: paymentMethod,
                receivedBy: currentUser.fullName,
                note: isPartial ? 'Acompte initial' : 'Paiement comptant'
            }
        ],
        createdAt: Date.now()
    };

    // Stock deduction
    cart.forEach(item => {
        const prod = products.find(p => p.id === item.product.id);
        if (prod) {
            prod.stockQuantity = Math.max(0, prod.stockQuantity - item.quantity);
            if (currentUser.role !== 'ADMIN' && prod.cashierStocks && prod.cashierStocks[currentUser.uid] !== undefined) {
                prod.cashierStocks[currentUser.uid] = Math.max(0, prod.cashierStocks[currentUser.uid] - item.quantity);
            }
        }
    });

    sales.push(newSale);
    DB.set('products', products); // virtual DB handles syncing
    DB.set('sales', sales);

    if (isPartial) {
        alert(`Vente avec acompte enregistrée avec succès !\n\nClient : ${customerName}\nAcompte reçu : ${acompteAmount.toLocaleString('fr-FR')} FCFA\nReste à payer : ${remainingAmount.toLocaleString('fr-FR')} FCFA\n\nVous pouvez suivre ce dossier dans l'onglet "Acomptes & Crédits".`);
    } else {
        alert("Vente validée et encaissée avec succès !");
    }

    // Reset POS form
    cart = [];
    document.getElementById('pos-discount').value = 0;
    if (document.getElementById('pos-customer-name')) document.getElementById('pos-customer-name').value = '';
    if (document.getElementById('pos-customer-phone')) document.getElementById('pos-customer-phone').value = '';
    if (document.getElementById('pos-acompte-amount')) document.getElementById('pos-acompte-amount').value = 0;
    
    // Reset to FULL payment
    const fullRadio = document.querySelector('input[name="sale-type"][value="FULL"]');
    if (fullRadio) {
        fullRadio.checked = true;
        fullRadio.dispatchEvent(new Event('change'));
    }

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
                prod.stockQuantity = initStockVal; // Permet de modifier et corriger le stock
            }
        } else {
            products.push({
                id: Date.now().toString(),
                name: name, reference: ref, categoryId: cat, purchasePrice: purchaseVal,
                salePrice: saleVal, stockQuantity: initStockVal, minStockAlert: alertStock,
                unit: unit, description: desc, cashierStocks: {}
            });
        }

        DB.set('products', products);
        closeModal('modal-product');
        renderProductsTable();
        if (document.getElementById('view-dashboard').classList.contains('active')) {
            renderDashboard();
        }
    });
    document.getElementById('product-search').addEventListener('input', renderProductsTable);
}

function renderProductsTable() {
    const products = DB.get('products');
    const categories = DB.get('categories');
    const searchVal = document.getElementById('product-search').value.toLowerCase();
    
    // Calcul de la synthèse financière de l'inventaire
    const totalPurchaseCost = products.reduce((sum, p) => sum + (p.stockQuantity * p.purchasePrice), 0);
    const totalSaleValue = products.reduce((sum, p) => sum + (p.stockQuantity * p.salePrice), 0);
    const totalProfit = totalSaleValue - totalPurchaseCost;
    const profitMargin = totalPurchaseCost > 0 ? ((totalProfit / totalPurchaseCost) * 100).toFixed(1) : 0;
    const totalUnits = products.reduce((sum, p) => sum + p.stockQuantity, 0);

    const invTotalPurchase = document.getElementById('inv-total-purchase');
    const invTotalSale = document.getElementById('inv-total-sale');
    const invTotalProfit = document.getElementById('inv-total-profit');
    const invProfitMargin = document.getElementById('inv-profit-margin');
    const invTotalQuantity = document.getElementById('inv-total-quantity');
    const invTotalProducts = document.getElementById('inv-total-products');

    if (invTotalPurchase) invTotalPurchase.textContent = `${totalPurchaseCost.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA`;
    if (invTotalSale) invTotalSale.textContent = `${totalSaleValue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA`;
    if (invTotalProfit) {
        invTotalProfit.textContent = `${totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA`;
        invTotalProfit.className = totalProfit >= 0 ? 'text-success' : 'text-danger';
    }
    if (invProfitMargin) invProfitMargin.textContent = `Marge estimée : ${profitMargin}%`;
    if (invTotalQuantity) invTotalQuantity.textContent = `${totalUnits} unité(s)`;
    if (invTotalProducts) invTotalProducts.textContent = `${products.length} référence(s)`;

    const tbody = document.getElementById('products-tbody');
    tbody.innerHTML = '';

    const filtered = products.filter(p => p.name.toLowerCase().includes(searchVal) || p.reference.toLowerCase().includes(searchVal));

    filtered.forEach(p => {
        const catName = categories.find(c => c.id == p.categoryId)?.name || 'Non classé';
        const isLow = p.stockQuantity <= p.minStockAlert;
        
        let allocTotal = 0;
        if (p.cashierStocks) {
            allocTotal = Object.values(p.cashierStocks).reduce((sum, val) => sum + val, 0);
        }
        const allocStr = allocTotal > 0 ? `<br><small class="text-muted">Alloué: ${allocTotal}</small>` : '';

        // Bénéfice unitaire et bénéfice total du stock
        const unitProfit = p.salePrice - p.purchasePrice;
        const totalStockProfit = unitProfit * p.stockQuantity;
        const unitProfitClass = unitProfit > 0 ? 'profit-positive' : (unitProfit < 0 ? 'profit-negative' : 'profit-neutral');
        const stockProfitClass = totalStockProfit > 0 ? 'profit-positive' : (totalStockProfit < 0 ? 'profit-negative' : 'profit-neutral');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.reference}</strong></td>
            <td>${p.name}</td>
            <td>${catName}</td>
            <td>${p.purchasePrice.toLocaleString('fr-FR')} FCFA</td>
            <td>${p.salePrice.toLocaleString('fr-FR')} FCFA</td>
            <td class="${unitProfitClass}">${unitProfit >= 0 ? '+' : ''}${unitProfit.toLocaleString('fr-FR')} FCFA</td>
            <td>
                <span class="${isLow ? 'badge badge-danger' : ''}">${p.stockQuantity}</span>
                <button class="btn-quick-stock" onclick="quickAdjustStock('${p.id}')" title="Corriger la quantité en stock"><i class="fa-solid fa-pen-to-square"></i></button>
                ${allocStr}
            </td>
            <td class="${stockProfitClass}">${totalStockProfit >= 0 ? '+' : ''}${totalStockProfit.toLocaleString('fr-FR')} FCFA</td>
            <td>${p.unit}</td>
            <td>
                <div class="action-icons">
                    <button class="btn-success" onclick="openAllocateModal('${p.id}')" title="Allouer du stock"><i class="fa fa-box-open"></i></button>
                    <button class="btn-edit" onclick="openProductModal('${p.id}')" title="Modifier produit / Corriger stock"><i class="fa fa-pen"></i></button>
                    <button class="btn-delete" onclick="deleteProduct('${p.id}')" title="Supprimer"><i class="fa fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.quickAdjustStock = (productId) => {
    const products = DB.get('products');
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    const res = prompt(`Correction directe de la quantité en stock :\nProduit : ${prod.name} (${prod.reference})\n\nQuantité actuelle enregistrée : ${prod.stockQuantity} ${prod.unit}\nEntrez la nouvelle quantité réelle :`, prod.stockQuantity);
    if (res === null) return;
    const newQty = parseInt(res.trim());
    if (isNaN(newQty) || newQty < 0) {
        alert("Veuillez saisir un nombre valide supérieur ou égal à 0.");
        return;
    }
    prod.stockQuantity = newQty;
    DB.set('products', products);
    renderProductsTable();
    if (document.getElementById('view-dashboard').classList.contains('active')) {
        renderDashboard();
    }
};

window.openAllocateModal = (productId) => {
    const products = DB.get('products');
    const users = DB.get('users');
    
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Calculer le maximum qu'on peut allouer
    let allocTotal = 0;
    if (product.cashierStocks) {
        allocTotal = Object.values(product.cashierStocks).reduce((sum, val) => sum + val, 0);
    }
    const maxAllocable = product.stockQuantity - allocTotal;

    document.getElementById('alloc-product-id').value = product.id;
    document.getElementById('alloc-product-name').value = product.name;
    document.getElementById('alloc-max-stock').textContent = maxAllocable;
    
    // Only allow maxAllocable
    const qtyInput = document.getElementById('alloc-qty');
    qtyInput.max = maxAllocable;
    qtyInput.value = '';

    const cashierSelect = document.getElementById('alloc-cashier-id');
    cashierSelect.innerHTML = '';
    const cashiers = users.filter(u => u.role === 'CAISSIER');
    if (cashiers.length === 0) {
        cashierSelect.innerHTML = '<option value="">Aucun caissier trouvé</option>';
    } else {
        cashiers.forEach(c => {
            const currentAlloc = (product.cashierStocks && product.cashierStocks[c.uid]) ? product.cashierStocks[c.uid] : 0;
            const opt = document.createElement('option');
            opt.value = c.uid;
            opt.textContent = `${c.fullName || c.username} (Déjà: ${currentAlloc})`;
            cashierSelect.appendChild(opt);
        });
    }

    document.getElementById('modal-allocate-stock').classList.add('active');
};

function setupAllocation() {
    document.getElementById('allocate-stock-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const prodId = document.getElementById('alloc-product-id').value;
        const cashierId = document.getElementById('alloc-cashier-id').value;
        const qty = parseInt(document.getElementById('alloc-qty').value);

        if (!cashierId) {
            alert("Veuillez sélectionner un caissier.");
            return;
        }

        const products = DB.get('products');
        const prodIndex = products.findIndex(p => p.id === prodId);
        
        if (prodIndex > -1) {
            const p = products[prodIndex];
            if (!p.cashierStocks) p.cashierStocks = {};
            
            let currentTotal = Object.values(p.cashierStocks).reduce((sum, val) => sum + val, 0);
            const remaining = p.stockQuantity - currentTotal;
            
            if (qty > remaining) {
                alert("Quantité supérieure au stock disponible en boutique !");
                return;
            }

            if (!p.cashierStocks[cashierId]) p.cashierStocks[cashierId] = 0;
            p.cashierStocks[cashierId] += qty;
            
            DB.set('products', products);
            renderProductsTable();
            closeModal('modal-allocate-stock');
            alert("Stock alloué avec succès !");
        }
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
    const stockLabel = document.getElementById('prod-stock-label');
    const stockHelp = document.getElementById('prod-stock-help');
    form.reset();

    if (id) {
        document.getElementById('product-modal-title').textContent = "Modifier le Produit";
        document.getElementById('product-id').value = id;
        
        // Le champ stock est rendu visible et modifiable
        initStockInput.parentElement.style.display = 'flex';
        if (stockLabel) stockLabel.textContent = "Quantité en Stock (Correction)";
        if (stockHelp) stockHelp.style.display = 'block';

        const p = DB.get('products').find(prod => prod.id == id);
        if (p) {
            document.getElementById('prod-name').value = p.name;
            document.getElementById('prod-ref').value = p.reference;
            document.getElementById('prod-category').value = p.categoryId;
            document.getElementById('prod-unit').value = p.unit;
            document.getElementById('prod-price-purchase').value = p.purchasePrice;
            document.getElementById('prod-price-sale').value = p.salePrice;
            document.getElementById('prod-stock').value = p.stockQuantity ?? 0;
            document.getElementById('prod-min-stock').value = p.minStockAlert;
            document.getElementById('prod-desc').value = p.description || '';
        }
    } else {
        document.getElementById('product-modal-title').textContent = "Nouveau Produit";
        document.getElementById('product-id').value = '';
        initStockInput.parentElement.style.display = 'flex';
        if (stockLabel) stockLabel.textContent = "Stock Initial";
        if (stockHelp) stockHelp.style.display = 'none';
        document.getElementById('prod-stock').value = '0';
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

// ACOMPTES & CRÉDITS MANAGEMENT
function setupCredits() {
    const searchInput = document.getElementById('credits-search');
    const filterSelect = document.getElementById('credits-filter-status');
    if (searchInput) searchInput.addEventListener('input', renderCreditsTable);
    if (filterSelect) filterSelect.addEventListener('change', renderCreditsTable);

    // Formulaire d'encaissement d'un nouveau versement
    const addPaymentForm = document.getElementById('add-payment-form');
    if (addPaymentForm) {
        addPaymentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const saleId = document.getElementById('pay-sale-id').value;
            const amount = parseFloat(document.getElementById('pay-amount').value) || 0;
            const method = document.getElementById('pay-method').value;
            const note = document.getElementById('pay-note').value.trim();

            const sales = DB.get('sales');
            const sale = sales.find(s => s.id === saleId);
            if (!sale) {
                alert("Dossier de vente introuvable.");
                return;
            }

            const currentRemaining = sale.remainingAmount !== undefined ? sale.remainingAmount : (sale.totalAmount - (sale.amountPaid || 0));
            if (amount <= 0) {
                alert("Le montant du versement doit être supérieur à 0.");
                return;
            }
            if (amount > currentRemaining) {
                alert(`Le versement (${amount.toLocaleString('fr-FR')} FCFA) ne peut pas dépasser le solde restant dû (${currentRemaining.toLocaleString('fr-FR')} FCFA).`);
                return;
            }

            if (!sale.payments) {
                sale.payments = [
                    {
                        date: sale.createdAt || Date.now(),
                        amount: sale.amountPaid || (sale.totalAmount - currentRemaining),
                        method: sale.paymentMethod || 'CASH',
                        receivedBy: sale.cashierName || 'Admin',
                        note: 'Versement initial'
                    }
                ];
            }

            sale.payments.push({
                date: Date.now(),
                amount: amount,
                method: method,
                receivedBy: currentUser ? currentUser.fullName : 'Admin',
                note: note || 'Versement complémentaire'
            });

            sale.amountPaid = (sale.amountPaid || 0) + amount;
            sale.remainingAmount = Math.max(0, currentRemaining - amount);

            if (sale.remainingAmount <= 0) {
                sale.status = 'COMPLETED';
                sale.remainingAmount = 0;
            }

            DB.set('sales', sales);
            closeModal('modal-add-payment');
            renderCreditsTable();
            if (document.getElementById('view-dashboard').classList.contains('active')) {
                renderDashboard();
            }
            alert(`Versement de ${amount.toLocaleString('fr-FR')} FCFA enregistré avec succès !${sale.remainingAmount === 0 ? ' Dossier soldé à 100% !' : ''}`);
        });
    }
}

function renderCreditsTable() {
    const sales = DB.get('sales');
    const searchVal = (document.getElementById('credits-search')?.value || '').toLowerCase();
    const filterStatus = document.getElementById('credits-filter-status')?.value || 'PENDING';

    // Tous les dossiers qui sont des ventes avec acompte ou ayant un solde restant
    const creditSales = sales.filter(s => {
        return s.paymentType === 'PARTIAL' || (s.remainingAmount !== undefined && s.remainingAmount > 0) || (s.customerName && s.amountPaid !== undefined && s.amountPaid < s.totalAmount);
    });

    // Statistiques globales
    const totalRemaining = creditSales.reduce((acc, s) => acc + (s.remainingAmount || 0), 0);
    const totalCollected = creditSales.reduce((acc, s) => acc + (s.amountPaid || 0), 0);
    const pendingCount = creditSales.filter(s => (s.remainingAmount || 0) > 0).length;

    const statRemEl = document.getElementById('stat-credit-remaining');
    const statCollEl = document.getElementById('stat-credit-collected');
    const statPendEl = document.getElementById('stat-credit-pending-count');

    if (statRemEl) statRemEl.textContent = `${totalRemaining.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA`;
    if (statCollEl) statCollEl.textContent = `${totalCollected.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA`;
    if (statPendEl) statPendEl.textContent = `${pendingCount}`;

    // Filtrage
    const filtered = creditSales.filter(s => {
        const clientMatches = (s.customerName || '').toLowerCase().includes(searchVal) || (s.customerPhone || '').includes(searchVal);
        const isPending = (s.remainingAmount || 0) > 0;
        
        let statusMatches = true;
        if (filterStatus === 'PENDING') statusMatches = isPending;
        else if (filterStatus === 'COMPLETED') statusMatches = !isPending;

        return clientMatches && statusMatches;
    });

    const tbody = document.getElementById('credits-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted" style="padding: 24px;">Aucun dossier d\'acompte trouvé.</td></tr>';
        return;
    }

    filtered.forEach(s => {
        const remaining = s.remainingAmount !== undefined ? s.remainingAmount : Math.max(0, s.totalAmount - (s.amountPaid || 0));
        const paid = s.amountPaid !== undefined ? s.amountPaid : (s.totalAmount - remaining);
        const isSolded = remaining <= 0;
        const dateStr = new Date(s.createdAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        let itemsSummary = '<span class="text-muted">-</span>';
        if (s.items && Array.isArray(s.items) && s.items.length > 0) {
            itemsSummary = s.items.map(it => `${it.quantity}x ${it.name}`).join(', ');
            if (itemsSummary.length > 35) {
                itemsSummary = `<span title="${itemsSummary}">${itemsSummary.substring(0, 32)}...</span>`;
            }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td><strong>${s.customerName || 'Client'}</strong></td>
            <td>${s.customerPhone || '<span class="text-muted">-</span>'}</td>
            <td>${itemsSummary}</td>
            <td><strong>${s.totalAmount.toLocaleString('fr-FR')} FCFA</strong></td>
            <td class="text-success">${paid.toLocaleString('fr-FR')} FCFA</td>
            <td class="text-danger" style="font-weight: 800;">${remaining.toLocaleString('fr-FR')} FCFA</td>
            <td>
                <span class="${isSolded ? 'credit-badge-completed' : 'credit-badge-pending'}">
                    ${isSolded ? 'SOLDÉ' : 'RESTE DÛ'}
                </span>
            </td>
            <td>
                <div class="action-icons">
                    ${!isSolded ? `<button class="btn-success" onclick="openAddPaymentModal('${s.id}')" title="Encaisser un versement"><i class="fa-solid fa-money-bill-transfer"></i></button>` : ''}
                    <button class="btn-edit" onclick="openPaymentHistoryModal('${s.id}')" title="Historique des versements"><i class="fa-solid fa-receipt"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openAddPaymentModal = (saleId) => {
    const sales = DB.get('sales');
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const remaining = sale.remainingAmount !== undefined ? sale.remainingAmount : Math.max(0, sale.totalAmount - (sale.amountPaid || 0));
    const paid = sale.amountPaid !== undefined ? sale.amountPaid : (sale.totalAmount - remaining);

    document.getElementById('pay-sale-id').value = sale.id;
    document.getElementById('pay-customer-name').textContent = `Client : ${sale.customerName || 'Inconnu'}`;
    document.getElementById('pay-total-amount').textContent = `${sale.totalAmount.toLocaleString('fr-FR')} FCFA`;
    document.getElementById('pay-already-paid').textContent = `${paid.toLocaleString('fr-FR')} FCFA`;
    document.getElementById('pay-remaining-amount').textContent = `${remaining.toLocaleString('fr-FR')} FCFA`;
    
    const payInput = document.getElementById('pay-amount');
    payInput.value = remaining;
    payInput.max = remaining;
    document.getElementById('pay-note').value = '';

    openModal('modal-add-payment');
};

window.openPaymentHistoryModal = (saleId) => {
    const sales = DB.get('sales');
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const remaining = sale.remainingAmount !== undefined ? sale.remainingAmount : Math.max(0, sale.totalAmount - (sale.amountPaid || 0));
    const paid = sale.amountPaid !== undefined ? sale.amountPaid : (sale.totalAmount - remaining);

    const summaryEl = document.getElementById('history-sale-summary');
    let itemsStr = '';
    if (sale.items && sale.items.length > 0) {
        itemsStr = `<div style="margin-top: 8px; font-size: 0.85rem;" class="text-muted"><strong>Articles pris :</strong> ${sale.items.map(it => `${it.quantity}x ${it.name}`).join(', ')}</div>`;
    }

    summaryEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 1.1rem; color: var(--text-main);">${sale.customerName || 'Client'} ${sale.customerPhone ? `(${sale.customerPhone})` : ''}</h4>
            <span class="${remaining <= 0 ? 'badge badge-success' : 'badge badge-danger'}">${remaining <= 0 ? 'SOLDÉ' : 'RESTE DÛ'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 0.9rem;">
            <span>Total : <strong>${sale.totalAmount.toLocaleString('fr-FR')} FCFA</strong></span>
            <span>Total versé : <strong class="text-success">${paid.toLocaleString('fr-FR')} FCFA</strong></span>
            <span>Reste à payer : <strong class="text-danger">${remaining.toLocaleString('fr-FR')} FCFA</strong></span>
        </div>
        ${itemsStr}
    `;

    const tbody = document.getElementById('history-payments-tbody');
    tbody.innerHTML = '';

    let payments = sale.payments;
    if (!payments || payments.length === 0) {
        payments = [
            {
                date: sale.createdAt,
                amount: paid,
                method: sale.paymentMethod || 'CASH',
                receivedBy: sale.cashierName || 'Vendeur',
                note: 'Versement initial'
            }
        ];
    }

    payments.forEach(p => {
        const methodMap = { 'CASH': 'Espèces', 'CARD': 'Carte', 'TRANSFER': 'Virement / Mobile' };
        const dateStr = new Date(p.date).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td class="text-success font-weight-bold">+${p.amount.toLocaleString('fr-FR')} FCFA</td>
            <td>${methodMap[p.method] || p.method}</td>
            <td>${p.receivedBy || '-'}</td>
            <td>${p.note || '-'}</td>
        `;
        tbody.appendChild(tr);
    });

    openModal('modal-payment-history');
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
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === yearMonth;
    });

    const totalFacture = monthSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalCollected = monthSales.reduce((acc, s) => acc + (s.amountPaid !== undefined ? s.amountPaid : s.totalAmount), 0);
    const totalRemainingCredit = monthSales.reduce((acc, s) => acc + (s.remainingAmount || 0), 0);

    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F');
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(255, 255, 255);
    doc.text(enterprise.toUpperCase(), 15, 18);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Rapport mensuel généré le : ${new Date().toLocaleDateString('fr-FR')}`, 15, 28);

    doc.setTextColor(15, 23, 42); doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text(`BILAN MENSUEL - ${yearMonth}`, 15, 55);
    doc.setDrawColor(14, 165, 233); doc.setLineWidth(1.5); doc.line(15, 58, 195, 58);

    doc.setFillColor(248, 250, 252); doc.rect(15, 68, 85, 52, 'F'); doc.rect(110, 68, 85, 52, 'F');
    doc.setFontSize(11); doc.setTextColor(100, 116, 139); doc.text("RÉSUMÉ COMMERCIAL & RECOUVREMENT", 20, 78); doc.text("VALEUR DU STOCK ACTUEL", 115, 78);

    doc.setFontSize(10); doc.setTextColor(15, 23, 42);
    doc.text(`Total Facturé: ${totalFacture.toLocaleString('fr-FR')} FCFA`, 20, 88);
    doc.text(`Total Encaissé (Acomptes): ${totalCollected.toLocaleString('fr-FR')} FCFA`, 20, 96);
    doc.text(`Reste à recouvrer: ${totalRemainingCredit.toLocaleString('fr-FR')} FCFA`, 20, 104);
    doc.text(`Transactions: ${monthSales.length}`, 20, 112);

    const products = DB.get('products');
    const stockVal = products.reduce((acc, p) => acc + (p.stockQuantity * p.purchasePrice), 0);
    const stockSaleVal = products.reduce((acc, p) => acc + (p.stockQuantity * p.salePrice), 0);
    const profitEstime = stockSaleVal - stockVal;
    doc.text(`Valeur d'achat (Coût stock): ${stockVal.toLocaleString('fr-FR')} FCFA`, 115, 88);
    doc.text(`Valeur vente estimée: ${stockSaleVal.toLocaleString('fr-FR')} FCFA`, 115, 96);
    doc.text(`Bénéfice estimé: +${profitEstime.toLocaleString('fr-FR')} FCFA`, 115, 104);
    const margePct = stockVal > 0 ? ((profitEstime / stockVal) * 100).toFixed(1) : 0;
    doc.text(`Taux de marge estimé: ${margePct}%`, 115, 112);

    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text("DÉTAIL DES VENTES DU MOIS", 15, 135);
    
    doc.setFillColor(15, 23, 42); doc.rect(15, 141, 180, 10, 'F');
    doc.setFontSize(9); doc.setTextColor(255, 255, 255);
    doc.text("Client / Caissier", 20, 147); doc.text("Date", 70, 147); doc.text("Total", 105, 147); doc.text("Versé", 135, 147); doc.text("Solde dû", 165, 147);

    let y = 158; doc.setFont("helvetica", "normal"); doc.setTextColor(15, 23, 42);
    monthSales.slice(0, 14).forEach(s => {
        const clientName = s.customerName ? `${s.customerName.substring(0, 18)}` : (s.cashierName || 'Vente');
        const remaining = s.remainingAmount || 0;
        const paid = s.amountPaid !== undefined ? s.amountPaid : s.totalAmount;
        doc.text(clientName, 20, y);
        doc.text(new Date(s.createdAt).toLocaleDateString('fr-FR'), 70, y);
        doc.text(`${s.totalAmount.toLocaleString('fr-FR')}`, 105, y);
        doc.text(`${paid.toLocaleString('fr-FR')}`, 135, y);
        doc.text(remaining > 0 ? `${remaining.toLocaleString('fr-FR')} FCFA` : 'Soldé', 165, y);
        doc.setDrawColor(241, 245, 249); doc.setLineWidth(0.5); doc.line(15, y + 3, 195, y + 3);
        y += 9;
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
        passInput.required = false;

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
