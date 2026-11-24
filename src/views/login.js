import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toastr from 'toastr';

function Login(props) {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const entrar = (e) => {
    e.preventDefault();

    const emailLimpo = String(email || '').trim().toLowerCase();
    const senhaLimpa = String(senha || '').trim();

    if (!emailLimpo || !senhaLimpa) {
      toastr.warning('Preencha o e-mail e a senha.');
      return;
    }

    setCarregando(true);

    axios
      .get('/db.json')
      .then((response) => {
        const dados = response.data;
        const lista = Array.isArray(dados?.usuarios)
          ? dados.usuarios
          : Array.isArray(dados)
          ? dados
          : [];

        const usuarioEncontrado = lista.find(
          (u) =>
            String(u.email || '').trim().toLowerCase() === emailLimpo &&
            String(u.senha || '').trim() === senhaLimpa
        );

        if (!usuarioEncontrado) {
          toastr.error('E-mail ou senha inválidos.');
          setCarregando(false);
          return;
        }

        if (usuarioEncontrado.ativo === false) {
          toastr.error('Este usuário está inativo no sistema.');
          setCarregando(false);
          return;
        }

        if (typeof props.onLogin === 'function') {
          props.onLogin(usuarioEncontrado);
        }

        toastr.success(
          `Bem-vindo, ${usuarioEncontrado.nome || usuarioEncontrado.email}!`
        );
        setCarregando(false);
        navigate('/dashboard');
      })
      .catch((error) => {
        console.error('Erro ao validar login:', error);
        toastr.error('Erro ao conectar com a base de usuários.');
        setCarregando(false);
      });
  };

  return (
    <div
      className='d-flex align-items-center justify-content-center px-3'
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflowY: 'auto',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0f4c81 100%)',
        zIndex: 1050,
      }}
    >
      <div
        className='card border-0 shadow-lg my-auto'
        style={{
          width: '100%',
          maxWidth: '420px',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <div className='card-body p-4 p-md-5 bg-white'>
          <div className='text-center mb-4'>
            <div
              className='d-inline-flex align-items-center justify-content-center mb-3 text-white fw-bold'
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                fontSize: '26px',
                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)',
              }}
            >
              P
            </div>
            <h3 className='fw-bold mb-1' style={{ color: '#0f172a' }}>
              Estaciona
            </h3>
            <p className='text-muted small mb-0'>
              Sistema de Gestão de Estacionamento
            </p>
          </div>

          <form onSubmit={entrar}>
            <div className='mb-3'>
              <label
                htmlFor='inputEmail'
                className='form-label fw-semibold small text-secondary'
              >
                E-mail
              </label>
              <input
                type='email'
                className='form-control form-control-lg'
                id='inputEmail'
                placeholder='seuemail@exemplo.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ fontSize: '15px', borderRadius: '10px' }}
              />
            </div>

            <div className='mb-4'>
              <label
                htmlFor='inputSenha'
                className='form-label fw-semibold small text-secondary'
              >
                Senha
              </label>
              <div className='input-group'>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  className='form-control form-control-lg'
                  id='inputSenha'
                  placeholder='Digite sua senha'
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  style={{ fontSize: '15px', borderRadius: '10px 0 0 10px' }}
                />
                <button
                  type='button'
                  className='btn btn-outline-secondary'
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  style={{ borderRadius: '0 10px 10px 0', fontSize: '13px' }}
                >
                  {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            <button
              type='submit'
              disabled={carregando}
              className='btn btn-primary btn-lg w-100 fw-semibold'
              style={{
                borderRadius: '10px',
                fontSize: '16px',
                padding: '12px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                border: 'none',
                boxShadow: '0 6px 16px rgba(37, 99, 235, 0.28)',
              }}
            >
              {carregando ? 'Entrando...' : 'Entrar no Sistema'}
            </button>
          </form>
        </div>

        <div className='card-footer bg-light border-0 text-center py-3'>
          <small className='text-muted'>
            Acesso restrito a operadores e administradores
          </small>
        </div>
      </div>
    </div>
  );
}

export default Login;