import React, { useState } from 'react';
import { Route, Routes, BrowserRouter, Navigate } from 'react-router-dom';

import Navbar from './components/navbar.js';

import Login from './views/login.js';
import Dashboard from './views/dashboard.js';
import Relatorios from './views/relatorios.js';

import ListagemTickets from './views/listagem-tickets.js';
import CadastroTickets from './views/cadastro-tickets.js';

import ListagemCaixa from './views/listagem-caixa.js';
import CadastroCaixa from './views/cadastro-caixa.js';
import CadastroSangria from './views/cadastro-sangria.js';
import CadastroReforco from './views/cadastro-reforco.js';

import ListagemCategorias from './views/listagem-categorias.js';
import CadastroCategorias from './views/cadastro-categorias.js';

import ListagemPagamentos from './views/listagem-pagamentos.js';
import CadastroPagamentos from './views/cadastro-pagamentos.js';

import ListagemUsuarios from './views/listagem-usuarios.js';
import CadastroUsuarios from './views/cadastro-usuarios.js';

function ehAdmin(usuario) {
  return String(usuario?.perfil || '').trim().toUpperCase() === 'ADMIN';
}

function RotaProtegida({ children, apenasAdmin = false, usuario }) {
  if (!usuario) {
    return <Navigate to='/login' replace />;
  }
  if (apenasAdmin && !ehAdmin(usuario)) {
    return <Navigate to='/dashboard' replace />;
  }
  return children;
}

function Rotas() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);

  return (
    <BrowserRouter>
      <Navbar
        usuarioLogado={usuarioAtual}
        onLogout={() => setUsuarioAtual(null)}
      />

      <Routes>
        <Route path='/' element={<Navigate to='/login' replace />} />
        <Route
          path='/login'
          element={<Login onLogin={(user) => setUsuarioAtual(user)} />}
        />

        <Route
          path='/dashboard'
          element={
            <RotaProtegida usuario={usuarioAtual}>
              <Dashboard usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />

        <Route
          path='/relatorios'
          element={
            <RotaProtegida apenasAdmin={true} usuario={usuarioAtual}>
              <Relatorios usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />

        {/* Tickets */}
        <Route
          path='/listagem-tickets'
          element={
            <RotaProtegida usuario={usuarioAtual}>
              <ListagemTickets usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-tickets'
          element={
            <RotaProtegida usuario={usuarioAtual}>
              <CadastroTickets usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-tickets/:idParam'
          element={
            <RotaProtegida usuario={usuarioAtual}>
              <CadastroTickets usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />

        {/* Caixa */}
        <Route
          path='/listagem-caixa'
          element={
            <RotaProtegida usuario={usuarioAtual}>
              <ListagemCaixa usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-caixa'
          element={
            <RotaProtegida usuario={usuarioAtual}>
              <CadastroCaixa usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-caixa/:idParam'
          element={
            <RotaProtegida usuario={usuarioAtual}>
              <CadastroCaixa usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-sangria'
          element={
            <RotaProtegida usuario={usuarioAtual}>
              <CadastroSangria usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-reforco'
          element={
            <RotaProtegida usuario={usuarioAtual}>
              <CadastroReforco usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />

        {/* Categorias (exclusivo ADMIN) */}
        <Route
          path='/listagem-categorias'
          element={
            <RotaProtegida apenasAdmin={true} usuario={usuarioAtual}>
              <ListagemCategorias usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-categorias'
          element={
            <RotaProtegida apenasAdmin={true} usuario={usuarioAtual}>
              <CadastroCategorias usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-categorias/:idParam'
          element={
            <RotaProtegida apenasAdmin={true} usuario={usuarioAtual}>
              <CadastroCategorias usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />

        {/* Pagamentos */}
        <Route
          path='/listagem-pagamentos'
          element={
            <RotaProtegida usuario={usuarioAtual}>
              <ListagemPagamentos usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-pagamentos'
          element={
            <RotaProtegida usuario={usuarioAtual}>
              <CadastroPagamentos usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-pagamentos/:idParam'
          element={
            <RotaProtegida usuario={usuarioAtual}>
              <CadastroPagamentos usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />

        {/* Usuários (exclusivo ADMIN) */}
        <Route
          path='/listagem-usuarios'
          element={
            <RotaProtegida apenasAdmin={true} usuario={usuarioAtual}>
              <ListagemUsuarios usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-usuarios'
          element={
            <RotaProtegida apenasAdmin={true} usuario={usuarioAtual}>
              <CadastroUsuarios usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />
        <Route
          path='/cadastro-usuarios/:idParam'
          element={
            <RotaProtegida apenasAdmin={true} usuario={usuarioAtual}>
              <CadastroUsuarios usuarioLogado={usuarioAtual} />
            </RotaProtegida>
          }
        />

        <Route path='*' element={<Navigate to='/login' replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Rotas;