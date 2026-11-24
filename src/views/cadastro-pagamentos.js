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
  const vMeiaHora = vHora / 2; // Metade da hora
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

  // 1) Até 15 minutos: tolerância gratuita
  if (mins <= TOLERANCIA_MIN) {
    return {
      valor: 0,
      resumo: `Permanência: ${mins} min — Dentro da tolerância de ${TOLERANCIA_MIN} min (${moeda(0)}).`,
    };
  }

  // 3) Pernoite: entrada entre 22:00 e 23:59 e saída até 06:00 do dia seguinte
  const entrouNoturno = entrada.getHours() >= 22;
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

  if (entrouNoturno && saida >= inicioDiaSeguinte && saida <= fimPernoite) {
    return {
      valor: Number(vPernoite.toFixed(2)),
      resumo: `Permanência: ${mins} min — Pernoite (22h–06h): ${moeda(vPernoite)}.`,
    };
  }

  // Trecho após 15 min: cada bloco de 30 min (ou fração) cobra 1 meia-hora (vHora / 2)
  const calcularTrechoMeiaHora = (minutosTrecho) => {
    if (minutosTrecho <= TOLERANCIA_MIN) {
      return { valor: 0, meiasHoras: 0, aposTol: 0, diaria: false };
    }
    const aposTol = minutosTrecho - TOLERANCIA_MIN;
    const meiasHoras = Math.ceil(aposTol / MEIA_HORA_MIN);
    const totalMeias = Number((meiasHoras * vMeiaHora).toFixed(2));
    const diaria = vDiaria > 0 && totalMeias >= vDiaria;
    return {
      valor: diaria ? Number(vDiaria.toFixed(2)) : totalMeias,
      meiasHoras,
      aposTol,
      diaria,
    };
  };

  let valorFinal = 0;
  let resumo = '';

  // 2) Até 24h (1440 min): meia hora por bloco de 30 min após 15 min, limitado à diária
  if (mins <= MIN_POR_DIA) {
    const r = calcularTrechoMeiaHora(mins);
    valorFinal = r.valor;
    resumo = r.diaria
      ? `Permanência: ${mins} min (${r.aposTol} min após ${TOLERANCIA_MIN}m tol.) — Teto da Diária: ${moeda(vDiaria)}.`
      : `Permanência: ${mins} min (${r.aposTol} min após ${TOLERANCIA_MIN}m tol.) — ${r.meiasHoras} meia(s)-hora(s) (${moeda(vMeiaHora)}/30m) = ${moeda(valorFinal)}.`;
  } else {
    // 4) Mais de 24h: dias completos (diária) + trecho restante
    const dias = Math.floor(mins / MIN_POR_DIA);
    const resto = mins % MIN_POR_DIA;
    const rResto = calcularTrechoMeiaHora(resto);
    valorFinal = Number((dias * vDiaria + rResto.valor).toFixed(2));
    resumo = `Permanência: ${dias} dia(s) (${moeda(dias * vDiaria)}) + ${resto} min (${rResto.aposTol} min após tol.: ${moeda(rResto.valor)}) = ${moeda(valorFinal)}.`;
  }

  // Se entrou na janela noturna (22h–23:59) e passou das 06:00, garante piso do pernoite
  if (entrouNoturno && saida > fimPernoite && valorFinal < vPernoite) {
    valorFinal = Number(vPernoite.toFixed(2));
    resumo = `Permanência: ${mins} min — Extensão pós-06h com piso de Pernoite: ${moeda(valorFinal)}.`;
  }

  return { valor: valorFinal, resumo };
}

function CadastroPagamentos() {
  const { idParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const ticketState = location.state?.ticket || null;
  const ticketQueryId = searchParams.get('ticketId');
  const veioPeloAtalho = Boolean(ticketState?.id || ticketQueryId);
  const inicial = agora();

  const [id, setId] = useState('');
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

  useEffect(() => {
    axios
      .get('/db.json')
      .then(({ data: db }) => {
        const ts = db?.tickets || [];
        const cs = db?.categorias || [];
        const ps = db?.pagamentos || [];
        const cx = (db?.caixa || []).find((c) => String(c.status || '').toUpperCase() === 'ABERTO');

        setTodosTickets(ts);
        setCategorias(cs);
        setPagamentos(ps);
        if (cx) setCaixaId(cx.id);

        if (idParam) {
          const p = ps.find((item) => Number(item.id) === Number(idParam));
          if (p) {
            setId(p.id);
            setTicketId(String(p.ticketId || ''));
            setCaixaId(p.caixaId || 1);
            setDataSaida(p.data || inicial.data);
            setHoraSaida(p.hora || inicial.hora);
            setFormaPagamento(String(p.formaPagamento || 'PIX').replace(/^R\$\s*/i, '').trim());
            setValor(p.valor ?? '');
            setValorRecebido(p.valorRecebido ?? '');
            setTroco(p.troco ?? 0);
          }
          return;
        }

        const alvo = ticketState?.id || ticketQueryId;
        if (alvo) {
          const t = ts.find((item) => Number(item.id) === Number(alvo)) || ticketState;
          if (t) {
            const now = agora();
            const dSaida = t.dataSaida || now.data;
            const hSaida = t.horaSaida || now.hora;
            setTicketId(String(t.id));
            setDataSaida(dSaida);
            setHoraSaida(hSaida);
          }
        }
      })
      .catch((err) => console.error('Erro ao carregar dados de pagamento:', err));
  }, [idParam, ticketQueryId, ticketState]);

  const ticketsAbertos = useMemo(
    () => todosTickets.filter((t) => String(t.status || '').toUpperCase() === 'ABERTO'),
    [todosTickets]
  );

  const ticketSelecionado = useMemo(
    () =>
      todosTickets.find((t) => Number(t.id) === Number(ticketId)) ||
      (ticketState && Number(ticketState.id) === Number(ticketId) ? ticketState : null),
    [todosTickets, ticketId, ticketState]
  );

  // Recalcula sempre que ticket, categorias, dataSaida ou horaSaida mudarem
  useEffect(() => {
    if (idParam || !ticketSelecionado) return;
    const calc = calcularValor(ticketSelecionado, categorias, dataSaida, horaSaida);
    setValor(calc.valor);
    setResumoCalculo(calc.resumo);
  }, [idParam, ticketSelecionado, categorias, dataSaida, horaSaida]);

  // Atualiza valorRecebido e troco quando formaPagamento, valor ou valorRecebido mudam
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
    if (!ticketId) return alert('Selecione um ticket em aberto para encerrar.');

    const vFinal = Number(valor || 0);
    const rFinal = formaPagamento === 'DINHEIRO' ? Number(valorRecebido || vFinal) : vFinal;
    const tFinal = formaPagamento === 'DINHEIRO' && rFinal > vFinal ? Number((rFinal - vFinal).toFixed(2)) : 0;
    const novoId = id ? Number(id) : pagamentos.reduce((m, p) => Math.max(m, Number(p.id || 0)), 0) + 1;

    const pagSalvo = {
      id: novoId,
      ticketId: Number(ticketId),
      caixaId: Number(caixaId),
      formaPagamento,
      valor: vFinal,
      valorRecebido: rFinal,
      troco: tFinal,
      data: dataSaida,
      hora: horaSaida,
      status: 'PAGO',
    };

    const idx = pagamentos.findIndex(
      (p) =>
        Number(p.id) === novoId ||
        (Number(p.ticketId) === Number(ticketId) &&
          String(p.status || '').toUpperCase() === 'EM ABERTO')
    );

    setPagamentos(
      idx >= 0 ? pagamentos.map((p, i) => (i === idx ? { ...p, ...pagSalvo } : p)) : [...pagamentos, pagSalvo]
    );
    setTodosTickets(
      todosTickets.map((t) =>
        Number(t.id) === Number(ticketId)
          ? { ...t, dataSaida, horaSaida, valorTotal: vFinal, status: 'FINALIZADO' }
          : t
      )
    );

    const tEncerrado = todosTickets.find((t) => Number(t.id) === Number(ticketId));
    if (tEncerrado) {
      setCategorias(
        categorias.map((c) => {
          const mesma =
            Number(c.id) === Number(tEncerrado.categoriaId) ||
            String(c.nome || '').toLowerCase() === String(tEncerrado.categoria || '').toLowerCase();
          return mesma ? { ...c, vagasOcupadas: Math.max(0, Number(c.vagasOcupadas || 0) - 1) } : c;
        })
      );
    }

    alert(`Pagamento (${formaPagamento}) salvo e Ticket #${ticketId} encerrado! Já consta nos Relatórios.`);
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
                      onChange={selecionarTicket}
                    >
                      <option value=''>Selecione um ticket aberto...</option>
                      {ticketsAbertos.map((t) => (
                        <option key={t.id} value={t.id}>
                          #{t.id} - {t.placa} ({t.categoria})
                        </option>
                      ))}
                      {ticketSelecionado &&
                        !ticketsAbertos.some((t) => Number(t.id) === Number(ticketSelecionado.id)) && (
                          <option value={ticketSelecionado.id}>
                            #{ticketSelecionado.id} - {ticketSelecionado.placa} ({ticketSelecionado.status || 'ABERTO'})
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

              {ticketSelecionado && (
                <div className='alert alert-secondary py-2 px-3 mb-3'>
                  <div>
                    <strong>Ticket #{ticketSelecionado.id}</strong> — Placa:{' '}
                    <strong>{ticketSelecionado.placa}</strong> | Categoria: {ticketSelecionado.categoria} | Entrada:{' '}
                    {ticketSelecionado.dataEntrada} às {ticketSelecionado.horaEntrada}
                  </div>
                  {resumoCalculo && <small className='d-block mt-1 text-dark'>{resumoCalculo}</small>}
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
                  {FORMAS.map((f) => (
                    <button
                      key={f}
                      type='button'
                      onClick={() => {
                        setFormaPagamento(f);
                        if (f !== 'DINHEIRO' && valor !== '') {
                          setValorRecebido(Number(valor));
                          setTroco(0);
                        }
                      }}
                      className={`btn ${formaPagamento === f ? 'btn-primary' : 'btn-outline-secondary'}`}
                    >
                      {f}
                    </button>
                  ))}
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
                  <FormGroup label='Valor Recebido (R$):' htmlFor='inputValorRecebido'>
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
                <button onClick={confirmar} type='button' className='btn btn-success'>
                  Confirmar Pagamento e Encerrar Ticket
                </button>
                <button
                  onClick={() => navigate(veioPeloAtalho ? '/listagem-tickets' : '/listagem-pagamentos')}
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