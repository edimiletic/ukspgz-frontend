import { Component, OnInit, OnDestroy} from '@angular/core';
import { Exam, ExamAnswer, ExamSubmission } from '../../model/exam.model';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamService } from '../../services/exam.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-take-exam',
  imports: [CommonModule, FormsModule],
  templateUrl: './take-exam.component.html',
  styleUrl: './take-exam.component.scss'
})
export class TakeExamComponent implements OnInit, OnDestroy {
exam: Exam | null = null;
  userAnswers: { [key: number]: boolean | null } = {};
  currentQuestionIndex = 0;
  isSubmitting = false;
  showConfirmDialog = false;
  error: string | null = null;
  isLoading = true;
  
  // Timer properties
  timeRemaining = 0; // in seconds
  timerInterval: any;
  startTime = new Date();
  
  // Navigation state
  answeredQuestions: Set<number> = new Set();
  
  // Modal states
  showExitDialog = false;

  constructor(
    private route: ActivatedRoute,
    public router: Router, // Make router public
    private examService: ExamService
  ) {}

  ngOnInit(): void {
    const examId = this.route.snapshot.paramMap.get('id');
    if (examId) {
      this.loadExam(examId);
    } else {
      this.error = 'Neispravni ID ispita.';
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  loadExam(examId: string): void {
    this.isLoading = true;
    this.error = null;
    this.examService.getCurrentExam().subscribe({
      next: (exam: Exam) => {
        if (exam._id === examId) {
          this.exam = exam;
          this.initializeAnswers();
          this.calculateTimeRemaining();
          this.startTimer();
        } else {
          this.error = 'Ispit nije pronađen ili je istekao.';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load exam:', err);
        this.error = 'Greška prilikom učitavanja ispita.';
        this.isLoading = false;
      }
    });
  }

  initializeAnswers(): void {
    if (!this.exam) {
      return;
    }

    const saved = this.readSavedAnswers(this.exam._id);
    for (let i = 0; i < this.exam.questions.length; i++) {
      const savedAnswer = saved[i];
      this.userAnswers[i] = savedAnswer === true || savedAnswer === false ? savedAnswer : null;
      if (this.userAnswers[i] !== null) {
        this.answeredQuestions.add(i);
      }
    }
  }

  selectAnswer(questionIndex: number, answer: boolean): void {
    this.userAnswers[questionIndex] = answer;
    this.answeredQuestions.add(questionIndex);
    this.persistAnswers();
  }

  private storageKey(examId: string): string {
    return `exam-answers-${examId}`;
  }

  private readSavedAnswers(examId: string): { [key: number]: boolean | null } {
    try {
      const raw = sessionStorage.getItem(this.storageKey(examId));
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private persistAnswers(): void {
    if (!this.exam) {
      return;
    }
    try {
      sessionStorage.setItem(this.storageKey(this.exam._id), JSON.stringify(this.userAnswers));
    } catch {
      // Ignore storage quota / private mode failures
    }
  }

  private clearSavedAnswers(examId: string): void {
    try {
      sessionStorage.removeItem(this.storageKey(examId));
    } catch {
      // Ignore
    }
  }

  calculateTimeRemaining(): void {
    if (this.exam) {
      const now = new Date();
      const expiresAt = new Date(this.exam.expiresAt);
      this.timeRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
    }
  }

  startTimer(): void {
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      
      if (this.timeRemaining <= 0) {
        this.timeUp();
      }
    }, 1000);
  }

  timeUp(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.submitExam(true);
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getTimerClass(): string {
    if (this.timeRemaining <= 300) return 'timer-critical'; // 5 minutes
    if (this.timeRemaining <= 900) return 'timer-warning'; // 15 minutes
    return 'timer-normal';
  }

  goToQuestion(index: number): void {
    this.currentQuestionIndex = index;
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  nextQuestion(): void {
    if (this.exam && this.currentQuestionIndex < this.exam.questions.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  getAnsweredCount(): number {
    return this.answeredQuestions.size;
  }

  getUnansweredCount(): number {
    return this.exam ? this.exam.questions.length - this.getAnsweredCount() : 0;
  }

  canSubmit(): boolean {
    return this.getAnsweredCount() === (this.exam?.questions.length || 0);
  }

  showSubmitDialog(): void {
    this.showConfirmDialog = true;
  }

  cancelSubmit(): void {
    this.showConfirmDialog = false;
  }

  confirmSubmit(): void {
    this.showConfirmDialog = false;
    this.submitExam(false);
  }

  submitExam(autoSubmit: boolean = false): void {
    if (!this.exam) return;

    this.isSubmitting = true;

    // Calculate time spent in minutes
    const endTime = new Date();
    const timeSpentMs = endTime.getTime() - this.startTime.getTime();
    const timeSpentMinutes = Math.floor(timeSpentMs / (1000 * 60));

    // Prepare answers array - only include actually answered questions
    const answers: ExamAnswer[] = [];
    for (let i = 0; i < this.exam.questions.length; i++) {
      const userAnswer = this.userAnswers[i];
      answers.push({
        questionIndex: i,
        answer: userAnswer !== null && userAnswer !== undefined ? userAnswer : null // Send null for unanswered
      });
    }

    const submission: ExamSubmission = {
      examId: this.exam._id,
      answers: answers,
      timeSpent: timeSpentMinutes
    };

    this.examService.submitExam(submission).subscribe({
      next: (result) => {
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
        }
        this.clearSavedAnswers(this.exam!._id);
        
        this.router.navigate(['/exams/result', result._id], {
          state: { 
            result: result,
            autoSubmit: autoSubmit
          }
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Submit exam error:', err);
        this.error = 'Greška prilikom slanja ispita. Pokušajte ponovo.';
      }
    });
  }

  exitExam(): void {
    this.showExitDialog = true;
  }

  cancelExit(): void {
    this.showExitDialog = false;
  }

  confirmExit(): void {
    this.showExitDialog = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.router.navigate(['/exams']);
  }

  getCurrentQuestion() {
    return this.exam?.questions[this.currentQuestionIndex];
  }

  getQuestionNumber(): number {
    return this.currentQuestionIndex + 1;
  }

  getTotalQuestions(): number {
    return this.exam?.questions.length || 0;
  }

  getProgressPercentage(): number {
    if (!this.exam) return 0;
    return (this.getAnsweredCount() / this.exam.questions.length) * 100;
  }

  getQuestionStatusClass(index: number): string {
    if (index === this.currentQuestionIndex) return 'current';
    if (this.answeredQuestions.has(index)) return 'answered';
    return 'unanswered';
  }

  // Public method for template to navigate back to exams
  navigateToExams(): void {
    this.router.navigate(['/exams']);
  }
}