import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import NavbarItem from './navbarItem';

function Navbar(props) {
  const location = useLocation();
  const navigate = useNavigate();

  const usuarioLogado = props.usuarioLogado || null;

  if (
    !usuarioLogado ||
    location.pathname === '/' ||
    location.pathname === '/login'
  ) {
    return null;
  }

  const isAdmin =
    String(usuarioLogado.perfil || '').trim().toUpperCase() === 'ADMIN';

  const sair = () => {
    if (typeof props.onLogout === 'function') {
      props.onLogout();
    }
    navigate('/login', { replace: true });
  };

  return (
    <div className='navbar navbar-expand-lg fixed-top navbar-dark bg-primary'>
      <div className='container'>
        <a
          href='/dashboard'
          className='navbar-brand fw-bold fs-5 me-4'
          style={{ letterSpacing: '0.5px' }}
        >
          Estaciona LP2
        </a>
        <button
          className='navbar-toggler'
          type='button'
          data-toggle='collapse'
          data-target='#navbarResponsive'
          aria-controls='navbarResponsive'
          aria-expanded='false'
          aria-label='Toggle navigation'
        >
          <span className='navbar-toggler-icon'></span>
        </button>
        <div className='collapse navbar-collapse' id='navbarResponsive'>
          <ul className='navbar-nav me-auto'>
            <NavbarItem render={true} href='/dashboard' label='Dashboard' />
            <NavbarItem render={true} href='/listagem-tickets' label='Tickets' />
            <NavbarItem render={true} href='/listagem-pagamentos' label='Pagamentos' />
            <NavbarItem render={true} href='/listagem-caixa' label='Caixa' />

            {isAdmin && (
              <>
                <NavbarItem
                  render={true}
                  href='/listagem-categorias'
                  label='Categorias'
                />
                <NavbarItem
                  render={true}
                  href='/listagem-usuarios'
                  label='Usuarios'
                />
                <NavbarItem
                  render={true}
                  href='/relatorios'
                  label='Relatorios'
                />
              </>
            )}
          </ul>

          <div className='d-flex align-items-center text-white'>
            <span className='me-3'>
              Olá, {usuarioLogado.nome} ({usuarioLogado.perfil})
            </span>
            <button onClick={sair} className='btn btn-outline-light btn-sm'>
              Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Navbar;