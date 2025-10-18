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

export async function GET() {
  let connection;
  
  try {
    connection = await getConnection();
    
    const [rows] = await connection.execute(`
      SELECT id, nome, tipo_logradouro
      FROM ruas
      ORDER BY nome
    `);
    
    return NextResponse.json({
      success: true,
      data: rows
    });
    
  } catch (error) {
    console.error('Erro ao buscar ruas:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar ruas' },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.end();
  }
}