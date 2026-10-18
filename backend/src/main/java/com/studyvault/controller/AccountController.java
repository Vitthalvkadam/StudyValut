package com.studyvault.controller;

import com.studyvault.dto.Dtos.*;
import com.studyvault.security.AuthUser;
import com.studyvault.security.JwtService;
import com.studyvault.security.RateLimiter;
import com.studyvault.security.SessionCookies;
import com.studyvault.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/account")
public class AccountController {
    private final AuthService auth;
    private final JwtService jwt;
    private final SessionCookies cookies;
    private final RateLimiter limiter;

    public AccountController(AuthService auth, JwtService jwt, SessionCookies cookies, RateLimiter limiter) {
        this.auth = auth;
        this.jwt = jwt;
        this.cookies = cookies;
        this.limiter = limiter;
    }

    @PatchMapping("/profile")
    public ResponseEntity<UserDto> profile(@AuthenticationPrincipal AuthUser u, @Valid @RequestBody UpdateProfileRequest r) {
        return ResponseEntity.ok(AuthService.toDto(auth.updateProfile(u.id(), r)));
    }

    @PostMapping("/password")
    public ResponseEntity<Void> password(@AuthenticationPrincipal AuthUser u, @Valid @RequestBody ChangePasswordRequest r) {
        limiter.check("pw:" + u.id(), 5, 60);
        var user = auth.changePassword(u.id(), r);
        // Re-issue this browser's session so only the *other* sessions are signed out.
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.create(jwt.issue(user)).toString()).build();
    }

    @DeleteMapping
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthUser u, @Valid @RequestBody DeleteAccountRequest r) {
        limiter.check("del:" + u.id(), 5, 60);
        auth.deleteAccount(u.id(), r.password());
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.clear().toString()).build();
    }
}
