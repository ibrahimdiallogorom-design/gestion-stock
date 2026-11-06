import React, { useMemo, useState } from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Info, ArrowRight, Printer, Download, CheckCircle2 } from 'lucide-react';
import { useStock } from '../context/StockContext';
import { ViewTab } from '../types';

type Severity = 'critique' | 'attention' | 'info';

interface Anomaly {
  id: string;
  severity: Severity;
  module: string;
  title: string;
  item: string; // Produit / ticket / dépense concerné
  found: string; // Valeur trouvée
  expected: string; // Valeur attendue
  advice: string; // Comment corriger
  tab: ViewTab;
}

const fmt = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`;
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};
const isSaleMovement = (m: { type: string; ticketNumber?: string; reason?: string }) =>
  m.type === 'OUT' && (!!m.ticketNumber || (m.reason || '').toLowerCase().includes('vente'));

const SEVERITY_META: Record<Severity, { label: string; color: string; icon: React.ReactNode }> = {
  critique: {
    label: 'Critique',
    color: 'bg-red-50 border-red-300 text-red-800',
    icon: <AlertOctagon className="w-4 h-4 text-red-600" />,
  },
  attention: {
    label: 'À vérifier',
    color: 'bg-amber-50 border-amber-300 text-amber-800',
    icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
  },
  info: {
    label: 'Information',
    color: 'bg-sky-50 border-sky-200 text-sky-800',
    icon: <Info className="w-4 h-4 text-sky-600" />,
  },
};

export const DataAuditView: React.FC = () => {
  const { products, movements, purchases, expenses, appUsers, setActiveTab } = useStock();
  const [filter, setFilter] = useState<'ALL' | Severity>('ALL');

  const anomalies = useMemo<Anomaly[]>(() => {
    const list: Anomaly[] = [];
    const userName = (id: string) => appUsers.find((u) => u.id === id)?.fullName || id;
    const productIds = new Set(products.map((p) => p.id));

    // ───────────── 1. STOCK ─────────────
    products.forEach((p) => {
      const qty = num(p.quantity);
      if (!Number.isFinite(qty) || qty < 0) {
        list.push({
          id: `stk-qty-${p.id}`,
          severity: 'critique',
          module: 'Stock',
          title: 'Quantité invalide (négative ou vide)',
          item: `${p.name} (${p.sku})`,
          found: String(p.quantity),
          expected: '0 ou plus',
          advice: 'Faites un ajustement de stock avec la quantité réellement comptée.',
          tab: 'inventory',
        });
      }

      const dist = p.distributedQuantities || {};
      const totalDist = Object.values(dist).reduce((a, b) => a + (Number(b) || 0), 0);
      if (Number.isFinite(qty) && totalDist > qty) {
        const detail = Object.entries(dist)
          .filter(([, v]) => (Number(v) || 0) > 0)
          .map(([uid, v]) => `${userName(uid)}: ${v}`)
          .join(' · ');
        list.push({
          id: `stk-dist-${p.id}`,
          severity: 'critique',
          module: 'Dotations',
          title: 'Les boutiques détiennent plus que le stock total',
          item: `${p.name} (${p.sku}) — ${detail}`,
          found: `${totalDist} unités dotées`,
          expected: `≤ ${qty} (stock total)`,
          advice:
            'Une sortie manuelle a réduit le stock total sans réduire la dotation. Corrigez la quantité de la boutique dans « Distribution ».',
          tab: 'distribution',
        });
      }
      Object.entries(dist).forEach(([uid, v]) => {
        if ((Number(v) || 0) < 0) {
          list.push({
            id: `stk-distneg-${p.id}-${uid}`,
            severity: 'critique',
            module: 'Dotations',
            title: 'Dotation négative',
            item: `${p.name} — ${userName(uid)}`,
            found: String(v),
            expected: '0 ou plus',
            advice: 'Remettez la quantité de cette boutique à la valeur réelle dans « Distribution ».',
            tab: 'distribution',
          });
        }
      });

      // Écart entre le stock actuel et le dernier mouvement enregistré
      const prodMoves = movements
        .filter((m) => m.productId === p.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const last = prodMoves[0];
      if (last && Number.isFinite(qty) && Number(last.newStock) !== qty) {
        list.push({
          id: `stk-trace-${p.id}`,
          severity: 'attention',
          module: 'Stock',
          title: 'Stock modifié sans mouvement enregistré',
          item: `${p.name} (${p.sku}) — dernier mouvement du ${new Date(last.createdAt).toLocaleDateString('fr-FR')}`,
          found: `${qty} en stock`,
          expected: `${last.newStock} (selon le journal)`,
          advice:
            "La quantité a été changée directement dans la fiche produit. Recomptez l'article et faites un « Ajustement » pour tracer l'écart.",
          tab: 'inventory',
        });
      }

      // ───────────── 2. PRIX ─────────────
      const cost = num(p.costPrice);
      const sale = num(p.salePrice);
      if (!Number.isFinite(sale) || sale <= 0) {
        list.push({
          id: `prx-sale0-${p.id}`,
          severity: 'critique',
          module: 'Prix',
          title: 'Prix de vente manquant ou à zéro',
          item: `${p.name} (${p.sku})`,
          found: String(p.salePrice ?? 'vide'),
          expected: 'Prix de vente > 0',
          advice: 'Ouvrez la fiche produit et saisissez le prix de vente.',
          tab: 'inventory',
        });
      }
      if (!Number.isFinite(cost) || cost <= 0) {
        list.push({
          id: `prx-cost0-${p.id}`,
          severity: 'attention',
          module: 'Prix',
          title: "Prix d'achat manquant ou à zéro (marge faussée)",
          item: `${p.name} (${p.sku})`,
          found: String(p.costPrice ?? 'vide'),
          expected: "Prix d'achat > 0",
          advice: "Saisissez le prix d'achat (ou de revient) dans la fiche produit.",
          tab: 'inventory',
        });
      }
      if (Number.isFinite(cost) && Number.isFinite(sale) && sale > 0 && cost > sale) {
        list.push({
          id: `prx-loss-${p.id}`,
          severity: 'critique',
          module: 'Prix',
          title: "Prix d'achat supérieur au prix de vente (vente à perte)",
          item: `${p.name} (${p.sku})`,
          found: `Achat ${fmt(cost)} > Vente ${fmt(sale)}`,
          expected: 'Prix de vente ≥ prix d’achat',
          advice: 'Vérifiez une inversion des deux prix ou une faute de frappe (zéro en trop).',
          tab: 'inventory',
        });
      }
    });

    // ───────────── 3. VENTES ─────────────
    const tickets = new Map<string, { total: number; acompte?: number; reste?: number; method?: string; date: string }>();
    movements.filter(isSaleMovement).forEach((m) => {
      const qtySold = Math.abs(Number(m.quantityDelta) || 0);
      const prod = products.find((p) => p.id === m.productId);

      if (!productIds.has(m.productId)) {
        list.push({
          id: `vte-orph-${m.id}`,
          severity: 'info',
          module: 'Ventes',
          title: 'Vente d’un produit supprimé',
          item: `${m.productName} — ticket ${m.ticketNumber || m.id.slice(-6)}`,
          found: `${qtySold} vendu(s) · ${fmt(Number(m.saleAmount) || 0)}`,
          expected: 'Produit existant',
          advice: "Le produit a été supprimé après la vente. Le chiffre d'affaires reste correct, mais la marge de cette vente est inconnue.",
          tab: 'movements',
        });
      }

      if (m.saleAmount === undefined || m.saleAmount === null || !Number.isFinite(Number(m.saleAmount))) {
        list.push({
          id: `vte-noamt-${m.id}`,
          severity: 'critique',
          module: 'Ventes',
          title: 'Vente sans montant enregistré',
          item: `${m.productName} — ${new Date(m.createdAt).toLocaleString('fr-FR')}`,
          found: 'Montant vide',
          expected: prod ? fmt(qtySold * prod.salePrice) : 'Montant de la vente',
          advice: 'Ancienne vente : le montant est maintenant estimé au prix de vente actuel. Vérifiez avec le ticket papier.',
          tab: 'reports',
        });
      } else if (prod && Number(prod.salePrice) > 0) {
        const expected = qtySold * Number(prod.salePrice);
        const diff = Number(m.saleAmount) - expected;
        if (Math.abs(diff) >= 1) {
          list.push({
            id: `vte-diff-${m.id}`,
            severity: 'info',
            module: 'Ventes',
            title: 'Montant vendu différent du prix actuel',
            item: `${m.productName} × ${qtySold} — ticket ${m.ticketNumber || '-'} du ${new Date(m.createdAt).toLocaleDateString('fr-FR')}`,
            found: fmt(Number(m.saleAmount)),
            expected: `${fmt(expected)} (${qtySold} × ${fmt(prod.salePrice)})`,
            advice: 'Normal si le prix a changé depuis ou si une remise a été faite. Sinon, erreur de prix au moment de la vente.',
            tab: 'reports',
          });
        }
      }

      const tId = m.ticketNumber || m.id;
      const t = tickets.get(tId) || { total: 0, date: m.createdAt, method: m.paymentMethod };
      t.total += Number(m.saleAmount) || 0;
      if (m.acompteAmount !== undefined) t.acompte = Number(m.acompteAmount) || 0;
      if (m.remainingAmount !== undefined) t.reste = Number(m.remainingAmount) || 0;
      tickets.set(tId, t);
    });

    tickets.forEach((t, tId) => {
      if (t.method === 'ACOMPTE' && t.acompte !== undefined && t.reste !== undefined) {
        const sum = t.acompte + t.reste;
        if (Math.abs(sum - t.total) >= 1) {
          list.push({
            id: `vte-acpt-${tId}`,
            severity: 'critique',
            module: 'Ventes',
            title: 'Acompte + Reste ≠ Total du ticket',
            item: `Ticket ${tId} du ${new Date(t.date).toLocaleDateString('fr-FR')}`,
            found: `${fmt(t.acompte)} + ${fmt(t.reste)} = ${fmt(sum)}`,
            expected: fmt(t.total),
            advice: 'Le reste à payer du client est faux. Vérifiez la somme réellement versée.',
            tab: 'reports',
          });
        }
      }
    });

    const manualOuts = movements.filter((m) => m.type === 'OUT' && !isSaleMovement(m));
    if (manualOuts.length > 0) {
      const units = manualOuts.reduce((a, m) => a + Math.abs(Number(m.quantityDelta) || 0), 0);
      list.push({
        id: 'vte-manual-outs',
        severity: 'info',
        module: 'Comptabilité',
        title: 'Sorties de stock hors vente (pertes, casse, retraits)',
        item: `${manualOuts.length} sortie(s) manuelle(s)`,
        found: `${units} unités sorties`,
        expected: 'Non comptées comme ventes',
        advice:
          "Avant cette correction, la comptabilité les comptait comme des ventes à 0 F (marge négative). Elles ne faussent plus le bénéfice.",
        tab: 'movements',
      });
    }

    // ───────────── 4. ACHATS ─────────────
    purchases.forEach((b) => {
      const goods = Number(b.purchasePriceTotal) || 0;
      const ship = Number(b.shippingCost) || 0;
      const paid = Number(b.totalCostPaid) || 0;
      const qty = Math.max(1, Number(b.quantityBought) || 1);
      if (Math.abs(goods + ship - paid) >= 1) {
        list.push({
          id: `ach-total-${b.id}`,
          severity: 'critique',
          module: 'Achats',
          title: 'Total décaissé ≠ Marchandise + Transport',
          item: `${b.productName} du ${b.date}`,
          found: fmt(paid),
          expected: `${fmt(goods)} + ${fmt(ship)} = ${fmt(goods + ship)}`,
          advice: "Supprimez et ressaisissez cet achat avec les bons montants.",
          tab: 'accounting',
        });
      }
      const expectedUnit = (goods + ship) / qty;
      if (Math.abs((Number(b.unitCostPrice) || 0) - expectedUnit) > 1) {
        list.push({
          id: `ach-unit-${b.id}`,
          severity: 'attention',
          module: 'Achats',
          title: 'Prix de revient unitaire incorrect',
          item: `${b.productName} du ${b.date} (${qty} unités)`,
          found: fmt(Number(b.unitCostPrice) || 0),
          expected: fmt(expectedUnit),
          advice: "Vérifiez la quantité achetée saisie.",
          tab: 'accounting',
        });
      }
      if (b.productId && !productIds.has(b.productId)) {
        list.push({
          id: `ach-orph-${b.id}`,
          severity: 'info',
          module: 'Achats',
          title: 'Achat lié à un produit supprimé',
          item: `${b.productName} du ${b.date}`,
          found: 'Produit introuvable',
          expected: 'Produit existant',
          advice: "Sans conséquence sur la trésorerie ; à supprimer si c'était une erreur.",
          tab: 'accounting',
        });
      }
    });

    // ───────────── 5. DÉPENSES ─────────────
    const seen = new Map<string, string>();
    expenses.forEach((e) => {
      const amt = num(e.amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        list.push({
          id: `dep-amt-${e.id}`,
          severity: 'critique',
          module: 'Dépenses',
          title: 'Dépense avec montant nul ou invalide',
          item: `${e.description} (${e.date})`,
          found: String(e.amount),
          expected: 'Montant > 0',
          advice: 'Supprimez puis ressaisissez la dépense.',
          tab: 'accounting',
        });
      }
      const key = `${e.date}|${e.category}|${amt}|${(e.description || '').trim().toLowerCase()}`;
      if (seen.has(key)) {
        list.push({
          id: `dep-dup-${e.id}`,
          severity: 'attention',
          module: 'Dépenses',
          title: 'Dépense saisie en double (probable)',
          item: `${e.description} (${e.date})`,
          found: `${fmt(amt)} enregistré 2 fois`,
          expected: '1 seule fois',
          advice: 'Si c’est un doublon, supprimez une des deux lignes dans Comptabilité > Dépenses.',
          tab: 'accounting',
        });
      } else {
        seen.set(key, e.id);
      }
    });

    const order: Record<Severity, number> = { critique: 0, attention: 1, info: 2 };
    return list.sort((a, b) => order[a.severity] - order[b.severity] || a.module.localeCompare(b.module));
  }, [products, movements, purchases, expenses, appUsers]);

  const counts = useMemo(
    () => ({
      critique: anomalies.filter((a) => a.severity === 'critique').length,
      attention: anomalies.filter((a) => a.severity === 'attention').length,
      info: anomalies.filter((a) => a.severity === 'info').length,
    }),
    [anomalies]
  );

  const visible = filter === 'ALL' ? anomalies : anomalies.filter((a) => a.severity === filter);

  const exportCsv = () => {
    const rows = [
      ['Gravité', 'Module', 'Problème', 'Élément', 'Trouvé', 'Attendu', 'Correction'],
      ...anomalies.map((a) => [SEVERITY_META[a.severity].label, a.module, a.title, a.item, a.found, a.expected, a.advice]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `controle_chiffres_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100">
            <ShieldCheck className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Contrôle des chiffres</h1>
            <p className="text-sm text-slate-500">
              Liste uniquement les chiffres qui ne concordent pas — corrigez-les un par un, sans tout reprendre à zéro.
            </p>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
          >
            <Download className="w-4 h-4" /> Excel (CSV)
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-700"
          >
            <Printer className="w-4 h-4" /> Imprimer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
        {(
          [
            ['ALL', 'Tout', anomalies.length, 'border-slate-300 bg-white text-slate-800'],
            ['critique', 'Critiques', counts.critique, SEVERITY_META.critique.color],
            ['attention', 'À vérifier', counts.attention, SEVERITY_META.attention.color],
            ['info', 'Informations', counts.info, SEVERITY_META.info.color],
          ] as const
        ).map(([key, label, count, color]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`p-3 rounded-xl border-2 text-left transition ${color} ${
              filter === key ? 'ring-2 ring-offset-1 ring-slate-900' : ''
            }`}
          >
            <div className="text-2xl font-black">{count}</div>
            <div className="text-xs font-semibold uppercase tracking-wide">{label}</div>
          </button>
        ))}
      </div>

      {anomalies.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-10 rounded-2xl border-2 border-emerald-300 bg-emerald-50 text-emerald-800">
          <CheckCircle2 className="w-10 h-10" />
          <div className="font-bold text-lg">Tous les chiffres concordent</div>
          <div className="text-sm">Aucune incohérence détectée dans le stock, les prix, les ventes, les achats et les dépenses.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((a, i) => {
            const meta = SEVERITY_META[a.severity];
            return (
              <div key={a.id} className={`rounded-xl border p-4 ${meta.color} break-inside-avoid`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="mt-0.5">{meta.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase tracking-wide opacity-80">
                        #{i + 1} · {a.module} · {meta.label}
                      </div>
                      <div className="font-bold text-slate-900">{a.title}</div>
                      <div className="text-sm text-slate-700 break-words">{a.item}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab(a.tab)}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white border border-current hover:bg-slate-50 print:hidden"
                  >
                    Corriger <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-white/80 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase text-red-600">Trouvé</div>
                    <div className="font-mono font-bold text-slate-900">{a.found}</div>
                  </div>
                  <div className="rounded-lg bg-white/80 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase text-emerald-700">Attendu</div>
                    <div className="font-mono font-bold text-slate-900">{a.expected}</div>
                  </div>
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  <span className="font-semibold">👉 Correction : </span>
                  {a.advice}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
