import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Package, 
  LayoutDashboard, 
  History, 
  AlertTriangle, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Edit, 
  Trash2, 
  Copy, 
  LogOut, 
  Boxes, 
  TrendingUp, 
  DollarSign, 
  Filter, 
  RefreshCw,
  CheckCircle2,
  X,
  UserCheck,
  Building2,
  MapPin,
  Layers,
  FileText,
  Download,
  Scale
} from 'lucide-react';

// ==========================================
// FIREBASE INITIALIZATION
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "demo-api-key",
      authDomain: "demo-app.firebaseapp.com",
      projectId: "demo-app",
      storageBucket: "demo-app.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:demo"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-inventory-app';

// Helper for BRL Currency Formatting
const formatBRL = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

// Helper for Number Formatting (supports integers and decimals gracefully)
const formatQty = (value, unit = '') => {
  const num = Number(value) || 0;
  const formatted = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(num);
  return unit ? `${formatted} ${unit}` : formatted;
};

export default function App() {
  // Auth State
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App Navigation
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'inventory', 'history'

  // Data State
  const [materials, setMaterials] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'quantity', 'value'

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementTarget, setMovementTarget] = useState(null); // item object
  const [movementType, setMovementType] = useState('IN'); // 'IN' or 'OUT'
  const [movementQty, setMovementQty] = useState(1);
  const [movementReason, setMovementReason] = useState('');
  const [movementRequester, setMovementRequester] = useState('');

  // Item Form State
  const [formState, setFormState] = useState({
    name: '',
    code: '',
    category: 'Geral',
    unit: 'un',
    customUnit: '',
    quantity: 0,
    minStock: 5,
    unitPrice: 0,
    location: '',
    notes: ''
  });

  // Default Categories & Preset Units
  const categories = ['Todas', 'Geral', 'Escritório', 'Manutenção', 'Produção', 'TI / Eletrônicos', 'Insumos'];
  const presetUnits = [
    { label: 'Unidade (un)', value: 'un' },
    { label: 'Metro (m)', value: 'm' },
    { label: 'Metro Quadrado (m²)', value: 'm²' },
    { label: 'Metro Cúbico (m³)', value: 'm³' },
    { label: 'Quilograma (kg)', value: 'kg' },
    { label: 'Grama (g)', value: 'g' },
    { label: 'Tonelada (t)', value: 't' },
    { label: 'Litro (L)', value: 'L' },
    { label: 'Mililitro (mL)', value: 'mL' },
    { label: 'Caixa (cx)', value: 'cx' },
    { label: 'Pacote (pct)', value: 'pct' },
    { label: 'Par (pr)', value: 'pr' },
    { label: 'Outro (Personalizado)', value: 'CUSTOM' }
  ];

  // ==========================================
  // AUTHENTICATION EFFECT
  // ==========================================
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Erro na autenticação:", err);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ==========================================
  // FIRESTORE REAL-TIME LISTENERS
  // ==========================================
  useEffect(() => {
    if (!user) return;

    setLoadingData(true);

    // Fetch Materials Collection
    const materialsRef = collection(db, 'artifacts', appId, 'public', 'data', 'materials');
    const unsubscribeMaterials = onSnapshot(
      materialsRef,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setMaterials(docs);
        setLoadingData(false);
      },
      (error) => {
        console.error("Erro ao carregar materiais:", error);
        setLoadingData(false);
      }
    );

    // Fetch Movements Log Collection
    const movementsRef = collection(db, 'artifacts', appId, 'public', 'data', 'movements');
    const unsubscribeMovements = onSnapshot(
      movementsRef,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort by timestamp desc locally
        docs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setMovements(docs);
      },
      (error) => {
        console.error("Erro ao carregar histórico:", error);
      }
    );

    return () => {
      unsubscribeMaterials();
      unsubscribeMovements();
    };
  }, [user]);

  // ==========================================
  // HANDLERS & LOGIC
  // ==========================================

  // Open modal for new item or edit
  const handleOpenItemModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      const isKnownUnit = presetUnits.some(u => u.value === item.unit);
      setFormState({
        name: item.name || '',
        code: item.code || '',
        category: item.category || 'Geral',
        unit: isKnownUnit ? (item.unit || 'un') : 'CUSTOM',
        customUnit: isKnownUnit ? '' : (item.unit || ''),
        quantity: item.quantity ?? 0,
        minStock: item.minStock ?? 0,
        unitPrice: item.unitPrice ?? 0,
        location: item.location || '',
        notes: item.notes || ''
      });
    } else {
      setEditingItem(null);
      setFormState({
        name: '',
        code: `COD-${Math.floor(1000 + Math.random() * 9000)}`,
        category: 'Geral',
        unit: 'un',
        customUnit: '',
        quantity: 0,
        minStock: 5,
        unitPrice: 0,
        location: 'Almoxarifado Principal',
        notes: ''
      });
    }
    setIsItemModalOpen(true);
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!user) return;

    const finalUnit = formState.unit === 'CUSTOM' ? formState.customUnit.trim() || 'un' : formState.unit;

    try {
      const payload = {
        name: formState.name,
        code: formState.code,
        category: formState.category,
        unit: finalUnit,
        quantity: Number(formState.quantity),
        minStock: Number(formState.minStock),
        unitPrice: Number(formState.unitPrice),
        location: formState.location,
        notes: formState.notes,
        updatedAt: serverTimestamp()
      };

      if (editingItem) {
        // Update
        const itemRef = doc(db, 'artifacts', appId, 'public', 'data', 'materials', editingItem.id);
        await updateDoc(itemRef, payload);
      } else {
        // Create
        payload.createdAt = serverTimestamp();
        const materialsRef = collection(db, 'artifacts', appId, 'public', 'data', 'materials');
        await addDoc(materialsRef, payload);
      }

      setIsItemModalOpen(false);
    } catch (err) {
      console.error("Erro ao salvar material:", err);
      alert("Ocorreu um erro ao salvar o item. Tente novamente.");
    }
  };

  // Duplicate Item
  const handleDuplicateItem = (item) => {
    setEditingItem(null);
    const isKnownUnit = presetUnits.some(u => u.value === item.unit);
    setFormState({
      name: `${item.name} (Cópia)`,
      code: `COD-${Math.floor(1000 + Math.random() * 9000)}`,
      category: item.category || 'Geral',
      unit: isKnownUnit ? (item.unit || 'un') : 'CUSTOM',
      customUnit: isKnownUnit ? '' : (item.unit || ''),
      quantity: 0,
      minStock: item.minStock ?? 5,
      unitPrice: item.unitPrice ?? 0,
      location: item.location || '',
      notes: item.notes || ''
    });
    setIsItemModalOpen(true);
  };

  // Delete Item
  const handleDeleteItem = async (id, name) => {
    if (!window.confirm(`Tem certeza que deseja excluir o material "${name}"?`)) return;
    if (!user) return;

    try {
      const itemRef = doc(db, 'artifacts', appId, 'public', 'data', 'materials', id);
      await deleteDoc(itemRef);
    } catch (err) {
      console.error("Erro ao excluir item:", err);
    }
  };

  // Open Quick Movement Modal
  const handleOpenMovementModal = (item, type = 'IN') => {
    setMovementTarget(item);
    setMovementType(type);
    setMovementQty(1);
    setMovementReason(type === 'IN' ? 'Reposição de estoque' : 'Uso interno / Baixa');
    setMovementRequester('');
    setIsMovementModalOpen(true);
  };

  // Process Stock In / Stock Out
  const handleProcessMovement = async (e) => {
    e.preventDefault();
    if (!user || !movementTarget) return;

    const qtyNumber = Number(movementQty);
    if (isNaN(qtyNumber) || qtyNumber <= 0) {
      alert("A quantidade deve ser um número maior que zero.");
      return;
    }

    if (movementType === 'OUT' && movementTarget.quantity < qtyNumber) {
      if (!window.confirm(`A quantidade de saída (${formatQty(qtyNumber, movementTarget.unit)}) é maior do que o estoque disponível (${formatQty(movementTarget.quantity, movementTarget.unit)}). Deseja continuar assim mesmo?`)) {
        return;
      }
    }

    try {
      const newQuantity = movementType === 'IN' 
        ? Number(movementTarget.quantity) + qtyNumber 
        : Number(movementTarget.quantity) - qtyNumber;

      // 1. Update Material Quantity
      const itemRef = doc(db, 'artifacts', appId, 'public', 'data', 'materials', movementTarget.id);
      await updateDoc(itemRef, {
        quantity: newQuantity,
        updatedAt: serverTimestamp()
      });

      // 2. Add Transaction to Movement Log
      const movementsRef = collection(db, 'artifacts', appId, 'public', 'data', 'movements');
      await addDoc(movementsRef, {
        materialId: movementTarget.id,
        materialName: movementTarget.name,
        materialCode: movementTarget.code,
        materialUnit: movementTarget.unit || 'un',
        type: movementType,
        quantity: qtyNumber,
        previousQuantity: movementTarget.quantity,
        newQuantity: newQuantity,
        reason: movementReason || 'Sem observações',
        requester: movementRequester || 'Não informado',
        userId: user.uid,
        userName: user.isAnonymous ? 'Usuário Conectado' : (user.email || 'Usuário'),
        timestamp: serverTimestamp()
      });

      setIsMovementModalOpen(false);
    } catch (err) {
      console.error("Erro ao processar movimentação:", err);
      alert("Erro ao registrar a movimentação.");
    }
  };

  // Export Inventory to CSV
  const handleExportCSV = () => {
    if (filteredMaterials.length === 0) {
      alert("Nenhum material para exportar.");
      return;
    }

    const headers = ["Codigo", "Nome", "Categoria", "Unidade", "Quantidade", "Estoque Minimo", "Preco Unitario (R$)", "Valor Total (R$)", "Localizacao"];
    const rows = filteredMaterials.map((m) => [
      `"${m.code || ''}"`,
      `"${(m.name || '').replace(/"/g, '""')}"`,
      `"${m.category || 'Geral'}"`,
      `"${m.unit || 'un'}"`,
      m.quantity,
      m.minStock,
      m.unitPrice || 0,
      (Number(m.quantity) * Number(m.unitPrice || 0)).toFixed(2),
      `"${(m.location || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inventario_estoque_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================
  // COMPUTED STATS & FILTERED LISTS
  // ==========================================

  // Dashboard Aggregates
  const stats = useMemo(() => {
    let totalItems = materials.length;
    let totalStockUnits = 0;
    let totalValue = 0;
    let lowStockCount = 0;

    materials.forEach((m) => {
      const qty = Number(m.quantity) || 0;
      const price = Number(m.unitPrice) || 0;
      const min = Number(m.minStock) || 0;

      totalStockUnits += qty;
      totalValue += qty * price;

      if (qty <= min) {
        lowStockCount++;
      }
    });

    return {
      totalItems,
      totalStockUnits,
      totalValue,
      lowStockCount
    };
  }, [materials]);

  // Filtered and Sorted Materials List
  const filteredMaterials = useMemo(() => {
    return materials
      .filter((item) => {
        // Search Filter
        const query = searchTerm.toLowerCase();
        const matchesSearch = 
          (item.name || '').toLowerCase().includes(query) ||
          (item.code || '').toLowerCase().includes(query) ||
          (item.category || '').toLowerCase().includes(query) ||
          (item.unit || '').toLowerCase().includes(query) ||
          (item.location || '').toLowerCase().includes(query);

        // Category Filter
        const matchesCategory = selectedCategory === 'Todas' || item.category === selectedCategory;

        // Low Stock Filter
        const matchesLowStock = !onlyLowStock || (Number(item.quantity) <= Number(item.minStock));

        return matchesSearch && matchesCategory && matchesLowStock;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'quantity') return (b.quantity || 0) - (a.quantity || 0);
        if (sortBy === 'value') return ((b.quantity || 0) * (b.unitPrice || 0)) - ((a.quantity || 0) * (a.unitPrice || 0));
        return 0;
      });
  }, [materials, searchTerm, selectedCategory, onlyLowStock, sortBy]);

  if (authLoading) {
    // ... existing loading screen ...
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      {/* ... existing sidebar ... */}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/40 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white capitalize">
              {activeTab === 'dashboard' && 'Visão Geral do Estoque'}
              {activeTab === 'inventory' && 'Lista de Materiais'}
              {activeTab === 'history' && 'Histórico de Movimentações'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'inventory' && (
              <button
                onClick={handleExportCSV}
                title="Exportar inventário para CSV"
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Exportar CSV</span>
              </button>
            )}
            <button
              onClick={() => handleOpenItemModal()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors shadow-md shadow-blue-600/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Novo Material
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">

          {/* ======================================================== */}
          {/* TAB 1: DASHBOARD */}
          {/* ======================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Total Types */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-medium text-slate-400">Total de Itens Cadastrados</p>
                      <h3 className="text-2xl font-bold text-white mt-2">{stats.totalItems}</h3>
                    </div>
                    <div className="p-2 bg-slate-800 text-slate-300 rounded-lg">
                      <Layers className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">{stats.totalStockUnits} registros totais</p>
                </div>

                {/* Total Value */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-medium text-slate-400">Valor Total do Estoque</p>
                      <h3 className="text-2xl font-bold text-emerald-400 mt-2">{formatBRL(stats.totalValue)}</h3>
                    </div>
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">Calculado por preço/custo unitário</p>
                </div>

                {/* Low Stock Warning */}
                <div className={`bg-slate-900 border rounded-xl p-5 relative overflow-hidden ${
                  stats.lowStockCount > 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-medium text-slate-400">Alertas de Estoque Baixo</p>
                      <h3 className={`text-2xl font-bold mt-2 ${stats.lowStockCount > 0 ? 'text-amber-400' : 'text-white'}`}>
                        {stats.lowStockCount}
                      </h3>
                    </div>
                    <div className={`p-2 rounded-lg ${stats.lowStockCount > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  </div>
                  {stats.lowStockCount > 0 ? (
                    <button 
                      onClick={() => { setOnlyLowStock(true); setActiveTab('inventory'); }}
                      className="text-xs text-amber-400 hover:underline mt-3 inline-block font-medium"
                    >
                      Ver materiais críticos &rarr;
                    </button>
                  ) : (
                    <p className="text-xs text-slate-500 mt-3">Todos os níveis estão normais</p>
                  )}
                </div>

                {/* Total Movements */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-medium text-slate-400">Movimentações Registradas</p>
                      <h3 className="text-2xl font-bold text-white mt-2">{movements.length}</h3>
                    </div>
                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">Histórico mantido na nuvem</p>
                </div>

              </div>

              {/* Low Stock Quick Table & Recent Movements */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Low Stock Panel */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Materiais com Estoque Mínimo Atingido
                    </h3>
                    <button 
                      onClick={() => { setOnlyLowStock(true); setActiveTab('inventory'); }} 
                      className="text-xs text-blue-400 hover:underline font-medium"
                    >
                      Ver todos
                    </button>
                  </div>

                  {materials.filter(m => Number(m.quantity) <= Number(m.minStock)).length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mb-2" />
                      <p className="text-sm">Nenhum item com estoque crítico!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800 overflow-y-auto max-h-72">
                      {materials
                        .filter(m => Number(m.quantity) <= Number(m.minStock))
                        .slice(0, 5)
                        .map((item) => (
                          <div key={item.id} className="py-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-200">{item.name}</p>
                              <p className="text-xs text-slate-500">Cód: {item.code} | Categoria: {item.category}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-xs font-semibold text-amber-400 block">
                                  {formatQty(item.quantity, item.unit)}
                                </span>
                                <span className="text-[10px] text-slate-500">Mín: {formatQty(item.minStock, item.unit)}</span>
                              </div>
                              <button
                                onClick={() => handleOpenMovementModal(item, 'IN')}
                                className="px-2.5 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-medium rounded transition-colors"
                              >
                                + Repor
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Recent Activity Panel */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <History className="w-4 h-4 text-blue-400" />
                      Últimas Movimentações
                    </h3>
                    <button 
                      onClick={() => setActiveTab('history')} 
                      className="text-xs text-blue-400 hover:underline font-medium"
                    >
                      Ver histórico
                    </button>
                  </div>

                  {movements.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                      <History className="w-8 h-8 text-slate-600 mb-2" />
                      <p className="text-sm">Nenhuma movimentação registrada ainda.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800 overflow-y-auto max-h-72">
                      {movements.slice(0, 5).map((mov) => (
                        <div key={mov.id} className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${
                              mov.type === 'IN' 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {mov.type === 'IN' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-200">{mov.materialName}</p>
                              <p className="text-xs text-slate-500">{mov.reason}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs font-bold ${mov.type === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {mov.type === 'IN' ? '+' : '-'}{formatQty(mov.quantity, mov.materialUnit || 'un')}
                            </span>
                            <p className="text-[10px] text-slate-500">
                              {mov.timestamp?.seconds 
                                ? new Date(mov.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Recente'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: MATERIALS INVENTORY LIST */}
          {/* ======================================================== */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              
              {/* Search and Filters Bar */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
                
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, código, unidade (kg, m²...), categoria ou localização..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Controls Dropdowns & Toggles */}
                <div className="flex flex-wrap items-center gap-2">
                  
                  {/* Category Filter */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        Categoria: {cat}
                      </option>
                    ))}
                  </select>

                  {/* Sort By */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="name">Ordernar por: Nome</option>
                    <option value="quantity">Ordenar por: Quantidade</option>
                    <option value="value">Ordenar por: Valor Total</option>
                  </select>

                  {/* Low Stock Toggle Button */}
                  <button
                    onClick={() => setOnlyLowStock(!onlyLowStock)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      onlyLowStock
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Apenas Estoque Baixo
                  </button>
                </div>
              </div>

              {/* Items Table / Grid */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {loadingData ? (
                  <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                    <p className="text-sm">Buscando materiais no banco de dados...</p>
                  </div>
                ) : filteredMaterials.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                    <Package className="w-10 h-10 text-slate-600" />
                    <p className="text-sm font-medium">Nenhum material encontrado com os filtros selecionados.</p>
                    <button
                      onClick={() => { setSearchTerm(''); setSelectedCategory('Todas'); setOnlyLowStock(false); }}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      Limpar todos os filtros
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Material / Código</th>
                          <th className="px-4 py-3">Categoria</th>
                          <th className="px-4 py-3">Unidade</th>
                          <th className="px-4 py-3">Localização</th>
                          <th className="px-4 py-3 text-center">Estoque Atual</th>
                          <th className="px-4 py-3 text-right">Preço Un.</th>
                          <th className="px-4 py-3 text-right">Valor em Estoque</th>
                          <th className="px-4 py-3 text-center">Entrada / Saída</th>
                          <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredMaterials.map((item) => {
                          const isLow = Number(item.quantity) <= Number(item.minStock);
                          const totalVal = Number(item.quantity) * Number(item.unitPrice || 0);

                          return (
                            <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                              
                              {/* Name & SKU */}
                              <td className="px-4 py-3.5">
                                <div className="font-semibold text-white flex items-center gap-2">
                                  {item.name}
                                  {isLow && (
                                    <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded border border-amber-500/30 font-normal">
                                      Estoque Baixo
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500">Cód: {item.code || 'N/A'}</div>
                              </td>

                              {/* Category */}
                              <td className="px-4 py-3.5">
                                <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-full border border-slate-700">
                                  {item.category || 'Geral'}
                                </span>
                              </td>

                              {/* Unit Badge */}
                              <td className="px-4 py-3.5">
                                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono text-xs px-2 py-0.5 rounded font-semibold">
                                  {item.unit || 'un'}
                                </span>
                              </td>

                              {/* Location */}
                              <td className="px-4 py-3.5 text-xs text-slate-400">
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <span className="truncate max-w-[140px]">{item.location || 'Não inf.'}</span>
                                </div>
                              </td>

                              {/* Quantity & Threshold */}
                              <td className="px-4 py-3.5 text-center">
                                <span className={`font-bold text-sm ${isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  {formatQty(item.quantity)} <span className="text-xs font-normal text-slate-400">{item.unit || 'un'}</span>
                                </span>
                                <span className="text-[10px] text-slate-500 block">
                                  Mín: {formatQty(item.minStock)} {item.unit || 'un'}
                                </span>
                              </td>

                              {/* Unit Price */}
                              <td className="px-4 py-3.5 text-right font-medium text-slate-300">
                                {formatBRL(item.unitPrice)}
                              </td>

                              {/* Total Value */}
                              <td className="px-4 py-3.5 text-right font-bold text-white">
                                {formatBRL(totalVal)}
                              </td>

                              {/* Quick Actions (In/Out) */}
                              <td className="px-4 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleOpenMovementModal(item, 'IN')}
                                    title={`Dar Entrada em ${item.unit || 'un'}`}
                                    className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded transition-colors"
                                  >
                                    <ArrowDownLeft className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenMovementModal(item, 'OUT')}
                                    title={`Dar Saída em ${item.unit || 'un'}`}
                                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded transition-colors"
                                  >
                                    <ArrowUpRight className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>

                              {/* Management Actions */}
                              <td className="px-4 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => handleDuplicateItem(item)}
                                    title="Duplicar Material"
                                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenItemModal(item)}
                                    title="Editar Material"
                                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item.id, item.name)}
                                    title="Excluir Material"
                                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: MOVEMENT HISTORY */}
          {/* ======================================================== */}
          {activeTab === 'history' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm">Registro Completo de Entrada e Saída</h3>
                <span className="text-xs text-slate-400">{movements.length} registro(s) encontrado(s)</span>
              </div>

              {movements.length === 0 ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                  <History className="w-8 h-8 text-slate-600" />
                  <p className="text-sm">Nenhuma movimentação realizada ainda.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Data/Hora</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Material</th>
                        <th className="px-4 py-3 text-center">Qtd. Movimentada</th>
                        <th className="px-4 py-3 text-center">Saldo Anterior / Novo</th>
                        <th className="px-4 py-3">Solicitante</th>
                        <th className="px-4 py-3">Motivo / Observação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {movements.map((mov) => {
                        const dateFormatted = mov.timestamp?.seconds 
                          ? new Date(mov.timestamp.seconds * 1000).toLocaleString('pt-BR')
                          : 'Recentemente';

                        return (
                          <tr key={mov.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                              {dateFormatted}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border ${
                                mov.type === 'IN'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}>
                                {mov.type === 'IN' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                {mov.type === 'IN' ? 'Entrada' : 'Saída'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-white">
                              {mov.materialName}
                              <span className="block text-[11px] text-slate-500 font-normal">Cód: {mov.materialCode}</span>
                            </td>
                            <td className={`px-4 py-3 text-center font-bold ${mov.type === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {mov.type === 'IN' ? '+' : '-'}{formatQty(mov.quantity, mov.materialUnit || 'un')}
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-slate-400 font-mono">
                              {formatQty(mov.previousQuantity)} &rarr; <span className="font-bold text-slate-200">{formatQty(mov.newQuantity)} {mov.materialUnit || 'un'}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-300">
                              {mov.requester || 'Não informado'}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-300">
                              {mov.reason}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ======================================================== */}
      {/* MODAL 1: CREATE / EDIT MATERIAL */}
      {/* ======================================================== */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                {editingItem ? 'Editar Material' : 'Cadastrar Novo Material'}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveItem} className="p-5 space-y-4 overflow-y-auto flex-1">
              
              {/* Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nome do Material *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Cabo Flexível 2.5mm²"
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Código / SKU
                  </label>
                  <input
                    type="text"
                    placeholder="COD-1234"
                    value={formState.code}
                    onChange={(e) => setFormState({ ...formState, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Category, Unit & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formState.category}
                    onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {categories.filter(c => c !== 'Todas').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Unidade de Medida *
                  </label>
                  <select
                    value={formState.unit}
                    onChange={(e) => setFormState({ ...formState, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {presetUnits.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Unit Input */}
              {formState.unit === 'CUSTOM' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Digite a Unidade Personalizada (ex: rolo, galão, tambor...) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: rolo"
                    value={formState.customUnit}
                    onChange={(e) => setFormState({ ...formState, customUnit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Location */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Localização / Prateleira
                </label>
                <input
                  type="text"
                  placeholder="Ex: Corredor B, Estante 3"
                  value={formState.location}
                  onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Quantities & Price (Supports Decimals) */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Qtd. Atual
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formState.quantity}
                    onChange={(e) => setFormState({ ...formState, quantity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Estoque Mínimo
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formState.minStock}
                    onChange={(e) => setFormState({ ...formState, minStock: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Preço Un. (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formState.unitPrice}
                    onChange={(e) => setFormState({ ...formState, unitPrice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Observações / Especificações
                </label>
                <textarea
                  rows="2"
                  placeholder="Instruções de armazenamento, fornecedor padrão, etc."
                  value={formState.notes}
                  onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-md shadow-blue-600/20"
                >
                  {editingItem ? 'Atualizar Item' : 'Salvar Material'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: STOCK IN / STOCK OUT QUICK ACTION */}
      {/* ======================================================== */}
      {isMovementModalOpen && movementTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className={`p-5 border-b border-slate-800 flex justify-between items-center ${
              movementType === 'IN' ? 'bg-emerald-950/30' : 'bg-rose-950/30'
            }`}>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                {movementType === 'IN' ? (
                  <>
                    <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                    Entrada de Material
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-5 h-5 text-rose-400" />
                    Saída de Material
                  </>
                )}
              </h3>
              <button
                onClick={() => setIsMovementModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleProcessMovement} className="p-5 space-y-4">
              
              {/* Item Details Brief */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <p className="font-semibold text-white text-sm">{movementTarget.name}</p>
                <div className="flex justify-between items-center mt-1 text-xs text-slate-400">
                  <span>Código: {movementTarget.code}</span>
                  <span>Estoque Atual: <strong className="text-slate-200">{formatQty(movementTarget.quantity, movementTarget.unit || 'un')}</strong></span>
                </div>
              </div>

              {/* Quantity (Supports Decimals) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Quantidade a {movementType === 'IN' ? 'Adicionar' : 'Retirar'} em <span className="font-mono text-blue-400 font-bold">{movementTarget.unit || 'un'}</span> *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    required
                    value={movementQty}
                    onChange={(e) => setMovementQty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-16 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-bold font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    {movementTarget.unit || 'un'}
                  </span>
                </div>
              </div>

              {/* Requester / Employee Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Solicitante / Responsável
                </label>
                <input
                  type="text"
                  placeholder="Ex: João Silva (Manutenção)"
                  value={movementRequester}
                  onChange={(e) => setMovementRequester(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Motivo ou Observação
                </label>
                <input
                  type="text"
                  placeholder={movementType === 'IN' ? 'Ex: Compra Nota Fiscal #1020' : 'Ex: Obra Setor B'}
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-md ${
                    movementType === 'IN'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                  }`}
                >
                  Confirmar {movementType === 'IN' ? 'Entrada' : 'Saída'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
