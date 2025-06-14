// src/app/models/user.model.ts

export interface User {
  username: string;
  name: string;
  surname: string;
  email: string;
  password: string;
  birthdate: string;       // ISO format, e.g., '1990-01-01'
  personalCode: string;    // e.g., national ID number
  address: string;
}
