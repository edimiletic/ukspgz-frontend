import { CommonModule } from '@angular/common';
import { BasketballGame, GameFormData, RefereeAssignmentData, RefereeSelection } from '../../../model/basketballGame.model';
import { User } from '../../../model/user.model';
import { UserService } from '../../../services/user.service';
import { BasketballGameService } from './../../../services/basketballGame.service';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChange, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-edit-game-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-game-modal.component.html',
  styleUrl: './edit-game-modal.component.scss'
})
export class EditGameModalComponent  implements OnInit, OnChanges {
   @Input() isOpen = false;
  @Input() game: BasketballGame | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() gameUpdated = new EventEmitter<BasketballGame>();

  // Form data
  gameForm: GameFormData = {
    homeTeam: '',
    awayTeam: '',
    date: '',
    time: '',
    venue: '',
    competition: '',
    notes: '',
    status: 'Scheduled'
  };

  // Referee data
  availableReferees: {
    sudci: User[];
    delegati: User[];
    pomocniSudci: User[];
  } = {
    sudci: [],
    delegati: [],
    pomocniSudci: []
  };

  selectedReferees: RefereeSelection = {
    sudci: [],
    delegat: '',
    pomocniSudci: []
  };

  // Competition options
  competitions = [
    'FAVBET PREMIJER LIGA',
    'KUP «K. ĆOSIĆ»',
    'PRVA MUŠKA LIGA',
    'ZAVRŠNI TURNIR ZA POPUNU PRVE MUŠKE LIGE',
    'DRUGE MUŠKE LIGE',
    'TREĆE MUŠKE LIGE',
    'ČETVRTE MUŠKE LIGE',
    'PREMIJER ŽENSKA LIGA',
    'PRVA ŽENSKA LIGA',
    'KUP «R. MEGLAJ-RIMAC»',
    'JUNIORI',
    'JUNIORKE',
    'KADETI',
    'KADETKINJE',
    'MLAĐI KADETI',
    'MLAĐE KADETKINJE',
    'DJEČACI I DJEVOJČICE',
    'NATJECANJE SREDNJIH ŠKOLA',
    'NATJECANJE OSNOVNIH ŠKOLA',
    'Natjecanje MINI KOŠARKA',
    '3X3'
  ];

  // Status options
  statusOptions = [
    { value: 'Scheduled', label: 'Zakazano' },
    { value: 'Ongoing', label: 'U tijeku' },
    { value: 'Completed', label: 'Završeno' },
    { value: 'Cancelled', label: 'Otkazano' }
  ];

  // State management
  isLoading = false;
  isLoadingReferees = false;
  errorMessage = '';
  currentStep = 1; // 1: Game details, 2: Referee assignments

  constructor(
    private basketballGameService: BasketballGameService,
    private userService: UserService
  ) {}

  ngOnInit() {
    if (this.isOpen && this.game) {
      this.loadReferees();
      this.populateForm();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.game) {
      this.loadReferees();
      this.populateForm();
      this.currentStep = 1;
      this.errorMessage = '';
    }
  }

  populateForm() {
    if (!this.game) return;

    // Populate game form
    this.gameForm = {
      homeTeam: this.game.homeTeam,
      awayTeam: this.game.awayTeam,
      date: this.game.date.split('T')[0], // Convert to YYYY-MM-DD format
      time: this.game.time,
      venue: this.game.venue,
      competition: this.game.competition,
      notes: this.game.notes || '',
      status: this.game.status
    };

    // Populate referee assignments
    this.populateRefereeAssignments();
  }

  populateRefereeAssignments() {
    if (!this.game) return;

    const sudci: { _id?: string; userId: string; position: number }[] = [];
    const pomocniSudci: { _id?: string; userId: string; position: number }[] = [];
    let delegat = '';

    this.game.refereeAssignments.forEach(assignment => {
      switch (assignment.role) {
        case 'Sudac':
          sudci.push({
            _id: assignment._id,
            userId: assignment.userId._id,
            position: assignment.position
          });
          break;
        case 'Delegat':
          delegat = assignment.userId._id;
          break;
        case 'Pomoćni Sudac':
          pomocniSudci.push({
            _id: assignment._id,
            userId: assignment.userId._id,
            position: assignment.position
          });
          break;
      }
    });

    // Sort by position and ensure minimum assignments
    sudci.sort((a, b) => a.position - b.position);
    pomocniSudci.sort((a, b) => a.position - b.position);

    // Ensure minimum 2 sudci and 2 pomoćni sudci
    while (sudci.length < 2) {
      sudci.push({ userId: '', position: sudci.length + 1 });
    }
    while (pomocniSudci.length < 2) {
      pomocniSudci.push({ userId: '', position: pomocniSudci.length + 1 });
    }

    this.selectedReferees = {
      sudci,
      delegat,
      pomocniSudci
    };
  }

  loadReferees() {
    this.isLoadingReferees = true;
    this.userService.getReferees().subscribe({
      next: (referees) => {
        this.availableReferees = {
          sudci: referees.filter(ref => ref.role === 'Sudac'),
          delegati: referees.filter(ref => ref.role === 'Delegat'),
          pomocniSudci: referees.filter(ref => ref.role === 'Pomoćni Sudac')
        };
        this.isLoadingReferees = false;
      },
      error: (error) => {
        console.error('Error loading referees:', error);
        this.errorMessage = 'Greška pri učitavanju sudaca.';
        this.isLoadingReferees = false;
      }
    });
  }

  // Step navigation
  nextStep() {
    if (this.validateGameForm()) {
      this.currentStep = 2;
      this.errorMessage = '';
    }
  }

  previousStep() {
    this.currentStep = 1;
    this.errorMessage = '';
  }

  // Validation
  validateGameForm(): boolean {
    const { homeTeam, awayTeam, date, time, venue, competition } = this.gameForm;
    
    if (!homeTeam.trim()) {
      this.errorMessage = 'Domaći tim je obavezan.';
      return false;
    }
    
    if (!awayTeam.trim()) {
      this.errorMessage = 'Gostujući tim je obavezan.';
      return false;
    }
    
    if (homeTeam.toLowerCase().trim() === awayTeam.toLowerCase().trim()) {
      this.errorMessage = 'Domaći i gostujući tim ne mogu biti isti.';
      return false;
    }
    
    if (!date) {
      this.errorMessage = 'Datum je obavezan.';
      return false;
    }
    
    if (!time) {
      this.errorMessage = 'Vrijeme je obavezno.';
      return false;
    }
    
    if (!venue.trim()) {
      this.errorMessage = 'Mjesto je obavezno.';
      return false;
    }
    
    if (!competition) {
      this.errorMessage = 'Natjecanje je obavezno.';
      return false;
    }
    
    return true;
  }

  validateRefereeAssignments(): boolean {
    // Check for at least 2 sudci
    const validSudci = this.selectedReferees.sudci.filter(s => s.userId).length;
    if (validSudci < 2) {
      this.errorMessage = 'Potrebno je odabrati najmanje 2 suca.';
      return false;
    }

    // Check for at least 2 pomoćni sudci
    const validPomocni = this.selectedReferees.pomocniSudci.filter(s => s.userId).length;
    if (validPomocni < 2) {
      this.errorMessage = 'Potrebno je odabrati najmanje 2 pomoćna suca.';
      return false;
    }

    // Check for duplicate assignments
    const allSelectedIds = [
      ...this.selectedReferees.sudci.map(s => s.userId).filter(id => id),
      this.selectedReferees.delegat,
      ...this.selectedReferees.pomocniSudci.map(s => s.userId).filter(id => id)
    ].filter(id => id);

    const uniqueIds = new Set(allSelectedIds);
    if (allSelectedIds.length !== uniqueIds.size) {
      this.errorMessage = 'Isti sudac ne može biti dodijeljen više puta.';
      return false;
    }

    return true;
  }

  // Referee management methods (same as create modal)
  addSudac() {
    if (this.selectedReferees.sudci.length < 3) {
      const nextPosition = this.selectedReferees.sudci.length + 1;
      this.selectedReferees.sudci.push({ userId: '', position: nextPosition });
    }
  }

  removeSudac(index: number) {
    if (this.selectedReferees.sudci.length > 2) {
      this.selectedReferees.sudci.splice(index, 1);
      // Reorder positions
      this.selectedReferees.sudci.forEach((sudac, i) => {
        sudac.position = i + 1;
      });
    }
  }

  addPomocniSudac() {
    if (this.selectedReferees.pomocniSudci.length < 3) {
      const nextPosition = this.selectedReferees.pomocniSudci.length + 1;
      this.selectedReferees.pomocniSudci.push({ userId: '', position: nextPosition });
    }
  }

  removePomocniSudac(index: number) {
    if (this.selectedReferees.pomocniSudci.length > 2) {
      this.selectedReferees.pomocniSudci.splice(index, 1);
      // Reorder positions
      this.selectedReferees.pomocniSudci.forEach((sudac, i) => {
        sudac.position = i + 1;
      });
    }
  }

  // Get available referees (same logic as create modal)
  getAvailableSudci(currentIndex: number): User[] {
    const selectedIds = this.selectedReferees.sudci
      .map((s, index) => index !== currentIndex ? s.userId : null)
      .filter(id => id);
    
    const otherSelectedIds = [
      this.selectedReferees.delegat,
      ...this.selectedReferees.pomocniSudci.map(s => s.userId)
    ].filter(id => id);

    const allExcludedIds = [...selectedIds, ...otherSelectedIds];
    
    return this.availableReferees.sudci.filter(ref => 
      !allExcludedIds.includes(ref._id)
    );
  }

  getAvailableDelegati(): User[] {
    const allSelectedIds = [
      ...this.selectedReferees.sudci.map(s => s.userId),
      ...this.selectedReferees.pomocniSudci.map(s => s.userId)
    ].filter(id => id);

    return this.availableReferees.delegati.filter(ref => 
      !allSelectedIds.includes(ref._id)
    );
  }

  getAvailablePomocniSudci(currentIndex: number): User[] {
    const selectedIds = this.selectedReferees.pomocniSudci
      .map((s, index) => index !== currentIndex ? s.userId : null)
      .filter(id => id);
    
    const otherSelectedIds = [
      ...this.selectedReferees.sudci.map(s => s.userId),
      this.selectedReferees.delegat
    ].filter(id => id);

    const allExcludedIds = [...selectedIds, ...otherSelectedIds];
    
    return this.availableReferees.pomocniSudci.filter(ref => 
      !allExcludedIds.includes(ref._id)
    );
  }

  // Form submission
  async updateGame() {
    if (!this.validateRefereeAssignments() || !this.game) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Update the game basic information
      const gameData = {
        homeTeam: this.gameForm.homeTeam.trim(),
        awayTeam: this.gameForm.awayTeam.trim(),
        date: this.gameForm.date,
        time: this.gameForm.time,
        venue: this.gameForm.venue.trim(),
        competition: this.gameForm.competition,
        status: this.gameForm.status,
        notes: this.gameForm.notes.trim()
      };

      const updatedGame = await this.basketballGameService.updateGame(this.game._id, gameData).toPromise();
      
      if (!updatedGame) {
        throw new Error('Failed to update game');
      }

      // Handle referee assignments
      await this.updateRefereeAssignments();

      // Emit success
      this.gameUpdated.emit(updatedGame);
      this.closeModal();

    } catch (error) {
      console.error('Error updating game:', error);
      this.errorMessage = 'Greška pri ažuriranju utakmice. Molimo pokušajte ponovo.';
    } finally {
      this.isLoading = false;
    }
  }

  private async updateRefereeAssignments() {
    if (!this.game) return;

    // Get current assignments
    const currentAssignments = this.game.refereeAssignments;
    
    // Build new assignments list with all selected referees
    const newAssignments: RefereeAssignmentData[] = [];

    // Add sudci
    this.selectedReferees.sudci.forEach(sudac => {
      if (sudac.userId) {
        newAssignments.push({
          _id: sudac._id,
          userId: sudac.userId,
          role: 'Sudac',
          position: sudac.position
        });
      }
    });

    // Add delegat
    if (this.selectedReferees.delegat) {
      const existingDelegat = currentAssignments.find(a => a.role === 'Delegat');
      newAssignments.push({
        _id: existingDelegat?._id,
        userId: this.selectedReferees.delegat,
        role: 'Delegat',
        position: 1
      });
    }

    // Add pomoćni sudci
    this.selectedReferees.pomocniSudci.forEach(pomocni => {
      if (pomocni.userId) {
        newAssignments.push({
          _id: pomocni._id,
          userId: pomocni.userId,
          role: 'Pomoćni Sudac',
          position: pomocni.position
        });
      }
    });

    // Strategy: Remove ALL current assignments and add new ones
    // This is simpler and more reliable than trying to update individual assignments
    
    // Step 1: Remove all current assignments
    for (const currentAssignment of currentAssignments) {
      try {
        await this.basketballGameService.removeRefereeAssignment(this.game._id, currentAssignment._id).toPromise();
      } catch (error) {
        console.warn('Error removing assignment:', error);
        // Continue with other removals even if one fails
      }
    }

    // Step 2: Add all new assignments
    for (const newAssignment of newAssignments) {
      try {
        await this.basketballGameService.assignReferee(this.game._id, {
          userId: newAssignment.userId,
          role: newAssignment.role,
          position: newAssignment.position
        }).toPromise();
      } catch (error) {
        console.error('Error adding assignment:', error);
        throw error; // Stop if we can't add assignments
      }
    }
  }

  // Modal management
  closeModal() {
    this.close.emit();
    this.resetForm();
  }

  resetForm() {
    this.gameForm = {
      homeTeam: '',
      awayTeam: '',
      date: '',
      time: '',
      venue: '',
      competition: '',
      notes: '',
      status: 'Scheduled'
    };

    this.selectedReferees = {
      sudci: [
        { userId: '', position: 1 },
        { userId: '', position: 2 }
      ],
      delegat: '',
      pomocniSudci: [
        { userId: '', position: 1 },
        { userId: '', position: 2 }
      ]
    };

    this.currentStep = 1;
    this.errorMessage = '';
  }

  // Get minimum date (today for future games, no restriction for editing)
  getMinDate(): string {
    // For editing, we allow past dates since the game might have already happened
    return '';
  }
}