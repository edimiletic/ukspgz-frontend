// src/app/services/exam.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Exam, ExamAttempt, ExamSubmission, QuestionBank, ExamStats, AttemptReview } from '../model/exam.model';
import { environment } from '../../enviroments/enviroment';
@Injectable({
  providedIn: 'root'
})
export class ExamService {
private apiUrl = environment.apiUrl + '/exams';

  constructor(private http: HttpClient) {}

  // Generate new exam for user
  generateExam(): Observable<Exam> {
    return this.http.post<Exam>(`${this.apiUrl}/generate`, {});
  }

  // Get user's current active exam
  getCurrentExam(): Observable<Exam> {
    return this.http.get<Exam>(`${this.apiUrl}/current`);
  }

  // Get user's exam attempts
  getUserAttempts(): Observable<ExamAttempt[]> {
    return this.http.get<ExamAttempt[]>(`${this.apiUrl}/attempts`);
  }



  // ADMIN METHODS

  // Get all questions in bank (Admin only)
  getQuestionBank(): Observable<QuestionBank[]> {
    return this.http.get<QuestionBank[]>(`${this.apiUrl}/questions`);
  }

  // Add question to bank (Admin only)
  addQuestion(questionData: Partial<QuestionBank>): Observable<QuestionBank> {
    return this.http.post<QuestionBank>(`${this.apiUrl}/questions`, questionData);
  }

  // Update question in bank (Admin only)
  updateQuestion(questionId: string, questionData: Partial<QuestionBank>): Observable<QuestionBank> {
    return this.http.put<QuestionBank>(`${this.apiUrl}/questions/${questionId}`, questionData);
  }

  // Delete question from bank (Admin only)
  deleteQuestion(questionId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/questions/${questionId}`);
  }

  // Get all exam attempts (Admin only)
  getAllAttempts(): Observable<ExamAttempt[]> {
    return this.http.get<ExamAttempt[]>(`${this.apiUrl}/attempts/all`);
  }

  // Get exam statistics (Admin only)
  getExamStats(): Observable<ExamStats> {
    return this.http.get<ExamStats>(`${this.apiUrl}/stats`);
  }


  // Get user's exam attempts


  // Submit exam attempt
  submitExam(submission: ExamSubmission): Observable<ExamAttempt & { message: string }> {
    return this.http.post<ExamAttempt & { message: string }>(`${this.apiUrl}/submit`, submission);
  }

  // ADMIN METHODS

  // Get all exams (Admin only)
  getAllExams(): Observable<Exam[]> {
    return this.http.get<Exam[]>(`${this.apiUrl}`);
  }

  // Get exam by ID (Admin only)
  getExamById(examId: string): Observable<Exam> {
    return this.http.get<Exam>(`${this.apiUrl}/${examId}`);
  }

  // Create new exam (Admin only)
  createExam(examData: Partial<Exam>): Observable<Exam> {
    return this.http.post<Exam>(this.apiUrl, examData);
  }

  // Update exam (Admin only)
  updateExam(examId: string, examData: Partial<Exam>): Observable<Exam> {
    return this.http.put<Exam>(`${this.apiUrl}/${examId}`, examData);
  }

  // Delete exam (Admin only)
  deleteExam(examId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${examId}`);
  }

    // Get exam attempt review details
  getAttemptReview(attemptId: string): Observable<AttemptReview> {
    return this.http.get<AttemptReview>(`${this.apiUrl}/attempts/${attemptId}/review`);
  }

    // Delete exam attempt (Admin only)
  deleteExamAttempt(attemptId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/attempts/${attemptId}`);
  }
}

