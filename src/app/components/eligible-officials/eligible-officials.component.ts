import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { UserService, EligibleOfficialsGroup } from '../../services/user.service';

@Component({
  selector: 'app-eligible-officials',
  imports: [CommonModule, FormsModule, HeaderComponent, SidebarComponent],
  templateUrl: './eligible-officials.component.html',
  styleUrl: './eligible-officials.component.scss'
})
export class EligibleOfficialsComponent implements OnInit {
  groups: EligibleOfficialsGroup[] = [];
  isLoading = false;
  errorMessage = '';
  selectedRole = 'Sudac';
  readonly itemsPerPage = 10;
  leaguePages: Record<string, number> = {};
  roleOptions = [
    { value: 'Sudac', label: 'Sudac' },
    { value: 'Delegat', label: 'Delegat' },
    { value: 'Kontrolor', label: 'Kontrolor' },
    { value: '', label: 'Sve uloge' }
  ];

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadOfficials();
  }

  get filteredGroups(): EligibleOfficialsGroup[] {
    return this.groups
      .map((group) => ({
        ...group,
        officials: this.selectedRole
          ? group.officials.filter((person) => person.roles.includes(this.selectedRole))
          : group.officials
      }))
      .filter((group) => group.officials.length);
  }

  onRoleChange(): void {
    this.leaguePages = {};
  }

  getLeaguePage(competition: string): number {
    return this.leaguePages[competition] || 1;
  }

  getPagedOfficials(group: EligibleOfficialsGroup) {
    const start = (this.getLeaguePage(group.competition) - 1) * this.itemsPerPage;
    return group.officials.slice(start, start + this.itemsPerPage);
  }

  getTotalPages(group: EligibleOfficialsGroup): number {
    return Math.max(1, Math.ceil(group.officials.length / this.itemsPerPage));
  }

  goToPage(competition: string, page: number, group: EligibleOfficialsGroup): void {
    const totalPages = this.getTotalPages(group);
    if (page >= 1 && page <= totalPages) {
      this.leaguePages[competition] = page;
    }
  }

  getVisiblePages(group: EligibleOfficialsGroup): number[] {
    const totalPages = this.getTotalPages(group);
    const currentPage = this.getLeaguePage(group.competition);
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    const pages: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  loadOfficials(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.userService.getEligibleOfficials().subscribe({
      next: (response) => {
        this.groups = response.competitions || [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Greška pri učitavanju popisa osoba.';
        this.isLoading = false;
      }
    });
  }

  roleLabel(roles: string[]): string {
    return roles.length ? roles.join(', ') : '—';
  }
}
