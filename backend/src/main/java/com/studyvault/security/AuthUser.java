package com.studyvault.security;

import java.util.UUID;

/** Principal placed in the SecurityContext for authenticated requests. */
public record AuthUser(UUID id, String email) {}
