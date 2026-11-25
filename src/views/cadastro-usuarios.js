import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Card from '../components/card';
import FormGroup from '../components/form-group';
import axios from 'axios';

function CadastroUsuarios() {
  const { idParam } = useParams();
  const navigate = useNavigate();

  const [id, setId] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState('OPERADOR');
  const [ativo, setAtivo] = useState(true);
  const [usuariosExistentes, setUsuariosExistentes] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    axios
      .get('/db.json')
      .then((response) => {
        const lista = response.data?.usuarios || [];
        setUsuariosExistentes(lista);

        if (idParam) {
          const usuario = lista.find((u) => Number(u.id) === Number(idParam));
          if (usuario) {
            setId(usuario.id);
            setNome(usuario.nome || '');
            setEmail(usuario.email || '');
            setSenha(usuario.senha || '');
            setPerfil(usuario.perfil || 'OPERADOR');
            setAtivo(usuario.ativo !== undefined ? usuario.ativo : true);
          }
        }
      })
      .catch((error) => console.error('Erro:', error));
  }, [idParam]);

  const inicializar = () => {
    navigate('/listagem-usuarios');
  };

  const salvar = () => {
    setErro('');

    const nomeLimpo = String(nome || '').trim();
    const emailLimpo = String(email || '').trim().toLowerCase();
    const senhaLimpa = String(senha || '').trim();

    if (!nomeLimpo) {
      setErro('Informe o nome do usuário.');
      return;
    }

    if (!emailLimpo || !emailLimpo.includes('@')) {
      setErro('Informe um e-mail válido.');
      return;
    }

    if (!senhaLimpa || senhaLimpa.length < 4) {
      setErro('Informe uma senha com pelo menos 4 caracteres.');
      return;
    }

    const emailDuplicado = usuariosExistentes.find(
      (u) =>
        String(u.email || '').trim().toLowerCase() === emailLimpo &&
        Number(u.id) !== Number(id)
    );
    if (emailDuplicado) {
      setErro(`Já existe um usuário cadastrado com o e-mail ${emailLimpo}.`);
      return;
    }

    const usuarioData = {
      id: id ? Number(id) : Date.now(),
      nome: nomeLimpo,
      email: emailLimpo,
      senha: senhaLimpa,
      perfil,
      ativo: Boolean(ativo),
    };

    console.log('Salvando usuário:', usuarioData);
    alert('Usuário salvo com sucesso!');
    navigate('/listagem-usuarios');
  };

  return (
    <div className='container'>
      <Card title={idParam ? 'Editar Usuário' : 'Cadastro de Novo Usuário'}>
        <div className='row'>
          <div className='col-lg-12'>
            <div className='bs-component'>
              {erro && (
                <div className='alert alert-danger py-2 px-3 mb-3'>{erro}</div>
              )}

              <FormGroup label='Nome: *' htmlFor='inputNome'>
                <input
                  type='text'
                  id='inputNome'
                  value={nome}
                  className='form-control'
                  onChange={(e) => setNome(e.target.value)}
                />
              </FormGroup>

              <FormGroup label='E-mail: *' htmlFor='inputEmail'>
                <input
                  type='email'
                  id='inputEmail'
                  value={email}
                  className='form-control'
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormGroup>

              <FormGroup label='Senha: *' htmlFor='inputSenha'>
                <input
                  type='password'
                  id='inputSenha'
                  value={senha}
                  className='form-control'
                  onChange={(e) => setSenha(e.target.value)}
                />
              </FormGroup>

              <div className='row'>
                <div className='col-md-6'>
                  <FormGroup label='Perfil: *' htmlFor='selectPerfil'>
                    <select
                      className='form-select'
                      id='selectPerfil'
                      value={perfil}
                      onChange={(e) => setPerfil(e.target.value)}
                    >
                      <option value='OPERADOR'>OPERADOR</option>
                      <option value='ADMIN'>ADMIN</option>
                    </select>
                  </FormGroup>
                </div>
                <div className='col-md-6'>
                  <FormGroup label='Status do Usuário: *' htmlFor='selectAtivoUser'>
                    <select
                      className='form-select'
                      id='selectAtivoUser'
                      value={ativo ? 'true' : 'false'}
                      onChange={(e) => setAtivo(e.target.value === 'true')}
                    >
                      <option value='true'>Ativo</option>
                      <option value='false'>Inativo</option>
                    </select>
                  </FormGroup>
                </div>
              </div>

              <Stack spacing={1} padding={1} direction='row'>
                <button onClick={salvar} type='button' className='btn btn-success'>
                  Salvar
                </button>
                <button onClick={inicializar} type='button' className='btn btn-danger'>
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

export default CadastroUsuarios;