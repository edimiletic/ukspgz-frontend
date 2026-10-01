import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <section class="not-found">
      <h1>Stranica nije pronađena</h1>
      <p>Tražena adresa ne postoji.</p>
      <a routerLink="/home">Povratak na početnu</a>
    </section>
  `,
  styles: [`
    .not-found {
      padding: 3rem 2rem;
      text-align: center;
    }
    h1 { color: #1a202c; margin-bottom: 0.5rem; }
    p { color: #6b7280; margin-bottom: 1.5rem; }
    a { color: #3b82f6; font-weight: 600; }
  `]
})
export class NotFoundComponent {}
