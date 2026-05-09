import SwiftUI

struct AppliancesView: View {
    @EnvironmentObject var vm: DashboardViewModel
    @State private var showingAdd = false
    @State private var editing: Appliance?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach($vm.appliances) { $appliance in
                        ApplianceRow(appliance: $appliance, onChange: {
                            vm.saveAppliances()
                        })
                        .contentShape(Rectangle())
                        .onTapGesture { editing = appliance }
                    }
                    .onDelete { idx in
                        vm.appliances.remove(atOffsets: idx)
                        vm.saveAppliances()
                    }
                } header: {
                    Text("Activez les appareils que vous souhaitez optimiser aujourd'hui")
                        .textCase(nil)
                        .font(.caption)
                }
            }
            .navigationTitle("Appareils")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showingAdd = true } label: { Image(systemName: "plus") }
                }
            }
            .sheet(isPresented: $showingAdd) {
                ApplianceFormView { new in
                    vm.appliances.append(new)
                    vm.saveAppliances()
                }
            }
            .sheet(item: $editing) { app in
                ApplianceFormView(existing: app) { updated in
                    if let idx = vm.appliances.firstIndex(where: { $0.id == updated.id }) {
                        vm.appliances[idx] = updated
                        vm.saveAppliances()
                    }
                }
            }
        }
    }
}

// MARK: - Row

struct ApplianceRow: View {
    @Binding var appliance: Appliance
    let onChange: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: appliance.icon)
                .font(.title2)
                .foregroundStyle(.orange)
                .frame(width: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text(appliance.name).font(.subheadline.bold())
                Text("\(appliance.formattedPower) · \(appliance.formattedDuration)")
                    .font(.caption).foregroundStyle(.secondary)
            }

            Spacer()

            Toggle("", isOn: $appliance.wantToRunToday)
                .tint(.orange)
                .labelsHidden()
                .onChange(of: appliance.wantToRunToday) { _, _ in onChange() }
        }
    }
}

// MARK: - Form

struct ApplianceFormView: View {
    @Environment(\.dismiss) private var dismiss
    let existing: Appliance?
    let onSave: (Appliance) -> Void

    @State private var name: String
    @State private var watts: String
    @State private var duration: String
    @State private var icon: String

    private let icons = [
        "washer", "dryer", "dishwasher", "drop.fill",
        "car.fill", "oven.fill", "microwave.fill", "bolt.fill",
    ]

    init(existing: Appliance? = nil, onSave: @escaping (Appliance) -> Void) {
        self.existing = existing
        self.onSave   = onSave
        _name     = State(initialValue: existing?.name ?? "")
        _watts    = State(initialValue: existing.map { "\($0.watts)" } ?? "")
        _duration = State(initialValue: existing.map { "\($0.durationMinutes)" } ?? "")
        _icon     = State(initialValue: existing?.icon ?? "bolt.fill")
    }

    var isValid: Bool { !name.isEmpty && Int(watts) != nil && Int(duration) != nil }

    var body: some View {
        NavigationStack {
            Form {
                Section("Informations") {
                    TextField("Nom de l'appareil", text: $name)
                    HStack {
                        TextField("Puissance", text: $watts).keyboardType(.numberPad)
                        Text("watts").foregroundStyle(.secondary)
                    }
                    HStack {
                        TextField("Durée", text: $duration).keyboardType(.numberPad)
                        Text("minutes").foregroundStyle(.secondary)
                    }
                }

                Section("Icône") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 4), spacing: 12) {
                        ForEach(icons, id: \.self) { name in
                            Button { icon = name } label: {
                                Image(systemName: name)
                                    .font(.title2)
                                    .frame(width: 48, height: 48)
                                    .background(icon == name ? Color.orange.opacity(0.2) : Color.clear)
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .navigationTitle(existing == nil ? "Nouvel appareil" : "Modifier")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Enregistrer") {
                        guard let w = Int(watts), let d = Int(duration) else { return }
                        var app = existing ?? Appliance(name: name, watts: w, durationMinutes: d, icon: icon)
                        app.name = name; app.watts = w; app.durationMinutes = d; app.icon = icon
                        onSave(app); dismiss()
                    }
                    .disabled(!isValid)
                }
            }
        }
    }
}
