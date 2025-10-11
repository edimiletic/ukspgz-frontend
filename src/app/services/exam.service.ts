// src/app/services/exam.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Exam, ExamAttempt, ExamSubmission, QuestionBank, ExamStats  } from '../model/exam.model';
import { environment } from '../../enviroments/enviroment';
import { environment_prod } from '../../enviroments/enviroment.prod';
@Injectable({
  providedIn: 'root'
})
export class ExamService {
private apiUrl = environment.apiUrl + '/exams';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Generate new exam for user
  generateExam(): Observable<Exam> {
    return this.http.post<Exam>(`${this.apiUrl}/generate`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // Get user's current active exam
  getCurrentExam(): Observable<Exam> {
    return this.http.get<Exam>(`${this.apiUrl}/current`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get user's exam attempts
  getUserAttempts(): Observable<ExamAttempt[]> {
    return this.http.get<ExamAttempt[]>(`${this.apiUrl}/attempts`, {
      headers: this.getAuthHeaders()
    });
  }



  // ADMIN METHODS

  // Get all questions in bank (Admin only)
  getQuestionBank(): Observable<QuestionBank[]> {
    return this.http.get<QuestionBank[]>(`${this.apiUrl}/questions`, {
      headers: this.getAuthHeaders()
    });
  }

  // Add question to bank (Admin only)
  addQuestion(questionData: Partial<QuestionBank>): Observable<QuestionBank> {
    return this.http.post<QuestionBank>(`${this.apiUrl}/questions`, questionData, {
      headers: this.getAuthHeaders()
    });
  }

  // Update question in bank (Admin only)
  updateQuestion(questionId: string, questionData: Partial<QuestionBank>): Observable<QuestionBank> {
    return this.http.put<QuestionBank>(`${this.apiUrl}/questions/${questionId}`, questionData, {
      headers: this.getAuthHeaders()
    });
  }

  // Delete question from bank (Admin only)
  deleteQuestion(questionId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/questions/${questionId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get all exam attempts (Admin only)
  getAllAttempts(): Observable<ExamAttempt[]> {
    return this.http.get<ExamAttempt[]>(`${this.apiUrl}/attempts/all`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get exam statistics (Admin only)
  getExamStats(): Observable<ExamStats> {
    return this.http.get<ExamStats>(`${this.apiUrl}/stats`, {
      headers: this.getAuthHeaders()
    });
  }


  // Get user's exam attempts


  // Submit exam attempt
  submitExam(submission: ExamSubmission): Observable<ExamAttempt & { message: string }> {
    return this.http.post<ExamAttempt & { message: string }>(`${this.apiUrl}/submit`, submission, {
      headers: this.getAuthHeaders()
    });
  }

  // ADMIN METHODS

  // Get all exams (Admin only)
  getAllExams(): Observable<Exam[]> {
    return this.http.get<Exam[]>(`${this.apiUrl}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get exam by ID (Admin only)
  getExamById(examId: string): Observable<Exam> {
    return this.http.get<Exam>(`${this.apiUrl}/${examId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Create new exam (Admin only)
  createExam(examData: Partial<Exam>): Observable<Exam> {
    return this.http.post<Exam>(this.apiUrl, examData, {
      headers: this.getAuthHeaders()
    });
  }

  // Update exam (Admin only)
  updateExam(examId: string, examData: Partial<Exam>): Observable<Exam> {
    return this.http.put<Exam>(`${this.apiUrl}/${examId}`, examData, {
      headers: this.getAuthHeaders()
    });
  }

  // Delete exam (Admin only)
  deleteExam(examId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${examId}`, {
      headers: this.getAuthHeaders()
    });
  }

    // Get exam attempt review details
  getAttemptReview(attemptId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/attempts/${attemptId}/review`, {
      headers: this.getAuthHeaders()
    });
  }

    // Delete exam attempt (Admin only)
  deleteExamAttempt(attemptId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/attempts/${attemptId}`, {
      headers: this.getAuthHeaders()
    });
  }
}

