import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Card from '../components/card';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import { IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

function ListagemCategorias(props) {
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState([]);

  const isAdmin =
    String(props.usuarioLogado?.perfil || '').trim().toUpperCase() === 'ADMIN';

  const cadastrar = () => {
    if (!isAdmin) return;
    navigate('/cadastro-categorias');
  };

  const editar = (id) => {
    if (!isAdmin) return;
    navigate(`/cadastro-categorias/${id}`);
  };

  const excluir = (id) => {
    if (!isAdmin) return;
    const cat = categorias.find((c) => Number(c.id) === Number(id));
    const confirmou = window.confirm(
      `Deseja realmente excluir a categoria "${cat?.nome || `#${id}`}"?`
    );
    if (!confirmou) return;
    setCategorias(categorias.filter((categoria) => categoria.id !== id));
  };

  useEffect(() => {
    axios
      .get('/db.json')
      .then((response) => {
        const lista = response.data?.categorias || [];
        setCategorias(lista);
      })
      .catch((error) => {
        console.error('Erro ao buscar categorias:', error);
      });
  }, []);

  const formatarMoeda = (valor) => {
    const num = Number(valor || 0);
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
  };

  return (
    <div className='container'>
      <Card title='Listagem de Categorias'>
        <div className='row'>
          <div className='col-lg-12'>
            <div className='bs-component'>
              {!isAdmin && (
                <div className='alert alert-info py-2 px-3 mb-3'>
                  Consulta de tarifas e vagas em modo somente leitura. Alterações são exclusivas de <strong>ADMIN</strong>.
                </div>
              )}

              {isAdmin && (
                <button
                  type='button'
                  className='btn btn-warning mb-3'
                  onClick={() => cadastrar()}
                >
                  Nova Categoria
                </button>
              )}

              <table className='table table-hover'>
                <thead>
                  <tr>
                    <th scope='col'>ID</th>
                    <th scope='col'>Nome</th>
                    <th scope='col'>Valor Hora</th>
                    <th scope='col'>Valor Diária</th>
                    <th scope='col'>Valor Pernoite</th>
                    <th scope='col'>Vagas Totais</th>
                    <th scope='col'>Ocupadas</th>
                    <th scope='col'>Ativo</th>
                    {isAdmin && <th scope='col'>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {categorias.map((dado) => (
                    <tr key={dado.id}>
                      <td>{dado.id}</td>
                      <td>{dado.nome}</td>
                      <td>{formatarMoeda(dado.valorHora)}</td>
                      <td>{formatarMoeda(dado.valorDiaria)}</td>
                      <td>{formatarMoeda(dado.valorPernoite)}</td>
                      <td>{dado.vagasTotais}</td>
                      <td>{dado.vagasOcupadas}</td>
                      <td>{dado.ativo ? 'Sim' : 'Não'}</td>
                      {isAdmin && (
                        <td>
                          <Stack spacing={1} padding={0} direction='row'>
                            <IconButton
                              aria-label='edit'
                              onClick={() => editar(dado.id)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              aria-label='delete'
                              onClick={() => excluir(dado.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ListagemCategorias;