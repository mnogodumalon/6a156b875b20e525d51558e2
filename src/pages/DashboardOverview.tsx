import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichNotizen } from '@/lib/enrich';
import type { EnrichedNotizen } from '@/types/enriched';
import type { Notizen } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { NotizenDialog } from '@/components/dialogs/NotizenDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconNotes, IconCircleCheck,
  IconClockHour3, IconCircle, IconSearch, IconX, IconTag
} from '@tabler/icons-react';

const APPGROUP_ID = '6a156b875b20e525d51558e2';
const REPAIR_ENDPOINT = '/claude/build/repair';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string; border: string }> = {
  offen: {
    label: 'Offen',
    color: 'text-amber-600',
    icon: <IconCircle size={14} className="text-amber-500 shrink-0" />,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  in_bearbeitung: {
    label: 'In Bearbeitung',
    color: 'text-blue-600',
    icon: <IconClockHour3 size={14} className="text-blue-500 shrink-0" />,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  erledigt: {
    label: 'Erledigt',
    color: 'text-emerald-600',
    icon: <IconCircleCheck size={14} className="text-emerald-500 shrink-0" />,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
};

const PRIO_CONFIG: Record<string, { label: string; badge: string }> = {
  hoch: { label: 'Hoch', badge: 'bg-red-100 text-red-700 border-red-200' },
  mittel: { label: 'Mittel', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  niedrig: { label: 'Niedrig', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const FARBE_CONFIG: Record<string, string> = {
  blau: 'bg-blue-500',
  gruen: 'bg-emerald-500',
  gelb: 'bg-yellow-400',
  orange: 'bg-orange-500',
  lila: 'bg-purple-500',
  grau: 'bg-slate-400',
  rot: 'bg-red-500',
};

const STATUSES = ['offen', 'in_bearbeitung', 'erledigt'];

export default function DashboardOverview() {
  const {
    kategorien, notizen,
    kategorienMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedNotizen: EnrichedNotizen[] = enrichNotizen(notizen, { kategorienMap });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedNotizen | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedNotizen | null>(null);
  const [filterKategorie, setFilterKategorie] = useState<string>('');
  const [filterPrio, setFilterPrio] = useState<string>('');
  const [search, setSearch] = useState('');
  const [createForStatus, setCreateForStatus] = useState<string>('offen');

  const filteredNotizen = useMemo(() => {
    return enrichedNotizen.filter(n => {
      if (filterKategorie) {
        const id = extractRecordId(n.fields.notiz_kategorie);
        if (id !== filterKategorie) return false;
      }
      if (filterPrio && n.fields.notiz_prioritaet?.key !== filterPrio) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchTitle = n.fields.notiz_titel?.toLowerCase().includes(q) ?? false;
        const matchContent = n.fields.notiz_inhalt?.toLowerCase().includes(q) ?? false;
        if (!matchTitle && !matchContent) return false;
      }
      return true;
    });
  }, [enrichedNotizen, filterKategorie, filterPrio, search]);

  const byStatus = useMemo(() => {
    const map: Record<string, EnrichedNotizen[]> = { offen: [], in_bearbeitung: [], erledigt: [] };
    filteredNotizen.forEach(n => {
      const key = n.fields.notiz_status?.key ?? 'offen';
      if (map[key]) map[key].push(n);
      else map['offen'].push(n);
    });
    return map;
  }, [filteredNotizen]);

  const totalOffen = useMemo(() => enrichedNotizen.filter(n => (n.fields.notiz_status?.key ?? 'offen') === 'offen').length, [enrichedNotizen]);
  const totalInArbeit = useMemo(() => enrichedNotizen.filter(n => n.fields.notiz_status?.key === 'in_bearbeitung').length, [enrichedNotizen]);
  const totalErledigt = useMemo(() => enrichedNotizen.filter(n => n.fields.notiz_status?.key === 'erledigt').length, [enrichedNotizen]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleCreate = async (fields: Notizen['fields']) => {
    await LivingAppsService.createNotizenEntry(fields);
    fetchAll();
  };

  const handleEdit = async (fields: Notizen['fields']) => {
    if (!editRecord) return;
    await LivingAppsService.updateNotizenEntry(editRecord.record_id, fields);
    setEditRecord(null);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteNotizenEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  const handleStatusChange = async (notiz: EnrichedNotizen, newStatus: string) => {
    await LivingAppsService.updateNotizenEntry(notiz.record_id, { notiz_status: newStatus });
    fetchAll();
  };

  const activeFilters = [filterKategorie, filterPrio, search].filter(Boolean).length;

  const getCreateDefaultValues = () => {
    const statusOpt = LOOKUP_OPTIONS['notizen']?.notiz_status?.find(o => o.key === createForStatus);
    if (!statusOpt) return undefined;
    return { notiz_status: statusOpt };
  };

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Gesamt"
          value={String(enrichedNotizen.length)}
          description="Alle Notizen"
          icon={<IconNotes size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Offen"
          value={String(totalOffen)}
          description="Noch zu erledigen"
          icon={<IconCircle size={18} className="text-amber-500" />}
        />
        <StatCard
          title="In Bearbeitung"
          value={String(totalInArbeit)}
          description="Aktive Notizen"
          icon={<IconClockHour3 size={18} className="text-blue-500" />}
        />
        <StatCard
          title="Erledigt"
          value={String(totalErledigt)}
          description="Abgeschlossen"
          icon={<IconCircleCheck size={18} className="text-emerald-500" />}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Notizen suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <IconX size={13} />
            </button>
          )}
        </div>

        {/* Filter Kategorie */}
        <select
          value={filterKategorie}
          onChange={e => setFilterKategorie(e.target.value)}
          className="text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Alle Kategorien</option>
          {kategorien.map(k => (
            <option key={k.record_id} value={k.record_id}>{k.fields.kategorie_name ?? k.record_id}</option>
          ))}
        </select>

        {/* Filter Priorität */}
        <select
          value={filterPrio}
          onChange={e => setFilterPrio(e.target.value)}
          className="text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Alle Prioritäten</option>
          {LOOKUP_OPTIONS['notizen']?.notiz_prioritaet?.map(o => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>

        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterKategorie(''); setFilterPrio(''); setSearch(''); }} className="gap-1">
            <IconX size={13} className="shrink-0" />
            Filter zurücksetzen
          </Button>
        )}

        <div className="ml-auto">
          <Button size="sm" onClick={() => { setCreateForStatus('offen'); setCreateDialogOpen(true); }} className="gap-1">
            <IconPlus size={14} className="shrink-0" />
            <span className="hidden sm:inline">Neue Notiz</span>
            <span className="sm:hidden">Neu</span>
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATUSES.map(statusKey => {
          const cfg = STATUS_CONFIG[statusKey];
          const cards = byStatus[statusKey] ?? [];
          return (
            <div key={statusKey} className="flex flex-col min-h-[200px]">
              {/* Column header */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl border-t border-x ${cfg.bg} ${cfg.border}`}>
                <div className="flex items-center gap-2">
                  {cfg.icon}
                  <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">{cards.length}</Badge>
                </div>
                <button
                  onClick={() => { setCreateForStatus(statusKey); setCreateDialogOpen(true); }}
                  className={`p-1 rounded-lg hover:bg-white/60 transition-colors ${cfg.color}`}
                  title="Neue Notiz hinzufügen"
                >
                  <IconPlus size={15} className="shrink-0" />
                </button>
              </div>

              {/* Cards */}
              <div className={`flex-1 rounded-b-2xl border-b border-x ${cfg.border} bg-white/60 p-2 space-y-2 min-h-[120px]`}>
                {cards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                    <IconNotes size={28} stroke={1.5} />
                    <span className="text-xs">Keine Notizen</span>
                  </div>
                ) : (
                  cards.map(notiz => {
                    const prioKey = notiz.fields.notiz_prioritaet?.key;
                    const prio = prioKey ? PRIO_CONFIG[prioKey] : null;
                    const katId = extractRecordId(notiz.fields.notiz_kategorie);
                    const kat = katId ? kategorienMap.get(katId) : null;
                    const farbe = kat?.fields.kategorie_farbe?.key;
                    return (
                      <div
                        key={notiz.record_id}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 group hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setEditRecord(notiz)}
                      >
                        {/* Title */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-foreground line-clamp-2 min-w-0 flex-1">
                            {notiz.fields.notiz_titel ?? '(Kein Titel)'}
                          </p>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={e => { e.stopPropagation(); setEditRecord(notiz); }}
                              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors"
                            >
                              <IconPencil size={13} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setDeleteTarget(notiz); }}
                              className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
                            >
                              <IconTrash size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Content preview */}
                        {notiz.fields.notiz_inhalt && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {notiz.fields.notiz_inhalt}
                          </p>
                        )}

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {prio && (
                            <span className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded-md border font-medium ${prio.badge}`}>
                              {prio.label}
                            </span>
                          )}
                          {kat && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              {farbe && <span className={`w-2 h-2 rounded-full shrink-0 ${FARBE_CONFIG[farbe] ?? 'bg-slate-400'}`} />}
                              <IconTag size={11} className="shrink-0" />
                              <span className="truncate max-w-[80px]">{kat.fields.kategorie_name}</span>
                            </span>
                          )}
                          {notiz.fields.notiz_datum && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              {formatDate(notiz.fields.notiz_datum)}
                            </span>
                          )}
                        </div>

                        {/* Quick status change */}
                        <div className="flex gap-1 mt-2 pt-2 border-t border-slate-100">
                          {STATUSES.filter(s => s !== statusKey).map(s => {
                            const sc = STATUS_CONFIG[s];
                            return (
                              <button
                                key={s}
                                onClick={e => { e.stopPropagation(); handleStatusChange(notiz, s); }}
                                className={`flex-1 text-xs py-1 rounded-lg border ${sc.bg} ${sc.border} ${sc.color} hover:opacity-80 transition-opacity font-medium`}
                              >
                                → {sc.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Kategorien Overview */}
      {kategorien.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <IconTag size={15} className="shrink-0 text-muted-foreground" />
            Kategorien
          </h3>
          <div className="flex flex-wrap gap-2">
            {kategorien.map(k => {
              const farbe = k.fields.kategorie_farbe?.key;
              const count = enrichedNotizen.filter(n => extractRecordId(n.fields.notiz_kategorie) === k.record_id).length;
              const isActive = filterKategorie === k.record_id;
              return (
                <button
                  key={k.record_id}
                  onClick={() => setFilterKategorie(isActive ? '' : k.record_id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted text-foreground'
                  }`}
                >
                  {farbe && <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${FARBE_CONFIG[farbe] ?? 'bg-slate-400'}`} />}
                  {k.fields.kategorie_name ?? '—'}
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">{count}</Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <NotizenDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreate}
        defaultValues={getCreateDefaultValues()}
        kategorienList={kategorien}
        enablePhotoScan={AI_PHOTO_SCAN['Notizen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Notizen']}
      />

      {editRecord && (
        <NotizenDialog
          open={!!editRecord}
          onClose={() => setEditRecord(null)}
          onSubmit={handleEdit}
          defaultValues={editRecord.fields}
          kategorienList={kategorien}
          enablePhotoScan={AI_PHOTO_SCAN['Notizen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Notizen']}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Notiz löschen"
        description={`"${deleteTarget?.fields.notiz_titel ?? 'Diese Notiz'}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-10 rounded-xl w-full max-w-md" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
