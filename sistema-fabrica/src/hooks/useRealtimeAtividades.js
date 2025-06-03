import { useEffect } from 'react';
import { supabase } from '../supabaseClient';

const useRealtimeAtividades = (onNovaAtividade, onAtividadeRemovida) => {
  useEffect(() => {
    const canal = supabase
      .channel('atividades-channel')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE e DELETE
          schema: 'public',
          table: 'atividades',
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
  }, [onNovaAtividade, onAtividadeRemovida]);
};

export default useRealtimeAtividades;
