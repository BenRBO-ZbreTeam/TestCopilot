import Foundation

struct Appliance: Identifiable, Codable {
    var id: UUID = UUID()
    var name: String
    var watts: Int
    var durationMinutes: Int
    var icon: String
    var wantToRunToday: Bool = false

    var formattedPower: String {
        watts >= 1000 ? String(format: "%.1f kW", Double(watts) / 1000) : "\(watts) W"
    }

    var formattedDuration: String {
        durationMinutes < 60
            ? "\(durationMinutes) min"
            : "\(durationMinutes / 60)h\(durationMinutes % 60 > 0 ? String(format: "%02d", durationMinutes % 60) : "")"
    }

    static let defaults: [Appliance] = [
        Appliance(name: "Lave-linge",     watts: 2000, durationMinutes: 90,  icon: "washer"),
        Appliance(name: "Sèche-linge",    watts: 2500, durationMinutes: 60,  icon: "dryer"),
        Appliance(name: "Lave-vaisselle", watts: 1800, durationMinutes: 75,  icon: "dishwasher"),
        Appliance(name: "Chauffe-eau",    watts: 2400, durationMinutes: 120, icon: "drop.fill"),
        Appliance(name: "Recharge VE",    watts: 3700, durationMinutes: 240, icon: "car.fill"),
    ]
}
