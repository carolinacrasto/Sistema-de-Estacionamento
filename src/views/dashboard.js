import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Card from '../components/card';

function Dashboard() {
  const navigate = useNavigate();

  const [categorias, setCategorias] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);

  useEffect(() => {
    axios
      .get('/db.json')
      .then((response) => {
        setCategorias(response.data?.categorias || []);
        setTickets(response.data?.tickets || []);
        setPagamentos(response.data?.pagamentos || []);
      })
      .catch((error) => {
        console.error('Erro ao carregar dados do dashboard:', error);
      });
  }, []);

  const hoje = new Date().toISOString().split('T')[0];
  const entradasHoje = tickets.filter((t) => t.dataEntrada === hoje).length;
  const ticketsAbertos = tickets.filter(
    (t) => String(t.status || '').toUpperCase() === 'ABERTO'
  ).length;

  const totalVagasDisponiveis = categorias.reduce((acc, cat) => {
    const livres = Number(cat.vagasTotais || 0) - Number(cat.vagasOcupadas || 0);
    return acc + (livres > 0 ? livres : 0);
  }, 0);

  const ultimasOperacoes = [...tickets]
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, 5);

  const formatarValor = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '-';
    const num = Number(valor);
    if (Number.isNaN(num)) return String(valor);
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
  };

  return (
    <div className='container'>
      <Card title='Dashboard - Resumo Operacional'>
        <div className='row mb-4'>
          <div className='col-md-4 mb-2'>
            <div className='border rounded p-3 bg-light'>
              <small className='text-muted d-block'>Vagas Disponíveis</small>
              <strong className='fs-4'>{totalVagasDisponiveis}</strong>
            </div>
          </div>

          <div className='col-md-4 mb-2'>
            <div className='border rounded p-3 bg-light'>
              <small className='text-muted d-block'>Entradas Hoje ({hoje})</small>
              <strong className='fs-4'>{entradasHoje}</strong>
            </div>
          </div>

          <div className='col-md-4 mb-2'>
            <div className='border rounded p-3 bg-light'>
              <small className='text-muted d-block'>Tickets em Aberto</small>
              <strong className='fs-4'>{ticketsAbertos}</strong>
            </div>
          </div>
        </div>

        <div className='mb-4'>
          <h6 className='mb-2'>Atalhos Rápidos</h6>
          <Stack spacing={1} direction='row' className='flex-wrap'>
            <button
              type='button'
              className='btn btn-warning'
              onClick={() => navigate('/cadastro-tickets')}
            >
              Nova Entrada
            </button>
            <button
              type='button'
              className='btn btn-success'
              onClick={() => navigate('/cadastro-pagamentos')}
            >
              Encerrar / Pagar Ticket
            </button>
            <button
              type='button'
              className='btn btn-primary'
              onClick={() => navigate('/cadastro-caixa')}
            >
              Caixa
            </button>
            <button
              type='button'
              className='btn btn-outline-dark'
              onClick={() => navigate('/cadastro-sangria')}
            >
              Sangria
            </button>
            <button
              type='button'
              className='btn btn-outline-dark'
              onClick={() => navigate('/cadastro-reforco')}
            >
              Reforço
            </button>
          </Stack>
        </div>

        <div className='mb-4'>
          <h6 className='mb-2'>Vagas por Categoria</h6>
          <table className='table table-hover'>
            <thead>
              <tr>
                <th scope='col'>Categoria</th>
                <th scope='col'>Totais</th>
                <th scope='col'>Ocupadas</th>
                <th scope='col'>Disponíveis</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((cat) => {
                const totais = Number(cat.vagasTotais || 0);
                const ocupadas = Number(cat.vagasOcupadas || 0);
                const disponiveis = Math.max(totais - ocupadas, 0);

                return (
                  <tr key={cat.id}>
                    <td>
                      <strong>{cat.nome}</strong>
                    </td>
                    <td>{totais}</td>
                    <td>{ocupadas}</td>
                    <td>
                      <span
                        className={`badge ${
                          disponiveis > 0 ? 'bg-success' : 'bg-danger'
                        }`}
                      >
                        {disponiveis}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div>
          <h6 className='mb-2'>Últimas Operações</h6>
          <table className='table table-hover'>
            <thead>
              <tr>
                <th scope='col'>Ticket</th>
                <th scope='col'>Placa</th>
                <th scope='col'>Categoria</th>
                <th scope='col'>Entrada</th>
                <th scope='col'>Valor</th>
                <th scope='col'>Status</th>
              </tr>
            </thead>
            <tbody>
              {ultimasOperacoes.map((t) => {
                const pag = pagamentos.find(
                  (p) => Number(p.ticketId) === Number(t.id)
                );
                const finalizado =
                  String(t.status || '').toUpperCase() === 'FINALIZADO' ||
                  String(pag?.status || '').toUpperCase() === 'PAGO';
                const statusAtual = finalizado ? 'FINALIZADO' : 'ABERTO';
                const valorExibido = t.valorTotal ?? pag?.valor ?? null;

                return (
                  <tr key={t.id}>
                    <td>#{t.id}</td>
                    <td>
                      <strong>{t.placa}</strong>
                    </td>
                    <td>{t.categoria}</td>
                    <td>
                      {t.dataEntrada} às {t.horaEntrada}
                    </td>
                    <td>{formatarValor(valorExibido)}</td>
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
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default Dashboard;