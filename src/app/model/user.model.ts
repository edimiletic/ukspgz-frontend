// src/app/models/user.model.ts

export type UserRole = 'Admin' | 'Sudac' | 'Delegat' | 'Pomoćni Sudac';

export interface User {
  _id: string;
  id?: string;
  username: string;
  name: string;
  surname: string;
  email: string;
  password?: string;
  birthdate: string;
  personalCode: string;
  address: string;
  role: UserRole;
}