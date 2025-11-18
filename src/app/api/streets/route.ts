import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('ruas')
      .select('id, nome, tipo_logradouro')
      .order('nome');
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('Erro ao buscar ruas:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar ruas' },
      { status: 500 }
    );
  }
}