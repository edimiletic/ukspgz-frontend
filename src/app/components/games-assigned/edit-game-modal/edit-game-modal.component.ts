// src/app/components/games-assigned/edit-game-modal/edit-game-modal.component.ts
import { CommonModule } from '@angular/common';
import { BasketballGame, CreateGameRequest, GameFormData, NominationRejection, RefereeAssignmentData, RefereeSelection } from '../../../model/basketballGame.model';
import { User } from '../../../model/user.model';
import { UserService } from '../../../services/user.service';
import { BasketballGameService } from './../../../services/basketballGame.service';
import { AbsenceService } from '../../../services/absence.service';
import { Absence } from '../../../model/absence.model';
import { AuthService } from '../../../services/login.service';
import { CatalogService } from '../../../services/catalog.service';
import { CatalogTeam, CatalogVenue } from '../../../model/catalog.model';
import { firstValueFrom } from 'rxjs';
import { ALL_COMPETITIONS, canManageCalendar, canNominateOfficials, getCalendarCompetitions, isAdminUser, teamEligibleForCompetition, userHasRole } from '../../../model/roles';
import {
  assignmentUserId,
  eligibleOfficials as filterEligibleOfficials,
  gameFormError,
  isRefereeAvailable,
  kontrolorRequiredForForm,
  refereeAssignmentError,
  sudacSlotsFromAssignments,
  unavailableOfficialsCount
} from './edit-game-modal.helpers';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameDetailsStepComponent } from './game-details-step.component';
import { GameNominationsStepComponent } from './game-nominations-step.component';

@Component({
  selector: 'app-game-form-modal',
  imports: [CommonModule, FormsModule, GameDetailsStepComponent, GameNominationsStepComponent],
  templateUrl: './edit-game-modal.component.html',
  styleUrl: './edit-game-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class EditGameModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() game: BasketballGame | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() gameCreated = new EventEmitter<any>();
  @Output() gameUpdated = new EventEmitter<any>();

  get isCreateMode(): boolean {
    return !this.game;
  }

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

  teams: CatalogTeam[] = [];
  venues: CatalogVenue[] = [];

  // Add these properties after the existing ones
  availableSudciForIndex: { [key: number]: User[] } = {};
  availableDelegati: User[] = [];
  availableKontrolori: User[] = [];

  unavailableCounts = {
    sudci: 0,
    delegati: 0
  };

  rejections: NominationRejection[] = [];

  // Referee data
  availableReferees: {
    sudci: User[];
    delegati: User[];
    kontrolori: User[];
  } = {
    sudci: [],
    delegati: [],
    kontrolori: []
  };

  selectedReferees: RefereeSelection = {
    sudci: [],
    delegat: '',
    kontrolor: ''
  };

  get competitions(): string[] {
    const calendarCompetitions = getCalendarCompetitions(this.authService.currentUserValue);
    if (this.gameForm.competition && !calendarCompetitions.includes(this.gameForm.competition)) {
      return [this.gameForm.competition, ...calendarCompetitions];
    }
    return calendarCompetitions.length ? calendarCompetitions : ALL_COMPETITIONS;
  }

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
  isLoadingAbsences = false;
  errorMessage = '';
  currentStep = 1; // 1: Game details, 2: Referee assignments

  // Absence data for availability checking
  allAbsences: Absence[] = [];
  private gamesOnSelectedDate: Array<{
    _id: string;
    time: string;
    competition: string;
    refereeAssignments?: Array<{ userId: any; assignmentStatus: string }>;
  }> = [];
  private loadedScheduleDate = '';

  constructor(
    private basketballGameService: BasketballGameService,
    private userService: UserService,
    private absenceService: AbsenceService,
    private authService: AuthService,
    private catalogService: CatalogService,
    private cdr: ChangeDetectorRef
  ) {}

  private refreshView(): void {
    this.cdr.markForCheck();
  }

  canManageCalendar(): boolean {
    if (this.isCreateMode) {
      return true;
    }
    return canManageCalendar(this.authService.currentUserValue, this.gameForm.competition);
  }

  canNominateOfficials(): boolean {
    return canNominateOfficials(this.authService.currentUserValue, this.gameForm.competition);
  }

  shouldShowNominations(): boolean {
    return this.canNominateOfficials();
  }

  showKontrolorField(): boolean {
    return this.canNominateOfficials();
  }

  private teamCompetitions(teamName: string): string[] {
    return this.teams.find((team) => team.name === teamName)?.competitions || [];
  }

  kontrolorRequired(): boolean {
    return kontrolorRequiredForForm(
      this.gameForm.competition,
      this.teamCompetitions(this.gameForm.homeTeam),
      this.teamCompetitions(this.gameForm.awayTeam)
    );
  }

  kontrolorHeading(): string {
    return this.kontrolorRequired() ? 'Kontrolor (obavezno)' : 'Kontrolor (opcionalno)';
  }

  eligibleOfficials(refs: User[]): User[] {
    return filterEligibleOfficials(refs, this.gameForm.competition, this.authService.currentUserValue);
  }

  ngOnInit() {
    this.loadCatalog();
    if (this.isOpen && this.game) {
      this.loadReferees();
      this.loadAbsences();
      this.loadRejectionHistory();
      this.populateForm();
    }
  }

  loadCatalog() {
    this.catalogService.getTeams().subscribe({
      next: (teams) => { this.teams = teams || []; this.refreshView(); },
      error: () => { this.teams = []; this.refreshView(); }
    });
    this.catalogService.getVenues().subscribe({
      next: (venues) => { this.venues = venues || []; this.refreshView(); },
      error: () => { this.venues = []; this.refreshView(); }
    });
  }

  get catalogTeamNames(): string[] {
    if (!this.gameForm.competition) return [];
    return this.teams
      .filter((team) => teamEligibleForCompetition(team.competitions, this.gameForm.competition))
      .map((team) => team.name)
      .sort((a, b) => a.localeCompare(b, 'hr'));
  }

  get hasTeamCatalog(): boolean {
    return this.catalogTeamNames.length > 0;
  }

  get teamOptions(): string[] {
    const names = [...this.catalogTeamNames];
    if (this.gameForm.homeTeam && !names.includes(this.gameForm.homeTeam)) {
      names.unshift(this.gameForm.homeTeam);
    }
    return names;
  }

  get awayTeamOptions(): string[] {
    const names = this.teamOptions.filter((name) => name !== this.gameForm.homeTeam);
    if (this.gameForm.awayTeam && !names.includes(this.gameForm.awayTeam)) {
      names.unshift(this.gameForm.awayTeam);
    }
    return names;
  }

  get venueOptions(): string[] {
    const names = this.venues.map((venue) => venue.name).sort((a, b) => a.localeCompare(b, 'hr'));
    if (this.gameForm.venue && !names.includes(this.gameForm.venue)) {
      names.unshift(this.gameForm.venue);
    }
    return names;
  }

  onCompetitionChange() {
    if (this.gameForm.homeTeam && !this.catalogTeamNames.includes(this.gameForm.homeTeam)) {
      this.gameForm.homeTeam = '';
    }
    if (this.gameForm.awayTeam && !this.catalogTeamNames.includes(this.gameForm.awayTeam)) {
      this.gameForm.awayTeam = '';
    }
    this.updateAvailableReferees();
    this.clearUnavailableSelections();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.isOpen) {
      return;
    }
    if (!changes['isOpen'] && !changes['game']) {
      return;
    }

    this.errorMessage = '';
    this.loadCatalog();
    this.loadReferees();
    this.loadAbsences();
    this.loadRejectionHistory();

    if (this.game) {
      this.populateForm();
      this.currentStep = this.canManageCalendar() || !this.shouldShowNominations() ? 1 : 2;
    } else {
      this.resetForm();
      this.currentStep = 1;
    }
  }

  loadRejectionHistory() {
    const gameId = this.game?._id;
    if (!gameId) {
      this.rejections = [];
      this.refreshView();
      return;
    }

    this.basketballGameService.getRejectionHistory(gameId).subscribe({
      next: (res) => {
        this.rejections = res?.rejections || [];
        this.refreshView();
      },
      error: () => {
        this.rejections = [];
        this.refreshView();
      }
    });
  }

  loadAbsences() {
    this.isLoadingAbsences = true;
    this.absenceService.getAllAbsences().subscribe({
      next: (absences) => {
        this.allAbsences = absences || [];
        this.isLoadingAbsences = false;
        if (this.isOpen && this.gameForm.date && this.gameForm.time) {
          this.refreshAvailability();
        }
        this.refreshView();
      },
      error: (error) => {
        console.error('Error loading absences in edit modal:', error);
        this.allAbsences = [];
        this.isLoadingAbsences = false;
        this.refreshView();
      }
    });
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

    let delegat = '';
    let kontrolor = '';

    this.game.refereeAssignments.forEach(assignment => {
      switch (assignment.role) {
        case 'Delegat':
          delegat = assignment.userId._id;
          break;
        case 'Kontrolor':
          kontrolor = assignment.userId._id;
          break;
      }
    });

    this.selectedReferees = {
      sudci: sudacSlotsFromAssignments(this.game.refereeAssignments),
      delegat,
      kontrolor
    };
  }

  loadReferees() {
    this.isLoadingReferees = true;
    this.userService.getReferees().subscribe({
      next: (referees) => {
        this.availableReferees = {
          sudci: referees.filter(ref => userHasRole(ref, 'Sudac')),
          delegati: referees.filter(ref => userHasRole(ref, 'Delegat')),
          kontrolori: referees.filter(ref => userHasRole(ref, 'Kontrolor'))
        };
        this.isLoadingReferees = false;
        if (this.currentStep === 2) {
          this.initializeAvailabilityArrays();
        }
        this.refreshView();
      },
      error: (error) => {
        console.error('Error loading referees:', error);
        this.errorMessage = 'Greška pri učitavanju sudaca.';
        this.isLoadingReferees = false;
        this.refreshView();
      }
    });
  }

  private async loadScheduleForDate(): Promise<void> {
    if (!this.gameForm.date) {
      this.gamesOnSelectedDate = [];
      this.loadedScheduleDate = '';
      return;
    }
    if (this.loadedScheduleDate === this.gameForm.date) {
      return;
    }
    try {
      this.gamesOnSelectedDate = await firstValueFrom(
        this.basketballGameService.getGamesOnDate(this.gameForm.date)
      ) || [];
    } catch (error) {
      console.error('Error loading games for date:', error);
      this.gamesOnSelectedDate = [];
    }
    this.loadedScheduleDate = this.gameForm.date;
  }

  private isOfficialFree(referee: User): boolean {
    return isRefereeAvailable(referee, {
      date: this.gameForm.date,
      time: this.gameForm.time,
      competition: this.gameForm.competition,
      currentGameId: this.game?._id,
      absences: this.allAbsences,
      gamesOnDate: this.gamesOnSelectedDate
    });
  }

  getUnavailableRefereesCount(role: 'Sudac' | 'Delegat'): number {
    const pool =
      role === 'Sudac'
        ? this.eligibleOfficials(this.availableReferees.sudci)
        : this.eligibleOfficials(this.availableReferees.delegati);
    return unavailableOfficialsCount(
      pool,
      (ref) => this.isOfficialFree(ref),
      !!(this.gameForm.date && this.gameForm.time)
    );
  }

  onDateChange() {
    if (!this.gameForm.date) return;
    this.clearUnavailableSelections();
  }

  // Update the nextStep method to initialize arrays
  async nextStep() {
    if (this.validateGameForm()) {
      if (!this.shouldShowNominations()) {
        await this.saveGame();
        return;
      }
      this.currentStep = 2;
      this.errorMessage = '';
      await this.initializeAvailabilityArrays();
      this.refreshView();
    }
  }

  previousStep() {
    this.currentStep = 1;
    this.errorMessage = '';
  }

  // Validation
  validateGameForm(): boolean {
    const error = gameFormError(this.gameForm);
    if (error) {
      this.errorMessage = error;
      return false;
    }
    return true;
  }

  validateRefereeAssignments(): boolean {
    const error = refereeAssignmentError(this.selectedReferees, {
      canNominate: this.shouldShowNominations(),
      kontrolorRequired: this.kontrolorRequired()
    });
    if (error) {
      this.errorMessage = error;
      return false;
    }
    return true;
  }

  // Referee management methods
  addSudac() {
    if (this.selectedReferees.sudci.length < 3) {
      const nextPosition = this.selectedReferees.sudci.length + 1;
      this.selectedReferees.sudci.push({ userId: '', position: nextPosition });
      this.updateAvailableReferees();
    }
  }

  removeSudac(index: number) {
    if (this.selectedReferees.sudci.length > 2) {
      this.selectedReferees.sudci.splice(index, 1);
      this.selectedReferees.sudci.forEach((sudac, i) => {
        sudac.position = i + 1;
      });
      this.updateAvailableReferees();
    }
  }

  getAvailableSudci(currentIndex: number): User[] {
    const excludedIds = [
      ...this.selectedReferees.sudci.map((s, index) => index !== currentIndex ? s.userId : null),
      this.selectedReferees.delegat,
      this.selectedReferees.kontrolor
    ].filter((id): id is string => !!id);

    return this.eligibleOfficials(this.availableReferees.sudci).filter(ref =>
      !excludedIds.includes(ref._id) && this.isOfficialFree(ref)
    );
  }

  getAvailableDelegati(): User[] {
    const excludedIds = [
      ...this.selectedReferees.sudci.map(s => s.userId),
      this.selectedReferees.kontrolor
    ].filter((id): id is string => !!id);

    return this.eligibleOfficials(this.availableReferees.delegati).filter(ref =>
      !excludedIds.includes(ref._id) && this.isOfficialFree(ref)
    );
  }

  // Get newly assigned referees for notification tracking
  getNewlyAssignedReferees(): string[] {
    if (!this.game) return [];

    const currentUserIds = new Set(this.game.refereeAssignments.map(a => a.userId._id));
    const newUserIds = [
      ...this.selectedReferees.sudci.map(s => s.userId).filter(id => id),
      this.selectedReferees.delegat,
      this.selectedReferees.kontrolor
    ].filter(id => id);

    const newlyAssigned = newUserIds.filter(userId => !currentUserIds.has(userId));
    
    // Get referee names for display
    const newRefereeNames: string[] = [];
    
    newlyAssigned.forEach(userId => {
      const referee = [
        ...this.availableReferees.sudci,
        ...this.availableReferees.delegati,
        ...this.availableReferees.kontrolori
      ].find(ref => ref._id === userId);
      
      if (referee) {
        newRefereeNames.push(`${referee.name} ${referee.surname}`);
      }
    });

    return newRefereeNames;
  }

  async saveGame() {
    if (this.isCreateMode) {
      await this.createGame();
      return;
    }
    await this.updateGame();
  }

  async createGame() {
    if (this.shouldShowNominations() && !this.validateRefereeAssignments()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const gameData: CreateGameRequest = {
        homeTeam: this.gameForm.homeTeam.trim(),
        awayTeam: this.gameForm.awayTeam.trim(),
        date: this.gameForm.date,
        time: this.gameForm.time,
        venue: this.gameForm.venue.trim(),
        competition: this.gameForm.competition,
        notes: this.gameForm.notes.trim()
      };

      const createdGame = await firstValueFrom(this.basketballGameService.createGame(gameData));
      if (!createdGame) {
        throw new Error('Failed to create game');
      }

      const assignments: RefereeAssignmentData[] = [];
      this.selectedReferees.sudci.forEach(sudac => {
        if (sudac.userId) {
          assignments.push({ userId: sudac.userId, role: 'Sudac', position: sudac.position });
        }
      });
      if (this.selectedReferees.delegat) {
        assignments.push({ userId: this.selectedReferees.delegat, role: 'Delegat', position: 1 });
      }
      if (this.selectedReferees.kontrolor && this.showKontrolorField()) {
        assignments.push({ userId: this.selectedReferees.kontrolor, role: 'Kontrolor', position: 1 });
      }

      const failedAssignments: string[] = [];
      const releasedNominations: Array<{ homeTeam: string; awayTeam: string; competition: string }> = [];
      for (const assignment of assignments) {
        try {
          const result: any = await firstValueFrom(
            this.basketballGameService.assignReferee(createdGame._id, assignment)
          );
          if (result?.releasedNominations?.length) {
            releasedNominations.push(...result.releasedNominations);
          }
        } catch {
          failedAssignments.push(`${assignment.role}`);
        }
      }

      let message = assignments.length
        ? `Utakmica kreirana i ${assignments.length - failedAssignments.length} nominacija poslano!`
        : 'Utakmica je uspješno kreirana';
      if (failedAssignments.length) {
        message += ` Nisu dodijeljene: ${failedAssignments.join(', ')}.`;
      }
      if (releasedNominations.length) {
        const released = releasedNominations
          .map(item => `${item.homeTeam} vs ${item.awayTeam} (${item.competition})`)
          .join(', ');
        message += ` Niže nominacije su puštene i trebaju novu osobu: ${released}.`;
      }

      this.gameCreated.emit({ ...createdGame, message });
      this.closeModal();
    } catch (error: any) {
      console.error('Error creating game:', error);
      this.errorMessage = error?.error?.error || 'Greška pri kreiranju utakmice. Molimo pokušajte ponovo.';
    } finally {
      this.isLoading = false;
      this.refreshView();
    }
  }

  // Form submission
  async updateGame() {
    if ((this.shouldShowNominations() && !this.validateRefereeAssignments()) || !this.game) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      let updatedGame = this.game;

      const assignmentResult = this.shouldShowNominations()
        ? await this.updateRefereeAssignments()
        : { newAssignments: 0, releasedNominations: [] as Array<{ homeTeam: string; awayTeam: string; competition: string }> };

      if (this.canManageCalendar()) {
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

        updatedGame = await firstValueFrom(this.basketballGameService.updateGame(this.game._id, gameData)) || this.game;
      }

      let successMessage = 'Utakmica je uspješno ažurirana!';
      
      if (assignmentResult && assignmentResult.newAssignments > 0) {
        successMessage += ` ${assignmentResult.newAssignments} nova nominacija poslana!`;
      }
      if (assignmentResult && 'releasedNominations' in assignmentResult && assignmentResult.releasedNominations?.length) {
        const released = assignmentResult.releasedNominations
          .map(item => `${item.homeTeam} vs ${item.awayTeam} (${item.competition})`)
          .join(', ');
        successMessage += ` Niže nominacije su puštene i trebaju novu osobu: ${released}.`;
      }

      // Emit success with enhanced message
      this.gameUpdated.emit({
        ...updatedGame,
        message: successMessage
      });
      this.closeModal();

    } catch (error) {
      console.error('Error updating game:', error);
      this.errorMessage = 'Greška pri ažuriranju utakmice. Molimo pokušajte ponovo.';
    } finally {
      this.isLoading = false;
      this.refreshView();
    }
  }

  private managedAssignmentRoles(): Array<'Sudac' | 'Delegat' | 'Kontrolor'> {
    const roles: Array<'Sudac' | 'Delegat' | 'Kontrolor'> = [];
    if (this.canNominateOfficials()) {
      roles.push('Sudac', 'Delegat', 'Kontrolor');
    }
    return roles;
  }

  private async updateRefereeAssignments() {
    if (!this.game) return;

    const currentAssignments = this.game.refereeAssignments;
    const managedRoles = this.managedAssignmentRoles();
    const newAssignments: RefereeAssignmentData[] = [];

    if (this.canNominateOfficials()) {
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

      if (this.selectedReferees.delegat) {
        const existingDelegat = currentAssignments.find(a => a.role === 'Delegat');
        newAssignments.push({
          _id: existingDelegat?._id,
          userId: this.selectedReferees.delegat,
          role: 'Delegat',
          position: 1
        });
      }

      if (this.selectedReferees.kontrolor && this.showKontrolorField()) {
        const existingKontrolor = currentAssignments.find(a => a.role === 'Kontrolor');
        newAssignments.push({
          _id: existingKontrolor?._id,
          userId: this.selectedReferees.kontrolor,
          role: 'Kontrolor',
          position: 1
        });
      }
    }

    const currentUserIds = new Set(currentAssignments.map(a => a.userId._id));
    const newUserIds = newAssignments.map(a => a.userId);
    const newlyAssignedUsers = newUserIds.filter(userId => !currentUserIds.has(userId));
    const assignmentKey = (userId: string, role: string) => `${userId}:${role}`;

    const currentManaged = currentAssignments.filter(assignment => managedRoles.includes(assignment.role));
    const removedUserIds: string[] = [];

    for (const currentAssignment of currentManaged) {
      const key = assignmentKey(assignmentUserId(currentAssignment), currentAssignment.role);
      const desired = newAssignments.find(assignment => assignmentKey(assignment.userId, assignment.role) === key);

      if (!desired) {
        removedUserIds.push(assignmentUserId(currentAssignment));
        await firstValueFrom(this.basketballGameService.removeRefereeAssignment(this.game._id, currentAssignment._id));
        continue;
      }

      if (desired.position && desired.position !== currentAssignment.position) {
        try {
          await firstValueFrom(this.basketballGameService.updateRefereeAssignment(this.game._id, currentAssignment._id, {
            position: desired.position
          }));
        } catch (error) {
          console.warn('Error updating assignment position:', error);
        }
      }
    }

    const actuallyNewUsers: string[] = [];
    const releasedNominations: Array<{ homeTeam: string; awayTeam: string; competition: string }> = [];
    
    for (const newAssignment of newAssignments) {
      const alreadyAssigned = currentManaged.some(assignment =>
        assignmentKey(assignmentUserId(assignment), assignment.role) === assignmentKey(newAssignment.userId, newAssignment.role)
      );
      if (alreadyAssigned) {
        continue;
      }

      try {
        const result: any = await firstValueFrom(this.basketballGameService.assignReferee(this.game._id, {
          userId: newAssignment.userId,
          role: newAssignment.role,
          position: newAssignment.position
        }));

        if (result?.releasedNominations?.length) {
          releasedNominations.push(...result.releasedNominations);
        }

        if (newlyAssignedUsers.includes(newAssignment.userId)) {
          actuallyNewUsers.push(newAssignment.userId);
        }
      } catch (error) {
        console.error('Error adding assignment:', error);
        throw error;
      }
    }

    if (removedUserIds.length && actuallyNewUsers.length) {
      try {
        await firstValueFrom(this.basketballGameService.notifyColleagueReplacement(this.game._id, {
          removedUserIds,
          addedUserIds: actuallyNewUsers
        }));
      } catch (error) {
        console.warn('Error notifying remaining officials about replacement:', error);
      }
    }

    return {
      totalAssignments: newAssignments.length,
      newAssignments: actuallyNewUsers.length,
      releasedNominations
    };
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
        { userId: '', position: 2 },
        { userId: '', position: 3 }
      ],
      delegat: '',
      kontrolor: ''
    };

    this.currentStep = 1;
    this.errorMessage = '';
    this.allAbsences = [];
    this.gamesOnSelectedDate = [];
    this.loadedScheduleDate = '';
    this.rejections = [];
  }

 // Get minimum date (for editing, we allow past dates since the game might have already happened)
 getMinDate(): string {
   if (!this.isCreateMode && isAdminUser(this.authService.currentUserValue)) {
     return '';
   }
   const now = new Date();
   const month = String(now.getMonth() + 1).padStart(2, '0');
   const day = String(now.getDate()).padStart(2, '0');
   return `${now.getFullYear()}-${month}-${day}`;
 }

 // Add this method to initialize all availability arrays
 private async initializeAvailabilityArrays() {
   await this.refreshAvailability();
 }

 private async refreshAvailability() {
   if (!this.gameForm.date || !this.gameForm.time) {
     this.updateAvailableReferees();
     return;
   }
   await this.loadScheduleForDate();
   this.updateAvailableReferees();
   this.refreshView();
 }

 private updateAvailableReferees() {
   if (!this.gameForm.date || !this.gameForm.time) {
     this.availableDelegati = this.eligibleOfficials(this.availableReferees.delegati);
     this.availableKontrolori = this.eligibleOfficials(this.availableReferees.kontrolori);
     for (let i = 0; i < this.selectedReferees.sudci.length; i++) {
       this.availableSudciForIndex[i] = this.eligibleOfficials(this.availableReferees.sudci);
     }
     this.unavailableCounts = { sudci: 0, delegati: 0 };
     return;
   }

   for (let i = 0; i < this.selectedReferees.sudci.length; i++) {
     this.availableSudciForIndex[i] = this.getAvailableSudci(i);
   }

   this.availableDelegati = this.getAvailableDelegati();
   this.availableKontrolori = this.eligibleOfficials(this.availableReferees.kontrolori).filter(ref =>
     ![
       ...this.selectedReferees.sudci.map(s => s.userId),
       this.selectedReferees.delegat
     ].includes(ref._id) && this.isOfficialFree(ref)
   );

   this.unavailableCounts = {
     sudci: this.getUnavailableRefereesCount('Sudac'),
     delegati: this.getUnavailableRefereesCount('Delegat')
   };
 }

 async onDateTimeChange() {
   if (!this.gameForm.date || !this.gameForm.time) {
     this.unavailableCounts = { sudci: 0, delegati: 0 };
     return;
   }

   await this.refreshAvailability();
   this.clearUnavailableSelections();
 }

 private clearUnavailableSelections() {
   this.selectedReferees.sudci.forEach((sudac, index) => {
     if (sudac.userId) {
       const isStillAvailable = this.availableSudciForIndex[index]?.some(ref => ref._id === sudac.userId);
       if (!isStillAvailable) {
         this.selectedReferees.sudci[index].userId = '';
       }
     }
   });

   if (this.selectedReferees.delegat) {
     const isStillAvailable = this.availableDelegati.some(ref => ref._id === this.selectedReferees.delegat);
     if (!isStillAvailable) {
       this.selectedReferees.delegat = '';
     }
   }

   if (this.selectedReferees.kontrolor) {
     const isStillAvailable = this.availableKontrolori.some(ref => ref._id === this.selectedReferees.kontrolor);
     if (!isStillAvailable) {
       this.selectedReferees.kontrolor = '';
     }
   }
 }

 onRefereeSelectionChange() {
   this.updateAvailableReferees();
 }
}