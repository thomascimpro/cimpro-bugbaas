export type ProgressionReceiptDestination = "world" | "scan" | "play" | "collection";
export type ProgressionReceiptLineKind = "species" | "copy" | "mastery" | "research" | "region" | "museum" | "xp" | "event";

export type ProgressionReceiptLine = {
  kind: ProgressionReceiptLineKind;
  amount?: number;
  bugId?: string;
  labelKey: string;
};

export type ProgressionReceipt = {
  id: string;
  source: string;
  createdAt: string;
  lines: ProgressionReceiptLine[];
  primaryDestination?: ProgressionReceiptDestination;
};

export function createProgressionReceipt(input: ProgressionReceipt): ProgressionReceipt {
  return {
    id: input.id,
    source: input.source,
    createdAt: input.createdAt,
    lines: uniqueValidLines(input.lines).slice(0, 4),
    primaryDestination: input.primaryDestination
  };
}

export function mergeProgressionReceipts(id: string, receipts: ProgressionReceipt[]): ProgressionReceipt {
  const ordered = [...receipts].sort((first, second) => first.createdAt.localeCompare(second.createdAt));
  const newest = ordered.at(-1);
  return createProgressionReceipt({
    id,
    source: newest?.source ?? "summary",
    createdAt: newest?.createdAt ?? new Date(0).toISOString(),
    primaryDestination: newest?.primaryDestination,
    lines: ordered.flatMap((receipt) => receipt.lines)
  });
}

function uniqueValidLines(lines: ProgressionReceiptLine[]): ProgressionReceiptLine[] {
  const seen = new Set<string>();
  const result: ProgressionReceiptLine[] = [];

  for (const line of lines) {
    if (!isValidLine(line)) continue;
    const key = `${line.kind}|${line.amount ?? ""}|${line.bugId ?? ""}|${line.labelKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...line });
  }

  return result;
}

function isValidLine(line: ProgressionReceiptLine): boolean {
  if (!line.labelKey.trim()) return false;
  if (line.amount !== undefined && (!Number.isFinite(line.amount) || line.amount <= 0)) return false;
  return true;
}
