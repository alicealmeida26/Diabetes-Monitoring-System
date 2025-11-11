import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { usuario, senha } = await request.json();

    if (!usuario || !senha) {
      return NextResponse.json({
        success: false,
        message: 'Usuário e senha são obrigatórios'
      }, { status: 400 });
    }

    // Buscar usuário no banco
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, usuario, senha_hash, nome_completo')
      .eq('usuario', usuario)
      .single();

    if (error || !data) {
      return NextResponse.json({
        success: false,
        message: 'Usuário ou senha inválidos'
      }, { status: 401 });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, data.senha_hash);

    if (!senhaValida) {
      return NextResponse.json({
        success: false,
        message: 'Usuário ou senha inválidos'
      }, { status: 401 });
    }

    // Atualizar último acesso
    await supabase
      .from('usuarios')
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq('id', data.id);

    return NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        id: data.id,
        usuario: data.usuario,
        nome_completo: data.nome_completo
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao realizar login'
    }, { status: 500 });
  }
}