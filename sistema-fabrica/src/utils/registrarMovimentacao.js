import { supabase } from '../supabaseClient';

export const registrarMovimentacao = async ({
  pedidoId,
  setorOrigem,
  setorDestino,
  tipo,
  funcionarioEnvio = '',
  observacaoEnvio = '',
}) => {
  console.log('[MOVIMENTACAO] Recebido:', funcionarioEnvio, observacaoEnvio);
  console.log('📦 Enviando movimentação:', {
    pedido_id: pedidoId,
    setor_origem: setorOrigem,
    setor_destino: setorDestino,
    tipo,
    funcionarioEnvio,
    observacaoEnvio,
  });
console.log('Gravando no banco:', {
  funcionarioEnvio,
  observacaoEnvio,
});

  const { error } = await supabase.from('movimentacoes').insert([
    {
      pedido_id: pedidoId,
      setor_origem: setorOrigem,
      setor_destino: setorDestino,
      tipo,
      funcionarioEnvio,
      observacaoEnvio,
    },
  ]);

  if (error) {
    console.error('❌ Erro ao registrar movimentação:', error.message, error.details);
  } else {
    console.log('✅ Movimentação registrada:', { funcionarioEnvio, tipo, pedidoId });
  }
};
