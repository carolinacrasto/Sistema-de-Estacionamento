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

function CadastroSangria() {
  const navigate = useNavigate();

  const [usuarioLogado, setUsuarioLogado] = useState(USUARIO_PADRAO);
  const [caixaAberto, setCaixaAberto] = useState(null);
  const [carregandoCaixa, setCarregandoCaixa] = useState(true);
  const [valor, setValor] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    axios
      .get('/db.json')
      .then((response) => {
        const listaCaixa = response.data?.caixa || [];
        const listaUsuarios = response.data?.usuarios || [];
        const operadorBase =
          listaUsuarios.find((u) => u.ativo !== false) || USUARIO_PADRAO;

        setUsuarioLogado(operadorBase);

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
      setErro('Não é possível registrar sangria sem um caixa aberto.');
      return;
    }

    const valorNum = Number(valor);
    if (!valor || Number.isNaN(valorNum) || valorNum <= 0) {
      setErro('Informe um valor de sangria maior que zero.');
      return;
    }

    if (!justificativa.trim()) {
      setErro('Informe a justificativa da sangria.');
      return;
    }

    const agora = new Date();
    const sangriaData = {
      id: Date.now(),
      caixaId: caixaAberto.id,
      usuarioId: usuarioLogado?.id ?? caixaAberto.usuarioId ?? USUARIO_PADRAO.id,
      nomeOperador:
        usuarioLogado?.nome ??
        caixaAberto.nomeOperador ??
        caixaAberto.usuarioNome ??
        USUARIO_PADRAO.nome,
      valor: Number(valorNum.toFixed(2)),
      justificativa: justificativa.trim(),
      data: agora.toISOString().split('T')[0],
      hora: agora.toTimeString().slice(0, 5),
    };

    console.log('Sangria registrada:', sangriaData);
    alert(
      `Sangria de R$ ${valorNum.toFixed(2).replace('.', ',')} registrada com sucesso!`
    );
    navigate('/listagem-caixa');
  };

  return (
    <div className='container'>
      <Card title='Registrar Sangria'>
        <div className='row'>
          <div className='col-lg-12'>
            <div className='bs-component'>
              {carregandoCaixa ? (
                <p className='text-muted'>Verificando caixa...</p>
              ) : !caixaAberto ? (
                <div className='alert alert-warning'>
                  Não há nenhum caixa <strong>ABERTO</strong> no momento. Abra um
                  caixa antes de registrar uma sangria.
                </div>
              ) : (
                <div className='alert alert-info py-2 px-3 mb-3'>
                  Caixa aberto #{caixaAberto.id} — Operador:{' '}
                  <strong>
                    {usuarioLogado?.nome ||
                      caixaAberto.nomeOperador ||
                      caixaAberto.usuarioNome ||
                      USUARIO_PADRAO.nome}
                  </strong>{' '}
                  | Valor inicial: R${' '}
                  {Number(caixaAberto.valorInicial || 0)
                    .toFixed(2)
                    .replace('.', ',')}
                </div>
              )}

              {erro && (
                <div className='alert alert-danger py-2 px-3 mb-3'>{erro}</div>
              )}

              <FormGroup label='Valor da Sangria (R$): *' htmlFor='inputValorSangria'>
                <input
                  type='number'
                  step='0.01'
                  min='0.01'
                  id='inputValorSangria'
                  value={valor}
                  disabled={!caixaAberto}
                  className='form-control'
                  onChange={(e) => setValor(e.target.value)}
                  placeholder='0.00'
                />
              </FormGroup>

              <FormGroup label='Justificativa: *' htmlFor='inputJustificativa'>
                <input
                  type='text'
                  id='inputJustificativa'
                  value={justificativa}
                  disabled={!caixaAberto}
                  className='form-control'
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder='Ex: Retirada de excesso de dinheiro para o cofre'
                />
              </FormGroup>

              <Stack spacing={1} padding={1} direction='row'>
                <button
                  onClick={salvar}
                  type='button'
                  disabled={!caixaAberto}
                  className='btn btn-success'
                >
                  Salvar Sangria
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

export default CadastroSangria;