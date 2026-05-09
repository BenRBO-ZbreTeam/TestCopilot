import Foundation

// Reverse-engineered from the community Home Assistant integration (Little Monkey).
// Endpoints may change without notice; treat failures gracefully.
final class EcojokoService {
    static let shared = EcojokoService()

    private let baseURL = "https://service.ecojoko.com"
    private var authToken: String?
    private var deviceId: String = ""

    private init() {}

    func configure(deviceId: String) {
        self.deviceId = deviceId
    }

    func login(email: String, password: String) async throws -> String {
        let url = URL(string: "\(baseURL)/users/login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["email": email, "password": password])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw EcojokoError.authenticationFailed
        }

        let result = try JSONDecoder().decode(LoginResponse.self, from: data)
        authToken = result.token
        return result.token
    }

    func fetchLivePower() async throws -> PowerReading {
        guard let token = authToken else { throw EcojokoError.notAuthenticated }
        guard !deviceId.isEmpty else { throw EcojokoError.deviceNotFound }

        let url = URL(string: "\(baseURL)/pge/device/\(deviceId)/live")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        let result = try JSONDecoder().decode(LiveResponse.self, from: data)

        return PowerReading(
            timestamp: Date(),
            consumptionW: Double(result.consumption ?? 0),
            productionW: Double(result.production ?? 0)
        )
    }

    // MARK: - Private types

    private struct LoginResponse: Codable { let token: String }

    private struct LiveResponse: Codable {
        let consumption: Int?
        let production: Int?
    }

    enum EcojokoError: LocalizedError {
        case authenticationFailed, notAuthenticated, deviceNotFound

        var errorDescription: String? {
            switch self {
            case .authenticationFailed: return "Échec de la connexion Ecojoko"
            case .notAuthenticated:     return "Non connecté à Ecojoko"
            case .deviceNotFound:       return "Appareil Ecojoko introuvable"
            }
        }
    }
}
