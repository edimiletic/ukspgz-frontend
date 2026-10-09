import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface LibraryDocument {
  title: string;
  href: string;
  date: string;
  source: string;
  coverTitle: string;
  coverSubtitle?: string;
  coverVersion: string;
  coverClass: string;
}

@Component({
  selector: 'app-basket-rules',
  imports: [RouterModule, CommonModule],
  templateUrl: './basket-rules.component.html',
  styleUrl: './basket-rules.component.scss'
})
export class BasketRulesComponent {
  readonly documents: LibraryDocument[] = [
    {
      title: 'FIBA Službena košarkaška pravila 2026',
      href: 'https://www.hks-cbf.hr/slike/2023/08/FIBA-Sluzbena-kosarkaska-pravila-2026-1.pdf',
      date: '1. 10. 2026.',
      source: 'HKS',
      coverTitle: 'SLUŽBENA KOŠARKAŠKA PRAVILA 2026',
      coverVersion: '2026',
      coverClass: 'official-rules'
    },
    {
      title: 'FIBA Službena košarkaška pravila — Promjene 2026',
      href: 'https://www.hks-cbf.hr/slike/2023/08/FIBA-Sluzbena-kosarkaska-pravila-PROMJENE-2026-1.pdf',
      date: '1. 10. 2026.',
      source: 'HKS',
      coverTitle: 'SLUŽBENA KOŠARKAŠKA PRAVILA PROMJENE 2026',
      coverVersion: '2026',
      coverClass: 'changes'
    },
    {
      title: 'FIBA Službene interpretacije košarkaških pravila 1. 10. 2026.',
      href: 'https://www.hks-cbf.hr/slike/2023/08/FIBA-Sluzbene-interpretacije-kosarkaskih-pravila-1.10.2026-1.pdf',
      date: '1. 10. 2026.',
      source: 'HKS',
      coverTitle: 'SLUŽBENE INTERPRETACIJE KOŠARKAŠKIH PRAVILA 2026',
      coverVersion: '1.10.2026',
      coverClass: 'interpretations'
    },
    {
      title: 'Official Basketball Rules 2024: Basketball Equipment - v1.0',
      href: 'https://library.fibairef.basketball/cdn/OBR2024_Equipment',
      date: '1. 10. 2024.',
      source: 'FIBA',
      coverTitle: 'OFFICIAL BASKETBALL RULES 2024: BASKETBALL EQUIPMENT',
      coverVersion: 'v1.0',
      coverClass: 'equipment'
    },
    {
      title: 'INDIVIDUAL OFFICIATING TECHNIQUES 2024 v2.5 (IOT)',
      href: 'https://library.fibairef.basketball/doc/MlVhTUhWZzlsaVFLaFNBWFFRSnZmUT09',
      date: '15. 12. 2024.',
      source: 'FIBA',
      coverTitle: 'FIBA REFEREES MANUAL',
      coverSubtitle: 'INDIVIDUAL OFFICIATING TECHNIQUES (IOT)',
      coverVersion: 'VERSION 2.5',
      coverClass: 'individual'
    },
    {
      title: '3 PERSON OFFICIATING - BASIC 2024 v2.5 (SPO)',
      href: 'https://library.fibairef.basketball/doc/WUVSODVLcUVKckNaM3pBbFBQU0JVZz09',
      date: '15. 12. 2024.',
      source: 'FIBA',
      coverTitle: 'FIBA MANUAL FOR REFEREES',
      coverSubtitle: 'BASIC 3 PERSON OFFICIATING',
      coverVersion: 'VERSION 2.5',
      coverClass: 'three-person'
    },
    {
      title: 'BASIC BASKETBALL OFFICIATING TERMINOLOGY (v2.1)',
      href: 'https://library.fibairef.basketball/doc/Z05xejI2YmIrMzJVNnY2a09hYTNZdz09',
      date: '1. 12. 2022.',
      source: 'FIBA',
      coverTitle: 'BASIC BASKETBALL OFFICIATING TERMINOLOGY',
      coverVersion: 'VERSION 2.1',
      coverClass: 'terminology'
    },
    {
      title: 'FIBA TABLE OFFICIALS MANUAL (v6.0, OBR 2022)',
      href: 'https://library.fibairef.basketball/doc/anZ0UTNCaTlZNVdCZW1IYTZHOFNjUT09',
      date: '1. 11. 2022.',
      source: 'FIBA',
      coverTitle: 'FIBA MANUAL FOR TABLE OFFICIALS',
      coverVersion: 'VERSION 6.0',
      coverClass: 'table-officials'
    }
  ];
}
