import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CreateGameRequest, GameFormData, RefereeAssignmentData, RefereeSelection } from '../../../model/basketballGame.model';
import { User } from '../../../model/user.model';
import { BasketballGameService } from '../../../services/basketballGame.service';
import { UserService } from '../../../services/user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AbsenceService } from '../../../services/absence.service';
import { Absence } from '../../../model/absence.model';


@Component({
  selector: 'app-create-game-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-game-modal.component.html',
  styleUrl: './create-game-modal.component.scss'
})
export class CreateGameModalComponent {
 @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() gameCreated = new EventEmitter<any>();

  // Form data
  gameForm: GameFormData = {
    homeTeam: '',
    awayTeam: '',
    date: '',
    time: '',
    venue: '',
    competition: '',
    notes: ''
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

  // State management
  isLoading = false;
  isLoadingReferees = false;
  isLoadingAbsences = false;
  errorMessage = '';
  currentStep = 1; // 1: Game details, 2: Referee assignments

  // Absence data for availability checking
  allAbsences: Absence[] = [];

  constructor(
    private basketballGameService: BasketballGameService,
    private userService: UserService,
    private absenceService: AbsenceService
  ) {}

  ngOnInit() {
    if (this.isOpen) {
      this.loadReferees();
    }
  }

  ngOnChanges() {
    if (this.isOpen && this.currentStep === 1) {
      this.loadReferees();
      this.loadAbsences();
      this.resetForm();
    }
  }

  loadAbsences() {
    this.isLoadingAbsences = true;
    this.absenceService.getAllAbsences().subscribe({
      next: (absences) => {
        this.allAbsences = absences;
        this.isLoadingAbsences = false;
        console.log('Loaded absences:', absences.length);
        console.log('Sample absence:', absences[0]); // Debug: check absence structure
      },
      error: (error) => {
        console.error('Error loading absences:', error);
        this.allAbsences = []; // Continue without absence checking
        this.isLoadingAbsences = false;
      }
    });
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
        console.log('Sample referee:', referees[0]); // Debug: check referee structure
        console.log('Referee fields:', Object.keys(referees[0] || {})); // Debug: check available fields
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
    
    // Check if date is in the future
    const gameDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (gameDate < today) {
      this.errorMessage = 'Datum utakmice ne može biti u prošlosti.';
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

  // Referee management
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

  // Check if a referee is available on the game date
  private isRefereeAvailable(referee: User, gameDate: string): boolean {
    if (!gameDate || this.allAbsences.length === 0) {
      return true; // If no date selected or no absences loaded, assume available
    }

    const selectedGameDate = new Date(gameDate);
    selectedGameDate.setHours(0, 0, 0, 0);

    // Check if referee has any absence that overlaps with game date
    const hasConflict = this.allAbsences.some(absence => {
      // Match by personal code since absences store userPersonalCode
      if (absence.userPersonalCode !== referee.personalCode) {
        return false;
      }

      const startDate = new Date(absence.startDate);
      const endDate = new Date(absence.endDate);
      
      // Reset times for accurate date comparison
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      // Check if game date falls within absence period
      const isConflict = selectedGameDate >= startDate && selectedGameDate <= endDate;
      
      // Debug logging
      if (isConflict) {
        console.log(`Referee ${referee.name} ${referee.surname} (${referee.personalCode}) is unavailable on ${gameDate}:`, {
          absence: absence,
          gameDate: selectedGameDate,
          startDate: startDate,
          endDate: endDate
        });
      }
      
      return isConflict;
    });

    return !hasConflict;
  }

  // Get available referees (excluding already selected ones AND those with absences)
  getAvailableSudci(currentIndex: number): User[] {
    console.log('Getting available sudci for date:', this.gameForm.date);
    console.log('Total absences loaded:', this.allAbsences.length);
    
    const selectedIds = this.selectedReferees.sudci
      .map((s, index) => index !== currentIndex ? s.userId : null)
      .filter(id => id);
    
    const otherSelectedIds = [
      this.selectedReferees.delegat,
      ...this.selectedReferees.pomocniSudci.map(s => s.userId)
    ].filter(id => id);

    const allExcludedIds = [...selectedIds, ...otherSelectedIds];
    
    const availableRefs = this.availableReferees.sudci.filter(ref => {
      const notSelected = !allExcludedIds.includes(ref._id);
      const isAvailable = this.isRefereeAvailable(ref, this.gameForm.date);
      
      console.log(`Sudac ${ref.name} ${ref.surname} (${ref.personalCode}): selected=${!notSelected}, available=${isAvailable}`);
      
      return notSelected && isAvailable;
    });
    
    console.log(`Available sudci: ${availableRefs.length} out of ${this.availableReferees.sudci.length}`);
    return availableRefs;
  }

  getAvailableDelegati(): User[] {
    console.log('Getting available delegati for date:', this.gameForm.date);
    
    const allSelectedIds = [
      ...this.selectedReferees.sudci.map(s => s.userId),
      ...this.selectedReferees.pomocniSudci.map(s => s.userId)
    ].filter(id => id);

    const availableRefs = this.availableReferees.delegati.filter(ref => {
      const notSelected = !allSelectedIds.includes(ref._id);
      const isAvailable = this.isRefereeAvailable(ref, this.gameForm.date);
      
      console.log(`Delegat ${ref.name} ${ref.surname} (${ref.personalCode}): selected=${!notSelected}, available=${isAvailable}`);
      
      return notSelected && isAvailable;
    });
    
    console.log(`Available delegati: ${availableRefs.length} out of ${this.availableReferees.delegati.length}`);
    return availableRefs;
  }

  getAvailablePomocniSudci(currentIndex: number): User[] {
    console.log('Getting available pomoćni sudci for date:', this.gameForm.date);
    
    const selectedIds = this.selectedReferees.pomocniSudci
      .map((s, index) => index !== currentIndex ? s.userId : null)
      .filter(id => id);
    
    const otherSelectedIds = [
      ...this.selectedReferees.sudci.map(s => s.userId),
      this.selectedReferees.delegat
    ].filter(id => id);

    const allExcludedIds = [...selectedIds, ...otherSelectedIds];
    
    const availableRefs = this.availableReferees.pomocniSudci.filter(ref => {
      const notSelected = !allExcludedIds.includes(ref._id);
      const isAvailable = this.isRefereeAvailable(ref, this.gameForm.date);
      
      console.log(`Pomoćni sudac ${ref.name} ${ref.surname} (${ref.personalCode}): selected=${!notSelected}, available=${isAvailable}`);
      
      return notSelected && isAvailable;
    });
    
    console.log(`Available pomoćni sudci: ${availableRefs.length} out of ${this.availableReferees.pomocniSudci.length}`);
    return availableRefs;
  }

  // Get count of unavailable referees for display
  getUnavailableRefereesCount(role: 'Sudac' | 'Delegat' | 'Pomoćni Sudac'): number {
    if (!this.gameForm.date) return 0;

    let totalReferees = 0;
    let availableReferees = 0;

    switch (role) {
      case 'Sudac':
        totalReferees = this.availableReferees.sudci.length;
        availableReferees = this.availableReferees.sudci.filter(ref => 
          this.isRefereeAvailable(ref, this.gameForm.date)
        ).length;
        break;
      case 'Delegat':
        totalReferees = this.availableReferees.delegati.length;
        availableReferees = this.availableReferees.delegati.filter(ref => 
          this.isRefereeAvailable(ref, this.gameForm.date)
        ).length;
        break;
      case 'Pomoćni Sudac':
        totalReferees = this.availableReferees.pomocniSudci.length;
        availableReferees = this.availableReferees.pomocniSudci.filter(ref => 
          this.isRefereeAvailable(ref, this.gameForm.date)
        ).length;
        break;
    }

    return totalReferees - availableReferees;
  }

  // Check if date change should clear selected referees who are now unavailable
  onDateChange() {
    if (!this.gameForm.date) return;

    // Check if any selected referees are now unavailable and clear them
    this.selectedReferees.sudci.forEach((sudac, index) => {
      if (sudac.userId) {
        const referee = this.availableReferees.sudci.find(ref => ref._id === sudac.userId);
        if (referee && !this.isRefereeAvailable(referee, this.gameForm.date)) {
          this.selectedReferees.sudci[index].userId = '';
        }
      }
    });

    if (this.selectedReferees.delegat) {
      const delegat = this.availableReferees.delegati.find(ref => ref._id === this.selectedReferees.delegat);
      if (delegat && !this.isRefereeAvailable(delegat, this.gameForm.date)) {
        this.selectedReferees.delegat = '';
      }
    }

    this.selectedReferees.pomocniSudci.forEach((pomocni, index) => {
      if (pomocni.userId) {
        const referee = this.availableReferees.pomocniSudci.find(ref => ref._id === pomocni.userId);
        if (referee && !this.isRefereeAvailable(referee, this.gameForm.date)) {
          this.selectedReferees.pomocniSudci[index].userId = '';
        }
      }
    });
  }
// In create-game-modal.component.ts
async createGame() {
  if (!this.validateRefereeAssignments()) {
    return;
  }

  this.isLoading = true;
  this.errorMessage = '';

  try {
    // Create the game
    const gameData: CreateGameRequest = {
      homeTeam: this.gameForm.homeTeam.trim(),
      awayTeam: this.gameForm.awayTeam.trim(),
      date: this.gameForm.date,
      time: this.gameForm.time,
      venue: this.gameForm.venue.trim(),
      competition: this.gameForm.competition,
      notes: this.gameForm.notes.trim()
    };

    const createdGame = await this.basketballGameService.createGame(gameData).toPromise();
    
    if (!createdGame) {
      throw new Error('Failed to create game');
    }

    // Assign referees
    const assignments: RefereeAssignmentData[] = [];

    // Add sudci
    this.selectedReferees.sudci.forEach(sudac => {
      if (sudac.userId) {
        assignments.push({
          userId: sudac.userId,
          role: 'Sudac',
          position: sudac.position
        });
      }
    });

    // Add delegat
    if (this.selectedReferees.delegat) {
      assignments.push({
        userId: this.selectedReferees.delegat,
        role: 'Delegat',
        position: 1
      });
    }

    // Add pomoćni sudci
    this.selectedReferees.pomocniSudci.forEach(pomocni => {
      if (pomocni.userId) {
        assignments.push({
          userId: pomocni.userId,
          role: 'Pomoćni Sudac',
          position: pomocni.position
        });
      }
    });

    // 🎯 Assign all referees (each will create a notification automatically)
    for (const assignment of assignments) {
      await this.basketballGameService.assignReferee(createdGame._id, assignment).toPromise();
    }

    // Show success message indicating notifications were sent
    this.gameCreated.emit({
      ...createdGame,
      message: `Utakmica kreirana i ${assignments.length} nominacija poslano!`
    });
    this.closeModal();

  } catch (error) {
    console.error('Error creating game:', error);
    this.errorMessage = 'Greška pri kreiranju utakmice. Molimo pokušajte ponovo.';
  } finally {
    this.isLoading = false;
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
      notes: ''
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

  // Get minimum date (today)
  getMinDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }
}