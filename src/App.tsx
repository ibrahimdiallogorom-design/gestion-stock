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
import { SwitchAccountModal } from './components/SwitchAccountModal';
import { InstallAppModal } from './components/InstallAppModal';
import { LoginScreen } from './components/LoginScreen';
import { MovementModal } from './components/MovementModal';
import { ProductModal } from './components/ProductModal';
import { ConfirmModal } from './components/ConfirmModal';
import { DistributionModal } from './components/DistributionModal';
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
      const adminOnlyTabs = ['distribution', 'suppliers', 'sheets', 'design_system', 'settings'];
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

        {/* Viewport Content */}
        <main className="flex-1 min-h-0 overflow-y-auto pb-16 md:pb-0">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'inventory' && <InventoryView />}
          {!isCashier && activeTab === 'distribution' && <DistributionView />}
          {activeTab === 'caisse' && <CashierView />}
          {activeTab === 'reports' && <DailyReportsView />}
          {activeTab === 'movements' && <MovementsView />}
          {!isCashier && activeTab === 'suppliers' && <SuppliersView />}
          {!isCashier && activeTab === 'sheets' && <SheetsSyncView />}
          {!isCashier && activeTab === 'design_system' && <DesignSystemView />}
          {!isCashier && activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (md:hidden) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-slate-200 flex items-center justify-around z-40 px-1 shadow-lg">
        {isCashier ? (
          <>
            <button
              onClick={() => setActiveTab('caisse')}
              className={`flex flex-col items-center py-1 px-1.5 text-[10px] ${
                activeTab === 'caisse' ? 'text-emerald-700 font-bold' : 'text-slate-500'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Caisse</span>
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex flex-col items-center py-1 px-1.5 text-[10px] ${
                activeTab === 'inventory' ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Mon Stock</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex flex-col items-center py-1 px-1.5 text-[10px] ${
                activeTab === 'reports' ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Mes Rapports</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center py-1 px-1.5 text-[10px] ${
                activeTab === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Accueil</span>
            </button>
            <button
              onClick={openSwitchAccountModal}
              className="flex flex-col items-center py-1 px-1.5 text-[10px] text-blue-600 hover:text-blue-700 font-semibold"
            >
              <Users className="w-4 h-4" />
              <span>Compte</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center py-1 px-1.5 text-[10px] ${
                activeTab === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Accueil</span>
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex flex-col items-center py-1 px-1.5 text-[10px] ${
                activeTab === 'inventory' ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Stocks</span>
            </button>
            <button
              onClick={() => setActiveTab('caisse')}
              className={`flex flex-col items-center py-1 px-1.5 text-[10px] ${
                activeTab === 'caisse' ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Caisse</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex flex-col items-center py-1 px-1.5 text-[10px] ${
                activeTab === 'reports' ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Rapports</span>
            </button>
            <button
              onClick={openSwitchAccountModal}
              className="flex flex-col items-center py-1 px-1.5 text-[10px] text-blue-600 hover:text-blue-700 font-semibold"
            >
              <Users className="w-4 h-4" />
              <span>Compte</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center py-1 px-1.5 text-[10px] ${
                activeTab === 'settings' ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Paramètres</span>
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
