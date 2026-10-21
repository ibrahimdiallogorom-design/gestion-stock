/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StockProvider, useStock } from './context/StockContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { MovementsView } from './components/MovementsView';
import { SheetsSyncView } from './components/SheetsSyncView';
import { SuppliersView } from './components/SuppliersView';
import { DesignSystemView } from './components/DesignSystemView';
import { SettingsView } from './components/SettingsView';
import { CashierView } from './components/CashierView';
import { DailyReportsView } from './components/DailyReportsView';
import { DistributionView } from './components/DistributionView';
import { AccountingView } from './components/AccountingView';
import { CatalogView } from './components/CatalogView';
import { SwitchAccountModal } from './components/SwitchAccountModal';
import { InstallAppModal } from './components/InstallAppModal';
import { LoginScreen } from './components/LoginScreen';
import { MovementModal } from './components/MovementModal';
import { ProductModal } from './components/ProductModal';
import { ConfirmModal } from './components/ConfirmModal';
import { DistributionModal } from './components/DistributionModal';
import { MobileMenuDrawer } from './components/MobileMenuDrawer';
import { ViserDrawer } from './components/ViserDrawer';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { THEME_CONFIGS } from './components/ThemeClasses';
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  Truck,
  Settings,
  ShoppingCart,
  Receipt,
  Users,
  Smartphone,
  Layers,
  Target,
  Share2,
  Menu,
} from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    theme,
    activeAppUser,
    openSwitchAccountModal,
    isInstallModalOpen,
    openInstallModal,
    closeInstallModal,
    openMobileMenu,
    openViser,
  } = useStock();
  const currentTheme = THEME_CONFIGS[theme];

  // If user is not authenticated, show Login Screen on ANY device/phone!
  if (!activeAppUser) {
    return <LoginScreen />;
  }

  const isCashier = activeAppUser?.role === 'CASHIER';

  // Strict role guard: Cashiers can NEVER access administration views
  React.useEffect(() => {
    if (isCashier) {
      const adminOnlyTabs = ['distribution', 'suppliers', 'sheets', 'design_system', 'settings', 'accounting'];
      if (adminOnlyTabs.includes(activeTab)) {
        setActiveTab('caisse');
      }
    }
  }, [isCashier, activeTab, setActiveTab]);

  return (
    <div
      data-theme={theme}
      className={`flex h-screen w-screen overflow-hidden ${currentTheme.bodyBg} ${currentTheme.textColor} font-sans antialiased selection:bg-blue-100 selection:text-blue-900 transition-colors duration-200`}
    >
      {/* 256px Workspace Sidebar (Desktop) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Contextual Top Bar */}
        <TopBar />

        {/* Global Offline Mode & Auto-Sync Banner */}
        <OfflineSyncBanner />

        {/* Viewport Content */}
        <main className="flex-1 min-h-0 overflow-y-auto pb-16 md:pb-0">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'inventory' && <InventoryView />}
          {!isCashier && activeTab === 'distribution' && <DistributionView />}
          {activeTab === 'caisse' && <CashierView />}
          {activeTab === 'reports' && <DailyReportsView />}
          {!isCashier && activeTab === 'accounting' && <AccountingView />}
          {activeTab === 'movements' && <MovementsView />}
          {activeTab === 'catalog' && <CatalogView />}
          {!isCashier && activeTab === 'suppliers' && <SuppliersView />}
          {!isCashier && activeTab === 'sheets' && <SheetsSyncView />}
          {!isCashier && activeTab === 'design_system' && <DesignSystemView />}
          {!isCashier && activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (md:hidden) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around z-40 px-2 shadow-xl">
        {isCashier ? (
          <>
            <button
              onClick={() => setActiveTab('caisse')}
              className={`flex flex-col items-center py-1 px-2 text-[11px] font-bold ${
                activeTab === 'caisse' ? 'text-emerald-700 font-black' : 'text-slate-500'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Caisse</span>
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex flex-col items-center py-1 px-2 text-[11px] font-bold ${
                activeTab === 'inventory' ? 'text-blue-600 font-black' : 'text-slate-500'
              }`}
            >
              <Boxes className="w-5 h-5" />
              <span>Mon Stock</span>
            </button>
            {/* Center VISEUR Button (Synchronisation Cloud, Entrées, Sorties) */}
            <button
              type="button"
              onClick={openViser}
              className="flex flex-col items-center justify-center -mt-6 bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl w-14 h-14 shadow-xl shadow-emerald-500/30 active:scale-95 transition-all border-2 border-white cursor-pointer"
              title="Viseur : Synchronisation Cloud, Entrées et Sorties de Stock"
            >
              <Target className="w-6 h-6 text-white" />
              <span className="text-[9px] font-black tracking-tight uppercase">VISEUR</span>
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex flex-col items-center py-1 px-2 text-[11px] font-bold ${
                activeTab === 'catalog' ? 'text-blue-600 font-black' : 'text-slate-500'
              }`}
            >
              <Share2 className="w-5 h-5" />
              <span>Catalogue</span>
            </button>
            <button
              type="button"
              onClick={openMobileMenu}
              className="flex flex-col items-center py-1 px-2 text-[11px] font-bold text-slate-500 hover:text-blue-600"
            >
              <Menu className="w-5 h-5" />
              <span>Menu</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex flex-col items-center py-1 px-2 text-[11px] font-bold ${
                activeTab === 'inventory' ? 'text-blue-600 font-black' : 'text-slate-500'
              }`}
            >
              <Boxes className="w-5 h-5" />
              <span>Stock</span>
            </button>
            <button
              onClick={() => setActiveTab('caisse')}
              className={`flex flex-col items-center py-1 px-2 text-[11px] font-bold ${
                activeTab === 'caisse' ? 'text-emerald-700 font-black' : 'text-slate-500'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Caisse</span>
            </button>
            {/* Center VISEUR Button (Synchronisation Cloud, Entrées, Sorties) */}
            <button
              type="button"
              onClick={openViser}
              className="flex flex-col items-center justify-center -mt-6 bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl w-14 h-14 shadow-xl shadow-emerald-500/30 active:scale-95 transition-all border-2 border-white cursor-pointer"
              title="Viseur : Synchronisation Cloud, Entrées et Sorties de Stock"
            >
              <Target className="w-6 h-6 text-white" />
              <span className="text-[9px] font-black tracking-tight uppercase">VISEUR</span>
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex flex-col items-center py-1 px-2 text-[11px] font-bold ${
                activeTab === 'catalog' ? 'text-blue-600 font-black' : 'text-slate-500'
              }`}
            >
              <Share2 className="w-5 h-5" />
              <span>Catalogue</span>
            </button>
            <button
              type="button"
              onClick={openMobileMenu}
              className="flex flex-col items-center py-1 px-2 text-[11px] font-bold text-slate-500 hover:text-blue-600"
            >
              <Menu className="w-5 h-5" />
              <span>Menu</span>
            </button>
          </>
        )}
      </nav>

      {/* Action Modals */}
      <MovementModal />
      <ProductModal />
      <ConfirmModal />
      <SwitchAccountModal />
      <DistributionModal />
      <InstallAppModal isOpen={isInstallModalOpen} onClose={closeInstallModal} />
      <MobileMenuDrawer />
      <ViserDrawer />
    </div>
  );
};

export default function App() {
  return (
    <StockProvider>
      <AppContent />
    </StockProvider>
  );
}
