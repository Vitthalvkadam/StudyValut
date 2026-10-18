package com.studyvault.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "messages")
public class Message {
    @Id public UUID id = UUID.randomUUID();
    @Column(nullable = false) public UUID conversationId;
    @Column(nullable = false, length = 10) public String role; // "user" | "model"
    @Column(nullable = false, columnDefinition = "text") public String content;
    @Column(length = 200) public String attachmentName;
    @Column(nullable = false) public Instant createdAt = Instant.now();
}
