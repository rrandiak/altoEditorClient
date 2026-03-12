import { Injectable, OnDestroy } from '@angular/core';
import { interval, of, Subject, Subscription } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { AppService } from '../app.service';
import { AppState } from './app.state';
import { Batch, BatchSearchFilters, BatchState, BatchType } from './batch';

const POLL_INTERVAL_MS = 5000;
const FETCH_SIZE = 20;
/** After triggerCheck(), keep polling for this long even with no tracked batches (to pick up newly created batch). */
const KEEP_POLLING_AFTER_TRIGGER_MS = 60 * 1000;

function storageKey(username: string): string {
  return `altoEditor.runningBatches.${username || ''}`;
}

@Injectable({ providedIn: 'root' })
export class BatchPollingService implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly trigger$ = new Subject<void>();
  private previousStates = new Map<number, string>();
  private trackedIds = new Set<number>();
  private stop$ = new Subject<void>();
  private intervalSub: Subscription | null = null;
  private lastTriggerTime = 0;

  constructor(
    private appService: AppService,
    private appState: AppState,
    private translate: TranslateService,
  ) {}

  ngOnDestroy() {
    this.stop();
    this.destroy$.next();
  }

  start() {
    this.stop();
    if (!this.appState.currentUser?.isCurator) return;
    this.stop$ = new Subject<void>();
    this.loadTracked();
    this.lastTriggerTime = Date.now();
    const fetch$ = this.fetchBatches().pipe(
      catchError(() => of({ content: [] as Batch[] })),
    );

    this.trigger$
      .pipe(takeUntil(this.stop$), switchMap(() => fetch$))
      .subscribe((batches) => this.process(batches.content));

    this.startInterval();
    this.trigger$.next();
  }

  stop() {
    this.stop$.next();
    this.intervalSub?.unsubscribe();
    this.intervalSub = null;
    this.previousStates.clear();
    this.trackedIds.clear();
  }

  triggerCheck() {
    if (!this.appState.currentUser?.isCurator) return;
    this.lastTriggerTime = Date.now();
    this.trigger$.next();
    if (this.intervalSub == null) this.startInterval();
  }

  clearTrackedBatchesForCurrentUser(): void {
    try {
      localStorage.removeItem(storageKey(this.appState.currentUser?.username ?? ''));
    } catch {}
  }

  private get storageKey(): string {
    return storageKey(this.appState.currentUser?.username ?? '');
  }

  private loadTracked(): void {
    this.trackedIds.clear();
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const ids = JSON.parse(raw) as number[];
        if (Array.isArray(ids)) ids.forEach((id) => this.trackedIds.add(id));
      }
    } catch {}
  }

  private saveTracked(): void {
    try {
      if (this.trackedIds.size === 0) {
        localStorage.removeItem(this.storageKey);
      } else {
        localStorage.setItem(this.storageKey, JSON.stringify([...this.trackedIds]));
      }
    } catch {}
  }

  private fetchBatches() {
    if (!this.appState.currentUser?.isCurator) return of({ content: [] as Batch[], totalElements: 0 });
    const username = this.appState.currentUser?.username;
    if (!username) return of({ content: [] as Batch[], totalElements: 0 });
    return this.appService.searchBatches(
      { createdBy: username },
      { page: 0, size: FETCH_SIZE, sortBy: 'updatedAt', sortOrder: 'DESC' },
    );
  }

  private norm(s: string | undefined): string {
    return String(s ?? '').toUpperCase();
  }

  private process(batches: Batch[]) {
    for (const b of batches) {
      const prev = this.previousStates.get(b.id);
      const state = this.norm(b.state);
      const wasRunning =
        this.norm(prev) === BatchState.RUNNING || this.norm(prev) === BatchState.PLANNED;
      const isTerminal = state !== BatchState.RUNNING && state !== BatchState.PLANNED;

      if (state === BatchState.RUNNING || state === BatchState.PLANNED) {
        this.trackedIds.add(b.id);
      } else if (isTerminal) {
        this.trackedIds.delete(b.id);
        if (wasRunning) {
          this.showSnackbar(b);
        }
      }
      this.previousStates.set(b.id, b.state);
    }
    this.saveTracked();

    if (this.trackedIds.size > 0) {
      this.startInterval();
    } else if (Date.now() - this.lastTriggerTime >= KEEP_POLLING_AFTER_TRIGGER_MS) {
      this.intervalSub?.unsubscribe();
      this.intervalSub = null;
    }
  }

  private startInterval(): void {
    if (this.intervalSub != null) return;
    const fetch$ = this.fetchBatches().pipe(
      catchError(() => of({ content: [] as Batch[] })),
    );
    const shouldFetch = () =>
      this.trackedIds.size > 0 ||
      Date.now() - this.lastTriggerTime < KEEP_POLLING_AFTER_TRIGGER_MS;
    this.intervalSub = interval(POLL_INTERVAL_MS)
      .pipe(
        takeUntil(this.stop$),
        switchMap(() => (shouldFetch() ? fetch$ : of({ content: [] as Batch[] }))),
      )
      .subscribe((res) => this.process(res.content));
  }

  private showSnackbar(b: Batch) {
    const typeLabel = this.translate.instant(`processType.${b.type || BatchType.GENERATE_SINGLE}`);
    const isFailed = this.norm(b.state) === BatchState.FAILED;
    const withPid = !!b.pid;
    const key = isFailed
      ? (withPid ? 'message.processFailedPid' : 'message.processFailed')
      : (withPid ? 'message.processCompletedPid' : 'message.processCompleted');
    const params = withPid ? { type: typeLabel, pid: b.pid } : { type: typeLabel };
    this.appService.showSnackBar(this.translate.instant(key, params), isFailed);
  }
}
