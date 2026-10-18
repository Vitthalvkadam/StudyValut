package com.studyvault.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "files")
public class StoredFile {
    @Id public UUID id = UUID.randomUUID();
    @Column(nullable = false) public UUID userId;
    public UUID folderId;
    @Column(nullable = false, length = 200) public String originalName;
    @Column(nullable = false, unique = true, length = 100) public String storageKey;
    @Column(nullable = false, length = 100) public String contentType;
    @Column(nullable = false) public long sizeBytes;
    @Column(nullable = false) public boolean favorite = false;
    @Column(nullable = false) public Instant createdAt = Instant.now();
    @Column(nullable = false) public Instant updatedAt = Instant.now();
}
