import { UserRole } from '../types';
import { TabName } from './types';

// Quais abas cada perfil ve. Uma aba que nao esta aqui nem e registrada.
export function tabsForRole(role: UserRole | null): TabName[] {
  if (role === null) {
    return ['Posts', 'Entrar'];
  }
  if (role === 'student') {
    return ['Posts', 'Conta'];
  }
  return ['Posts', 'Gerenciar', 'Professores', 'Alunos', 'Conta'];
}
