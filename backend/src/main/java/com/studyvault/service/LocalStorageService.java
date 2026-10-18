package com.studyvault.service;

import com.studyvault.config.AppProperties;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

/**
 * Stores files outside any web-served directory. Keys are server-generated "{userUuid}/{fileUuid}" strings;
 * nothing the client sends is ever used in a path.
 */
@Service
public class LocalStorageService implements StorageService {
    private static final Logger log = LoggerFactory.getLogger(LocalStorageService.class);
    private static final Pattern KEY = Pattern.compile("^[0-9a-f]{8}-[0-9a-f-]{27}/[0-9a-f]{8}-[0-9a-f-]{27}$");
    private final Path root;

    public LocalStorageService(AppProperties props) throws IOException {
        this.root = Path.of(props.storage().dir()).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    Path resolve(String key) {
        if (key == null || !KEY.matcher(key).matches()) throw new IllegalArgumentException("Invalid storage key");
        Path p = root.resolve(key).normalize();
        if (!p.startsWith(root)) throw new IllegalArgumentException("Invalid storage key");
        return p;
    }

    @Override
    public void store(String key, InputStream in) throws IOException {
        Path p = resolve(key);
        Files.createDirectories(p.getParent());
        Files.copy(in, p, StandardCopyOption.REPLACE_EXISTING);
    }

    @Override
    public Resource load(String key) {
        return new PathResource(resolve(key));
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException | IllegalArgumentException e) {
            log.warn("Could not delete stored file {}", key);
        }
    }
}
