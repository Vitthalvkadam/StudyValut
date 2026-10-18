package com.studyvault.repository;

import com.studyvault.domain.Message;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);
    List<Message> findTop20ByConversationIdOrderByCreatedAtDesc(UUID conversationId);
}
