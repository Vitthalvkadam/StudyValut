package com.studyvault.service;

import com.studyvault.domain.Conversation;
import com.studyvault.domain.Message;
import com.studyvault.domain.StoredFile;
import com.studyvault.dto.Dtos.*;
import com.studyvault.exception.ApiException;
import com.studyvault.repository.ConversationRepository;
import com.studyvault.repository.MessageRepository;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/** Not @Transactional on purpose: the slow Gemini call must not hold a database connection. */
@Service
public class ChatService {
    private static final long MAX_AI_BYTES = 10L * 1024 * 1024;

    private final ConversationRepository conversations;
    private final MessageRepository messages;
    private final AiService ai;
    private final FileService fileService;

    public ChatService(ConversationRepository conversations, MessageRepository messages, AiService ai, FileService fileService) {
        this.conversations = conversations;
        this.messages = messages;
        this.ai = ai;
        this.fileService = fileService;
    }

    static ConversationDto toDto(Conversation c) { return new ConversationDto(c.id, c.title, c.updatedAt); }
    static MessageDto toDto(Message m) { return new MessageDto(m.id, m.role, m.content, m.attachmentName, m.createdAt); }

    private Conversation owned(UUID userId, UUID id) {
        return conversations.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Conversation"));
    }

    public boolean aiConfigured() { return ai.configured(); }

    public List<ConversationDto> list(UUID userId) {
        return conversations.findByUserIdOrderByUpdatedAtDesc(userId).stream().map(ChatService::toDto).toList();
    }

    public ConversationDto create(UUID userId) {
        Conversation c = new Conversation();
        c.userId = userId;
        return toDto(conversations.save(c));
    }

    public ConversationDetail get(UUID userId, UUID id) {
        Conversation c = owned(userId, id);
        return new ConversationDetail(toDto(c),
                messages.findByConversationIdOrderByCreatedAtAsc(c.id).stream().map(ChatService::toDto).toList());
    }

    public void delete(UUID userId, UUID id) {
        conversations.delete(owned(userId, id)); // messages cascade in the database
    }

    public ChatReply send(UUID userId, UUID conversationId, String rawText, MultipartFile upload, UUID vaultFileId) {
        Conversation conv = owned(userId, conversationId);
        String text = rawText == null ? "" : rawText.trim();
        boolean hasAttachment = (upload != null && !upload.isEmpty()) || vaultFileId != null;
        if (text.isEmpty() && !hasAttachment) throw ApiException.badRequest("Type a question or attach a file.");
        if (text.length() > 8000) throw ApiException.badRequest("Messages can be up to 8,000 characters.");
        if (text.isEmpty()) text = "Please explain this file and highlight the key points for studying.";

        byte[] bytes = null;
        String mime = null;
        String attachmentName = null;
        if (upload != null && !upload.isEmpty()) {
            if (upload.getSize() > MAX_AI_BYTES) throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "Attachments for the assistant can be up to 10 MB.");
            attachmentName = FileValidator.cleanName(upload.getOriginalFilename());
            try (InputStream in = upload.getInputStream()) {
                bytes = in.readAllBytes();
            } catch (IOException e) {
                throw ApiException.badRequest("Couldn't read that attachment.");
            }
            mime = requireAiType(FileValidator.validate(attachmentName, java.util.Arrays.copyOf(bytes, Math.min(bytes.length, 8192))).contentType());
        } else if (vaultFileId != null) {
            StoredFile f = fileService.owned(userId, vaultFileId); // ownership enforced here
            if (f.sizeBytes > MAX_AI_BYTES) throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "That file is over 10 MB, which is too big for the assistant.");
            mime = requireAiType(f.contentType);
            attachmentName = f.originalName;
            bytes = fileService.readBytes(f);
        }

        List<Message> recent = new ArrayList<>(messages.findTop20ByConversationIdOrderByCreatedAtDesc(conv.id));
        Collections.reverse(recent);

        String answer = ai.generate(recent, text, bytes, mime); // throws a friendly ApiException if unconfigured/failed

        Message um = new Message();
        um.conversationId = conv.id;
        um.role = "user";
        um.content = text;
        um.attachmentName = attachmentName;
        messages.save(um);
        Message am = new Message();
        am.conversationId = conv.id;
        am.role = "model";
        am.content = answer;
        am.createdAt = um.createdAt.plusMillis(1);
        messages.save(am);

        if ("New chat".equals(conv.title)) {
            String base = rawText != null && !rawText.isBlank() ? text : attachmentName;
            conv.title = base.length() > 60 ? base.substring(0, 57) + "..." : base;
        }
        conv.updatedAt = Instant.now();
        conversations.save(conv);
        return new ChatReply(toDto(um), toDto(am), toDto(conv));
    }

    private static String requireAiType(String contentType) {
        if (contentType.equals("application/pdf") || contentType.startsWith("image/")) return contentType;
        throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "The assistant can read PDFs and images.");
    }
}
