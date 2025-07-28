// src/app/models/absence.model.ts

export interface Absence {
  _id: string;                 // MongoDB ObjectId
  startDate: string;           // ISO format, e.g., '2024-07-01'
  endDate: string;             // ISO format, e.g., '2024-07-03'
  userPersonalCode: string;    // References User.personalCode
  reason?: string;             // Optional reason for absence
  createdAt?: string;          // ISO format timestamp when record was created
  updatedAt?: string;          // ISO format timestamp when record was last updated
  durationDays?: number;       // Virtual field from backend
}

export interface AbsenceCreateRequest {
  startDate: string;
  endDate: string;
  userPersonalCode: string;
  reason?: string;
}

export interface AbsenceUpdateRequest {
  _id: string;                 // Changed from id to _id
  startDate?: string;
  endDate?: string;
  reason?: string;
}