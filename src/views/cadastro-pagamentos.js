import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Card from '../components/card';
import FormGroup from '../components/form-group';
import axios from 'axios';

const FORMAS = ['PIX', 'DINHEIRO', 'CARTAO'];
const TOLERANCIA_MIN = 15;
const MEIA_HORA_MIN = 30;
const MIN_POR_DIA = 1440;
const LIMITE_HORAS_DIARIA_MIN = 300; // 5 horas

const agora = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return {
    data: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    hora: `${p(d.getHours())}:${p(d.getMinutes())}`,
  };
};

const toDate = (dataStr, horaStr) => {
  if (!dataStr || !horaStr) return null;
  const [a, m, d] = String(dataStr).slice(0, 10).split('-').map(Number);
  const [h, min] = String(horaStr).slice(0, 5).split(':').map(Number);
  if ([a, m, d, h, min].some((n) => Number.isNaN(n))) return null;
  return new Date(a, m - 1, d, h, min, 0, 0);
};

const moeda = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

function calcularValor(ticket, categorias, dataSaida, horaSaida) {
  if (!ticket) return { valor: '', resumo: '' };

  const cat = categorias.find(
    (c) =>
      Number(c.id) === Number(ticket.categoriaId) ||
      String(c.nome || '').toLowerCase() === String(ticket.categoria || '').toLowerCase()
  );

  const vHora = Number(cat?.valorHora ?? 10);
  const vMeiaHora = vHora / 2;
  const vDiaria = Number(cat?.valorDiaria ?? 50);
  const vPernoite = Number(cat?.valorPernoite ?? vDiaria);

  const entrada = toDate(ticket.dataEntrada, ticket.horaEntrada);
  const saida = toDate(dataSaida, horaSaida);

  if (!entrada || !saida) {
    return { valor: 0, resumo: 'Informe data e hora de saída válidas.' };
  }
  if (saida <= entrada) {
    return { valor: 0, resumo: 'Atenção: saída anterior ou igual à entrada.' };
  }

  const mins = Math.floor((saida - entrada) / 60000);

  if (mins <= TOLERANCIA_MIN) {
    return {
      valor: 0,
      resumo: `Permanência: ${mins} min — Dentro da tolerância de ${TOLERANCIA_MIN} min (${moeda(0)}).`,
    };
  }

  const calcularTrecho = (minutosTrecho) => {
    if (minutosTrecho <= TOLERANCIA_MIN) {
      return { valor: 0, meiasHoras: 0, aposTol: 0, virouDiaria: false };
    }
    const aposTol = minutosTrecho - TOLERANCIA_MIN;
    const meiasHoras = Math.ceil(aposTol / MEIA_HORA_MIN);
    const totalMeias = Number((meiasHoras * vMeiaHora).toFixed(2));
    const virouDiaria =
      minutosTrecho > LIMITE_HORAS_DIARIA_MIN || (vDiaria > 0 && totalMeias >= vDiaria);

    return {
      valor: virouDiaria ? Number(vDiaria.toFixed(2)) : totalMeias,
      meiasHoras,
      aposTol,
      virouDiaria,
    };
  };

  const entrouNoturno = entrada.getHours() >= 22;
  const mesmoDiaEntrada =
    entrada.getFullYear() === saida.getFullYear() &&
    entrada.getMonth() === saida.getMonth() &&
    entrada.getDate() === saida.getDate();

  if (entrouNoturno && !mesmoDiaEntrada) {
    const inicioDiaSeguinte = new Date(
      entrada.getFullYear(),
      entrada.getMonth(),
      entrada.getDate() + 1,
      0,
      0
    );
    const fimPernoite = new Date(
      entrada.getFullYear(),
      entrada.getMonth(),
      entrada.getDate() + 1,
      6,
      0
    );

    if (saida >= inicioDiaSeguinte && saida <= fimPernoite) {
      return {
        valor: Number(vPernoite.toFixed(2)),
        resumo: `Permanência: ${mins} min — Pernoite (22h–06h): ${moeda(vPernoite)}.`,
      };
    }

    const minutosExcesso = Math.max(0, Math.floor((saida - fimPernoite) / 60000));
    const diasExtras = Math.floor(minutosExcesso / MIN_POR_DIA);
    const restoExcesso = minutosExcesso % MIN_POR_DIA;
    const rResto = calcularTrecho(restoExcesso);

    const valorFinal = Number((vPernoite + diasExtras * vDiaria + rResto.valor).toFixed(2));

    if (diasExtras > 0) {
      const restoTxt =
        restoExcesso <= TOLERANCIA_MIN
          ? `${restoExcesso} min (tol.)`
          : rResto.virouDiaria
          ? `${restoExcesso} min → Diária (${moeda(rResto.valor)})`
          : `${restoExcesso} min (${rResto.meiasHoras} meia(s)-hora(s): ${moeda(rResto.valor)})`;

      return {
        valor: valorFinal,
        resumo: `Permanência: ${mins} min — Pernoite (${moeda(vPernoite)}) + ${diasExtras} diária(s) extra (${moeda(diasExtras * vDiaria)}) + ${restoTxt} = ${moeda(valorFinal)}.`,
      };
    }

    const excessoTxt = rResto.virouDiaria
      ? `Excesso > 5h (${minutosExcesso} min → Diária ${moeda(vDiaria)})`
      : `Excesso ${minutosExcesso} min (${rResto.meiasHoras} meia(s)-hora(s): ${moeda(rResto.valor)})`;

    return {
      valor: valorFinal,
      resumo: `Permanência: ${mins} min — Pernoite (${moeda(vPernoite)}) + ${excessoTxt} = ${moeda(valorFinal)}.`,
    };
  }

  if (mins <= MIN_POR_DIA) {
    const r = calcularTrecho(mins);
    const resumo = r.virouDiaria
      ? `Permanência: ${mins} min (${r.aposTol} min após ${TOLERANCIA_MIN}m tol.) — Diária: ${moeda(vDiaria)}.`
      : `Permanência: ${mins} min (${r.aposTol} min após ${TOLERANCIA_MIN}m tol.) — ${r.meiasHoras} meia(s)-hora(s) (${moeda(vMeiaHora)}/30m) = ${moeda(r.valor)}.`;
    return { valor: r.valor, resumo };
  }

  const dias = Math.floor(mins / MIN_POR_DIA);
  const resto = mins % MIN_POR_DIA;
  const rResto = calcularTrecho(resto);
  const valorFinal = Number((dias * vDiaria + rResto.valor).toFixed(2));
  const resumo = rResto.virouDiaria
    ? `Permanência: ${dias} dia(s) (${moeda(dias * vDiaria)}) + ${resto} min (Diária: ${moeda(vDiaria)}) = ${moeda(valorFinal)}.`
    : `Permanência: ${dias} dia(s) (${moeda(dias * vDiaria)}) + ${resto} min (${rResto.aposTol} min após tol.: ${moeda(rResto.valor)}) = ${moeda(valorFinal)}.`;

  return { valor: valorFinal, resumo };
}

function CadastroPagamentos(props) {
  const { idParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isAdmin =
    String(props.usuarioLogado?.perfil || '').trim().toUpperCase() === 'ADMIN';

  const ticketState = useMemo(() => location.state?.ticket || null, [location.state]);
  const ticketQueryId = searchParams.get('ticketId');
  const veioPeloAtalho = Boolean(ticketState?.id || ticketQueryId);
  const inicial = agora();

  const [id, setId] = useState('');
  const [statusPagamentoAtual, setStatusPagamentoAtual] = useState('EM ABERTO');
  const [todosTickets, setTodosTickets] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [ticketId, setTicketId] = useState(String(ticketState?.id || ticketQueryId || ''));
  const [caixaId, setCaixaId] = useState(1);
  const [dataSaida, setDataSaida] = useState(inicial.data);
  const [horaSaida, setHoraSaida] = useState(inicial.hora);
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [valor, setValor] = useState('');
  const [valorRecebido, setValorRecebido] = useState('');
  const [troco, setTroco] = useState(0);
  const [resumoCalculo, setResumoCalculo] = useState('');
  const [erro, setErro] = useState('');

  const bloqueadoSemAdmin =
    Boolean(idParam) && statusPagamentoAtual === 'PAGO' && !isAdmin;

  const podeEditarSaida = (Boolean(idParam) || isAdmin) && !bloqueadoSemAdmin;

  useEffect(() => {
    const dadoInicial = agora();

    axios
      .get('/db.json')
      .then(({ data: db }) => {
        const ts = db?.tickets || [];
        const cs = db?.categorias || [];
        const ps = db?.pagamentos || [];
        const cx = (db?.caixa || []).find(
          (c) => String(c.status || '').toUpperCase() === 'ABERTO'
        );

        setTodosTickets(ts);
        setCategorias(cs);
        setPagamentos(ps);
        if (cx) setCaixaId(cx.id);

        if (idParam) {
          const p = ps.find((item) => Number(item.id) === Number(idParam));
          if (p) {
            setId(p.id);
            setStatusPagamentoAtual(String(p.status || 'EM ABERTO').toUpperCase());
            setTicketId(String(p.ticketId || ''));
            setCaixaId(p.caixaId || 1);
            setDataSaida(p.data || dadoInicial.data);
            setHoraSaida(p.hora || dadoInicial.hora);
            setFormaPagamento(
              String(p.formaPagamento || 'PIX').replace(/^R\$\s*/i, '').trim()
            );
            setValor(p.valor ?? '');
            setValorRecebido(p.valorRecebido ?? '');
            setTroco(p.troco ?? 0);
          }
          return;
        }

        const alvo = ticketState?.id || ticketQueryId;
        if (alvo) {
          const t =
            ts.find((item) => Number(item.id) === Number(alvo)) || ticketState;
          if (t) {
            const now = agora();
            setTicketId(String(t.id));
            setDataSaida(now.data);
            setHoraSaida(now.hora);
          }
        }
      })
      .catch((err) => console.error('Erro ao carregar dados de pagamento:', err));
  }, [idParam, ticketQueryId, ticketState]);

  // Atualiza data/hora de saída automaticamente apenas para OPERADOR em novo encerramento
  useEffect(() => {
    if (idParam || isAdmin) return;
    const atualizarRelogio = () => {
      const now = agora();
      setDataSaida(now.data);
      setHoraSaida(now.hora);
    };
    const timer = setInterval(atualizarRelogio, 15000);
    return () => clearInterval(timer);
  }, [idParam, isAdmin]);

  const ticketsAbertos = useMemo(
    () =>
      todosTickets.filter(
        (t) => String(t.status || '').toUpperCase() === 'ABERTO'
      ),
    [todosTickets]
  );

  const ticketSelecionado = useMemo(
    () =>
      todosTickets.find((t) => Number(t.id) === Number(ticketId)) ||
      (ticketState && Number(ticketState.id) === Number(ticketId)
        ? ticketState
        : null),
    [todosTickets, ticketId, ticketState]
  );

  const ticketJaFinalizado = useMemo(() => {
    if (!ticketSelecionado) return false;
    return String(ticketSelecionado.status || '').toUpperCase() === 'FINALIZADO';
  }, [ticketSelecionado]);

  // Recalcula valor e resumo sempre que mudar ticket, dataSaida ou horaSaida
  useEffect(() => {
    if (!ticketSelecionado || bloqueadoSemAdmin) return;
    const calc = calcularValor(
      ticketSelecionado,
      categorias,
      dataSaida,
      horaSaida
    );
    setValor(calc.valor);
    setResumoCalculo(calc.resumo);
  }, [ticketSelecionado, categorias, dataSaida, horaSaida, bloqueadoSemAdmin]);

  useEffect(() => {
    const v = Number(valor || 0);
    const r = Number(valorRecebido || 0);
    if (formaPagamento === 'DINHEIRO') {
      setTroco(r > v ? Number((r - v).toFixed(2)) : 0);
    } else {
      setValorRecebido(valor !== '' ? v : '');
      setTroco(0);
    }
  }, [formaPagamento, valor, valorRecebido]);

  const selecionarTicket = (e) => {
    setErro('');
    const val = e.target.value;
    setTicketId(val);
    if (!val) {
      setValor('');
      setValorRecebido('');
      setTroco(0);
      setResumoCalculo('');
      return;
    }
    const now = agora();
    setDataSaida(now.data);
    setHoraSaida(now.hora);
  };

  const confirmar = () => {
    setErro('');

    if (bloqueadoSemAdmin) {
      setErro(
        'Operação negada: pagamento já PAGO só pode ser alterado por um ADMIN.'
      );
      return;
    }

    if (!ticketId) {
      setErro('Selecione um ticket em aberto para encerrar.');
      return;
    }

    if (!idParam && ticketJaFinalizado) {
      setErro(
        `O Ticket #${ticketId} já se encontra FINALIZADO e não pode ser encerrado novamente.`
      );
      return;
    }

    const momentoFechamento = podeEditarSaida
      ? { data: dataSaida, hora: horaSaida }
      : agora();

    const calcFinal = ticketSelecionado
      ? calcularValor(
          ticketSelecionado,
          categorias,
          momentoFechamento.data,
          momentoFechamento.hora
        )
      : { valor: Number(valor || 0) };

    const vFinal =
      podeEditarSaida && valor !== ''
        ? Number(valor)
        : Number(calcFinal.valor || 0);

    const rFinal =
      formaPagamento === 'DINHEIRO'
        ? valorRecebido === ''
          ? vFinal
          : Number(valorRecebido)
        : vFinal;

    if (formaPagamento === 'DINHEIRO' && (Number.isNaN(rFinal) || rFinal < vFinal)) {
      setErro(
        `Valor recebido (${moeda(rFinal)}) é menor que o valor calculado (${moeda(vFinal)}).`
      );
      return;
    }

    const tFinal =
      formaPagamento === 'DINHEIRO' && rFinal > vFinal
        ? Number((rFinal - vFinal).toFixed(2))
        : 0;

    const novoId = id
      ? Number(id)
      : pagamentos.reduce((m, p) => Math.max(m, Number(p.id || 0)), 0) + 1;

    const pagSalvo = {
      id: novoId,
      ticketId: Number(ticketId),
      caixaId: Number(caixaId),
      formaPagamento,
      valor: vFinal,
      valorRecebido: rFinal,
      troco: tFinal,
      data: momentoFechamento.data,
      hora: momentoFechamento.hora,
      status: 'PAGO',
    };

    const idx = pagamentos.findIndex(
      (p) =>
        Number(p.id) === novoId ||
        (Number(p.ticketId) === Number(ticketId) &&
          String(p.status || '').toUpperCase() === 'EM ABERTO')
    );

    setPagamentos(
      idx >= 0
        ? pagamentos.map((p, i) => (i === idx ? { ...p, ...pagSalvo } : p))
        : [...pagamentos, pagSalvo]
    );

    setTodosTickets(
      todosTickets.map((t) =>
        Number(t.id) === Number(ticketId)
          ? {
              ...t,
              dataSaida: momentoFechamento.data,
              horaSaida: momentoFechamento.hora,
              valorTotal: vFinal,
              status: 'FINALIZADO',
            }
          : t
      )
    );

    const tEncerrado = todosTickets.find(
      (t) => Number(t.id) === Number(ticketId)
    );
    if (
      tEncerrado &&
      String(tEncerrado.status || '').toUpperCase() === 'ABERTO'
    ) {
      setCategorias(
        categorias.map((c) => {
          const mesma =
            Number(c.id) === Number(tEncerrado.categoriaId) ||
            String(c.nome || '').toLowerCase() ===
              String(tEncerrado.categoria || '').toLowerCase();
          return mesma
            ? {
                ...c,
                vagasOcupadas: Math.max(0, Number(c.vagasOcupadas || 0) - 1),
              }
            : c;
        })
      );
    }

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
              {bloqueadoSemAdmin && (
                <div className='alert alert-warning py-2 px-3 mb-3'>
                  Este pagamento já está <strong>PAGO</strong>. Somente um usuário{' '}
                  <strong>ADMIN</strong> pode alterar este lançamento.
                </div>
              )}

              {erro && (
                <div className='alert alert-danger py-2 px-3 mb-3'>{erro}</div>
              )}

              {!idParam && ticketJaFinalizado && (
                <div className='alert alert-warning py-2 px-3 mb-3'>
                  Atenção: o Ticket #{ticketId} já está <strong>FINALIZADO</strong>.
                </div>
              )}

              <div className='row'>
                <div className='col-md-6'>
                  <FormGroup label='Ticket: *' htmlFor='selectTicket'>
                    <select
                      id='selectTicket'
                      className='form-select'
                      value={ticketId}
                      disabled={veioPeloAtalho || bloqueadoSemAdmin}
                      onChange={selecionarTicket}
                    >
                      <option value=''>Selecione um ticket aberto...</option>
                      {ticketsAbertos.map((t) => (
                        <option key={t.id} value={t.id}>
                          #{t.id} - {t.placa} ({t.categoria})
                        </option>
                      ))}
                      {ticketSelecionado &&
                        !ticketsAbertos.some(
                          (t) => Number(t.id) === Number(ticketSelecionado.id)
                        ) && (
                          <option value={ticketSelecionado.id}>
                            #{ticketSelecionado.id} - {ticketSelecionado.placa} (
                            {ticketSelecionado.status || 'ABERTO'})
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
                      readOnly={!podeEditarSaida}
                      disabled={!podeEditarSaida}
                      onChange={(e) => setCaixaId(e.target.value)}
                    />
                  </FormGroup>
                </div>
              </div>

              {ticketSelecionado && (
                <div className='alert alert-secondary py-2 px-3 mb-3'>
                  <div>
                    <strong>Ticket #{ticketSelecionado.id}</strong> — Placa:{' '}
                    <strong>{ticketSelecionado.placa}</strong> | Categoria:{' '}
                    {ticketSelecionado.categoria} | Entrada:{' '}
                    {ticketSelecionado.dataEntrada} às{' '}
                    {ticketSelecionado.horaEntrada}
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
                  <FormGroup
                    label={
                      podeEditarSaida
                        ? 'Data de Saída: *'
                        : 'Data de Saída (Automática):'
                    }
                    htmlFor='inputDataSaida'
                  >
                    <input
                      type='date'
                      id='inputDataSaida'
                      value={dataSaida}
                      className='form-control'
                      readOnly={!podeEditarSaida}
                      disabled={!podeEditarSaida}
                      onChange={(e) => setDataSaida(e.target.value)}
                    />
                  </FormGroup>
                </div>

                <div className='col-md-6'>
                  <FormGroup
                    label={
                      podeEditarSaida
                        ? 'Hora de Saída: *'
                        : 'Hora de Saída (Automática):'
                    }
                    htmlFor='inputHoraSaida'
                  >
                    <input
                      type='time'
                      id='inputHoraSaida'
                      value={horaSaida}
                      className='form-control'
                      readOnly={!podeEditarSaida}
                      disabled={!podeEditarSaida}
                      onChange={(e) => setHoraSaida(e.target.value)}
                    />
                  </FormGroup>
                </div>
              </div>

              <FormGroup label='Forma de Pagamento: *'>
                <div className='d-flex gap-2 flex-wrap'>
                  {FORMAS.map((f) => (
                    <button
                      key={f}
                      type='button'
                      disabled={bloqueadoSemAdmin}
                      onClick={() => {
                        setFormaPagamento(f);
                        if (f !== 'DINHEIRO' && valor !== '') {
                          setValorRecebido(Number(valor));
                          setTroco(0);
                        }
                      }}
                      className={`btn ${
                        formaPagamento === f
                          ? 'btn-primary'
                          : 'btn-outline-secondary'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </FormGroup>

              <div className='row mt-3'>
                <div className='col-md-4'>
                  <FormGroup
                    label={podeEditarSaida ? 'Valor (R$): *' : 'Valor Calculado (R$):'}
                    htmlFor='inputValor'
                  >
                    <input
                      type='number'
                      step='0.01'
                      id='inputValor'
                      value={valor}
                      className='form-control'
                      readOnly={!podeEditarSaida}
                      disabled={!podeEditarSaida}
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
                      disabled={formaPagamento !== 'DINHEIRO' || bloqueadoSemAdmin}
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
                  onClick={confirmar}
                  type='button'
                  className='btn btn-success'
                  disabled={(!idParam && ticketJaFinalizado) || bloqueadoSemAdmin}
                >
                  Confirmar Pagamento e Encerrar Ticket
                </button>
                <button
                  onClick={() =>
                    navigate(
                      veioPeloAtalho ? '/listagem-tickets' : '/listagem-pagamentos'
                    )
                  }
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