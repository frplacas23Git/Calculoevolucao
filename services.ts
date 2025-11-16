
import type { AppData, Movimentacao, Produto, Totals, User } from './types';

// --- CONSTANTS ---
const LS_USERS_KEY = "cf_users";
const LS_SESSION_KEY = "cf_session";
const LS_DATA_PREFIX = "cf_data_";

// --- UTILS ---
export const formatMoney = (value: number | string): string => {
  const n = Number(value) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const parseNumber = (value: string | number | undefined | null): number => {
  if (value === "" || value === null || value === undefined) return 0;
  return Number(String(value).replace?.(",", ".") || value) || 0;
};

export const todayStr = (): string => {
  return new Date().toISOString().slice(0, 10);
};

export const exportToCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const csvRows = [];
  csvRows.push(headers.join(";"));
  rows.forEach(row => {
    const line = row
      .map(val => {
        const v = (val ?? "").toString().replace(/"/g, '""');
        if (v.includes(";") || v.includes('"') || v.includes("\n")) {
          return `"${v}"`;
        }
        return v;
      })
      .join(";");
    csvRows.push(line);
  });

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};


// --- STORAGE SERVICE ---
const dataKeyForUser = (userId: string) => `${LS_DATA_PREFIX}${userId}`;

const getDefaultData = (): AppData => ({
  configFinanceira: { capitalInicial: 0, dataInicio: todayStr(), observacoes: "" },
  produtos: [],
  vendas: [],
  ajustesCapital: [],
});

export const storage = {
  loadUsers: (): User[] => {
    const raw = localStorage.getItem(LS_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  },
  saveUsers: (users: User[]) => {
    localStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
  },
  loadSession: (): { userId: string } | null => {
    const raw = localStorage.getItem(LS_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  saveSession: (session: { userId: string }) => {
    localStorage.setItem(LS_SESSION_KEY, JSON.stringify(session));
  },
  clearSession: () => {
    localStorage.removeItem(LS_SESSION_KEY);
  },
  loadData: (userId: string): AppData => {
    const raw = localStorage.getItem(dataKeyForUser(userId));
    if (!raw) return getDefaultData();
    try {
        const data = JSON.parse(raw);
        // Ensure all keys exist to prevent runtime errors
        return { ...getDefaultData(), ...data };
    } catch {
        return getDefaultData();
    }
  },
  saveData: (userId: string, data: AppData) => {
    localStorage.setItem(dataKeyForUser(userId), JSON.stringify(data));
  },
};

// --- ANALYSIS SERVICE ---
export const getEstoquePorProduto = (produtoId: string, data: AppData): number => {
    const p = data.produtos.find(prod => prod.id === produtoId);
    if (!p) return 0;
    const qtdVendida = data.vendas
      .filter(v => v.produtoId === produtoId)
      .reduce((acc, v) => acc + (Number(v.quantidadeVendida) || 0), 0);
    return (Number(p.quantidadeComprada) || 0) - qtdVendida;
};

const buildMovimentacoes = (data: AppData): Movimentacao[] => {
    const movs: Movimentacao[] = [];

    data.produtos.forEach(p => {
      const total = p.quantidadeComprada * p.valorCompraUnitario;
      if (total > 0) {
        movs.push({
          tipo: "COMPRA",
          data: p.dataCompra || todayStr(),
          valor: -total,
          descricao: `Compra de ${p.nome} (${p.quantidadeComprada} x ${formatMoney(p.valorCompraUnitario)})`
        });
      }
    });

    data.vendas.forEach(v => {
      const produto = data.produtos.find(p => p.id === v.produtoId);
      const total = v.quantidadeVendida * v.valorVendaUnitario;
      if (total > 0) {
        movs.push({
          tipo: "VENDA",
          data: v.dataVenda || todayStr(),
          valor: total,
          descricao: `Venda de ${produto?.nome || 'Produto'} (${v.quantidadeVendida} x ${formatMoney(v.valorVendaUnitario)})`
        });
      }
    });

    data.ajustesCapital.forEach(a => {
      movs.push({
        tipo: "AJUSTE",
        data: a.data || todayStr(),
        valor: a.valor,
        descricao: a.descricao || "Ajuste de capital"
      });
    });

    return movs.sort((a, b) => a.data.localeCompare(b.data));
};

export const calculateTotals = (data: AppData): Totals => {
    const movs = buildMovimentacoes(data);
    const cfg = data.configFinanceira;

    let capitalAtual = cfg.capitalInicial;
    let totalCompras = 0;
    let totalVendas = 0;

    movs.forEach(m => {
      if (m.tipo === "COMPRA") totalCompras += -m.valor;
      if (m.tipo === "VENDA") totalVendas += m.valor;
      capitalAtual += m.valor;
    });

    const lucro = capitalAtual - cfg.capitalInicial;

    let estoqueFinanceiro = 0;
    data.produtos.forEach(p => {
      const estoque = getEstoquePorProduto(p.id, data);
      estoqueFinanceiro += estoque * p.valorCompraUnitario;
    });

    return { movs, capitalAtual, totalCompras, totalVendas, lucro, estoqueFinanceiro };
};

export const buildChartData = (data: AppData): { labels: string[], values: number[] } => {
    const cfg = data.configFinanceira;
    const movs = buildMovimentacoes(data);
    const labels: string[] = [];
    const values: number[] = [];

    let capital = cfg.capitalInicial;
    labels.push(cfg.dataInicio || todayStr());
    values.push(capital);

    movs.forEach(m => {
      capital += m.valor;
      labels.push(m.data);
      values.push(capital);
    });

    return { labels, values };
};
