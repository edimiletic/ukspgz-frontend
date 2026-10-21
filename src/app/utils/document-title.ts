import { ActivatedRouteSnapshot } from '@angular/router';

export const APP_DOCUMENT_NAME = 'UHKS';

export function documentTitle(page?: string | null): string {
  const name = String(page || '').trim();
  return name ? `${name} — ${APP_DOCUMENT_NAME}` : APP_DOCUMENT_NAME;
}

export function leafRouteTitle(root: ActivatedRouteSnapshot): string {
  let route = root;
  while (route.firstChild) {
    route = route.firstChild;
  }
  return String(route.data?.['title'] || '');
}
