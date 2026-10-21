import { documentTitle, leafRouteTitle } from './document-title';

describe('documentTitle', () => {
  it('dodaje ime ekrana uz UHKS', () => {
    expect(documentTitle('Moje utakmice')).toBe('Moje utakmice — UHKS');
  });

  it('bez stranice ostaje UHKS', () => {
    expect(documentTitle('')).toBe('UHKS');
  });

  it('čita title s listića rute', () => {
    const root = {
      data: {},
      firstChild: {
        data: { title: 'Odsustvo' },
        firstChild: null
      }
    } as any;
    expect(leafRouteTitle(root)).toBe('Odsustvo');
  });
});
