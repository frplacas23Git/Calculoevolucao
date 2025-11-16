
export type View = 'dashboard' | 'produtos' | 'vendas' | 'config' | 'relatorios';

export interface User {
  id: string;
  nome: string;
  email: string;
  senha: string; // Note: In a real app, never store plain text passwords.
}

export interface Session {
  userId: string;
}

export interface ConfigFinanceira {
  capitalInicial: number;
  dataInicio: string;
  observacoes: string;
}

export interface Produto {
  id: string;
  nome: string;
  categoria: string;
  dataCompra: string;
  valorCompraUnitario: number;
  quantidadeComprada: number;
  fornecedor: string;
  observacoes: string;
}

export interface Venda {
  id: string;
  produtoId: string;
  dataVenda: string;
  quantidadeVendida: number;
  valorVendaUnitario: number;
  cliente: string;
  observacoes: string;
}

export interface AjusteCapital {
  id: string;
  data: string;
  valor: number;
  descricao: string;
}

export interface AppData {
  configFinanceira: ConfigFinanceira;
  produtos: Produto[];
  vendas: Venda[];
  ajustesCapital: AjusteCapital[];
}

export interface Movimentacao {
  tipo: 'COMPRA' | 'VENDA' | 'AJUSTE';
  data: string;
  valor: number;
  descricao: string;
}

export interface Totals {
  movs: Movimentacao[];
  capitalAtual: number;
  totalCompras: number;
  totalVendas: number;
  lucro: number;
  estoqueFinanceiro: number;
}
