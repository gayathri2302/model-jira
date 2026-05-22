import { getPool, sql } from '@/config/db.config';
import type { UserDto } from '../../../shared/types/api.types';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  avatar_url: string | null;
  created_at: Date;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('email', sql.NVarChar, email)
    .query<UserRow>('SELECT * FROM users WHERE email = @email AND deleted_at IS NULL');
  return res.recordset[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query<UserRow>('SELECT * FROM users WHERE id = @id AND deleted_at IS NULL');
  return res.recordset[0] ?? null;
}

export async function createUser(
  name: string,
  email: string,
  passwordHash: string,
  role = 'member',
): Promise<UserDto> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input('name', sql.NVarChar, name)
    .input('email', sql.NVarChar, email)
    .input('hash', sql.NVarChar, passwordHash)
    .input('role', sql.NVarChar, role)
    .query<UserDto>(`
      INSERT INTO users (name, email, password_hash, role)
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role,
             INSERTED.avatar_url, INSERTED.created_at
      VALUES (@name, @email, @hash, @role)
    `);
  return res.recordset[0];
}

export async function listUsers(): Promise<UserDto[]> {
  const pool = await getPool();
  const res = await pool
    .request()
    .query<UserDto>(`
      SELECT id, name, email, role, avatar_url, created_at
      FROM users WHERE deleted_at IS NULL ORDER BY name
    `);
  return res.recordset;
}

export async function updateUserAvatar(id: string, avatarUrl: string): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .input('url', sql.NVarChar, avatarUrl)
    .query('UPDATE users SET avatar_url = @url, updated_at = GETUTCDATE() WHERE id = @id');
}
