import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

const config = {
  apiKey: 'AIzaSyBb-wxxD_oga11Jj8eM6lrw7K3n7p4MwAQ',
  authDomain: 'gestion-de-stock-c36d1.firebaseapp.com',
  projectId: 'gestion-de-stock-c36d1',
  storageBucket: 'gestion-de-stock-c36d1.firebasestorage.app',
  messagingSenderId: '715879939275',
  appId: '1:715879939275:web:cd513174f4624d0dc66f4e',
};

const app = initializeApp(config, 'migrate-db');
const auth = getAuth(app);
const db = getFirestore(app);

const FICTITIOUS_IDS = new Set(['user-caissier-1', 'user-caissier-2', 'user-caissier-3']);
const FICTITIOUS_USERNAMES = new Set(['caissier', 'caisse_ouaga', 'caisse_gorom']);

async function run() {
  await signInWithEmailAndPassword(auth, 'admin@boutiquevisiontech.bf', 'admin1234');
  console.log('Auth OK');
  const docRef = doc(db, 'stores', 'visiontech-main');
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    console.error('Document does not exist');
    return;
  }
  const data = snap.data();

  // 1. Sanitize appUsers
  const rawUsers = data.appUsers || [];
  const sanitizedUsers = rawUsers
    .filter((u: any) => !FICTITIOUS_IDS.has(u.id) && !FICTITIOUS_USERNAMES.has((u.username || '').toLowerCase()))
    .map((u: any) => {
      if (u.id === 'user-admin') {
        return {
          ...u,
          storeName: 'Boutique Moussa Vision',
        };
      }
      if (u.id === 'user-caissier-moussa' || (u.username || '').toLowerCase() === 'moussavision') {
        return {
          ...u,
          id: 'user-caissier-moussa',
          username: 'Moussavision',
          fullName: 'Moussa Vision (Caissier)',
          storeName: 'Boutique Moussa Vision',
          role: 'CASHIER',
        };
      }
      return u;
    });

  // Ensure Moussa Vision exists
  if (!sanitizedUsers.some((u: any) => (u.username || '').toLowerCase() === 'moussavision')) {
    sanitizedUsers.push({
      id: 'user-caissier-moussa',
      username: 'Moussavision',
      fullName: 'Moussa Vision (Caissier)',
      role: 'CASHIER',
      password: '1234',
      storeName: 'Boutique Moussa Vision',
      createdAt: '2026-01-01T00:00:00Z',
    });
  }

  console.log('Sanitized Users:', sanitizedUsers);

  // 2. Sanitize Products & Transfer user-caissier-1 distributed goods to user-caissier-moussa
  const rawProducts = data.products || [];
  const sanitizedProducts = rawProducts.map((p: any) => {
    const dist = { ...(p.distributedQuantities || {}) };
    
    // Transfer from user-caissier-1 to user-caissier-moussa
    const oldQty = dist['user-caissier-1'] || 0;
    if (oldQty > 0) {
      dist['user-caissier-moussa'] = (dist['user-caissier-moussa'] || 0) + oldQty;
    }

    // Delete fictitious accounts
    delete dist['user-caissier-1'];
    delete dist['user-caissier-2'];
    delete dist['user-caissier-3'];

    const sumDist = Object.values(dist).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
    const totalQty = Math.max(0, Number(p.quantity) || 0);
    const centralQty = Math.max(0, totalQty - sumDist);

    return {
      ...p,
      quantity: totalQty,
      centralQuantity: centralQty,
      distributedQuantities: dist,
    };
  });

  console.log('Sample updated products with Moussa distribution:');
  console.log(sanitizedProducts.filter((p: any) => (p.distributedQuantities?.['user-caissier-moussa'] || 0) > 0).map((p: any) => ({
    name: p.name,
    sku: p.sku,
    centralQuantity: p.centralQuantity,
    moussaQty: p.distributedQuantities?.['user-caissier-moussa']
  })));

  // 3. Write back to Firestore
  await updateDoc(docRef, {
    appUsers: sanitizedUsers,
    products: sanitizedProducts,
    cashierName: 'Moussa Vision',
    storeName: 'Boutique Moussa Vision',
    updatedAt: new Date().toISOString(),
  });

  console.log('SUCCESSFULLY MIGRATED CLOUD FIRESTORE!');
}

run().catch(console.error);
