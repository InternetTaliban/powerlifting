import { allPrograms } from './data';

export interface ParsedRowId {
  ex: string;
  program: string;
  week: number;
  day: number;
  block: number;
}

// Anchors on known program names (not a plain split) so lift names may contain dashes.
export function parseRowId(rowId: string): ParsedRowId | null {
  const match = /^(.+)-w(\d+)-d(\d+)(?:-b(\d+))?$/.exec(rowId || '');
  if (!match) {
    return null;
  }

  const head = match[1];
  const program = allPrograms.find((candidate) => head === candidate || head.endsWith('-' + candidate));
  if (!program) {
    return null;
  }

  const ex = head === program ? '' : head.slice(0, head.length - program.length - 1);
  if (!ex) {
    return null;
  }

  return {
    ex,
    program,
    week: parseInt(match[2], 10),
    day: parseInt(match[3], 10),
    block: match[4] ? parseInt(match[4], 10) : 0,
  };
}

export function weekIndexFromRowId(rowId: string): number | null {
  const match = /-w(\d+)-d\d+(?:-b\d+)?$/.exec(rowId || '');
  return match ? parseInt(match[1], 10) : null;
}
