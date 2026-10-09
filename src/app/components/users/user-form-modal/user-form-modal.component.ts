import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ALL_COMPETITIONS,
  COMMISSIONER_ROLES,
  getRoleNames,
  incompatibleRolesMessage,
  isRoleCompatibleWithSelection,
  normalizeRoleAssignments,
  REFEREE_RANKS,
  USER_ROLES,
  UserRole
} from '../../../model/roles';
import { User } from '../../../model/user.model';
import { buildRoleAssignments, OFFICIAL_CAP_ROLES, toDateInputValue } from '../users.helpers';

export interface UserFormSave {
  username: string;
  name: string;
  surname: string;
  email: string;
  password?: string;
  birthdate: string;
  personalCode: string;
  address: string;
  roles: { name: UserRole; competitions: string[] }[];
  rang: string;
  najvisaLiga: string;
}

@Component({
  selector: 'app-user-form-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-form-modal.component.html',
  styleUrl: './user-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserFormModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() isBusy = false;
  @Input() user: User | null = null;
  @Input() serverError = '';
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<UserFormSave>();

  readonly allRoles = USER_ROLES;
  readonly competitions = ALL_COMPETITIONS;
  readonly ranks = REFEREE_RANKS;
  readonly commissionerRoles = COMMISSIONER_ROLES;
  readonly officialCapRoles = OFFICIAL_CAP_ROLES;

  selectedRoles = new Set<UserRole>();
  competitionsByRole: Partial<Record<UserRole, string[]>> = {};
  formError = '';

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    name: ['', Validators.required],
    surname: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    birthdate: ['', Validators.required],
    personalCode: ['', Validators.required],
    address: ['', Validators.required],
    rang: [''],
    najvisaLiga: ['']
  });

  get isEdit(): boolean {
    return !!this.user;
  }

  get needsOfficialCap(): boolean {
    return OFFICIAL_CAP_ROLES.some((role) => this.selectedRoles.has(role));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] || changes['user']) {
      this.hydrateForm();
    }
  }

  isRoleSelected(role: UserRole): boolean {
    return this.selectedRoles.has(role);
  }

  isRoleBlocked(role: UserRole): boolean {
    return !isRoleCompatibleWithSelection(role, [...this.selectedRoles]);
  }

  toggleRole(role: UserRole): void {
    if (this.selectedRoles.has(role)) {
      this.selectedRoles.delete(role);
      delete this.competitionsByRole[role];
    } else {
      if (this.isRoleBlocked(role)) {
        this.formError = incompatibleRolesMessage([...this.selectedRoles, role]) || '';
        return;
      }
      this.formError = '';
      this.selectedRoles.add(role);
      if (COMMISSIONER_ROLES.includes(role) && !this.competitionsByRole[role]) {
        this.competitionsByRole[role] = [];
      }
    }
    this.selectedRoles = new Set(this.selectedRoles);
    this.competitionsByRole = { ...this.competitionsByRole };
  }

  hasCompetition(role: UserRole, competition: string): boolean {
    return (this.competitionsByRole[role] || []).includes(competition);
  }

  toggleCompetition(role: UserRole, competition: string): void {
    const current = new Set(this.competitionsByRole[role] || []);
    if (current.has(competition)) {
      current.delete(competition);
    } else {
      current.add(competition);
    }
    this.competitionsByRole = { ...this.competitionsByRole, [role]: [...current] };
  }

  coversAllCompetitions(role: UserRole): boolean {
    return (this.competitionsByRole[role] || []).length === 0;
  }

  setAllCompetitions(role: UserRole, all: boolean): void {
    this.competitionsByRole = {
      ...this.competitionsByRole,
      [role]: all ? [] : [...ALL_COMPETITIONS]
    };
  }

  onAllCompetitionsChange(role: UserRole, event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    this.setAllCompetitions(role, checked);
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget && !this.isBusy) {
      this.close.emit();
    }
  }

  submit(): void {
    this.formError = '';
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.formError = 'Popunite obavezna polja.';
      return;
    }
    if (!this.selectedRoles.size) {
      this.formError = 'Odaberite barem jednu ulogu.';
      return;
    }
    const roleConflict = incompatibleRolesMessage([...this.selectedRoles]);
    if (roleConflict) {
      this.formError = roleConflict;
      return;
    }

    const raw = this.form.getRawValue();
    if (!this.isEdit && !raw.password.trim()) {
      this.formError = 'Lozinka je obavezna za novog korisnika.';
      return;
    }
    if (raw.password.trim() && raw.password.trim().length < 8) {
      this.formError = 'Lozinka mora imati najmanje 8 znakova.';
      return;
    }

    const payload: UserFormSave = {
      username: raw.username.trim(),
      name: raw.name.trim(),
      surname: raw.surname.trim(),
      email: raw.email.trim(),
      birthdate: raw.birthdate,
      personalCode: raw.personalCode.trim(),
      address: raw.address.trim(),
      roles: buildRoleAssignments([...this.selectedRoles], this.competitionsByRole),
      rang: this.needsOfficialCap ? raw.rang : '',
      najvisaLiga: this.needsOfficialCap ? raw.najvisaLiga : ''
    };
    if (raw.password.trim()) {
      payload.password = raw.password.trim();
    }
    this.save.emit(payload);
  }

  private hydrateForm(): void {
    this.formError = '';
    this.selectedRoles = new Set();
    this.competitionsByRole = {};
    if (!this.user) {
      this.form.reset({
        username: '',
        name: '',
        surname: '',
        email: '',
        password: '',
        birthdate: '',
        personalCode: '',
        address: '',
        rang: '',
        najvisaLiga: ''
      });
      return;
    }

    const assignments = normalizeRoleAssignments(this.user);
    assignments.forEach((assignment) => {
      this.selectedRoles.add(assignment.name as UserRole);
      if (COMMISSIONER_ROLES.includes(assignment.name as UserRole)) {
        this.competitionsByRole[assignment.name as UserRole] = [...(assignment.competitions || [])];
      }
    });
    if (!this.selectedRoles.size) {
      getRoleNames(this.user).forEach((name) => this.selectedRoles.add(name as UserRole));
    }

    this.form.reset({
      username: this.user.username,
      name: this.user.name,
      surname: this.user.surname,
      email: this.user.email,
      password: '',
      birthdate: toDateInputValue(this.user.birthdate),
      personalCode: this.user.personalCode,
      address: this.user.address,
      rang: this.user.rang || '',
      najvisaLiga: this.user.najvisaLiga || ''
    });
  }
}
