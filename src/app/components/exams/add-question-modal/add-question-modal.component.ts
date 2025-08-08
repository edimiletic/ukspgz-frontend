import { Component, EventEmitter, Input, Output } from '@angular/core';
import { QuestionBank } from '../../../model/exam.model';
import { ExamService } from '../../../services/exam.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-question-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './add-question-modal.component.html',
  styleUrl: './add-question-modal.component.scss'
})
export class AddQuestionModalComponent {
   @Input() isOpen = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() questionAdded = new EventEmitter<QuestionBank>();

  questionData = {
    questionText: '',
    correctAnswer: true,
    category: 'Osnove igre'
  };

  categories = [
    'Osnove igre',
    'Prekršaji',
    'Teren i oprema',
    'Vremenska ograničenja',
    'Shot clock',
    'Suđenje',
    'Tehnički prekršaji',
    'Dribbling',
    'Goaltending',
    'Koračanje',
    'Bodovanje',
    'Izmjene',
    'Timeouts',
    'Statistike',
    'Fizički kontakt',
    'Ozljede',
    'Obrambene taktike',
    'Video pregled',
    'Ostalo'
  ];

  isSubmitting = false;
  error: string | null = null;

  constructor(private examService: ExamService) {}

  onSubmit(): void {
    if (!this.questionData.questionText.trim()) {
      this.error = 'Tekst pitanja je obavezan.';
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    this.examService.addQuestion(this.questionData).subscribe({
      next: (newQuestion: QuestionBank) => {
        this.isSubmitting = false;
        this.questionAdded.emit(newQuestion);
        this.resetForm();
        this.close();
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error adding question:', err);
        this.error = err.error?.error || 'Greška prilikom dodavanja pitanja.';
      }
    });
  }

  close(): void {
    this.resetForm();
    this.closeModal.emit();
  }

  resetForm(): void {
    this.questionData = {
      questionText: '',
      correctAnswer: true,
      category: 'Osnove igre'
    };
    this.error = null;
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}