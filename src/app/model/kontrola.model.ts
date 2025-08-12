// src/app/model/kontrola.model.ts
export interface Kontrola {
  _id: string;
  gameId: string;
  gameDetails: {
    homeTeam: string;
    awayTeam: string;
    date: string;
    time: string;
    venue: string;
    competition: string;
  };
  tezinaUtakmice: string;
  refereeId: string;
  refereeDetails: {
    name: string;
    surname: string;
    role: string;
    position: number;
  };
  // Evaluation grades
  pogreske: string;
  prekrsaji: string;
  tehnikaMehanika: string;
  timskiRad: string;
  kontrolaUtakmice: string;
  // Comments
  kontroliraniSudac: string;
  komentiranesituacije: string;
  komentarUtakmice: string;
  // Metadata
  evaluatedBy: string;
  evaluatedByName: string;
  evaluationDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface KontrolaCreateRequest {
  gameId: string;
  tezinaUtakmice: string;
  refereeEvaluations: {
    refereeId: string;
    pogreske: string;
    prekrsaji: string;
    tehnikaMehanika: string;
    timskiRad: string;
    kontrolaUtakmice: string;
    kontroliraniSudac: string;
    komentiranesituacije: string;
    komentarUtakmice: string;
  }[];
}


export interface KontrolaData {
  gameId: string;
  tezinaUtakmice: string;
  refereeGrades: any[];
  message?: string
}

export interface ViewKontrolaData {
  gameId: string;
  gameInfo: any;
  tezinaUtakmice: string;
  refereeGrade: any;
  createdAt: string;
  createdBy: string;
}

export interface RefereeGrade {
  refereeId: string;
  refereeName: string;
  refereeRole: string;
  refereePosition: number;
    ocjena: string; // Add this new field

  pogreske: string;
  prekrsaji: string;
  tehnikaMehanika: string;
  timskiRad: string;
  kontrolaUtakmice: string;
  kontroliraniSudac: string;
  komentiranesituacije: string;
  komentarUtakmice: string;
    [key: string]: string | number;
}

