import {executeDatabricksStatement} from './databricks'

const WAREHOUSE = 'workspace.medshield_warehouse'
const RSI_SIGNAL = 'RSI (NASA rainfall severity proxy)'

/** Current warehouse release: the one release no later release names as its predecessor (same rule as the copy check). */
export const CURRENT_RELEASE_SQL = `SELECT release_id FROM ${WAREHOUSE}.release_pointer p
  WHERE NOT EXISTS (SELECT 1 FROM ${WAREHOUSE}.release_pointer q WHERE q.previous_release_id=p.release_id)`

export function territorySignalSql(releaseId: string) {
  if (!/^[a-f0-9]{16}$/.test(releaseId)) throw new Error('Invalid warehouse release id')
  const table = `${WAREHOUSE}.release_${releaseId}_territory_signal_monthly_v2`
  // RSI rows are approved (decision 012). DII rows are only counted: their territory mapping is still pending.
  return `SELECT territory_id, calendar_month, CAST(signal_value AS STRING) AS signal_value, mapping_status, 'RSI' AS kind
      FROM ${table} WHERE signal_family='WEATHER_INDEX' AND signal='${RSI_SIGNAL}' AND is_external_join_ready = true
    UNION ALL
    SELECT territory_id, NULL, CAST(COUNT(*) AS STRING), MIN(mapping_status), 'DII_PENDING' FROM ${table}
      WHERE signal_family='DISEASE_INTENSITY' GROUP BY territory_id
    ORDER BY kind, territory_id, calendar_month`
}

/** 'PH-PROVINCE-CAMARINES-NORTE' -> 'CAMARINES NORTE', the confirmed recorded delivery label. */
export const territoryLabel = (id: string) => id.replace(/^PH-PROVINCE-/, '').replace(/-/g, ' ')

export function buildTerritorySignals(releaseId: string, rows: Array<Record<string, string | null>>) {
  const rsi = [], diiPending = []
  for (const row of rows) {
    if (!row.territory_id || !/^PH-PROVINCE-[A-Z-]+$/.test(row.territory_id)) throw new Error('Unexpected territory id')
    if (row.kind === 'RSI') {
      const value = Number(row.signal_value)
      if (!row.calendar_month || !/^\d{4}-\d{2}$/.test(row.calendar_month) || !Number.isFinite(value)) throw new Error('Invalid RSI row')
      rsi.push({area: territoryLabel(row.territory_id), territory_id: row.territory_id, month: row.calendar_month, rsi: value})
    } else if (row.kind === 'DII_PENDING') {
      diiPending.push({area: territoryLabel(row.territory_id), rows: Number(row.signal_value), mapping_status: row.mapping_status})
    } else throw new Error('Unexpected signal kind')
  }
  if (!rsi.length) throw new Error('No approved RSI rows in the current release')
  return {status: 'territory_signal_context', release_id: releaseId,
    rsi, rsi_label: 'RSI: NASA POWER rainfall severity proxy (decision 012). Proxy, not observed station rainfall.',
    dii_pending: diiPending, dii_status: 'withheld_pending_doh_territory_mapping',
    interpretation: 'context_proxy_not_demand_not_forecast_input', forecast_approved: false}
}

export async function readTerritorySignals(execute = executeDatabricksStatement) {
  const head = (await execute(CURRENT_RELEASE_SQL, {rowLimit: 2})).rows
  if (head.length !== 1 || !head[0].release_id) throw new Error('No single current warehouse release')
  const releaseId = String(head[0].release_id)
  return buildTerritorySignals(releaseId, (await execute(territorySignalSql(releaseId), {rowLimit: 5000})).rows)
}
