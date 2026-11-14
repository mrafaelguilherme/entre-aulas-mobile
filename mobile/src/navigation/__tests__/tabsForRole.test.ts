import { tabsForRole } from '../tabsForRole';

describe('tabsForRole', () => {
  it('a visitor sees Posts and Entrar', () => {
    expect(tabsForRole(null)).toEqual(['Posts', 'Entrar']);
  });

  it('a student sees Posts and Conta', () => {
    expect(tabsForRole('student')).toEqual(['Posts', 'Conta']);
  });

  it('a teacher sees the five tabs', () => {
    expect(tabsForRole('teacher')).toEqual([
      'Posts',
      'Gerenciar',
      'Professores',
      'Alunos',
      'Conta',
    ]);
  });

  it('the master sees the same five tabs', () => {
    expect(tabsForRole('master')).toEqual(['Posts', 'Gerenciar', 'Professores', 'Alunos', 'Conta']);
  });
});
