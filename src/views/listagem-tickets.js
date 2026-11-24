import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Card from '../components/card';
import axios from 'axios';

function ListagemTickets() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtroPlaca, setFiltroPlaca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');

  useEffect(() => {
    axios
      .get('/db.json')
      .then((response) => {
        const listaTickets = response.data?.tickets || [];
        const listaCategorias = response.data?.categorias || [];

        setTickets(listaTickets);
        setCategorias(listaCategorias);
      })
      .catch((error) => {
        console.error('Erro ao carregar tickets:', error);
        setTickets([]);
        setCategorias([]);
      });
  }, []);

  const cadastrar = () => {
    navigate('/cadastro-tickets');
  };

  const editar = (id) => {
    navigate(`/cadastro-tickets/${id}`);
  };

  const encerrarTicket = (ticket) => {
    navigate(`/cadastro-pagamentos?ticketId=${ticket.id}`, {
      state: { ticket },
    });
  };

  const excluir = (ticket) => {
    const confirmou = window.confirm(
      `Deseja realmente excluir o Ticket #${ticket.id} (${ticket.placa})?`
    );
    if (!confirmou) return;

    const atualizados = tickets.filter(
      (t) => Number(t.id) !== Number(ticket.id)
    );
    setTickets(atualizados);

    if (String(ticket.status || '').toUpperCase() === 'ABERTO') {
      const novasCats = categorias.map((cat) => {
        const mesma =
          Number(cat.id) === Number(ticket.categoriaId) ||
          String(cat.nome || '').toLowerCase() ===
            String(ticket.categoria || '').toLowerCase();
        if (!mesma) return cat;
        return {
          ...cat,
          vagasOcupadas: Math.max(0, Number(cat.vagasOcupadas || 0) - 1),
        };
      });
      setCategorias(novasCats);
    }
  };

  const ticketsFiltrados = tickets.filter((ticket) => {
    const placaOk =
      !filtroPlaca.trim() ||
      String(ticket.placa || '')
        .toUpperCase()
        .includes(filtroPlaca.trim().toUpperCase());

    const statusTicket = String(ticket.status || 'ABERTO').toUpperCase();
    const statusOk = filtroStatus === 'TODOS' || statusTicket === filtroStatus;

    return placaOk && statusOk;
  });

  const formatarMoeda = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '-';
    const num = Number(valor);
    if (Number.isNaN(num)) return '-';
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
  };

  return (
    <div className='container'>
      <Card title='Listagem de Tickets'>
        <div className='row'>
          <div className='col-lg-12'>
            <div className='bs-component'>
              <div className='row mb-3'>
                <div className='col-md-4 mb-2'>
                  <label htmlFor='filtroPlaca' className='form-label'>
                    Buscar por Placa
                  </label>
                  <input
                    type='text'
                    id='filtroPlaca'
                    className='form-control text-uppercase'
                    placeholder='Ex: ABC1D23'
                    value={filtroPlaca}
                    onChange={(e) => setFiltroPlaca(e.target.value.toUpperCase())}
                  />
                </div>

                <div className='col-md-4 mb-2'>
                  <label htmlFor='filtroStatus' className='form-label'>
                    Status do Ticket
                  </label>
                  <select
                    id='filtroStatus'
                    className='form-select'
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                  >
                    <option value='TODOS'>Todos</option>
                    <option value='ABERTO'>ABERTO</option>
                    <option value='FINALIZADO'>FINALIZADO</option>
                  </select>
                </div>

                <div className='col-md-4 d-flex align-items-end mb-2'>
                  <button
                    onClick={cadastrar}
                    type='button'
                    className='btn btn-warning'
                  >
                    Novo Ticket
                  </button>
                </div>
              </div>

              <table className='table table-hover'>
                <thead>
                  <tr>
                    <th scope='col'>Ticket</th>
                    <th scope='col'>Placa</th>
                    <th scope='col'>Categoria</th>
                    <th scope='col'>Entrada</th>
                    <th scope='col'>Saída</th>
                    <th scope='col'>Valor Total</th>
                    <th scope='col'>Status</th>
                    <th scope='col'>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketsFiltrados.length > 0 ? (
                    ticketsFiltrados.map((ticket) => {
                      const statusAtual = String(
                        ticket.status || 'ABERTO'
                      ).toUpperCase();
                      const estaAberto = statusAtual === 'ABERTO';

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
                          <td>{formatarMoeda(ticket.valorTotal)}</td>
                          <td>
                            <span
                              className={`badge ${
                                estaAberto
                                  ? 'bg-warning text-dark'
                                  : 'bg-success'
                              }`}
                            >
                              {statusAtual}
                            </span>
                          </td>
                          <td>
                            <Stack
                              spacing={1}
                              direction='row'
                              alignItems='center'
                            >
                              <button
                                type='button'
                                disabled={!estaAberto}
                                title={
                                  estaAberto
                                    ? 'Encerrar e pagar ticket'
                                    : 'Ticket já encerrado'
                                }
                                onClick={() => encerrarTicket(ticket)}
                                className={`btn btn-sm rounded-circle d-inline-flex align-items-center justify-content-center fw-bold ${
                                  estaAberto ? 'btn-success' : 'btn-secondary'
                                }`}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  padding: 0,
                                }}
                              >
                                $
                              </button>
                              <button
                                type='button'
                                title='Editar ticket'
                                onClick={() => editar(ticket.id)}
                                className='btn btn-primary btn-sm'
                              >
                                Editar
                              </button>
                              <button
                                type='button'
                                title='Excluir ticket'
                                onClick={() => excluir(ticket)}
                                className='btn btn-danger btn-sm'
                              >
                                Excluir
                              </button>
                            </Stack>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan='8' className='text-center text-muted py-3'>
                        Nenhum ticket encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ListagemTickets;