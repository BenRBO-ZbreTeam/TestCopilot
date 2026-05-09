import Foundation

struct ForecastPeriod: Identifiable, Codable {
    var id: UUID = UUID()
    let periodEnd: Date
    let pvEstimate: Double    // kW median
    let pvEstimate10: Double  // kW pessimistic
    let pvEstimate90: Double  // kW optimistic

    var watts: Int { Int(pvEstimate * 1000) }

    enum CodingKeys: String, CodingKey {
        case periodEnd    = "period_end"
        case pvEstimate   = "pv_estimate"
        case pvEstimate10 = "pv_estimate10"
        case pvEstimate90 = "pv_estimate90"
    }
}

struct SolcastResponse: Codable {
    let forecasts: [ForecastPeriod]
}
