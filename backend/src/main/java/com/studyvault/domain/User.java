package com.studyvault.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {
    @Id public UUID id = UUID.randomUUID();
    @Column(nullable = false, unique = true, length = 254) public String email;
    @Column(nullable = false, length = 80) public String displayName;
    @Column(nullable = false, length = 100) public String passwordHash;
    @Column(nullable = false) public int tokenVersion = 0;
    @Column(nullable = false) public Instant createdAt = Instant.now();
}
