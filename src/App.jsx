import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  Package,
  Plus,
  FileText,
  TrendingDown,
  DollarSign,
  Search,
  Printer,
  Trash2,
  ArrowUpCircle,
  CheckSquare,
  Square,
  X,
  ClipboardList,
  AlertTriangle,
  RotateCcw,
  Ban,
  LogOut,
} from "lucide-react";

// ============================================================================
// 1. CONFIGURAÇÃO DO FIREBASE
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCeh9ZEahPyE96dAaIEuSAFuWcUZy4Ic0Q",
  authDomain: "estoquemateriaisdm.firebaseapp.com",
  projectId: "estoquemateriaisdm",
  storageBucket: "estoquemateriaisdm.firebasestorage.app",
  messagingSenderId: "179010484922",
  appId: "1:179010484922:web:93afe7e7221e8f1969e083",
  measurementId: "G-B4B8EZJN2L",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Lista oficial de Requerentes / Destinos
const LISTA_REQUERENTES = [
  "INTENDÊNCIA DE CANASVIEIRAS",
  "INTENDÊNCIA DE RATONES",
  "INTENDÊNCIA DA CACHOEIRA DO BOM JESUS",
  "INTENDÊNCIA DE SANTO ANTONIO DE LISBOA",
  "INTENDÊNCIA DOS INGLESES",
  "INTENDÊNCIA DA TAPERA",
  "INTENDÊNCIA DO CAMPECHE",
  "INTENDÊNCIA DO RIBEIRAO DA ILHA",
  "INTENDÊNCIA DO PANTANO DO SUL",
  "INTENDÊNCIA DO RIO VERMELHO",
  "INTENDÊNCIA DA BARRA DA LAGOA",
  "INTENDÊNCIA DA LAGOA DA CONCEIÇÃO",
  "INTENDÊNCIA DO SACO DOS LIMÕES",
  "INTENDÊNCIA DO CENTRO",
  "INTENDÊNCIA DO SACO GRANDE",
  "INTENDÊNCIA DA TRINDADE",
  "INTENDÊNCIA VARG GRANDE E VARG DO BOM JESUS",
  "DIRETORIA DE MANUTENÇÃO",
  "DIRETORIA DE SERVIÇOS",
];

export default function App() {
  // Estados de Autenticação
  const [user, setUser] = useState(null);
  const [verificandoAuth, setVerificandoAuth] = useState(true);

  // Estados principais sincronizados com o Firestore
  const [materiais, setMateriais] = useState([]);
  const [romaneios, setRomaneios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("estoque"); // "estoque" | "romaneios"
  const [busca, setBusca] = useState("");
  const [processandoPedido, setProcessandoPedido] = useState(false);
  const [estornandoId, setEstornandoId] = useState(null);

  // Estados dos Modais
  const [modalNovoMaterial, setModalNovoMaterial] = useState(false);
  const [modalEntradaRapida, setModalEntradaRapida] = useState(false);
  const [modalNovoPedido, setModalNovoPedido] = useState(false);

  // Estado do formulário de Novo Material
  const [novoMaterial, setNovoMaterial] = useState({
    codigo: "",
    nome: "",
    categoria: "Infraestrutura / Drenagem",
    unidade: "UN",
    quantidade: "",
    estoqueMinimo: "",
    preco: "",
  });

  // Estado de Entrada Rápida de Estoque
  const [entradaMaterialId, setEntradaMaterialId] = useState("");
  const [entradaQtd, setEntradaQtd] = useState("");

  // Estados de Novo Pedido / Emissão de Romaneio
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [requerente, setRequerente] = useState(LISTA_REQUERENTES[0]);
  const [autorizacao, setAutorizacao] = useState("");

  // ==========================================================================
  // 2. MONITORAMENTO DE AUTENTICAÇÃO E FIRESTORE
  // ==========================================================================
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (usuarioAtual) => {
      setUser(usuarioAtual);
      setVerificandoAuth(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const qMateriais = query(collection(db, "materiais"));
    const unsubscribeMateriais = onSnapshot(
      qMateriais,
      (snapshot) => {
        const lista = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));
        lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        setMateriais(lista);
        setCarregando(false);
      },
      (erro) => {
        console.error("Erro ao sincronizar materiais:", erro);
        setCarregando(false);
      }
    );

    const qRomaneios = query(collection(db, "romaneios"), orderBy("dataEmissao", "desc"));
    const unsubscribeRomaneios = onSnapshot(
      qRomaneios,
      (snapshot) => {
        const lista = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));
        setRomaneios(lista);
      },
      (erro) => console.error("Erro ao sincronizar romaneios:", erro)
    );

    return () => {
      unsubscribeMateriais();
      unsubscribeRomaneios();
    };
  }, [user]);

  // ==========================================================================
  // 3. FUNÇÕES DE LOGIN / LOGOUT
  // ==========================================================================
  const handleLoginGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro ao fazer login com Google:", error);
      alert("Erro ao fazer login. Certifique-se de autorizar o domínio no console do Firebase.");
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Deseja realmente sair do sistema?")) {
      await signOut(auth);
    }
  };

  // ==========================================================================
  // 4. INDICADORES DO DASHBOARD
  // ==========================================================================
  const indicadores = useMemo(() => {
    const totalItens = materiais.length;
    const estoqueBaixo = materiais.filter(
      (m) => Number(m.quantidade || 0) <= Number(m.estoqueMinimo || 0)
    ).length;
    const valorTotalEstoque = materiais.reduce(
      (acc, m) => acc + Number(m.quantidade || 0) * Number(m.preco || 0),
      0
    );
    const romaneiosAtivos = romaneios.filter((r) => r.status !== "cancelado").length;

    return {
      totalItens,
      estoqueBaixo,
      valorTotalEstoque,
      totalRomaneios: romaneiosAtivos,
    };
  }, [materiais, romaneios]);

  const materiaisFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return materiais;
    return materiais.filter(
      (m) =>
        (m.nome || "").toLowerCase().includes(termo) ||
        (m.codigo || "").toLowerCase().includes(termo) ||
        (m.categoria || "").toLowerCase().includes(termo)
    );
  }, [materiais, busca]);

  // ==========================================================================
  // 5. CADASTRO, ENTRADA RÁPIDA E EXCLUSÃO DE MATERIAIS
  // ==========================================================================
  const handleCadastrarMaterial = async (e) => {
    e.preventDefault();
    if (!novoMaterial.nome.trim()) return alert("Informe o nome do material.");

    try {
      await addDoc(collection(db, "materiais"), {
        codigo: novoMaterial.codigo.trim() || `MAT-${String(Date.now()).slice(-4)}`,
        nome: novoMaterial.nome.trim(),
        categoria: novoMaterial.categoria,
        unidade: novoMaterial.unidade.trim() || "UN",
        quantidade: Number(novoMaterial.quantidade || 0),
        estoqueMinimo: Number(novoMaterial.estoqueMinimo || 0),
        preco: Number(String(novoMaterial.preco).replace(",", ".") || 0),
        criadoPor: user.email,
        criadoEm: serverTimestamp(),
      });

      setNovoMaterial({
        codigo: "",
        nome: "",
        categoria: "Infraestrutura / Drenagem",
        unidade: "UN",
        quantidade: "",
        estoqueMinimo: "",
        preco: "",
      });
      setModalNovoMaterial(false);
    } catch (erro) {
      console.error("Erro ao cadastrar material:", erro);
      alert("Erro ao salvar material no Firestore: " + erro.message);
    }
  };

  const handleEntradaRapida = async (e) => {
    e.preventDefault();
    const qtdAdicionar = Number(entradaQtd);
    if (!entradaMaterialId || qtdAdicionar <= 0) {
      return alert("Selecione um material e informe uma quantidade válida.");
    }

    const materialAlvo = materiais.find((m) => m.id === entradaMaterialId);
    if (!materialAlvo) return;

    try {
      const novoSaldo = Number(materialAlvo.quantidade || 0) + qtdAdicionar;
      await updateDoc(doc(db, "materiais", String(entradaMaterialId)), {
        quantidade: novoSaldo,
        ultimaMovimentacao: serverTimestamp(),
        movimentadoPor: user.email,
      });
      setEntradaMaterialId("");
      setEntradaQtd("");
      setModalEntradaRapida(false);
    } catch (erro) {
      console.error("Erro na entrada rápida:", erro);
      alert("Não foi possível atualizar o estoque: " + erro.message);
    }
  };

  const handleExcluirMaterial = async (id, nome) => {
    if (!window.confirm(`Deseja realmente excluir o material "${nome}"?`)) return;
    try {
      await deleteDoc(doc(db, "materiais", String(id)));
    } catch (erro) {
      console.error("Erro ao excluir:", erro);
      alert("Erro ao excluir material: " + erro.message);
    }
  };

  // ==========================================================================
  // 6. LÓGICA DE PEDIDOS E PDF COM LOGO ORIGINAL
  // ==========================================================================
  const toggleSelecaoMaterial = (material) => {
    setItensSelecionados((prev) => {
      const existe = prev.find((item) => item.id === material.id);
      if (existe) {
        return prev.filter((item) => item.id !== material.id);
      } else {
        return [
          ...prev,
          {
            id: material.id,
            codigo: material.codigo || "-",
            nome: material.nome || "Material sem nome",
            unidade: material.unidade || "UN",
            estoqueAtual: Number(material.quantidade || 0),
            precoUnitario: Number(material.preco || 0),
            qtdPedido: 1,
          },
        ];
      }
    });
  };

  const alterarQtdPedido = (id, novaQtd) => {
    const valorNumerico = Math.max(0, Number(novaQtd));
    setItensSelecionados((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qtdPedido: valorNumerico } : item))
    );
  };

  const gerarPDFRomaneio = (dadosRomaneio) => {
    const dataFormatada = dadosRomaneio.dataEmissao
      ? new Date(dadosRomaneio.dataEmissao).toLocaleString("pt-BR")
      : new Date().toLocaleString("pt-BR");

    const estaCancelado = dadosRomaneio.status === "cancelado";
    const tarjaCancelado = estaCancelado
      ? `<div style="background:#fef2f2;border:2px solid #dc2626;color:#991b1b;padding:10px 14px;border-radius:6px;margin-bottom:16px;font-weight:bold;text-align:center;">
          DOCUMENTO CANCELADO E ESTORNADO AO ESTOQUE
          ${dadosRomaneio.motivoCancelamento ? `<br/><span style="font-weight:normal;font-size:12px;">Motivo: ${dadosRomaneio.motivoCancelamento}</span>` : ""}
        </div>`
      : "";

    const linhasTabela = (dadosRomaneio.itens || [])
      .map(
        (item, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="text-align: center;">${item.codigo || "-"}</td>
          <td>${item.nome}</td>
          <td style="text-align: center;">${item.unidade}</td>
          <td style="text-align: right;">${Number(item.qtdPedido)}</td>
          <td style="text-align: right;">R$ ${Number(item.precoUnitario || 0).toFixed(2)}</td>
          <td style="text-align: right;">R$ ${(Number(item.qtdPedido) * Number(item.precoUnitario || 0)).toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Romaneio #${dadosRomaneio.numeroRomaneio}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; padding: 28px; color: #111827; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 20px; }
          .logo-pdf { height: 60px; max-width: 260px; object-fit: contain; }
          .meta { background: #f9fafb; border: 1px solid #d1d5db; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 12px; }
          th { background-color: #f3f4f6; text-align: left; font-weight: bold; }
          .total { text-align: right; font-size: 15px; font-weight: bold; margin-top: 16px; }
          .assinaturas { display: flex; justify-content: space-between; margin-top: 70px; text-align: center; }
          .ass-box { width: 44%; border-top: 1px solid #111827; padding-top: 8px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 16px;">
            <img src="/logo-prefeitura.jpg" class="logo-pdf" alt="Prefeitura de Florianópolis" onerror="this.style.display='none'" />
            <div>
              <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">Romaneio de Carga e Saída</h2>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #4b5563;">Secretaria de Infraestrutura e Manutenção da Cidade</p>
            </div>
          </div>
          <div style="text-align: right;">
            <h3 style="margin: 0; font-size: 18px;">Nº ${dadosRomaneio.numeroRomaneio}</h3>
            <p style="margin: 4px 0 0 0; font-size: 12px;">Data: ${dataFormatada}</p>
          </div>
        </div>

        ${tarjaCancelado}

        <div class="meta">
          <p style="margin: 4px 0;"><strong>Requerente / Destino da Obra:</strong> ${dadosRomaneio.requerente}</p>
          <p style="margin: 4px 0;"><strong>Autorizado por:</strong> ${dadosRomaneio.autorizacao}</p>
          <p style="margin: 4px 0;"><strong>Emitido por:</strong> ${dadosRomaneio.emitidoPorNome || "Almoxarifado"} (${dadosRomaneio.emitidoPorEmail || "N/A"})</p>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 36px; text-align: center;">#</th>
              <th style="width: 85px; text-align: center;">Código</th>
              <th>Especificação do Material</th>
              <th style="width: 55px; text-align: center;">Unid.</th>
              <th style="width: 70px; text-align: right;">Qtd.</th>
              <th style="width: 95px; text-align: right;">Vlr. Unit.</th>
              <th style="width: 105px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${linhasTabela}</tbody>
        </table>

        <div class="total">Valor Total do Romaneio: R$ ${Number(dadosRomaneio.valorTotal || 0).toFixed(2)}</div>

        <div class="assinaturas">
          <div class="ass-box">Expedição / Almoxarifado (${dadosRomaneio.autorizacao})</div>
          <div class="ass-box">Recebido por (${dadosRomaneio.requerente})</div>
        </div>

        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 350); };
        </script>
      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    } else {
      alert("Permita pop-ups no navegador para imprimir o romaneio.");
    }
  };

  const handleEmitirPedido = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (processandoPedido) return;

    if (!requerente.trim() || !autorizacao.trim()) return alert("Preencha Requerente e Autorização.");

    const itensValidos = itensSelecionados.filter((item) => Number(item.qtdPedido) > 0);
    if (itensValidos.length === 0) return alert("Selecione ao menos um material com quantidade válida.");

    for (const item of itensValidos) {
      const matBanco = materiais.find((m) => m.id === item.id);
      const saldoAtual = Number(matBanco?.quantidade ?? item.estoqueAtual ?? 0);
      if (Number(item.qtdPedido) > saldoAtual) {
        return alert(`Estoque insuficiente para "${item.nome}". Disponível: ${saldoAtual}, Solicitado: ${item.qtdPedido}.`);
      }
    }

    setProcessandoPedido(true);

    try {
      const batch = writeBatch(db);

      for (const item of itensValidos) {
        const matBanco = materiais.find((m) => m.id === item.id);
        const saldoAtual = Number(matBanco?.quantidade ?? item.estoqueAtual ?? 0);
        const materialRef = doc(db, "materiais", String(item.id));
        batch.update(materialRef, {
          quantidade: Math.max(0, saldoAtual - Number(item.qtdPedido)),
          ultimaMovimentacao: serverTimestamp(),
        });
      }

      const numeroRomaneio = String(Date.now()).slice(-6);
      const valorTotal = itensValidos.reduce((acc, item) => acc + Number(item.qtdPedido) * Number(item.precoUnitario || 0), 0);

      const novoRomaneioRef = doc(collection(db, "romaneios"));
      const dadosRomaneio = {
        numeroRomaneio,
        requerente: requerente.trim(),
        autorizacao: autorizacao.trim(),
        itens: itensValidos.map((i) => ({ ...i, precoUnitario: Number(i.precoUnitario || 0) })),
        valorTotal: Number(valorTotal || 0),
        status: "emitido",
        emitidoPorNome: user.displayName || "Usuário",
        emitidoPorEmail: user.email,
        dataEmissao: new Date().toISOString(),
        criadoEm: serverTimestamp(),
      };

      batch.set(novoRomaneioRef, dadosRomaneio);
      await batch.commit();

      setItensSelecionados([]);
      setRequerente(LISTA_REQUERENTES[0]);
      setAutorizacao("");
      setModalNovoPedido(false);
      setProcessandoPedido(false);
      gerarPDFRomaneio(dadosRomaneio);
    } catch (erro) {
      console.error("Erro ao emitir romaneio:", erro);
      setProcessandoPedido(false);
      alert("Erro ao gravar romaneio: " + erro.message);
    }
  };

  const handleCancelarRomaneio = async (romaneio) => {
    if (romaneio.status === "cancelado") return alert("Romaneio já cancelado e estornado.");
    const motivo = window.prompt("Confirma o CANCELAMENTO e ESTORNO?\nInforme o motivo:", "Devolução / Erro");
    if (motivo === null) return;

    setEstornandoId(romaneio.id);
    try {
      const batch = writeBatch(db);
      for (const item of romaneio.itens || []) {
        const materialAtual = materiais.find((m) => m.id === item.id);
        if (materialAtual) {
          const materialRef = doc(db, "materiais", String(item.id));
          batch.update(materialRef, {
            quantidade: Number(materialAtual.quantidade || 0) + Number(item.qtdPedido || 0),
            ultimaMovimentacao: serverTimestamp(),
          });
        }
      }

      const romaneioRef = doc(db, "romaneios", String(romaneio.id));
      batch.update(romaneioRef, {
        status: "cancelado",
        motivoCancelamento: motivo.trim() || "Cancelado pelo usuário",
        canceladoPor: user.email,
        dataCancelamento: new Date().toISOString(),
        canceladoEm: serverTimestamp(),
      });

      await batch.commit();
      alert("Romaneio cancelado com sucesso!");
    } catch (erro) {
      console.error("Erro ao estornar romaneio:", erro);
      alert("Erro ao estornar: " + erro.message);
    } finally {
      setEstornandoId(null);
    }
  };

  // ==========================================================================
  // TELA DE CARREGAMENTO & LOGIN
  // ==========================================================================
  if (verificandoAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Carregando sistema...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="flex justify-center mb-2">
            <img
              src="/logo-prefeitura.jpg"
              alt="Prefeitura de Florianópolis"
              className="h-16 w-auto object-contain"
              style={{
                filter: "brightness(0) invert(1)",
                mixBlendMode: "screen",
              }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Acesso ao Almoxarifado</h1>
            <p className="text-slate-400 text-sm">Controle de Materiais, Pedidos e Romaneios</p>
          </div>
          <button
            onClick={handleLoginGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3.5 px-4 rounded-xl transition shadow-lg"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // INTERFACE PRINCIPAL (DASHBOARD)
  // ==========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* CABEÇALHO COM LOGO 100% BRANCA */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center gap-5">
            <div className="flex items-center">
              <img
                src="/logo-prefeitura.jpg"
                alt="Prefeitura de Florianópolis"
                className="h-14 sm:h-16 w-auto object-contain"
                style={{
                  filter: "brightness(0) invert(1)",
                  mixBlendMode: "screen",
                }}
              />
            </div>
            <div className="border-l border-slate-800 pl-4 hidden sm:block">
              <h1 className="text-lg font-bold text-white uppercase tracking-tight">Controle de Materiais & Romaneios</h1>
              <p className="text-xs text-slate-400">Secretaria de Infraestrutura e Manutenção</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Informações do Usuário */}
            <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-white leading-tight">{user.displayName || "Usuário"}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
              <img src={user.photoURL || "https://www.svgrepo.com/show/311063/person.svg"} alt="Avatar" className="w-9 h-9 rounded-full border border-slate-700 object-cover" />
              <div className="w-px h-8 bg-slate-800 mx-1"></div>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 p-1 transition" title="Sair do sistema">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* BOTÕES DE AÇÃO */}
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setModalNovoMaterial(true)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium border border-slate-700 transition">
            <Plus className="w-4 h-4" /> Novo Material
          </button>
          <button onClick={() => setModalEntradaRapida(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-sm font-medium transition">
            <ArrowUpCircle className="w-4 h-4" /> Entrada Rápida
          </button>
          <button onClick={() => setModalNovoPedido(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/30 transition">
            <FileText className="w-4 h-4" /> Novo Pedido / Romaneio
          </button>
        </div>

        {/* CARDS DE INDICADORES */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">Materiais Cadastrados</p>
              <p className="text-2xl font-bold mt-1">{indicadores.totalItens}</p>
            </div>
            <Package className="w-8 h-8 text-blue-400 opacity-80" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">Estoque Baixo</p>
              <p className="text-2xl font-bold mt-1 text-amber-400">{indicadores.estoqueBaixo}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-amber-400 opacity-80" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">Valor em Estoque</p>
              <p className="text-2xl font-bold mt-1 text-emerald-400">R$ {indicadores.valorTotalEstoque.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-400 opacity-80" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">Romaneios Ativos</p>
              <p className="text-2xl font-bold mt-1 text-purple-400">{indicadores.totalRomaneios}</p>
            </div>
            <ClipboardList className="w-8 h-8 text-purple-400 opacity-80" />
          </div>
        </section>

        {/* NAVEGAÇÃO E BUSCA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex gap-2">
            <button onClick={() => setAbaAtiva("estoque")} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${abaAtiva === "estoque" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>
              Estoque ({materiais.length})
            </button>
            <button onClick={() => setAbaAtiva("romaneios")} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${abaAtiva === "romaneios" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>
              Romaneios ({romaneios.length})
            </button>
          </div>
          {abaAtiva === "estoque" && (
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
          )}
        </div>

        {/* ABA ESTOQUE */}
        {abaAtiva === "estoque" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase">
                    <th className="py-3.5 px-4">Código</th>
                    <th className="py-3.5 px-4">Material</th>
                    <th className="py-3.5 px-4">Categoria</th>
                    <th className="py-3.5 px-4 text-center">Unid.</th>
                    <th className="py-3.5 px-4 text-right">Saldo</th>
                    <th className="py-3.5 px-4 text-right">Custo Un.</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {carregando ? (
                    <tr><td colSpan="8" className="py-8 text-center text-slate-400">Carregando...</td></tr>
                  ) : materiaisFiltrados.length === 0 ? (
                    <tr><td colSpan="8" className="py-8 text-center text-slate-400">Nenhum material encontrado.</td></tr>
                  ) : (
                    materiaisFiltrados.map((mat) => (
                      <tr key={mat.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono text-xs text-slate-400">{mat.codigo || "-"}</td>
                        <td className="py-3 px-4 font-medium text-white">{mat.nome}</td>
                        <td className="py-3 px-4 text-slate-400">{mat.categoria || "Geral"}</td>
                        <td className="py-3 px-4 text-center text-slate-300">{mat.unidade || "UN"}</td>
                        <td className="py-3 px-4 text-right font-semibold">{Number(mat.quantidade || 0)}</td>
                        <td className="py-3 px-4 text-right text-slate-300">R$ {Number(mat.preco || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">
                          {Number(mat.quantidade || 0) <= Number(mat.estoqueMinimo || 0) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300"><AlertTriangle className="w-3 h-3"/> Repor</span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300">Normal</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => handleExcluirMaterial(mat.id, mat.nome)} className="p-1.5 text-slate-400 hover:text-red-400 transition" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA ROMANEIOS */}
        {abaAtiva === "romaneios" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase">
                    <th className="py-3.5 px-4">Nº Romaneio</th>
                    <th className="py-3.5 px-4">Emissão</th>
                    <th className="py-3.5 px-4">Requerente / Destino</th>
                    <th className="py-3.5 px-4 text-center">Itens</th>
                    <th className="py-3.5 px-4 text-right">Total</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {romaneios.map((rom) => {
                    const cancelado = rom.status === "cancelado";
                    return (
                      <tr key={rom.id} className={`transition ${cancelado ? "bg-red-950/15 opacity-70" : "hover:bg-slate-800/40"}`}>
                        <td className="py-3 px-4 font-mono font-semibold text-blue-400">#{rom.numeroRomaneio}</td>
                        <td className="py-3 px-4 text-slate-300">{rom.dataEmissao ? new Date(rom.dataEmissao).toLocaleString("pt-BR") : "-"}</td>
                        <td className="py-3 px-4 font-medium text-white">{rom.requerente}</td>
                        <td className="py-3 px-4 text-center">{(rom.itens || []).length}</td>
                        <td className={`py-3 px-4 text-right font-semibold ${cancelado ? "line-through text-slate-500" : "text-emerald-400"}`}>R$ {Number(rom.valorTotal || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">
                          {cancelado ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300"><Ban className="w-3 h-3"/> Cancelado</span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300">Emitido</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                          <button onClick={() => gerarPDFRomaneio(rom)} className="px-3 py-1.5 bg-blue-600/20 text-blue-300 rounded-lg text-xs font-medium flex items-center gap-1"><Printer className="w-3.5 h-3.5"/> PDF</button>
                          {!cancelado && (
                            <button disabled={estornandoId === rom.id} onClick={() => handleCancelarRomaneio(rom)} className="px-3 py-1.5 bg-red-600/20 text-red-300 rounded-lg text-xs font-medium flex items-center gap-1">
                              <RotateCcw className="w-3.5 h-3.5"/> Estornar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: CADASTRAR MATERIAL */}
      {modalNovoMaterial && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold">Novo Material</h2>
              <button onClick={() => setModalNovoMaterial(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCadastrarMaterial} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Código</label>
                  <input type="text" value={novoMaterial.codigo} onChange={(e) => setNovoMaterial({ ...novoMaterial, codigo: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Unidade</label>
                  <input type="text" value={novoMaterial.unidade} onChange={(e) => setNovoMaterial({ ...novoMaterial, unidade: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Material *</label>
                <input type="text" required value={novoMaterial.nome} onChange={(e) => setNovoMaterial({ ...novoMaterial, nome: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Categoria</label>
                <input type="text" value={novoMaterial.categoria} onChange={(e) => setNovoMaterial({ ...novoMaterial, categoria: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Estoque</label>
                  <input type="number" min="0" value={novoMaterial.quantidade} onChange={(e) => setNovoMaterial({ ...novoMaterial, quantidade: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Mínimo</label>
                  <input type="number" min="0" value={novoMaterial.estoqueMinimo} onChange={(e) => setNovoMaterial({ ...novoMaterial, estoqueMinimo: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Preço</label>
                  <input type="number" step="0.01" min="0" value={novoMaterial.preco} onChange={(e) => setNovoMaterial({ ...novoMaterial, preco: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovoMaterial(false)} className="px-4 py-2 bg-slate-800 rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ENTRADA RÁPIDA */}
      {modalEntradaRapida && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold">Entrada Rápida</h2>
              <button onClick={() => setModalEntradaRapida(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleEntradaRapida} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Material</label>
                <select required value={entradaMaterialId} onChange={(e) => setEntradaMaterialId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm">
                  <option value="">-- Escolha --</option>
                  {materiais.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Qtd Adicionar</label>
                <input type="number" min="1" required value={entradaQtd} onChange={(e) => setEntradaQtd(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalEntradaRapida(false)} className="px-4 py-2 bg-slate-800 rounded-xl text-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: NOVO PEDIDO E ROMANEIO (COM DROPDOWN) */}
      {modalNovoPedido && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold">Emitir Romaneio</h2>
              </div>
              <button onClick={() => setModalNovoPedido(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleEmitirPedido} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Requerente / Destino *</label>
                  <select required value={requerente} onChange={(e) => setRequerente(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm">
                    {LISTA_REQUERENTES.map((req, idx) => (
                      <option key={idx} value={req}>{req}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Autorizado por *</label>
                  <input type="text" required value={autorizacao} onChange={(e) => setAutorizacao(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm" />
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-950 px-4 py-2.5 text-xs font-semibold uppercase text-slate-400 flex justify-between">
                  <span>Materiais</span>
                  <span>Selecionados: {itensSelecionados.length}</span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
                  {materiais.map((mat) => {
                    const itemMarcado = itensSelecionados.find((i) => i.id === mat.id);
                    const saldo = Number(mat.quantidade || 0);
                    return (
                      <div key={mat.id} className={`flex items-center justify-between px-4 py-3 text-sm ${itemMarcado ? "bg-blue-950/30" : "hover:bg-slate-800/40"} ${saldo <= 0 ? "opacity-50" : ""}`}>
                        <button type="button" disabled={saldo <= 0} onClick={() => toggleSelecaoMaterial(mat)} className="flex items-center gap-3 text-left flex-1">
                          {itemMarcado ? <CheckSquare className="w-5 h-5 text-blue-400" /> : <Square className="w-5 h-5 text-slate-500" />}
                          <div>
                            <p className="font-medium text-white">{mat.nome}</p>
                            <p className="text-xs text-slate-400">Saldo: {saldo} | R$ {Number(mat.preco || 0).toFixed(2)}</p>
                          </div>
                        </button>
                        {itemMarcado && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Qtd:</span>
                            <input type="number" min="1" max={saldo} value={itemMarcado.qtdPedido} onChange={(e) => alterarQtdPedido(mat.id, e.target.value)} className="w-24 bg-slate-950 border border-blue-500/50 rounded-lg px-2.5 py-1 text-right text-sm" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div className="text-sm">Total estimado: <strong className="text-emerald-400">R$ {itensSelecionados.reduce((acc, i) => acc + Number(i.qtdPedido) * Number(i.precoUnitario || 0), 0).toFixed(2)}</strong></div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModalNovoPedido(false)} className="px-4 py-2 bg-slate-800 rounded-xl text-sm">Cancelar</button>
                  <button type="submit" disabled={processandoPedido} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm flex items-center gap-2">
                    <Printer className="w-4 h-4" /> Emitir Romaneio
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
