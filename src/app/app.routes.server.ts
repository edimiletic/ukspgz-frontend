// src/app/app.routes.server.ts
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Static routes that can be prerendered
  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'home',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'login',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'basket-rules',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'statistics',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'games-assigned',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'expenses',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'time-absent',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'exams',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'notifications',
    renderMode: RenderMode.Prerender
  },
  
  // Dynamic routes that need server-side rendering
  {
    path: 'expenses/**',
    renderMode: RenderMode.Server
  },
  {
    path: 'exams/take/**',
    renderMode: RenderMode.Server
  },
  {
    path: 'exams/review/**',
    renderMode: RenderMode.Server
  },
  {
    path: 'exams/result/**',
    renderMode: RenderMode.Server
  },
  
  // Catch-all for any other routes
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];