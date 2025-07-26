
export interface BasketballGame {
  _id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  venue: string;
  competition: string;
  status: 'Scheduled' | 'Ongoing' | 'Completed' | 'Cancelled';
  refereeAssignments: RefereeAssignment[];
  notes?: string;
  score?: {
    homeScore: number;
    awayScore: number;
  };
  createdBy?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface RefereeAssignment {
  _id: string;
  userId: {
    _id: string;
    name: string;
    surname: string;
    role: string;
  };
  role: 'Sudac' | 'Delegat' | 'Pomoćni Sudac';
  position: number;
  assignmentStatus: 'Pending' | 'Accepted' | 'Rejected';
  assignedAt: string;
  respondedAt?: string;
  rejectionReason?: string;
}

export interface CreateGameRequest {
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  venue: string;
  competition: string;
  notes?: string;
}

export interface AssignRefereeRequest {
  userId: string;
  role: 'Sudac' | 'Delegat' | 'Pomoćni Sudac';
  position?: number;
}

export interface RespondAssignmentRequest {
  response: 'Accepted' | 'Rejected';
  rejectionReason?: string;
}

export interface GameFilters {
  date?: string;
  competition?: string;
  status?: string;
  homeTeam?: string;
  awayTeam?: string;
  page?: number;
  limit?: number;
}

export interface RefereeInfo {
  name: string;
  position: number;
  status: 'Pending' | 'Accepted';
  statusText: string;
  isCurrentUser: boolean;
}

export interface RefereeGroups {
  'Sudac': RefereeInfo[];
  'Delegat': RefereeInfo[];
  'Pomoćni Sudac': RefereeInfo[];
}