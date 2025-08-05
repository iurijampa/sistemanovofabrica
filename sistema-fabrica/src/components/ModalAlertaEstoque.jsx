import React from 'react';

// Recebe também o objeto de limites para personalizar a mensagem
const ModalAlertaEstoque = ({ baixoEstoque, onClose, limites }) => {
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
            Atenção! O estoque das seguintes malhas está abaixo do limite configurado:
          </p>
          <ul style={{ paddingLeft: 18, color: '#b71c1c', fontWeight: 700 }}>
  {baixoEstoque.map((item) => {
    // Para malha: item.malha, para papel: item.papeis?.nome + ' ' + item.papeis?.gramatura
    const nome = item.malha
      ? item.malha?.toUpperCase()
      : ((item.papeis?.nome || '') + ' ' + (item.papeis?.gramatura || '')).trim().toUpperCase();
    // Para papel, limite vem de item.limite_alerta; para malha pode ser item.limite_alerta ou item.limite
    const limite = item.limite_alerta ?? item.limite ?? '-';
    const qtd = item.quantidade ?? item.quantidade_atual;
    return (
      <li key={item.id} style={{ marginBottom: 5 }}>
        {nome}: <span style={{ fontWeight: 800 }}>{qtd}</span> unidades
        <span style={{ color: "#555", fontWeight: 400, fontSize: 13, marginLeft: 6 }}>
          (limite: {limite})
        </span>
      </li>
    );
  })}
</ul>
        </div>
      </div>
    </div>
  );
};

export default ModalAlertaEstoque;
