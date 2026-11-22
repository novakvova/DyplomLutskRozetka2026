using System.Net.Http.Json;
using System.Text.Json.Serialization;
using RozetkaAPI.Contracts;

namespace RozetkaAPI.Services;

public class DeliveryService(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<DeliveryService> logger)
{
    public async Task<IReadOnlyList<CityResponse>> CitiesAsync(string? query, CancellationToken cancellationToken)
    {
        var term = query?.Trim() ?? "";
        if (term.Length < 2)
            return [];

        if (!string.IsNullOrWhiteSpace(configuration["NovaPoshta:ApiKey"]))
        {
            try
            {
                var data = await PostAsync<NpCity>("Address", "getCities", new { FindByString = term, Limit = "10" }, cancellationToken);
                if (data.Count > 0)
                    return data.Select(city => new CityResponse(city.Ref, city.Description)).ToList();
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "Нова пошта не відповіла на пошук міста");
            }
        }

        return FallbackCities
            .Where(city => city.Name.Contains(term, StringComparison.OrdinalIgnoreCase))
            .Take(10)
            .ToList();
    }

    public async Task<IReadOnlyList<WarehouseResponse>> WarehousesAsync(string? cityRef, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(cityRef))
            return [];

        if (!string.IsNullOrWhiteSpace(configuration["NovaPoshta:ApiKey"]) && !cityRef.StartsWith("local-", StringComparison.Ordinal))
        {
            try
            {
                var data = await PostAsync<NpWarehouse>("Address", "getWarehouses", new { CityRef = cityRef, Limit = "30" }, cancellationToken);
                if (data.Count > 0)
                    return data.Select(item => new WarehouseResponse(item.Ref, item.Description)).ToList();
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "Нова пошта не відповіла на список відділень");
            }
        }

        return FallbackWarehouses.TryGetValue(cityRef, out var warehouses) ? warehouses : [];
    }

    private async Task<List<T>> PostAsync<T>(string model, string method, object properties, CancellationToken cancellationToken)
    {
        var client = httpClientFactory.CreateClient("novaposhta");
        using var response = await client.PostAsJsonAsync("", new
        {
            apiKey = configuration["NovaPoshta:ApiKey"],
            modelName = model,
            calledMethod = method,
            methodProperties = properties
        }, cancellationToken);
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<NpEnvelope<T>>(cancellationToken);
        return body?.Data ?? [];
    }

    private static readonly CityResponse[] FallbackCities =
    [
        new("local-lutsk", "Луцьк"),
        new("local-kyiv", "Київ"),
        new("local-lviv", "Львів"),
        new("local-odesa", "Одеса"),
        new("local-kharkiv", "Харків"),
        new("local-dnipro", "Дніпро")
    ];

    private static readonly Dictionary<string, WarehouseResponse[]> FallbackWarehouses = new()
    {
        ["local-lutsk"] =
        [
            new("local-lutsk-1", "Відділення №1, вул. Ковельська, 1"),
            new("local-lutsk-3", "Відділення №3, просп. Волі, 12"),
            new("local-lutsk-8", "Відділення №8, вул. Рівненська, 45")
        ],
        ["local-kyiv"] =
        [
            new("local-kyiv-1", "Відділення №1, вул. Хрещатик, 22"),
            new("local-kyiv-15", "Відділення №15, просп. Перемоги, 67")
        ],
        ["local-lviv"] = [new("local-lviv-2", "Відділення №2, пл. Ринок, 1")],
        ["local-odesa"] = [new("local-odesa-4", "Відділення №4, вул. Дерибасівська, 10")],
        ["local-kharkiv"] = [new("local-kharkiv-6", "Відділення №6, вул. Сумська, 18")],
        ["local-dnipro"] = [new("local-dnipro-5", "Відділення №5, просп. Дмитра Яворницького, 50")]
    };

    private sealed class NpEnvelope<T>
    {
        [JsonPropertyName("data")]
        public List<T> Data { get; set; } = [];
    }

    private sealed class NpCity
    {
        [JsonPropertyName("Ref")]
        public string Ref { get; set; } = "";

        [JsonPropertyName("Description")]
        public string Description { get; set; } = "";
    }

    private sealed class NpWarehouse
    {
        [JsonPropertyName("Ref")]
        public string Ref { get; set; } = "";

        [JsonPropertyName("Description")]
        public string Description { get; set; } = "";
    }
}
