import Foundation

struct PowerReading {
    let timestamp: Date
    let consumptionW: Double
    let productionW: Double

    var surplusW: Double { productionW - consumptionW }
    var isExporting: Bool { surplusW > 0 }

    static let zero = PowerReading(timestamp: Date(), consumptionW: 0, productionW: 0)
}
