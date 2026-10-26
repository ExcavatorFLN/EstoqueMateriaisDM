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
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
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
  RefreshCw,
  Upload,
  CheckCircle2,
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

// Filtro que deixa o fundo do JPG transparente e o brasão/letras 100% brancos
const estiloLogoBranca = {
  filter: "grayscale(100%) invert(100%) contrast(300%) brightness(1.15)",
  mixBlendMode: "screen",
};

// ============================================================================
// BASE INICIAL DE INSUMOS SINAPI/SC (Infraestrutura, Drenagem e Pavimentação)
// Pode ser expandida a qualquer momento importando o CSV oficial da Caixa/SC
// ============================================================================
const CATALOGO_SINAPI_SC_PADRAO = {
  "00000370": {
    nome: "AREIA MEDIA - POSTO JAZIDA/FORNECEDOR (RETIRADO NA JAZIDA, SEM TRANSPORTE)",
    unidade: "M3",
    preco: 115.0,
    categoria: "Agregados / Infraestrutura",
  },
  "00004721": {
    nome: "PEDRA BRITADA N. 1 (9,5 A 19 MM) POSTO PEDREIRA/FORNECEDOR, SEM FRETE",
    unidade: "M3",
    preco: 98.5,
    categoria: "Agregados / Infraestrutura",
  },
  "00004718": {
    nome: "PEDRA BRITADA N. 2 (19 A 38 MM) POSTO PEDREIRA/FORNECEDOR, SEM FRETE",
    unidade: "M3",
    preco: 96.0,
    categoria: "Agregados / Infraestrutura",
  },
  "00001379": {
    nome: "CIMENTO PORTLAND COMPOSTO CP II-32",
    unidade: "KG",
    preco: 0.78,
    categoria: "Aglomerantes / Alvenaria",
  },
  "00007778": {
    nome: "TUBO DE CONCRETO SIMPLES PARA AGUAS PLUVIAIS, CLASSE PS1, COM ENCAIXE PONTA E BOLSA, DN 400 MM",
    unidade: "M",
    preco: 94.2,
    categoria: "Infraestrutura / Drenagem",
  },
  "00007781": {
    nome: "TUBO DE CONCRETO SIMPLES PARA AGUAS PLUVIAIS, CLASSE PS1, COM ENCAIXE PONTA E BOLSA, DN 600 MM",
    unidade: "M",
    preco: 168.4,
    categoria: "Infraestrutura / Drenagem",
  },
  "00007762": {
    nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-1, COM ENCAIXE PONTA E BOLSA, DN 800 MM",
    unidade: "M",
    preco: 342.0,
    categoria: "Infraestrutura / Drenagem",
  },
  "00007765": {
    nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-1, COM ENCAIXE PONTA E BOLSA, DN 1000 MM",
    unidade: "M",
    preco: 495.0,
    categoria: "Infraestrutura / Drenagem",
  },
  "00004059": {
    nome: "MEIO-FIO OU GUIA DE CONCRETO, PRE-MOLDADO, COMP 1 M, 30 X 15/12 CM",
    unidade: "M",
    preco: 42.8,
    categoria: "Pavimentação / Urbanismo",
  },
  "00000685": {
    nome: "BLOCO DE CONCRETO ESTRUTURAL 14 X 19 X 39 CM, FBK 4,5 MPA (NBR 6136)",
    unidade: "UN",
    preco: 4.35,
    categoria: "Aglomerantes / Alvenaria",
  },
  "00007258": {
    nome: "TIJOLO CERAMICO MACICO 5 X 10 X 20 CM",
    unidade: "UN",
    preco: 0.95,
    categoria: "Aglomerantes / Alvenaria",
  },
  "00001518": {
    nome: "CONCRETO ASFALTICO USINADO A QUENTE (CBUQ) PARA CAPA DE ROLAMENTO",
    unidade: "T",
    preco: 485.0,
    categoria: "Pavimentação / Urbanismo",
  },
  "00002705": {
    nome: "EMULSAO ASFALTICA PARA IMPRIMACAO / PINTURA DE LIGACAO RR-1C",
    unidade: "KG",
    preco: 4.9,
    categoria: "Pavimentação / Urbanismo",
  },
  "00043132": {
    nome: "TAMPÃO DE FERRO FUNDIDO DÚCTIL PARA POÇO DE VISITA, ARTICULADO, CLASSE D400, DN 600 MM",
    unidade: "UN",
    preco: 620.0,
    categoria: "Infraestrutura / Drenagem",
  },
  "00003146": {
    nome: "GRELHA DE FERRO FUNDIDO PARA BOCA DE LOBO, 30 X 90 CM",
    unidade: "UN",
    preco: 385.0,
    categoria: "Infraestrutura / Drenagem",
  },
};

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

// Normaliza o código SINAPI (remove caracteres não numéricos e testa com e sem zeros à esquerda)
const normalizarCodigoSinapi = (valor) => String(valor || "").replace(/\D/g, "").trim();

export default function App() {
  // Estados de Autenticação
  const [user, setUser] = useState(null);
  const [verificandoAuth, setVerificandoAuth] = useState(true);
  const [lembrarDeMim, setLembrarDeMim] = useState(true);

  // Estados principais sincronizados com o Firestore
  const [materiais, setMateriais] = useState([]);
  const [romaneios, setRomaneios] = useState([]);
  const [catalogoSinapi, setCatalogoSinapi] = useState(CATALOGO_SINAPI_SC_PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("estoque"); // "estoque" | "romaneios"
  const [busca, setBusca] = useState("");
  const [processandoPedido, setProcessandoPedido] = useState(false);
  const [estornandoId, setEstornandoId] = useState(null);

  // Estados dos Modais
  const [modalNovoMaterial, setModalNovoMaterial] = useState(false);
  const [modalEntradaRapida, setModalEntradaRapida] = useState(false);
  const [modalNovoPedido, setModalNovoPedido] = useState(false);
  const [modalSinapi, setModalSinapi] = useState(false);

  // Estado do formulário de Novo Material (SOMENTE Código SINAPI, sem Código Interno)
  const [novoMaterial, setNovoMaterial] = useState({
    codigoSinapi: "",
    nome: "",
    categoria: "Infraestrutura / Drenagem",
    unidade: "",
    quantidade: "",
    estoqueMinimo: "",
    preco: "",
  });
  const [insumoEncontrado, setInsumoEncontrado] = useState(false);

  // Estado de Entrada Rápida de Estoque
  const [entradaMaterialId, setEntradaMaterialId] = useState("");
  const [entradaQtd, setEntradaQtd] = useState("");

  // Estados de Novo Pedido / Emissão de Romaneio
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [requerente, setRequerente] = useState(LISTA_REQUERENTES[0]);
  const [autorizacao, setAutorizacao] = useState("");

  // Estados da Tabela SINAPI/SC
  const [mesReferenciaSinapi, setMesReferenciaSinapi] = useState("10/2026");
  const [percentualSinapi, setPercentualSinapi] = useState("");
  const [processandoSinapi, setProcessandoSinapi] = useState(false);

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

    // 2.1. Sincroniza estoque de materiais
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

    // 2.2. Sincroniza histórico de romaneios
    const qRomaneios = query(
      collection(db, "romaneios"),
      orderBy("dataEmissao", "desc")
    );
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

    // 2.3. Sincroniza catálogo SINAPI/SC salvo no Firestore (quando importado via CSV)
    const qCatalogo = query(collection(db, "catalogo_sinapi_sc"));
    const unsubscribeCatalogo = onSnapshot(
      qCatalogo,
      (snapshot) => {
        if (!snapshot.empty) {
          const mapaRemoto = { ...CATALOGO_SINAPI_SC_PADRAO };
          snapshot.docs.forEach((docSnap) => {
            mapaRemoto[docSnap.id] = docSnap.data();
          });
          setCatalogoSinapi(mapaRemoto);
        }
      },
      (erro) => console.error("Erro ao carregar catálogo SINAPI/SC:", erro)
    );

    return () => {
      unsubscribeMateriais();
      unsubscribeRomaneios();
      unsubscribeCatalogo();
    };
  }, [user]);

  // ==========================================================================
  // 3. BUSCA AUTOMÁTICA NA TABELA SINAPI/SC AO DIGITAR O CÓDIGO
  // ==========================================================================
  const buscarInsumoNaTabelaSinapi = (codigoDigitado) => {
    const limpo = normalizarCodigoSinapi(codigoDigitado);
    if (!limpo) return null;

    const comOitoDigitos = limpo.padStart(8, "0");
    const semZerosEsquerda = String(Number(limpo));

    return (
      catalogoSinapi[limpo] ||
      catalogoSinapi[comOitoDigitos] ||
      catalogoSinapi[semZerosEsquerda] ||
      null
    );
  };

  const handleChangeCodigoSinapi = (valorDigitado) => {
    const itemSinapi = buscarInsumoNaTabelaSinapi(valorDigitado);

    if (itemSinapi) {
      setInsumoEncontrado(true);
      setNovoMaterial((prev) => ({
        ...prev,
        codigoSinapi: valorDigitado,
        nome: itemSinapi.nome,
        unidade: itemSinapi.unidade,
        preco: String(itemSinapi.preco),
        categoria: itemSinapi.categoria || prev.categoria,
      }));
    } else {
      setInsumoEncontrado(false);
      setNovoMaterial((prev) => ({
        ...prev,
        codigoSinapi: valorDigitado,
      }));
    }
  };

  // ==========================================================================
  // 4. FUNÇÕES DE LOGIN (COM "LEMBRAR DE MIM") E LOGOUT
  // ==========================================================================
  const handleLoginGoogle = async () => {
    try {
      const persistenciaEscolhida = lembrarDeMim
        ? browserLocalPersistence
        : browserSessionPersistence;

      await setPersistence(auth, persistenciaEscolhida);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro ao fazer login com Google:", error);
      alert(
        "Erro ao fazer login. Verifique se o domínio vercel.app está autorizado no Firebase."
      );
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Deseja realmente sair do sistema?")) {
      await signOut(auth);
    }
  };

  // ==========================================================================
  // 5. INDICADORES DO DASHBOARD
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
    const romaneiosAtivos = romaneios.filter(
      (r) => r.status !== "cancelado"
    ).length;

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
        (m.codigoSinapi || m.codigo || "").toLowerCase().includes(termo) ||
        (m.categoria || "").toLowerCase().includes(termo)
    );
  }, [materiais, busca]);

  // ==========================================================================
  // 6. CADASTRO POR CÓDIGO SINAPI, ENTRADA RÁPIDA E ATUALIZAÇÃO SINAPI/SC
  // ==========================================================================
  const handleCadastrarMaterial = async (e) => {
    e.preventDefault();
    const codFinal = normalizarCodigoSinapi(novoMaterial.codigoSinapi).padStart(
      8,
      "0"
    );

    if (!novoMaterial.codigoSinapi.trim()) {
      return alert("Digite o Código SINAPI do material.");
    }
    if (!novoMaterial.nome.trim()) {
      return alert(
        "Código SINAPI não localizado automaticamente. Importe a planilha SINAPI/SC atualizada ou preencha a descrição."
      );
    }

    try {
      await addDoc(collection(db, "materiais"), {
        codigoSinapi: codFinal,
        nome: novoMaterial.nome.trim(),
        categoria: novoMaterial.categoria,
        unidade: novoMaterial.unidade.trim() || "UN",
        quantidade: Number(novoMaterial.quantidade || 0),
        estoqueMinimo: Number(novoMaterial.estoqueMinimo || 0),
        preco: Number(String(novoMaterial.preco).replace(",", ".") || 0),
        referenciaPreco: `SINAPI/SC (${mesReferenciaSinapi})`,
        criadoPor: user.email,
        criadoEm: serverTimestamp(),
      });

      setNovoMaterial({
        codigoSinapi: "",
        nome: "",
        categoria: "Infraestrutura / Drenagem",
        unidade: "",
        quantidade: "",
        estoqueMinimo: "",
        preco: "",
      });
      setInsumoEncontrado(false);
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
    if (!window.confirm(`Deseja realmente excluir o material "${nome}"?`))
      return;
    try {
      await deleteDoc(doc(db, "materiais", String(id)));
    } catch (erro) {
      console.error("Erro ao excluir:", erro);
      alert("Erro ao excluir material: " + erro.message);
    }
  };

  // 6.1. Aplicar índice percentual mensal SINAPI/SC em lote
  const handleReajustePercentualSinapi = async (e) => {
    e.preventDefault();
    const perc = Number(String(percentualSinapi).replace(",", "."));
    if (isNaN(perc) || perc === 0) {
      return alert(
        "Informe um percentual válido de variação mensal SINAPI/SC (ex: 0.45 para +0,45%)."
      );
    }

    if (
      !window.confirm(
        `Confirma aplicar o reajuste SINAPI/SC de ${perc}% (Ref: ${mesReferenciaSinapi}) em todos os ${materiais.length} materiais do estoque?`
      )
    ) {
      return;
    }

    setProcessandoSinapi(true);
    try {
      const batch = writeBatch(db);
      const fator = 1 + perc / 100;

      for (const mat of materiais) {
        const precoAtual = Number(mat.preco || 0);
        const novoPreco = Number((precoAtual * fator).toFixed(2));
        const matRef = doc(db, "materiais", String(mat.id));
        batch.update(matRef, {
          preco: novoPreco,
          referenciaPreco: `SINAPI/SC ${mesReferenciaSinapi} (${perc > 0 ? "+" : ""}${perc}%)`,
          atualizadoPor: user.email,
          ultimaMovimentacao: serverTimestamp(),
        });
      }

      await batch.commit();
      setPercentualSinapi("");
      setModalSinapi(false);
      alert("Preços atualizados com sucesso pela variação mensal do SINAPI/SC!");
    } catch (erro) {
      console.error("Erro ao reajustar pelo SINAPI/SC:", erro);
      alert("Erro ao atualizar preços: " + erro.message);
    } finally {
      setProcessandoSinapi(false);
    }
  };

  // 6.2. Importar arquivo CSV da tabela SINAPI/SC (alimenta o autopreenchimento e atualiza o estoque)
  const handleImportarCSVSinapi = async (evento) => {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    setProcessandoSinapi(true);
    try {
      const texto = await arquivo.text();
      const linhas = texto.split(/\r?\n/);

      // Suporta CSV com colunas: Codigo;Descricao;Unidade;Preco ou Codigo;Preco
      const novoMapaCatalogo = { ...catalogoSinapi };
      let totalInsumosLidos = 0;

      for (const linha of linhas) {
        const colunas = linha
          .split(/[;\t]/)
          .map((c) => c.replace(/"/g, "").trim())
          .filter(Boolean);

        if (colunas.length >= 2) {
          const codLimpo = normalizarCodigoSinapi(colunas[0]);
          if (codLimpo && codLimpo.length >= 3) {
            const codPadrao = codLimpo.padStart(8, "0");
            const possivelPrecoStr = colunas[colunas.length - 1]
              .replace(/\./g, "")
              .replace(",", ".");
            const valorNum = Number(possivelPrecoStr);

            if (!isNaN(valorNum) && valorNum > 0) {
              const nomeInsumo =
                colunas.length >= 3 ? colunas[1] : novoMapaCatalogo[codPadrao]?.nome || `Insumo SINAPI ${codPadrao}`;
              const unidInsumo =
                colunas.length >= 4 ? colunas[2] : novoMapaCatalogo[codPadrao]?.unidade || "UN";

              novoMapaCatalogo[codPadrao] = {
                nome: nomeInsumo,
                unidade: unidInsumo,
                preco: valorNum,
                categoria: "Infraestrutura / SINAPI-SC",
              };
              totalInsumosLidos++;
            }
          }
        }
      }

      // Atualiza o catálogo em memória imediatamente para o autopreenchimento
      setCatalogoSinapi(novoMapaCatalogo);

      // Atualiza no Firestore o preço de todos os materiais já cadastrados no estoque
      const batch = writeBatch(db);
      let estoqueAtualizados = 0;

      for (const mat of materiais) {
        const codMat = normalizarCodigoSinapi(mat.codigoSinapi || mat.codigo).padStart(
          8,
          "0"
        );
        if (codMat && novoMapaCatalogo[codMat]) {
          const dadosOficiais = novoMapaCatalogo[codMat];
          const matRef = doc(db, "materiais", String(mat.id));
          batch.update(matRef, {
            codigoSinapi: codMat,
            nome: dadosOficiais.nome || mat.nome,
            unidade: dadosOficiais.unidade || mat.unidade,
            preco: dadosOficiais.preco,
            referenciaPreco: `SINAPI/SC (${mesReferenciaSinapi})`,
            atualizadoPor: user.email,
            ultimaMovimentacao: serverTimestamp(),
          });
          estoqueAtualizados++;
        }
      }

      if (estoqueAtualizados > 0) {
        await batch.commit();
      }

      alert(
        `Tabela SINAPI/SC (${mesReferenciaSinapi}) carregada!\n• ${totalInsumosLidos} códigos disponíveis para autopreenchimento.\n• ${estoqueAtualizados} materiais do estoque tiveram seus preços atualizados.`
      );
      setModalSinapi(false);
    } catch (erro) {
      console.error("Erro ao ler CSV SINAPI/SC:", erro);
      alert("Erro ao processar arquivo CSV SINAPI/SC: " + erro.message);
    } finally {
      setProcessandoSinapi(false);
      evento.target.value = "";
    }
  };

  // ==========================================================================
  // 7. LÓGICA DE PEDIDOS E ROMANEIO EM PDF (SEM VALORES FINANCEIROS)
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
            codigoSinapi: material.codigoSinapi || material.codigo || "-",
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
      prev.map((item) =>
        item.id === id ? { ...item, qtdPedido: valorNumerico } : item
      )
    );
  };

  // PDF do Romaneio exibindo o Código SINAPI e SEM valores financeiros
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
          <td style="text-align: center; font-family: monospace;">${item.codigoSinapi || item.codigo || "-"}</td>
          <td>${item.nome}</td>
          <td style="text-align: center;">${item.unidade}</td>
          <td style="text-align: right; font-weight: bold;">${Number(item.qtdPedido)}</td>
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
          .assinaturas { display: flex; justify-content: space-between; margin-top: 75px; text-align: center; }
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
          <p style="margin: 4px 0;"><strong>Registrado no sistema por:</strong> ${dadosRomaneio.emitidoPorNome || "Almoxarifado"} (${dadosRomaneio.emitidoPorEmail || "N/A"})</p>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 45px; text-align: center;">Item</th>
              <th style="width: 115px; text-align: center;">Código SINAPI</th>
              <th>Especificação do Material (SINAPI/SC)</th>
              <th style="width: 75px; text-align: center;">Unid.</th>
              <th style="width: 100px; text-align: right;">Quantidade</th>
            </tr>
          </thead>
          <tbody>${linhasTabela}</tbody>
        </table>

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

    if (!requerente.trim() || !autorizacao.trim())
      return alert("Preencha Requerente e Autorização.");

    const itensValidos = itensSelecionados.filter(
      (item) => Number(item.qtdPedido) > 0
    );
    if (itensValidos.length === 0)
      return alert("Selecione ao menos um material com quantidade válida.");

    for (const item of itensValidos) {
      const matBanco = materiais.find((m) => m.id === item.id);
      const saldoAtual = Number(matBanco?.quantidade ?? item.estoqueAtual ?? 0);
      if (Number(item.qtdPedido) > saldoAtual) {
        return alert(
          `Estoque insuficiente para "${item.nome}". Disponível: ${saldoAtual}, Solicitado: ${item.qtdPedido}.`
        );
      }
    }

    setProcessandoPedido(true);

    try {
      const batch = writeBatch(db);

      for (const item of itensValidos) {
        const matBanco = materiais.find((m) => m.id === item.id);
        const saldoAtual = Number(
          matBanco?.quantidade ?? item.estoqueAtual ?? 0
        );
        const materialRef = doc(db, "materiais", String(item.id));
        batch.update(materialRef, {
          quantidade: Math.max(0, saldoAtual - Number(item.qtdPedido)),
          ultimaMovimentacao: serverTimestamp(),
        });
      }

      const numeroRomaneio = String(Date.now()).slice(-6);
      const valorTotal = itensValidos.reduce(
        (acc, item) =>
          acc + Number(item.qtdPedido) * Number(item.precoUnitario || 0),
        0
      );

      const novoRomaneioRef = doc(collection(db, "romaneios"));
      const dadosRomaneio = {
        numeroRomaneio,
        requerente: requerente.trim(),
        autorizacao: autorizacao.trim(),
        itens: itensValidos.map((i) => ({
          ...i,
          precoUnitario: Number(i.precoUnitario || 0),
        })),
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
    if (romaneio.status === "cancelado")
      return alert("Romaneio já cancelado e estornado.");
    const motivo = window.prompt(
      "Confirma o CANCELAMENTO e ESTORNO?\nInforme o motivo:",
      "Devolução / Erro"
    );
    if (motivo === null) return;

    setEstornandoId(romaneio.id);
    try {
      const batch = writeBatch(db);
      for (const item of romaneio.itens || []) {
        const materialAtual = materiais.find((m) => m.id === item.id);
        if (materialAtual) {
          const materialRef = doc(db, "materiais", String(item.id));
          batch.update(materialRef, {
            quantidade:
              Number(materialAtual.quantidade || 0) +
              Number(item.qtdPedido || 0),
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
      alert("Romaneio cancelado e quantidades devolvidas ao estoque!");
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
              style={estiloLogoBranca}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Acesso ao Almoxarifado
            </h1>
            <p className="text-slate-400 text-sm">
              Controle de Materiais (SINAPI/SC), Pedidos e Romaneios
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              id="lembrarDeMim"
              checked={lembrarDeMim}
              onChange={(e) => setLembrarDeMim(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="lembrarDeMim" className="cursor-pointer select-none">
              Lembrar de mim neste navegador
            </label>
          </div>

          <button
            onClick={handleLoginGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3.5 px-4 rounded-xl transition shadow-lg"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              className="w-5 h-5"
              alt="Google"
            />
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
        {/* CABEÇALHO */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center gap-5">
            <div className="flex items-center">
              <img
                src="/logo-prefeitura.jpg"
                alt="Prefeitura de Florianópolis"
                className="h-14 sm:h-16 w-auto object-contain"
                style={estiloLogoBranca}
              />
            </div>
            <div className="border-l border-slate-800 pl-4 hidden sm:block">
              <h1 className="text-lg font-bold text-white uppercase tracking-tight">
                Controle de Materiais & Romaneios
              </h1>
              <p className="text-xs text-slate-400">
                Secretaria de Infraestrutura e Manutenção • Base SINAPI/SC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-white leading-tight">
                  {user.displayName || "Usuário"}
                </p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
              <img
                src={
                  user.photoURL ||
                  "https://www.svgrepo.com/show/311063/person.svg"
                }
                alt="Avatar"
                className="w-9 h-9 rounded-full border border-slate-700 object-cover"
              />
              <div className="w-px h-8 bg-slate-800 mx-1"></div>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-red-400 p-1 transition"
                title="Sair do sistema"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* BOTÕES DE AÇÃO */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setModalNovoMaterial(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium border border-slate-700 transition"
          >
            <Plus className="w-4 h-4" /> Incluir Material (SINAPI/SC)
          </button>
          <button
            onClick={() => setModalEntradaRapida(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-sm font-medium transition"
          >
            <ArrowUpCircle className="w-4 h-4" /> Entrada Rápida
          </button>
          <button
            onClick={() => setModalSinapi(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-xl text-sm font-medium transition"
          >
            <RefreshCw className="w-4 h-4" /> Tabela SINAPI/SC
          </button>
          <button
            onClick={() => setModalNovoPedido(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/30 transition"
          >
            <FileText className="w-4 h-4" /> Novo Pedido / Romaneio
          </button>
        </div>

        {/* CARDS DE INDICADORES */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">
                Materiais Cadastrados
              </p>
              <p className="text-2xl font-bold mt-1">{indicadores.totalItens}</p>
            </div>
            <Package className="w-8 h-8 text-blue-400 opacity-80" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">
                Estoque Baixo
              </p>
              <p className="text-2xl font-bold mt-1 text-amber-400">
                {indicadores.estoqueBaixo}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-amber-400 opacity-80" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">
                Valor em Estoque (SINAPI/SC)
              </p>
              <p className="text-2xl font-bold mt-1 text-emerald-400">
                R$ {indicadores.valorTotalEstoque.toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-400 opacity-80" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">
                Romaneios Ativos
              </p>
              <p className="text-2xl font-bold mt-1 text-purple-400">
                {indicadores.totalRomaneios}
              </p>
            </div>
            <ClipboardList className="w-8 h-8 text-purple-400 opacity-80" />
          </div>
        </section>

        {/* NAVEGAÇÃO E BUSCA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex gap-2">
            <button
              onClick={() => setAbaAtiva("estoque")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                abaAtiva === "estoque"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              Estoque ({materiais.length})
            </button>
            <button
              onClick={() => setAbaAtiva("romaneios")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                abaAtiva === "romaneios"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              Romaneios ({romaneios.length})
            </button>
          </div>
          {abaAtiva === "estoque" && (
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por código SINAPI ou descrição..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* ABA ESTOQUE (SOMENTE CÓDIGO SINAPI) */}
        {abaAtiva === "estoque" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase">
                    <th className="py-3.5 px-4">Código SINAPI</th>
                    <th className="py-3.5 px-4">Descrição do Insumo (SINAPI/SC)</th>
                    <th className="py-3.5 px-4">Categoria</th>
                    <th className="py-3.5 px-4 text-center">Unid.</th>
                    <th className="py-3.5 px-4 text-right">Saldo</th>
                    <th className="py-3.5 px-4 text-right">Preço SINAPI</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {carregando ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400">
                        Carregando...
                      </td>
                    </tr>
                  ) : materiaisFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400">
                        Nenhum material encontrado.
                      </td>
                    </tr>
                  ) : (
                    materiaisFiltrados.map((mat) => (
                      <tr
                        key={mat.id}
                        className="hover:bg-slate-800/40 transition"
                      >
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-amber-400">
                          {mat.codigoSinapi || mat.codigo || "-"}
                        </td>
                        <td className="py-3 px-4 font-medium text-white">
                          {mat.nome}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {mat.categoria || "Infraestrutura"}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-300">
                          {mat.unidade || "UN"}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {Number(mat.quantidade || 0)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300">
                          R$ {Number(mat.preco || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {Number(mat.quantidade || 0) <=
                          Number(mat.estoqueMinimo || 0) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300">
                              <AlertTriangle className="w-3 h-3" /> Repor
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300">
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() =>
                              handleExcluirMaterial(mat.id, mat.nome)
                            }
                            className="p-1.5 text-slate-400 hover:text-red-400 transition"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA ROMANEIOS (SEM COLUNA DE VALOR TOTAL) */}
        {abaAtiva === "romaneios" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase">
                    <th className="py-3.5 px-4">Nº Romaneio</th>
                    <th className="py-3.5 px-4">Emissão</th>
                    <th className="py-3.5 px-4">Requerente / Destino</th>
                    <th className="py-3.5 px-4">Autorizado por</th>
                    <th className="py-3.5 px-4 text-center">Itens</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {romaneios.map((rom) => {
                    const cancelado = rom.status === "cancelado";
                    return (
                      <tr
                        key={rom.id}
                        className={`transition ${
                          cancelado
                            ? "bg-red-950/15 opacity-70"
                            : "hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-semibold text-blue-400">
                          #{rom.numeroRomaneio}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {rom.dataEmissao
                            ? new Date(rom.dataEmissao).toLocaleString("pt-BR")
                            : "-"}
                        </td>
                        <td className="py-3 px-4 font-medium text-white">
                          {rom.requerente}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {rom.autorizacao}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {(rom.itens || []).length}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {cancelado ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300">
                              <Ban className="w-3 h-3" /> Cancelado
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300">
                              Emitido
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => gerarPDFRomaneio(rom)}
                            className="px-3 py-1.5 bg-blue-600/20 text-blue-300 rounded-lg text-xs font-medium flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" /> PDF
                          </button>
                          {!cancelado && (
                            <button
                              disabled={estornandoId === rom.id}
                              onClick={() => handleCancelarRomaneio(rom)}
                              className="px-3 py-1.5 bg-red-600/20 text-red-300 rounded-lg text-xs font-medium flex items-center gap-1"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Estornar
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

      {/* MODAL 1: INCLUIR MATERIAL PELO CÓDIGO SINAPI/SC */}
      {modalNovoMaterial && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold">Incluir Material (SINAPI/SC)</h2>
                <p className="text-xs text-slate-400">
                  Digite o Código SINAPI para puxar descrição, unidade e preço automaticamente
                </p>
              </div>
              <button
                onClick={() => setModalNovoMaterial(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCadastrarMaterial} className="space-y-4">
              {/* Campo Principal: Código SINAPI */}
              <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-amber-400 uppercase">
                    Código SINAPI (Santa Catarina) *
                  </label>
                  {insumoEncontrado && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Insumo localizado na SINAPI/SC
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: 00007778, 00000370, 00004721, 00001379..."
                  value={novoMaterial.codigoSinapi}
                  onChange={(e) => handleChangeCodigoSinapi(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-base font-mono text-white focus:outline-none"
                />
                <p className="text-[11px] text-slate-400">
                  Códigos de teste rápidos: <code className="text-amber-300">00007778</code> (Tubo DN 400),{" "}
                  <code className="text-amber-300">00000370</code> (Areia Média),{" "}
                  <code className="text-amber-300">00004721</code> (Brita 1),{" "}
                  <code className="text-amber-300">00001518</code> (CBUQ)
                </p>
              </div>

              {/* Campos Preenchidos Automaticamente pela Tabela SINAPI/SC */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Descrição Oficial do Insumo (SINAPI/SC)
                </label>
                <textarea
                  rows="2"
                  required
                  value={novoMaterial.nome}
                  onChange={(e) =>
                    setNovoMaterial({ ...novoMaterial, nome: e.target.value })
                  }
                  placeholder="Preenchido automaticamente ao digitar o código SINAPI..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Unidade SINAPI
                  </label>
                  <input
                    type="text"
                    required
                    value={novoMaterial.unidade}
                    onChange={(e) =>
                      setNovoMaterial({
                        ...novoMaterial,
                        unidade: e.target.value,
                      })
                    }
                    placeholder="Auto"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-center font-semibold text-amber-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Preço SINAPI/SC (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={novoMaterial.preco}
                    onChange={(e) =>
                      setNovoMaterial({ ...novoMaterial, preco: e.target.value })
                    }
                    placeholder="Auto"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-semibold text-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={novoMaterial.categoria}
                    onChange={(e) =>
                      setNovoMaterial({
                        ...novoMaterial,
                        categoria: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Quantidade Inicial em Estoque *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={novoMaterial.quantidade}
                    onChange={(e) =>
                      setNovoMaterial({
                        ...novoMaterial,
                        quantidade: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Estoque Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={novoMaterial.estoqueMinimo}
                    onChange={(e) =>
                      setNovoMaterial({
                        ...novoMaterial,
                        estoqueMinimo: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNovoMaterial(false)}
                  className="px-4 py-2 bg-slate-800 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold"
                >
                  Salvar Material
                </button>
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
              <button
                onClick={() => setModalEntradaRapida(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEntradaRapida} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Material (SINAPI/SC)
                </label>
                <select
                  required
                  value={entradaMaterialId}
                  onChange={(e) => setEntradaMaterialId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm"
                >
                  <option value="">-- Escolha --</option>
                  {materiais.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.codigoSinapi || m.codigo}] {m.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Qtd Adicionar
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={entradaQtd}
                  onChange={(e) => setEntradaQtd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalEntradaRapida(false)}
                  className="px-4 py-2 bg-slate-800 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: NOVO PEDIDO E ROMANEIO (SEM VALORES FINANCEIROS) */}
      {modalNovoPedido && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold">Emitir Romaneio de Saída</h2>
                <p className="text-xs text-slate-400">
                  Selecione o destino e as quantidades para abater do estoque
                </p>
              </div>
              <button
                onClick={() => setModalNovoPedido(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={handleEmitirPedido}
              className="space-y-4 overflow-y-auto pr-1 flex-1"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Requerente / Destino *
                  </label>
                  <select
                    required
                    value={requerente}
                    onChange={(e) => setRequerente(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm"
                  >
                    {LISTA_REQUERENTES.map((req, idx) => (
                      <option key={idx} value={req}>
                        {req}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Autorizado por *
                  </label>
                  <input
                    type="text"
                    required
                    value={autorizacao}
                    onChange={(e) => setAutorizacao(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-950 px-4 py-2.5 text-xs font-semibold uppercase text-slate-400 flex justify-between">
                  <span>Materiais Disponíveis (SINAPI/SC)</span>
                  <span>Itens marcados: {itensSelecionados.length}</span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
                  {materiais.map((mat) => {
                    const itemMarcado = itensSelecionados.find(
                      (i) => i.id === mat.id
                    );
                    const saldo = Number(mat.quantidade || 0);
                    return (
                      <div
                        key={mat.id}
                        className={`flex items-center justify-between px-4 py-3 text-sm ${
                          itemMarcado
                            ? "bg-blue-950/30"
                            : "hover:bg-slate-800/40"
                        } ${saldo <= 0 ? "opacity-50" : ""}`}
                      >
                        <button
                          type="button"
                          disabled={saldo <= 0}
                          onClick={() => toggleSelecaoMaterial(mat)}
                          className="flex items-center gap-3 text-left flex-1"
                        >
                          {itemMarcado ? (
                            <CheckSquare className="w-5 h-5 text-blue-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-500" />
                          )}
                          <div>
                            <p className="font-medium text-white">
                              <span className="font-mono text-xs text-amber-400 mr-2">
                                [{mat.codigoSinapi || mat.codigo}]
                              </span>
                              {mat.nome}
                            </p>
                            <p className="text-xs text-slate-400">
                              Saldo disponível: {saldo} {mat.unidade || "UN"}
                            </p>
                          </div>
                        </button>
                        {itemMarcado && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Qtd:</span>
                            <input
                              type="number"
                              min="1"
                              max={saldo}
                              value={itemMarcado.qtdPedido}
                              onChange={(e) =>
                                alterarQtdPedido(mat.id, e.target.value)
                              }
                              className="w-24 bg-slate-950 border border-blue-500/50 rounded-lg px-2.5 py-1 text-right text-sm"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div className="text-sm text-slate-400">
                  Total de itens selecionados:{" "}
                  <strong className="text-white">
                    {itensSelecionados.length}
                  </strong>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalNovoPedido(false)}
                    className="px-4 py-2 bg-slate-800 rounded-xl text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={processandoPedido}
                    className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" /> Emitir Romaneio
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: GESTÃO E ATUALIZAÇÃO DA TABELA SINAPI/SC */}
      {modalSinapi && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-amber-400">
                  Tabela Referência de Insumos SINAPI/SC
                </h2>
                <p className="text-xs text-slate-400">
                  Carregue a planilha oficial da Caixa (SC) para autopreencher novos cadastros e atualizar preços do estoque
                </p>
              </div>
              <button
                onClick={() => setModalSinapi(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Mês/Ano de Referência SINAPI/SC
                </label>
                <input
                  type="text"
                  placeholder="Ex: 10/2026"
                  value={mesReferenciaSinapi}
                  onChange={(e) => setMesReferenciaSinapi(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              {/* OPÇÃO 1: Importar CSV SINAPI/SC */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-white">
                  1. Carregar Planilha Oficial de Insumos SINAPI/SC (.CSV)
                </h3>
                <p className="text-xs text-slate-400">
                  Envie o CSV da tabela de insumos SINAPI/SC (`Codigo;Descricao;Unidade;Preco`). Todos os insumos ficam disponíveis para busca por código e os itens do estoque têm seus preços atualizados.
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold cursor-pointer transition mt-2">
                  <Upload className="w-4 h-4" />
                  Selecionar Arquivo CSV SINAPI/SC
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleImportarCSVSinapi}
                    disabled={processandoSinapi}
                    className="hidden"
                  />
                </label>
              </div>

              {/* OPÇÃO 2: Reajuste Percentual Mensal SINAPI/SC */}
              <form
                onSubmit={handleReajustePercentualSinapi}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <h3 className="text-sm font-semibold text-white">
                  2. Aplicar Variação Mensal SINAPI/SC (%)
                </h3>
                <p className="text-xs text-slate-400">
                  Reajusta linearmente o preço de todos os materiais cadastrados pelo índice mensal divulgado pelo IBGE/Caixa para Santa Catarina.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: 0,48 (para +0,48%)"
                    value={percentualSinapi}
                    onChange={(e) => setPercentualSinapi(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={processandoSinapi}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold"
                  >
                    Aplicar Índice
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
