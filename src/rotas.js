import React from 'react';
import { Route, Routes, BrowserRouter, Navigate } from 'react-router-dom';

import Login from './views/login';
import Dashboard from './views/dashboard';
import Relatorios from './views/relatorios';

import ListagemTickets from './views/listagem-tickets';
import CadastroTickets from './views/cadastro-tickets';

import ListagemCaixa from './views/listagem-caixa';
import CadastroCaixa from './views/cadastro-caixa';
import CadastroSangria from './views/cadastro-sangria';
import CadastroReforco from './views/cadastro-reforco';

import ListagemCategorias from './views/listagem-categorias';
import CadastroCategorias from './views/cadastro-categorias';

import ListagemPagamentos from './views/listagem-pagamentos';
import CadastroPagamentos from './views/cadastro-pagamentos';

import ListagemUsuarios from './views/listagem-usuarios';
import CadastroUsuarios from './views/cadastro-usuarios';

function obterUsuarioLogado() {
  try {
    const bruto = localStorage.getItem('usuario_logado');
    if (!bruto) return null;
    const parsed = JSON.parse(bruto);
    return parsed && (parsed.id || parsed.email) ? parsed : null;
  } catch (error) {
    return null;
  }
}

function ehAdmin(usuario) {
  return String(usuario?.perfil || '').toUpperCase() === 'ADMIN';
}

function RotaProtegida({ children, apenasAdmin = false }) {
  const usuario = obterUsuarioLogado();
  if (!usuario) {
    return <Navigate to='/login' replace />;
  }
  if (apenasAdmin && !ehAdmin(usuario)) {
    return <Navigate to='/dashboard' replace />;
  }
  return children;
}

function RotaInicial() {
  const usuario = obterUsuarioLogado();
  if (usuario) {
    return <Navigate to='/dashboard' replace />;
  }
  return <Navigate to='/login' replace />;
}

function Rotas() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<RotaInicial />} />
        <Route path='/login' element={<Login />} />

        <Route
          path='/dashboard'
          element={
            <RotaProtegida>
              <Dashboard />
            </RotaProtegida>
          }
        />

        <Route
          path='/relatorios'
          element={
            <RotaProtegida apenasAdmin={true}>
              <Relatorios />
            </RotaProtegida>
          }
        />

        {/* Tickets */}
        <Route
          path='/listagem-tickets'
          element={
            <RotaProtegida>
              <ListagemTickets />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-tickets'
          element={
            <RotaProtegida>
              <CadastroTickets />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-tickets/:idParam'
          element={
            <RotaProtegida>
              <CadastroTickets />
            </RotaProtegida>
          }
        />

        {/* Caixa */}
        <Route
          path='/listagem-caixa'
          element={
            <RotaProtegida>
              <ListagemCaixa />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-caixa'
          element={
            <RotaProtegida>
              <CadastroCaixa />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-caixa/:idParam'
          element={
            <RotaProtegida>
              <CadastroCaixa />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-sangria'
          element={
            <RotaProtegida>
              <CadastroSangria />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-reforco'
          element={
            <RotaProtegida>
              <CadastroReforco />
            </RotaProtegida>
          }
        />

        {/* Categorias (exclusivo ADMIN) */}
        <Route
          path='/listagem-categorias'
          element={
            <RotaProtegida apenasAdmin={true}>
              <ListagemCategorias />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-categorias'
          element={
            <RotaProtegida apenasAdmin={true}>
              <CadastroCategorias />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-categorias/:idParam'
          element={
            <RotaProtegida apenasAdmin={true}>
              <CadastroCategorias />
            </RotaProtegida>
          }
        />

        {/* Pagamentos */}
        <Route
          path='/listagem-pagamentos'
          element={
            <RotaProtegida>
              <ListagemPagamentos />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-pagamentos'
          element={
            <RotaProtegida>
              <CadastroPagamentos />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-pagamentos/:idParam'
          element={
            <RotaProtegida>
              <CadastroPagamentos />
            </RotaProtegida>
          }
        />

        {/* Usuários (exclusivo ADMIN) */}
        <Route
          path='/listagem-usuarios'
          element={
            <RotaProtegida apenasAdmin={true}>
              <ListagemUsuarios />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-usuarios'
          element={
            <RotaProtegida apenasAdmin={true}>
              <CadastroUsuarios />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-usuarios/:idParam'
          element={
            <RotaProtegida apenasAdmin={true}>
              <CadastroUsuarios />
            </RotaProtegida>
          }
        />

        <Route path='*' element={<RotaInicial />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Rotas;