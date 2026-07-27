import type {
  EvidenceDataset,
  EvidenceProviderKey,
  EvidenceSourceContext,
  NormalizedEvidenceRecord,
} from "./types";
import {
  normalizeEvidenceBatch,
  type EvidenceNormalizationPipeline,
} from "./normalization";

export type EvidenceProviderDescriptor = {
  key: EvidenceProviderKey;
  displayName: string;
  datasets: readonly EvidenceDataset[];
  contractVersion: string;
};

export type EvidencePullRequest<TCursor> = {
  organizationId: string;
  sourceId: string;
  connectionId?: string;
  accountId?: string;
  marketplace?: string;
  dataset: EvidenceDataset;
  cursor?: TCursor;
  requestedAt: string;
};

export type EvidenceProviderPage<TProviderRecord, TCursor> = {
  records: TProviderRecord[];
  nextCursor?: TCursor;
  hasMore: boolean;
  providerRequestReference?: string;
};

export interface EvidenceProviderReader<TProviderRecord, TCursor> {
  readonly descriptor: EvidenceProviderDescriptor;
  pull(
    request: EvidencePullRequest<TCursor>,
  ): Promise<EvidenceProviderPage<TProviderRecord, TCursor>>;
}

export type EvidenceSyncPage = {
  records: NormalizedEvidenceRecord[];
  nextCursor?: string;
  hasMore: boolean;
  providerRequestReference?: string;
};

export interface EvidenceSyncAdapter {
  readonly descriptor: EvidenceProviderDescriptor;
  synchronize(request: {
    context: EvidenceSourceContext;
    dataset: EvidenceDataset;
    cursor?: string;
    requestedAt: string;
  }): Promise<EvidenceSyncPage>;
}

type CursorCodec<TCursor> = {
  parse(value?: string): TCursor | undefined;
  serialize(value?: TCursor): string | undefined;
};

export class NormalizingEvidenceAdapter<TProviderRecord, TCursor>
  implements EvidenceSyncAdapter
{
  readonly descriptor: EvidenceProviderDescriptor;

  constructor(
    private readonly reader: EvidenceProviderReader<TProviderRecord, TCursor>,
    private readonly pipeline: EvidenceNormalizationPipeline<TProviderRecord>,
    private readonly cursorCodec: CursorCodec<TCursor>,
  ) {
    this.descriptor = reader.descriptor;
  }

  async synchronize(request: {
    context: EvidenceSourceContext;
    dataset: EvidenceDataset;
    cursor?: string;
    requestedAt: string;
  }): Promise<EvidenceSyncPage> {
    if (!this.descriptor.datasets.includes(request.dataset)) {
      throw new Error(
        `${this.descriptor.displayName} does not support the ${request.dataset} evidence dataset.`,
      );
    }

    const page = await this.reader.pull({
      ...request.context,
      dataset: request.dataset,
      cursor: this.cursorCodec.parse(request.cursor),
      requestedAt: request.requestedAt,
    });

    return {
      records: normalizeEvidenceBatch({
        records: page.records,
        context: request.context,
        pipeline: this.pipeline,
        ingestedAt: request.requestedAt,
      }),
      nextCursor: this.cursorCodec.serialize(page.nextCursor),
      hasMore: page.hasMore,
      providerRequestReference: page.providerRequestReference,
    };
  }
}

export const stringCursorCodec: CursorCodec<string> = {
  parse: (value) => value,
  serialize: (value) => value,
};
