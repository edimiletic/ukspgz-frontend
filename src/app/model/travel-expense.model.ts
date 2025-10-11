// src/app/models/expense.model.ts
export interface TravelExpense {
  id: string;                 // Changed from number to string for MongoDB ObjectId
  type: string;
  season: string;
  year: number;
  month: string;
  state: string;
  userId?: string;    
  userName?: string;     // Reference to User
  userSurname?: string;   // Derived from User.surname
  totalAmount?: number;   // Total amount of all expenses
  createdAt?: string;     // ISO date string
  updatedAt?: string;     // ISO date string
  submittedAt?: string;   // ISO date string
  reviewedAt?: string;    // ISO date string
  reviewedBy?: string;    // User ID who reviewed
  reviewComments?: string; // Comments from reviewer
  expenses?: ExpenseItem[]; // Array of individual expense items
}



export interface ExpenseItem {
  _id: string;
  type: string;           // Vrsta troškova
  date: string;          // Datum
  description: string;   // Kratki Opis
  unit: string;          // Mjerna Jedinica
  quantity: number;      // Količina
  unitPrice: number;     // Cijena Jedinice
  competition: string; //natjecanje
  amount: number;   
}

export interface NewTravelExpense {
  userId: string;
  type: string;
  season: string;
  year: number;
  month: string;
}
// Interface for filtering travel expenses
export interface TravelExpenseFilters {
  id?: number;
  type?: string;
  userName?: string;
  year?: number;
  month?: string;
  state?: string;
}