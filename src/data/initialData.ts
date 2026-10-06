import { Product, StockMovement } from '../types';

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_MOVEMENTS: StockMovement[] = [];

export const INITIAL_SUPPLIERS = [
  {
    id: 'sup-001',
    name: 'Textiles d\'Afrique & Import',
    contactName: 'Laurent Mercier',
    email: 'commandes@textiles-afrique.com',
    phone: '+226 25 30 00 00',
    leadTimeDays: 3,
    category: 'Mode & Textile',
    rating: 4.9,
    minOrderAmount: 150000,
  },
  {
    id: 'sup-002',
    name: 'Sonics Electronics',
    contactName: 'Éléonore Chen',
    email: 'b2b@sonics-electronics.com',
    phone: '+226 25 31 00 00',
    leadTimeDays: 2,
    category: 'Électronique & Son',
    rating: 4.8,
    minOrderAmount: 300000,
  },
  {
    id: 'sup-003',
    name: 'Atelier Déco Maison',
    contactName: 'Camille Roche',
    email: 'contact@atelierdecomaison.com',
    phone: '+226 25 32 00 00',
    leadTimeDays: 4,
    category: 'Maison & Déco',
    rating: 4.7,
    minOrderAmount: 100000,
  },
  {
    id: 'sup-004',
    name: 'Laboratoires BioCare',
    contactName: 'Dr. Marc Vasseur',
    email: 'pro@biocare-cosmetics.com',
    phone: '+226 25 33 00 00',
    leadTimeDays: 3,
    category: 'Soins & Beauté',
    rating: 4.9,
    minOrderAmount: 120000,
  },
  {
    id: 'sup-005',
    name: 'Maison des Épices & Thés',
    contactName: 'Amina Belkacem',
    email: 'boutique@maisondesepices.com',
    phone: '+226 25 34 00 00',
    leadTimeDays: 2,
    category: 'Épicerie Fine',
    rating: 4.8,
    minOrderAmount: 75000,
  },
];
