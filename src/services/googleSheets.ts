import { Product, StockMovement } from '../types';

export const extractSpreadsheetId = (urlOrId: string): string => {
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
};

export const createSpreadsheetWithTemplate = async (
  title: string,
  accessToken: string
): Promise<{ id: string; url: string }> => {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title || 'StockFlow - Inventaire & Mouvements',
      },
      sheets: [
        {
          properties: {
            title: 'Produits',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            title: 'Mouvements',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message ||
        `Échec de la création de la feuille Google Sheets (${response.status})`
    );
  }

  const result = await response.json();
  const spreadsheetId = result.spreadsheetId;
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return { id: spreadsheetId, url };
};

export const pushDataToSheets = async (
  spreadsheetId: string,
  products: Product[],
  movements: StockMovement[],
  accessToken: string
): Promise<void> => {
  // 1. Prepare 'Produits' sheet data
  const productHeaders = [
    'ID Produit',
    'Code SKU',
    'Nom Article',
    'Catégorie',
    'Quantité en Stock',
    'Seuil Minimum',
    'Prix Achat HT (€)',
    'Prix Vente TTC (€)',
    'Fournisseur',
    'Emplacement',
    'Dernière MàJ',
  ];

  const productRows = products.map((p) => [
    p.id,
    p.sku,
    p.name,
    p.category,
    p.quantity,
    p.minThreshold,
    p.costPrice,
    p.salePrice,
    p.supplier,
    p.location || 'Magasin central',
    new Date(p.lastUpdated).toLocaleString('fr-FR'),
  ]);

  // 2. Prepare 'Mouvements' sheet data
  const movementHeaders = [
    'ID Mouvement',
    'Date & Heure',
    'Code SKU',
    'Nom Produit',
    'Type',
    'Variation',
    'Stock Précédent',
    'Nouveau Stock',
    'Motif',
    'Opérateur',
    'Notes',
  ];

  const movementRows = movements.map((m) => [
    m.id,
    new Date(m.createdAt).toLocaleString('fr-FR'),
    m.productSku,
    m.productName,
    m.type === 'IN'
      ? 'Entrée'
      : m.type === 'OUT'
      ? 'Sortie'
      : m.type === 'RETURN'
      ? 'Retour'
      : 'Ajustement',
    m.quantityDelta > 0 ? `+${m.quantityDelta}` : `${m.quantityDelta}`,
    m.previousStock,
    m.newStock,
    m.reason,
    m.operator,
    m.notes || '',
  ]);

  // 3. Batch update values
  const batchData = [
    {
      range: 'Produits!A1:K',
      values: [productHeaders, ...productRows],
    },
    {
      range: 'Mouvements!A1:K',
      values: [movementHeaders, ...movementRows],
    },
  ];

  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData,
      }),
    }
  );

  if (!updateResponse.ok) {
    const errorData = await updateResponse.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message ||
        `Erreur lors de la mise à jour des données dans Google Sheets (${updateResponse.status})`
    );
  }
};

export const pullDataFromSheets = async (
  spreadsheetId: string,
  accessToken: string
): Promise<{ products: Product[]; movements?: StockMovement[] }> => {
  // Read Products tab
  const productsResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Produits!A1:K`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!productsResponse.ok) {
    const errorData = await productsResponse.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message ||
        `Impossible de lire l'onglet 'Produits' de la feuille (${productsResponse.status})`
    );
  }

  const prodData = await productsResponse.json();
  const prodRows: any[][] = prodData.values || [];

  if (prodRows.length <= 1) {
    throw new Error("L'onglet 'Produits' ne contient aucune donnée à importer.");
  }

  // Skip header row
  const parsedProducts: Product[] = prodRows.slice(1).map((row, index) => {
    return {
      id: row[0] || `prod-${Date.now()}-${index}`,
      sku: row[1] || `SKU-${1000 + index}`,
      name: row[2] || `Article sans nom ${index + 1}`,
      category: row[3] || 'Général',
      quantity: Number(row[4]) || 0,
      minThreshold: Number(row[5]) || 5,
      costPrice: Number(row[6]) || 0,
      salePrice: Number(row[7]) || 0,
      supplier: row[8] || 'Fournisseur direct',
      location: row[9] || 'Rayon principal',
      lastUpdated: new Date().toISOString(),
    };
  });

  return { products: parsedProducts };
};
