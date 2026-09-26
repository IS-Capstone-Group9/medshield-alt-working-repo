SELECT
    territory,
    signal,
    COUNT(DISTINCT period_start) AS observed_case_months,
    96 AS expected_months_2018_2025,
    96 - COUNT(DISTINCT period_start) AS no_observation_months,
    SUM(value) AS reported_case_signal,
    CASE
        WHEN COUNT(DISTINCT period_start) = 96
            THEN 'OBSERVED_ALL_MONTHS'
        WHEN COUNT(DISTINCT period_start) >= 72
            THEN 'SUBSTANTIAL_COVERAGE_REVIEW_GAPS'
        ELSE 'SPARSE_OBSERVATIONS'
    END AS coverage_status
FROM workspace.medshield_audit
    .external_restart_doh_territory_candidate
GROUP BY territory, signal
ORDER BY territory, signal;