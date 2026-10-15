import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { QuestionBank } from '../../../model/exam.model';
import { ExamService } from '../../../services/exam.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  emptyQuestionForm,
  questionFormError,
  questionFormFromBank,
  QuestionFormData
} from '../question-bank.helpers';

@Component({
  selector: 'app-add-question-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './add-question-modal.component.html',
  styleUrl: './add-question-modal.component.scss'
})
export class AddQuestionModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() question: QuestionBank | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() questionAdded = new EventEmitter<QuestionBank>();
  @Output() questionSaved = new EventEmitter<QuestionBank>();

  questionData: QuestionFormData = emptyQuestionForm();
  isSubmitting = false;
  error: string | null = null;

  constructor(private examService: ExamService) {}

  get isEditMode(): boolean {
    return !!this.question?._id;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.isOpen) {
      return;
    }
    if (changes['isOpen'] || changes['question']) {
      this.hydrateForm();
    }
  }

  private hydrateForm(): void {
    this.error = null;
    this.isSubmitting = false;
    this.questionData = this.question ? questionFormFromBank(this.question) : emptyQuestionForm();
  }

  onSubmit(): void {
    const error = questionFormError(this.questionData);
    if (error) {
      this.error = error;
      return;
    }

    this.isSubmitting = true;
    this.error = null;
    const payload = {
      questionText: this.questionData.questionText.trim(),
      correctAnswer: this.questionData.correctAnswer,
      isActive: this.questionData.isActive
    };

    const request = this.isEditMode
      ? this.examService.updateQuestion(this.question!._id, payload)
      : this.examService.addQuestion(payload);

    request.subscribe({
      next: (saved: QuestionBank) => {
        this.isSubmitting = false;
        if (!this.isEditMode) {
          this.questionAdded.emit(saved);
        }
        this.questionSaved.emit(saved);
        this.resetForm();
        this.closeModal.emit();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.error = err.error?.error || (this.isEditMode
          ? 'Greška prilikom spremanja pitanja.'
          : 'Greška prilikom dodavanja pitanja.');
      }
    });
  }

  close(): void {
    this.resetForm();
    this.closeModal.emit();
  }

  resetForm(): void {
    this.questionData = emptyQuestionForm();
    this.error = null;
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
