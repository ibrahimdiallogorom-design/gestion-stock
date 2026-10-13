import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const config = {
  apiKey: 'AIzaSyBb-wxxD_oga11Jj8eM6lrw7K3n7p4MwAQ',
  authDomain: 'gestion-de-stock-c36d1.firebaseapp.com',
  projectId: 'gestion-de-stock-c36d1',
  storageBucket: 'gestion-de-stock-c36d1.firebasestorage.app',
  messagingSenderId: '715879939275',
  appId: '1:715879939275:web:cd513174f4624d0dc66f4e',
};

const app = initializeApp(config, 'check-db');
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  await signInWithEmailAndPassword(auth, 'admin@boutiquevisiontech.bf', 'admin1234');
  console.log('Firebase Auth OK');
  const d = await getDoc(doc(db, 'stores', 'visiontech-main'));
  if (d.exists()) {
    const data = d.data();
    console.log('=== USERS IN FIRESTORE ===');
    console.log(JSON.stringify(data.appUsers, null, 2));
    console.log('=== PRODUCTS IN FIRESTORE ===');
    console.log('Count:', data.products?.length);
    console.log('Sample:', JSON.stringify(data.products?.slice(0, 3), null, 2));
  } else {
    console.log('Doc does not exist!');
  }
}

main().catch(console.error);
