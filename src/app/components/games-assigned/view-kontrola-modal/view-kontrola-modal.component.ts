import { CommonModule } from '@angular/common';
import { Component, OnChanges,Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { BasketballGame } from '../../../model/basketballGame.model';
import { ViewKontrolaData } from '../../../model/kontrola.model';
import { KontrolaService } from '../../../services/kontrola.service';

@Component({
  selector: 'app-view-kontrola-modal',
  imports: [CommonModule],
  templateUrl: './view-kontrola-modal.component.html',
  styleUrl: './view-kontrola-modal.component.scss'
})
export class ViewKontrolaModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() game: BasketballGame | null = null;
  @Input() currentUserId: string = '';
  @Input() viewAllReferees = false;
  @Output() close = new EventEmitter<void>();

  constructor(private kontrolaService: KontrolaService) {}


  kontrolaData: ViewKontrolaData | null = null;
  refereeGrades: any[] = [];
  isLoading = false;
  errorMessage = '';

  // Grade display mappings
  gradeDisplayMap = {
    'Izvrsno': { label: 'Izvrsno', class: 'grade-excellent', icon: 'fas fa-star' },
    'Iznad Prosjeka': { label: 'Iznad Prosjeka', class: 'grade-above-average', icon: 'fas fa-thumbs-up' },
    'Prosječno': { label: 'Prosječno', class: 'grade-average', icon: 'fas fa-equals' },
    'Ispod Prosjeka': { label: 'Ispod Prosjeka', class: 'grade-below-average', icon: 'fas fa-thumbs-down' },
    'Loše': { label: 'Loše', class: 'grade-poor', icon: 'fas fa-times' }
  };

  tezinaDisplayMap = {
    'Lagana': { label: 'Lagana', class: 'difficulty-easy', icon: 'fas fa-smile' },
    'Prosječna': { label: 'Prosječna', class: 'difficulty-medium', icon: 'fas fa-meh' },
    'Teška': { label: 'Teška', class: 'difficulty-hard', icon: 'fas fa-frown' }
  };

gradeCategories = [
  { key: 'ocjena', label: 'Ocjena' }
];

// Create a separate array for detailed grades
detailedGradeCategories = [
  { key: 'pogreske', label: 'Pogreške' },
  { key: 'prekrsaji', label: 'Prekršaji' },
  { key: 'tehnikaMehanika', label: 'Tehnika i mehanika' },
  { key: 'timskiRad', label: 'Timski rad' },
  { key: 'kontrolaUtakmice', label: 'Kontrola utakmice' }
];

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isOpen && this.game && (this.viewAllReferees || this.currentUserId)) {
      this.loadKontrolaData();
    }
  }

async loadKontrolaData(): Promise<void> {
  if (!this.game) return;

  this.isLoading = true;
  this.errorMessage = '';
  this.kontrolaData = null;
  this.refereeGrades = [];

  try {
    if (this.viewAllReferees) {
      const fullKontrola: any = await this.kontrolaService.getFullKontrola(this.game._id).toPromise();
      const gameInfo = fullKontrola?.gameId && typeof fullKontrola.gameId === 'object'
        ? fullKontrola.gameId
        : this.game;
      const createdBy = fullKontrola?.createdBy;
      this.kontrolaData = {
        gameId: this.game._id,
        gameInfo,
        tezinaUtakmice: fullKontrola?.tezinaUtakmice,
        refereeGrade: fullKontrola?.refereeGrades?.[0] || null,
        createdAt: fullKontrola?.createdAt,
        createdBy: createdBy?.name
          ? `${createdBy.name} ${createdBy.surname || ''}`.trim()
          : (createdBy || '')
      };
      this.refereeGrades = fullKontrola?.refereeGrades || [];
    } else {
      const result = await this.kontrolaService.getMyKontrola(this.game._id).toPromise();
      this.kontrolaData = result || null;
      this.refereeGrades = result?.refereeGrade ? [result.refereeGrade] : [];
    }
  } catch (error) {
    console.error('Error loading kontrola:', error);
    this.errorMessage = 'Greška pri učitavanju kontrole.';
    this.kontrolaData = null;
    this.refereeGrades = [];
  } finally {
    this.isLoading = false;
  }
}

  getGradeDisplay(gradeValue: string): any {
    return this.gradeDisplayMap[gradeValue as keyof typeof this.gradeDisplayMap] || 
           { label: gradeValue, class: '', icon: 'fas fa-question' };
  }

  getTezinaDisplay(tezinaValue: string): any {
    return this.tezinaDisplayMap[tezinaValue as keyof typeof this.tezinaDisplayMap] || 
           { label: tezinaValue, class: '', icon: 'fas fa-question' };
  }

  closeModal(): void {
    this.close.emit();
    this.kontrolaData = null;
    this.refereeGrades = [];
    this.errorMessage = '';
  }

  getGradeValue(categoryKey: string, grade: any = this.kontrolaData?.refereeGrade): string {
    if (!grade) return '';
    
    switch (categoryKey) {
      case 'ocjena': return grade.ocjena;
      case 'pogreske': return grade.pogreske;
      case 'prekrsaji': return grade.prekrsaji;
      case 'tehnikaMehanika': return grade.tehnikaMehanika;
      case 'timskiRad': return grade.timskiRad;
      case 'kontrolaUtakmice': return grade.kontrolaUtakmice;
      default: return '';
    }
  }
}
