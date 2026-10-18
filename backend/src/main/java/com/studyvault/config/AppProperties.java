package com.studyvault.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Jwt jwt, Storage storage, OpenRouter openrouter, Cors cors, Cookie cookie) {
    public record Jwt(String secret, long expiryHours) {}
    public record Storage(String dir, long maxFileMb, long quotaMb) {}
    public record OpenRouter(String apiKey, String model) {}
    public record Cors(List<String> allowedOrigins) {}
    public record Cookie(boolean secure) {}
}
