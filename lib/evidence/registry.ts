import type { EvidenceProviderKey } from "./types";
import type { EvidenceSyncAdapter } from "./provider";

export class EvidenceProviderRegistry {
  private readonly adapters = new Map<EvidenceProviderKey, EvidenceSyncAdapter>();

  register(adapter: EvidenceSyncAdapter) {
    if (this.adapters.has(adapter.descriptor.key)) {
      throw new Error(
        `Evidence provider ${adapter.descriptor.key} is already registered.`,
      );
    }
    this.adapters.set(adapter.descriptor.key, adapter);
    return this;
  }

  get(provider: EvidenceProviderKey) {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Evidence provider ${provider} is not registered.`);
    }
    return adapter;
  }

  descriptors() {
    return [...this.adapters.values()].map((adapter) => adapter.descriptor);
  }
}
