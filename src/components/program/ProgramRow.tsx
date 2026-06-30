import type { ReactNode, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { state } from '../../lib/state';
import { getProgram, programStyle, programProgressable } from '../../lib/programLookup';
import { makeRowId, resolveRowMax, calculateWeight, roughWeight, getRepModifier } from '../../lib/calc';
import { toggleRowComplete } from '../../store/actions';
import { rowClickSuppress } from './rowInteract';

export interface RowOpts {
  prefixExercise?: boolean;
  block?: number;
  maxOverride?: number | string | null;
  interactive?: boolean;
  goto?: () => void;
}

export function rowTheme(program: string): 'theme-build' | 'theme-peak' {
  return programStyle(program) === 'build' ? 'theme-build' : 'theme-peak';
}

export function showCompleteButton(program: string): boolean {
  return programProgressable(program);
}

function WrenchIcon() {
  return (
    <svg className="logged-icon" aria-label="custom-logged">
      <use href={`${import.meta.env.BASE_URL}assets/icons/sprite.svg#icon-wrench`} />
    </svg>
  );
}

const BACKOFF_KEYS = ['backoff', 'backoff2', 'backoff3'] as const;

export function buildProgramRow(
  lift: string, program: string, wIndex: number, dIndex: number, opts: RowOpts = {},
): ReactNode {
  const liftData = state.lifts[lift];
  const weekData = getProgram(program)?.[wIndex];
  const day = weekData?.days[dIndex];
  if (!liftData || !day || day.isRest) {
    return null;
  }

  const block = opts.block != null ? opts.block : (liftData.block || 0);
  const rowId = makeRowId(lift, program, wIndex, dIndex, block);
  const max = resolveRowMax(lift, rowId, opts.maxOverride);
  const unit = state.global.unit;
  const theme = rowTheme(program);
  const variationName = state.variationsDict[lift]?.[liftData.variation] || '';
  const logged = state.logged?.[rowId] || {};
  const rough = !!state.global.roughLoads;
  const done = !!state.completed[rowId];
  const interactive = opts.interactive !== false;

  const loadStr = (pct: number, reps: number | string | undefined, pctRange?: number): string =>
    rough
      ? roughWeight(max, pct, reps, lift)
      : pctRange
        ? `${calculateWeight(max, pct - pctRange, reps, lift)} – ${calculateWeight(max, pct + pctRange, reps, lift)}`
        : calculateWeight(max, pct, reps, lift);
  const pctSuffix = (pct: number, reps: number | string | undefined): string =>
    rough ? '' : ` (${((pct + getRepModifier(reps, lift)) * 100).toFixed(1)}%)`;

  const renderWeight = (key: string, calcStr: string): ReactNode =>
    logged[key] != null
      ? <span key={key} className={theme}>{logged[key]} {unit}<WrenchIcon /></span>
      : <span key={key} className={theme}>{calcStr} {unit}</span>;

  const dayPct = day.pct ?? 0;
  const weightParts: ReactNode[] = [renderWeight('main', loadStr(dayPct, day.reps, day.pctRange))];
  if (!rough) {
    weightParts.push(
      <span key="mainpct" className="sub-text">
        ({((dayPct + getRepModifier(day.reps, lift)) * 100).toFixed(1)}%)
      </span>,
    );
  }
  const repsParts: ReactNode[] = [`${day.sets} × ${day.reps}`];
  for (let i = 0; i < BACKOFF_KEYS.length; i++) {
    const bk = BACKOFF_KEYS[i];
    const seg = day[bk];
    if (!seg) {
      continue;
    }
    const label = i === 0 ? `then ${seg.sets} × ${seg.reps} (${variationName})` : `then ${seg.sets} × ${seg.reps}`;
    repsParts.push(<span key={bk} className="sub-text">{label}</span>);
    weightParts.push(
      <span key={bk} className="sub-text">
        then {renderWeight(bk, loadStr(seg.pct, seg.reps, seg.pctRange))}{pctSuffix(seg.pct, seg.reps)}
      </span>,
    );
  }

  const onClick = () => {
    if (rowClickSuppress.current) {
      rowClickSuppress.current = false;
      return;
    }
    toggleRowComplete(rowId);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTableRowElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') {
      return;
    }
    if (e.repeat) {
      return;
    }
    e.preventDefault();
    toggleRowComplete(rowId);
  };

  return (
    <tr
      className={done ? 'completed' : undefined}
      data-row-id={rowId}
      data-lift={lift}
      data-program={program}
      data-w={wIndex}
      data-d={dIndex}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? (done ? 'true' : 'false') : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={interactive ? onKeyDown : undefined}
    >
      <td>
        {opts.prefixExercise ? `${lift.toUpperCase()} · ${day.name}` : day.name}
        {opts.goto && (
          <button
            type="button"
            className="today-goto-btn"
            title="Show in program"
            aria-label="Show in program"
            onClick={(e) => {
              e.stopPropagation();
              opts.goto!();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
              }
            }}
          >
            <svg width="15" height="15" aria-hidden="true">
              <use href={`${import.meta.env.BASE_URL}assets/icons/sprite.svg#icon-chevron-right`} />
            </svg>
          </button>
        )}
      </td>
      <td>{repsParts}</td>
      <td className="weight-cell">{weightParts}</td>
      <td className="rpe-cell">
        {day.rpe
          ? String(day.rpe).split('/').map((part, i) => <span key={i} className="rpe-line">{part.trim()}</span>)
          : <span className="rpe-line">—</span>}
      </td>
    </tr>
  );
}
