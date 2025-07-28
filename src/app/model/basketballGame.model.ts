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
  
  // Virtual/computed properties from backend
  formattedDate?: string;
  gameDateTime?: string;
  refereeCount?: {
    Sudac: number;
    Delegat: number;
    'Pomoćni Sudac': number;
  };
  
  // Instance methods (these won't actually exist on frontend objects, so we make them optional)
  areAllRefereesResponded?: () => boolean;
  areAllRefereesAccepted?: () => boolean;
  isUserAssigned?: (userId: string) => boolean;
  getAvailablePositions?: (role: 'Sudac' | 'Delegat' | 'Pomoćni Sudac') => number[];
  getNextAvailablePosition?: (role: 'Sudac' | 'Delegat' | 'Pomoćni Sudac') => number | null;
  getRefereeAssignmentSummary?: () => any;
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
export interface GameFormData {
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  venue: string;
  competition: string;
  notes: string;
  status?: 'Scheduled' | 'Ongoing' | 'Completed' | 'Cancelled';

}

export interface RefereeAssignmentData {
    _id?:string;
  userId: string;
  role: 'Sudac' | 'Delegat' | 'Pomoćni Sudac';
  position?: number;
}

export interface RefereeSelection {
  sudci: { _id?:string;userId: string; position: number }[];
  delegat: string;
  pomocniSudci: { _id?:string;userId: string; position: number }[];
}

export class BasketballGameUtils {
  static areAllRefereesResponded(game: BasketballGame): boolean {
    return game.refereeAssignments.every(assignment => 
      assignment.assignmentStatus !== 'Pending'
    );
  }

  static areAllRefereesAccepted(game: BasketballGame): boolean {
    return game.refereeAssignments.every(assignment => 
      assignment.assignmentStatus === 'Accepted'
    );
  }

  static isUserAssigned(game: BasketballGame, userId: string): boolean {
    return game.refereeAssignments.some(assignment => 
      assignment.userId._id === userId
    );
  }

  static getAvailablePositions(game: BasketballGame, role: 'Sudac' | 'Delegat' | 'Pomoćni Sudac'): number[] {
    const maxPositions = {
      'Sudac': 3,
      'Delegat': 1,
      'Pomoćni Sudac': 3
    };
    
    const occupiedPositions = game.refereeAssignments
      .filter(assignment => assignment.role === role)
      .map(assignment => assignment.position);
    
    const availablePositions = [];
    for (let i = 1; i <= maxPositions[role]; i++) {
      if (!occupiedPositions.includes(i)) {
        availablePositions.push(i);
      }
    }
    
    return availablePositions;
  }

  static getNextAvailablePosition(game: BasketballGame, role: 'Sudac' | 'Delegat' | 'Pomoćni Sudac'): number | null {
    const availablePositions = this.getAvailablePositions(game, role);
    return availablePositions.length > 0 ? Math.min(...availablePositions) : null;
  }

  static getRefereeAssignmentSummary(game: BasketballGame) {
    const summary = {
      Sudac: { assigned: 0, accepted: 0, positions: [] as number[] },
      Delegat: { assigned: 0, accepted: 0, positions: [] as number[] },
      'Pomoćni Sudac': { assigned: 0, accepted: 0, positions: [] as number[] }
    };
    
    game.refereeAssignments.forEach(assignment => {
      summary[assignment.role].assigned++;
      summary[assignment.role].positions.push(assignment.position);
      if (assignment.assignmentStatus === 'Accepted') {
        summary[assignment.role].accepted++;
      }
    });
    
    return summary;
  }
}