// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Kategorien {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kategorie_name?: string;
    kategorie_beschreibung?: string;
    kategorie_farbe?: LookupValue;
  };
}

export interface Notizen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    notiz_titel?: string;
    notiz_inhalt?: string;
    notiz_kategorie?: string; // applookup -> URL zu 'Kategorien' Record
    notiz_datum?: string; // Format: YYYY-MM-DD oder ISO String
    notiz_prioritaet?: LookupValue;
    notiz_status?: LookupValue;
  };
}

export const APP_IDS = {
  KATEGORIEN: '6a156b6fb6cea9943d969860',
  NOTIZEN: '6a156b7c0d8d71e567ae183e',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'kategorien': {
    kategorie_farbe: [{ key: "blau", label: "Blau" }, { key: "gruen", label: "Grün" }, { key: "gelb", label: "Gelb" }, { key: "orange", label: "Orange" }, { key: "lila", label: "Lila" }, { key: "grau", label: "Grau" }, { key: "rot", label: "Rot" }],
  },
  'notizen': {
    notiz_prioritaet: [{ key: "niedrig", label: "Niedrig" }, { key: "mittel", label: "Mittel" }, { key: "hoch", label: "Hoch" }],
    notiz_status: [{ key: "offen", label: "Offen" }, { key: "in_bearbeitung", label: "In Bearbeitung" }, { key: "erledigt", label: "Erledigt" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'kategorien': {
    'kategorie_name': 'string/text',
    'kategorie_beschreibung': 'string/textarea',
    'kategorie_farbe': 'lookup/select',
  },
  'notizen': {
    'notiz_titel': 'string/text',
    'notiz_inhalt': 'string/textarea',
    'notiz_kategorie': 'applookup/select',
    'notiz_datum': 'date/date',
    'notiz_prioritaet': 'lookup/radio',
    'notiz_status': 'lookup/select',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKategorien = StripLookup<Kategorien['fields']>;
export type CreateNotizen = StripLookup<Notizen['fields']>;