export interface IPost {
  id?: string;
  title: string;
  content: string;
  // Nome de quem criou, guardado na criacao, para mostrar no app.
  author: string;
  // ID de quem criou, vindo do token. Toda checagem de posse usa este campo.
  authorId: string;
  createdAt?: Date;
  updatedAt?: Date;
}
