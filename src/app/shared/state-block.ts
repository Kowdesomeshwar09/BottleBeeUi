import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

/**
 * The three states every data screen has before it has data: loading, failed,
 * and succeeded-but-empty.
 *
 * They are one component because they are one decision. Screens that hand-roll
 * them tend to get the third wrong — a failed request rendered as "no results"
 * tells the user their search was fruitless when in fact nothing was searched.
 */
@Component({
  selector: 'bb-state-block',
  imports: [ButtonModule, ProgressSpinnerModule],
  template: `
    @if (loading()) {
      <div class="bb-state" role="status" aria-live="polite">
        <p-progress-spinner strokeWidth="4" styleClass="w-3rem h-3rem" ariaLabel="Loading" />
        <p>{{ loadingText() }}</p>
      </div>
    } @else if (error()) {
      <div class="bb-state" role="alert">
        <i class="pi pi-exclamation-triangle" style="color: var(--p-red-500)"></i>
        <h3>That didn't load</h3>
        <p>{{ error() }}</p>
        @if (retryable()) {
          <p-button label="Try again" icon="pi pi-refresh" severity="secondary" [outlined]="true"
                    (onClick)="retry.emit()" />
        }
      </div>
    } @else if (empty()) {
      <div class="bb-state">
        <i [class]="'pi ' + emptyIcon()"></i>
        <h3>{{ emptyTitle() }}</h3>
        @if (emptyText()) { <p>{{ emptyText() }}</p> }
        <ng-content />
      </div>
    }
  `,
})
export class StateBlock {
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly empty = input(false);

  readonly loadingText = input('Loading…');
  readonly emptyTitle = input('Nothing here yet');
  readonly emptyText = input<string | null>(null);
  readonly emptyIcon = input('pi-inbox');
  readonly retryable = input(true);

  readonly retry = output<void>();
}
