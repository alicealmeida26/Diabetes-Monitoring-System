/**
 * API para criação de novos usuários no sistema
 * Endpoint: POST /api/usuarios
 * 
 * Recebe: { usuario, senha, nome_completo }
 * Retorna: Confirmação de criação do usuário
 * 
 * A senha é automaticamente hasheada usando bcrypt antes de ser salva no banco.
 * Garante que não existam usuários duplicados (constraint UNIQUE).
 */
import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

export async function POST(request: Request) {
  try {
    const { usuario, senha, nome_completo } = await request.json();

    if (!usuario || !senha) {
      return NextResponse.json({
        success: false,
        message: 'Usuário e senha são obrigatórios'
      }, { status: 400 });
    }

    // Criar hash da senha (10 rounds de salt)
    const senhaHash = await bcrypt.hash(senha, 10);

    const connection = await mysql.createConnection(dbConfig);

    // Inserir usuário no banco
    const [result] = await connection.execute(
      'INSERT INTO usuarios (usuario, senha_hash, nome_completo) VALUES (?, ?, ?)',
      [usuario, senhaHash, nome_completo || null]
    );

    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'Usuário criado com sucesso',
      data: { usuario }
    });

  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({
        success: false,
        message: 'Este usuário já existe'
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      message: 'Erro ao criar usuário'
    }, { status: 500 });
  }
}