import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
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
  Edit3,
  ArrowUpCircle,
  CheckSquare,
  Square,
  X,
  AlertTriangle,
  RotateCcw,
  Ban,
  LogOut,
  Users,
  ShieldCheck,
  Clock,
  BarChart3,
  Download,
  CheckCircle2,
} from "lucide-react";

// ============================================================================
// 1. CONFIGURAÇÃO DO FIREBASE E ADMINISTRADOR MASTER
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

const EMAIL_ALERTA_MASTER = "rodrigo.smi@floripa.sc.gov.br";
const EMAILS_MASTER_PADRAO = ["rodrigo.smi@floripa.sc.gov.br"];

const estiloLogoBranca = {
  filter: "grayscale(100%) invert(100%) contrast(300%) brightness(1.15)",
  mixBlendMode: "screen",
};

// ============================================================================
// FUNÇÕES DE FORMATAÇÃO E LEITURA NUMÉRICA PADRÃO BRASILEIRO (1.234,56)
// ============================================================================
// Converte string no formato "1.234,56" ou "1234.56" para Number do JavaScript
const lerNumeroBR = (valor) => {
  if (typeof valor === "number") return isNaN(valor) ? 0 : valor;
  if (!valor) return 0;
  const str = String(valor).trim();
  if (str.includes(",")) {
    // Remove pontos de milhar e troca a vírgula decimal por ponto
    const limpo = str.replace(/\./g, "").replace(",", ".");
    const num = Number(limpo);
    return isNaN(num) ? 0 : num;
  }
  const num = Number(str);
  return isNaN(num) ? 0 : num;
};

// Formata Preços/Valores sempre com 2 casas decimais: 1.234,56
const formatarMoedaBR = (valor) => {
  const num = Number(valor || 0);
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Formata Quantidades com separador de milhar (.) e decimais (,): ex: 1.234 ou 1.234,50
const formatarQuantidadeBR = (valor) => {
  const num = Number(valor || 0);
  const temDecimais = num % 1 !== 0;
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: temDecimais ? 2 : 0,
    maximumFractionDigits: 2,
  });
};

// ============================================================================
// 2. LISTA OFICIAL DE MATERIAIS DA DIRETORIA DE MANUTENÇÃO (147 ITENS CHUMBADOS)
// ============================================================================
const CATALOGO_PADRAO_DM = [
  { codigo: "44812", nome: "TUBO CORRUGADO PEAD, PAREDE DUPLA, INTERNA LISA, JEI DN/DI 500 MM (DRENAGEM/ESGOTO)", unidade: "M", preco: 362.56 },
  { codigo: "41785", nome: "TUBO CORRUGADO PEAD, PAREDE DUPLA, INTERNA LISA, JEI, DN/DI *1000* MM, PARA SANEAMENTO (DRENAGEM/ESGOTO)", unidade: "M", preco: 1343.62 },
  { codigo: "41781", nome: "TUBO CORRUGADO PEAD, PAREDE DUPLA, INTERNA LISA, JEI, DN/DI *400* MM, PARA SANEAMENTO (DRENAGEM/ESGOTO)", unidade: "M", preco: 242.61 },
  { codigo: "41783", nome: "TUBO CORRUGADO PEAD, PAREDE DUPLA, INTERNA LISA, JEI, DN/DI *800* MM, PARA SANEAMENTO (DRENAGEM/ESGOTO)", unidade: "M", preco: 872.21 },
  { codigo: "41786", nome: "TUBO CORRUGADO PEAD, PAREDE DUPLA, INTERNA LISA, JEI, DN/DI 1200 MM, PARA SANEAMENTO (DRENAGEM/ESGOTO)", unidade: "M", preco: 1856.96 },
  { codigo: "41779", nome: "TUBO CORRUGADO PEAD, PAREDE DUPLA, INTERNA LISA, JEI, DN/DI 250 MM, PARA SANEAMENTO (DRENAGEM/ESGOTO)", unidade: "M", preco: 95.55 },
  { codigo: "41780", nome: "TUBO CORRUGADO PEAD, PAREDE DUPLA, INTERNA LISA, JEI, DN/DI 300 MM, PARA SANEAMENTO (DRENAGEM/ESGOTO)", unidade: "M", preco: 149.69 },
  { codigo: "41782", nome: "TUBO CORRUGADO PEAD, PAREDE DUPLA, INTERNA LISA, JEI, DN/DI 600 MM, PARA SANEAMENTO (DRENAGEM/ESGOTO)", unidade: "M", preco: 536.24 },
  { codigo: "1379", nome: "CIMENTO PORTLAND COMPOSTO CP II-32", unidade: "KG", preco: 0.86 },
  { codigo: "13284", nome: "CIMENTO PORTLAND DE ALTO FORNO (AF) CP III-40", unidade: "KG", preco: 0.77 },
  { codigo: "44528", nome: "CIMENTO PORTLAND ESTRUTURAL BRANCO CPB - 32 OU CPB - 40", unidade: "KG", preco: 4.58 },
  { codigo: "34753", nome: "CIMENTO PORTLAND POZOLANICO CP IV-32", unidade: "KG", preco: 0.83 },
  { codigo: "366", nome: "AREIA FINA - POSTO JAZIDA/FORNECEDOR (RETIRADO NA JAZIDA, SEM TRANSPORTE)", unidade: "M3", preco: 160.00 },
  { codigo: "367", nome: "AREIA GROSSA - POSTO JAZIDA/FORNECEDOR (RETIRADO NA JAZIDA, SEM TRANSPORTE)", unidade: "M3", preco: 162.09 },
  { codigo: "370", nome: "AREIA MEDIA - POSTO JAZIDA/FORNECEDOR (RETIRADO NA JAZIDA, SEM TRANSPORTE)", unidade: "M3", preco: 160.00 },
  { codigo: "368", nome: "AREIA PARA ATERRO - POSTO JAZIDA/FORNECEDOR (RETIRADO NA JAZIDA, SEM TRANSPORTE)", unidade: "M3", preco: 80.00 },
  { codigo: "4720", nome: "PEDRA BRITADA N. 0, OU PEDRISCO (4,8 A 9,5 MM) POSTO PEDREIRA/FORNECEDOR, SEM FRETE", unidade: "M3", preco: 129.20 },
  { codigo: "4721", nome: "PEDRA BRITADA N. 1 (9,5 A 19 MM) POSTO PEDREIRA/FORNECEDOR, SEM FRETE", unidade: "M3", preco: 111.91 },
  { codigo: "4718", nome: "PEDRA BRITADA N. 2 (19 A 38 MM) POSTO PEDREIRA/FORNECEDOR, SEM FRETE", unidade: "M3", preco: 112.50 },
  { codigo: "4722", nome: "PEDRA BRITADA N. 3 (38 A 50 MM) POSTO PEDREIRA/FORNECEDOR, SEM FRETE", unidade: "M3", preco: 105.71 },
  { codigo: "96393-A", nome: "BRITA GRADUADA SIMPLES. AF_09/2025", unidade: "M3", preco: 180.62 },
  { codigo: "0001-IN", nome: "BICA CORRIDA", unidade: "M3", preco: 0.00 },
  { codigo: "34556", nome: "BLOCO DE CONCRETO ESTRUTURAL 14 X 19 X 29 CM, FBK 10 MPA (NBR 6136)", unidade: "UN", preco: 5.58 },
  { codigo: "37873", nome: "BLOCO DE CONCRETO ESTRUTURAL 14 X 19 X 29 CM, FBK 12 MPA (NBR 6136)", unidade: "UN", preco: 5.68 },
  { codigo: "34564", nome: "BLOCO DE CONCRETO ESTRUTURAL 14 X 19 X 29 CM, FBK 14 MPA (NBR 6136)", unidade: "UN", preco: 5.95 },
  { codigo: "34565", nome: "BLOCO DE CONCRETO ESTRUTURAL 14 X 19 X 29 CM, FBK 16 MPA (NBR 6136)", unidade: "UN", preco: 6.29 },
  { codigo: "38590", nome: "BLOCO DE CONCRETO ESTRUTURAL 14 X 19 X 29 CM, FBK 4,5 MPA (NBR 6136)", unidade: "UN", preco: 4.65 },
  { codigo: "34566", nome: "BLOCO DE CONCRETO ESTRUTURAL 14 X 19 X 29 CM, FBK 6 MPA (NBR 6136)", unidade: "UN", preco: 4.88 },
  { codigo: "34567", nome: "BLOCO DE CONCRETO ESTRUTURAL 14 X 19 X 29 CM, FBK 8 MPA (NBR 6136)", unidade: "UN", preco: 5.17 },
  { codigo: "38591", nome: "BLOCO DE CONCRETO ESTRUTURAL 14 X 19 X 34 CM, FBK 4,5 MPA (NBR 6136)", unidade: "UN", preco: 4.70 },
  { codigo: "34568", nome: "BLOCO DE CONCRETO ESTRUTURAL 14 X 19 X 39 CM, FBK 10 MPA (NBR 6136)", unidade: "UN", preco: 6.12 },
  { codigo: "34569", nome: "BLOCO DE CONCRETO ESTRUTURAL 14 X 19 X 39 CM, FBK 12 MPA (NBR 6136)", unidade: "UN", preco: 6.29 },
  { codigo: "34570", nome: "BLOCO DE CONCRETO ESTRUTURAL 14 X 19 X 39 CM, FBK 14 MPA (NBR 6136)", unidade: "UN", preco: 6.83 },
  { codigo: "25070", nome: "BLOCO DE CONCRETO ESTRUTURAL 14 X 19 X 39 CM, FBK 4,5 MPA (NBR 6136)", unidade: "UN", preco: 5.14 },
  { codigo: "34571", nome: "BLOCO DE CONCRETO ESTRUTURAL 14 X 19 X 39 CM, FBK 6 MPA (NBR 6136)", unidade: "UN", preco: 5.19 },
  { codigo: "34573", nome: "BLOCO DE CONCRETO ESTRUTURAL 14 X 19 X 39 CM, FBK 8 MPA (NBR 6136)", unidade: "UN", preco: 5.46 },
  { codigo: "37107", nome: "BLOCO DE CONCRETO ESTRUTURAL 14 X 19 X 39, FCK 16 MPA (NBR 6136)", unidade: "UN", preco: 7.21 },
  { codigo: "34576", nome: "BLOCO DE CONCRETO ESTRUTURAL 19 X 19 X 39 CM, FBK 10 MPA (NBR 6136)", unidade: "UN", preco: 7.95 },
  { codigo: "34577", nome: "BLOCO DE CONCRETO ESTRUTURAL 19 X 19 X 39 CM, FBK 12 MPA (NBR 6136)", unidade: "UN", preco: 8.30 },
  { codigo: "34578", nome: "BLOCO DE CONCRETO ESTRUTURAL 19 X 19 X 39 CM, FBK 14 MPA (NBR 6136)", unidade: "UN", preco: 9.00 },
  { codigo: "34579", nome: "BLOCO DE CONCRETO ESTRUTURAL 19 X 19 X 39 CM, FBK 16 MPA (NBR 6136)", unidade: "UN", preco: 9.60 },
  { codigo: "25067", nome: "BLOCO DE CONCRETO ESTRUTURAL 19 X 19 X 39 CM, FBK 4,5 MPA (NBR 6136)", unidade: "UN", preco: 6.42 },
  { codigo: "34580", nome: "BLOCO DE CONCRETO ESTRUTURAL 19 X 19 X 39 CM, FBK 8 MPA (NBR 6136)", unidade: "UN", preco: 7.17 },
  { codigo: "25071", nome: "BLOCO DE CONCRETO ESTRUTURAL 9 X 19 X 39 CM, FBK 4,5 MPA (NBR 6136)", unidade: "UN", preco: 3.57 },
  { codigo: "7270", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, 4 FUROS NA HORIZONTAL DE 9 X 9 X 19 CM (L X A X C)", unidade: "UN", preco: 1.02 },
  { codigo: "44460", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, 6 FUROS NA HORIZONTAL DE 11,5 X 19 X 29 CM (L X A X C)", unidade: "UN", preco: 1.71 },
  { codigo: "44461", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, 6 FUROS NA HORIZONTAL DE 11,5 X 19 X 39 CM (L X A X C)", unidade: "UN", preco: 2.33 },
  { codigo: "7267", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, 6 FUROS NA HORIZONTAL DE 9 X 14 X 19 CM (L X A X C)", unidade: "UN", preco: 0.86 },
  { codigo: "44458", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, 6 FUROS NA HORIZONTAL DE 9 X 14 X 24 CM (L X A X C)", unidade: "UN", preco: 1.04 },
  { codigo: "44457", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, 6 FUROS NA HORIZONTAL DE 9 X 19 X 39 CM (L X A X C)", unidade: "UN", preco: 2.02 },
  { codigo: "7271", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, 8 FUROS NA HORIZONTAL DE 9 X 19 X 19 CM (L X A X C)", unidade: "UN", preco: 1.09 },
  { codigo: "7268", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, 8 FUROS NA HORIZONTAL DE 9 X 19 X 29 CM (L X A X C)", unidade: "UN", preco: 1.70 },
  { codigo: "44459", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, 9 FUROS NA HORIZONTAL DE 11,5 X 14 X 24 CM (L X A X C)", unidade: "UN", preco: 1.10 },
  { codigo: "44462", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, 9 FUROS NA HORIZONTAL DE 14 X 19 X 29 CM (L X A X C)", unidade: "UN", preco: 1.94 },
  { codigo: "44463", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, 9 FUROS NA HORIZONTAL DE 14 X 19 X 39 CM (L X A X C)", unidade: "UN", preco: 2.50 },
  { codigo: "44464", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, 9 FUROS NA HORIZONTAL DE 19 X 19 X 29 CM (L X A X C)", unidade: "UN", preco: 2.59 },
  { codigo: "44465", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, 9 FUROS NA HORIZONTAL DE 19 X 19 X 39 CM (L X A X C)", unidade: "UN", preco: 3.56 },
  { codigo: "38783", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, FUROS NA HORIZONTAL DE 11,5 X 19 X 19 CM (L X A X C)", unidade: "UN", preco: 1.24 },
  { codigo: "44466", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, FUROS NA VERTICAL DE 11,5 X 19 X 29 CM (L X A X C)", unidade: "UN", preco: 2.53 },
  { codigo: "44467", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, FUROS NA VERTICAL DE 11,5 X 19 X 39 CM (L X A X C)", unidade: "UN", preco: 3.04 },
  { codigo: "44468", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, FUROS NA VERTICAL DE 14 X 19 X 29 CM (L X A X C)", unidade: "UN", preco: 2.64 },
  { codigo: "37593", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, FUROS NA VERTICAL DE 14 X 19 X 39 CM (L X A X C)", unidade: "UN", preco: 3.40 },
  { codigo: "37594", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, FUROS NA VERTICAL DE 19 X 19 X 39 CM (L X A X C)", unidade: "UN", preco: 4.04 },
  { codigo: "37592", nome: "BLOCO CERAMICO / TIJOLO VAZADO PARA ALVENARIA DE VEDACAO, FUROS NA VERTICAL DE 9 X 19 X 39 CM (L X A X C)", unidade: "UN", preco: 2.69 },
  { codigo: "7258", nome: "TIJOLO CERAMICO MACICO COMUM DE *5 X 10 X 20* CM (L X A X C)", unidade: "UN", preco: 0.74 },
  { codigo: "1379", nome: "CIMENTO PORTLAND COMPOSTO CP II-32 SACA 50KG", unidade: "UN", preco: 43.00 },
  { codigo: "34753", nome: "CIMENTO PORTLAND POZOLANICO CP IV-32 SACA 50KG", unidade: "UN", preco: 41.50 },
  { codigo: "13284", nome: "CIMENTO PORTLAND DE ALTO FORNO (AF) CP III-40 SACA 50KG", unidade: "UN", preco: 38.50 },
  { codigo: "40524", nome: "BLOQUETE/PISO INTERTRAVADO DE CONCRETO - MODELO ONDA/16 FACES/RETANGULAR/TIJOLINHO/PAVER/HOLANDES/PARALELEPIPEDO, *20 X 10* CM, E = 10 CM, RESISTENCIA DE 35 MPA, COR NATURAL", unidade: "M2", preco: 66.82 },
  { codigo: "40529", nome: "BLOQUETE/PISO INTERTRAVADO DE CONCRETO - MODELO ONDA/16 FACES/RETANGULAR/TIJOLINHO/PAVER/HOLANDES/PARALELEPIPEDO, *20 X 10* CM, E = 10 CM, RESISTENCIA DE 50 MPA, COR NATURAL", unidade: "M2", preco: 105.94 },
  { codigo: "36156", nome: "BLOQUETE/PISO INTERTRAVADO DE CONCRETO - MODELO ONDA/16 FACES/RETANGULAR/TIJOLINHO/PAVER/HOLANDES/PARALELEPIPEDO, *20 X 10* CM, E = 6 CM, RESISTENCIA DE 35 MPA, COLORIDO", unidade: "M2", preco: 63.30 },
  { codigo: "36155", nome: "BLOQUETE/PISO INTERTRAVADO DE CONCRETO - MODELO ONDA/16 FACES/RETANGULAR/TIJOLINHO/PAVER/HOLANDES/PARALELEPIPEDO, *20 X 10* CM, E = 6 CM, RESISTENCIA DE 35 MPA, COR NATURAL", unidade: "M2", preco: 50.11 },
  { codigo: "36154", nome: "BLOQUETE/PISO INTERTRAVADO DE CONCRETO - MODELO ONDA/16 FACES/RETANGULAR/TIJOLINHO/PAVER/HOLANDES/PARALELEPIPEDO, *20 X 10* CM, E = 8 CM, RESISTENCIA DE 35 MPA, COLORIDO", unidade: "M2", preco: 75.61 },
  { codigo: "36170", nome: "BLOQUETE/PISO INTERTRAVADO DE CONCRETO - MODELO ONDA/16 FACES/RETANGULAR/TIJOLINHO/PAVER/HOLANDES/PARALELEPIPEDO, *20 X 10* CM, E = 8 CM, RESISTENCIA DE 35 MPA, COR NATURAL", unidade: "M2", preco: 57.15 },
  { codigo: "695", nome: "BLOQUETE/PISO INTERTRAVADO DE CONCRETO - MODELO RAQUETE, *22 X 13,5* CM, E = 6 CM, RESISTENCIA DE 35 MPA, COR NATURAL", unidade: "M2", preco: 63.52 },
  { codigo: "679", nome: "BLOQUETE/PISO INTERTRAVADO DE CONCRETO - MODELO SEXTAVADO / HEXAGONAL, *25 X 25* CM, E = 10 CM, RESISTENCIA DE 35 MPA, COR NATURAL", unidade: "M2", preco: 90.64 },
  { codigo: "711", nome: "BLOQUETE/PISO INTERTRAVADO DE CONCRETO - MODELO SEXTAVADO / HEXAGONAL, *25 X 25* CM, E = 6 CM, RESISTENCIA DE 35 MPA, COR NATURAL", unidade: "M2", preco: 57.15 },
  { codigo: "712", nome: "BLOQUETE/PISO INTERTRAVADO DE CONCRETO - MODELO SEXTAVADO / HEXAGONAL, *25 X 25* CM, E = 8 CM, RESISTENCIA DE 35 MPA, COR NATURAL", unidade: "M2", preco: 68.58 },
  { codigo: "4385", nome: "PARALELEPIPEDO GRANITICO OU BASALTICO, PARA PAVIMENTACAO, SEM FRETE (VARIACAO REGIONAL DE PECAS POR M2)", unidade: "MIL", preco: 3066.99 },
  { codigo: "7753", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-1, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 1000 MM", unidade: "M", preco: 522.29 },
  { codigo: "13256", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-1, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 1100 MM", unidade: "M", preco: 731.65 },
  { codigo: "7757", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-1, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 1200 MM", unidade: "M", preco: 780.06 },
  { codigo: "7758", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-1, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 1500 MM", unidade: "M", preco: 1130.13 },
  { codigo: "7759", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-1, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 2000 MM", unidade: "M", preco: 3131.59 },
  { codigo: "40334", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-1, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 300 MM", unidade: "M", preco: 122.69 },
  { codigo: "7745", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-1, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 400 MM", unidade: "M", preco: 138.45 },
  { codigo: "7742", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-1, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 700 MM", unidade: "M", preco: 365.15 },
  { codigo: "7750", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-1, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 800 MM", unidade: "M", preco: 445.74 },
  { codigo: "7756", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-1, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 900 MM", unidade: "M", preco: 512.16 },
  { codigo: "7725", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-1, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE = 600 MM", unidade: "M", preco: 267.90 },
  { codigo: "7765", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-2, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 1000 MM", unidade: "M", preco: 574.07 },
  { codigo: "12569", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-2, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 1100 MM", unidade: "M", preco: 792.44 },
  { codigo: "7766", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-2, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 1200 MM", unidade: "M", preco: 841.97 },
  { codigo: "7767", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-2, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 1500 MM", unidade: "M", preco: 1208.92 },
  { codigo: "7727", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-2, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 2000 MM", unidade: "M", preco: 3511.96 },
  { codigo: "7760", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-2, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 300 MM", unidade: "M", preco: 139.57 },
  { codigo: "7761", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-2, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 400 MM", unidade: "M", preco: 146.33 },
  { codigo: "7752", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-2, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 500 MM", unidade: "M", preco: 177.84 },
  { codigo: "7762", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-2, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 600 MM", unidade: "M", preco: 232.44 },
  { codigo: "7722", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-2, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 700 MM", unidade: "M", preco: 355.69 },
  { codigo: "7763", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-2, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 800 MM", unidade: "M", preco: 433.36 },
  { codigo: "7764", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-2, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 900 MM", unidade: "M", preco: 517.78 },
  { codigo: "12572", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-3, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 1000 MM", unidade: "M", preco: 731.65 },
  { codigo: "12573", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-3, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 1100 MM", unidade: "M", preco: 962.41 },
  { codigo: "12574", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-3, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 1200 MM", unidade: "M", preco: 1163.67 },
  { codigo: "12575", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-3, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 1500 MM", unidade: "M", preco: 1767.23 },
  { codigo: "12576", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-3, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 400 MM", unidade: "M", preco: 213.86 },
  { codigo: "12577", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-3, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 500 MM", unidade: "M", preco: 288.16 },
  { codigo: "12578", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-3, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 600 MM", unidade: "M", preco: 348.94 },
  { codigo: "12579", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-3, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 700 MM", unidade: "M", preco: 601.08 },
  { codigo: "12580", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-3, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 800 MM", unidade: "M", preco: 626.30 },
  { codigo: "12581", nome: "TUBO DE CONCRETO ARMADO PARA AGUAS PLUVIAIS, CLASSE PA-3, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 900 MM", unidade: "M", preco: 670.87 },
  { codigo: "37449", nome: "TUBO DE CONCRETO SIMPLES PARA AGUAS PLUVIAIS, CLASSE PS1, COM ENCAIXE MACHO E FEMEA, DIAMETRO NOMINAL DE 200 MM", unidade: "M", preco: 27.62 },
  { codigo: "37450", nome: "TUBO DE CONCRETO SIMPLES PARA AGUAS PLUVIAIS, CLASSE PS1, COM ENCAIXE MACHO E FEMEA, DIAMETRO NOMINAL DE 300 MM", unidade: "M", preco: 38.67 },
  { codigo: "37451", nome: "TUBO DE CONCRETO SIMPLES PARA AGUAS PLUVIAIS, CLASSE PS1, COM ENCAIXE MACHO E FEMEA, DIAMETRO NOMINAL DE 400 MM", unidade: "M", preco: 53.99 },
  { codigo: "37452", nome: "TUBO DE CONCRETO SIMPLES PARA AGUAS PLUVIAIS, CLASSE PS1, COM ENCAIXE MACHO E FEMEA, DIAMETRO NOMINAL DE 500 MM", unidade: "M", preco: 78.47 },
  { codigo: "37453", nome: "TUBO DE CONCRETO SIMPLES PARA AGUAS PLUVIAIS, CLASSE PS1, COM ENCAIXE MACHO E FEMEA, DIAMETRO NOMINAL DE 600 MM", unidade: "M", preco: 90.37 },
  { codigo: "7778", nome: "TUBO DE CONCRETO SIMPLES PARA AGUAS PLUVIAIS, CLASSE PS1, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 200 MM", unidade: "M", preco: 33.90 },
  { codigo: "7796", nome: "TUBO DE CONCRETO SIMPLES PARA AGUAS PLUVIAIS, CLASSE PS1, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 300 MM", unidade: "M", preco: 46.46 },
  { codigo: "7781", nome: "TUBO DE CONCRETO SIMPLES PARA AGUAS PLUVIAIS, CLASSE PS1, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 400 MM", unidade: "M", preco: 54.90 },
  { codigo: "7795", nome: "TUBO DE CONCRETO SIMPLES PARA AGUAS PLUVIAIS, CLASSE PS1, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 500 MM", unidade: "M", preco: 81.71 },
  { codigo: "7791", nome: "TUBO DE CONCRETO SIMPLES PARA AGUAS PLUVIAIS, CLASSE PS1, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 600 MM", unidade: "M", preco: 97.81 },
  { codigo: "7783", nome: "TUBO DE CONCRETO SIMPLES PARA AGUAS PLUVIAIS, CLASSE PS2, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 200 MM", unidade: "M", preco: 34.66 },
  { codigo: "7790", nome: "TUBO DE CONCRETO SIMPLES PARA AGUAS PLUVIAIS, CLASSE PS2, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 300 MM", unidade: "M", preco: 54.62 },
  { codigo: "7785", nome: "TUBO DE CONCRETO SIMPLES PARA AGUAS PLUVIAIS, CLASSE PS2, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 400 MM", unidade: "M", preco: 60.27 },
  { codigo: "7792", nome: "TUBO DE CONCRETO SIMPLES PARA AGUAS PLUVIAIS, CLASSE PS2, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 500 MM", unidade: "M", preco: 85.48 },
  { codigo: "7793", nome: "TUBO DE CONCRETO SIMPLES PARA AGUAS PLUVIAIS, CLASSE PS2, COM ENCAIXE PONTA E BOLSA, DIAMETRO NOMINAL DE 600 MM", unidade: "M", preco: 100.95 },
  { codigo: "41682", nome: "MEIO-FIO OU GUIA DE CONCRETO PRE MOLDADO, COMP 1 M, *30 X 10/12* CM (H X L1/L2)", unidade: "UN", preco: 31.50 },
  { codigo: "41683", nome: "MEIO-FIO OU GUIA DE CONCRETO PRE MOLDADO, COMP 80 CM, *30 X 10/10* (H X L1/L2)", unidade: "UN", preco: 23.18 },
  { codigo: "41680", nome: "MEIO-FIO OU GUIA DE CONCRETO PRE-MOLDADO, COMP *39* CM, *19 X 6,5/6,5* CM (H X L1/L2)", unidade: "UN", preco: 12.48 },
  { codigo: "41679", nome: "MEIO-FIO OU GUIA DE CONCRETO PRE-MOLDADO, COMP 1 M, *20 X 12/15* CM (H X L1/L2)", unidade: "UN", preco: 28.53 },
  { codigo: "41681", nome: "MEIO-FIO OU GUIA DE CONCRETO PRE-MOLDADO, COMP 80 CM, *25 X 08/08* CM (H X L1/L2)", unidade: "UN", preco: 19.52 },
  { codigo: "43386", nome: "MEIO-FIO OU GUIA DE CONCRETO PRE-MOLDADO, TIPO CHAPEU PARA BOCA DE LOBO, DIMENSOES *1,20* X 0,15 X 0,30 M", unidade: "UN", preco: 44.57 },
  { codigo: "4059", nome: "MEIO-FIO OU GUIA DE CONCRETO, PRE-MOLDADO, COMP 1 M, *30 X 12/15* CM (H X L1/L2)", unidade: "M", preco: 31.50 },
  { codigo: "4062", nome: "MEIO-FIO OU GUIA DE CONCRETO, PRE-MOLDADO, COMP 1 M, *30 X 15* CM (H X L)", unidade: "UN", preco: 31.50 },
  { codigo: "4061", nome: "MEIO-FIO OU GUIA DE CONCRETO, PRE-MOLDADO, COMP 80 CM, *45 X 12/18* CM (H X L1/L2)", unidade: "UN", preco: 39.22 },
  { codigo: "4013", nome: "GEOTEXTIL NAO TECIDO AGULHADO DE FILAMENTOS CONTINUOS 100% POLIESTER, RESITENCIA A TRACAO = 09 KN/M", unidade: "M2", preco: 7.12 },
  { codigo: "4011", nome: "GEOTEXTIL NAO TECIDO AGULHADO DE FILAMENTOS CONTINUOS 100% POLIESTER, RESITENCIA A TRACAO = 10 KN/M", unidade: "M2", preco: 7.96 },
  { codigo: "4021", nome: "GEOTEXTIL NAO TECIDO AGULHADO DE FILAMENTOS CONTINUOS 100% POLIESTER, RESITENCIA A TRACAO = 14 KN/M", unidade: "M2", preco: 9.92 },
  { codigo: "4019", nome: "GEOTEXTIL NAO TECIDO AGULHADO DE FILAMENTOS CONTINUOS 100% POLIESTER, RESITENCIA A TRACAO = 16 KN/M", unidade: "M2", preco: 11.91 },
  { codigo: "4012", nome: "GEOTEXTIL NAO TECIDO AGULHADO DE FILAMENTOS CONTINUOS 100% POLIESTER, RESITENCIA A TRACAO = 21 KN/M", unidade: "M2", preco: 15.97 },
  { codigo: "4020", nome: "GEOTEXTIL NAO TECIDO AGULHADO DE FILAMENTOS CONTINUOS 100% POLIESTER, RESITENCIA A TRACAO = 26 KN/M", unidade: "M2", preco: 19.99 },
  { codigo: "4018", nome: "GEOTEXTIL NAO TECIDO AGULHADO DE FILAMENTOS CONTINUOS 100% POLIESTER, RESITENCIA A TRACAO = 31 KN/M", unidade: "M2", preco: 23.95 },
  { codigo: "11161", nome: "CAL HIDRATADA PARA PINTURA SACA 8KG", unidade: "UN", preco: 12.80 },
  { codigo: "34", nome: "ACO CA-50, 10,0 MM, VERGALHAO", unidade: "KG", preco: 7.34 },
  { codigo: "32", nome: "ACO CA-50, 6,3 MM, VERGALHAO", unidade: "KG", preco: 7.74 },
  { codigo: "33", nome: "ACO CA-50, 8,0 MM, VERGALHAO", unidade: "KG", preco: 7.79 },
];

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
  // Estados de Autenticação e Perfil de Acesso
  const [user, setUser] = useState(null);
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [verificandoAuth, setVerificandoAuth] = useState(true);
  const [lembrarDeMim, setLembrarDeMim] = useState(true);

  // Estados principais sincronizados com o Firestore
  const [materiais, setMateriais] = useState([]);
  const [romaneios, setRomaneios] = useState([]);
  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("estoque");
  const [busca, setBusca] = useState("");
  const [filtroRequerenteRelatorio, setFiltroRequerenteRelatorio] = useState("TODOS");
  const [processandoPedido, setProcessandoPedido] = useState(false);
  const [estornandoId, setEstornandoId] = useState(null);

  // Estados dos Modais
  const [modalNovoMaterial, setModalNovoMaterial] = useState(false);
  const [modalEditarMaterial, setModalEditarMaterial] = useState(false);
  const [modalEntradaRapida, setModalEntradaRapida] = useState(false);
  const [modalNovoPedido, setModalNovoPedido] = useState(false);

  // Estado do formulário de Novo Material
  const [novoMaterial, setNovoMaterial] = useState({
    codigo: "",
    nome: "",
    unidade: "UN",
    preco: "",
    estoqueMinimo: "",
    quantidade: "",
  });
  const [itemCatalogoEncontrado, setItemCatalogoEncontrado] = useState(false);

  // Estado de Edição de Material (Com causa obrigatória)
  const [materialEditando, setMaterialEditando] = useState(null);
  const [causaEdicao, setCausaEdicao] = useState("");

  // Estado de Entrada Rápida de Estoque (Com causa obrigatória)
  const [entradaMaterialId, setEntradaMaterialId] = useState("");
  const [entradaQtd, setEntradaQtd] = useState("");
  const [causaEntrada, setCausaEntrada] = useState("Nota Fiscal / Reposição de Almoxarifado");

  // Estados de Novo Pedido / Emissão de Romaneio
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [requerente, setRequerente] = useState(LISTA_REQUERENTES[0]);
  const [autorizacao, setAutorizacao] = useState("");

  // ==========================================================================
  // PERMISSÕES DERIVADAS DO PERFIL ATUAL
  // ==========================================================================
  const isMaster = perfilUsuario?.role === "master" && perfilUsuario?.status === "aprovado";
  const isGestor = perfilUsuario?.role === "gestor" && perfilUsuario?.status === "aprovado";
  const isOperador = perfilUsuario?.role === "operador" && perfilUsuario?.status === "aprovado";

  const podeOperar = isMaster || isOperador;
  const podeVerValores = isMaster || isGestor;

  // ==========================================================================
  // DISPARO AUTOMÁTICO DE E-MAIL PARA O MASTER QUANDO NOVO USUÁRIO ENTRA
  // ==========================================================================
  const dispararAlertaEmailNovoUsuario = async (novoUser) => {
    try {
      await fetch(`https://formsubmit.co/ajax/${EMAIL_ALERTA_MASTER}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          _subject: `[Almoxarifado SMI] Novo usuário aguardando aprovação: ${novoUser.displayName || novoUser.email}`,
          Nome_do_Usuario: novoUser.displayName || "Não informado",
          Email: novoUser.email,
          Data_Solicitacao: new Date().toLocaleString("pt-BR"),
          Acao_Necessaria:
            "Acesse o sistema de Controle de Materiais & Romaneios na aba 'Usuários' para aprovar e classificar este usuário como Master, Gestor ou Operador.",
        }),
      });
    } catch (e) {
      console.warn("Não foi possível enviar o alerta de e-mail automático:", e);
    }
  };

  // ==========================================================================
  // MONITORAMENTO DE AUTENTICAÇÃO E PERFIL DO USUÁRIO
  // ==========================================================================
  useEffect(() => {
    let unsubscribePerfil = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (usuarioAtual) => {
      if (!usuarioAtual) {
        setUser(null);
        setPerfilUsuario(null);
        setVerificandoAuth(false);
        return;
      }

      setUser(usuarioAtual);
      const emailNormalizado = (usuarioAtual.email || "").toLowerCase().trim();
      const ehMasterPadrao = EMAILS_MASTER_PADRAO.includes(emailNormalizado);
      const userDocRef = doc(db, "usuarios", emailNormalizado);

      try {
        const snap = await getDoc(userDocRef);

        if (!snap.exists()) {
          const novoCadastro = {
            uid: usuarioAtual.uid,
            nome: usuarioAtual.displayName || "Usuário",
            email: emailNormalizado,
            foto: usuarioAtual.photoURL || "",
            role: ehMasterPadrao ? "master" : "operador",
            status: ehMasterPadrao ? "aprovado" : "pendente",
            solicitadoEm: new Date().toISOString(),
            ultimoAcesso: serverTimestamp(),
          };

          await setDoc(userDocRef, novoCadastro);

          if (!ehMasterPadrao) {
            dispararAlertaEmailNovoUsuario(usuarioAtual);
          }
        } else {
          const dadosAtuais = snap.data();
          const updateData = { ultimoAcesso: serverTimestamp() };
          if (ehMasterPadrao && (dadosAtuais.role !== "master" || dadosAtuais.status !== "aprovado")) {
            updateData.role = "master";
            updateData.status = "aprovado";
          }
          await updateDoc(userDocRef, updateData);
        }

        unsubscribePerfil = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setPerfilUsuario({ id: docSnap.id, ...docSnap.data() });
          }
          setVerificandoAuth(false);
        });
      } catch (erro) {
        console.error("Erro ao verificar perfil do usuário:", erro);
        setVerificandoAuth(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribePerfil) unsubscribePerfil();
    };
  }, []);

  // ==========================================================================
  // SINCRONIZAÇÃO DE MATERIAIS, ROMANEIOS E LISTA DE USUÁRIOS
  // ==========================================================================
  useEffect(() => {
    if (!user || perfilUsuario?.status !== "aprovado") return;

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

    let unsubscribeUsuarios = null;
    if (perfilUsuario?.role === "master") {
      const qUsuarios = query(collection(db, "usuarios"));
      unsubscribeUsuarios = onSnapshot(qUsuarios, (snapshot) => {
        const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        lista.sort((a, b) => {
          if (a.status === "pendente" && b.status !== "pendente") return -1;
          if (a.status !== "pendente" && b.status === "pendente") return 1;
          return (a.nome || "").localeCompare(b.nome || "");
        });
        setListaUsuarios(lista);
      });
    }

    return () => {
      unsubscribeMateriais();
      unsubscribeRomaneios();
      if (unsubscribeUsuarios) unsubscribeUsuarios();
    };
  }, [user, perfilUsuario?.status, perfilUsuario?.role]);

  // ==========================================================================
  // AUTOPREENCHIMENTO PELO CATÁLOGO CHUMBADO DA DIRETORIA (147 MATERIAIS)
  // ==========================================================================
  const handleChangeCodigoMaterial = (valorDigitado) => {
    const limpo = valorDigitado.trim().toUpperCase();
    const encontradosExatos = CATALOGO_PADRAO_DM.filter(
      (item) => item.codigo.toUpperCase() === limpo
    );

    if (encontradosExatos.length === 1) {
      const item = encontradosExatos[0];
      setItemCatalogoEncontrado(true);
      setNovoMaterial((prev) => ({
        ...prev,
        codigo: item.codigo,
        nome: item.nome,
        unidade: item.unidade,
        preco: formatarMoedaBR(item.preco),
      }));
    } else {
      setItemCatalogoEncontrado(false);
      setNovoMaterial((prev) => ({
        ...prev,
        codigo: valorDigitado,
      }));
    }
  };

  const selecionarItemDoCatalogo = (item) => {
    setItemCatalogoEncontrado(true);
    setNovoMaterial((prev) => ({
      ...prev,
      codigo: item.codigo,
      nome: item.nome,
      unidade: item.unidade,
      preco: formatarMoedaBR(item.preco),
    }));
  };

  const sugestoesCatalogoDM = useMemo(() => {
    const termoCod = (novoMaterial.codigo || "").trim().toLowerCase();
    const termoNome = (novoMaterial.nome || "").trim().toLowerCase();
    const termoBusca = termoCod || termoNome;

    if (!termoBusca || itemCatalogoEncontrado) return [];

    return CATALOGO_PADRAO_DM.filter(
      (item) =>
        item.codigo.toLowerCase().includes(termoBusca) ||
        item.nome.toLowerCase().includes(termoBusca)
    ).slice(0, 8);
  }, [novoMaterial.codigo, novoMaterial.nome, itemCatalogoEncontrado]);

  // ==========================================================================
  // FUNÇÕES DE LOGIN, LOGOUT E GESTÃO DE USUÁRIOS
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

  const handleAtualizarPermissaoUsuario = async (emailAlvo, novoStatus, novoRole) => {
    if (!isMaster) return;
    try {
      await updateDoc(doc(db, "usuarios", emailAlvo), {
        status: novoStatus,
        role: novoRole,
        avaliadoPor: user.email,
        avaliadoEm: new Date().toISOString(),
      });
    } catch (erro) {
      console.error("Erro ao atualizar permissão:", erro);
      alert("Erro ao atualizar usuário: " + erro.message);
    }
  };

  // ==========================================================================
  // INDICADORES DO DASHBOARD E RELATÓRIOS
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
    const usuariosPendentes = listaUsuarios.filter(
      (u) => u.status === "pendente"
    ).length;

    return {
      totalItens,
      estoqueBaixo,
      valorTotalEstoque,
      usuariosPendentes,
    };
  }, [materiais, listaUsuarios]);

  const materiaisFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return materiais;
    return materiais.filter(
      (m) =>
        (m.nome || "").toLowerCase().includes(termo) ||
        (m.codigo || "").toLowerCase().includes(termo)
    );
  }, [materiais, busca]);

  const dadosRelatorioFinanceiro = useMemo(() => {
    const romaneiosValidos = romaneios.filter((r) => {
      if (r.status === "cancelado") return false;
      if (filtroRequerenteRelatorio !== "TODOS" && r.requerente !== filtroRequerenteRelatorio) {
        return false;
      }
      return true;
    });

    const valorTotalSaidas = romaneiosValidos.reduce(
      (acc, r) => acc + Number(r.valorTotal || 0),
      0
    );

    return {
      lista: romaneiosValidos,
      valorTotalSaidas,
    };
  }, [romaneios, filtroRequerenteRelatorio]);

  const exportarRelatorioCSV = () => {
    const cabecalho = "Numero_Romaneio;Data_Emissao;Requerente_Destino;Autorizado_Por;Emitido_Por;Qtd_Itens;Valor_Total_R$\n";
    const linhas = dadosRelatorioFinanceiro.lista
      .map((r) => {
        const data = r.dataEmissao ? new Date(r.dataEmissao).toLocaleString("pt-BR") : "-";
        const vlr = formatarMoedaBR(r.valorTotal || 0);
        return `${r.numeroRomaneio};"${data}";"${r.requerente}";"${r.autorizacao}";"${r.emitidoPorEmail || ""}";${formatarQuantidadeBR((r.itens || []).length)};"${vlr}"`;
      })
      .join("\n");

    const blob = new Blob(["\uFEFF" + cabecalho + linhas], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_almoxarifado_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // ==========================================================================
  // OPERAÇÕES DE ESTOQUE
  // ==========================================================================
  const handleCadastrarMaterial = async (e) => {
    e.preventDefault();
    if (!podeOperar) return alert("Seu perfil não possui permissão para cadastrar materiais.");
    if (!novoMaterial.nome.trim()) return alert("Informe a descrição do material.");

    try {
      await addDoc(collection(db, "materiais"), {
        codigo:
          novoMaterial.codigo.trim() || `MAT-${String(Date.now()).slice(-4)}`,
        nome: novoMaterial.nome.trim(),
        unidade: novoMaterial.unidade.trim() || "UN",
        preco: lerNumeroBR(novoMaterial.preco),
        estoqueMinimo: lerNumeroBR(novoMaterial.estoqueMinimo),
        quantidade: lerNumeroBR(novoMaterial.quantidade),
        criadoPor: user.email,
        criadoPorNome: user.displayName || "Operador",
        ultimaCausa: "Cadastro inicial de material",
        criadoEm: serverTimestamp(),
      });

      setNovoMaterial({
        codigo: "",
        nome: "",
        unidade: "UN",
        preco: "",
        estoqueMinimo: "",
        quantidade: "",
      });
      setItemCatalogoEncontrado(false);
      setModalNovoMaterial(false);
    } catch (erro) {
      console.error("Erro ao cadastrar material:", erro);
      alert("Erro ao salvar material no Firestore: " + erro.message);
    }
  };

  const abrirModalEdicao = (mat) => {
    if (!podeOperar) return;
    setMaterialEditando({
      id: mat.id,
      codigo: mat.codigo || "",
      nome: mat.nome || "",
      unidade: mat.unidade || "UN",
      preco: formatarMoedaBR(mat.preco || 0),
      estoqueMinimo: formatarQuantidadeBR(mat.estoqueMinimo || 0),
      quantidade: formatarQuantidadeBR(mat.quantidade || 0),
    });
    setCausaEdicao("");
    setModalEditarMaterial(true);
  };

  const handleSalvarEdicaoMaterial = async (e) => {
    e.preventDefault();
    if (!podeOperar) return;
    if (!materialEditando || !materialEditando.nome.trim()) return;
    if (!causaEdicao.trim()) {
      return alert("Informe obrigatoriamente a causa/motivo da alteração de estoque ou cadastro.");
    }

    try {
      await updateDoc(doc(db, "materiais", String(materialEditando.id)), {
        codigo: materialEditando.codigo.trim() || "-",
        nome: materialEditando.nome.trim(),
        unidade: materialEditando.unidade.trim() || "UN",
        preco: lerNumeroBR(materialEditando.preco),
        estoqueMinimo: lerNumeroBR(materialEditando.estoqueMinimo),
        quantidade: lerNumeroBR(materialEditando.quantidade),
        atualizadoPor: user.email,
        atualizadoPorNome: user.displayName || "Operador",
        ultimaCausa: causaEdicao.trim(),
        ultimaMovimentacao: serverTimestamp(),
      });
      setModalEditarMaterial(false);
      setMaterialEditando(null);
      setCausaEdicao("");
    } catch (erro) {
      console.error("Erro ao editar material:", erro);
      alert("Não foi possível salvar as alterações: " + erro.message);
    }
  };

  const handleEntradaRapida = async (e) => {
    e.preventDefault();
    if (!podeOperar) return;
    const qtdAdicionar = lerNumeroBR(entradaQtd);
    if (!entradaMaterialId || qtdAdicionar <= 0) {
      return alert("Selecione um material e informe uma quantidade válida.");
    }
    if (!causaEntrada.trim()) {
      return alert("Informe a causa/origem desta entrada de estoque (ex: Nº da Nota Fiscal ou Devolução).");
    }

    const materialAlvo = materiais.find((m) => m.id === entradaMaterialId);
    if (!materialAlvo) return;

    try {
      const novoSaldo = Number(materialAlvo.quantidade || 0) + qtdAdicionar;
      await updateDoc(doc(db, "materiais", String(entradaMaterialId)), {
        quantidade: novoSaldo,
        ultimaMovimentacao: serverTimestamp(),
        movimentadoPor: user.email,
        ultimaCausa: `Entrada (+${formatarQuantidadeBR(qtdAdicionar)}): ${causaEntrada.trim()}`,
      });
      setEntradaMaterialId("");
      setEntradaQtd("");
      setCausaEntrada("Nota Fiscal / Reposição de Almoxarifado");
      setModalEntradaRapida(false);
    } catch (erro) {
      console.error("Erro na entrada rápida:", erro);
      alert("Não foi possível atualizar o estoque: " + erro.message);
    }
  };

  const handleExcluirMaterial = async (id, nome) => {
    if (!isMaster) {
      return alert("Apenas usuários com perfil MASTER podem excluir materiais definitivamente.");
    }
    if (!window.confirm(`Deseja realmente excluir o material "${nome}"?`))
      return;
    try {
      await deleteDoc(doc(db, "materiais", String(id)));
    } catch (erro) {
      console.error("Erro ao excluir:", erro);
      alert("Erro ao excluir material: " + erro.message);
    }
  };

  // ==========================================================================
  // LÓGICA DE PEDIDOS E ROMANEIO EM PDF
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
            qtdPedido: "1",
          },
        ];
      }
    });
  };

  const alterarQtdPedido = (id, novaQtdTexto) => {
    setItensSelecionados((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qtdPedido: novaQtdTexto } : item
      )
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
          <td style="text-align: center; font-family: monospace;">${item.codigo || "-"}</td>
          <td>${item.nome}</td>
          <td style="text-align: center;">${item.unidade}</td>
          <td style="text-align: right; font-weight: bold;">${formatarQuantidadeBR(item.qtdPedido)}</td>
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
          <p style="margin: 4px 0;"><strong>Operador Responsável:</strong> ${dadosRomaneio.emitidoPorNome || "Almoxarifado"} (${dadosRomaneio.emitidoPorEmail || "N/A"})</p>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 45px; text-align: center;">Item</th>
              <th style="width: 110px; text-align: center;">Código</th>
              <th>Descrição do Material</th>
              <th style="width: 75px; text-align: center;">Unid.</th>
              <th style="width: 100px; text-align: right;">Quantidade</th>
            </tr>
          </thead>
          <tbody>${linhasTabela}</tbody>
        </table>

        <div class="assinaturas">
          <div class="ass-box">Expedição</div>
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
    if (!podeOperar) return alert("Apenas perfis Master ou Operador podem emitir pedidos.");
    if (processandoPedido) return;

    if (!requerente.trim() || !autorizacao.trim())
      return alert("Preencha Requerente e Autorização.");

    const itensNormalizados = itensSelecionados.map((item) => ({
      ...item,
      qtdPedido: lerNumeroBR(item.qtdPedido),
    }));

    const itensValidos = itensNormalizados.filter(
      (item) => Number(item.qtdPedido) > 0
    );
    if (itensValidos.length === 0)
      return alert("Selecione ao menos um material com quantidade válida.");

    for (const item of itensValidos) {
      const matBanco = materiais.find((m) => m.id === item.id);
      const saldoAtual = Number(matBanco?.quantidade ?? item.estoqueAtual ?? 0);
      if (Number(item.qtdPedido) > saldoAtual) {
        return alert(
          `Estoque insuficiente para "${item.nome}". Disponível: ${formatarQuantidadeBR(saldoAtual)}, Solicitado: ${formatarQuantidadeBR(item.qtdPedido)}.`
        );
      }
    }

    setProcessandoPedido(true);

    try {
      const batch = writeBatch(db);
      const numeroRomaneio = String(Date.now()).slice(-6);

      for (const item of itensValidos) {
        const matBanco = materiais.find((m) => m.id === item.id);
        const saldoAtual = Number(
          matBanco?.quantidade ?? item.estoqueAtual ?? 0
        );
        const materialRef = doc(db, "materiais", String(item.id));
        batch.update(materialRef, {
          quantidade: Math.max(0, saldoAtual - Number(item.qtdPedido)),
          movimentadoPor: user.email,
          ultimaCausa: `Saída Romaneio #${numeroRomaneio} (${requerente})`,
          ultimaMovimentacao: serverTimestamp(),
        });
      }

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
        emitidoPorNome: user.displayName || "Operador",
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
    if (!podeOperar) return alert("Seu perfil não possui permissão para cancelar romaneios.");
    if (romaneio.status === "cancelado")
      return alert("Romaneio já cancelado e estornado.");
    const motivo = window.prompt(
      "Confirma o CANCELAMENTO e ESTORNO?\nInforme obrigatoriamente a causa/motivo:",
      "Devolução de material / Erro de lançamento"
    );
    if (motivo === null) return;
    if (!motivo.trim()) return alert("É obrigatório informar o motivo do estorno.");

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
            movimentadoPor: user.email,
            ultimaCausa: `Estorno Romaneio #${romaneio.numeroRomaneio}: ${motivo.trim()}`,
            ultimaMovimentacao: serverTimestamp(),
          });
        }
      }

      const romaneioRef = doc(db, "romaneios", String(romaneio.id));
      batch.update(romaneioRef, {
        status: "cancelado",
        motivoCancelamento: motivo.trim(),
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
  // TELAS DE CARREGAMENTO, LOGIN E AGUARDANDO APROVAÇÃO
  // ==========================================================================
  if (verificandoAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Verificando credenciais e permissões...
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
              Controle de Materiais, Pedidos e Romaneios
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

  if (perfilUsuario && perfilUsuario.status !== "aprovado") {
    const bloqueado = perfilUsuario.status === "bloqueado";
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            {bloqueado ? <Ban className="w-7 h-7 text-red-400" /> : <Clock className="w-7 h-7" />}
          </div>
          <h2 className="text-xl font-bold text-white">
            {bloqueado
              ? "Acesso Não Autorizado"
              : "Cadastro Aguardando Aprovação"}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {bloqueado
              ? "O seu acesso a este sistema foi desaprovado ou suspenso pelo administrador Master."
              : `Olá, ${user.displayName}! Seu primeiro acesso com o e-mail (${user.email}) foi registrado e um alerta foi enviado ao Administrador Master para liberação e classificação do seu perfil.`}
          </p>
          <div className="pt-2">
            <button
              onClick={() => signOut(auth)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition"
            >
              Sair e voltar à tela inicial
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // INTERFACE PRINCIPAL (DASHBOARD)
  // ==========================================================================
  const badgeRole = {
    master: { texto: "MASTER", cor: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
    gestor: { texto: "GESTOR", cor: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
    operador: { texto: "OPERADOR", cor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  }[perfilUsuario?.role || "operador"];

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
                Secretaria de Infraestrutura e Manutenção da Cidade
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
              <div className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeRole.cor}`}>
                    {badgeRole.texto}
                  </span>
                  <p className="text-sm font-semibold text-white leading-tight">
                    {user.displayName || "Usuário"}
                  </p>
                </div>
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

        {/* BOTÕES DE AÇÃO OPERACIONAL */}
        {podeOperar ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setModalNovoMaterial(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium border border-slate-700 transition"
            >
              <Plus className="w-4 h-4" /> Novo Material
            </button>
            <button
              onClick={() => setModalEntradaRapida(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-sm font-medium transition"
            >
              <ArrowUpCircle className="w-4 h-4" /> Entrada Rápida
            </button>
            <button
              onClick={() => setModalNovoPedido(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/30 transition"
            >
              <FileText className="w-4 h-4" /> Novo Pedido / Romaneio
            </button>
          </div>
        ) : (
          <div className="bg-blue-950/30 border border-blue-500/30 text-blue-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            Modo Gestor: Acesso habilitado para visualização de Dashboards, consulta de Estoque e emissão de Relatórios Financeiros.
          </div>
        )}

        {/* CARDS DE INDICADORES (SEM O PAINEL ROMANEIOS ATIVOS) */}
        <section
          className={`grid grid-cols-1 sm:grid-cols-2 ${
            podeVerValores ? "lg:grid-cols-3" : "lg:grid-cols-2"
          } gap-4`}
        >
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">
                Materiais Cadastrados
              </p>
              <p className="text-2xl font-bold mt-1">
                {formatarQuantidadeBR(indicadores.totalItens)}
              </p>
            </div>
            <Package className="w-8 h-8 text-blue-400 opacity-80" />
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">
                Estoque Baixo
              </p>
              <p className="text-2xl font-bold mt-1 text-amber-400">
                {formatarQuantidadeBR(indicadores.estoqueBaixo)}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-amber-400 opacity-80" />
          </div>

          {podeVerValores && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  Valor em Estoque
                </p>
                <p className="text-2xl font-bold mt-1 text-emerald-400">
                  R$ {formatarMoedaBR(indicadores.valorTotalEstoque)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-400 opacity-80" />
            </div>
          )}
        </section>

        {/* NAVEGAÇÃO ENTRE ABAS E BUSCA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAbaAtiva("estoque")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                abaAtiva === "estoque"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Estoque ({formatarQuantidadeBR(materiais.length)})
            </button>
            <button
              onClick={() => setAbaAtiva("romaneios")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                abaAtiva === "romaneios"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Romaneios ({formatarQuantidadeBR(romaneios.length)})
            </button>

            {podeVerValores && (
              <button
                onClick={() => setAbaAtiva("relatorios")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition ${
                  abaAtiva === "relatorios"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <BarChart3 className="w-4 h-4" /> Relatórios Financeiros
              </button>
            )}

            {isMaster && (
              <button
                onClick={() => setAbaAtiva("usuarios")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                  abaAtiva === "usuarios"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Users className="w-4 h-4" />
                Usuários ({formatarQuantidadeBR(listaUsuarios.length)})
                {indicadores.usuariosPendentes > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                    {formatarQuantidadeBR(indicadores.usuariosPendentes)}
                  </span>
                )}
              </button>
            )}
          </div>

          {abaAtiva === "estoque" && (
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por código ou descrição..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* ABA 1: ESTOQUE DE MATERIAIS */}
        {abaAtiva === "estoque" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase">
                    <th className="py-3.5 px-4">Código</th>
                    <th className="py-3.5 px-4">Descrição</th>
                    <th className="py-3.5 px-4 text-center">Unidade</th>
                    {podeVerValores && (
                      <th className="py-3.5 px-4 text-right">Preço Unit.</th>
                    )}
                    <th className="py-3.5 px-4 text-center">Est. Mínimo</th>
                    <th className="py-3.5 px-4 text-right">Saldo Atual</th>
                    <th className="py-3.5 px-4">Última Causa / Resp.</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    {podeOperar && (
                      <th className="py-3.5 px-4 text-center">Ações</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {carregando ? (
                    <tr>
                      <td colSpan="9" className="py-8 text-center text-slate-400">
                        Carregando...
                      </td>
                    </tr>
                  ) : materiaisFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-8 text-center text-slate-400">
                        Nenhum material encontrado.
                      </td>
                    </tr>
                  ) : (
                    materiaisFiltrados.map((mat) => (
                      <tr
                        key={mat.id}
                        className="hover:bg-slate-800/40 transition"
                      >
                        <td className="py-3 px-4 font-mono text-xs text-amber-400 font-semibold">
                          {mat.codigo || "-"}
                        </td>
                        <td className="py-3 px-4 font-medium text-white">
                          {mat.nome}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-300">
                          {mat.unidade || "UN"}
                        </td>
                        {podeVerValores && (
                          <td className="py-3 px-4 text-right text-slate-300">
                            R$ {formatarMoedaBR(mat.preco)}
                          </td>
                        )}
                        <td className="py-3 px-4 text-center text-slate-400">
                          {formatarQuantidadeBR(mat.estoqueMinimo)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-white">
                          {formatarQuantidadeBR(mat.quantidade)}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">
                          <p className="text-slate-300">{mat.ultimaCausa || "Cadastro inicial"}</p>
                          <p className="text-[11px] text-slate-500">
                            Por: {mat.atualizadoPor || mat.movimentadoPor || mat.criadoPor || "-"}
                          </p>
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
                        {podeOperar && (
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => abrirModalEdicao(mat)}
                                className="p-1.5 text-slate-400 hover:text-blue-400 transition"
                                title="Ajustar estoque / editar (requer causa)"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {isMaster && (
                                <button
                                  onClick={() =>
                                    handleExcluirMaterial(mat.id, mat.nome)
                                  }
                                  className="p-1.5 text-slate-400 hover:text-red-400 transition"
                                  title="Excluir (Somente Master)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 2: HISTÓRICO DE ROMANEIOS */}
        {abaAtiva === "romaneios" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase">
                    <th className="py-3.5 px-4">Nº Romaneio</th>
                    <th className="py-3.5 px-4">Emissão</th>
                    <th className="py-3.5 px-4">Requerente / Destino</th>
                    <th className="py-3.5 px-4">Operador / Autorização</th>
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
                          {cancelado && rom.motivoCancelamento && (
                            <p className="text-xs text-red-400 mt-0.5">
                              Causa estorno: {rom.motivoCancelamento}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-300">
                          <p>Aut: {rom.autorizacao}</p>
                          <p className="text-slate-500">Op: {rom.emitidoPorEmail || "-"}</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {formatarQuantidadeBR((rom.itens || []).length)}
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
                          {!cancelado && podeOperar && (
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

        {/* ABA 3: RELATÓRIOS FINANCEIROS */}
        {abaAtiva === "relatorios" && podeVerValores && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Relatório Financeiro de Saídas por Requerente
                </h2>
                <p className="text-xs text-slate-400">
                  Visão exclusiva para Gestores e Master (valores ocultos nos romaneios operacionais)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={filtroRequerenteRelatorio}
                  onChange={(e) => setFiltroRequerenteRelatorio(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="TODOS">Todas as Intendências / Diretorias</option>
                  {LISTA_REQUERENTES.map((req, i) => (
                    <option key={i} value={req}>
                      {req}
                    </option>
                  ))}
                </select>
                <button
                  onClick={exportarRelatorioCSV}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
                >
                  <Download className="w-4 h-4" /> Exportar Excel (CSV)
                </button>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Custo Total dos Romaneios Filtrados ({formatarQuantidadeBR(dadosRelatorioFinanceiro.lista.length)} saídas ativas):
              </span>
              <span className="text-xl font-bold text-emerald-400">
                R$ {formatarMoedaBR(dadosRelatorioFinanceiro.valorTotalSaidas)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                    <th className="py-3 px-4">Romaneio</th>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Requerente / Destino</th>
                    <th className="py-3 px-4">Responsável</th>
                    <th className="py-3 px-4 text-right">Valor Financeiro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {dadosRelatorioFinanceiro.lista.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono text-blue-400">
                        #{r.numeroRomaneio}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {r.dataEmissao
                          ? new Date(r.dataEmissao).toLocaleString("pt-BR")
                          : "-"}
                      </td>
                      <td className="py-3 px-4 font-medium text-white">
                        {r.requerente}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">
                        {r.emitidoPorEmail || "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                        R$ {formatarMoedaBR(r.valorTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 4: GESTÃO E APROVAÇÃO DE USUÁRIOS */}
        {abaAtiva === "usuarios" && isMaster && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Controle de Usuários e Níveis de Permissão
                </h2>
                <p className="text-xs text-slate-400">
                  Aprove novos acessos e classifique entre Master, Gestor ou Operador
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs uppercase">
                    <th className="py-3.5 px-4">Usuário</th>
                    <th className="py-3.5 px-4">E-mail</th>
                    <th className="py-3.5 px-4 text-center">Status de Acesso</th>
                    <th className="py-3.5 px-4 text-center">Nível de Permissão (Classe)</th>
                    <th className="py-3.5 px-4 text-center">Aprovar / Bloquear</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {listaUsuarios.map((u) => {
                    const ehMasterPrincipal = EMAILS_MASTER_PADRAO.includes(u.email);
                    return (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-medium text-white flex items-center gap-2.5">
                          <img
                            src={u.foto || "https://www.svgrepo.com/show/311063/person.svg"}
                            alt=""
                            className="w-7 h-7 rounded-full border border-slate-700"
                          />
                          {u.nome}
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                          {u.email}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {u.status === "aprovado" && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300">
                              Aprovado
                            </span>
                          )}
                          {u.status === "pendente" && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 animate-pulse">
                              Pendente de Aprovação
                            </span>
                          )}
                          {u.status === "bloqueado" && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300">
                              Desaprovado / Bloqueado
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <select
                            disabled={ehMasterPrincipal}
                            value={u.role || "operador"}
                            onChange={(e) =>
                              handleAtualizarPermissaoUsuario(
                                u.email,
                                u.status,
                                e.target.value
                              )
                            }
                            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            <option value="operador">3 - Operador (Alimenta o sistema)</option>
                            <option value="gestor">2 - Gestor (Dashboards e Relatórios)</option>
                            <option value="master">1 - Master (Acesso Total)</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {!ehMasterPrincipal && (
                            <div className="flex items-center justify-center gap-2">
                              {u.status !== "aprovado" && (
                                <button
                                  onClick={() =>
                                    handleAtualizarPermissaoUsuario(
                                      u.email,
                                      "aprovado",
                                      u.role || "operador"
                                    )
                                  }
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
                                >
                                  Aprovar
                                </button>
                              )}
                              {u.status !== "bloqueado" && (
                                <button
                                  onClick={() =>
                                    handleAtualizarPermissaoUsuario(
                                      u.email,
                                      "bloqueado",
                                      u.role || "operador"
                                    )
                                  }
                                  className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-medium transition"
                                >
                                  Desaprovar
                                </button>
                              )}
                            </div>
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

      {/* ====================================================================
          MODAL 1: NOVO MATERIAL (COM AUTOCOMPLETE DOS 147 ITENS CHUMBADOS)
      ==================================================================== */}
      {modalNovoMaterial && podeOperar && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold">Novo Material</h2>
                <p className="text-xs text-slate-400">
                  Digite o código ou pesquise na lista padrão da Diretoria (147 itens)
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
              {/* Campo 1: Código com busca instantânea */}
              <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-amber-400 uppercase">
                    Código *
                  </label>
                  {itemCatalogoEncontrado && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Preenchido da lista padrão DM
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Digite o código (ex: 44812, 370, 4721) ou nome do item..."
                  value={novoMaterial.codigo}
                  onChange={(e) => handleChangeCodigoMaterial(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-sm font-mono text-white focus:outline-none"
                />

                {/* Sugestões dos 147 itens da planilha */}
                {sugestoesCatalogoDM.length > 0 && (
                  <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-800 mt-1 max-h-48 overflow-y-auto shadow-xl">
                    {sugestoesCatalogoDM.map((item, idx) => (
                      <button
                        type="button"
                        key={`${item.codigo}-${item.unidade}-${idx}`}
                        onClick={() => selecionarItemDoCatalogo(item)}
                        className="w-full text-left px-3 py-2 hover:bg-amber-500/15 transition flex items-center justify-between gap-2"
                      >
                        <div className="truncate">
                          <span className="font-mono text-xs font-bold text-amber-400 mr-2">
                            {item.codigo}
                          </span>
                          <span className="text-xs text-slate-200">
                            {item.nome}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-emerald-400 shrink-0">
                          {item.unidade} • R$ {formatarMoedaBR(item.preco)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Campo 2: Descrição */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Descrição *
                </label>
                <textarea
                  rows="2"
                  required
                  placeholder="Descrição do material"
                  value={novoMaterial.nome}
                  onChange={(e) => {
                    setItemCatalogoEncontrado(false);
                    setNovoMaterial({ ...novoMaterial, nome: e.target.value });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              {/* Campos 3 e 4: Unidade e Preço Unitário (Formato BR) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Unidade *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="M, M2, M3, UN, KG..."
                    value={novoMaterial.unidade}
                    onChange={(e) =>
                      setNovoMaterial({
                        ...novoMaterial,
                        unidade: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Preço Unitário (R$) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="Ex: 1.234,56"
                    value={novoMaterial.preco}
                    onChange={(e) =>
                      setNovoMaterial({ ...novoMaterial, preco: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Campo 5 (Estoque Mínimo) + Saldo Inicial */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Estoque Mínimo *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="Ex: 100"
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
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Saldo Inicial em Estoque
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 1.000"
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

      {/* ====================================================================
          MODAL 2: EDITAR MATERIAL / AJUSTAR ESTOQUE
      ==================================================================== */}
      {modalEditarMaterial && materialEditando && podeOperar && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold">Editar Material / Ajustar Estoque</h2>
              <button
                onClick={() => setModalEditarMaterial(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarEdicaoMaterial} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Código
                  </label>
                  <input
                    type="text"
                    value={materialEditando.codigo}
                    onChange={(e) =>
                      setMaterialEditando({
                        ...materialEditando,
                        codigo: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Unidade
                  </label>
                  <input
                    type="text"
                    value={materialEditando.unidade}
                    onChange={(e) =>
                      setMaterialEditando({
                        ...materialEditando,
                        unidade: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Descrição *
                </label>
                <textarea
                  rows="2"
                  required
                  value={materialEditando.nome}
                  onChange={(e) =>
                    setMaterialEditando({
                      ...materialEditando,
                      nome: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Preço Unitário (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={materialEditando.preco}
                    onChange={(e) =>
                      setMaterialEditando({
                        ...materialEditando,
                        preco: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Estoque Mínimo
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={materialEditando.estoqueMinimo}
                    onChange={(e) =>
                      setMaterialEditando({
                        ...materialEditando,
                        estoqueMinimo: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Saldo Atual
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={materialEditando.quantidade}
                    onChange={(e) =>
                      setMaterialEditando({
                        ...materialEditando,
                        quantidade: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-amber-400 font-semibold mb-1">
                  Causa / Motivo da Alteração *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Contagem física de inventário, avaria, atualização de preço..."
                  value={causaEdicao}
                  onChange={(e) => setCausaEdicao(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalEditarMaterial(false)}
                  className="px-4 py-2 bg-slate-800 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ENTRADA RÁPIDA */}
      {modalEntradaRapida && podeOperar && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold">Entrada Rápida de Estoque</h2>
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
                  Material *
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
                      [{m.codigo}] {m.nome} (Saldo: {formatarQuantidadeBR(m.quantidade)} {m.unidade})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Quantidade a Adicionar *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="Ex: 500 ou 1.250,50"
                  value={entradaQtd}
                  onChange={(e) => setEntradaQtd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-amber-400 font-semibold mb-1">
                  Causa / Origem da Entrada *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nota Fiscal Nº 1234, Devolução de obra..."
                  value={causaEntrada}
                  onChange={(e) => setCausaEntrada(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2 text-sm"
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
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: NOVO PEDIDO E ROMANEIO */}
      {modalNovoPedido && podeOperar && (
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
                  <span>Materiais Disponíveis</span>
                  <span>Itens marcados: {formatarQuantidadeBR(itensSelecionados.length)}</span>
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
                                [{mat.codigo}]
                              </span>
                              {mat.nome}
                            </p>
                            <p className="text-xs text-slate-400">
                              Saldo disponível: {formatarQuantidadeBR(saldo)} {mat.unidade || "UN"}
                            </p>
                          </div>
                        </button>
                        {itemMarcado && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Qtd:</span>
                            <input
                              type="text"
                              inputMode="decimal"
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
                    {formatarQuantidadeBR(itensSelecionados.length)}
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
    </div>
  );
}
