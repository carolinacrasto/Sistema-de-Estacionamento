import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

function CadastroReforco(props) {
  const navigate = useNavigate();

  const operadorSessao = props.usuarioLogado || USUARIO_PADRAO;

  const [caixaAberto, setCaixaAberto] = useState(null);
  const [carregandoCaixa, setCarregandoCaixa] = useState(true);
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    axios
      .get('/db.json')
      .then((response) => {
        const listaCaixa = response.data?.caixa || [];
        const aberto = listaCaixa.find(
          (c) => String(c.status || '').toUpperCase() === 'ABERTO'
        );
        setCaixaAberto(aberto || null);
      })
      .catch((error) => {
        console.error('Erro ao buscar caixa aberto:', error);
        setErro('Erro ao verificar o status do caixa.');
      })
      .finally(() => {
        setCarregandoCaixa(false);
      });
  }, []);

  const cancelar = () => {
    navigate('/listagem-caixa');
  };

  const salvar = () => {
    setErro('');

    if (!caixaAberto) {
      setErro('Não é possível registrar reforço sem um caixa aberto.');
      return;
    }

    const valorNum = Number(valor);
    if (!valor || Number.isNaN(valorNum) || valorNum <= 0) {
      setErro('Informe um valor de reforço maior que zero.');
      return;
    }

    if (!descricao.trim()) {
      setErro('Informe a descrição ou motivo do reforço.');
      return;
    }

    const agora = obterDataHoraLocal();
    const reforcoData = {
      id: Date.now(),
      caixaId: caixaAberto.id,
      usuarioId: operadorSessao.id ?? caixaAberto.usuarioId ?? USUARIO_PADRAO.id,
      nomeOperador:
        operadorSessao.nome ||
        caixaAberto.nomeOperador ||
        caixaAberto.usuarioNome ||
        USUARIO_PADRAO.nome,
      valor: Number(valorNum.toFixed(2)),
      descricao: descricao.trim(),
      data: agora.data,
      hora: agora.hora,
    };

    console.log('Reforço registrado:', reforcoData);
    alert(
      `Reforço de R$ ${valorNum.toFixed(2).replace('.', ',')} registrado com sucesso!`
    );
    navigate('/listagem-caixa');
  };

  return (
    <div className='container'>
      <Card title='Registrar Reforço'>
        <div className='row'>
          <div className='col-lg-12'>
            <div className='bs-component'>
              {carregandoCaixa ? (
                <p className='text-muted'>Verificando caixa...</p>
              ) : !caixaAberto ? (
                <div className='alert alert-warning'>
                  Não há nenhum caixa <strong>ABERTO</strong> no momento. Abra um
                  caixa antes de registrar um reforço.
                </div>
              ) : (
                <div className='alert alert-info py-2 px-3 mb-3'>
                  Caixa aberto #{caixaAberto.id} — Operador:{' '}
                  <strong>{operadorSessao.nome}</strong> | Valor inicial: R${' '}
                  {Number(caixaAberto.valorInicial || 0)
                    .toFixed(2)
                    .replace('.', ',')}
                </div>
              )}

              {erro && (
                <div className='alert alert-danger py-2 px-3 mb-3'>{erro}</div>
              )}

              <FormGroup label='Valor do Reforço (R$): *' htmlFor='inputValorReforco'>
                <input
                  type='number'
                  step='0.01'
                  min='0.01'
                  id='inputValorReforco'
                  value={valor}
                  disabled={!caixaAberto}
                  className='form-control'
                  onChange={(e) => setValor(e.target.value)}
                  placeholder='0.00'
                />
              </FormGroup>

              <FormGroup label='Descrição / Motivo: *' htmlFor='inputDescricaoReforco'>
                <input
                  type='text'
                  id='inputDescricaoReforco'
                  value={descricao}
                  disabled={!caixaAberto}
                  className='form-control'
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder='Ex: Troco adicional fornecido pelo gerente'
                />
              </FormGroup>

              <Stack spacing={1} padding={1} direction='row'>
                <button
                  onClick={salvar}
                  type='button'
                  disabled={!caixaAberto}
                  className='btn btn-success'
                >
                  Salvar Reforço
                </button>
                <button
                  onClick={cancelar}
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

export default CadastroReforco;