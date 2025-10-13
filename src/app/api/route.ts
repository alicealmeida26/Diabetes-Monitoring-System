import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Função para criar conexão com o banco
async function getConnection() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL as string);
  return connection;
}

// GET - Listar todos os pacientes
export async function GET() {
  let connection;
  
  try {
    connection = await getConnection();
    
    const [rows] = await connection.execute(
      'SELECT id, nomes, endereços, número, ultima_consulta FROM pacientes ORDER BY id DESC'
    );
    
    return NextResponse.json({
      success: true,
      data: rows
    }, { status: 200 });
    
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar pacientes',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
    
  } finally {
    if (connection) await connection.end();
  }
}

// POST - Adicionar novo paciente
export async function POST(request: NextRequest) {
  let connection;
  
  try {
    const body = await request.json();
    const { nomes, endereços, número, ultima_consulta } = body;
    
    // Validação básica
    if (!nomes || !endereços || !número || !ultima_consulta) {
      return NextResponse.json({
        success: false,
        message: 'Todos os campos são obrigatórios'
      }, { status: 400 });
    }
    
    connection = await getConnection();
    
    const [result] = await connection.execute(
      'INSERT INTO pacientes (nomes, endereços, número, ultima_consulta) VALUES (?, ?, ?, ?)',
      [nomes, endereços, número, ultima_consulta]
    );
    
    const insertResult = result as mysql.ResultSetHeader;
    
    return NextResponse.json({
      success: true,
      message: 'Paciente adicionado com sucesso',
      data: {
        id: insertResult.insertId,
        nomes,
        endereços,
        número,
        ultima_consulta
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Erro ao adicionar paciente:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao adicionar paciente',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
    
  } finally {
    if (connection) await connection.end();
  }
}

// PUT - Atualizar paciente existente
export async function PUT(request: NextRequest) {
  let connection;
  
  try {
    const body = await request.json();
    const { id, nomes, endereços, número, ultima_consulta } = body;
    
    // Validação básica
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID do paciente é obrigatório'
      }, { status: 400 });
    }
    
    if (!nomes || !endereços || !número || !ultima_consulta) {
      return NextResponse.json({
        success: false,
        message: 'Todos os campos são obrigatórios'
      }, { status: 400 });
    }
    
    connection = await getConnection();
    
    const [result] = await connection.execute(
      'UPDATE pacientes SET nomes = ?, endereços = ?, número = ?, ultima_consulta = ? WHERE id = ?',
      [nomes, endereços, número, ultima_consulta, id]
    );
    
    const updateResult = result as mysql.ResultSetHeader;
    
    if (updateResult.affectedRows === 0) {
      return NextResponse.json({
        success: false,
        message: 'Paciente não encontrado'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Paciente atualizado com sucesso',
      data: {
        id,
        nomes,
        endereços,
        número,
        ultima_consulta
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Erro ao atualizar paciente:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao atualizar paciente',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
    
  } finally {
    if (connection) await connection.end();
  }
}

// DELETE - Remover paciente
export async function DELETE(request: NextRequest) {
  let connection;
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID do paciente é obrigatório'
      }, { status: 400 });
    }
    
    connection = await getConnection();
    
    const [result] = await connection.execute(
      'DELETE FROM pacientes WHERE id = ?',
      [id]
    );
    
    const deleteResult = result as mysql.ResultSetHeader;
    
    if (deleteResult.affectedRows === 0) {
      return NextResponse.json({
        success: false,
        message: 'Paciente não encontrado'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Paciente removido com sucesso'
    }, { status: 200 });
    
  } catch (error) {
    console.error('Erro ao remover paciente:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao remover paciente',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
    
  } finally {
    if (connection) await connection.end();
  }
}