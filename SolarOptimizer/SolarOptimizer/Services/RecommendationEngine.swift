import Foundation

struct RecommendationEngine {

    // Base household consumption assumed when Ecojoko data is unavailable
    static let defaultBaseConsumptionW: Double = 400

    static func recommend(
        appliances: [Appliance],
        forecast: [ForecastPeriod],
        currentReading: PowerReading,
        baseConsumptionW: Double = defaultBaseConsumptionW
    ) -> [Recommendation] {
        guard !forecast.isEmpty else { return [] }

        return appliances
            .compactMap { bestWindow(for: $0, forecast: forecast, baseConsumption: baseConsumptionW) }
            .sorted { $0.startTime < $1.startTime }
    }

    // MARK: - Private

    private static func bestWindow(
        for appliance: Appliance,
        forecast: [ForecastPeriod],
        baseConsumption: Double
    ) -> Recommendation? {
        let periodMinutes = 30
        let periodsNeeded = max(1, Int(ceil(Double(appliance.durationMinutes) / Double(periodMinutes))))
        let requiredW = Double(appliance.watts) + baseConsumption

        var bestSurplusAvg = -Double.infinity
        var bestIndex = -1

        let maxStart = forecast.count - periodsNeeded
        guard maxStart >= 0 else { return nil }

        for i in 0...maxStart {
            let window = forecast[i..<(i + periodsNeeded)]
            let productions = window.map { $0.pvEstimate * 1000 }

            // Require the pessimistic estimate to cover at least 80 % of the need
            guard productions.min()! >= requiredW * 0.8 else { continue }

            let avgSurplus = productions.reduce(0, +) / Double(periodsNeeded) - requiredW
            if avgSurplus > bestSurplusAvg {
                bestSurplusAvg = avgSurplus
                bestIndex = i
            }
        }

        guard bestIndex >= 0 else { return nil }

        let window = forecast[bestIndex..<(bestIndex + periodsNeeded)]
        let avgProduction = window.map { $0.pvEstimate * 1000 }.reduce(0, +) / Double(periodsNeeded)
        let confidence = min(1.0, avgProduction / requiredW)

        return Recommendation(
            appliance: appliance,
            startTime: window.first!.periodEnd,
            endTime: window.last!.periodEnd,
            averageSurplusW: bestSurplusAvg,
            confidence: confidence
        )
    }
}
