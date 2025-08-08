import { Component, OnInit, OnDestroy} from '@angular/core';
import { Exam, ExamAnswer, ExamSubmission } from '../../model/exam.model';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamService } from '../../services/exam.service';
import { FooterComponent } from "../footer/footer.component";
import { HeaderComponent } from "../header/header.component";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-take-exam',
  imports: [FooterComponent, HeaderComponent, CommonModule, FormsModule],
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
    }
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  loadExam(examId: string): void {
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
      },
      error: (err) => {
        console.error('Failed to load exam:', err);
        this.error = 'Greška prilikom učitavanja ispita.';
      }
    });
  }

  initializeAnswers(): void {
    if (this.exam) {
      for (let i = 0; i < this.exam.questions.length; i++) {
        this.userAnswers[i] = null;
      }
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
    alert('Vrijeme je isteklo! Ispit će biti automatski poslan.');
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

  selectAnswer(questionIndex: number, answer: boolean): void {
    this.userAnswers[questionIndex] = answer;
    this.answeredQuestions.add(questionIndex);
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

    console.log('Submitting exam with answers:', answers);

    this.examService.submitExam(submission).subscribe({
      next: (result) => {
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
        }
        
        // Navigate to results page with the result data
        this.router.navigate(['/exams/result'], {
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