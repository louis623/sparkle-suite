import type {CostCapacitySnapshot, ProductClass} from '@/lib/remy-communications/nic-nac-cost-capacity'

/** Preserve source availability when exposing product-specific operations data. */
export function locCostSnapshot(snapshot: CostCapacitySnapshot, product: ProductClass) {
  const knownTelemetry = (row: Record<string, unknown>) => snapshot.telemetryAvailable ? row :
    Object.fromEntries(Object.entries(row).map(([key,value])=>[key, ['productClass','actualCents'].includes(key)?value:null]))
  const cacheAvailability = <T extends {cachedTokens:number;unknownCachedTokenRuns:number}>(row:T) =>
    ({...row,cachedTokens:row.unknownCachedTokenRuns>0?null:row.cachedTokens})
  return {
    product, month:snapshot.month, monthLabel:snapshot.monthLabel, generatedAt:snapshot.generatedAt,
    telemetryAt:snapshot.telemetryAt, telemetryAvailable:snapshot.telemetryAvailable,
    providerCostsAt:snapshot.providerCostsAt,rowsTruncated:snapshot.rowsTruncated,
    products:snapshot.products.filter(row=>row.productClass===product).map(row=>knownTelemetry(cacheAvailability(row))),
    totals:knownTelemetry(cacheAvailability(snapshot.totals)),
    rates:snapshot.telemetryAvailable?snapshot.rates:{...snapshot.rates,runsPerDay:null,tokensPerDay:null,estimatedCentsPerDay:null},
    providerBalance:snapshot.providerBalance,alerts:snapshot.alerts,coverageHoles:snapshot.coverageHoles,
    byModel:snapshot.byModel.filter(row=>row.productClass===product).map(cacheAvailability),
    modelPolicies:snapshot.modelPolicies.filter(row=>row.productClass===product),
    recentRuns:snapshot.recentRuns.filter(row=>row.productClass===product),
    provider:{[product]:snapshot.provider[product]},
  }
}
