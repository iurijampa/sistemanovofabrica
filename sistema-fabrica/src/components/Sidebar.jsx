import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = ({ setorLogado, onLogout }) => {
  return (
    <div className="sidebar" style={{ width: '200px', padding: '10px', background: '#eee' }}>
      <h3>Setor: {setorLogado}</h3>
      <nav>
        <ul>
          <li>
            <Link to="/">Dashboard</Link>
          </li>
          {setorLogado === 'Admin' && (
            <li>
              <Link to="/cadastro-pedido">Cadastrar Pedido</Link>
            </li>
          )}
        </ul>
      </nav>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
};

export default Sidebar;
