// src/app/components/games-assigned/kontrola-modal/kontrola-modal.component.ts
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { BasketballGame } from '../../../model/basketballGame.model';
import { KontrolaService } from '../../../services/kontrola.service';
import { KontrolaData, RefereeGrade } from '../../../model/kontrola.model';



@Component({
  selector: 'app-kontrola-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './kontrola-modal.component.html',
  styleUrl: './kontrola-modal.component.scss'
})
export class KontrolaModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() game: BasketballGame | null = null;
    @Input() isEditMode = false; // ← Add this input
  @Output() close = new EventEmitter<void>();
  @Output() kontrolaSaved = new EventEmitter<any>();

  // Inject the service
  private kontrolaService = inject(KontrolaService);

  // Form data
  kontrolaForm: KontrolaData = {
    gameId: '',
    tezinaUtakmice: '',
    refereeGrades: []
  };

  // Dropdown options
  tezinaOptions = [
    { value: 'Lagana', label: 'Lagana' },
    { value: 'Prosječna', label: 'Prosječna' },
    { value: 'Teška', label: 'Teška' }
  ];

  gradeOptions = [
    { value: 'Izvrsno', label: 'Izvrsno' },
    { value: 'Iznad Prosjeka', label: 'Iznad Prosjeka' },
    { value: 'Prosječno', label: 'Prosječno' },
    { value: 'Ispod Prosjeka', label: 'Ispod Prosjeka' },
    { value: 'Loše', label: 'Loše' }
  ];

overallGrade = { key: 'ocjena', label: 'Ocjena' };

  // Categories for grading
gradeCategories = [
  { key: 'pogreske', label: 'Pogreške' },
  { key: 'prekrsaji', label: 'Prekršaji' },
  { key: 'tehnikaMehanika', label: 'Tehnika i mehanika' },
  { key: 'timskiRad', label: 'Timski rad' },
  { key: 'kontrolaUtakmice', label: 'Kontrola utakmice' },
];

  // State management
  isLoading = false;
  isLoadingExistingKontrola = false;
  errorMessage = '';
  
  // Page management
  currentPage = 0;
  totalPages = 1;
    existingKontrolaId: string | null = null; // ← Add this


  constructor() {
    console.log('KontrolaModalComponent constructor');
    console.log('kontrolaService type:', typeof this.kontrolaService);
    console.log('kontrolaService:', this.kontrolaService);
    console.log('saveKontrola method:', this.kontrolaService?.saveKontrola);
  }

ngOnChanges(changes: SimpleChanges): void {
  console.log('🔄 ngOnChanges called with:', changes);
  
  if (changes['isOpen'] && this.isOpen && this.game) {
    console.log('📂 Modal opened for game:', this.game._id);
    console.log('✏️ Edit mode:', this.isEditMode);
    
    if (this.isEditMode) {
      console.log('🔧 Loading existing kontrola for editing...');
      this.loadExistingKontrola();
    } else {
      console.log('🆕 Initializing new kontrola form...');
      this.initializeForm();
    }
  }
    if (changes['isEditMode']) {
    console.log('✏️ Edit mode changed:', changes['isEditMode']);
    if (this.isOpen && this.game && this.isEditMode) {
      console.log('🔧 Edit mode enabled, loading existing kontrola...');
      this.loadExistingKontrola();
    }
  }
}

async loadExistingKontrola(): Promise<void> {
  if (!this.game) return;

  this.isLoadingExistingKontrola = true;
  this.errorMessage = '';

  try {
    console.log('🔄 Loading existing kontrola for editing, gameId:', this.game._id);
    
    const existingKontrola = await firstValueFrom(
      this.kontrolaService.getKontrolaForEdit(this.game._id)
    );
    
    console.log('📄 Raw existing kontrola data:', existingKontrola);
    console.log('📄 Type of existingKontrola:', typeof existingKontrola);
    console.log('📄 Keys in existingKontrola:', Object.keys(existingKontrola || {}));
    
    if (existingKontrola && existingKontrola.refereeGrades) {
      console.log('📄 Number of referee grades:', existingKontrola.refereeGrades.length);
      console.log('📄 First referee grade:', existingKontrola.refereeGrades[0]);
      this.populateFormWithExistingData(existingKontrola);
    } else {
      console.warn('⚠️ No referee grades found in existing kontrola, falling back to new form');
      this.initializeForm();
    }
    
  } catch (error) {
    console.error('❌ Error loading existing kontrola:', error);
    this.errorMessage = 'Greška pri učitavanju postojeće kontrole. Kreiranje nove kontrole...';
    this.initializeForm();
  } finally {
    this.isLoadingExistingKontrola = false;
  }
}


populateFormWithExistingData(existingKontrola: any): void {
  if (!this.game) return;

  console.log('🔧 Populating form with existing kontrola:', existingKontrola);

  // Store the existing kontrola ID for updates
  this.existingKontrolaId = existingKontrola._id;
  console.log('💾 Stored existing kontrola ID:', this.existingKontrolaId);

  // Populate basic form data
  this.kontrolaForm = {
    gameId: this.game._id,
    tezinaUtakmice: existingKontrola.tezinaUtakmice,
    refereeGrades: []
  };

  console.log('🎯 Set težina utakmice to:', existingKontrola.tezinaUtakmice);

  // Convert existing grades to the format we need
const refereeGrades: RefereeGrade[] = existingKontrola.refereeGrades.map((grade: any, index: number) => {
  console.log(`🧑‍⚖️ Processing referee grade ${index}:`, grade);
  
  const mappedGrade: RefereeGrade = {
    refereeId: grade.refereeId,
    refereeName: grade.refereeName,
    refereeRole: grade.refereeRole,
    refereePosition: grade.refereePosition,
    // Grade categories
    pogreske: grade.pogreske,
    prekrsaji: grade.prekrsaji,
    tehnikaMehanika: grade.tehnikaMehanika,
    timskiRad: grade.timskiRad,
    kontrolaUtakmice: grade.kontrolaUtakmice,
    ocjena: grade.ocjena || '', // Add this line with fallback
    // Text areas
    kontroliraniSudac: grade.kontroliraniSudac,
    komentiranesituacije: grade.komentiranesituacije,
    komentarUtakmice: grade.komentarUtakmice
  };
  
  console.log(`✅ Mapped grade ${index}:`, mappedGrade);
  return mappedGrade;
});

  // Sort referees by role and position for consistent display
  refereeGrades.sort((a, b) => {
    const roleOrder = { 'Sudac': 1, 'Delegat': 2, 'Pomoćni Sudac': 3 };
    if (a.refereeRole !== b.refereeRole) {
      return roleOrder[a.refereeRole as keyof typeof roleOrder] - roleOrder[b.refereeRole as keyof typeof roleOrder];
    }
    return a.refereePosition - b.refereePosition;
  });

  this.kontrolaForm.refereeGrades = refereeGrades;

  // Set total pages: 1 for Težina + 1 for each referee
  this.totalPages = 1 + refereeGrades.length;
  this.currentPage = 0;
  this.errorMessage = '';

  console.log('✅ Final populated form:', this.kontrolaForm);
  console.log('📊 Total pages set to:', this.totalPages);
}



  // Helper method to safely get grade value
  getGradeValue(referee: RefereeGrade, categoryKey: string): string {
  switch (categoryKey) {
    case 'pogreske': return referee.pogreske;
    case 'prekrsaji': return referee.prekrsaji;
    case 'tehnikaMehanika': return referee.tehnikaMehanika;
    case 'timskiRad': return referee.timskiRad;
    case 'kontrolaUtakmice': return referee.kontrolaUtakmice;
    case 'ocjena': return referee.ocjena; // Add this line
    case 'kontroliraniSudac': return referee.kontroliraniSudac;
    case 'komentiranesituacije': return referee.komentiranesituacije;
    case 'komentarUtakmice': return referee.komentarUtakmice;
    default: return '';
  }
}
// Helper method to safely set grade value
setGradeValue(referee: RefereeGrade, categoryKey: string, value: string): void {
  switch (categoryKey) {
    case 'pogreske': referee.pogreske = value; break;
    case 'prekrsaji': referee.prekrsaji = value; break;
    case 'tehnikaMehanika': referee.tehnikaMehanika = value; break;
    case 'timskiRad': referee.timskiRad = value; break;
    case 'kontrolaUtakmice': referee.kontrolaUtakmice = value; break;
    case 'ocjena': referee.ocjena = value; break; // Add this line
    case 'kontroliraniSudac': referee.kontroliraniSudac = value; break;
    case 'komentiranesituacije': referee.komentiranesituacije = value; break;
    case 'komentarUtakmice': referee.komentarUtakmice = value; break;
  }
}

  initializeForm(): void {
    if (!this.game) return;

    // Get only accepted referee assignments
    const acceptedReferees = this.game.refereeAssignments.filter(
      assignment => assignment.assignmentStatus === 'Accepted'
    );

   // Create referee grades for each accepted referee
const refereeGrades: RefereeGrade[] = acceptedReferees.map(assignment => ({
  refereeId: assignment.userId._id,
  refereeName: `${assignment.userId.name} ${assignment.userId.surname}`,
  refereeRole: assignment.role,
  refereePosition: assignment.position,
  // Grade categories
  pogreske: '',
  prekrsaji: '',
  tehnikaMehanika: '',
  timskiRad: '',
  kontrolaUtakmice: '',
  ocjena: '', // Add this line
  // Individual text areas for each referee
  kontroliraniSudac: '',
  komentiranesituacije: '',
  komentarUtakmice: ''
    }));

    // Sort referees by role and position for consistent display
    refereeGrades.sort((a, b) => {
      const roleOrder = { 'Sudac': 1, 'Delegat': 2, 'Pomoćni Sudac': 3 };
      if (a.refereeRole !== b.refereeRole) {
        return roleOrder[a.refereeRole as keyof typeof roleOrder] - roleOrder[b.refereeRole as keyof typeof roleOrder];
      }
      return a.refereePosition - b.refereePosition;
    });

    this.kontrolaForm = {
      gameId: this.game._id,
      tezinaUtakmice: '',
      refereeGrades: refereeGrades
    };

    // Set total pages: 1 for Težina + 1 for each referee
    this.totalPages = 1 + refereeGrades.length;
    this.currentPage = 0;
    this.errorMessage = '';
  }

  // Page navigation methods
  nextPage(): void {
    if (this.currentPage === 0) {
      if (!this.validateTezinaUtakmice()) {
        return;
      }
    } else {
      if (!this.validateCurrentReferee()) {
        return;
      }
    }

    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.errorMessage = '';
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.errorMessage = '';
    }
  }

  goToPage(pageIndex: number): void {
    if (pageIndex >= 0 && pageIndex < this.totalPages) {
      this.currentPage = pageIndex;
      this.errorMessage = '';
    }
  }

  // Validation methods
  validateTezinaUtakmice(): boolean {
    if (!this.kontrolaForm.tezinaUtakmice) {
      this.errorMessage = 'Potrebno je odabrati težinu utakmice.';
      return false;
    }
    return true;
  }

  validateCurrentReferee(): boolean {
    if (this.currentPage === 0) return true;
    
    const refereeIndex = this.currentPage - 1;
    const referee = this.kontrolaForm.refereeGrades[refereeIndex];
    
    if (!referee) return true;

    // Check grade categories
    const emptyGrades = this.gradeCategories.filter(category => 
      !this.getGradeValue(referee, category.key)
    );
    
    if (emptyGrades.length > 0) {
      const missingCategories = emptyGrades.map(cat => cat.label).join(', ');
      this.errorMessage = `Potrebno je ocijeniti sve kategorije. Nedostaju: ${missingCategories}`;
      return false;
    }

    // Check required text areas
    if (!referee.kontroliraniSudac.trim()) {
      this.errorMessage = 'Polje "Kontrolirani sudac" je obavezno.';
      return false;
    }

    if (!referee.komentiranesituacije.trim()) {
      this.errorMessage = 'Polje "Komentirane situacije" je obavezno.';
      return false;
    }

    if (!referee.komentarUtakmice.trim()) {
      this.errorMessage = 'Polje "Komentar utakmice i cjelokupna izvedba" je obavezno.';
      return false;
    }

    return true;
  }

  validateAllForm(): boolean {
    // Validate Težina Utakmice
    if (!this.validateTezinaUtakmice()) {
      this.goToPage(0);
      return false;
    }

    // Validate each referee
    for (let i = 0; i < this.kontrolaForm.refereeGrades.length; i++) {
      this.currentPage = i + 1;
      if (!this.validateCurrentReferee()) {
        return false;
      }
    }

    return true;
  }

 
async saveKontrola(): Promise<void> {
    console.log('saveKontrola called, editMode:', this.isEditMode);
    
    if (!this.validateAllForm()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      let result;
      
      if (this.isEditMode && this.existingKontrolaId) {
        // Update existing kontrola
        console.log('Updating existing kontrola:', this.existingKontrolaId);
        result = await firstValueFrom(
          this.kontrolaService.updateKontrola(this.game!._id, this.kontrolaForm)
        );
        console.log('Kontrola updated successfully:', result);
      } else {
        // Create new kontrola
        console.log('Creating new kontrola');
        result = await firstValueFrom(
          this.kontrolaService.saveKontrola(this.kontrolaForm)
        );
        console.log('Kontrola created successfully:', result);
      }
      
      if (result && result.success) {
        const action = this.isEditMode ? 'ažurirana' : 'kreirana';
        const notificationsCount = result.notificationsCount || this.kontrolaForm.refereeGrades.length;
        
        this.kontrolaSaved.emit({
          ...result,
          success: true,
          message: `Kontrola je uspješno ${action}! ${this.isEditMode ? '' : `Notifikacije poslane ${notificationsCount} sudaca.`}`
        });
        this.closeModal();
      } else {
        throw new Error(result?.message || 'Neočekivana greška pri spremanju kontrole');
      }

    } catch (error) {
      console.error('Error saving kontrola:', error);
      this.errorMessage = error instanceof Error ? error.message : 'Greška pri spremanju kontrole. Molimo pokušajte ponovo.';
    } finally {
      this.isLoading = false;
    }
  }


  closeModal(): void {
    this.close.emit();
    this.resetForm();
  }

  resetForm(): void {
    this.kontrolaForm = {
      gameId: '',
      tezinaUtakmice: '',
      refereeGrades: []
    };
    this.currentPage = 0;
    this.totalPages = 1;
    this.errorMessage = '';
    this.existingKontrolaId = null;
  }

  // Helper methods for template
  getCurrentReferee(): RefereeGrade | null {
    if (this.currentPage === 0) return null;
    const refereeIndex = this.currentPage - 1;
    return this.kontrolaForm.refereeGrades[refereeIndex] || null;
  }

  getRefereeDisplayName(referee: RefereeGrade): string {
    return `${referee.refereeName} (${referee.refereeRole} ${referee.refereePosition})`;
  }

  getGradeClass(grade: string): string {
    switch (grade) {
      case 'Izvrsno': return 'grade-excellent';
      case 'Iznad Prosjeka': return 'grade-above-average';
      case 'Prosječno': return 'grade-average';
      case 'Ispod Prosjeka': return 'grade-below-average';
      case 'Loše': return 'grade-poor';
      default: return '';
    }
  }

  // ← Update getPageTitle to show edit vs create
  getPageTitle(): string {
    const prefix = this.isEditMode ? 'Uredi' : 'Nova';
    
    if (this.currentPage === 0) {
      return `${prefix} - Težina Utakmice`;
    }
    const referee = this.getCurrentReferee();
    return referee ? `${prefix} - ${this.getRefereeDisplayName(referee)}` : `${prefix} - Sudac`;
  }

  isLastPage(): boolean {
    return this.currentPage === this.totalPages - 1;
  }

  isFirstPage(): boolean {
    return this.currentPage === 0;
  }
}