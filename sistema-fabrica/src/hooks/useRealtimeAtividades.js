import { useEffect } from 'react';
import { supabase } from '../supabaseClient';

const useRealtimeAtividades = (onNovaAtividade) => {
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
          const novaAtividade = payload.new;

          // Só processa se for um INSERT ou UPDATE onde setorAtual mudou
          if (payload.eventType === 'INSERT') {
            onNovaAtividade(novaAtividade);
          }

          if (payload.eventType === 'UPDATE') {
            const setorAntes = payload.old?.setorAtual;
            const setorDepois = payload.new?.setorAtual;

            // Só notifica se o setorAtual mudou
            if (setorAntes !== setorDepois) {
              onNovaAtividade(novaAtividade);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [onNovaAtividade]);
};

export default useRealtimeAtividades;
