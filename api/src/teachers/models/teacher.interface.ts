export interface ITeacher {
  id?: string;
  name: string;
  email: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITeacherResponse {
  id: string;
  name: string;
  email: string;
  createdAt?: Date;
}
