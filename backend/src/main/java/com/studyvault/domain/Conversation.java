package com.studyvault.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "conversations")
public class Conversation {
    @Id public UUID id = UUID.randomUUID();
    @Column(nullable = false) public UUID userId;
    @Column(nullable = false, length = 120) public String title = "New chat";
    @Column(nullable = false) public Instant createdAt = Instant.now();
    @Column(nullable = false) public Instant updatedAt = Instant.now();
}
