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

function obterDataHoraLocal() {
  const agora = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return {
    data: `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}`,
    hora: `${p(agora.getHours())}:${p(agora.getMinutes())}`,
  };
}

function CadastroCaixa(props) {
  const { idParam } = useParams();
  const navigate = useNavigate();

  const operadorSessao = props.usuarioLogado || USUARIO_PADRAO;

  const [id, setId] = useState('');
  const [listaCaixa, setListaCaixa] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [usuarioId, setUsuarioId] = useState(operadorSessao.id);
  const [usuarioNome, setUsuarioNome] = useState(operadorSessao.nome);
  const [dataAbertura, setDataAbertura] = useState('');
  const [horaAbertura, setHoraAbertura] = useState('');
  const [valorInicial, setValorInicial] = useState('');
  const [dataFechamento, setDataFechamento] = useState('');
  const [horaFechamento, setHoraFechamento] = useState('');
  const [valorFinal, setValorFinal] = useState('');
  const [status, setStatus] = useState('ABERTO');
  const [sangrias, setSangrias] = useState([]);
  const [reforcos, setReforcos] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const sessao = props.usuarioLogado || USUARIO_PADRAO;

    axios
      .get('/db.json')
      .then((response) => {
        const caixas = response.data?.caixa || [];
        const listaUsuarios = response.data?.usuarios || [];
        const listaPagamentos = response.data?.pagamentos || [];

        setListaCaixa(caixas);
        setPagamentos(listaPagamentos);

        if (idParam) {
          const caixaEncontrado = caixas.find(
            (c) => Number(c.id) === Number(idParam)
          );

          if (caixaEncontrado) {
            setId(caixaEncontrado.id);
            setUsuarioId(caixaEncontrado.usuarioId || sessao.id);

            const dono = listaUsuarios.find(
              (u) => Number(u.id) === Number(caixaEncontrado.usuarioId)
            );
            setUsuarioNome(
              caixaEncontrado.usuarioNome ||
                caixaEncontrado.nomeOperador ||
                dono?.nome ||
                sessao.nome
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
          const agora = obterDataHoraLocal();
          setDataAbertura(agora.data);
          setHoraAbertura(agora.hora);
          setUsuarioId(Number(sessao.id));
          setUsuarioNome(sessao.nome);
        }
      })
      .catch((error) => {
        console.error('Erro ao carregar caixa:', error);
        if (!idParam) {
          const agora = obterDataHoraLocal();
          setDataAbertura(agora.data);
          setHoraAbertura(agora.hora);
          setUsuarioId(sessao.id);
          setUsuarioNome(sessao.nome);
        }
      });
  }, [idParam, props.usuarioLogado]);

  const calcularSaldoEsperado = () => {
    const inicialNum = Number(valorInicial || 0);
    const totalSangrias = (sangrias || []).reduce(
      (acc, s) => acc + Number(s.valor || 0),
      0
    );
    const totalReforcos = (reforcos || []).reduce(
      (acc, r) => acc + Number(r.valor || 0),
      0
    );
    const caixaRefId = id ? Number(id) : null;
    const totalPagos = caixaRefId
      ? (pagamentos || [])
          .filter(
            (p) =>
              Number(p.caixaId) === caixaRefId &&
              String(p.status || '').toUpperCase() === 'PAGO'
          )
          .reduce((acc, p) => acc + Number(p.valor || 0), 0)
      : 0;

    return Number(
      (inicialNum + totalPagos + totalReforcos - totalSangrias).toFixed(2)
    );
  };

  const aoMudarStatus = (novoStatus) => {
    setStatus(novoStatus);
    if (novoStatus === 'FECHADO') {
      const agora = obterDataHoraLocal();
      if (!dataFechamento) setDataFechamento(agora.data);
      if (!horaFechamento) setHoraFechamento(agora.hora);
      if (valorFinal === '') setValorFinal(calcularSaldoEsperado());
    }
  };

  const inicializar = () => {
    navigate('/listagem-caixa');
  };

  const salvar = () => {
    setErro('');

    if (!dataAbertura || !horaAbertura) {
      setErro('Informe a data e a hora de abertura do caixa.');
      return;
    }

    const inicialNum = Number(valorInicial);
    if (valorInicial === '' || Number.isNaN(inicialNum) || inicialNum < 0) {
      setErro('Informe um valor inicial válido (zero ou maior).');
      return;
    }

    if (status === 'ABERTO') {
      const outroAberto = listaCaixa.find(
        (c) =>
          String(c.status || '').toUpperCase() === 'ABERTO' &&
          Number(c.id) !== Number(id)
      );
      if (outroAberto) {
        setErro(
          `Já existe o Caixa #${outroAberto.id} aberto (${outroAberto.nomeOperador || outroAberto.usuarioNome || 'Operador'}). Feche-o antes de abrir outro.`
        );
        return;
      }
    }

    const caixaData = {
      id: id ? Number(id) : Date.now(),
      usuarioId: Number(usuarioId || operadorSessao.id || 1),
      nomeOperador: usuarioNome || operadorSessao.nome || USUARIO_PADRAO.nome,
      usuarioNome: usuarioNome || operadorSessao.nome || USUARIO_PADRAO.nome,
      dataAbertura,
      horaAbertura,
      valorInicial: Number(inicialNum.toFixed(2)),
      dataFechamento: status === 'FECHADO' ? dataFechamento || null : null,
      horaFechamento: status === 'FECHADO' ? horaFechamento || null : null,
      valorFinal:
        status === 'FECHADO' && valorFinal !== ''
          ? Number(Number(valorFinal).toFixed(2))
          : null,
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
              {erro && (
                <div className='alert alert-danger py-2 px-3 mb-3'>{erro}</div>
              )}

              <FormGroup label='Operador Responsável:' htmlFor='inputOperador'>
                <input
                  type='text'
                  id='inputOperador'
                  value={usuarioNome || operadorSessao.nome}
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
                  min='0'
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
                  onChange={(e) => aoMudarStatus(e.target.value)}
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