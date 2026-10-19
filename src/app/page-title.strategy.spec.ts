import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot } from '@angular/router';
import { UhksTitleStrategy } from './page-title.strategy';

describe('UhksTitleStrategy', () => {
  let strategy: UhksTitleStrategy;
  let title: Title;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UhksTitleStrategy]
    });
    strategy = TestBed.inject(UhksTitleStrategy);
    title = TestBed.inject(Title);
  });

  it('stavlja naslov stranice uz UHKS', () => {
    spyOn(strategy, 'buildTitle').and.returnValue('Odsustvo');
    strategy.updateTitle({} as RouterStateSnapshot);
    expect(title.getTitle()).toBe('Odsustvo — UHKS');
  });

  it('bez naslova rute ostavlja UHKS', () => {
    spyOn(strategy, 'buildTitle').and.returnValue(undefined);
    strategy.updateTitle({} as RouterStateSnapshot);
    expect(title.getTitle()).toBe('UHKS');
  });
});
