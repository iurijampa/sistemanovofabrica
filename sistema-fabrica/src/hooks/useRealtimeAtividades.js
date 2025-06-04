import { useEffect } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook para escutar atividades em tempo real, com filtro por setor.
 * @param {function} onNovaAtividade - callback ao inserir/alterar atividade
 * @param {function} onAtividadeRemovida - callback ao remover atividade
 * @param {string|null} setorFiltro - nome do setor ("Gabarito", "Impressao", etc) ou null para admin (ver tudo)
 */
const useRealtimeAtividades = (onNovaAtividade, onAtividadeRemovida, setorFiltro) => {
  useEffect(() => {
    const canal = supabase
      .channel('atividades-channel')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE e DELETE
          schema: 'public',
          table: 'atividades',
          // Adiciona filtro para o setor, se necessário
          filter: setorFiltro ? `setorAtual=eq.${setorFiltro}` : undefined,
        },
        (payload) => {
          const { eventType, new: novaAtividade, old: atividadeAntiga } = payload;

          if (eventType === 'INSERT') {
            onNovaAtividade(novaAtividade);
          }

          if (eventType === 'UPDATE') {
            const setorAntes = atividadeAntiga?.setorAtual;
            const setorDepois = novaAtividade?.setorAtual;
            // Só notifica se o setorAtual mudou
            if (setorAntes !== setorDepois) {
              onNovaAtividade(novaAtividade);
            }
          }

          if (eventType === 'DELETE') {
            if (onAtividadeRemovida) {
              onAtividadeRemovida(atividadeAntiga.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [onNovaAtividade, onAtividadeRemovida, setorFiltro]);
};

export default useRealtimeAtividades;
