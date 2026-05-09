import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var vm: DashboardViewModel
    @State private var testingEcojoko = false
    @State private var ecojokoTestResult: String?

    var body: some View {
        NavigationStack {
            Form {
                ecojokoSection
                solcastSection
                installationSection
                aboutSection
            }
            .navigationTitle("Réglages")
        }
    }

    // MARK: - Ecojoko

    private var ecojokoSection: some View {
        Section {
            TextField("Email", text: $vm.ecojokoEmail)
                .keyboardType(.emailAddress)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)

            SecureField("Mot de passe", text: $vm.ecojokoPassword)

            TextField("ID de l'appareil", text: $vm.ecojokoDeviceId)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .font(.system(.body, design: .monospaced))

            Button {
                Task { await testEcojoko() }
            } label: {
                HStack {
                    Text("Tester la connexion")
                    Spacer()
                    if testingEcojoko { ProgressView().tint(.orange) }
                }
            }
            .disabled(vm.ecojokoEmail.isEmpty || testingEcojoko)

            if let result = ecojokoTestResult {
                Label(result, systemImage: result.hasPrefix("✓") ? "checkmark.circle.fill" : "xmark.circle.fill")
                    .font(.caption)
                    .foregroundStyle(result.hasPrefix("✓") ? .green : .red)
            }
        } header: {
            Label("Ecojoko", systemImage: "bolt.fill")
        } footer: {
            Text("Retrouvez l'ID de votre appareil dans l'app Ecojoko → Mon compte → Mes appareils.")
        }
    }

    private func testEcojoko() async {
        testingEcojoko = true
        ecojokoTestResult = nil
        do {
            EcojokoService.shared.configure(deviceId: vm.ecojokoDeviceId)
            _ = try await EcojokoService.shared.login(email: vm.ecojokoEmail, password: vm.ecojokoPassword)
            let reading = try await EcojokoService.shared.fetchLivePower()
            ecojokoTestResult = "✓ \(Int(reading.consumptionW)) W conso · \(Int(reading.productionW)) W prod"
        } catch {
            ecojokoTestResult = "✗ \(error.localizedDescription)"
        }
        testingEcojoko = false
    }

    // MARK: - Solcast

    private var solcastSection: some View {
        Section {
            TextField("Clé API", text: $vm.solcastApiKey)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .font(.system(.body, design: .monospaced))

            TextField("Resource ID du site", text: $vm.solcastResourceId)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .font(.system(.body, design: .monospaced))
        } header: {
            Label("Solcast", systemImage: "sun.max.fill")
        } footer: {
            Text("Créez votre site sur toolkit.solcast.com.au avec vos coordonnées GPS, inclinaison (30°) et orientation (135° = Sud-Est). Quota gratuit : 10 appels/jour.")
        }
    }

    // MARK: - Installation (informative)

    private var installationSection: some View {
        Section {
            LabeledContent("Localisation",    value: "Saint-Vincent-de-Tyrosse")
            LabeledContent("Orientation",     value: "Sud-Est (135°)")
            LabeledContent("Puissance crête", value: "1 400 Wc")
        } header: {
            Label("Installation", systemImage: "rectangle.3.group.fill")
        } footer: {
            Text("Ces valeurs doivent correspondre à la configuration de votre site Solcast.")
        }
    }

    // MARK: - About

    private var aboutSection: some View {
        Section("À propos") {
            LabeledContent("Version",       value: "1.0.0")
            LabeledContent("Prévisions",    value: "Solcast API")
            LabeledContent("Consommation",  value: "Ecojoko (API communautaire)")
            LabeledContent("Actualisation", value: "Toutes les 5 minutes")
        }
    }
}
