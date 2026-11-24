import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Card from '../components/card';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import { IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

function ListagemCaixa() {
  const navigate = useNavigate();
  const [caixa, setCaixa] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const cadastrar = () => {
    navigate('/cadastro-caixa');
  };

  const editar = (id) => {
    navigate(`/cadastro-caixa/${id}`);
  };

  const excluir = (id) => {
    setCaixa(caixa.filter((item) => item.id !== id));
  };

  useEffect(() => {
    axios
      .get('/db.json')
      .then((response) => {
        const dadosCaixa = response.data?.caixa || [];
        const dadosUsuarios = response.data?.usuarios || [];
        setCaixa(dadosCaixa);
        setUsuarios(dadosUsuarios);
      })
      .catch((error) => {
        console.error('Erro ao carregar dados do caixa:', error);
      });
  }, []);

  const obterNomeUsuario = (dado) => {
    if (dado.usuarioNome) return dado.usuarioNome;
    const usuario = usuarios.find((u) => Number(u.id) === Number(dado.usuarioId));
    return usuario ? usuario.nome : `Usuário #${dado.usuarioId}`;
  };

  const formatarMovimentacoes = (dado) => {
    const movs = Array.isArray(dado.movimentacoes) ? dado.movimentacoes : [];
    const qtdSangrias = Array.isArray(dado.sangrias)
      ? dado.sangrias.length
      : movs.filter((m) => String(m.tipo || '').toUpperCase() === 'SANGRIA').length;

    const qtdReforcos = Array.isArray(dado.reforcos)
      ? dado.reforcos.length
      : movs.filter((m) => String(m.tipo || '').toUpperCase() === 'REFORCO').length;

    return `${qtdSangrias} sangria(s) / ${qtdReforcos} reforço(s)`;
  };

  return (
    <div className='container'>
      <Card title='Listagem de Caixa'>
        <div className='row'>
          <div className='col-lg-12'>
            <div className='bs-component'>
              <button
                type='button'
                className='btn btn-warning mb-3'
                onClick={() => cadastrar()}
              >
                Novo Lançamento
              </button>

              <table className='table table-hover'>
                <thead>
                  <tr>
                    <th scope='col'>Usuário</th>
                    <th scope='col'>Abertura (Data/Hora)</th>
                    <th scope='col'>Valor Inicial</th>
                    <th scope='col'>Fechamento (Data/Hora)</th>
                    <th scope='col'>Valor Final</th>
                    <th scope='col'>Status</th>
                    <th scope='col'>Movimentações</th>
                    <th scope='col'>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {Array.isArray(caixa) && caixa.length > 0 ? (
                    caixa.map((dado) => {
                      const isAberto =
                        String(dado.status || '').toUpperCase() === 'ABERTO';

                      return (
                        <tr key={dado.id}>
                          <td>{obterNomeUsuario(dado)}</td>
                          <td>
                            {dado.dataAbertura} às {dado.horaAbertura}
                          </td>
                          <td>
                            R${' '}
                            {dado.valorInicial !== undefined &&
                            dado.valorInicial !== null
                              ? Number(dado.valorInicial)
                                  .toFixed(2)
                                  .replace('.', ',')
                              : '0,00'}
                          </td>
                          <td>
                            {dado.dataFechamento && dado.horaFechamento
                              ? `${dado.dataFechamento} às ${dado.horaFechamento}`
                              : '—'}
                          </td>
                          <td>
                            {dado.valorFinal !== undefined &&
                            dado.valorFinal !== null
                              ? `R$ ${Number(dado.valorFinal)
                                  .toFixed(2)
                                  .replace('.', ',')}`
                              : '—'}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                isAberto ? 'bg-success' : 'bg-danger'
                              }`}
                            >
                              {dado.status}
                            </span>
                          </td>
                          <td>{formatarMovimentacoes(dado)}</td>
                          <td>
                            <Stack spacing={1} padding={0} direction='row'>
                              <IconButton
                                aria-label='edit'
                                title='Editar'
                                onClick={() => editar(dado.id)}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                aria-label='delete'
                                title='Excluir'
                                onClick={() => excluir(dado.id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Stack>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan='8' className='text-center text-muted py-4'>
                        Nenhum registro de caixa encontrado.
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

export default ListagemCaixa;