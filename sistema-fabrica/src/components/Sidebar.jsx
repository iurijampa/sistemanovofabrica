import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import { FaHome, FaPlus, FaHistory, FaSignOutAlt } from 'react-icons/fa';

const Sidebar = ({ setorLogado, onLogout }) => {
  const [recolhido, setRecolhido] = useState(false);
  const setorNormalizado = setorLogado?.toLowerCase();

  const sidebarWidth = recolhido ? 60 : 200;
  const buttonOffset = -14; // Fica flutuando sempre do lado direito do sidebar

  return (
    <div
      className="sidebar"
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        maxWidth: sidebarWidth,
        padding: '10px',
        background: '#1565c0',
        minHeight: '100vh',
        color: '#fff',
        boxShadow: '2px 0 8px #0001',
        transition: 'width 0.2s',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Botão recolher/expandir */}
      <button
        onClick={() => setRecolhido(!recolhido)}
        style={{
          position: 'absolute',
          top: 18,
          right: buttonOffset,
          background: '#fff',
          color: '#1565c0',
          border: '1px solid #1976d2',
          borderRadius: '50%',
          width: 28,
          height: 28,
          fontWeight: 'bold',
          fontSize: 18,
          cursor: 'pointer',
          boxShadow: '0 2px 6px #0002',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'right 0.2s, top 0.2s',
        }}
        title={recolhido ? "Expandir" : "Recolher"}
      >
        {recolhido ? '→' : '←'}
      </button>

      {/* LOGO */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: recolhido ? 8 : 18,
        marginTop: 34,
        height: 60,
        transition: 'all 0.2s',
      }}>
        <img
          src={logo}
          alt="Logo Stamp Blue"
          style={{
            maxHeight: recolhido ? 40 : 54,
            maxWidth: recolhido ? '90%' : '80%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 2px 8px #0002)',
            transition: 'all 0.2s',
            display: 'block',
            margin: '0 auto',
          }}
        />
      </div>

      {/* Só mostra o setor quando expandido */}
      {!recolhido && (
        <h3 style={{ color: '#fff', marginTop: 0, marginBottom: 20, fontWeight: 400, textAlign: 'left' }}>
          Setor: {setorLogado}
        </h3>
      )}

      <nav>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li>
            <Link
              to="/"
              style={{
                color: '#fff',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                padding: '8px 0',
                justifyContent: recolhido ? 'center' : 'flex-start',
                gap: recolhido ? 0 : 10,
              }}
            >
              <FaHome size={20} />
              {!recolhido && <span style={{ marginLeft: 10 }}>Dashboard</span>}
            </Link>
          </li>
          {setorNormalizado === 'admin' && (
            <li>
              <Link
                to="/cadastro-pedido"
                style={{
                  color: '#fff',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 0',
                  justifyContent: recolhido ? 'center' : 'flex-start',
                  gap: recolhido ? 0 : 10,
                }}
              >
                <FaPlus size={20} />
                {!recolhido && <span style={{ marginLeft: 10 }}>Cadastrar Pedido</span>}
              </Link>
            </li>
          )}
          <li>
            <Link
              to="/historico"
              style={{
                color: '#fff',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                padding: '8px 0',
                justifyContent: recolhido ? 'center' : 'flex-start',
                gap: recolhido ? 0 : 10,
              }}
            >
              <FaHistory size={20} />
              {!recolhido && <span style={{ marginLeft: 10 }}>Histórico</span>}
            </Link>
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: recolhido ? 'center' : 'flex-start',
          gap: recolhido ? 0 : 10,
        }}
      >
        <FaSignOutAlt size={20} />
        {!recolhido && <span style={{ marginLeft: 10 }}>Logout</span>}
      </button>
    </div>
  );
};

export default Sidebar;
