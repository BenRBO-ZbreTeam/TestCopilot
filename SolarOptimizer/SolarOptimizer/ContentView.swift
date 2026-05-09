import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem { Label("Tableau de bord", systemImage: "sun.max.fill") }

            AppliancesView()
                .tabItem { Label("Appareils", systemImage: "washer.fill") }

            ForecastChartView()
                .tabItem { Label("Prévisions", systemImage: "chart.line.uptrend.xyaxis") }

            SettingsView()
                .tabItem { Label("Réglages", systemImage: "gearshape.fill") }
        }
        .tint(.orange)
    }
}
