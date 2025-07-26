import { supabase } from '../supabaseClient';

export const registrarMovimentacao = async ({
  pedidoId,
  setorOrigem,
  setorDestino,
  tipo,
  funcionarioEnvio = '',
  observacaoEnvio = '',
  costureira = null,
  funcionariobatida = null,
  maquinabatida = null
}) => {
  console.log('[MOVIMENTACAO] Recebido:', funcionarioEnvio, observacaoEnvio, costureira, funcionariobatida, maquinabatida);
  console.log('📦 Enviando movimentação:', {
    pedido_id: pedidoId,
    setor_origem: setorOrigem,
    setor_destino: setorDestino,
    tipo,
    funcionarioEnvio,
    observacaoEnvio,
    costureira,
    funcionariobatida,
    maquinabatida,
  });

  const { error } = await supabase.from('movimentacoes').insert([
    {
      pedido_id: pedidoId,
      setor_origem: setorOrigem,
      setor_destino: setorDestino,
      tipo,
      funcionarioEnvio,
      observacaoEnvio,
      costureira,
      funcionariobatida,
      maquinabatida
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
      costureira,
      funcionariobatida,
      maquinabatida
    });
  }
};
