import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

async function getConnection() {
  return await mysql.createConnection(dbConfig);
}

// GET - Buscar todos os pacientes
export async function GET(request: Request) {
  let connection;
  
  try {
    connection = await getConnection();
    
    const [rows] = await connection.execute(`
      SELECT 
        p.id,
        p.nome as nomes,
        r.nome as endereços,
        e.numero as número,
        DATE_FORMAT(p.ultima_consulta, '%d/%m/%Y') as ultima_consulta,
        e.latitude as lat,
        e.longitude as lng
      FROM pacientes p
      INNER JOIN enderecos e ON p.endereco_id = e.id
      INNER JOIN ruas r ON e.rua_id = r.id
      WHERE p.ativo = TRUE
      ORDER BY p.nome
    `);
    
    return NextResponse.json({
      success: true,
      data: rows
    });
    
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar pacientes' },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.end();
  }
}

// POST - Adicionar novo paciente
export async function POST(request: Request) {
  let connection: mysql.Connection | undefined;
  
  try {
    const body = await request.json();
    const { nomes, endereços, número, ultima_consulta } = body;
    
    console.log('[API] 📥 Dados recebidos:', { nomes, endereços, número, ultima_consulta });
    
    if (!nomes || !endereços || !número || !ultima_consulta) {
      return NextResponse.json(
        { success: false, message: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }
    
    connection = await getConnection();
    console.log('[API] ✅ Conexão com banco estabelecida');
    
    // Normalizar nome da rua
    const ruaNormalizada = endereços
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('[API] 🔄 Rua normalizada:', ruaNormalizada);
    
    // Buscar ID da rua
    const [ruaRows]: any = await connection.execute(
      'SELECT id FROM ruas WHERE nome_normalizado = ? OR nome = ?',
      [ruaNormalizada, endereços]
    );
    
    if (!ruaRows || ruaRows.length === 0) {
      console.log('[API] ❌ Rua não encontrada:', endereços);
      return NextResponse.json(
        { success: false, message: 'Rua não encontrada no cadastro' },
        { status: 400 }
      );
    }
    
    const ruaId: number = ruaRows[0].id;
    console.log('[API] ✅ Rua encontrada com ID:', ruaId);
    
    // Verificar se endereço existe
    const [enderecoRows]: any = await connection.execute(
      'SELECT id, latitude, longitude FROM enderecos WHERE rua_id = ? AND numero = ?',
      [ruaId, número]
    );
    
    let enderecoId: number;
    
    if (enderecoRows && enderecoRows.length > 0) {
      // Endereço já existe
      enderecoId = enderecoRows[0].id;
      console.log(`[API] ♻️ Endereço existente: ${endereços}, ${número} (ID: ${enderecoId})`);
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
      
      const latitude: number = geocodingResult.latitude;
      const longitude: number = geocodingResult.longitude;
      const coordenadasDMS: string = decimalToDMS(latitude, longitude);
      
      console.log(`[API] ✅ Coordenadas precisas obtidas: ${latitude}, ${longitude}`);
      console.log(`[API] 📍 Formato DMS: ${coordenadasDMS}`);
      
      console.log('[API] 💾 Salvando endereço no banco...');
      console.log('[API] 📝 Dados para inserir:', { ruaId, número, latitude, longitude, coordenadasDMS });
      
      const [result]: any = await connection.execute(
        `INSERT INTO enderecos (rua_id, numero, latitude, longitude, coordenadas_dms) 
         VALUES (?, ?, ?, ?, ?)`,
        [ruaId, número, latitude, longitude, coordenadasDMS]
      );
      enderecoId = result.insertId;
      
      console.log(`[API] ✅ Endereço criado com ID: ${enderecoId}`);
    }
    
    // Converter data
    console.log('[API] 📅 Convertendo data:', ultima_consulta);
    const [day, month, year] = ultima_consulta.split('/');
    const dataFormatada = `${year}-${month}-${day}`;
    console.log('[API] 📅 Data formatada:', dataFormatada);
    
    // Inserir paciente
    console.log('[API] 💾 Salvando paciente no banco...');
    console.log('[API] 📝 Dados para inserir:', { nomes, enderecoId, dataFormatada });
    
    const [insertResult]: any = await connection.execute(
      'INSERT INTO pacientes (nome, endereco_id, ultima_consulta) VALUES (?, ?, ?)',
      [nomes, enderecoId, dataFormatada]
    );
    
    console.log(`[API] ✅ Paciente criado com ID: ${insertResult.insertId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Paciente cadastrado com sucesso',
      id: insertResult.insertId
    });
    
  } catch (error) {
    console.error('[API] ❌❌❌ ERRO CRÍTICO:', error);
    console.error('[API] Stack trace:', (error as Error).stack);
    return NextResponse.json(
      { success: false, message: 'Erro ao adicionar paciente' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
      console.log('[API] 🔌 Conexão com banco fechada');
    }
  }
}

// PUT - Atualizar paciente
export async function PUT(request: Request) {
  let connection: mysql.Connection | undefined;
  
  try {
    const body = await request.json();
    const { id, nomes, endereços, número, ultima_consulta } = body;
    
    if (!id || !nomes || !endereços || !número || !ultima_consulta) {
      return NextResponse.json(
        { success: false, message: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }
    
    connection = await getConnection();
    
    const ruaNormalizada = endereços
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const [ruaRows]: any = await connection.execute(
      'SELECT id FROM ruas WHERE nome_normalizado = ? OR nome = ?',
      [ruaNormalizada, endereços]
    );
    
    if (!ruaRows || ruaRows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Rua não encontrada' },
        { status: 400 }
      );
    }
    
    const ruaId: number = ruaRows[0].id;
    
    const [enderecoRows]: any = await connection.execute(
      'SELECT id FROM enderecos WHERE rua_id = ? AND numero = ?',
      [ruaId, número]
    );
    
    let enderecoId: number;
    
    if (enderecoRows && enderecoRows.length > 0) {
      enderecoId = enderecoRows[0].id;
      console.log(`[API PUT] Endereço existente: ${endereços}, ${número}`);
    } else {
      console.log(`[API PUT] Endereço novo! Buscando coordenadas via Geocoding...`);
      
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
      
      const latitude: number = geocodingResult.latitude;
      const longitude: number = geocodingResult.longitude;
      const coordenadasDMS: string = decimalToDMS(latitude, longitude);
      
      console.log(`[API PUT] ✅ Coordenadas precisas obtidas: ${latitude}, ${longitude}`);
      console.log(`[API PUT] 📍 Formato DMS: ${coordenadasDMS}`);
      
      const [result]: any = await connection.execute(
        `INSERT INTO enderecos (rua_id, numero, latitude, longitude, coordenadas_dms) 
         VALUES (?, ?, ?, ?, ?)`,
        [ruaId, número, latitude, longitude, coordenadasDMS]
      );
      enderecoId = result.insertId;
      
      console.log(`[API PUT] ✅ Endereço criado com ID: ${enderecoId}`);
    }
    
    const [day, month, year] = ultima_consulta.split('/');
    const dataFormatada = `${year}-${month}-${day}`;
    
    await connection.execute(
      'UPDATE pacientes SET nome = ?, endereco_id = ?, ultima_consulta = ? WHERE id = ?',
      [nomes, enderecoId, dataFormatada, id]
    );
    
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
  } finally {
    if (connection) await connection.end();
  }
}

// DELETE - Remover paciente
export async function DELETE(request: Request) {
  let connection: mysql.Connection | undefined;
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID do paciente é obrigatório' },
        { status: 400 }
      );
    }
    
    connection = await getConnection();
    
    await connection.execute(
      'UPDATE pacientes SET ativo = FALSE WHERE id = ?',
      [id]
    );
    
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
  } finally {
    if (connection) await connection.end();
  }
}