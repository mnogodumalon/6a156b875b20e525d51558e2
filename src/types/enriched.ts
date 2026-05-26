import type { Notizen } from './app';

export type EnrichedNotizen = Notizen & {
  notiz_kategorieName: string;
};
