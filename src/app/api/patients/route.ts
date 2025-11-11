import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Buscar todos os pacientes
export async function GET(request: Request) {
  try {
    const { data, error } = await supabase
      .from('pacientes')
      .select(`
        id,
        nome,
        ultima_consulta,
        ativo,
        enderecos (
          id,
          numero,
          complemento,
          latitude,
          longitude,
          ruas (
            nome
          )
        )
      `)
      .eq('ativo', true)
      .order('nome');

    if (error) throw error;

    // Formatar dados para o formato esperado pelo frontend
   // Formatar dados para o formato esperado pelo frontend
const formattedData = data?.map(p => {
  const endereco = p.enderecos as any;
  const rua = endereco?.ruas as any;
  
  return {
    id: p.id,
    nomes: p.nome,
    endereços: rua?.nome || '',
    número: endereco?.numero || '',
    complemento: endereco?.complemento || '',
    ultima_consulta: p.ultima_consulta ? 
      new Date(p.ultima_consulta).toLocaleDateString('pt-BR') : '',
    lat: endereco?.latitude || 0,
    lng: endereco?.longitude || 0
  };
});

    return NextResponse.json({
      success: true,
      data: formattedData
    });
    
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar pacientes' },
      { status: 500 }
    );
  }
}

// POST - Adicionar novo paciente
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nomes, endereços, número, complemento, ultima_consulta } = body;
    
    if (!nomes || !endereços || !número || !ultima_consulta) {
      return NextResponse.json(
        { success: false, message: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }
    
    console.log('[API] 📥 Dados recebidos:', { nomes, endereços, número, complemento, ultima_consulta });
    
    // Normalizar nome da rua
    const ruaNormalizada = endereços
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('[API] 🔍 Rua normalizada:', ruaNormalizada);
    
    // Buscar ID da rua
    const { data: ruaData, error: ruaError } = await supabase
      .from('ruas')
      .select('id')
      .or(`nome_normalizado.eq.${ruaNormalizada},nome.eq.${endereços}`)
      .limit(1)
      .single();
    
    if (ruaError || !ruaData) {
      console.log('[API] ❌ Rua não encontrada:', endereços);
      return NextResponse.json(
        { success: false, message: 'Rua não encontrada no cadastro' },
        { status: 400 }
      );
    }
    
    const ruaId = ruaData.id;
    console.log('[API] ✅ Rua encontrada com ID:', ruaId);
    
    // Verificar se endereço existe
    const { data: enderecoData, error: enderecoError } = await supabase
      .from('enderecos')
      .select('id, latitude, longitude')
      .eq('rua_id', ruaId)
      .eq('numero', número)
      .limit(1)
      .single();
    
    let enderecoId: number;
    
    if (enderecoData && !enderecoError) {
      // Endereço já existe
      enderecoId = enderecoData.id;
      console.log(`[API] ✅ Endereço existente: ${endereços}, ${número} (ID: ${enderecoId})`);
    } else {
      // Endereço novo - BUSCAR COORDENADAS
      console.log(`[API] 🆕 Endereço novo! Buscando coordenadas via Geocoding...`);
      
      const { geocodeAddressGeoapify, isValidCoordinate, decimalToDMS } = await import('@/lib/geocoding-geoapify');
      
      const geocodingResult = await geocodeAddressGeoapify(endereços, número);
      
      if (!geocodingResult || !isValidCoordinate(geocodingResult.latitude, geocodingResult.longitude)) {
        console.error(`[API] ❌ Não foi possível encontrar coordenadas para: ${endereços}, ${número}`);
        
        return NextResponse.json(
          { 
            success: false, 
            message: `Não foi possível encontrar as coordenadas do endereço "${endereços}, ${número}". Verifique se o endereço está correto ou escolha um endereço já cadastrado.`
          },
          { status: 400 }
        );
      }
      
      const latitude = geocodingResult.latitude;
      const longitude = geocodingResult.longitude;
      const coordenadasDMS = decimalToDMS(latitude, longitude);
      
      console.log(`[API] 📍 Coordenadas precisas obtidas: ${latitude}, ${longitude}`);
      console.log(`[API] 📍 Formato DMS: ${coordenadasDMS}`);
      
      // Inserir novo endereço
      const { data: novoEndereco, error: insertEnderecoError } = await supabase
        .from('enderecos')
        .insert({
          rua_id: ruaId,
          numero: número,
          complemento: complemento || null,
          latitude: latitude,
          longitude: longitude,
          coordenadas_dms: coordenadasDMS
        })
        .select('id')
        .single();
      
      if (insertEnderecoError || !novoEndereco) {
        console.error('[API] ❌ Erro ao inserir endereço:', insertEnderecoError);
        throw insertEnderecoError;
      }
      
      enderecoId = novoEndereco.id;
      console.log(`[API] ✅ Endereço criado com ID: ${enderecoId}`);
    }
    
    // Converter data (de dd/mm/yyyy para yyyy-mm-dd)
    const [day, month, year] = ultima_consulta.split('/');
    const dataFormatada = `${year}-${month}-${day}`;
    
    console.log('[API] 📅 Data formatada:', dataFormatada);
    
    // Inserir paciente
    const { data: novoPaciente, error: insertPacienteError } = await supabase
      .from('pacientes')
      .insert({
        nome: nomes,
        endereco_id: enderecoId,
        ultima_consulta: dataFormatada
      })
      .select('id')
      .single();
    
    if (insertPacienteError || !novoPaciente) {
      console.error('[API] ❌ Erro ao inserir paciente:', insertPacienteError);
      throw insertPacienteError;
    }
    
    console.log(`[API] ✅ Paciente criado com ID: ${novoPaciente.id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Paciente cadastrado com sucesso',
      id: novoPaciente.id
    });
    
  } catch (error) {
    console.error('[API] ❌ ERRO CRÍTICO:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao adicionar paciente' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar paciente
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, nomes, endereços, número, complemento, ultima_consulta } = body;
    
    if (!id || !nomes || !endereços || !número || !ultima_consulta) {
      return NextResponse.json(
        { success: false, message: 'Campos obrigatórios não preenchidos' },
        { status: 400 }
      );
    }
    
    // Normalizar nome da rua
    const ruaNormalizada = endereços
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Buscar ID da rua
    const { data: ruaData, error: ruaError } = await supabase
      .from('ruas')
      .select('id')
      .or(`nome_normalizado.eq.${ruaNormalizada},nome.eq.${endereços}`)
      .limit(1)
      .single();
    
    if (ruaError || !ruaData) {
      return NextResponse.json(
        { success: false, message: 'Rua não encontrada' },
        { status: 400 }
      );
    }
    
    const ruaId = ruaData.id;
    
    // Verificar se endereço existe
    const { data: enderecoData, error: enderecoError } = await supabase
      .from('enderecos')
      .select('id')
      .eq('rua_id', ruaId)
      .eq('numero', número)
      .limit(1)
      .single();
    
    let enderecoId: number;
    
    if (enderecoData && !enderecoError) {
      enderecoId = enderecoData.id;
      console.log(`[API PUT] ✅ Endereço existente: ${endereços}, ${número}`);
    } else {
      console.log(`[API PUT] 🆕 Endereço novo! Buscando coordenadas via Geocoding...`);
      
      const { geocodeAddressGeoapify, isValidCoordinate, decimalToDMS } = await import('@/lib/geocoding-geoapify');
      
      const geocodingResult = await geocodeAddressGeoapify(endereços, número);
      
      if (!geocodingResult || !isValidCoordinate(geocodingResult.latitude, geocodingResult.longitude)) {
        console.error(`[API PUT] ❌ Não foi possível encontrar coordenadas para: ${endereços}, ${número}`);
        
        return NextResponse.json(
          { 
            success: false, 
            message: `Não foi possível encontrar as coordenadas do endereço "${endereços}, ${número}". Verifique se o endereço está correto ou escolha um endereço já cadastrado.`
          },
          { status: 400 }
        );
      }
      
      const latitude = geocodingResult.latitude;
      const longitude = geocodingResult.longitude;
      const coordenadasDMS = decimalToDMS(latitude, longitude);
      
      console.log(`[API PUT] 📍 Coordenadas precisas obtidas: ${latitude}, ${longitude}`);
      
      // Inserir novo endereço
      const { data: novoEndereco, error: insertEnderecoError } = await supabase
        .from('enderecos')
        .insert({
          rua_id: ruaId,
          numero: número,
          complemento: complemento || null,
          latitude: latitude,
          longitude: longitude,
          coordenadas_dms: coordenadasDMS
        })
        .select('id')
        .single();
      
      if (insertEnderecoError || !novoEndereco) {
        throw insertEnderecoError;
      }
      
      enderecoId = novoEndereco.id;
      console.log(`[API PUT] ✅ Endereço criado com ID: ${enderecoId}`);
    }
    
    // Converter data
    const [day, month, year] = ultima_consulta.split('/');
    const dataFormatada = `${year}-${month}-${day}`;
    
    // Atualizar paciente
    const { error: updateError } = await supabase
      .from('pacientes')
      .update({
        nome: nomes,
        endereco_id: enderecoId,
        ultima_consulta: dataFormatada
      })
      .eq('id', id);
    
    if (updateError) {
      throw updateError;
    }
    
    console.log(`[API PUT] ✅ Paciente ${id} atualizado com sucesso`);
    
    return NextResponse.json({
      success: true,
      message: 'Paciente atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('[API PUT] ❌ Erro:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao atualizar paciente' },
      { status: 500 }
    );
  }
}

// DELETE - Remover paciente
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID do paciente é obrigatório' },
        { status: 400 }
      );
    }
    
    // Atualizar paciente para inativo
    const { error } = await supabase
      .from('pacientes')
      .update({ ativo: false })
      .eq('id', id);
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      message: 'Paciente removido com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao remover paciente:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao remover paciente' },
      { status: 500 }
    );
  }
}