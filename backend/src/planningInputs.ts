export class PlanningScenarioInputError extends Error {}

/** Ceil the represented decimal percentage without binary multiplication crossing an integer. */
export function minimumDemandUnits(demand:number,percentage:number):number {
  const [mantissa,exponent='0']=String(percentage).split(/[eE]/)
  const places=(mantissa.split('.')[1]?.length??0)-Number(exponent)
  let numerator=BigInt(mantissa.replace('.',''))*BigInt(demand),denominator=100n
  if(places>=0)denominator*=10n**BigInt(places)
  else numerator*=10n**BigInt(-places)
  return Number((numerator+denominator-1n)/denominator)
}

export function numeric(value: unknown, label: string, minimum: number, maximum: number, integer = false): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) {
    throw new PlanningScenarioInputError(`${label} is required and must be numeric`)
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum || (integer && !Number.isSafeInteger(parsed))) {
    throw new PlanningScenarioInputError(`${label} must be ${integer ? 'an integer' : 'a number'} from ${minimum} to ${maximum}`)
  }
  return parsed
}

export function cents(value: unknown, label: string, minimum: number): number {
  numeric(value, label, minimum, 1_000_000_000)
  const text = String(value).trim()
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(text)
  if (!match || !(match[2] || match[3])) throw new PlanningScenarioInputError(`${label} must be numeric`)
  const digits = (match[2] + (match[3] || '')).replace(/^0+/, '') || '0'
  if (digits === '0') return 0
  const decimals = (match[3]?.length || 0) - Number(match[4] || 0)
  // Valid finite amounts within the bound cannot require arbitrarily large powers.
  if (digits.length > 100 || !Number.isSafeInteger(decimals) || Math.abs(decimals) > 100) {
    throw new PlanningScenarioInputError(`${label} has unsupported precision`)
  }
  const mantissa = BigInt(digits)
  const scale = BigInt(Math.abs(2 - decimals))
  const factor = 10n ** scale
  if (decimals > 2 && mantissa % factor !== 0n) {
    throw new PlanningScenarioInputError(`${label} must have at most two decimal places`)
  }
  const exact = decimals > 2 ? mantissa / factor : mantissa * factor
  const result = Number(exact)
  if (!Number.isSafeInteger(result)) throw new PlanningScenarioInputError(`${label} exceeds safe currency arithmetic`)
  return result
}

