
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { AppData, Produto, User, Venda, View, AjusteCapital, Totals } from './types';
import { storage, calculateTotals, buildChartData, formatMoney, todayStr, parseNumber, getEstoquePorProduto, exportToCsv } from './services';
import Auth from './components/Auth';
import CapitalChart from './components/CapitalChart';

// --- Reusable UI Components ---

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-slate-950 rounded-xl p-4 border border-slate-800/50 shadow-lg shadow-black/20 ${className}`}>
    {children}
  </div>
);

const KpiCard: React.FC<{ label: string; value: string; sub: string }> = ({ label, value, sub }) => (
  <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/50">
    <div className="text-xs text-slate-400 mb-1">{label}</div>
    <div className="text-lg font-semibold text-white">{value}</div>
    <div className="text-xs text-slate-500">{sub}</div>
  </div>
);

// --- View Components ---

const Dashboard: React.FC<{ totals: Totals; chartData: { labels: string[], values: number[] }; config: AppData['configFinanceira'] }> = ({ totals, chartData, config }) => {
  const variacaoPct = useMemo(() => {
    if (!config.capitalInicial) return 0;
    return (totals.lucro / config.capitalInicial) * 100;
  }, [totals.lucro, config.capitalInicial]);

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mt-0 text-base font-semibold mb-3 text-white">Visão geral</h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          <KpiCard label="Capital inicial" value={formatMoney(config.capitalInicial)} sub={config.dataInicio ? `Desde ${new Date(config.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'Defina em "Configuração"'} />
          <KpiCard label="Capital atual" value={formatMoney(totals.capitalAtual)} sub={`Variação: ${variacaoPct.toFixed(2)}%`} />
          <KpiCard label="Lucro acumulado" value={formatMoney(totals.lucro)} sub="Considerando tudo" />
          <KpiCard label="Dinheiro em estoque" value={formatMoney(totals.estoqueFinanceiro)} sub="Custo de itens não vendidos" />
        </div>
      </Card>
      <Card>
        <h2 className="mt-0 text-base font-semibold mb-3 text-white">Resumo financeiro</h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <KpiCard label="Total em compras" value={formatMoney(totals.totalCompras)} sub="Somente operações registradas" />
          <KpiCard label="Total em vendas" value={formatMoney(totals.totalVendas)} sub="Somatório bruto de vendas" />
        </div>
      </Card>
      <Card>
        <h2 className="mt-0 text-base font-semibold mb-3 text-white">Curva de crescimento do capital</h2>
        <CapitalChart data={chartData} />
      </Card>
    </div>
  );
};

const Produtos: React.FC<{ data: AppData; addProduto: (p: Omit<Produto, 'id'>) => void }> = ({ data, addProduto }) => {
    const [form, setForm] = useState({ nome: '', categoria: '', dataCompra: todayStr(), valorCompraUnitario: '', quantidadeComprada: '', fornecedor: '', observacoes: '' });
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { nome, dataCompra } = form;
        const valorUnit = parseNumber(form.valorCompraUnitario);
        const qtd = parseNumber(form.quantidadeComprada);
        if (!nome || qtd <= 0 || valorUnit <= 0) {
            alert("Informe nome, quantidade e valor de compra maior que zero.");
            return;
        }
        addProduto({
            nome,
            categoria: form.categoria,
            dataCompra,
            valorCompraUnitario: valorUnit,
            quantidadeComprada: qtd,
            fornecedor: form.fornecedor,
            observacoes: form.observacoes
        });
        setForm({ nome: '', categoria: '', dataCompra: todayStr(), valorCompraUnitario: '', quantidadeComprada: '', fornecedor: '', observacoes: '' });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const getStatusEstoque = (produtoId: string) => {
        const p = data.produtos.find(prod => prod.id === produtoId);
        if (!p) return { label: 'N/A', badge: 'bg-slate-700 text-slate-300' };
        const estoque = getEstoquePorProduto(produtoId, data);
        if (estoque <= 0) return { label: 'Vendido', badge: 'bg-green-900/80 text-green-300' };
        if (estoque === p.quantidadeComprada) return { label: 'Em estoque', badge: 'bg-slate-700 text-slate-300' };
        return { label: 'Parcial', badge: 'bg-yellow-900/80 text-yellow-300' };
    }

    return (
        <div className="space-y-4">
            <Card>
                <h2 className="mt-0 text-base font-semibold mb-3 text-white">Registrar compra de ferramenta</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm text-slate-400 block mb-1">Nome do produto</label>
                            <input name="nome" value={form.nome} onChange={handleChange} type="text" className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-gray-200 text-sm" required />
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 block mb-1">Categoria</label>
                            <input name="categoria" value={form.categoria} onChange={handleChange} type="text" className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-gray-200 text-sm" />
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="text-sm text-slate-400 block mb-1">Data da compra</label>
                            <input name="dataCompra" value={form.dataCompra} onChange={handleChange} type="date" className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-gray-200 text-sm" />
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 block mb-1">Valor de compra (R$)</label>
                            <input name="valorCompraUnitario" value={form.valorCompraUnitario} onChange={handleChange} type="number" step="0.01" min="0" className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-gray-200 text-sm" required />
                        </div>
                         <div>
                            <label className="text-sm text-slate-400 block mb-1">Quantidade</label>
                            <input name="quantidadeComprada" value={form.quantidadeComprada} onChange={handleChange} type="number" step="1" min="1" className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-gray-200 text-sm" required />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="bg-green-600 text-white font-semibold px-4 py-2 rounded-lg text-sm">Salvar compra</button>
                    </div>
                </form>
            </Card>
            <Card>
                <h2 className="mt-0 text-base font-semibold mb-3 text-white">Estoque de ferramentas</h2>
                <div className="max-h-96 overflow-auto rounded-lg border border-slate-800">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-950">
                            <tr>
                                <th className="p-2 text-left text-slate-400">Produto</th>
                                <th className="p-2 text-left text-slate-400">Data Compra</th>
                                <th className="p-2 text-left text-slate-400">Estoque</th>
                                <th className="p-2 text-left text-slate-400">Custo Total</th>
                                <th className="p-2 text-left text-slate-400">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {data.produtos.map(p => {
                                const status = getStatusEstoque(p.id);
                                return (
                                <tr key={p.id} className="hover:bg-slate-900">
                                    <td className="p-2">{p.nome}</td>
                                    <td className="p-2">{new Date(p.dataCompra + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                    <td className="p-2">{getEstoquePorProduto(p.id, data)} / {p.quantidadeComprada}</td>
                                    <td className="p-2">{formatMoney(p.quantidadeComprada * p.valorCompraUnitario)}</td>
                                    <td className="p-2"><span className={`inline-block px-2 py-0.5 rounded-full text-xs ${status.badge}`}>{status.label}</span></td>
                                </tr>
                                )}
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

const Vendas: React.FC<{ data: AppData; addVenda: (v: Omit<Venda, 'id'>) => void }> = ({ data, addVenda }) => {
    const [form, setForm] = useState({ produtoId: '', dataVenda: todayStr(), quantidadeVendida: '', valorVendaUnitario: '' });
    const produtosEmEstoque = useMemo(() => data.produtos.filter(p => getEstoquePorProduto(p.id, data) > 0), [data]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { produtoId, dataVenda } = form;
        const qtd = parseNumber(form.quantidadeVendida);
        const valorUnit = parseNumber(form.valorVendaUnitario);

        if (!produtoId || qtd <= 0 || valorUnit <= 0) {
            alert("Selecione um produto e informe quantidade e valor de venda maiores que zero.");
            return;
        }

        const estoque = getEstoquePorProduto(produtoId, data);
        if (qtd > estoque) {
            alert(`Quantidade (${qtd}) maior que o estoque (${estoque}).`);
            return;
        }

        addVenda({ produtoId, dataVenda, quantidadeVendida: qtd, valorVendaUnitario: valorUnit, cliente: '', observacoes: '' });
        setForm({ produtoId: '', dataVenda: todayStr(), quantidadeVendida: '', valorVendaUnitario: '' });
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };
    
    return (
        <div className="space-y-4">
            <Card>
                <h2 className="mt-0 text-base font-semibold mb-3 text-white">Registrar Venda</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                             <label className="text-sm text-slate-400 block mb-1">Produto</label>
                             <select name="produtoId" value={form.produtoId} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-gray-200 text-sm" required>
                                <option value="">Selecione...</option>
                                {produtosEmEstoque.map(p => (
                                    <option key={p.id} value={p.id}>{p.nome} (Estoque: {getEstoquePorProduto(p.id, data)})</option>
                                ))}
                             </select>
                        </div>
                        <div>
                             <label className="text-sm text-slate-400 block mb-1">Data da Venda</label>
                             <input name="dataVenda" value={form.dataVenda} onChange={handleChange} type="date" className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-gray-200 text-sm" />
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                             <label className="text-sm text-slate-400 block mb-1">Quantidade Vendida</label>
                             <input name="quantidadeVendida" value={form.quantidadeVendida} onChange={handleChange} type="number" step="1" min="1" className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-gray-200 text-sm" required />
                        </div>
                        <div>
                             <label className="text-sm text-slate-400 block mb-1">Valor Venda Unit. (R$)</label>
                             <input name="valorVendaUnitario" value={form.valorVendaUnitario} onChange={handleChange} type="number" step="0.01" min="0" className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-gray-200 text-sm" required />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="bg-green-600 text-white font-semibold px-4 py-2 rounded-lg text-sm">Salvar Venda</button>
                    </div>
                </form>
            </Card>
            <Card>
                <h2 className="mt-0 text-base font-semibold mb-3 text-white">Histórico de Vendas</h2>
                <div className="max-h-96 overflow-auto rounded-lg border border-slate-800">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-950">
                            <tr>
                                <th className="p-2 text-left text-slate-400">Data</th>
                                <th className="p-2 text-left text-slate-400">Produto</th>
                                <th className="p-2 text-left text-slate-400">Qtd.</th>
                                <th className="p-2 text-left text-slate-400">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {[...data.vendas].reverse().map(v => {
                                const produto = data.produtos.find(p => p.id === v.produtoId);
                                return (
                                <tr key={v.id} className="hover:bg-slate-900">
                                    <td className="p-2">{new Date(v.dataVenda + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                    <td className="p-2">{produto?.nome || 'N/A'}</td>
                                    <td className="p-2">{v.quantidadeVendida}</td>
                                    <td className="p-2">{formatMoney(v.quantidadeVendida * v.valorVendaUnitario)}</td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

const Config: React.FC<{ data: AppData; saveData: (d: AppData) => void; importData: (d: AppData) => void }> = ({ data, saveData, importData }) => {
    const [configForm, setConfigForm] = useState(data.configFinanceira);
    const [ajusteForm, setAjusteForm] = useState({ id: '', data: todayStr(), valor: '', descricao: '' });

    const handleConfigSave = () => {
        saveData({ ...data, configFinanceira: { ...configForm, capitalInicial: parseNumber(configForm.capitalInicial) } });
        alert("Configuração salva.");
    };

    const handleAjusteSave = () => {
        const valor = parseNumber(ajusteForm.valor);
        if (valor === 0 || !ajusteForm.descricao) {
            alert("Informe valor e descrição para o ajuste.");
            return;
        }

        let newAjustes;
        if (ajusteForm.id) {
            newAjustes = data.ajustesCapital.map(a => a.id === ajusteForm.id ? { ...a, ...ajusteForm, valor } : a);
        } else {
            newAjustes = [...data.ajustesCapital, { ...ajusteForm, valor, id: `a_${Date.now()}` }];
        }
        
        saveData({ ...data, ajustesCapital: newAjustes });
        setAjusteForm({ id: '', data: todayStr(), valor: '', descricao: '' });
    };

    const deleteAjuste = (id: string) => {
        if (window.confirm("Deseja realmente excluir este ajuste?")) {
            saveData({ ...data, ajustesCapital: data.ajustesCapital.filter(a => a.id !== id) });
        }
    };

    const handleExport = () => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cf_backup_${todayStr()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const imported = JSON.parse(ev.target?.result as string);
                // Basic validation
                if (imported.configFinanceira && imported.produtos) {
                    importData(imported);
                    alert("Backup importado com sucesso!");
                } else { throw new Error("Formato inválido"); }
            } catch (err) { alert("Arquivo de backup inválido."); }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-4">
            <Card>
                <h2 className="mt-0 text-base font-semibold mb-3 text-white">Capital Inicial e Ajustes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm text-slate-400 block mb-1">Capital inicial (R$)</label>
                        <input type="number" value={configForm.capitalInicial} onChange={e => setConfigForm({...configForm, capitalInicial: parseNumber(e.target.value)})} className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-gray-200 text-sm" />
                    </div>
                     <div>
                        <label className="text-sm text-slate-400 block mb-1">Data de Início</label>
                        <input type="date" value={configForm.dataInicio} onChange={e => setConfigForm({...configForm, dataInicio: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-gray-200 text-sm" />
                    </div>
                </div>
                 <div className="flex justify-end pt-4">
                    <button onClick={handleConfigSave} className="bg-green-600 text-white font-semibold px-4 py-2 rounded-lg text-sm">Salvar Configuração</button>
                </div>
            </Card>
             <Card>
                <h2 className="mt-0 text-base font-semibold mb-3 text-white">Registrar Ajuste de Capital</h2>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="text-sm text-slate-400 block mb-1">Data</label>
                        <input type="date" value={ajusteForm.data} onChange={e => setAjusteForm({...ajusteForm, data: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-gray-200 text-sm" />
                    </div>
                    <div>
                        <label className="text-sm text-slate-400 block mb-1">Valor do ajuste (R$)</label>
                        <input type="number" step="0.01" value={ajusteForm.valor} onChange={e => setAjusteForm({...ajusteForm, valor: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-gray-200 text-sm" />
                    </div>
                     <div>
                        <label className="text-sm text-slate-400 block mb-1">Descrição</label>
                        <input type="text" placeholder="Aporte extra, retirada..." value={ajusteForm.descricao} onChange={e => setAjusteForm({...ajusteForm, descricao: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-gray-200 text-sm" />
                    </div>
                </div>
                <div className="flex justify-end pt-4">
                    <button onClick={handleAjusteSave} className="bg-green-600 text-white font-semibold px-4 py-2 rounded-lg text-sm">{ajusteForm.id ? 'Atualizar' : 'Salvar'} Ajuste</button>
                </div>
                <div className="mt-4 max-h-60 overflow-auto rounded-lg border border-slate-800">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-950">
                            <tr>
                                <th className="p-2 text-left text-slate-400">Data</th><th className="p-2 text-left text-slate-400">Valor</th><th className="p-2 text-left text-slate-400">Descrição</th><th className="p-2 text-left text-slate-400">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {data.ajustesCapital.map(a => <tr key={a.id}>
                                <td className="p-2">{new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                <td className={`p-2 ${a.valor > 0 ? 'text-green-400' : 'text-red-400'}`}>{formatMoney(a.valor)}</td>
                                <td className="p-2">{a.descricao}</td>
                                <td className="p-2 space-x-2">
                                    <button onClick={() => deleteAjuste(a.id)} className="bg-red-600/80 text-white px-2 py-1 rounded text-xs">Excluir</button>
                                </td>
                            </tr>)}
                        </tbody>
                    </table>
                </div>
            </Card>
            <Card>
                <h2 className="mt-0 text-base font-semibold mb-3 text-white">Backup e Restauração</h2>
                 <div className="flex gap-2">
                    <button onClick={handleExport} className="bg-slate-700 text-white font-semibold px-4 py-2 rounded-lg text-sm">Exportar (JSON)</button>
                    <label className="bg-green-600 text-white font-semibold px-4 py-2 rounded-lg text-sm cursor-pointer">
                        Importar (JSON)
                        <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                    </label>
                </div>
            </Card>
        </div>
    );
};

const Relatorios: React.FC<{ data: AppData; totals: Totals }> = ({ data, totals }) => {
    
    const productReports = useMemo(() => {
        return data.produtos.map(p => {
            const custoTotal = p.quantidadeComprada * p.valorCompraUnitario;
            const vendasProduto = data.vendas.filter(v => v.produtoId === p.id);
            const totalVendas = vendasProduto.reduce((acc, v) => acc + v.quantidadeVendida * v.valorVendaUnitario, 0);
            const lucro = totalVendas - custoTotal;
            const margem = totalVendas > 0 ? (lucro / totalVendas) * 100 : 0;
            const roi = custoTotal > 0 ? (lucro / custoTotal) * 100 : 0;
            const estoque = getEstoquePorProduto(p.id, data);
            let status = 'Em estoque';
            if (estoque <= 0) status = 'Vendido';
            else if (estoque < p.quantidadeComprada) status = 'Parcial';

            return { id: p.id, nome: p.nome, custoTotal, totalVendas, lucro, margem, roi, status };
        });
    }, [data]);
    
    const handleExportProdutos = () => {
        exportToCsv(`produtos_${todayStr()}.csv`, 
            ["Produto", "Custo Total", "Vendas", "Lucro", "Margem (%)", "ROI (%)", "Status"],
            productReports.map(p => [p.nome, p.custoTotal, p.totalVendas, p.lucro, p.margem.toFixed(2), p.roi.toFixed(2), p.status])
        );
    };

    const handleExportMov = () => {
        exportToCsv(`movimentacoes_${todayStr()}.csv`,
            ["Data", "Tipo", "Descrição", "Valor"],
            totals.movs.map(m => [m.data, m.tipo, m.descricao, m.valor])
        );
    };

    return (
        <div className="space-y-4">
            <Card>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="mt-0 text-base font-semibold text-white">Relatório de Produtos</h2>
                    <button onClick={handleExportProdutos} className="bg-slate-700 text-white font-semibold px-3 py-1 rounded-lg text-xs">Exportar CSV</button>
                </div>
                <div className="max-h-96 overflow-auto rounded-lg border border-slate-800">
                    <table className="w-full text-sm">
                         <thead className="sticky top-0 bg-slate-950">
                            <tr>
                                <th className="p-2 text-left text-slate-400">Produto</th>
                                <th className="p-2 text-left text-slate-400">Custo</th>
                                <th className="p-2 text-left text-slate-400">Vendas</th>
                                <th className="p-2 text-left text-slate-400">Lucro</th>
                                <th className="p-2 text-left text-slate-400">ROI</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-slate-800">
                            {productReports.map(p => <tr key={p.id}>
                                <td className="p-2">{p.nome}</td>
                                <td className="p-2">{formatMoney(p.custoTotal)}</td>
                                <td className="p-2">{formatMoney(p.totalVendas)}</td>
                                <td className={`p-2 ${p.lucro > 0 ? 'text-green-400' : 'text-red-400'}`}>{formatMoney(p.lucro)}</td>
                                <td className={`p-2 ${p.roi > 0 ? 'text-green-400' : 'text-red-400'}`}>{p.roi.toFixed(1)}%</td>
                            </tr>)}
                        </tbody>
                    </table>
                </div>
            </Card>
            <Card>
                 <div className="flex justify-between items-center mb-3">
                    <h2 className="mt-0 text-base font-semibold text-white">Relatório Financeiro</h2>
                     <button onClick={handleExportMov} className="bg-slate-700 text-white font-semibold px-3 py-1 rounded-lg text-xs">Exportar CSV</button>
                </div>
                <div className="max-h-96 overflow-auto rounded-lg border border-slate-800">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-950">
                            <tr>
                                <th className="p-2 text-left text-slate-400">Data</th>
                                <th className="p-2 text-left text-slate-400">Tipo</th>
                                <th className="p-2 text-left text-slate-400">Descrição</th>
                                <th className="p-2 text-left text-slate-400">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {[...totals.movs].reverse().map((m, i) => <tr key={i}>
                                <td className="p-2">{new Date(m.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                <td className="p-2">{m.tipo}</td>
                                <td className="p-2 truncate max-w-xs">{m.descricao}</td>
                                <td className={`p-2 ${m.valor > 0 ? 'text-green-400' : 'text-red-400'}`}>{formatMoney(m.valor)}</td>
                            </tr>)}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};


// --- Main App Component ---

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [appData, setAppData] = useState<AppData | null>(null);
    const [activeView, setActiveView] = useState<View>('dashboard');

    useEffect(() => {
        const session = storage.loadSession();
        if (session?.userId) {
            const users = storage.loadUsers();
            const user = users.find(u => u.id === session.userId);
            if (user) {
                setCurrentUser(user);
                setAppData(storage.loadData(user.id));
            }
        }
    }, []);

    const handleLogin = (email: string, pass: string): boolean => {
        const users = storage.loadUsers();
        const user = users.find(u => u.email === email && u.senha === pass);
        if (user) {
            storage.saveSession({ userId: user.id });
            setCurrentUser(user);
            setAppData(storage.loadData(user.id));
            return true;
        }
        return false;
    };

    const handleRegister = (name: string, email: string, pass: string): boolean => {
        const users = storage.loadUsers();
        if (users.some(u => u.email === email)) return false;

        const newUser: User = { id: `u_${Date.now()}`, nome: name, email, senha: pass };
        storage.saveUsers([...users, newUser]);
        storage.saveSession({ userId: newUser.id });
        setCurrentUser(newUser);
        setAppData(storage.loadData(newUser.id)); // This will load default data
        return true;
    };

    const handleLogout = () => {
        storage.clearSession();
        setCurrentUser(null);
        setAppData(null);
    };

    const saveData = useCallback((data: AppData) => {
        if (currentUser) {
            setAppData(data);
            storage.saveData(currentUser.id, data);
        }
    }, [currentUser]);

    const addProduto = (p: Omit<Produto, 'id'>) => {
        if (!appData) return;
        const newProduto: Produto = { ...p, id: `p_${Date.now()}` };
        saveData({ ...appData, produtos: [...appData.produtos, newProduto] });
    };

    const addVenda = (v: Omit<Venda, 'id'>) => {
        if (!appData) return;
        const newVenda: Venda = { ...v, id: `v_${Date.now()}` };
        saveData({ ...appData, vendas: [...appData.vendas, newVenda] });
    };
    
    const importData = (data: AppData) => {
        saveData(data);
    };
    
    const totals = useMemo(() => appData ? calculateTotals(appData) : null, [appData]);
    const chartData = useMemo(() => appData ? buildChartData(appData) : { labels: [], values: [] }, [appData]);

    if (!currentUser || !appData || !totals) {
        return <Auth onLogin={handleLogin} onRegister={handleRegister} />;
    }

    const renderView = () => {
        switch (activeView) {
            case 'dashboard': return <Dashboard totals={totals} chartData={chartData} config={appData.configFinanceira} />;
            case 'produtos': return <Produtos data={appData} addProduto={addProduto} />;
            case 'vendas': return <Vendas data={appData} addVenda={addVenda} />;
            case 'config': return <Config data={appData} saveData={saveData} importData={importData} />;
            case 'relatorios': return <Relatorios data={appData} totals={totals} />;
            default: return null;
        }
    };
    
    const navItems: { id: View; label: string }[] = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'produtos', label: 'Produtos' },
        { id: 'vendas', label: 'Vendas' },
        { id: 'config', label: 'Config' },
        { id: 'relatorios', label: 'Relatórios' }
    ];

    return (
        <div>
            <header className="bg-slate-950 p-4 flex justify-between items-center border-b border-slate-700/50 sticky top-0 z-10">
                <div>
                    <h1 className="text-base font-semibold text-white">Invest & Lucro</h1>
                    <span className="text-xs text-slate-400">{currentUser.nome}</span>
                </div>
                <button onClick={handleLogout} className="bg-slate-700 text-white font-semibold px-4 py-2 rounded-lg text-sm">Sair</button>
            </header>
            <main className="p-4 max-w-7xl mx-auto pb-24">{renderView()}</main>
            <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-sm border-t border-slate-700/50 flex justify-around p-1 z-50">
                {navItems.map(item => (
                    <button key={item.id} onClick={() => setActiveView(item.id)} className={`flex-1 text-center text-xs p-2 rounded-md transition-colors ${activeView === item.id ? 'text-green-400 font-semibold bg-green-500/10' : 'text-slate-400'}`}>
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default App;
