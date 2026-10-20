import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  NgZone,
  OnDestroy,
  Output,
  PLATFORM_ID
} from '@angular/core';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

@Directive({
  selector: '[appModalPanel]',
  host: {
    role: 'dialog',
    'aria-modal': 'true',
    tabindex: '-1'
  }
})
export class ModalPanelDirective implements AfterViewInit, OnDestroy {
  @Input() appModalBusy = false;
  @Output() dismiss = new EventEmitter<void>();

  private previousFocus: HTMLElement | null = null;
  private readonly isBrowser: boolean;

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly zone: NgZone,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser && document.activeElement instanceof HTMLElement) {
      this.previousFocus = document.activeElement;
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      return;
    }
    const first = this.focusables()[0] ?? this.el.nativeElement;
    first.focus();
    this.zone.runOutsideAngular(() => {
      document.addEventListener('keydown', this.onKey, true);
    });
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      document.removeEventListener('keydown', this.onKey, true);
      this.previousFocus?.focus();
    }
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      if (this.appModalBusy) {
        return;
      }
      const target = event.target;
      if (target instanceof HTMLElement && target.getAttribute('aria-expanded') === 'true') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      this.zone.run(() => this.dismiss.emit());
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const items = this.focusables();
    if (items.length === 0) {
      event.preventDefault();
      this.el.nativeElement.focus();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    const root = this.el.nativeElement;

    if (!root.contains(active)) {
      event.preventDefault();
      first.focus();
      return;
    }
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  private focusables(): HTMLElement[] {
    return Array.from(this.el.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (node) => !node.hasAttribute('disabled') && node.tabIndex !== -1
    );
  }
}
