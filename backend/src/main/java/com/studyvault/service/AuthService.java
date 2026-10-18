package com.studyvault.service;

import com.studyvault.domain.User;
import com.studyvault.dto.Dtos.*;
import com.studyvault.exception.ApiException;
import com.studyvault.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final FileService fileService;
    // Pre-computed hash so unknown-email logins cost the same time as wrong-password logins.
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder encoder, FileService fileService) {
        this.users = users;
        this.encoder = encoder;
        this.fileService = fileService;
        this.dummyHash = encoder.encode("not-a-real-password");
    }

    public static UserDto toDto(User u) { return new UserDto(u.id, u.email, u.displayName, u.createdAt); }

    private static String norm(String email) { return email.trim().toLowerCase(); }

    @Transactional
    public User register(RegisterRequest r) {
        String email = norm(r.email());
        if (users.existsByEmail(email)) throw ApiException.conflict("An account with this email already exists.");
        User u = new User();
        u.email = email;
        u.displayName = r.displayName().trim();
        u.passwordHash = encoder.encode(r.password());
        return users.save(u);
    }

    @Transactional(readOnly = true)
    public User login(LoginRequest r) {
        var found = users.findByEmail(norm(r.email()));
        boolean ok = encoder.matches(r.password(), found.map(u -> u.passwordHash).orElse(dummyHash));
        if (found.isEmpty() || !ok) throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
        return found.get();
    }

    @Transactional(readOnly = true)
    public User get(UUID id) {
        return users.findById(id).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in again."));
    }

    @Transactional
    public User updateProfile(UUID id, UpdateProfileRequest r) {
        User u = get(id);
        String email = norm(r.email());
        if (!email.equals(u.email) && users.existsByEmail(email)) throw ApiException.conflict("That email is already in use.");
        u.email = email;
        u.displayName = r.displayName().trim();
        return users.save(u);
    }

    @Transactional
    public User changePassword(UUID id, ChangePasswordRequest r) {
        User u = get(id);
        if (!encoder.matches(r.currentPassword(), u.passwordHash)) {
            throw ApiException.badRequest("Your current password is incorrect.");
        }
        u.passwordHash = encoder.encode(r.newPassword());
        u.tokenVersion++; // invalidates every other session
        return users.save(u);
    }

    @Transactional
    public void deleteAccount(UUID id, String password) {
        User u = get(id);
        if (!encoder.matches(password, u.passwordHash)) throw ApiException.badRequest("Your password is incorrect.");
        List<String> keys = fileService.collectKeysForUser(id);
        users.delete(u); // folders, files, conversations, messages cascade in the database
        users.flush();
        fileService.deleteBlobsAfterCommit(keys);
    }
}
