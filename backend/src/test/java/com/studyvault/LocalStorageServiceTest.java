package com.studyvault;

import static org.junit.jupiter.api.Assertions.*;

import com.studyvault.config.AppProperties;
import com.studyvault.service.LocalStorageService;
import java.io.ByteArrayInputStream;
import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalStorageServiceTest {
    @Test void storesAndRejectsTraversal(@TempDir Path dir) throws Exception {
        var props = new AppProperties(null, new AppProperties.Storage(dir.toString(), 25, 1024), null, null, null);
        var storage = new LocalStorageService(props);
        String key = UUID.randomUUID() + "/" + UUID.randomUUID();
        storage.store(key, new ByteArrayInputStream("hi".getBytes()));
        assertTrue(storage.load(key).exists());
        assertThrows(IllegalArgumentException.class, () -> storage.load("../../etc/passwd"));
        assertThrows(IllegalArgumentException.class, () -> storage.load(key + "/../../x"));
        storage.delete(key);
        assertFalse(storage.load(key).exists());
    }
}
