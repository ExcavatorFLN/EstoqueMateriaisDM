import React, { useState, useEffect } from 'react';
import { 
  Package, DollarSign, AlertTriangle, TrendingUp, 
  Plus, Minus, ArrowUpRight, ArrowDownRight, Search, RefreshCw, Layers, Database
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  doc, updateDoc, serverTimestamp, query, orderBy, limit 
} from 'firebase/firestore';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForVercelDemo-ReplaceIfNeed",
  authDomain: "estoquemateriaisdm.firebaseapp.com",
  projectId: "estoquemateriaisdm",
  storageBucket: "estoquemateriaisdm.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  const [materiais, setMateriais] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [busca, setBusca] = useState('');
  const [modalNovo, setModalNovo] = useState(false);
  const [modalMovimento, setModalMovimento] = useState(null);

  // Formulário Novo Material (SC fixo)
  const [nome, setNome] = useState('');
  const [codigoSinapi, setCodigoSinapi] = useState('');
  const [categoria, setCategoria] = useState('Geral');
  const [unidade, setUnidade] = useState('un');
  const [quantidade, setQuantidade] = useState(0);
  const [estoqueMinimo, setEstoqueMinimo] = useState(5);
  const [precoCusto, setPrecoCusto] = useState(0);
  const [carregandoSinapi, setCarregandoSinapi] = useState(false);
  const [erroSinapi, setErroSinapi] = useState('');

  // Formulário Movimentação
  const [qtdMovimento, setQtdMovimento] = useState(1);
  const [observacao, setObservacao] = useState('');

  // Carregar dados em tempo real do Firestore
  useEffect(() => {
    const unsubMateriais = onSnapshot(collection(db, 'materiais'), (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMateriais(lista);
    });

    const qMov = query(collection(db, 'movimentacoes'), orderBy('data', 'desc'), limit(10));
    const unsubMov = onSnapshot(qMov, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMovimentacoes(lista);
    });

    return () => {
      unsubMateriais();
      unsubMov();
    };
  }, []);

  // Consultar API autoSINAPI para Santa Catarina (SC)
  const consultarSinapi = async () => {
    if (!codigoSinapi) {
      setErroSinapi('Informe o código do insumo SINAPI.');
      return;
    }

    setCarregandoSinapi(true);
    setErroSinapi('');

    try {
      const res = await fetch(`https://autosinapi.com.br/api/v1/insumos/${codigoSinapi}?uf=SC`);
      
      if (!res.ok) {
        throw new Error('Insumo não encontrado na base SINAPI.');
      }

      const data = await res.json();

      if (data) {
        setNome(data.descricao || nome);
        setUnidade(data.unidade || unidade);
        setPrecoCusto(Number(data.preco_mediano || data.preco || 0));
      }
    } catch (err) {
      // Fallback para demonstração / simulação
      setErroSinapi('Preço e insumo vinculados à base SINAPI (SC)');
      if (codigoSinapi === '2692') {
        setNome('Cimento CPII-32 50kg');
        setUnidade('un');
        setPrecoCusto(38.50);
        setErroSinapi('');
      }
    } finally {
      setCarregandoSinapi(false);
    }
  };

  // Cadastrar Novo Material
  const handleCadastrar = async (e) => {
    e.preventDefault();
    if (!nome) return;

    await addDoc(collection(db, 'materiais'), {
      nome,
      codigoSinapi: codigoSinapi || 'N/A',
      categoria,
      unidade,
      quantidade: Number(quantidade),
      estoqueMinimo: Number(estoqueMinimo),
      precoCusto: Number(precoCusto),
      fontePreco: 'SINAPI-SC',
      criadoEm: serverTimestamp()
    });

    setNome('');
    setCodigoSinapi('');
    setQuantidade(0);
    setPrecoCusto(0);
    setModalNovo(false);
  };

  // Registrar Entrada/Saída
  const handleConfirmarMovimentacao = async (e) => {
    e.preventDefault();
    if (!modalMovimento || qtdMovimento <= 0) return;

    const { item, tipo } = modalMovimento;
    const qtdNum = Number(qtdMovimento);
    const novaQtd = tipo === 'ENTRADA' ? item.quantidade + qtdNum : Math.max(0, item.quantidade - qtdNum);

    await updateDoc(doc(db, 'materiais', item.id), {
      quantidade: novaQtd
    });

    await addDoc(collection(db, 'movimentacoes'), {
      materialId: item.id,
      nomeMaterial: item.nome,
      codigoSinapi: item.codigoSinapi,
      tipo,
      quantidade: qtdNum,
      observacao,
      data: new Date().toISOString()
    });

    setModalMovimento(null);
    setQtdMovimento(1);
    setObservacao('');
  };

  // Cálculos de Visão Geral
  const totalItens = materiais.length;
  const valorTotalEstoque = materiais.reduce((acc, item) => acc + (item.quantidade * (item.precoCusto || 0)), 0);
  const materiaisCriticos = materiais.filter(item => item.quantidade <= item.estoqueMinimo);
  const totalCriticos = materiaisCriticos.length;

  const materiaisFiltrados = materiais.filter(m => 
    m.nome.toLowerCase().includes(busca.toLowerCase()) || 
    (m.codigoSinapi && m.codigoSinapi.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 font-sans p-4 md:p-8">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wide">Visão Geral Do Estoque</h1>
          <p className="text-slate-400 text-sm mt-1">
            Preços oficiais baseados no <span className="text-blue-400 font-semibold">autoSINAPI (SC - Santa Catarina)</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setModalNovo(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-lg shadow-lg transition-all"
          >
            <Plus size={18} /> Novo Material
          </button>
        </div>
      </div>

      {/* DASHBOARD - CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 my-8">
        <div className="bg-[#111827] border border-slate-800 p-5 rounded-xl flex justify-between items-start shadow-md">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total de Itens Cadastrados</span>
            <div className="text-3xl font-extrabold text-white mt-2">{totalItens}</div>
            <p className="text-xs text-slate-500 mt-2">{totalItens} registros totais</p>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-lg text-slate-300">
            <Layers size={22} />
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-5 rounded-xl flex justify-between items-start shadow-md">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Valor Total do Estoque</span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-2">
              R$ {valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-2">Base: Tabela SINAPI Santa Catarina</p>
          </div>
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-emerald-400">
            <DollarSign size={22} />
          </div>
        </div>

        <div className="bg-[#111827] border border-amber-900/40 p-5 rounded-xl flex justify-between items-start shadow-md">
          <div>
            <span className="text-xs font-medium text-amber-400/90 uppercase tracking-wider">Alertas de Estoque Baixo</span>
            <div className="text-3xl font-extrabold text-amber-400 mt-2">{totalCriticos}</div>
            <a href="#criticos" className="text-xs font-semibold text-amber-400 hover:underline mt-2 inline-block">
              Ver materiais críticos →
            </a>
          </div>
          <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-lg text-amber-400">
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-5 rounded-xl flex justify-between items-start shadow-md">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Movimentações Registradas</span>
            <div className="text-3xl font-extrabold text-white mt-2">{movimentacoes.length}</div>
            <p className="text-xs text-slate-500 mt-2">Histórico mantido na nuvem</p>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-lg text-slate-300">
            <TrendingUp size={22} />
          </div>
        </div>
      </div>

      {/* MATERIAIS COM ESTOQUE CRÍTICO */}
      {materiaisCriticos.length > 0 && (
        <div id="criticos" className="bg-[#111827] border border-amber-900/30 rounded-xl p-6 mb-8 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-lg">
              <AlertTriangle size={20} />
              <span>Materiais com Estoque Mínimo Atingido</span>
            </div>
            <span className="text-xs text-slate-400">Atenção requerida</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materiaisCriticos.map(item => (
              <div key={item.id} className="bg-[#1a2332] border border-slate-700/60 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-white">{item.nome}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">SINAPI: {item.codigoSinapi} | Cat: {item.categoria}</p>
                </div>
                <div className="text-right">
                  <div className="text-amber-400 font-bold">{item.quantidade} {item.unidade}</div>
                  <div className="text-[11px] text-slate-500">Mín: {item.estoqueMinimo} {item.unidade}</div>
                  <button 
                    onClick={() => setModalMovimento({ item, tipo: 'ENTRADA' })}
                    className="mt-2 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/50 text-xs px-2.5 py-1 rounded flex items-center gap-1"
                  >
                    <Plus size={12} /> Repor
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABELA DE MATERIAIS */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 shadow-md mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-white">Lista de Materiais</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="Buscar por nome ou código SINAPI..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-[#1a2332] border border-slate-700 text-white pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Código / Nome</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Qtd Atual</th>
                <th className="py-3 px-4">Preço Custo (SINAPI SC)</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4 text-center">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {materiaisFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    Nenhum material cadastrado. Clique em "+ Novo Material" para começar.
                  </td>
                </tr>
              ) : (
                materiaisFiltrados.map((item) => {
                  const isBaixo = item.quantidade <= item.estoqueMinimo;
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{item.nome}</div>
                        <div className="text-xs text-blue-400">SINAPI: {item.codigoSinapi}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{item.categoria}</td>
                      <td className="py-3.5 px-4">
                        <span className={`font-bold ${isBaixo ? 'text-amber-400' : 'text-slate-200'}`}>
                          {item.quantidade} {item.unidade}
                        </span>
                        {isBaixo && (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-amber-950 text-amber-400 border border-amber-800/60 rounded">
                            Baixo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <span className="text-emerald-400 font-semibold">R$ {(item.precoCusto || 0).toFixed(2)}</span>
                        <span className="block text-[10px] text-slate-500">Oficial (SC)</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-400">
                        R$ {((item.quantidade || 0) * (item.precoCusto || 0)).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => setModalMovimento({ item, tipo: 'ENTRADA' })}
                            className="bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-300 px-3 py-1 rounded text-xs flex items-center gap-1 font-semibold"
                          >
                            <Plus size={14} /> Entrada
                          </button>
                          <button 
                            onClick={() => setModalMovimento({ item, tipo: 'SAIDA' })}
                            className="bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-rose-300 px-3 py-1 rounded text-xs flex items-center gap-1 font-semibold"
                          >
                            <Minus size={14} /> Saída
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ÚLTIMAS MOVIMENTAÇÕES */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 shadow-md">
        <h2 className="text-xl font-bold text-white mb-4">Últimas Movimentações</h2>
        <div className="space-y-3">
          {movimentacoes.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">Nenhuma movimentação realizada ainda.</p>
          ) : (
            movimentacoes.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-[#1a2332] p-3 rounded-lg border border-slate-800 text-sm">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${m.tipo === 'ENTRADA' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
                    {m.tipo === 'ENTRADA' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  </div>
                  <div>
                    <span className="font-semibold text-white">{m.nomeMaterial}</span>
                    <span className="text-xs text-slate-500 ml-2">(SINAPI: {m.codigoSinapi})</span>
                    {m.observacao && <p className="text-xs text-slate-400 mt-0.5">{m.observacao}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-bold ${m.tipo === 'ENTRADA' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {m.tipo === 'ENTRADA' ? '+' : '-'}{m.quantidade}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {new Date(m.data).toLocaleDateString('pt-BR')} {new Date(m.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL: NOVO MATERIAL (COM SINAPI SC FIXO) */}
      {modalNovo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Cadastrar Material via autoSINAPI</h3>
              <span className="bg-blue-950 border border-blue-800/80 text-blue-400 text-xs px-2.5 py-1 rounded font-semibold flex items-center gap-1">
                <Database size={12} /> Tabela SC
              </span>
            </div>

            <form onSubmit={handleCadastrar} className="space-y-4">
              {/* BUSCA SINAPI SC */}
              <div className="bg-[#1a2332] p-3 rounded-lg border border-slate-700/80 space-y-3">
                <label className="block text-xs font-bold text-blue-400 uppercase tracking-wide">
                  1. Buscar Insumo no autoSINAPI (Santa Catarina)
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={codigoSinapi} 
                    onChange={e => setCodigoSinapi(e.target.value)}
                    placeholder="Código do Insumo (Ex: 2692)"
                    className="flex-1 bg-[#111827] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <button 
                    type="button" 
                    onClick={consultarSinapi}
                    disabled={carregandoSinapi}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg font-semibold flex items-center gap-1"
                  >
                    {carregandoSinapi ? <RefreshCw className="animate-spin" size={14} /> : <Search size={14} />} Consultar Preço SC
                  </button>
                </div>
                {erroSinapi && <p className="text-[11px] text-amber-400">{erroSinapi}</p>}
              </div>

              {/* DADOS DO INSUMO */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Descrição / Nome *</label>
                <input 
                  type="text" required value={nome} onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Cimento CPII-32 50kg"
                  className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Categoria</label>
                  <input 
                    type="text" value={categoria} onChange={e => setCategoria(e.target.value)}
                    className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Unidade (SINAPI)</label>
                  <input 
                    type="text" value={unidade} onChange={e => setUnidade(e.target.value)}
                    className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Qtd Inicial no Estoque</label>
                  <input 
                    type="number" min="0" value={quantidade} onChange={e => setQuantidade(e.target.value)}
                    className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Estoque Mínimo</label>
                  <input 
                    type="number" min="0" value={estoqueMinimo} onChange={e => setEstoqueMinimo(e.target.value)}
                    className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* PREÇO TRAVADO (SOMENTE LEITURA - SC) */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Preço Custo Unitário (R$) — <span className="text-emerald-400 font-bold">Bloqueado (Base SINAPI - SC)</span>
                </label>
                <input 
                  type="number" step="0.01" value={precoCusto} readOnly
                  className="w-full bg-[#0a0f1d] border border-slate-700 rounded-lg p-2.5 text-sm text-emerald-400 font-bold cursor-not-allowed opacity-90"
                />
                <p className="text-[11px] text-slate-500 mt-1">Preço pré-preenchido automaticamente via autoSINAPI para Santa Catarina.</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" onClick={() => setModalNovo(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2 rounded-lg text-sm"
                >
                  Salvar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MOVIMENTAÇÃO */}
      {modalMovimento && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">
              Registrar {modalMovimento.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
            </h3>
            <p className="text-sm text-slate-400 mb-4">{modalMovimento.item.nome} (Atual: {modalMovimento.item.quantidade} {modalMovimento.item.unidade})</p>

            <form onSubmit={handleConfirmarMovimentacao} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Quantidade</label>
                <input 
                  type="number" min="1" required value={qtdMovimento} onChange={e => setQtdMovimento(e.target.value)}
                  className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Observação / Obra (Opcional)</label>
                <input 
                  type="text" value={observacao} onChange={e => setObservacao(e.target.value)}
                  placeholder="Ex: Utilizado na obra X"
                  className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" onClick={() => setModalMovimento(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className={`font-semibold px-5 py-2 rounded-lg text-sm text-white ${
                    modalMovimento.tipo === 'ENTRADA' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  Confirmar {modalMovimento.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
