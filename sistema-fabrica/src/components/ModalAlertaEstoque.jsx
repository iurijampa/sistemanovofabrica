import React from 'react';

const ModalAlertaEstoque = ({ baixoEstoque, onClose }) => {
  if (!baixoEstoque || baixoEstoque.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      zIndex: 9999,
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 8px 32px #b71c1c55',
        padding: '34px 32px 24px',
        minWidth: 360,
        border: '2.5px solid #b71c1c',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'none', border: 'none', fontSize: 22,
            color: '#b71c1c', fontWeight: 700, cursor: 'pointer'
          }}
          title="Fechar"
        >×</button>
        <h2 style={{ color: '#b71c1c', margin: 0, marginBottom: 16, fontWeight: 800 }}>
          ⚠️ ALERTA DE ESTOQUE BAIXO
        </h2>
        <div>
          <p style={{ fontWeight: 600, marginBottom: 10 }}>
            Atenção! O estoque das seguintes malhas está abaixo de 600 unidades:
          </p>
          <ul style={{ paddingLeft: 18, color: '#b71c1c', fontWeight: 700 }}>
            {baixoEstoque.map((item) => (
              <li key={item.id} style={{ marginBottom: 5 }}>
                {item.malha.toUpperCase()}: <span style={{ fontWeight: 800 }}>{item.quantidade}</span> unidades
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ModalAlertaEstoque;
