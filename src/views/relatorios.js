import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Card from '../components/card';

function lerStorageOuFallback(chave, fallback) {
  try {
    const raw = localStorage.getItem(chave);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}

function normalizarData(valor) {
  if (!valor) return '';
  return String(valor).trim().slice(0, 10);
}

function dataDentroDoPeriodo(dataStr, inicioStr, fimStr) {
  const dataLimpa = normalizarData(dataStr);
  const inicioLimpo = normalizarData(inicioStr);
  const fimLimpo = normalizarData(fimStr);

  if (!inicioLimpo && !fimLimpo) return true;
  if (!dataLimpa) return false;

  if (inicioLimpo && dataLimpa < inicioLimpo) return false;
  if (fimLimpo && dataLimpa > fimLimpo) return false;

  return true;
}

function Relatorios() {
  const [tickets, setTickets] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    axios
      .get('/db.json')
      .then((response) => {
        const dbTickets = response.data?.tickets || [];
        const dbPagamentos = response.data?.pagamentos || [];

        setTickets(lerStorageOuFallback('scac_tickets', dbTickets));
        setPagamentos(lerStorageOuFallback('scac_pagamentos', dbPagamentos));
      })
      .catch((error) => {
        console.error('Erro ao carregar dados para relatórios:', error);
        setTickets(lerStorageOuFallback('scac_tickets', []));
        setPagamentos(lerStorageOuFallback('scac_pagamentos', []));
      });
  }, []);

  const pagamentosFiltrados = pagamentos.filter((pag) => {
    const statusPag = String(pag.status || '').toUpperCase();
    if (statusPag !== 'PAGO') return false;

    const dataPag = normalizarData(pag.data);
    return dataDentroDoPeriodo(dataPag, dataInicio, dataFim);
  });

  const somarPorForma = (formaAlvo) => {
    return pagamentosFiltrados
      .filter(
        (p) =>
          String(p.formaPagamento || '')
            .replace(/^R\$\s*/i, '')
            .trim()
            .toUpperCase() === formaAlvo
      )
      .reduce((acc, item) => acc + Number(item.valor || 0), 0);
  };

  const totalDinheiro = somarPorForma('DINHEIRO');
  const totalPix = somarPorForma('PIX');
  const totalCartao = somarPorForma('CARTAO');
  const faturamentoTotal = pagamentosFiltrados.reduce(
    (acc, item) => acc + Number(item.valor || 0),
    0
  );

  const ticketsFiltrados = tickets.filter((t) => {
    const pagDoTicket = pagamentos.find(
      (p) => Number(p.ticketId) === Number(t.id)
    );

    const bateEntrada = dataDentroDoPeriodo(t.dataEntrada, dataInicio, dataFim);
    const bateSaida = dataDentroDoPeriodo(t.dataSaida, dataInicio, dataFim);
    const batePagamento = dataDentroDoPeriodo(
      pagDoTicket?.data,
      dataInicio,
      dataFim
    );

    if (!normalizarData(dataInicio) && !normalizarData(dataFim)) {
      return true;
    }

    return bateEntrada || bateSaida || batePagamento;
  });

  const formatarMoeda = (valor) => {
    const num = Number(valor || 0);
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
  };

  const limparFiltro = () => {
    setDataInicio('');
    setDataFim('');
  };

  return (
    <div className='container'>
      <Card title='Relatórios - Faturamento e Histórico'>
        <div className='row mb-4'>
          <div className='col-md-4 mb-2'>
            <label htmlFor='filtroDataInicio' className='form-label'>
              Data Início
            </label>
            <input
              type='date'
              id='filtroDataInicio'
              className='form-control'
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>

          <div className='col-md-4 mb-2'>
            <label htmlFor='filtroDataFim' className='form-label'>
              Data Fim
            </label>
            <input
              type='date'
              id='filtroDataFim'
              className='form-control'
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>

          <div className='col-md-4 d-flex align-items-end mb-2'>
            <button
              type='button'
              className='btn btn-secondary'
              onClick={limparFiltro}
            >
              Limpar Período
            </button>
          </div>
        </div>

        <div className='row mb-4'>
          <div className='col-md-3 mb-2'>
            <div className='border rounded p-3 bg-light'>
              <small className='text-muted d-block'>Faturamento Total</small>
              <strong className='fs-5 text-success'>
                {formatarMoeda(faturamentoTotal)}
              </strong>
            </div>
          </div>

          <div className='col-md-3 mb-2'>
            <div className='border rounded p-3 bg-light'>
              <small className='text-muted d-block'>Dinheiro</small>
              <strong className='fs-5'>{formatarMoeda(totalDinheiro)}</strong>
            </div>
          </div>

          <div className='col-md-3 mb-2'>
            <div className='border rounded p-3 bg-light'>
              <small className='text-muted d-block'>PIX</small>
              <strong className='fs-5'>{formatarMoeda(totalPix)}</strong>
            </div>
          </div>

          <div className='col-md-3 mb-2'>
            <div className='border rounded p-3 bg-light'>
              <small className='text-muted d-block'>Cartão</small>
              <strong className='fs-5'>{formatarMoeda(totalCartao)}</strong>
            </div>
          </div>
        </div>

        <div>
          <h6 className='mb-2'>
            Histórico de Operações ({ticketsFiltrados.length})
          </h6>
          <table className='table table-hover'>
            <thead>
              <tr>
                <th scope='col'>Ticket</th>
                <th scope='col'>Placa</th>
                <th scope='col'>Categoria</th>
                <th scope='col'>Entrada</th>
                <th scope='col'>Saída</th>
                <th scope='col'>Forma Pgto</th>
                <th scope='col'>Valor</th>
                <th scope='col'>Status</th>
              </tr>
            </thead>
            <tbody>
              {ticketsFiltrados.length > 0 ? (
                ticketsFiltrados.map((ticket) => {
                  const pag = pagamentos.find(
                    (p) => Number(p.ticketId) === Number(ticket.id)
                  );
                  const forma = pag
                    ? String(pag.formaPagamento || '')
                        .replace(/^R\$\s*/i, '')
                        .trim()
                    : '-';
                  const valorRef =
                    ticket.valorTotal !== null &&
                    ticket.valorTotal !== undefined &&
                    ticket.valorTotal !== ''
                      ? formatarMoeda(ticket.valorTotal)
                      : pag?.valor !== undefined
                      ? formatarMoeda(pag.valor)
                      : '-';
                  const finalizado =
                    String(ticket.status || '').toUpperCase() === 'FINALIZADO' ||
                    String(pag?.status || '').toUpperCase() === 'PAGO';
                  const statusAtual = finalizado ? 'FINALIZADO' : 'ABERTO';

                  return (
                    <tr key={ticket.id}>
                      <td>#{ticket.id}</td>
                      <td>
                        <strong>{ticket.placa}</strong>
                      </td>
                      <td>{ticket.categoria}</td>
                      <td>
                        {ticket.dataEntrada} às {ticket.horaEntrada}
                      </td>
                      <td>
                        {ticket.dataSaida && ticket.horaSaida
                          ? `${ticket.dataSaida} às ${ticket.horaSaida}`
                          : 'Em aberto'}
                      </td>
                      <td>{forma}</td>
                      <td>{valorRef}</td>
                      <td>
                        <span
                          className={`badge ${
                            finalizado ? 'bg-success' : 'bg-warning text-dark'
                          }`}
                        >
                          {statusAtual}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan='8' className='text-center text-muted py-3'>
                    Nenhuma operação encontrada para o período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default Relatorios;