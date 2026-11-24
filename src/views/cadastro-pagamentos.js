import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Card from '../components/card';
import FormGroup from '../components/form-group';
import axios from 'axios';

const FORMAS_PAGAMENTO = ['PIX', 'DINHEIRO', 'CARTAO'];

function obterDataHoraAtual() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  const horas = String(agora.getHours()).padStart(2, '0');
  const minutos = String(agora.getMinutes()).padStart(2, '0');

  return {
    data: `${ano}-${mes}-${dia}`,
    hora: `${horas}:${minutos}`,
  };
}

function montarDataObj(dataStr, horaStr) {
  if (!dataStr || !horaStr) return null;
  const [ano, mes, dia] = String(dataStr).slice(0, 10).split('-').map(Number);
  const [hora, minuto] = String(horaStr).slice(0, 5).split(':').map(Number);
  if (
    [ano, mes, dia, hora, minuto].some((n) => n === undefined || Number.isNaN(n))
  ) {
    return null;
  }
  return new Date(ano, mes - 1, dia, hora, minuto, 0, 0);
}

function ehPernoite(entradaDate, saidaDate) {
  if (!entradaDate || !saidaDate) return false;

  const horaEntrada = entradaDate.getHours();
  const entradaEntre22e2359 = horaEntrada >= 22 && horaEntrada <= 23;

  const diaSeguinte = new Date(
    entradaDate.getFullYear(),
    entradaDate.getMonth(),
    entradaDate.getDate() + 1,
    0,
    0,
    0,
    0
  );
  const limiteSeisManha = new Date(
    entradaDate.getFullYear(),
    entradaDate.getMonth(),
    entradaDate.getDate() + 1,
    6,
    0,
    0,
    0
  );

  return (
    entradaEntre22e2359 &&
    saidaDate.getTime() > entradaDate.getTime() &&
    saidaDate.getTime() >= diaSeguinte.getTime() &&
    saidaDate.getTime() <= limiteSeisManha.getTime()
  );
}

function calcularValorTrecho(minutos, valorHora, valorDiaria, toleranciaMinutos) {
  if (minutos <= 0) {
    return 0;
  }
  const minutosAposTolerancia = Math.max(0, minutos - toleranciaMinutos);
  const horasCobradas =
    minutosAposTolerancia === 0 ? 1 : Math.ceil(minutosAposTolerancia / 60);
  const totalHoras = horasCobradas * valorHora;
  return totalHoras >= valorDiaria ? valorDiaria : totalHoras;
}

function calcularDetalhesPermanencia(
  ticketObj,
  listaCategorias,
  dataSaidaStr,
  horaSaidaStr,
  toleranciaMinutos = 15
) {
  if (!ticketObj) {
    return { valor: '', resumo: '' };
  }

  const cat = listaCategorias.find(
    (c) =>
      Number(c.id) === Number(ticketObj.categoriaId) ||
      String(c.nome || '').toLowerCase() ===
        String(ticketObj.categoria || '').toLowerCase()
  );

  const valorHora = Number(cat?.valorHora ?? 10);
  const valorDiaria = Number(cat?.valorDiaria ?? valorHora * 5);
  const valorPernoite = Number(cat?.valorPernoite ?? valorDiaria);

  const entradaDate = montarDataObj(ticketObj.dataEntrada, ticketObj.horaEntrada);
  const saidaDate = montarDataObj(dataSaidaStr, horaSaidaStr);

  if (!entradaDate || !saidaDate || saidaDate.getTime() <= entradaDate.getTime()) {
    return {
      valor: valorHora,
      resumo: `Permanência: 0 min — 1h mínima cobrada (R$ ${valorHora.toFixed(2).replace('.', ',')}).`,
    };
  }

  const diffMinutos = Math.floor(
    (saidaDate.getTime() - entradaDate.getTime()) / 60000
  );

  if (ehPernoite(entradaDate, saidaDate)) {
    return {
      valor: Number(valorPernoite.toFixed(2)),
      resumo: `Permanência: ${diffMinutos} min — Tarifa fixa de Pernoite aplicada.`,
    };
  }

  const minutosPorDia = 24 * 60;

  if (diffMinutos <= minutosPorDia) {
    const valorUnico = calcularValorTrecho(
      diffMinutos,
      valorHora,
      valorDiaria,
      toleranciaMinutos
    );
    const aposTol = Math.max(0, diffMinutos - toleranciaMinutos);
    const horasCobradas = aposTol === 0 ? 1 : Math.ceil(aposTol / 60);
    const aplicouDiaria = horasCobradas * valorHora >= valorDiaria;

    return {
      valor: Number(valorUnico.toFixed(2)),
      resumo: aplicouDiaria
        ? `Permanência: ${diffMinutos} min (${aposTol} min após tolerância) — Valor máximo da Diária aplicado.`
        : `Permanência: ${diffMinutos} min (${aposTol} min após tolerância de ${toleranciaMinutos} min) — ${horasCobradas}h cobrada(s).`,
    };
  }

  const diasCompletos = Math.floor(diffMinutos / minutosPorDia);
  const minutosRestantes = diffMinutos % minutosPorDia;

  const valorExcedente =
    minutosRestantes === 0
      ? 0
      : calcularValorTrecho(
          minutosRestantes,
          valorHora,
          valorDiaria,
          toleranciaMinutos
        );

  const totalFinal = diasCompletos * valorDiaria + valorExcedente;
  return {
    valor: Number(totalFinal.toFixed(2)),
    resumo: `Permanência: ${diasCompletos} dia(s) + ${minutosRestantes} min.`,
  };
}

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

function CadastroPagamentos() {
  const { idParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const ticketState = location.state?.ticket || null;
  const ticketQueryId = searchParams.get('ticketId');
  const veioPeloAtalho = Boolean(ticketState?.id || ticketQueryId);

  const agoraInicial = obterDataHoraAtual();

  const [id, setId] = useState('');
  const [ticketsAbertos, setTicketsAbertos] = useState([]);
  const [todosTickets, setTodosTickets] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [ticketId, setTicketId] = useState(
    ticketState?.id
      ? String(ticketState.id)
      : ticketQueryId
      ? String(ticketQueryId)
      : ''
  );
  const [caixaId, setCaixaId] = useState(1);
  const [dataSaida, setDataSaida] = useState(agoraInicial.data);
  const [horaSaida, setHoraSaida] = useState(agoraInicial.hora);
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [valor, setValor] = useState('');
  const [valorRecebido, setValorRecebido] = useState('');
  const [troco, setTroco] = useState(0);
  const [resumoCalculo, setResumoCalculo] = useState('');

  useEffect(() => {
    axios
      .get('/db.json')
      .then((response) => {
        const dbTickets = response.data?.tickets || [];
        const dbCategorias = response.data?.categorias || [];
        const dbCaixa = response.data?.caixa || [];
        const dbPagamentos = response.data?.pagamentos || [];

        if (!localStorage.getItem('scac_tickets')) {
          localStorage.setItem('scac_tickets', JSON.stringify(dbTickets));
        }
        if (!localStorage.getItem('scac_categorias')) {
          localStorage.setItem('scac_categorias', JSON.stringify(dbCategorias));
        }
        if (!localStorage.getItem('scac_caixa')) {
          localStorage.setItem('scac_caixa', JSON.stringify(dbCaixa));
        }
        if (!localStorage.getItem('scac_pagamentos')) {
          localStorage.setItem('scac_pagamentos', JSON.stringify(dbPagamentos));
        }

        const listaTickets = lerStorageOuFallback('scac_tickets', dbTickets);
        const listaCategorias = lerStorageOuFallback(
          'scac_categorias',
          dbCategorias
        );
        const listaCaixa = lerStorageOuFallback('scac_caixa', dbCaixa);
        const listaPagamentos = lerStorageOuFallback(
          'scac_pagamentos',
          dbPagamentos
        );

        setTodosTickets(listaTickets);
        setCategorias(listaCategorias);

        const abertos = listaTickets.filter(
          (t) => String(t.status || '').toUpperCase() === 'ABERTO'
        );
        setTicketsAbertos(abertos);

        const caixaAberto = listaCaixa.find(
          (c) => String(c.status || '').toUpperCase() === 'ABERTO'
        );
        if (caixaAberto) {
          setCaixaId(caixaAberto.id);
        }

        if (idParam) {
          const pagEncontrado = listaPagamentos.find(
            (p) => Number(p.id) === Number(idParam)
          );
          if (pagEncontrado) {
            setId(pagEncontrado.id);
            setTicketId(String(pagEncontrado.ticketId || ''));
            setCaixaId(pagEncontrado.caixaId || 1);
            setDataSaida(pagEncontrado.data || agoraInicial.data);
            setHoraSaida(pagEncontrado.hora || agoraInicial.hora);
            setFormaPagamento(
              String(pagEncontrado.formaPagamento || 'PIX')
                .replace(/^R\$\s*/i, '')
                .trim()
            );
            setValor(pagEncontrado.valor ?? '');
            setValorRecebido(pagEncontrado.valorRecebido ?? '');
            setTroco(pagEncontrado.troco ?? 0);
          }
          return;
        }

        const idAlvo = ticketState?.id || ticketQueryId;
        if (idAlvo) {
          const ticketEncontrado =
            listaTickets.find((t) => Number(t.id) === Number(idAlvo)) ||
            ticketState;

          if (ticketEncontrado) {
            const { data, hora } = obterDataHoraAtual();
            const dataSaidaRef = ticketEncontrado.dataSaida || data;
            const horaSaidaRef = ticketEncontrado.horaSaida || hora;
            setTicketId(String(ticketEncontrado.id));
            setDataSaida(dataSaidaRef);
            setHoraSaida(horaSaidaRef);
            const detalhes = calcularDetalhesPermanencia(
              ticketEncontrado,
              listaCategorias,
              dataSaidaRef,
              horaSaidaRef
            );
            setValor(detalhes.valor);
            setValorRecebido(detalhes.valor);
            setResumoCalculo(detalhes.resumo);
          }
        }
      })
      .catch((error) => {
        console.error('Erro ao carregar dados de pagamento:', error);
      });
  }, [idParam, ticketQueryId, ticketState]);

  const ticketSelecionadoObj =
    todosTickets.find((t) => Number(t.id) === Number(ticketId)) ||
    (ticketState && Number(ticketState.id) === Number(ticketId)
      ? ticketState
      : null);

  useEffect(() => {
    if (idParam || !ticketSelecionadoObj) return;

    const detalhes = calcularDetalhesPermanencia(
      ticketSelecionadoObj,
      categorias,
      dataSaida,
      horaSaida
    );
    setValor(detalhes.valor);
    setResumoCalculo(detalhes.resumo);
    if (formaPagamento !== 'DINHEIRO') {
      setValorRecebido(detalhes.valor);
    }
  }, [ticketSelecionadoObj, categorias, dataSaida, horaSaida, formaPagamento, idParam]);

  useEffect(() => {
    const valNum = Number(valor || 0);
    const recNum = Number(valorRecebido || 0);

    if (formaPagamento === 'DINHEIRO') {
      const diff = recNum - valNum;
      setTroco(diff > 0 ? Number(diff.toFixed(2)) : 0);
    } else {
      setValorRecebido(valor !== '' ? valNum : '');
      setTroco(0);
    }
  }, [formaPagamento, valor, valorRecebido]);

  const handleSelecionarTicket = (e) => {
    const selecionadoId = e.target.value;
    setTicketId(selecionadoId);

    if (!selecionadoId) {
      setValor('');
      setValorRecebido('');
      setTroco(0);
      setResumoCalculo('');
      return;
    }

    const { data, hora } = obterDataHoraAtual();
    setDataSaida(data);
    setHoraSaida(hora);
  };

  const handleSelecionarForma = (forma) => {
    setFormaPagamento(forma);
    if (forma !== 'DINHEIRO' && valor !== '') {
      setValorRecebido(Number(valor));
      setTroco(0);
    }
  };

  const cancelar = () => {
    navigate(veioPeloAtalho ? '/listagem-tickets' : '/listagem-pagamentos');
  };

  const confirmarPagamentoEEncerrar = () => {
    if (!ticketId) {
      alert('Selecione um ticket em aberto para encerrar.');
      return;
    }

    const valorFinalNum = Number(valor || 0);
    const recebidoFinalNum =
      formaPagamento === 'DINHEIRO'
        ? Number(valorRecebido || valorFinalNum)
        : valorFinalNum;
    const trocoFinalNum =
      formaPagamento === 'DINHEIRO' && recebidoFinalNum > valorFinalNum
        ? Number((recebidoFinalNum - valorFinalNum).toFixed(2))
        : 0;

    const pagamentosAtuais = lerStorageOuFallback('scac_pagamentos', []);
    const ticketsAtuais = lerStorageOuFallback('scac_tickets', todosTickets);
    const categoriasAtuais = lerStorageOuFallback('scac_categorias', categorias);

    const novoIdPagamento = id
      ? Number(id)
      : pagamentosAtuais.reduce((max, p) => Math.max(max, Number(p.id || 0)), 0) +
        1;

    const pagamentoSalvo = {
      id: novoIdPagamento,
      ticketId: Number(ticketId),
      caixaId: Number(caixaId),
      formaPagamento,
      valor: valorFinalNum,
      valorRecebido: recebidoFinalNum,
      troco: trocoFinalNum,
      data: dataSaida,
      hora: horaSaida,
      status: 'PAGO',
    };

    const idxPagExistente = pagamentosAtuais.findIndex(
      (p) =>
        Number(p.id) === Number(pagamentoSalvo.id) ||
        (Number(p.ticketId) === Number(ticketId) &&
          String(p.status || '').toUpperCase() === 'EM ABERTO')
    );

    const novosPagamentos =
      idxPagExistente >= 0
        ? pagamentosAtuais.map((p, i) =>
            i === idxPagExistente ? { ...p, ...pagamentoSalvo } : p
          )
        : [...pagamentosAtuais, pagamentoSalvo];

    const novosTickets = ticketsAtuais.map((t) =>
      Number(t.id) === Number(ticketId)
        ? {
            ...t,
            dataSaida,
            horaSaida,
            valorTotal: valorFinalNum,
            status: 'FINALIZADO',
          }
        : t
    );

    const ticketEncerradoObj = ticketsAtuais.find(
      (t) => Number(t.id) === Number(ticketId)
    );
    if (ticketEncerradoObj) {
      const novasCategorias = categoriasAtuais.map((cat) => {
        const mesmaCat =
          Number(cat.id) === Number(ticketEncerradoObj.categoriaId) ||
          String(cat.nome || '').toLowerCase() ===
            String(ticketEncerradoObj.categoria || '').toLowerCase();
        if (!mesmaCat) return cat;
        const ocupadasAtual = Number(cat.vagasOcupadas || 0);
        return {
          ...cat,
          vagasOcupadas: Math.max(0, ocupadasAtual - 1),
        };
      });
      localStorage.setItem('scac_categorias', JSON.stringify(novasCategorias));
    }

    localStorage.setItem('scac_pagamentos', JSON.stringify(novosPagamentos));
    localStorage.setItem('scac_tickets', JSON.stringify(novosTickets));

    alert(
      `Pagamento (${formaPagamento}) salvo e Ticket #${ticketId} encerrado! Já consta nos Relatórios.`
    );
    navigate('/relatorios');
  };

  return (
    <div className='container'>
      <Card
        title={
          idParam
            ? 'Editar Pagamento'
            : veioPeloAtalho
            ? `Encerrar Ticket #${ticketId}`
            : 'Cadastro de Pagamento e Encerramento'
        }
      >
        <div className='row'>
          <div className='col-lg-12'>
            <div className='bs-component'>
              <div className='row'>
                <div className='col-md-6'>
                  <FormGroup label='Ticket: *' htmlFor='selectTicket'>
                    <select
                      id='selectTicket'
                      className='form-select'
                      value={ticketId}
                      disabled={veioPeloAtalho}
                      onChange={handleSelecionarTicket}
                    >
                      <option value=''>Selecione um ticket aberto...</option>
                      {ticketsAbertos.map((t) => (
                        <option key={t.id} value={t.id}>
                          #{t.id} - {t.placa} ({t.categoria})
                        </option>
                      ))}
                      {ticketSelecionadoObj &&
                        !ticketsAbertos.some(
                          (t) => Number(t.id) === Number(ticketSelecionadoObj.id)
                        ) && (
                          <option value={ticketSelecionadoObj.id}>
                            #{ticketSelecionadoObj.id} -{' '}
                            {ticketSelecionadoObj.placa} (
                            {ticketSelecionadoObj.status || 'ABERTO'})
                          </option>
                        )}
                    </select>
                  </FormGroup>
                </div>

                <div className='col-md-6'>
                  <FormGroup label='ID do Caixa: *' htmlFor='inputCaixaId'>
                    <input
                      type='number'
                      id='inputCaixaId'
                      value={caixaId}
                      className='form-control'
                      onChange={(e) => setCaixaId(e.target.value)}
                    />
                  </FormGroup>
                </div>
              </div>

              {ticketSelecionadoObj && (
                <div className='alert alert-secondary py-2 px-3 mb-3'>
                  <div>
                    <strong>Ticket #{ticketSelecionadoObj.id}</strong> — Placa:{' '}
                    <strong>{ticketSelecionadoObj.placa}</strong> | Categoria:{' '}
                    {ticketSelecionadoObj.categoria} | Entrada:{' '}
                    {ticketSelecionadoObj.dataEntrada} às{' '}
                    {ticketSelecionadoObj.horaEntrada}
                  </div>
                  {resumoCalculo && (
                    <small className='d-block mt-1 text-dark'>
                      {resumoCalculo}
                    </small>
                  )}
                </div>
              )}

              <div className='row'>
                <div className='col-md-6'>
                  <FormGroup label='Data de Saída: *' htmlFor='inputDataSaida'>
                    <input
                      type='date'
                      id='inputDataSaida'
                      value={dataSaida}
                      className='form-control'
                      onChange={(e) => setDataSaida(e.target.value)}
                    />
                  </FormGroup>
                </div>

                <div className='col-md-6'>
                  <FormGroup label='Hora de Saída: *' htmlFor='inputHoraSaida'>
                    <input
                      type='time'
                      id='inputHoraSaida'
                      value={horaSaida}
                      className='form-control'
                      onChange={(e) => setHoraSaida(e.target.value)}
                    />
                  </FormGroup>
                </div>
              </div>

              <FormGroup label='Forma de Pagamento: *'>
                <div className='d-flex gap-2 flex-wrap'>
                  {FORMAS_PAGAMENTO.map((forma) => {
                    const ativa = formaPagamento === forma;
                    return (
                      <button
                        key={forma}
                        type='button'
                        onClick={() => handleSelecionarForma(forma)}
                        className={`btn ${
                          ativa ? 'btn-primary' : 'btn-outline-secondary'
                        }`}
                      >
                        {forma}
                      </button>
                    );
                  })}
                </div>
              </FormGroup>

              <div className='row mt-3'>
                <div className='col-md-4'>
                  <FormGroup label='Valor Calculado (R$): *' htmlFor='inputValor'>
                    <input
                      type='number'
                      step='0.01'
                      id='inputValor'
                      value={valor}
                      className='form-control'
                      onChange={(e) => setValor(e.target.value)}
                      placeholder='0.00'
                    />
                  </FormGroup>
                </div>

                <div className='col-md-4'>
                  <FormGroup
                    label='Valor Recebido (R$):'
                    htmlFor='inputValorRecebido'
                  >
                    <input
                      type='number'
                      step='0.01'
                      id='inputValorRecebido'
                      value={valorRecebido}
                      className='form-control'
                      disabled={formaPagamento !== 'DINHEIRO'}
                      onChange={(e) => setValorRecebido(e.target.value)}
                      placeholder='0.00'
                    />
                  </FormGroup>
                </div>

                <div className='col-md-4'>
                  <FormGroup label='Troco (R$):' htmlFor='inputTroco'>
                    <input
                      type='text'
                      id='inputTroco'
                      value={Number(troco || 0).toFixed(2).replace('.', ',')}
                      className='form-control'
                      disabled
                      readOnly
                    />
                  </FormGroup>
                </div>
              </div>

              <Stack spacing={1} padding={1} direction='row' className='mt-2'>
                <button
                  onClick={confirmarPagamentoEEncerrar}
                  type='button'
                  className='btn btn-success'
                >
                  Confirmar Pagamento e Encerrar Ticket
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

export default CadastroPagamentos;