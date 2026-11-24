import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Card from '../components/card';
import FormGroup from '../components/form-group';
import axios from 'axios';

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

function CadastroTickets() {
  const { idParam } = useParams();
  const navigate = useNavigate();

  const agoraInicial = obterDataHoraAtual();

  const [id, setId] = useState('');
  const [placa, setPlaca] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [dataEntrada, setDataEntrada] = useState(agoraInicial.data);
  const [horaEntrada, setHoraEntrada] = useState(agoraInicial.hora);
  const [status, setStatus] = useState('ABERTO');

  const [categorias, setCategorias] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [erro, setErro] = useState('');
  const [ticketEmitido, setTicketEmitido] = useState(null);

  useEffect(() => {
    axios
      .get('/db.json')
      .then((response) => {
        const listaCategorias = response.data?.categorias || [];
        const listaTickets = response.data?.tickets || [];

        setCategorias(listaCategorias);
        setTickets(listaTickets);

        if (idParam) {
          const encontrado = listaTickets.find(
            (t) => Number(t.id) === Number(idParam)
          );
          if (encontrado) {
            setId(encontrado.id);
            setPlaca(encontrado.placa || '');
            setCategoriaId(String(encontrado.categoriaId || ''));
            setDataEntrada(encontrado.dataEntrada || agoraInicial.data);
            setHoraEntrada(encontrado.horaEntrada || agoraInicial.hora);
            setStatus(encontrado.status || 'ABERTO');
          }
        } else {
          const primeiraAtiva = listaCategorias.find((c) => c.ativo !== false);
          if (primeiraAtiva) {
            setCategoriaId(String(primeiraAtiva.id));
          }
        }
      })
      .catch((error) => {
        console.error('Erro ao carregar dados para cadastro de ticket:', error);
      });
  }, [idParam]);

  const categoriaSelecionada = categorias.find(
    (c) => Number(c.id) === Number(categoriaId)
  );

  const vagasDisponiveisCategoria = categoriaSelecionada
    ? Math.max(
        0,
        Number(categoriaSelecionada.vagasTotais || 0) -
          Number(categoriaSelecionada.vagasOcupadas || 0)
      )
    : 0;

  const cancelar = () => {
    navigate('/listagem-tickets');
  };

  const registrarNovo = () => {
    const agora = obterDataHoraAtual();
    setId('');
    setPlaca('');
    setDataEntrada(agora.data);
    setHoraEntrada(agora.hora);
    setStatus('ABERTO');
    setErro('');
    setTicketEmitido(null);
  };

  const salvar = () => {
    setErro('');

    const placaLimpa = String(placa || '')
      .trim()
      .toUpperCase();

    if (!placaLimpa) {
      setErro('Informe a placa do veículo.');
      return;
    }

    if (!categoriaId || !categoriaSelecionada) {
      setErro('Selecione uma categoria de veículo.');
      return;
    }

    if (!idParam) {
      // RN01 / RF13: verificar se já existe ticket em aberto para a mesma placa
      const jaAberto = tickets.find(
        (t) =>
          String(t.placa || '')
            .trim()
            .toUpperCase() === placaLimpa &&
          String(t.status || '').toUpperCase() === 'ABERTO'
      );

      if (jaAberto) {
        setErro(
          `Bloqueado: o veículo de placa ${placaLimpa} já possui o Ticket #${jaAberto.id} em ABERTO.`
        );
        return;
      }

      // RN02 / RF11 / RF12: verificar disponibilidade de vagas
      const catAtual = categorias.find(
        (c) => Number(c.id) === Number(categoriaId)
      );
      const livres = catAtual
        ? Number(catAtual.vagasTotais || 0) - Number(catAtual.vagasOcupadas || 0)
        : 0;

      if (livres <= 0) {
        setErro(
          `Lotado: não há vagas disponíveis para a categoria ${categoriaSelecionada.nome}.`
        );
        return;
      }
    }

    const agoraRegistro = obterDataHoraAtual();
    const dataFinal = idParam ? dataEntrada : agoraRegistro.data;
    const horaFinal = idParam ? horaEntrada : agoraRegistro.hora;

    const novoId = idParam
      ? Number(idParam)
      : tickets.reduce((max, t) => Math.max(max, Number(t.id || 0)), 0) + 1;

    const ticketSalvo = {
      id: novoId,
      placa: placaLimpa,
      categoriaId: Number(categoriaSelecionada.id),
      categoria: categoriaSelecionada.nome,
      dataEntrada: dataFinal,
      horaEntrada: horaFinal,
      dataSaida: null,
      horaSaida: null,
      valorTotal: null,
      status: idParam ? status : 'ABERTO',
    };

    const novosTickets = idParam
      ? tickets.map((t) =>
          Number(t.id) === Number(idParam) ? { ...t, ...ticketSalvo } : t
        )
      : [...tickets, ticketSalvo];

    setTickets(novosTickets);

    // RN03: ocupar 1 vaga na categoria correspondente ao registrar nova entrada
    if (!idParam) {
      const novasCategorias = categorias.map((cat) => {
        if (Number(cat.id) !== Number(categoriaSelecionada.id)) return cat;
        return {
          ...cat,
          vagasOcupadas: Number(cat.vagasOcupadas || 0) + 1,
        };
      });
      setCategorias(novasCategorias);
      setDataEntrada(dataFinal);
      setHoraEntrada(horaFinal);
      setTicketEmitido(ticketSalvo);
    } else {
      alert(`Ticket #${novoId} atualizado com sucesso!`);
      navigate('/listagem-tickets');
    }
  };

  return (
    <div className='container'>
      <Card title={idParam ? `Editar Ticket #${idParam}` : 'Registrar Entrada de Veículo'}>
        <div className='row'>
          <div className='col-lg-12'>
            <div className='bs-component'>
              {erro && (
                <div className='alert alert-danger py-2 px-3 mb-3'>{erro}</div>
              )}

              {ticketEmitido ? (
                <div className='border rounded p-4 bg-light mb-3'>
                  <h5 className='text-success mb-3'>
                    Ticket Emitido com Sucesso!
                  </h5>
                  <p className='mb-1'>
                    <strong>Número do Ticket:</strong> #{ticketEmitido.id}
                  </p>
                  <p className='mb-1'>
                    <strong>Placa:</strong> {ticketEmitido.placa}
                  </p>
                  <p className='mb-1'>
                    <strong>Categoria:</strong> {ticketEmitido.categoria}
                  </p>
                  <p className='mb-1'>
                    <strong>Data de Entrada:</strong> {ticketEmitido.dataEntrada}
                  </p>
                  <p className='mb-3'>
                    <strong>Hora de Entrada:</strong> {ticketEmitido.horaEntrada}
                  </p>

                  <Stack spacing={1} direction='row'>
                    <button
                      type='button'
                      className='btn btn-primary'
                      onClick={() => navigate('/listagem-tickets')}
                    >
                      Ir para Listagem de Tickets
                    </button>
                    <button
                      type='button'
                      className='btn btn-outline-success'
                      onClick={registrarNovo}
                    >
                      Registrar Nova Entrada
                    </button>
                  </Stack>
                </div>
              ) : (
                <>
                  <div className='row'>
                    <div className='col-md-6'>
                      <FormGroup label='Placa do Veículo: *' htmlFor='inputPlaca'>
                        <input
                          type='text'
                          id='inputPlaca'
                          value={placa}
                          maxLength={8}
                          className='form-control text-uppercase'
                          onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                          placeholder='Ex: ABC1D23'
                        />
                      </FormGroup>
                    </div>

                    <div className='col-md-6'>
                      <FormGroup label='Categoria: *' htmlFor='selectCategoria'>
                        <select
                          id='selectCategoria'
                          className='form-select'
                          value={categoriaId}
                          onChange={(e) => setCategoriaId(e.target.value)}
                        >
                          <option value=''>Selecione a categoria...</option>
                          {categorias
                            .filter((c) => c.ativo !== false)
                            .map((cat) => {
                              const livres = Math.max(
                                0,
                                Number(cat.vagasTotais || 0) -
                                  Number(cat.vagasOcupadas || 0)
                              );
                              return (
                                <option key={cat.id} value={cat.id}>
                                  {cat.nome} ({livres} vagas disponíveis)
                                </option>
                              );
                            })}
                        </select>
                      </FormGroup>
                    </div>
                  </div>

                  {categoriaSelecionada && (
                    <div
                      className={`alert ${
                        vagasDisponiveisCategoria > 0
                          ? 'alert-info'
                          : 'alert-warning'
                      } py-2 px-3 mb-3`}
                    >
                      Categoria <strong>{categoriaSelecionada.nome}</strong> —
                      Vagas disponíveis:{' '}
                      <strong>{vagasDisponiveisCategoria}</strong> de{' '}
                      {categoriaSelecionada.vagasTotais} | Tarifa Hora: R${' '}
                      {Number(categoriaSelecionada.valorHora || 0)
                        .toFixed(2)
                        .replace('.', ',')}
                    </div>
                  )}

                  <div className='row'>
                    <div className='col-md-6'>
                      <FormGroup
                        label='Data de Entrada (Automática):'
                        htmlFor='inputDataEntrada'
                      >
                        <input
                          type='date'
                          id='inputDataEntrada'
                          value={dataEntrada}
                          className='form-control'
                          readOnly
                          disabled
                        />
                      </FormGroup>
                    </div>

                    <div className='col-md-6'>
                      <FormGroup
                        label='Hora de Entrada (Automática):'
                        htmlFor='inputHoraEntrada'
                      >
                        <input
                          type='time'
                          id='inputHoraEntrada'
                          value={horaEntrada}
                          className='form-control'
                          readOnly
                          disabled
                        />
                      </FormGroup>
                    </div>
                  </div>

                  <Stack spacing={1} padding={1} direction='row' className='mt-2'>
                    <button
                      onClick={salvar}
                      type='button'
                      className='btn btn-success'
                      disabled={
                        !idParam &&
                        Boolean(categoriaSelecionada) &&
                        vagasDisponiveisCategoria <= 0
                      }
                    >
                      Confirmar Entrada e Emitir Ticket
                    </button>
                    <button
                      onClick={cancelar}
                      type='button'
                      className='btn btn-danger'
                    >
                      Cancelar
                    </button>
                  </Stack>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default CadastroTickets;