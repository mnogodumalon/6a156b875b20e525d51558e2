import type { EnrichedNotizen } from '@/types/enriched';
import type { Kategorien, Notizen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface NotizenMaps {
  kategorienMap: Map<string, Kategorien>;
}

export function enrichNotizen(
  notizen: Notizen[],
  maps: NotizenMaps
): EnrichedNotizen[] {
  return notizen.map(r => ({
    ...r,
    notiz_kategorieName: resolveDisplay(r.fields.notiz_kategorie, maps.kategorienMap, 'kategorie_name'),
  }));
}
