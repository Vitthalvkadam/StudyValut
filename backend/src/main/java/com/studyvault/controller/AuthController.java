package com.studyvault.controller;

import com.studyvault.domain.User;
import com.studyvault.dto.Dtos.*;
import com.studyvault.security.AuthUser;
import com.studyvault.security.JwtService;
import com.studyvault.security.RateLimiter;
import com.studyvault.security.SessionCookies;
import com.studyvault.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    private final JwtService jwt;
    private final SessionCookies cookies;
    private final RateLimiter limiter;

    public AuthController(AuthService auth, JwtService jwt, SessionCookies cookies, RateLimiter limiter) {
        this.auth = auth;
        this.jwt = jwt;
        this.cookies = cookies;
        this.limiter = limiter;
    }

    private ResponseEntity<UserDto> withSession(HttpStatus status, User u) {
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE, cookies.create(jwt.issue(u)).toString())
                .body(AuthService.toDto(u));
    }

    @GetMapping("/csrf")
    public ResponseEntity<Void> csrf() { return ResponseEntity.noContent().build(); }

    @PostMapping("/register")
    public ResponseEntity<UserDto> register(@Valid @RequestBody RegisterRequest r, HttpServletRequest req) {
        limiter.check("register:" + req.getRemoteAddr(), 10, 60);
        return withSession(HttpStatus.CREATED, auth.register(r));
    }

    @PostMapping("/login")
    public ResponseEntity<UserDto> login(@Valid @RequestBody LoginRequest r, HttpServletRequest req) {
        limiter.check("login:" + req.getRemoteAddr(), 10, 60);
        return withSession(HttpStatus.OK, auth.login(r));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.clear().toString()).build();
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal AuthUser u) { return AuthService.toDto(auth.get(u.id())); }
}
