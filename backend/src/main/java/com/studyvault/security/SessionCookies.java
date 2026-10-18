package com.studyvault.security;

import com.studyvault.config.AppProperties;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/** The JWT lives in an HttpOnly, SameSite=Strict cookie so scripts can never read it. */
@Component
public class SessionCookies {
    public static final String NAME = "sv_token";
    private final AppProperties props;
    private final JwtService jwt;

    public SessionCookies(AppProperties props, JwtService jwt) {
        this.props = props;
        this.jwt = jwt;
    }

    public ResponseCookie create(String token) {
        return base(token).maxAge(jwt.ttl()).build();
    }

    public ResponseCookie clear() {
        return base("").maxAge(0).build();
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(props.cookie().secure())
                .sameSite("Strict")
                .path("/");
    }
}
