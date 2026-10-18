package com.studyvault.controller;

import com.studyvault.dto.Dtos.DashboardDto;
import com.studyvault.security.AuthUser;
import com.studyvault.service.DashboardService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final DashboardService service;

    public DashboardController(DashboardService service) { this.service = service; }

    @GetMapping
    public DashboardDto get(@AuthenticationPrincipal AuthUser u) { return service.get(u.id()); }
}
