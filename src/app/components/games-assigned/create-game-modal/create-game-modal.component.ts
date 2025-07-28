import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CreateGameRequest, GameFormData, RefereeAssignmentData, RefereeSelection } from '../../../model/basketballGame.model';
import { User } from '../../../model/user.model';
import { BasketballGameService } from '../../../services/basketballGame.service';
import { UserService } from '../../../services/user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


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
  errorMessage = '';
  currentStep = 1; // 1: Game details, 2: Referee assignments

  constructor(
    private basketballGameService: BasketballGameService,
    private userService: UserService
  ) {}

  ngOnInit() {
    if (this.isOpen) {
      this.loadReferees();
    }
  }

  ngOnChanges() {
    if (this.isOpen && this.currentStep === 1) {
      this.loadReferees();
      this.resetForm();
    }
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

  // Get available referees (excluding already selected ones)
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

      // Assign all referees
      for (const assignment of assignments) {
        await this.basketballGameService.assignReferee(createdGame._id, assignment).toPromise();
      }

      // Emit success
      this.gameCreated.emit(createdGame);
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
