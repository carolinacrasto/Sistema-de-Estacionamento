import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Card from '../components/card';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import { IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

function ListagemPagamentos(props) {
  const navigate = useNavigate();
  const [pagamentos, setPagamentos] = useState([]);

  const isAdmin =
    String(props.usuarioLogado?.perfil || '').trim().toUpperCase() === 'ADMIN';

  const cadastrar = () => {
    navigate('/cadastro-pagamentos');
  };

  const editar = (dado) => {
    const jaPago = String(dado.status || '').toUpperCase() === 'PAGO';
    if (jaPago && !isAdmin) {
      alert(
        'Pagamento já finalizado (PAGO). Alteração permitida somente com autorização do ADMIN.'
      );
      return;
    }
    navigate(`/cadastro-pagamentos/${dado.id}`);
  };

  const excluir = (dado) => {
    if (!isAdmin) return;

    if (String(dado.status || '').toUpperCase() === 'PAGO') {
      alert('Não é permitido excluir um pagamento já PAGO.');
      return;
    }

    const confirmou = window.confirm(
      `Deseja realmente excluir o Pagamento #${dado.id}?`
    );
    if (!confirmou) return;

    setPagamentos(pagamentos.filter((item) => item.id !== dado.id));
  };

  useEffect(() => {
    axios
      .get('/db.json')
      .then((response) => {
        const listaTickets = response.data?.tickets || [];
        const listaPagamentos = [...(response.data?.pagamentos || [])];

        const sincronizada = listaPagamentos.map((pag) => {
          const ticket = listaTickets.find(
            (t) => Number(t.id) === Number(pag.ticketId)
          );
          if (ticket) {
            const stTicket = String(ticket.status || '').toUpperCase();
            if (stTicket === 'FINALIZADO') {
              return { ...pag, status: 'PAGO' };
            }
            if (stTicket === 'ABERTO') {
              return { ...pag, status: 'EM ABERTO' };
            }
          }
          return { ...pag, status: pag.status || 'EM ABERTO' };
        });

        setPagamentos(sincronizada);
      })
      .catch((error) => {
        console.error('Erro ao buscar pagamentos:', error);
      });
  }, []);

  const formatarFormaPagamento = (forma) => {
    return String(forma || '').replace(/^R\$\s*/i, '').trim();
  };

  const formatarMoeda = (valor) => {
    if (valor === null || valor === undefined || valor === '') {
      return '0,00';
    }
    const numero = Number(valor);
    if (Number.isNaN(numero)) {
      return String(valor);
    }
    return numero.toFixed(2).replace('.', ',');
  };

  return (
    <div className='container'>
      <Card title='Listagem de Pagamentos'>
        <div className='row'>
          <div className='col-lg-12'>
            <div className='bs-component'>
              {!isAdmin && (
                <div className='alert alert-info py-2 px-3 mb-3'>
                  Pagamentos já <strong>PAGO</strong> não podem ser alterados por{' '}
                  <strong>OPERADOR</strong> (somente com autorização de{' '}
                  <strong>ADMIN</strong>) e exclusões são exclusivas de{' '}
                  <strong>ADMIN</strong>.
                </div>
              )}

              <button
                type='button'
                className='btn btn-warning mb-3'
                onClick={() => cadastrar()}
              >
                Novo Pagamento
              </button>

              <table className='table table-hover'>
                <thead>
                  <tr>
                    <th scope='col'>ID</th>
                    <th scope='col'>Ticket</th>
                    <th scope='col'>Forma de Pagamento</th>
                    <th scope='col'>Valor</th>
                    <th scope='col'>Valor Recebido</th>
                    <th scope='col'>Troco</th>
                    <th scope='col'>Data</th>
                    <th scope='col'>Hora</th>
                    <th scope='col'>Status</th>
                    <th scope='col'>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map((dado) => {
                    const statusPag = String(
                      dado.status || 'EM ABERTO'
                    ).toUpperCase();
                    const isPago = statusPag === 'PAGO';

                    return (
                      <tr key={dado.id}>
                        <td>{dado.id}</td>
                        <td>{dado.ticketId}</td>
                        <td>{formatarFormaPagamento(dado.formaPagamento)}</td>
                        <td>R$ {formatarMoeda(dado.valor)}</td>
                        <td>{formatarMoeda(dado.valorRecebido)}</td>
                        <td>{formatarMoeda(dado.troco)}</td>
                        <td>{dado.data}</td>
                        <td>{dado.hora}</td>
                        <td>
                          <span
                            className={`badge ${
                              isPago ? 'bg-success' : 'bg-warning text-dark'
                            }`}
                          >
                            {statusPag}
                          </span>
                        </td>
                        <td>
                          <Stack spacing={1} padding={0} direction='row'>
                            <IconButton
                              aria-label='edit'
                              disabled={isPago && !isAdmin}
                              title={
                                isPago && !isAdmin
                                  ? 'Pagamento já PAGO — somente com autorização de ADMIN'
                                  : 'Editar'
                              }
                              onClick={() => editar(dado)}
                            >
                              <EditIcon />
                            </IconButton>

                            {isAdmin && !isPago && (
                              <IconButton
                                aria-label='delete'
                                title='Excluir'
                                onClick={() => excluir(dado)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </Stack>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ListagemPagamentos;