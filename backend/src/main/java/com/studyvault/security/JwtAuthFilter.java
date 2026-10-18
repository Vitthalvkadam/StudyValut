package com.studyvault.security;

import com.studyvault.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final UserRepository users;

    public JwtAuthFilter(JwtService jwt, UserRepository users) {
        this.jwt = jwt;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String token = null;
        if (req.getCookies() != null) {
            for (Cookie c : req.getCookies()) {
                if (SessionCookies.NAME.equals(c.getName())) token = c.getValue();
            }
        }
        if (token != null && !token.isBlank()) {
            jwt.parse(token).ifPresent(claims -> {
                try {
                    UUID id = UUID.fromString(claims.getSubject());
                    Integer version = claims.get("v", Integer.class);
                    // tokenVersion is bumped on password change, which revokes older sessions.
                    users.findById(id).filter(u -> version != null && u.tokenVersion == version).ifPresent(u -> {
                        var auth = new UsernamePasswordAuthenticationToken(new AuthUser(u.id, u.email), null,
                                List.of(new SimpleGrantedAuthority("ROLE_USER")));
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    });
                } catch (RuntimeException ignored) {
                    // invalid token content -> stays unauthenticated
                }
            });
        }
        chain.doFilter(req, res);
    }
}
