import SwiftUI

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var currentReading: PowerReading = .zero
    @Published var forecast: [ForecastPeriod] = []
    @Published var recommendations: [Recommendation] = []
    @Published var appliances: [Appliance] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var lastRefreshed: Date?

    @AppStorage("ecojoko_email")       var ecojokoEmail      = ""
    @AppStorage("ecojoko_password")    var ecojokoPassword   = ""
    @AppStorage("ecojoko_device_id")   var ecojokoDeviceId   = ""
    @AppStorage("solcast_api_key")     var solcastApiKey     = ""
    @AppStorage("solcast_resource_id") var solcastResourceId = ""

    var surplusW: Double { currentReading.surplusW }

    var surplusColor: Color {
        switch surplusW {
        case ..<(-200): return .red
        case -200..<0:  return .orange
        case 0..<500:   return .yellow
        default:        return .green
        }
    }

    init() {
        loadAppliances()
        Task { await refresh() }
        startAutoRefresh()
    }

    func refresh() async {
        isLoading = true
        error = nil

        async let live: () = refreshLiveReading()
        async let fc: ()   = refreshForecast()
        await live; await fc

        refreshRecommendations()
        scheduleNotifications()
        lastRefreshed = Date()
        isLoading = false
    }

    func refreshRecommendations() {
        recommendations = RecommendationEngine.recommend(
            appliances: appliances.filter { $0.wantToRunToday },
            forecast: forecast,
            currentReading: currentReading
        )
    }

    func saveAppliances() {
        if let data = try? JSONEncoder().encode(appliances) {
            UserDefaults.standard.set(data, forKey: "appliances")
        }
        refreshRecommendations()
    }

    // MARK: - Private

    private func refreshLiveReading() async {
        guard !ecojokoDeviceId.isEmpty, !ecojokoEmail.isEmpty else { return }
        do {
            EcojokoService.shared.configure(deviceId: ecojokoDeviceId)
            _ = try await EcojokoService.shared.login(email: ecojokoEmail, password: ecojokoPassword)
            currentReading = try await EcojokoService.shared.fetchLivePower()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func refreshForecast() async {
        guard !solcastApiKey.isEmpty, !solcastResourceId.isEmpty else { return }
        do {
            SolcastService.shared.configure(apiKey: solcastApiKey, resourceId: solcastResourceId)
            forecast = try await SolcastService.shared.fetchForecast()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func scheduleNotifications() {
        NotificationService.shared.cancelAll()
        for rec in recommendations where rec.startTime > Date() {
            NotificationService.shared.scheduleNotification(for: rec)
        }
    }

    private func loadAppliances() {
        if let data = UserDefaults.standard.data(forKey: "appliances"),
           let saved = try? JSONDecoder().decode([Appliance].self, from: data) {
            appliances = saved
        } else {
            appliances = Appliance.defaults
        }
    }

    private func startAutoRefresh() {
        Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(300))
                await refresh()
            }
        }
    }
}
