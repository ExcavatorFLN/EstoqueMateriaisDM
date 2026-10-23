import React, { useState, useEffect } from 'react';
import { 
  Package, DollarSign, AlertTriangle, TrendingUp, 
  Plus, Minus, Search, Layers, FileText, CheckCircle2, User, ShieldCheck
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
  const [abaAtiva, setAbaAtiva] = useState('estoque'); // 'estoque' | 'romaneios'
  const [materiais, setMateriais] = useState([]);
  const [romaneios, setRomaneios] = useState([]);
  const [busca, setBusca] = useState('');
  const [modalNovo, setModalNovo] = useState(false);
  const [modalEntrada, setModalEntrada] = useState(null); // item para dar entrada rápida

  // Formulário Novo Material (Preço Manual)
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [categoria, setCategoria] = useState('Geral');
  const [unidade, setUnidade] = useState('un');
  const [quantidade, setQuantidade] = useState(0);
  const [estoqueMinimo, setEstoqueMinimo] = useState(5);
  const [precoCusto, setPrecoCusto] = useState(0);

  // Formulário de Romaneio de Carga
  const [requisitante, setRequisitante] = useState('');
  const [aprovador, setAprovador] = useState('');
  const [itensRomaneio, setItensRomaneio] = useState([]); // [{ materialId, nome, unidade, quantidadeSolicitada, precoCusto }]
  const [materialSelecionadoId, setMaterialSelecionadoId] = useState('');
  const [qtdSolicitada, setQtdSolicitada] = useState(1);
  const [observacaoRomaneio, setObservacaoRomaneio] = useState('');

  // Carregar dados em tempo real do Firestore
  useEffect(() => {
    const unsubMateriais = onSnapshot(collection(db, 'materiais'), (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMateriais(lista);
    });

    const qRom = query(collection(db, 'romaneios'), orderBy('data', 'desc'), limit(15));
    const unsubRom = onSnapshot(qRom, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRomaneios(lista);
    });

    return () => {
      unsubMateriais();
      unsubRom();
    };
  }, []);

  // Cadastrar Novo Material (Preço Manual)
  const handleCadastrar = async (e) => {
    e.preventDefault();
    if (!nome) return;

    const codigoFinal = codigo || `COD-${Math.floor(1000 + Math.random() * 9000)}`;

    await addDoc(collection(db, 'materiais'), {
      nome,
      codigo: codigoFinal,
      categoria,
      unidade,
      quantidade: Number(quantidade),
      estoqueMinimo: Number(estoqueMinimo),
      precoCusto: Number(precoCusto),
      criadoEm: serverTimestamp()
    });

    setNome('');
    setCodigo('');
    setQuantidade(0);
    setPrecoCusto(0);
    setModalNovo(false);
  };

  // Entrada Rápida de Estoque
  const handleEntradaRapida = async (e) => {
    e.preventDefault();
    if (!modalEntrada || qtdSolicitada <= 0) return;

    const novaQtd = Number(modalEntrada.quantidade) + Number(qtdSolicitada);
    await updateDoc(doc(db, 'materiais', modalEntrada.id), { quantidade: novaQtd });

    await addDoc(collection(db, 'movimentacoes'), {
      materialId: modalEntrada.id,
      nomeMaterial: modalEntrada.nome,
      tipo: 'ENTRADA',
      quantidade: Number(qtdSolicitada),
      data: new Date().toISOString()
    });

    setModalEntrada(null);
    setQtdSolicitada(1);
  };

  // Adicionar item ao Romaneio atual
  const adicionarItemRomaneio = () => {
    const mat = materiais.find(m => m.id === materialSelecionadoId);
    if (!mat || qtdSolicitada <= 0) return;

    // Verifica se já existe na lista do romaneio
    const existe = itensRomaneio.find(i => i.materialId === mat.id);
    if (existe) {
      setItensRomaneio(itensRomaneio.map(i => i.materialId === mat.id ? { ...i, quantidadeSolicitada: i.quantidadeSolicitada + Number(qtdSolicitada) } : i));
    } else {
      setItensRomaneio([...itensRomaneio, {
        materialId: mat.id,
        nome: mat.nome,
        codigo: mat.codigo,
        unidade: mat.unidade,
        quantidadeSolicitada: Number(qtdSolicitada),
        estoqueAtual: mat.quantidade,
        precoCusto: mat.precoCusto || 0
      }]);
    }
    setQtdSolicitada(1);
    setMaterialSelecionadoId('');
  };

  // Finalizar e Emitir Romaneio de Carga (Baixa no Estoque)
  const emitirRomaneio = async (e) => {
    e.preventDefault();
    if (!requisitante || !aprovador || itensRomaneio.length === 0) {
      alert('Preencha o requisitante, o aprovador e adicione pelo menos um material.');
      return;
    }

    // Processa a baixa de cada item no Firestore
    for (const item of itensRomaneio) {
      const matOriginal = materiais.find(m => m.id === item.materialId);
      if (matOriginal) {
        const novaQtd = Math.max(0, matOriginal.quantidade - item.quantidadeSolicitada);
        await updateDoc(doc(db, 'materiais', matOriginal.id), { quantidade: novaQtd });
      }
    }

    // Salva o romaneio na nuvem
    await addDoc(collection(db, 'romaneios'), {
      requisitante,
      aprovador,
      itens: itensRomaneio,
      observacao: observacaoRomaneio,
      data: new Date().toISOString()
    });

    // Limpa formulário
    setRequisitante('');
    setAprovador('');
    setItensRomaneio([]);
    setObservacaoRomaneio('');
    setAbaAtiva('estoque');
  };

  // Cálculos de Visão Geral
  const totalItens = materiais.length;
  const valorTotalEstoque = materiais.reduce((acc, item) => acc + (item.quantidade * (item.precoCusto || 0)), 0);
  const materiaisCriticos = materiais.filter(item => item.quantidade <= item.estoqueMinimo);
  const totalCriticos = materiaisCriticos.length;

  const materiaisFiltrados = materiais.filter(m => 
    m.nome.toLowerCase().includes(busca.toLowerCase()) || 
    m.codigo.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 font-sans p-4 md:p-8">
      {/* CABEÇALHO E ABAS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wide">Controle de Estoque & Romaneios</h1>
          <p className="text-slate-400 text-sm mt-1">Gestão integrada com liberação por Romaneios de Carga</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setAbaAtiva('estoque')}
            className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${abaAtiva === 'estoque' ? 'bg-blue-600 text-white shadow-lg' : 'bg-[#111827] text-slate-400 hover:text-white border border-slate-800'}`}
          >
            Visão Geral & Estoque
          </button>
          <button 
            onClick={() => setAbaAtiva('romaneios')}
            className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${abaAtiva === 'romaneios' ? 'bg-blue-600 text-white shadow-lg' : 'bg-[#111827] text-slate-400 hover:text-white border border-slate-800'}`}
          >
            <FileText size={16} /> Novo Romaneio de Carga
          </button>
        </div>
      </div>

      {abaAtiva === 'estoque' ? (
        <>
          {/* DASHBOARD - CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 my-8">
            <div className="bg-[#111827] border border-slate-800 p-5 rounded-xl shadow-md">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total de Itens</span>
              <div className="text-3xl font-extrabold text-white mt-2">{totalItens}</div>
              <p className="text-xs text-slate-500 mt-2">Cadastrados no sistema</p>
            </div>

            <div className="bg-[#111827] border border-slate-800 p-5 rounded-xl shadow-md">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Valor Total do Estoque</span>
              <div className="text-3xl font-extrabold text-emerald-400 mt-2">
                R$ {valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500 mt-2">Baseado no preço de custo unitário</p>
            </div>

            <div className="bg-[#111827] border border-amber-900/40 p-5 rounded-xl shadow-md">
              <span className="text-xs font-medium text-amber-400/90 uppercase tracking-wider">Estoque Baixo / Crítico</span>
              <div className="text-3xl font-extrabold text-amber-400 mt-2">{totalCriticos}</div>
              <a href="#criticos" className="text-xs font-semibold text-amber-400 hover:underline mt-2 inline-block">Ver críticos →</a>
            </div>

            <div className="bg-[#111827] border border-slate-800 p-5 rounded-xl shadow-md">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Romaneios Emitidos</span>
              <div className="text-3xl font-extrabold text-white mt-2">{romaneios.length}</div>
              <p className="text-xs text-slate-500 mt-2">Histórico de saídas na nuvem</p>
            </div>
          </div>

          {/* ALERTA DE MATERIAIS CRÍTICOS */}
          {materiaisCriticos.length > 0 && (
            <div id="criticos" className="bg-[#111827] border border-amber-900/30 rounded-xl p-6 mb-8 shadow-md">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-lg mb-4">
                <AlertTriangle size={20} />
                <span>Materiais com Estoque Mínimo Atingido</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {materiaisCriticos.map(item => (
                  <div key={item.id} className="bg-[#1a2332] border border-slate-700/60 p-4 rounded-lg flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-white">{item.nome}</h4>
                      <p className="text-xs text-slate-400">Cód: {item.codigo}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-amber-400 font-bold">{item.quantidade} {item.unidade}</div>
                      <button 
                        onClick={() => setModalEntrada(item)}
                        className="mt-2 bg-emerald-950 text-emerald-300 border border-emerald-700/50 text-xs px-2.5 py-1 rounded flex items-center gap-1 font-semibold hover:bg-emerald-900"
                      >
                        <Plus size={12} /> Entrada
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
              <h2 className="text-xl font-bold text-white">Inventário de Materiais</h2>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
                  <input 
                    type="text"
                    placeholder="Pesquisar material..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full bg-[#1a2332] border border-slate-700 text-white pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button 
                  onClick={() => setModalNovo(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 shadow-md whitespace-nowrap"
                >
                  <Plus size={16} /> Novo Material
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Código / Nome</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Qtd Atual</th>
                    <th className="py-3 px-4">Preço Custo (R$)</th>
                    <th className="py-3 px-4">Total (R$)</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {materiaisFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-500">Nenhum material cadastrado.</td>
                    </tr>
                  ) : (
                    materiaisFiltrados.map((item) => {
                      const isBaixo = item.quantidade <= item.estoqueMinimo;
                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white">{item.nome}</div>
                            <div className="text-xs text-slate-500">{item.codigo}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">{item.categoria}</td>
                          <td className="py-3.5 px-4">
                            <span className={`font-bold ${isBaixo ? 'text-amber-400' : 'text-slate-200'}`}>
                              {item.quantidade} {item.unidade}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">R$ {(item.precoCusto || 0).toFixed(2)}</td>
                          <td className="py-3.5 px-4 font-semibold text-emerald-400">
                            R$ {((item.quantidade || 0) * (item.precoCusto || 0)).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button 
                              onClick={() => setModalEntrada(item)}
                              className="bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-300 px-3 py-1 rounded text-xs font-semibold"
                            >
                              + Repor / Entrada
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* HISTÓRICO DE ROMANEIOS EMITIDOS */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-bold text-white mb-4">Romaneios de Carga Emitidos (Saídas)</h2>
            <div className="space-y-4">
              {romaneios.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Nenhum romaneio emitido até o momento.</p>
              ) : (
                romaneios.map((r) => (
                  <div key={r.id} className="bg-[#1a2332] p-4 rounded-lg border border-slate-800 text-sm">
                    <div className="flex flex-col sm:flex-row justify-between pb-3 border-b border-slate-800 gap-2">
                      <div>
                        <span className="text-blue-400 font-bold">Romaneio #{r.id.substring(0, 6).toUpperCase()}</span>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-300">
                          <span className="flex items-center gap-1"><User size={13} className="text-slate-400" /> Requisitante: <strong>{r.requisitante}</strong></span>
                          <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-emerald-400" /> Aprovador: <strong>{r.aprovador}</strong></span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        {new Date(r.data).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {r.itens.map((it, idx) => (
                        <div key={idx} className="bg-[#111827] p-2.5 rounded border border-slate-800/80 flex justify-between items-center text-xs">
                          <span className="text-slate-200 font-medium">{it.nome}</span>
                          <span className="text-rose-400 font-bold">-{it.quantidadeSolicitada} {it.unidade}</span>
                        </div>
                      ))}
                    </div>
                    {r.observacao && <p className="text-xs text-slate-400 mt-3 italic">Obs: {r.observacao}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        /* ABA: NOVO ROMANEIO DE CARGA */
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 md:p-8 max-w-3xl mx-auto shadow-xl my-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
            <FileText className="text-blue-400" size={28} />
            <div>
              <h2 className="text-xl font-bold text-white">Emitir Romaneio de Carga</h2>
              <p className="text-xs text-slate-400">Preencha os responsáveis e adicione os materiais para realizar a baixa automática.</p>
            </div>
          </div>

          <form onSubmit={emitirRomaneio} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nome do Requisitante *</label>
                <input 
                  type="text" required value={requisitante} onChange={e => setRequisitante(e.target.value)}
                  placeholder="Ex: João da Silva (Encarregado)"
                  className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Responsável pela Aprovação *</label>
                <input 
                  type="text" required value={aprovador} onChange={e => setAprovador(e.target.value)}
                  placeholder="Ex: Carlos Engenheiro"
                  className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* ADICIONAR ITENS AO ROMANEIO */}
            <div className="bg-[#1a2332] p-4 rounded-xl border border-slate-700/80 space-y-4">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Adicionar Materiais ao Romaneio</h3>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-7">
                  <label className="block text-xs text-slate-400 mb-1">Selecione o Material</label>
                  <select 
                    value={materialSelecionadoId} onChange={e => setMaterialSelecionadoId(e.target.value)}
                    className="w-full bg-[#111827] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none"
                  >
                    <option value="">-- Escolha um material --</option>
                    {materiais.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nome} (Disponível: {m.quantidade} {m.unidade})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs text-slate-400 mb-1">Quantidade</label>
                  <input 
                    type="number" min="1" value={qtdSolicitada} onChange={e => setQtdSolicitada(e.target.value)}
                    className="w-full bg-[#111827] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button 
                    type="button" onClick={adicionarItemRomaneio}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-all"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* LISTA DE ITENS SELECIONADOS NO ROMANEIO */}
              {itensRomaneio.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-700/80 space-y-2">
                  <span className="text-xs font-semibold text-slate-300">Itens no Romaneio atual:</span>
                  {itensRomaneio.map((it, index) => (
                    <div key={index} className="flex justify-between items-center bg-[#111827] px-3 py-2 rounded-lg text-xs border border-slate-800">
                      <div>
                        <span className="font-semibold text-white">{it.nome}</span>
                        <span className="text-slate-400 ml-2">({it.codigo})</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-amber-400 font-bold">{it.quantidadeSolicitada} {it.unidade}</span>
                        <button 
                          type="button" 
                          onClick={() => setItensRomaneio(itensRomaneio.filter((_, i) => i !== index))}
                          className="text-rose-400 hover:underline"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Observações do Romaneio (Opcional)</label>
              <textarea 
                value={observacaoRomaneio} onChange={e => setObservacaoRomaneio(e.target.value)}
                placeholder="Destino dos materiais, número da obra, etc."
                rows="2"
                className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button 
                type="button" onClick={() => setAbaAtiva('estoque')}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-lg text-sm shadow-lg flex items-center gap-2"
              >
                <CheckCircle2 size={18} /> Emitir Romaneio e Dar Baixa
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: NOVO MATERIAL (COM PREÇO MANUAL) */}
      {modalNovo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Cadastrar Novo Material</h3>
            <form onSubmit={handleCadastrar} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nome do Material *</label>
                <input 
                  type="text" required value={nome} onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Cimento CPII 50kg"
                  className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Código (Opcional)</label>
                  <input 
                    type="text" value={codigo} onChange={e => setCodigo(e.target.value)}
                    placeholder="Ex: MAT-001"
                    className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Categoria</label>
                  <input 
                    type="text" value={categoria} onChange={e => setCategoria(e.target.value)}
                    className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Qtd Inicial</label>
                  <input 
                    type="number" min="0" value={quantidade} onChange={e => setQuantidade(e.target.value)}
                    className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Unidade</label>
                  <select 
                    value={unidade} onChange={e => setUnidade(e.target.value)}
                    className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none"
                  >
                    <option value="un">un</option>
                    <option value="kg">kg</option>
                    <option value="m">m</option>
                    <option value="m2">m²</option>
                    <option value="l">l</option>
                    <option value="cx">cx</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Estoque Mín.</label>
                  <input 
                    type="number" min="0" value={estoqueMinimo} onChange={e => setEstoqueMinimo(e.target.value)}
                    className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Preço de Custo Unitário (R$) - Manual</label>
                <input 
                  type="number" step="0.01" value={precoCusto} onChange={e => setPrecoCusto(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-emerald-400 font-bold focus:outline-none focus:border-blue-500"
                />
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
                  Salvar Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENTRADA / REPOSIÇÃO RÁPIDA */}
      {modalEntrada && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Repor / Entrada de Estoque</h3>
            <p className="text-sm text-slate-400 mb-4">{modalEntrada.nome} (Atual: {modalEntrada.quantidade} {modalEntrada.unidade})</p>

            <form onSubmit={handleEntradaRapida} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Quantidade a Adicionar</label>
                <input 
                  type="number" min="1" required value={qtdSolicitada} onChange={e => setQtdSolicitada(e.target.value)}
                  className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" onClick={() => setModalEntrada(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2 rounded-lg text-sm"
                >
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
