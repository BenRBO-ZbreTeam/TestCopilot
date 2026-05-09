import SwiftUI
import Charts

struct DashboardView: View {
    @EnvironmentObject var vm: DashboardViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    surplusGauge
                    liveStats
                    if !vm.recommendations.isEmpty { recommendationsSection }
                    if vm.error != nil { errorBanner }
                    if vm.solcastApiKey.isEmpty && vm.ecojokoEmail.isEmpty { setupBanner }
                }
                .padding()
            }
            .navigationTitle("Solar Optimizer")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { Task { await vm.refresh() } } label: {
                        if vm.isLoading { ProgressView().tint(.orange) }
                        else { Image(systemName: "arrow.clockwise") }
                    }
                    .disabled(vm.isLoading)
                }
            }
            .task { await vm.refresh() }
        }
    }

    // MARK: - Gauge

    private var surplusGauge: some View {
        VStack(spacing: 6) {
            ZStack {
                Circle()
                    .stroke(Color.gray.opacity(0.15), lineWidth: 18)
                    .frame(width: 190, height: 190)

                Circle()
                    .trim(from: 0, to: gaugeProgress)
                    .stroke(
                        vm.surplusColor,
                        style: StrokeStyle(lineWidth: 18, lineCap: .round)
                    )
                    .frame(width: 190, height: 190)
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut(duration: 0.6), value: gaugeProgress)

                VStack(spacing: 2) {
                    Image(systemName: vm.surplusW >= 0 ? "sun.max.fill" : "moon.fill")
                        .font(.title2)
                        .foregroundStyle(.orange)
                    Text(formattedSurplus)
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundStyle(vm.surplusColor)
                    Text(vm.surplusW >= 0 ? "surplus" : "déficit")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if let refreshed = vm.lastRefreshed {
                Text("Mis à jour \(refreshed.formatted(date: .omitted, time: .shortened))")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.top, 8)
    }

    private var gaugeProgress: CGFloat {
        CGFloat(max(0, min(1, (vm.surplusW + 1400) / 2800)))
    }

    private var formattedSurplus: String {
        let w = abs(vm.surplusW)
        return w >= 1000 ? String(format: "%.1f kW", w / 1000) : "\(Int(w)) W"
    }

    // MARK: - Live stats

    private var liveStats: some View {
        HStack(spacing: 12) {
            statCard("Production", value: vm.currentReading.productionW,
                     icon: "sun.min.fill", color: .orange)
            statCard("Consommation", value: vm.currentReading.consumptionW,
                     icon: "bolt.fill", color: .blue)
        }
    }

    private func statCard(_ title: String, value: Double, icon: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(title, systemImage: icon)
                .font(.caption)
                .foregroundStyle(color)
            Text(formatW(value))
                .font(.title3.bold())
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    // MARK: - Recommendations

    private var recommendationsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Recommandations")
                .font(.headline)
            ForEach(vm.recommendations) { rec in
                RecommendationRow(recommendation: rec)
            }
        }
    }

    // MARK: - Banners

    private var errorBanner: some View {
        Label(vm.error ?? "", systemImage: "exclamationmark.triangle.fill")
            .font(.caption)
            .foregroundStyle(.orange)
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.orange.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var setupBanner: some View {
        VStack(spacing: 10) {
            Image(systemName: "gearshape.2.fill")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("Configurez Solcast et Ecojoko dans Réglages pour démarrer.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .font(.subheadline)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func formatW(_ w: Double) -> String {
        w >= 1000 ? String(format: "%.2f kW", w / 1000) : "\(Int(w)) W"
    }
}

// MARK: - RecommendationRow

struct RecommendationRow: View {
    let recommendation: Recommendation

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: recommendation.appliance.icon)
                .font(.title2)
                .foregroundStyle(.orange)
                .frame(width: 38)

            VStack(alignment: .leading, spacing: 3) {
                Text(recommendation.appliance.name)
                    .font(.subheadline.bold())
                Text(recommendation.formattedWindow + " · " + recommendation.appliance.formattedDuration)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 3) {
                Text("+\(Int(recommendation.averageSurplusW)) W")
                    .font(.subheadline.bold())
                    .foregroundStyle(.green)
                ConfidenceDots(value: recommendation.confidence)
            }
        }
        .padding()
        .background(recommendation.isNow ? Color.green.opacity(0.08) : Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay {
            if recommendation.isNow {
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Color.green, lineWidth: 1.5)
            }
        }
    }
}

// MARK: - ConfidenceDots

struct ConfidenceDots: View {
    let value: Double  // 0–1

    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<3, id: \.self) { i in
                Circle()
                    .frame(width: 7, height: 7)
                    .foregroundStyle(Double(i) < value * 3 ? Color.green : Color(.systemGray4))
            }
        }
    }
}
