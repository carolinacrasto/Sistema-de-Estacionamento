import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Card from '../components/card';
import FormGroup from '../components/form-group';
import axios from 'axios';

const USUARIO_PADRAO = {
  id: 1,
  nome: 'Operador',
  perfil: 'OPERADOR',
};

function CadastroCaixa() {
  const { idParam } = useParams();
  const navigate = useNavigate();

  const [usuarioLogado, setUsuarioLogado] = useState(USUARIO_PADRAO);
  const [id, setId] = useState('');
  const [usuarioId, setUsuarioId] = useState(USUARIO_PADRAO.id);
  const [usuarioNome, setUsuarioNome] = useState(USUARIO_PADRAO.nome);
  const [dataAbertura, setDataAbertura] = useState('');
  const [horaAbertura, setHoraAbertura] = useState('');
  const [valorInicial, setValorInicial] = useState('');
  const [dataFechamento, setDataFechamento] = useState('');
  const [horaFechamento, setHoraFechamento] = useState('');
  const [valorFinal, setValorFinal] = useState('');
  const [status, setStatus] = useState('ABERTO');
  const [sangrias, setSangrias] = useState([]);
  const [reforcos, setReforcos] = useState([]);

  useEffect(() => {
    axios
      .get('/db.json')
      .then((response) => {
        const listaCaixa = response.data?.caixa || [];
        const listaUsuarios = response.data?.usuarios || [];
        const operadorBase =
          listaUsuarios.find((u) => u.ativo !== false) || USUARIO_PADRAO;

        setUsuarioLogado(operadorBase);

        if (idParam) {
          const caixaEncontrado = listaCaixa.find(
            (c) => Number(c.id) === Number(idParam)
          );

          if (caixaEncontrado) {
            setId(caixaEncontrado.id);
            setUsuarioId(caixaEncontrado.usuarioId || operadorBase.id);

            const dono = listaUsuarios.find(
              (u) => Number(u.id) === Number(caixaEncontrado.usuarioId)
            );
            setUsuarioNome(
              caixaEncontrado.usuarioNome || dono?.nome || operadorBase.nome
            );

            setDataAbertura(caixaEncontrado.dataAbertura || '');
            setHoraAbertura(caixaEncontrado.horaAbertura || '');
            setValorInicial(
              caixaEncontrado.valorInicial !== undefined &&
                caixaEncontrado.valorInicial !== null
                ? caixaEncontrado.valorInicial
                : ''
            );
            setDataFechamento(caixaEncontrado.dataFechamento || '');
            setHoraFechamento(caixaEncontrado.horaFechamento || '');
            setValorFinal(
              caixaEncontrado.valorFinal !== undefined &&
                caixaEncontrado.valorFinal !== null
                ? caixaEncontrado.valorFinal
                : ''
            );
            setStatus(caixaEncontrado.status || 'ABERTO');
            setSangrias(caixaEncontrado.sangrias || []);
            setReforcos(caixaEncontrado.reforcos || []);
          }
        } else {
          const agora = new Date();
          const dataHoje = agora.toISOString().split('T')[0];
          const horaAtual = agora.toTimeString().slice(0, 5);
          setDataAbertura(dataHoje);
          setHoraAbertura(horaAtual);
          setUsuarioId(Number(operadorBase.id));
          setUsuarioNome(operadorBase.nome);
        }
      })
      .catch((error) => {
        console.error('Erro ao carregar caixa:', error);
        if (!idParam) {
          const agora = new Date();
          setDataAbertura(agora.toISOString().split('T')[0]);
          setHoraAbertura(agora.toTimeString().slice(0, 5));
          setUsuarioId(USUARIO_PADRAO.id);
          setUsuarioNome(USUARIO_PADRAO.nome);
        }
      });
  }, [idParam]);

  const inicializar = () => {
    navigate('/listagem-caixa');
  };

  const salvar = () => {
    const caixaData = {
      id: id ? Number(id) : Date.now(),
      usuarioId: Number(usuarioId || usuarioLogado?.id || 1),
      usuarioNome: usuarioNome || usuarioLogado?.nome || USUARIO_PADRAO.nome,
      dataAbertura,
      horaAbertura,
      valorInicial: Number(valorInicial || 0),
      dataFechamento: dataFechamento || null,
      horaFechamento: horaFechamento || null,
      valorFinal: valorFinal !== '' ? Number(valorFinal) : null,
      status,
      sangrias,
      reforcos,
    };

    console.log('Salvando caixa:', caixaData);
    alert('Lançamento de caixa salvo com sucesso!');
    navigate('/listagem-caixa');
  };

  return (
    <div className='container'>
      <Card title={idParam ? 'Editar Caixa' : 'Abertura / Lançamento de Caixa'}>
        <div className='row'>
          <div className='col-lg-12'>
            <div className='bs-component'>
              <FormGroup label='Operador Responsável:' htmlFor='inputOperador'>
                <input
                  type='text'
                  id='inputOperador'
                  value={usuarioNome || usuarioLogado?.nome || 'Usuário logado'}
                  className='form-control'
                  disabled
                  readOnly
                />
              </FormGroup>

              <div className='row'>
                <div className='col-md-6'>
                  <FormGroup label='Data de Abertura: *' htmlFor='inputDataAbertura'>
                    <input
                      type='date'
                      id='inputDataAbertura'
                      value={dataAbertura}
                      className='form-control'
                      onChange={(e) => setDataAbertura(e.target.value)}
                    />
                  </FormGroup>
                </div>
                <div className='col-md-6'>
                  <FormGroup label='Hora de Abertura: *' htmlFor='inputHoraAbertura'>
                    <input
                      type='time'
                      id='inputHoraAbertura'
                      value={horaAbertura}
                      className='form-control'
                      onChange={(e) => setHoraAbertura(e.target.value)}
                    />
                  </FormGroup>
                </div>
              </div>

              <FormGroup label='Valor Inicial (R$): *' htmlFor='inputValorInicial'>
                <input
                  type='number'
                  step='0.01'
                  id='inputValorInicial'
                  value={valorInicial}
                  className='form-control'
                  onChange={(e) => setValorInicial(e.target.value)}
                  placeholder='0.00'
                />
              </FormGroup>

              <FormGroup label='Status: *' htmlFor='selectStatus'>
                <select
                  className='form-select'
                  id='selectStatus'
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value='ABERTO'>ABERTO</option>
                  <option value='FECHADO'>FECHADO</option>
                </select>
              </FormGroup>

              {status === 'FECHADO' && (
                <>
                  <div className='row'>
                    <div className='col-md-6'>
                      <FormGroup
                        label='Data de Fechamento:'
                        htmlFor='inputDataFechamento'
                      >
                        <input
                          type='date'
                          id='inputDataFechamento'
                          value={dataFechamento}
                          className='form-control'
                          onChange={(e) => setDataFechamento(e.target.value)}
                        />
                      </FormGroup>
                    </div>
                    <div className='col-md-6'>
                      <FormGroup
                        label='Hora de Fechamento:'
                        htmlFor='inputHoraFechamento'
                      >
                        <input
                          type='time'
                          id='inputHoraFechamento'
                          value={horaFechamento}
                          className='form-control'
                          onChange={(e) => setHoraFechamento(e.target.value)}
                        />
                      </FormGroup>
                    </div>
                  </div>

                  <FormGroup label='Valor Final (R$):' htmlFor='inputValorFinal'>
                    <input
                      type='number'
                      step='0.01'
                      id='inputValorFinal'
                      value={valorFinal}
                      className='form-control'
                      onChange={(e) => setValorFinal(e.target.value)}
                      placeholder='0.00'
                    />
                  </FormGroup>
                </>
              )}

              <Stack spacing={1} padding={1} direction='row'>
                <button onClick={salvar} type='button' className='btn btn-success'>
                  Salvar
                </button>
                <button
                  onClick={inicializar}
                  type='button'
                  className='btn btn-danger'
                >
                  Cancelar
                </button>
              </Stack>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default CadastroCaixa;