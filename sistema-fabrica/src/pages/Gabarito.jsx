import React, { useState } from 'react';

export default function Gabarito() {
  // Dados iniciais fixos (você vai poder trocar depois por dados reais)
  const atividadesIniciais = [
    { id: 1, descricao: 'Atividade 1 - Cortar tecido', status: 'Pendente' },
    { id: 2, descricao: 'Atividade 2 - Preparar molde', status: 'Pendente' },
    { id: 3, descricao: 'Atividade 3 - Conferir medidas', status: 'Pendente' }
  ];

  const [atividades, setAtividades] = useState(atividadesIniciais);

  // Função para "enviar" a atividade para o próximo setor
  function enviarAtividade(id) {
    setAtividades((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'Enviada para Impressão' } : item
      )
    );
  }

  return (
    <div>
      <h1>Setor Gabarito</h1>
      <p>Gerencie as atividades do setor Gabarito aqui.</p>

      <ul>
        {atividades.map((atividade) => (
          <li key={atividade.id} style={{ marginBottom: '10px' }}>
            <b>{atividade.descricao}</b> - <i>{atividade.status}</i>{' '}
            {atividade.status === 'Pendente' && (
              <button onClick={() => enviarAtividade(atividade.id)}>Enviar</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}