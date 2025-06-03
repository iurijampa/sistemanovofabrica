import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png'; // ajuste o caminho se necessário

const Sidebar = ({ setorLogado, onLogout }) => {
  const setorNormalizado = setorLogado?.toLowerCase();

  return (
    <div
      className="sidebar"
      style={{
        width: '200px',
        padding: '10px',
        background: '#1565c0', // Azul forte, troque para outro tom se preferir
        minHeight: '100vh',
        color: '#fff', // Letras brancas
        boxShadow: '2px 0 8px #0001',
      }}
    >
      {/* LOGO NO TOPO */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 18, marginTop: 4 }}>
        <img
          src={logo}
          alt="Logo Stamp Blue"
          style={{ maxHeight: 54, maxWidth: '80%', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px #0002)' }}
        />
      </div>

      <h3 style={{ color: '#fff', marginTop: 0, marginBottom: 20 }}>Setor: {setorLogado}</h3>
      <nav>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li>
            <Link to="/" style={{ color: '#fff', textDecoration: 'none', display: 'block', padding: '6px 0' }}>Dashboard</Link>
          </li>

          {/* Admin pode cadastrar pedidos */}
          {setorNormalizado === 'admin' && (
            <li>
              <Link to="/cadastro-pedido" style={{ color: '#fff', textDecoration: 'none', display: 'block', padding: '6px 0' }}>Cadastrar Pedido</Link>
            </li>
          )}

          {/* TODOS podem acessar o histórico */}
          <li>
            <Link to="/historico" style={{ color: '#fff', textDecoration: 'none', display: 'block', padding: '6px 0' }}>Histórico</Link>
          </li>
        </ul>
      </nav>
      <button
        onClick={onLogout}
        style={{
          marginTop: 16,
          width: '100%',
          background: '#1976d2',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          padding: '8px 0',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 2px 4px #0002',
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default Sidebar;
