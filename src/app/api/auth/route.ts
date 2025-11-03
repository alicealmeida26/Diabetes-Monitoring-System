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
    const { usuario, senha } = await request.json();

    if (!usuario || !senha) {
      return NextResponse.json({
        success: false,
        message: 'Usuário e senha são obrigatórios'
      }, { status: 400 });
    }

    const connection = await mysql.createConnection(dbConfig);

    // Buscar usuário no banco
    const [rows]: any = await connection.execute(
      'SELECT id, usuario, senha_hash, nome_completo FROM usuarios WHERE usuario = ?',
      [usuario]
    );

    if (rows.length === 0) {
      await connection.end();
      return NextResponse.json({
        success: false,
        message: 'Usuário ou senha inválidos'
      }, { status: 401 });
    }

    const user = rows[0];

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, user.senha_hash);

    if (!senhaValida) {
      await connection.end();
      return NextResponse.json({
        success: false,
        message: 'Usuário ou senha inválidos'
      }, { status: 401 });
    }

    // Atualizar último acesso
    await connection.execute(
      'UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = ?',
      [user.id]
    );

    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        id: user.id,
        usuario: user.usuario,
        nome_completo: user.nome_completo
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