import SwiftUI
import Charts

struct ForecastChartView: View {
    @EnvironmentObject var vm: DashboardViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if vm.forecast.isEmpty {
                        ContentUnavailableView(
                            "Pas de prévisions",
                            systemImage: "cloud.sun",
                            description: Text("Configurez votre clé Solcast dans Réglages.")
                        )
                        .padding(.top, 60)
                    } else {
                        productionChart
                        if !vm.recommendations.isEmpty { bestWindowsList }
                    }
                }
                .padding()
            }
            .navigationTitle("Prévisions 48h")
        }
    }

    // MARK: - Chart

    private var productionChart: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Production estimée")
                .font(.headline)

            Chart(vm.forecast) { period in
                // Confidence band
                AreaMark(
                    x: .value("Heure", period.periodEnd),
                    yStart: .value("Min", period.pvEstimate10),
                    yEnd: .value("Max", period.pvEstimate90)
                )
                .foregroundStyle(.orange.opacity(0.15))

                // Median line
                LineMark(
                    x: .value("Heure", period.periodEnd),
                    y: .value("kW", period.pvEstimate)
                )
                .foregroundStyle(.orange)
                .lineStyle(StrokeStyle(lineWidth: 2.5))

                // Now marker
                RuleMark(x: .value("Maintenant", Date()))
                    .foregroundStyle(.blue.opacity(0.4))
                    .lineStyle(StrokeStyle(dash: [5]))
                    .annotation(position: .top) {
                        Text("maintenant")
                            .font(.caption2)
                            .foregroundStyle(.blue)
                    }
            }
            .chartYAxisLabel("kW")
            .chartXAxis {
                AxisMarks(values: .stride(by: .hour, count: 6)) { _ in
                    AxisGridLine()
                    AxisValueLabel(format: .dateTime.hour(.defaultDigits(amPM: .omitted)).minute())
                }
            }
            .frame(height: 220)
            .padding(.vertical, 4)
        }
        .padding()
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Best windows

    private var bestWindowsList: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Meilleures fenêtres")
                .font(.headline)

            ForEach(vm.recommendations) { rec in
                HStack {
                    Image(systemName: rec.appliance.icon)
                        .foregroundStyle(.orange)
                        .frame(width: 30)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(rec.appliance.name)
                            .font(.subheadline.bold())
                        Text("\(rec.formattedWindow) · \(rec.appliance.formattedDuration)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 3) {
                        Text("+\(Int(rec.averageSurplusW)) W")
                            .font(.subheadline)
                            .foregroundStyle(.green)
                        ConfidenceDots(value: rec.confidence)
                    }
                }
                .padding()
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
        }
    }
}
