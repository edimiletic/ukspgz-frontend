// src/app/models/absence.model.ts

export interface Absence {
  id: number;
  startDate: string;       // ISO format, e.g., '2024-07-01'
  endDate: string;         // ISO format, e.g., '2024-07-03'
  userPersonalCode: string; // References User.personalCode
  reason?: string;         // Optional reason for absence
  createdAt?: string;      // ISO format timestamp when record was created
  updatedAt?: string;      // ISO format timestamp when record was last updated
}

export interface AbsenceCreateRequest {
  startDate: string;
  endDate: string;
  userPersonalCode: string;
  reason?: string;
}

export interface AbsenceUpdateRequest {
  id: number;
  startDate?: string;
  endDate?: string;
  reason?: string;
}