// src/app/models/exam.model.ts
export interface ExamQuestion {
  _id?: string;
  questionText: string;
  correctAnswer?: boolean; // Only visible to admin
  category?: string; // Add category property
  index?: number;
}

export interface QuestionBank {
  _id: string;
  questionText: string;
  correctAnswer: boolean;
  category: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Exam {
  _id: string;
  userId: string;
  title: string;
  questions: ExamQuestion[];
  passingScore: number;
  isCompleted: boolean;
  expiresAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExamAnswer {
  questionIndex: number;
  answer: boolean | null;
}

export interface ExamAttempt {
  _id: string;
  userId: string;
  examId: string | Exam;
  answers: ExamAnswer[];
  score: number;
  passed: boolean;
  completedAt: string;
  timeSpent: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExamSubmission {
  examId: string;
  answers: ExamAnswer[];
  timeSpent: number;
}

export interface ExamStats {
  totalQuestions: number;
  activeQuestions: number;
  totalAttempts: number;
  passedAttempts: number;
  passRate: string;
}

export interface AttemptReview {
  attempt: {
    _id: string;
    score: number;
    passed: boolean;
    completedAt: string;
    timeSpent: number;
    answers: Array<{ questionIndex: number; answer: boolean | null }>;
  };
  exam: {
    _id: string;
    title: string;
    questions: Array<{ questionText: string; correctAnswer: boolean }>;
  } | null;
  user: {
    name: string;
  };
}

export interface ReviewQuestion {
  questionText: string;
  correctAnswer: boolean;
  userAnswer: boolean | null;
  isCorrect: boolean;
  questionIndex: number;
}