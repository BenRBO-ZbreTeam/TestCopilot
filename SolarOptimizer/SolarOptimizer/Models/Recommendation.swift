import Foundation

struct Recommendation: Identifiable {
    let id: UUID = UUID()
    let appliance: Appliance
    let startTime: Date
    let endTime: Date
    let averageSurplusW: Double
    let confidence: Double  // 0–1

    var isNow: Bool {
        startTime <= Date() && Date() <= endTime
    }

    var formattedWindow: String {
        let fmt = DateFormatter()
        fmt.dateFormat = "HH:mm"
        if isNow { return "Maintenant" }
        if Calendar.current.isDateInToday(startTime) { return fmt.string(from: startTime) }
        return "Demain \(fmt.string(from: startTime))"
    }
}
