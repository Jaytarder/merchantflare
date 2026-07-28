import type { NormalizedEvidenceRecord } from "../evidence/types";
import {
  confidence,
  confidenceFromEvidence,
  metricFrom,
  scalarFrom,
} from "./evidence";
import {
  catalogHealthDimensions,
  type CatalogComponentScore,
  type CatalogHealthDimension,
  type CatalogHealthScore,
} from "./types";

const weights: Record<CatalogHealthDimension, number> = {
  title: 0.16,
  images: 0.12,
  bullets: 0.1,
  description: 0.08,
  aPlusContent: 0.08,
  variation: 0.12,
  searchCoverage: 0.14,
  compliance: 0.12,
  contentFreshness: 0.08,
};

const requiredEvidence: Record<CatalogHealthDimension, string> = {
  title: "Normalized catalog title evidence",
  images: "Normalized image-count evidence",
  bullets: "Normalized bullet-count evidence",
  description: "Normalized description presence or content evidence",
  aPlusContent: "Normalized A+ content presence evidence",
  variation: "Normalized variation integrity evidence",
  searchCoverage: "Normalized search or keyword coverage evidence",
  compliance: "Normalized compliance status or issue evidence",
  contentFreshness: "At least one normalized catalog record with an observation time",
};

function boundedScore(value: number) {
  return Math.round(Math.min(Math.max(value, 0), 100));
}

function unavailable(
  dimension: CatalogHealthDimension,
): CatalogComponentScore {
  return {
    dimension,
    status: "unavailable",
    score: null,
    confidence: confidence(
      0,
      `Atlas cannot score ${dimension} without ${requiredEvidence[dimension].toLowerCase()}.`,
    ),
    explanation: `No supported normalized evidence was available for ${dimension}. This dimension was excluded from the overall score.`,
    evidenceReferences: [],
    assumptions: [],
    unavailableEvidence: [requiredEvidence[dimension]],
  };
}

function scored(input: {
  dimension: CatalogHealthDimension;
  score: number;
  explanation: string;
  records: NormalizedEvidenceRecord[];
  assumptions?: string[];
}): CatalogComponentScore {
  return {
    dimension: input.dimension,
    status: "scored",
    score: boundedScore(input.score),
    confidence: confidenceFromEvidence(
      input.records,
      `Confidence reflects the freshness and source limitations of the normalized evidence used for ${input.dimension}.`,
    ),
    explanation: input.explanation,
    evidenceReferences: input.records.map((record) => record.id),
    assumptions: input.assumptions ?? [],
    unavailableEvidence: [],
  };
}

function titleScore(records: NormalizedEvidenceRecord[]) {
  const fact = scalarFrom(records, ["title", "productTitle"]);
  if (!fact || typeof fact.value !== "string") return unavailable("title");
  const length = fact.value.trim().length;
  const score =
    length === 0 ? 0 : length < 30 ? 45 : length <= 150 ? 100 : length <= 200 ? 70 : 35;
  return scored({
    dimension: "title",
    score,
    records: [fact.record],
    explanation: `The normalized title contains ${length} characters. Atlas awards full title-structure credit from 30 through 150 characters, reduces credit outside that range, and does not infer marketplace-specific limits.`,
    assumptions: [
      "Character length is a structural signal, not proof of relevance, accuracy, or policy compliance.",
    ],
  });
}

function countScore(
  dimension: "images" | "bullets",
  records: NormalizedEvidenceRecord[],
  keys: string[],
  fullCredit: number,
) {
  const fact = scalarFrom(records, keys);
  if (!fact || typeof fact.value !== "number") return unavailable(dimension);
  const count = Math.max(0, Math.floor(fact.value));
  return scored({
    dimension,
    score: (count / fullCredit) * 100,
    records: [fact.record],
    explanation: `${count} ${dimension} were explicitly reported in normalized evidence. Atlas gives full structural credit at ${fullCredit} and proportionally less below that threshold.`,
    assumptions: [
      `Count alone does not establish the quality, accuracy, or marketplace eligibility of the ${dimension}.`,
    ],
  });
}

function descriptionScore(records: NormalizedEvidenceRecord[]) {
  const fact = scalarFrom(records, ["description", "descriptionPresent"]);
  if (!fact) return unavailable("description");
  const present =
    typeof fact.value === "boolean"
      ? fact.value
      : typeof fact.value === "string" && fact.value.trim().length > 0;
  return scored({
    dimension: "description",
    score: present ? 100 : 0,
    records: [fact.record],
    explanation: present
      ? "Normalized evidence confirms description content is present."
      : "Normalized evidence explicitly reports that description content is absent.",
    assumptions: [
      "Presence does not establish content quality, factual accuracy, or conversion impact.",
    ],
  });
}

function booleanScore(
  dimension: "aPlusContent" | "variation",
  records: NormalizedEvidenceRecord[],
  keys: string[],
) {
  const fact = scalarFrom(records, keys);
  if (!fact || typeof fact.value !== "boolean") return unavailable(dimension);
  return scored({
    dimension,
    score: fact.value ? 100 : 0,
    records: [fact.record],
    explanation: `Normalized evidence explicitly reports ${dimension} as ${fact.value ? "present or valid" : "absent or invalid"}.`,
    assumptions: [
      `This score uses the normalized boolean state and does not infer the quality of ${dimension}.`,
    ],
  });
}

function searchCoverageScore(records: NormalizedEvidenceRecord[]) {
  const metric = metricFrom(records, [
    "search_coverage",
    "keyword_coverage",
    "search_coverage_percent",
  ]);
  if (!metric || metric.value.type !== "metric") {
    const fact = scalarFrom(records, [
      "searchCoverage",
      "searchCoveragePercent",
      "keywordCoverage",
    ]);
    if (!fact || typeof fact.value !== "number") {
      return unavailable("searchCoverage");
    }
    return scored({
      dimension: "searchCoverage",
      score: fact.value,
      records: [fact.record],
      explanation: `Normalized evidence reports ${boundedScore(fact.value)}% search coverage. Atlas uses the reported percentage directly and does not fabricate keyword demand.`,
    });
  }
  const percentage =
    metric.value.unit === "ratio"
      ? metric.value.value * 100
      : metric.value.value;
  return scored({
    dimension: "searchCoverage",
    score: percentage,
    records: [metric],
    explanation: `Normalized evidence reports ${boundedScore(percentage)}% search coverage. Atlas uses the normalized metric directly and does not fabricate keyword demand.`,
  });
}

function complianceScore(records: NormalizedEvidenceRecord[]) {
  const compliance = records.filter(
    (record) => record.dataset === "compliance",
  );
  if (compliance.length === 0) return unavailable("compliance");
  const openIssues = compliance.filter((record) => {
    if (record.value.type !== "status") return false;
    return !["resolved", "closed", "compliant", "clear"].includes(
      record.value.status.toLowerCase(),
    );
  });
  if (openIssues.length === 0) {
    return scored({
      dimension: "compliance",
      score: 100,
      records: compliance,
      explanation:
        "Every normalized compliance status in scope is explicitly resolved, closed, compliant, or clear.",
    });
  }
  const severities = openIssues.map((record) => {
    const severity =
      record.value.type === "status"
        ? record.value.attributes.severity
        : null;
    return typeof severity === "string" ? severity.toLowerCase() : "unknown";
  });
  const penalty = Math.max(
    ...severities.map((severity) => {
      if (severity === "critical") return 100;
      if (severity === "high") return 70;
      if (severity === "medium") return 45;
      if (severity === "low") return 20;
      return 35;
    }),
  );
  return scored({
    dimension: "compliance",
    score: 100 - penalty,
    records: openIssues,
    explanation: `${openIssues.length} normalized compliance ${openIssues.length === 1 ? "issue is" : "issues are"} not in a resolved or clear state. The score uses the highest explicitly reported severity.`,
  });
}

function freshnessScore(records: NormalizedEvidenceRecord[]) {
  const catalog = records.filter((record) => record.dataset === "catalog");
  if (catalog.length === 0) return unavailable("contentFreshness");
  const values: number[] = catalog.map((record) => {
    if (record.freshness === "current") return 100;
    if (record.freshness === "delayed") return 65;
    if (record.freshness === "stale") return 25;
    return 0;
  });
  const average = values.reduce<number>((sum, value) => sum + value, 0) / values.length;
  return scored({
    dimension: "contentFreshness",
    score: average,
    records: catalog,
    explanation: `Content freshness averages the Commerce Evidence Layer states for ${catalog.length} catalog ${catalog.length === 1 ? "record" : "records"}: current 100, delayed 65, stale 25, and unavailable 0.`,
  });
}

export function scoreCatalogHealth(
  records: NormalizedEvidenceRecord[],
): CatalogHealthScore {
  const components: Record<CatalogHealthDimension, CatalogComponentScore> = {
    title: titleScore(records),
    images: countScore("images", records, ["imageCount", "imagesCount"], 6),
    bullets: countScore("bullets", records, ["bulletCount", "bulletsCount"], 5),
    description: descriptionScore(records),
    aPlusContent: booleanScore(
      "aPlusContent",
      records,
      ["aPlusPresent", "aplusPresent", "enhancedContentPresent"],
    ),
    variation: booleanScore(
      "variation",
      records,
      ["variationValid", "variationIntegrityValid"],
    ),
    searchCoverage: searchCoverageScore(records),
    compliance: complianceScore(records),
    contentFreshness: freshnessScore(records),
  };
  const available = catalogHealthDimensions.filter(
    (dimension) => components[dimension].status === "scored",
  );
  if (available.length === 0) {
    return {
      overallScore: null,
      status: "unavailable",
      explanation:
        "No health dimension had sufficient normalized evidence. Atlas did not calculate an overall score.",
      confidence: confidence(
        0,
        "Overall confidence is unavailable because no component was scored.",
      ),
      scoredDimensions: 0,
      totalDimensions: catalogHealthDimensions.length,
      components,
    };
  }
  const availableWeight = available.reduce(
    (total, dimension) => total + weights[dimension],
    0,
  );
  const overall = available.reduce((total, dimension) => {
    const component = components[dimension];
    return (
      total +
      (component.status === "scored" ? component.score : 0) *
        (weights[dimension] / availableWeight)
    );
  }, 0);
  const confidenceScore =
    available.reduce((total, dimension) => {
      return total + components[dimension].confidence.score;
    }, 0) /
      available.length *
    (available.length / catalogHealthDimensions.length);
  return {
    overallScore: boundedScore(overall),
    status:
      available.length === catalogHealthDimensions.length
        ? "available"
        : "partial",
    explanation: `The overall score is a weighted average of ${available.length} scored dimensions. ${catalogHealthDimensions.length - available.length} unavailable dimensions were excluded rather than treated as failures.`,
    confidence: confidence(
      confidenceScore,
      `Overall confidence combines source freshness with ${available.length} of ${catalogHealthDimensions.length} dimensions having supported normalized evidence.`,
    ),
    scoredDimensions: available.length,
    totalDimensions: catalogHealthDimensions.length,
    components,
  };
}
