package com.studyvault.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "folders")
public class Folder {
    @Id public UUID id = UUID.randomUUID();
    @Column(nullable = false) public UUID userId;
    public UUID parentId;
    @Column(nullable = false, length = 100) public String name;
    @Column(nullable = false, length = 20) public String color;
    @Column(nullable = false) public Instant createdAt = Instant.now();
    @Column(nullable = false) public Instant updatedAt = Instant.now();
}
