package com.studyvault.dto;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class Dtos {
    private Dtos() {}

    // auth / account
    public record RegisterRequest(
            @NotBlank(message = "Email is required") @Email(message = "Enter a valid email") @Size(max = 254) String email,
            @NotBlank(message = "Name is required") @Size(min = 2, max = 80, message = "Name must be 2-80 characters") String displayName,
            @NotBlank(message = "Password is required") @Size(min = 8, max = 72, message = "Password must be 8-72 characters") String password) {}
    public record LoginRequest(@NotBlank(message = "Email is required") String email,
                               @NotBlank(message = "Password is required") String password) {}
    public record UserDto(UUID id, String email, String displayName, Instant createdAt) {}
    public record UpdateProfileRequest(
            @NotBlank @Size(min = 2, max = 80, message = "Name must be 2-80 characters") String displayName,
            @NotBlank @Email(message = "Enter a valid email") @Size(max = 254) String email) {}
    public record ChangePasswordRequest(@NotBlank String currentPassword,
                                        @NotBlank @Size(min = 8, max = 72, message = "New password must be 8-72 characters") String newPassword) {}
    public record DeleteAccountRequest(@NotBlank(message = "Enter your password to confirm") String password) {}

    // folders
    public record FolderRequest(@NotBlank(message = "Folder name is required") @Size(max = 100) String name, UUID parentId, String color) {}
    public record FolderUpdateRequest(@NotBlank(message = "Folder name is required") @Size(max = 100) String name, String color) {}
    public record FolderDto(UUID id, UUID parentId, String name, String color, int fileCount, int folderCount, Instant createdAt) {}
    public record FolderDetail(FolderDto folder, List<FolderDto> breadcrumbs) {}

    // files
    public record FileDto(UUID id, UUID folderId, String folderName, String name, String contentType, String kind,
                          long size, boolean favorite, Instant createdAt, Instant updatedAt) {}
    public record RenameRequest(@NotBlank(message = "Name is required") @Size(max = 200) String name) {}
    public record MoveRequest(UUID folderId) {}
    public record FavoriteRequest(boolean favorite) {}

    // dashboard
    public record DashboardDto(long fileCount, long folderCount, long favoriteCount, long storageUsed, long storageQuota,
                               List<FileDto> recentFiles, List<FolderDto> folders) {}

    // chat
    public record ConversationDto(UUID id, String title, Instant updatedAt) {}
    public record MessageDto(UUID id, String role, String content, String attachmentName, Instant createdAt) {}
    public record ConversationDetail(ConversationDto conversation, List<MessageDto> messages) {}
    public record ChatReply(MessageDto userMessage, MessageDto assistantMessage, ConversationDto conversation) {}
    public record AiStatus(boolean configured) {}
}
