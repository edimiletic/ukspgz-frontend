import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GamesListFilters } from './games-assigned.helpers';

@Component({
  selector: 'app-games-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './games-filter-bar.component.html'
})
export class GamesFilterBarComponent {
  @Input({ required: true }) filterValues!: GamesListFilters;
  @Input() isMobileOpen = false;
  @Output() isMobileOpenChange = new EventEmitter<boolean>();
  @Output() filterChange = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  toggleMobile(): void {
    this.isMobileOpenChange.emit(!this.isMobileOpen);
  }
}
