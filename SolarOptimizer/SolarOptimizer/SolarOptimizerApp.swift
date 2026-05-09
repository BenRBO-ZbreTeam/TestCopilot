import SwiftUI

@main
struct SolarOptimizerApp: App {
    @StateObject private var viewModel = DashboardViewModel()

    init() {
        NotificationService.shared.requestAuthorization()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(viewModel)
        }
    }
}
