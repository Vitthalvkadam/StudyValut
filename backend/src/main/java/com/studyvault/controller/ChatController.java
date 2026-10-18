package com.studyvault.controller;

import com.studyvault.dto.Dtos.*;
import com.studyvault.security.AuthUser;
import com.studyvault.security.RateLimiter;
import com.studyvault.service.ChatService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/chat")
public class ChatController {
    private final ChatService chat;
    private final RateLimiter limiter;

    public ChatController(ChatService chat, RateLimiter limiter) {
        this.chat = chat;
        this.limiter = limiter;
    }

    @GetMapping("/status")
    public AiStatus status() { return new AiStatus(chat.aiConfigured()); }

    @GetMapping("/conversations")
    public List<ConversationDto> list(@AuthenticationPrincipal AuthUser u) { return chat.list(u.id()); }

    @PostMapping("/conversations")
    @ResponseStatus(HttpStatus.CREATED)
    public ConversationDto create(@AuthenticationPrincipal AuthUser u) { return chat.create(u.id()); }

    @GetMapping("/conversations/{id}")
    public ConversationDetail get(@AuthenticationPrincipal AuthUser u, @PathVariable UUID id) { return chat.get(u.id(), id); }

    @DeleteMapping("/conversations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthUser u, @PathVariable UUID id) { chat.delete(u.id(), id); }

    @PostMapping(value = "/conversations/{id}/messages", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ChatReply send(@AuthenticationPrincipal AuthUser u, @PathVariable UUID id,
                          @RequestParam(required = false) String text,
                          @RequestPart(value = "attachment", required = false) MultipartFile attachment,
                          @RequestParam(required = false) UUID vaultFileId) {
        limiter.check("chat:" + u.id(), 20, 60);
        return chat.send(u.id(), id, text, attachment, vaultFileId);
    }
}
