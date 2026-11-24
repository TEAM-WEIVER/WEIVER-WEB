export type DocumentStatus = 'notStarted' | 'inProgress' | 'complete';

export type DocumentProgress = {
  completed: number;
  total: number;
  percentage: number;
  status: DocumentStatus;
};

/** Completion rules read committed data, never the unsaved form values. */
export type DocumentProgressSection<Data> = {
  id: string;
  included?: boolean;
  isComplete: (savedData: Data) => boolean;
};

function summarizeProgress(completed: number, total: number): DocumentProgress {
  return {
    completed,
    total,
    percentage: total === 0 ? 0 : Math.floor((completed / total) * 100),
    status: completed === 0 ? 'notStarted' : completed === total ? 'complete' : 'inProgress',
  };
}

/** Each included section ID contributes at most once, regardless of its entry count. */
export function calculateDocumentProgress<Data>(
  savedData: Data,
  sections: readonly DocumentProgressSection<Data>[],
): DocumentProgress {
  const counted = new Set<string>();
  let completed = 0;

  for (const section of sections) {
    if (section.included === false || counted.has(section.id)) continue;
    counted.add(section.id);
    if (section.isComplete(savedData)) completed += 1;
  }

  return summarizeProgress(completed, counted.size);
}

/** Aggregate section counts rather than averaging percentages of unequal-sized documents. */
export function calculateOverallDocumentProgress(
  documents: readonly DocumentProgress[],
): DocumentProgress {
  let completed = 0;
  let total = 0;

  for (const document of documents) {
    completed += document.completed;
    total += document.total;
  }

  return summarizeProgress(completed, total);
}
