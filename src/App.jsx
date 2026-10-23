import React, { useState, useEffect } from 'react';
import { 
  Package, DollarSign, AlertTriangle, TrendingUp, 
  Plus, Search, Layers, FileText, CheckCircle2, User, ShieldCheck, CheckSquare, Square, Printer
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

const REQUERENTES_PADRAO = [
  "João da Silva (Obra 01)",
  "Maria Oliveira (Obra 02)",
  "Carlos Eduardo (Manutenção)",
  "Ana Souza (Almoxarifado)",
  "Outro Requerente"
];

export default function App() {
  const [materiais, setMateriais] = useState([]);
  const [romaneios, setRomaneios] = useState([]);
  const [busca, setBusca] = useState('');
  
  // Modais
  const [modalNovoMaterial, setModalNovoMaterial] = useState(false);
  const [modalNovoPedido, setModalNovoPedido] = useState(false);
  const [modalEntrada, setModalEntrada] = useState(null);

  // Formulário Novo Material
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [categoria, setCategoria] = useState('Geral');
  const [unidade, setUnidade] = useState('un');
  const [quantidade, setQuantidade] = useState(0);
  const [estoqueMinimo, setEstoqueMinimo] = useState(5);
  const [precoCusto, setPrecoCusto] = useState(0);

  // Formulário Emitir Pedido
  const [requerente, setRequerente] = useState(REQUERENTES_PADRAO[0]);
  const [autorizacao, setAutorizacao] = useState('');
  const [itensSelecionados, setItensSelecionados] = useState({});
  const [qtdEntrada, setQtdEntrada] = useState(1);

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

  const toggleSelecaoMaterial = (id) => {
    setItensSelecionados(prev => {
      const atual = prev[id] || { selecionado: false, quantidade: 1 };
      return {
        ...prev,
        [id]: { ...atual, selecionado: !atual.selecionado }
      };
    });
  };

  const alterarQtdPedido = (id, qtd) => {
    setItensSelecionados(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { selecionado: true }),
        quantidade: Math.max(1, Number(qtd))
      }
    }));
  };

  const handleCadastrarMaterial = async (e) => {
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
    setModalNovoMaterial(false);
  };

  // Gerar Impressão / PDF do Romaneio
  const gerarPDFRomaneio = (dadosRomaneio) => {
    const janelaPrint = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>Romaneio de Carga #${dadosRomaneio.numeroSeq}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h2 { border-bottom: 2px solid #333; padding-bottom: 5px; }
            .info { margin-bottom: 20px; font-size: 14px; }
            .info p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; font-size: 13px; }
            th { background-color: #f4f4f4; }
            .footer { margin-top: 30px; font-size: 11px; text-align: center; color: #777; }
          </style>
        </head>
        <body>
          <h2>ROMANEIO DE CARGA - PEDIDO #${dadosRomaneio.numeroSeq}</h2>
          <div class="info">
            <p><strong>Data e Hora:</strong> ${new Date(dadosRomaneio.data).toLocaleString('pt-BR')}</p>
            <p><strong>Órgão Requisitante:</strong> ${dadosRomaneio.requerente}</p>
            <p><strong>Responsável pela Aprovação:</strong> ${dadosRomaneio.autorizacao}</p>
          </div>
          <h3>Materiais Requisitados</h3>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Material</th>
                <th>Unidade</th>
                <th>Quantidade</th>
              </tr>
            </thead>
            <tbody>
              ${dadosRomaneio.itens.map(i => `
                <tr>
                  <td>${i.codigo || 'N/A'}</td>
                  <td>${i.nome}</td>
                  <td>${i.unidade}</td>
                  <td><strong>${i.quantidadeSolicitada}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            Documento gerado automaticamente pelo Sistema de Controle de Estoque & Romaneios.
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;
    janelaPrint.document.write(html);
    janelaPrint.document.close();
  };

  const handleEmitirPedido = async (e) => {
    e.preventDefault();
    
    const itensParaPedido = materiais
      .filter(m => itensSelecionados[m.id]?.selecionado)
      .map(m => ({
        materialId: m.id,
        nome: m.nome,
        codigo: m.codigo,
        unidade: m.unidade,
        quantidadeSolicitada: itensSelecionados[m.id]?.quantidade || 1
      }));

    if (itensParaPedido.length === 0) {
      alert("Selecione pelo menos um material marcando a caixa de seleção.");
      return;
    }

    if (!autorizacao) {
      alert("Preencha o responsável pela aprovação.");
      return;
    }

    for (const item of itensParaPedido) {
      const matOriginal = materiais.find(m => m.id === item.materialId);
      if (matOriginal) {
        const novaQtd = Math.max(0, matOriginal.quantidade - item.quantidadeSolicitada);
        await updateDoc(doc(db, 'materiais', matOriginal.id), { quantidade: novaQtd });
      }
    }

    const numeroSeq = Math.floor(1000 + Math.random() * 9000);
    const dataAtual = new Date().toISOString();

    const novoRomaneio = {
      numeroSeq,
      requerente,
      autorizacao,
      itens: itensParaPedido,
      data: dataAtual
    };

    await addDoc(collection(db, 'romaneios'), novoRomaneio);

    // Dispara a geração automática do PDF do Romaneio
    gerarPDFRomaneio(novoRomaneio);

    setItensSelecionados({});
    setAutorizacao('');
    setModalNovoPedido(false);
  };

  const handleEntradaRapida = async (e) => {
    e.preventDefault();
    if (!modalEntrada || qtdEntrada <= 0) return;

    const novaQtd = Number(modalEntrada.quantidade) + Number(qtdEntrada);
    await updateDoc(doc(db, 'materiais', modalEntrada.id), { quantidade: novaQtd });

    setModalEntrada(null);
    setQtdEntrada(1);
  };

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
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wide">Visão Geral Do Estoque</h1>
          <p className="text-slate-400 text-sm mt-1">Gerenciamento de materiais e emissão de Romaneios de Carga</p>
        </div>

        {/* BOTOES DE AÇÃO PRINCIPAIS (Com Destaque no Novo Pedido) */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setModalNovoMaterial(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-lg shadow-md transition-all text-sm"
          >
            <Plus size={18} /> Novo Material
          </button>
          
          <button 
            onClick={() => setModalNovoPedido(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-lg shadow-xl ring-2 ring-emerald-400/50 transition-all text-sm animate-pulse"
          >
            <FileText size={18} /> + Novo Pedido
          </button>
        </div>
      </div>

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
          <p className="text-xs text-slate-500 mt-2">Calculado por preço de custo</p>
        </div>

        <div className="bg-[#111827] border border-amber-900/40 p-5 rounded-xl shadow-md">
          <span className="text-xs font-medium text-amber-400/90 uppercase tracking-wider">Alertas de Estoque Baixo</span>
          <div className="text-3xl font-extrabold text-amber-400 mt-2">{totalCriticos}</div>
          <a href="#criticos" className="text-xs font-semibold text-amber-400 hover:underline mt-2 inline-block">Ver materiais críticos →</a>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-5 rounded-xl shadow-md">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Romaneios Emitidos</span>
          <div className="text-3xl font-extrabold text-white mt-2">{romaneios.length}</div>
          <p className="text-xs text-slate-500 mt-2">Documentos gerados na nuvem</p>
        </div>
      </div>

      {/* MATERIAIS CRÍTICOS */}
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
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="Buscar por nome ou código..."
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
                <th className="py-3 px-4">Preço Custo (R$)</th>
                <th className="py-3 px-4">Total (R$)</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {materiaisFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">Nenhum material encontrado.</td>
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
                          + Entrada
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

      {/* HISTÓRICO DE ROMANEIOS */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 shadow-md">
        <h2 className="text-xl font-bold text-white mb-4">Romaneios de Carga Emitidos</h2>
        <div className="space-y-4">
          {romaneios.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">Nenhum romaneio gerado ainda.</p>
          ) : (
            romaneios.map((r) => (
              <div key={r.id} className="bg-[#1a2332] p-4 rounded-lg border border-slate-800 text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold text-base">Romaneio #{r.numeroSeq || r.id.substring(0, 4)}</span>
                    <span className="text-xs text-slate-400">({new Date(r.data).toLocaleString('pt-BR')})</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-1 text-xs text-slate-300">
                    <span className="flex items-center gap-1"><User size={13} className="text-slate-400" /> Requerente: <strong>{r.requerente}</strong></span>
                    <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-emerald-400" /> Aprovação: <strong>{r.autorizacao}</strong></span>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    Itens: {r.itens.map(i => `${i.quantidadeString || i.quantidadeSolicitada} ${i.unidade} de ${i.nome}`).join(' | ')}
                  </div>
                </div>
                <button 
                  onClick={() => gerarPDFRomaneio(r)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 font-semibold whitespace-nowrap"
                >
                  <Printer size={14} /> Re ดmprimir PDF
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* JANELA / MODAL: EMITIR PEDIDO */}
      {modalNovoPedido && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <h3 className="text-xl font-bold text-white mb-1">Emitir Pedido</h3>
            <p className="text-xs text-slate-400 mb-4">Preencha os dados e selecione os materiais para gerar o romaneio de carga.</p>

            <form onSubmit={handleEmitirPedido} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Órgão Requisitante *</label>
                  <select 
                    value={requerente} onChange={e => setRequerente(e.target.value)}
                    className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {REQUERENTES_PADRAO.map((req, idx) => (
                      <option key={idx} value={req}>{req}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Responsável pela Aprovação * (Texto Livre)</label>
                  <input 
                    type="text" required value={autorizacao} onChange={e => setAutorizacao(e.target.value)}
                    placeholder="Ex: Carlos Engenheiro"
                    className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* LISTA DE MATERIAIS COM CHECKBOXES */}
              <div className="bg-[#1a2332] p-4 rounded-xl border border-slate-700/80">
                <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">
                  Selecione os Materiais para o Pedido
                </label>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {materiais.length === 0 ? (
                    <p className="text-xs text-slate-500">Nenhum material cadastrado.</p>
                  ) : (
                    materiais.map((m) => {
                      const itemState = itensSelecionados[m.id] || { selecionado: false, quantidade: 1 };
                      return (
                        <div key={m.id} className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${itemState.selecionado ? 'bg-emerald-950/30 border-emerald-700/60' : 'bg-[#111827] border-slate-800'}`}>
                          <div 
                            onClick={() => toggleSelecaoMaterial(m.id)}
                            className="flex items-center gap-3 cursor-pointer flex-1"
                          >
                            {itemState.selecionado ? (
                              <CheckSquare size={20} className="text-emerald-400" />
                            ) : (
                              <Square size={20} className="text-slate-500" />
                            )}
                            <div>
                              <div className="text-sm font-semibold text-white">{m.nome}</div>
                              <div className="text-xs text-slate-400">Estoque atual: <span className="text-slate-200 font-bold">{m.quantidade} {m.unidade}</span></div>
                            </div>
                          </div>

                          {itemState.selecionado && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">Qtd:</span>
                              <input 
                                type="number" min="1" max={m.quantidade}
                                value={itemState.quantidade}
                                onChange={(e) => alterarQtdPedido(m.id, e.target.value)}
                                className="w-20 bg-[#1a2332] border border-slate-600 rounded px-2 py-1 text-sm text-white font-bold text-center focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" onClick={() => setModalNovoPedido(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-lg text-sm flex items-center gap-2 shadow-xl"
                >
                  <CheckCircle2 size={18} /> Emitir Pedido e Gerar Romaneio PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JANELA / MODAL: NOVO MATERIAL */}
      {modalNovoMaterial && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Cadastrar Novo Material</h3>
            <form onSubmit={handleCadastrarMaterial} className="space-y-4">
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Preço de Custo Unitário (R$)</label>
                <input 
                  type="number" step="0.01" value={precoCusto} onChange={e => setPrecoCusto(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#1a2332] border border-slate-700 rounded-lg p-2.5 text-sm text-emerald-400 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" onClick={() => setModalNovoMaterial(false)}
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

      {/* JANELA / MODAL: ENTRADA RÁPIDA */}
      {modalEntrada && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Entrada de Estoque</h3>
            <p className="text-sm text-slate-400 mb-4">{modalEntrada.nome} (Atual: {modalEntrada.quantidade} {modalEntrada.unidade})</p>

            <form onSubmit={handleEntradaRapida} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Quantidade a Adicionar</label>
                <input 
                  type="number" min="1" required value={qtdEntrada} onChange={e => setQtdEntrada(e.target.value)}
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
