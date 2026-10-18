package com.studyvault.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.studyvault.config.AppProperties;
import com.studyvault.domain.Message;
import com.studyvault.exception.ApiException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/** Calls OpenRouter (OpenAI-compatible chat API) from the server only. The API key never leaves the backend. */
@Service
public class AiService {
    private static final Logger log = LoggerFactory.getLogger(AiService.class);
    private static final String SYSTEM = "You are Study Vault's study assistant for students. Explain ideas clearly and "
            + "step by step, use simple examples, summarise or quiz the student when asked, and be honest when you are "
            + "unsure. If a file is attached, base your answer on it.";

    private final RestClient client;
    private final String apiKey;
    private final String model;

    public AiService(AppProperties props) {
        this.apiKey = props.openrouter().apiKey();
        this.model = props.openrouter().model();
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(10));
        factory.setReadTimeout(Duration.ofSeconds(120));
        this.client = RestClient.builder().baseUrl("https://openrouter.ai/api/v1").requestFactory(factory).build();
    }

    public boolean configured() { return apiKey != null && !apiKey.isBlank(); }

    public String generate(List<Message> history, String text, byte[] attachment, String mime) {
        if (!configured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "The AI assistant isn't set up yet. Ask the administrator to add an OpenRouter API key on the server.");
        }
        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", SYSTEM));
        for (Message m : history) {
            String t = m.attachmentName != null ? "[Attached file: " + m.attachmentName + "]\n" + m.content : m.content;
            messages.add(Map.of("role", "model".equals(m.role) ? "assistant" : "user", "content", t));
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        if (attachment == null) {
            messages.add(Map.of("role", "user", "content", text));
        } else {
            String dataUrl = "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(attachment);
            List<Object> parts = new ArrayList<>();
            parts.add(Map.of("type", "text", "text", text));
            if (mime.startsWith("image/")) {
                parts.add(Map.of("type", "image_url", "image_url", Map.of("url", dataUrl)));
            } else {
                parts.add(Map.of("type", "file", "file", Map.of("filename", "document.pdf", "file_data", dataUrl)));
                // Free text-extraction engine, so PDFs never trigger paid OCR by surprise.
                body.put("plugins", List.of(Map.of("id", "file-parser", "pdf", Map.of("engine", "pdf-text"))));
            }
            messages.add(Map.of("role", "user", "content", parts));
        }
        body.put("messages", messages);

        try {
            JsonNode root = client.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .header("HTTP-Referer", "http://localhost:5173")
                    .header("X-Title", "Study Vault")
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            String out = root == null ? "" : root.path("choices").path(0).path("message").path("content").asText("").trim();
            if (out.isEmpty()) {
                JsonNode err = root == null ? null : root.path("error");
                if (err != null && !err.isMissingNode()) log.warn("OpenRouter error: {}", err.path("message").asText());
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "The assistant couldn't answer that. Try rephrasing your question.");
            }
            return out;
        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();
            log.warn("OpenRouter returned HTTP {}: {}", status, abbreviate(e.getResponseBodyAsString()));
            switch (status) {
                case 401 -> throw new ApiException(HttpStatus.BAD_GATEWAY, "The OpenRouter API key was rejected. Check OPENROUTER_API_KEY on the server.");
                case 402 -> throw new ApiException(HttpStatus.BAD_GATEWAY, "The OpenRouter account is out of credits.");
                case 404 -> throw new ApiException(HttpStatus.BAD_GATEWAY, "The configured AI model wasn't found, or it doesn't support this kind of input. Check OPENROUTER_MODEL.");
                case 429 -> throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "The AI service is busy or rate-limited. Try again shortly.");
                default -> throw new ApiException(HttpStatus.BAD_GATEWAY, "The AI service returned an error. Please try again.");
            }
        } catch (RestClientException e) {
            log.warn("OpenRouter call failed: {} - {}", e.getClass().getSimpleName(), e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Couldn't reach the AI service. Please try again.");
        }
    }

    private static String abbreviate(String s) {
        return s == null ? "" : s.length() > 300 ? s.substring(0, 300) + "..." : s;
    }
}
