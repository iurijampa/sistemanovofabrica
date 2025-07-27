import React from 'react';

const Moldura = ({ cor, titulo, children }) => (
  <div
    style={{
      marginBottom: 24,
      border: `2px solid ${cor}`,
      borderRadius: 12,
      background: `${cor}11`,
      padding: 12,
      boxShadow: `0 1px 6px ${cor}22`,
      minWidth: 340,
    }}
  >
    <h2 style={{
      color: cor,
      margin: '0 0 12px 0',
      textAlign: 'center',
      fontWeight: 800,
      fontSize: 18,
      letterSpacing: 1,
      textTransform: 'uppercase',
    }}>
      {titulo}
    </h2>
    {children}
  </div>
);

// Função para mostrar data no formato DD/MM/AAAA corretamente
function formatarDataBR(dataStr) {
  if (!dataStr) return '-';
  const [data] = dataStr.split('T');
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

const TabelaAtividades = ({
  atividades,
  isAdmin,
  usuarioAtual,
  onVisualizar,
  onAbrirEdicao,
  onApagar,
  onRetornar,
  onConcluir,
  isNovo,
  badgeColors,
  getPrazoBadgeClass,
  tituloMoldura,
  corMoldura
}) => {
  const isImpressao = usuarioAtual === 'impressao';
  const isCostura = usuarioAtual === 'costura';

  const TableContent = (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', background: '#fff', borderRadius: 6 }}>
        <thead>
          <tr>
            <th>Foto</th>
            <th>Pedido</th>
            <th>Cliente</th>
            <th>Entrega</th>
            {isImpressao ? (
              <th>Obs/Env.</th>
            ) : (
              <>
                <th>Setor</th>
                {(isAdmin || isCostura || usuarioAtual === 'embalagem' || atividades.some(a => a.setorAtual === 'Finalizado')) && <th>Costureira</th>}
                <th>Enviado Por</th>
                <th>Observação</th>
              </>
            )}
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {atividades.map((a) => {
  const setorParaNovo = isAdmin
    ? a.setorAtual?.toLowerCase()
    : usuarioAtual?.toLowerCase();
  const mostrarNovo = a.setorAtual && isNovo(a.id, setorParaNovo, a.dataEnvio);


            return (
              <tr
                key={a.id}
                style={{
                  background: a.statusRetorno
                    ? '#fff8b0'
                    : a.urgente
                      ? 'red'
                      : undefined,
                  color: a.urgente ? '#fff' : undefined,
                  fontWeight: a.urgente || a.statusRetorno ? 'bold' : undefined,
                  fontSize: a.urgente ? '1.1em' : undefined,
                  letterSpacing: a.urgente ? 2 : undefined,
                  transition: 'background 0.3s',
                }}
              >
                <td>
                  {a.setorAtual !== "Finalizado" ? (
                    a.thumb ? (
                      <img
                        src={a.thumb}
                        alt="Thumb principal"
                        loading="lazy"
                        style={{
                          width: 40,
                          height: 40,
                          objectFit: 'cover',
                          borderRadius: 4,
                          background: '#e0e0e0',
                        }}
                        onError={function handleThumbError(e) {
                          if (e.target.dataset.fallback !== "original") {
                            e.target.src = a.imagem;
                            e.target.dataset.fallback = "original";
                          } else {
                            e.target.src = "https://via.placeholder.com/40x40?text=Erro";
                          }
                        }}
                      />
                    ) : a.imagem ? (
                      <img
                        src={a.imagem}
                        alt="Imagem principal"
                        loading="lazy"
                        style={{
                          width: 40,
                          height: 40,
                          objectFit: 'cover',
                          borderRadius: 4,
                          background: '#e0e0e0',
                        }}
                        onError={function handleThumbError(e) {
                          e.target.src = "https://via.placeholder.com/40x40?text=Erro";
                        }}
                      />
                    ) : (
                      <span>Sem imagem</span>
                    )
                  ) : (
                    <span style={{ color: '#999' }}>-</span>
                  )}
                </td>
                <td>
                  {a.pedido}
                  {mostrarNovo && (
                    <span
                      style={{
                        marginLeft: 6,
                        background: '#22c55e',
                        color: '#fff',
                        borderRadius: 7,
                        padding: '2px 7px',
                        fontWeight: 700,
                        fontSize: '0.8em',
                        animation: 'pulseNovo 1s infinite alternate',
                        boxShadow: '0 0 10px #6ee7b7',
                        verticalAlign: 'middle'
                      }}
                    >
                      NOVO
                    </span>
                  )}
                </td>
                <td>
                  {a.statusRetorno && (
                    <span style={{
                      background: '#e00',
                      color: '#fff',
                      borderRadius: 5,
                      padding: '2px 5px',
                      marginRight: 4,
                      fontSize: '0.9em',
                      letterSpacing: 1,
                    }}>
                      RETORNADO
                    </span>
                  )}
                  {a.urgente && (
                    <span style={{
                      fontSize: '0.95em',
                      marginRight: 8,
                      background: '#fff3',
                      padding: '2px 9px',
                      borderRadius: 6,
                      verticalAlign: 'middle',
                      display: 'inline-block',
                      marginBottom: 3,
                      marginTop: 1,
                      boxShadow: '0 2px 10px #f001',
                      animation: 'pulseUrgente 1s infinite alternate',
                      color: '#fff',
                    }}>
                      🚨 URGENTE
                    </span>
                  )}
                  <span style={{ verticalAlign: 'middle' }}>{a.cliente}</span>
                </td>
                <td>
                  <span className={`badge badge-prazo ${getPrazoBadgeClass(a.dataEntrega)}`}>
                    {formatarDataBR(a.dataEntrega)}
                  </span>
                </td>
                {isImpressao ? (
                  <td>
                    {a.funcionarioEnvio || '-'}
                    {a.dataEnvio && (
                      <div style={{ fontSize: '0.8em', color: '#666' }}>
                        {new Date(a.dataEnvio).toLocaleString()}
                      </div>
                    )}
                    <div>{a.observacaoEnvio || '-'}</div>
                  </td>
                ) : (
                  <>
                    <td>
                      <span className={`badge badge-setor ${badgeColors[a.setorAtual] || ''}`}>
                        {a.setorAtual}
                      </span>
                    </td>

                    {(isAdmin || isCostura || usuarioAtual === 'embalagem' || a.setorAtual === 'Finalizado') && (
  <td>{a.costureira || '-'}</td>
)}

                    <td>
                      {a.funcionarioEnvio || '-'}
                      {a.dataEnvio && (
                        <div style={{ fontSize: '0.8em', color: '#666' }}>
                          {new Date(a.dataEnvio).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td>{a.observacaoEnvio || '-'}</td>
                  </>
                )}
                <td>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr',
                      gap: 4,
                      alignItems: 'center',
                      justifyItems: 'center',
                      minWidth: 56,
                      margin: '0 auto',
                    }}
                  >
                    <button title="Visualizar" onClick={() => onVisualizar(a)}>
                      👁️
                    </button>
                    {isAdmin && (
  <button
  title="Copiar link de rastreio"
  onClick={() => {
    const link = `https://stampblue.netlify.app/?id=${a.id}`;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link)
        .then(() => {
          alert('🔗 Link de rastreamento copiado!');
        })
        .catch(err => {
          alert('Erro ao copiar o link: ' + err);
        });
    } else {
      // Fallback para navegadores sem suporte
      const textarea = document.createElement("textarea");
      textarea.value = link;
      textarea.style.position = "fixed"; // evita scroll ao focar
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
        alert('🔗 Link de rastreamento copiado!');
      } catch (err) {
        alert('Erro ao copiar o link');
      }
      document.body.removeChild(textarea);
    }
  }}
>
  🔗
</button>

)}

                    {isAdmin && (
                      <>
                        <button title="Editar" onClick={() => onAbrirEdicao(a)}>
                          ✏️
                        </button>
                        <button
                          title="Apagar"
                          onClick={() => {
                            if (window.confirm('Quer mesmo apagar este pedido?')) {
                              onApagar(a.id);
                            }
                          }}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                    {typeof onRetornar === "function" && (
                      <button title="Retornar para o setor anterior" onClick={() => onRetornar(a)}>
                        🔙
                      </button>
                    )}
                    {typeof onConcluir === "function" && (
                      <button title="Concluir e enviar para o próximo setor" onClick={() => onConcluir(a)}>
                        ✅
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (isImpressao && tituloMoldura && corMoldura) {
    return (
      <Moldura cor={corMoldura} titulo={tituloMoldura}>
        {TableContent}
      </Moldura>
    );
  }
  return TableContent;
};

export default TabelaAtividades;
