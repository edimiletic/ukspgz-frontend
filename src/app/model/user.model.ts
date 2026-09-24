// src/app/models/user.model.ts

import { RoleAssignment, UserRole } from './roles';

export type { UserRole, RoleAssignment };

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
  roles?: RoleAssignment[];
  rang?: string;
  najvisaLiga?: string;
}