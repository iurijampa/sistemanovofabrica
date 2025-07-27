import { useEffect } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook para escutar atividades em tempo real, filtrando por setor para INSERT/UPDATE,
 * mas recebendo todos os DELETE para sumir em tempo real.
 */
const useRealtimeAtividades = (onNovaAtividade, onAtividadeRemovida, setorFiltro) => {
  useEffect(() => {
    // Canal para INSERT/UPDATE filtrado por setor
    const canalSetor = supabase
      .channel('atividades-setor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'atividades',
          filter: setorFiltro ? `setorAtual=eq.${setorFiltro}` : undefined,
        },
        (payload) => {
          const { eventType, new: novaAtividade, old: atividadeAntiga } = payload;
          if (eventType === 'INSERT') onNovaAtividade(novaAtividade);
          if (eventType === 'UPDATE') {
            const setorAntes = atividadeAntiga?.setorAtual;
            const setorDepois = novaAtividade?.setorAtual;
            const retornoAntes = atividadeAntiga?.statusRetorno;
            const retornoDepois = novaAtividade?.statusRetorno;
            if (
              setorAntes !== setorDepois ||
              (setorAntes === setorDepois && retornoAntes !== true && retornoDepois === true)
            ) {
              onNovaAtividade(novaAtividade);
            }
          }
        }
      )
      .subscribe();

    // Canal para DELETE sem filtro (todos recebem)
    const canalDelete = supabase
      .channel('atividades-delete')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'atividades',
        },
        (payload) => {
          const { old: atividadeAntiga } = payload;
          if (onAtividadeRemovida) {
            onAtividadeRemovida(atividadeAntiga.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalSetor);
      supabase.removeChannel(canalDelete);
    };
  }, [onNovaAtividade, onAtividadeRemovida, setorFiltro]);
};

export default useRealtimeAtividades;