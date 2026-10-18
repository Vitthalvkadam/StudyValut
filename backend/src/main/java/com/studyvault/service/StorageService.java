package com.studyvault.service;

import java.io.IOException;
import java.io.InputStream;
import org.springframework.core.io.Resource;

/** Abstraction over where file bytes live. Add an S3/GCS implementation later without touching callers. */
public interface StorageService {
    void store(String key, InputStream in) throws IOException;
    Resource load(String key);
    void delete(String key);
}
