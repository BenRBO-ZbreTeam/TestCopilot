import Foundation

final class SolcastService {
    static let shared = SolcastService()

    private let baseURL = "https://api.solcast.com.au"
    private var apiKey: String = ""
    private var resourceId: String = ""

    private init() {}

    func configure(apiKey: String, resourceId: String) {
        self.apiKey = apiKey
        self.resourceId = resourceId
    }

    func fetchForecast(hours: Int = 48) async throws -> [ForecastPeriod] {
        guard !apiKey.isEmpty, !resourceId.isEmpty else {
            throw SolcastError.notConfigured
        }

        var components = URLComponents(
            string: "\(baseURL)/rooftop_sites/\(resourceId)/forecasts.json"
        )!
        components.queryItems = [
            URLQueryItem(name: "hours",   value: "\(hours)"),
            URLQueryItem(name: "period",  value: "PT30M"),
            URLQueryItem(name: "format",  value: "json"),
            URLQueryItem(name: "api_key", value: apiKey),
        ]

        let (data, response) = try await URLSession.shared.data(from: components.url!)

        switch (response as? HTTPURLResponse)?.statusCode {
        case 200: break
        case 429: throw SolcastError.quotaExceeded
        default:  throw SolcastError.fetchFailed
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(SolcastResponse.self, from: data).forecasts
    }

    enum SolcastError: LocalizedError {
        case notConfigured, fetchFailed, quotaExceeded

        var errorDescription: String? {
            switch self {
            case .notConfigured:  return "Solcast non configuré (clé API ou resource ID manquant)"
            case .fetchFailed:    return "Échec de récupération des prévisions Solcast"
            case .quotaExceeded:  return "Quota Solcast dépassé (10 appels/jour sur le tier gratuit)"
            }
        }
    }
}
