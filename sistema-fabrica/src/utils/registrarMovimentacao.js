import { supabase } from '../supabaseClient';

export const registrarMovimentacao = async ({
  pedidoId,
  setorOrigem,
  setorDestino,
  tipo,
  funcionarioEnvio = '',
  observacaoEnvio = '',
  costureira = null
}) => {
  console.log('[MOVIMENTACAO] Recebido:', funcionarioEnvio, observacaoEnvio, costureira);
  console.log('📦 Enviando movimentação:', {
    pedido_id: pedidoId,
    setor_origem: setorOrigem,
    setor_destino: setorDestino,
    tipo,
    funcionarioEnvio,
    observacaoEnvio,
    costureira,
  });

  const { error } = await supabase.from('movimentacoes').insert([
    {
      pedido_id: pedidoId,
      setor_origem: setorOrigem,
      setor_destino: setorDestino,
      tipo,
      funcionarioEnvio,    // ✔️ camelCase como está no Supabase
      observacaoEnvio,     // ✔️ camelCase como está no Supabase
      costureira
    }
  ]);

  if (error) {
    console.error('❌ Erro ao registrar movimentação:', error.message, error.details);
  } else {
    console.log('✅ Movimentação registrada com sucesso:', {
      pedidoId,
      setorOrigem,
      setorDestino,
      tipo,
      funcionarioEnvio,
      observacaoEnvio,
      costureira
    });
  }
};
