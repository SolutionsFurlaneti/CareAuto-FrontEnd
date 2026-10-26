import { describe, expect, it } from 'vitest';
import { changePasswordSchema, setupSchema } from '../../src/features/auth/authSchema';

const registration = {
  estacionamento: 'Estacionamento de teste',
  tipoPessoa: 'PJ',
  documento: '12345678000199',
  nome: 'Dono',
  email: 'dono@example.test',
  senha: 'Dono12',
  confirmarSenha: 'Dono12',
};

describe('public registration and password length', () => {
  it('accepts registration without a key and a six-character password', () => {
    expect(setupSchema.safeParse(registration).success).toBe(true);
    expect(changePasswordSchema.safeParse({
      senhaAtual: 'Dono12', novaSenha: 'Nova12', confirmarSenha: 'Nova12',
    }).success).toBe(true);
  });

  it.each([5, 129])('rejects passwords with %i characters', (length) => {
    const senha = 'a'.repeat(length);
    expect(setupSchema.safeParse({ ...registration, senha, confirmarSenha: senha }).success).toBe(false);
    expect(changePasswordSchema.safeParse({
      senhaAtual: 'Dono12', novaSenha: senha, confirmarSenha: senha,
    }).success).toBe(false);
  });

  it('still requires matching passwords', () => {
    expect(setupSchema.safeParse({ ...registration, confirmarSenha: 'Outra1' }).success).toBe(false);
  });
});
