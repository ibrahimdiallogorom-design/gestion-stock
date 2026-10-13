# StockFlow — Solution de Gestion de Stock Multi-Produits & Synchronisation Google Sheets

StockFlow est une application web moderne de gestion d'inventaire pour le commerce de détail et les boutiques multi-produits, offrant un suivi précis des niveaux de stock, un journal complet des mouvements (entrées/sorties/ajustements) et une synchronisation bidirectionnelle directe avec Google Sheets.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Décisions confirmées lors du cadrage interactif :**
> - **Secteur & Typologie d'inventaire** : Commerce de détail et boutique multi-produits (gestion par SKU, code-barres, catégories, seuils d'alerte min/max, prix d'achat et prix de vente).
> - **Orientation visuelle & Style** : Interface SaaS claire, nette et professionnelle, articulée autour d'un canevas neutre structuré (blanc et ardoise claire) avec accents bleu cobalt (`#2563EB`) et chiffres tabulaires.
> - **Intégration Google Sheets** : Synchronisation bidirectionnelle directe (lecture des stocks existants, mise à jour des quantités, écriture du journal des mouvements) avec conservation d'un mode local réactif immédiat.
>
> **Point de validation technique :**
> L'intégration Google Sheets nécessitera l'activation OAuth via `set_up_oauth` pour le scope `https://www.googleapis.com/auth/spreadsheets` et `https://www.googleapis.com/auth/drive.file`. L'application intégrera un bouton officiel "Se connecter avec Google", un sélecteur/créateur de feuille de calcul, ainsi qu'un simulateur de données préchargé pour travailler sans interruption dès le premier lancement.

---

### 1. Overview & Core Concept

- **Fonctionnalité principale** : Centraliser l'inventaire des produits (références, désignations, catégories, stocks actuels, stocks minimaux de sécurité, valeurs marchandes), enregistrer chaque transaction de stock (réception fournisseur, vente comptoir, retour, perte/casse) et répercuter ces données en temps réel dans une feuille Google Sheets connectée.
- **Public cible** : Commerçants indépendants, gérants de boutiques, responsables logistiques de points de vente et équipes de vente ayant besoin d'une interface rapide sans friction, accessible sur tablette ou poste fixe.
- **Valeur ajoutée** : Suppression des ruptures imprévues grâce aux alertes visuelles de stock critique, élimination de la double saisie grâce au pont Google Sheets, et transparence totale sur qui a modifié quoi et quand.

---

### 2. User Experience & Visual Design

#### Parcours Utilisateur Clés
1. **Tableau de bord de synthèse (Dashboard)** :
   - Vue immédiate sur la valorisation totale du stock, le nombre de références, les articles en rupture ou sous le seuil critique, et le volume des mouvements du jour.
   - Accès rapide aux actions prioritaires : `+ Nouveau Mouvement` (Entrée / Sortie rapide) et `+ Ajouter un Produit`.
2. **Gestionnaire de Catalogue (Inventaire)** :
   - Grille de données dense haute lisibilité avec recherche instantanée par nom ou SKU, filtres par catégorie et état de stock (Normal, Critique, Rupture, Surstock).
   - Modification rapide en un clic des quantités avec justification obligatoire (Traçabilité).
   - Fiche produit détaillée avec historique des variations de prix et des mouvements associés.
3. **Journal d'Audit & Mouvements (Stock Ledger)** :
   - Liste chronologique inaltérable des entrées, sorties, retours et inventaires physiques.
   - Horodatage précis, opérateur, motif et impact chiffré sur le niveau de stock.
4. **Console de Synchronisation Google Sheets** :
   - État de la connexion Google Workspace (Connecté / Non connecté).
   - Sélecteur de feuille Google Sheets ou bouton de création automatique d'un classeur modèle standardisé.
   - Journal des synchronisations avec indication de la dernière mise à jour et déclencheur manuel de push/pull.

#### Identité Visuelle & Thème (Frontend Design Constitution)
- **Palette chromatique & Règle 60-30-10** :
  - **60% Fond neutre** : Toile immaculée et arrière-plan ultra-épuré (`#F8FAFC` et `#FFFFFF`).
  - **30% Surfaces structurelles** : Lignes de délimitation capillaires 1px (`#E2E8F0`), cartes à simple élévation sans empilement, gris typographique doux (`#64748B` / `#334155`).
  - **10% Accents fonctionnels** : Bleu cobalt professionnel (`#2563EB` / `#1D4ED8`) pour les boutons d'action primaires, vert émeraude pour les entrées de stock (`#16A34A`), ambre pour les alertes de seuil (`#D97706`), et carmin pour les ruptures (`#DC2626`).
- **Discipline typographique & Tabular Numerals** :
  - Titres et navigation : `Plus Jakarta Sans` / `Cabinet Grotesk` (graisses 500 et 600, `text-wrap: balance`).
  - Corps de texte : Sans-serif lisible et net (14px–15px).
  - Données et métriques : `font-mono tabular-nums` pour tous les SKU, quantités, prix et pourcentages afin d'assurer un alignement vertical parfait.
- **Règle Zéro-Pill & Propreté des métadonnées** :
  - Les statuts et métadonnées informatives sont présentés en texte épuré avec séparateurs discrets (`·`), sans bulles bonbons ni pilules décoratives saturées.
  - Seuls les boutons d'onglets et filtres cliquables bénéficient d'un style segmenté fonctionnel.
- **Navigation & Contrat Top Bar** :
  - Navigation latérale (Sidebar 256px) avec accès direct : *Tableau de bord*, *Inventaire*, *Mouvements*, *Fournisseurs*, *Intégration Google Sheets*.
  - En-tête supérieur avec fil d'Ariane contextuel, statut de synchronisation discret et bouton d'action rapide d'entrée/sortie.

---

### 3. Key Product Decisions & Trade-Offs

- **Décision 1 : Architecture hybride Local-First + Google Sheets API**
  - *Choix retenu* : L'application conserve un état local réactif instantané (avec persistance `localStorage` et données d'amorçage réalistes du commerce de détail) tout en se synchronisant avec l'API Google Sheets lorsque l'utilisateur est authentifié.
  - *Pourquoi* : L'interface réagit à 0ms de latence pour les saisies en caisse ou en magasin, même en cas de coupure réseau ou de délai de l'API Google Sheets.
  - *Alternatives écartées* : Tout déléguer à des requêtes distantes bloquantes vers Google Sheets à chaque clic (expérience lente et blocages réseau).

- **Décision 2 : Double onglet dans Google Sheets (Inventaire + Mouvements)**
  - *Choix retenu* : Structurer la feuille connectée en deux onglets distincts : `Produits` (état actuel du catalogue) et `Mouvements` (journal chronologique exhaustif).
  - *Pourquoi* : Permet aux équipes d'utiliser les formules natives d'Excel/Sheets (VLOOKUP, TCD) tout en gardant une source de vérité auditée.
  - *Alternatives écartées* : Onglet unique mélangeant stock instantané et historique (ingérable au-delà de quelques jours).

- **Décision 3 : Protection des opérations destructives**
  - *Choix retenu* : Tout ajustement de stock à la baisse ou suppression de référence nécessite une confirmation explicite dans une modale dédiée avec saisie du motif (Perte, Casse, Erreur de comptage, Vente hors caisse).
  - *Pourquoi* : Empêche toute perte accidentelle de données ou modification arbitraire dans Google Sheets conformément aux règles strictes de sécurité.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        StockFlow Architecture                          │
└────────────────────────────────────────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    ▼                                                               ▼
┌──────────────────────┐                                 ┌──────────────────────┐
│   Interface Client   │                                 │   Google Workspace   │
│   (React + Vite)     │                                 │   Sheets & Auth      │
└──────────┬───────────┘                                 └──────────┬───────────┘
           │                                                        │
    ┌──────┴─────────────────────────────────┐                      │
    ▼                                        ▼                      │
┌──────────────────────┐         ┌──────────────────────┐           │
│ Sidebar & Navigation │         │ Top Bar & Sync Status│           │
└──────────────────────┘         └──────────────────────┘           │
           │                                                        │
    ┌──────┴─────────────────────────────────┐                      │
    ▼                                        ▼                      │
┌──────────────────────┐         ┌──────────────────────┐           │
│ Vues Principales :   │         │ Modales d'Action :   │           │
│ - Dashboard / KPIs   │         │ - Mouvement Entrée   │           │
│ - Catalogue Produits │         │ - Mouvement Sortie   │           │
│ - Journal Mouvements │         │ - Édition / Ajout    │           │
│ - Google Sheets Sync │         │ - Boîte Confirmation │           │
└──────────┬───────────┘         └──────────┬───────────┘           │
           │                                │                       │
           ▼                                ▼                       │
┌───────────────────────────────────────────────────────┐           │
│      Gestionnaire d'État Stock (useStockStore)        │           │
│  - Catalogue Produits (SKU, Stock, Seuil, Prix)       │           │
│  - Grand Livre des Mouvements (Horodatage, Type, Qte) │           │
│  - Mode Démo / Données Locales Réactives             │           │
└──────────────────────────┬────────────────────────────┘           │
                           │                                        │
                           ▼                                        ▼
┌───────────────────────────────────────────────────────────────────────┐
│              Service de Synchronisation Google Sheets                 │
│  - Authentification Firebase Auth (Google Sign-In)                    │
│  - Lecture/Écriture via API REST Google Sheets v4                     │
│  - Synchronisation automatique & manuelle (Push / Pull)               │
└───────────────────────────────────────────────────────────────────────┘
```

#### Modèle de Données Clé
- **`Product`** :
  - `id`: identifiant unique
  - `sku`: code référence article (ex: `PRD-RET-001`)
  - `name`: libellé du produit
  - `category`: catégorie (Vêtements, Électronique, Maison, etc.)
  - `quantity`: stock actuel
  - `minThreshold`: seuil d'alerte critique
  - `costPrice`: prix d'achat HT
  - `salePrice`: prix de vente TTC
  - `supplier`: fournisseur principal
  - `lastUpdated`: horodatage ISO
- **`StockMovement`** :
  - `id`: identifiant du mouvement
  - `productId`: référence produit
  - `productName`: libellé snapshot
  - `type`: `IN` (réception) | `OUT` (vente/départ) | `ADJUSTMENT` (inventaire) | `RETURN` (retour)
  - `quantityDelta`: variation (+/-)
  - `previousStock`: stock avant
  - `newStock`: stock après
  - `reason`: motif documenté
  - `operator`: nom de l'utilisateur ou 'Admin'
  - `createdAt`: horodatage ISO
- **`SheetsSyncConfig`** :
  - `spreadsheetId`: identifiant du document Google Sheets
  - `sheetTitle`: nom du classeur
  - `autoSync`: synchronisation automatique après chaque mouvement
  - `lastSyncedAt`: horodatage du dernier échange réussi

---

### Prochaines Étapes après Validation
Dès que vous aurez validé ce plan :
1. Déclenchement de la configuration OAuth Google Workspace pour Google Sheets (`set_up_oauth`).
2. Implémentation du design system moderne (canevas SaaS, typographie, couleurs, icônes Lucide).
3. Intégration du moteur complet de gestion des stocks et de la synchronisation avec Google Sheets.
