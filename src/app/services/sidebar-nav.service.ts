import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarNavService {
  private readonly isBrowser: boolean;
  private readonly openSubject = new BehaviorSubject(false);
  private readonly presentSubject = new BehaviorSubject(false);

  readonly isOpen$ = this.openSubject.asObservable();
  readonly isPresent$ = this.presentSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  get isOpen(): boolean {
    return this.openSubject.value;
  }

  register(): void {
    this.presentSubject.next(true);
  }

  unregister(): void {
    this.presentSubject.next(false);
    this.close();
  }

  toggle(): void {
    this.isOpen ? this.close() : this.open();
  }

  open(): void {
    this.openSubject.next(true);
    this.toggleBodyScroll(true);
  }

  close(): void {
    this.openSubject.next(false);
    this.toggleBodyScroll(false);
  }

  private toggleBodyScroll(disable: boolean): void {
    if (!this.isBrowser || window.innerWidth > 768) {
      return;
    }

    document.body.style.overflow = disable ? 'hidden' : '';
    document.body.style.position = disable ? 'fixed' : '';
    document.body.style.width = disable ? '100%' : '';
  }
}
