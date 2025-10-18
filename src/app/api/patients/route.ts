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
  let connection;
  
  try {
    const body = await request.json();
    const { nomes, endereços, número, ultima_consulta } = body;
    
    if (!nomes || !endereços || !número || !ultima_consulta) {
      return NextResponse.json(
        { success: false, message: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }
    
    connection = await getConnection();
    
    // Normalizar nome da rua
    const ruaNormalizada = endereços
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Buscar ID da rua
    const [ruaRows]: any = await connection.execute(
      'SELECT id FROM ruas WHERE nome_normalizado = ? OR nome = ?',
      [ruaNormalizada, endereços]
    );
    
    if (!ruaRows || ruaRows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Rua não encontrada no cadastro' },
        { status: 400 }
      );
    }
    
    const ruaId = ruaRows[0].id;
    
    // Verificar se endereço existe
    const [enderecoRows]: any = await connection.execute(
      'SELECT id FROM enderecos WHERE rua_id = ? AND numero = ?',
      [ruaId, número]
    );
    
    let enderecoId;
    
    if (enderecoRows && enderecoRows.length > 0) {
      enderecoId = enderecoRows[0].id;
    } else {
      // Criar novo endereço com coordenadas aproximadas
      const [result]: any = await connection.execute(
        `INSERT INTO enderecos (rua_id, numero, latitude, longitude) 
         VALUES (?, ?, ?, ?)`,
        [ruaId, número, -30.0116, -51.1246]
      );
      enderecoId = result.insertId;
    }
    
    // Converter data DD/MM/YYYY para YYYY-MM-DD
    const [day, month, year] = ultima_consulta.split('/');
    const dataFormatada = `${year}-${month}-${day}`;
    
    // Inserir paciente
    const [insertResult]: any = await connection.execute(
      'INSERT INTO pacientes (nome, endereco_id, ultima_consulta) VALUES (?, ?, ?)',
      [nomes, enderecoId, dataFormatada]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Paciente cadastrado com sucesso',
      id: insertResult.insertId
    });
    
  } catch (error) {
    console.error('Erro ao adicionar paciente:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao adicionar paciente' },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.end();
  }
}

// PUT - Atualizar paciente
export async function PUT(request: Request) {
  let connection;
  
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
    
    // Buscar rua
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
    
    const ruaId = ruaRows[0].id;
    
    // Buscar ou criar endereço
    const [enderecoRows]: any = await connection.execute(
      'SELECT id FROM enderecos WHERE rua_id = ? AND numero = ?',
      [ruaId, número]
    );
    
    let enderecoId;
    
    if (enderecoRows && enderecoRows.length > 0) {
      enderecoId = enderecoRows[0].id;
    } else {
      const [result]: any = await connection.execute(
        `INSERT INTO enderecos (rua_id, numero, latitude, longitude) 
         VALUES (?, ?, ?, ?)`,
        [ruaId, número, -30.0116, -51.1246]
      );
      enderecoId = result.insertId;
    }
    
    // Converter data
    const [day, month, year] = ultima_consulta.split('/');
    const dataFormatada = `${year}-${month}-${day}`;
    
    // Atualizar paciente
    await connection.execute(
      'UPDATE pacientes SET nome = ?, endereco_id = ?, ultima_consulta = ? WHERE id = ?',
      [nomes, enderecoId, dataFormatada, id]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Paciente atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao atualizar paciente:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao atualizar paciente' },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.end();
  }
}

// DELETE - Remover paciente (soft delete)
export async function DELETE(request: Request) {
  let connection;
  
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
    
    // Soft delete
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