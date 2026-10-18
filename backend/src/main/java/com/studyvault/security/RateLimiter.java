package com.studyvault.security;

import com.studyvault.exception.ApiException;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** Small in-memory fixed-window limiter. Swap for Redis/Bucket4j if you run multiple instances. */
@Component
public class RateLimiter {
    private final ConcurrentHashMap<String, long[]> windows = new ConcurrentHashMap<>();

    public void check(String key, int limit, int windowSeconds) {
        long now = System.currentTimeMillis();
        long windowMs = windowSeconds * 1000L;
        long[] w = windows.compute(key, (k, v) -> {
            if (v == null || now - v[0] >= windowMs) return new long[]{now, 1};
            v[1]++;
            return v;
        });
        if (w[1] > limit) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Please wait a minute and try again.");
        }
        if (windows.size() > 10_000) windows.entrySet().removeIf(e -> now - e.getValue()[0] >= windowMs);
    }
}
