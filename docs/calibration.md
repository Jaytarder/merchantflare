# Confidence Calibration

## Measurement contract

Each experiment prediction stores confidence, prediction timestamp, immutable success criteria, resolved success/failure, posterior confidence, and resolution timestamp. Metrics are organization-scoped and include Brier score, threshold prediction accuracy, calibration-curve bins, confidence distribution, observed decision success rate, and mean absolute posterior confidence drift.

The internal dashboard also reports evidence coverage, evidence freshness, false-positive and false-negative rates, decision latency, 30-day throughput, lesson growth, and explicit lesson reuse. When a cohort has no resolved predictions, values are shown as unavailable; MerchantFlare does not estimate or fabricate them.

## Interpretation

Brier score is the mean squared difference between predicted confidence and the binary predefined outcome. Lower is better. Calibration bins compare mean predicted confidence with observed success rate. These metrics describe a cohort and do not establish causation.

## Verified

Unit and in-process integration fixtures verify Brier score, accuracy, drift, distributions, and calibration bins. The Atlas title fixture validates measurement and exact rollback contracts, not a live Amazon result.

## Planned or blocked

The first real cohort and trend baseline require resolved experiments in isolated development. Confidence intervals, cohort segmentation, longitudinal snapshots, and automated calibration alerts are planned.
