package com.studyvault.repository;

import com.studyvault.domain.Conversation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {
    Optional<Conversation> findByIdAndUserId(UUID id, UUID userId);
    List<Conversation> findByUserIdOrderByUpdatedAtDesc(UUID userId);
}
