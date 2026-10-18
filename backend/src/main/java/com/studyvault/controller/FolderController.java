package com.studyvault.controller;

import com.studyvault.dto.Dtos.*;
import com.studyvault.security.AuthUser;
import com.studyvault.service.FolderService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/folders")
public class FolderController {
    private final FolderService service;

    public FolderController(FolderService service) { this.service = service; }

    /** Children of parentId (root when omitted). With q, searches all of the user's folders by name. */
    @GetMapping
    public List<FolderDto> list(@AuthenticationPrincipal AuthUser u, @RequestParam(required = false) UUID parentId,
                                @RequestParam(required = false) String q) {
        return service.list(u.id(), parentId, q);
    }

    @GetMapping("/all")
    public List<FolderDto> all(@AuthenticationPrincipal AuthUser u) { return service.all(u.id()); }

    @GetMapping("/{id}")
    public FolderDetail detail(@AuthenticationPrincipal AuthUser u, @PathVariable UUID id) { return service.detail(u.id(), id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FolderDto create(@AuthenticationPrincipal AuthUser u, @Valid @RequestBody FolderRequest r) {
        return service.create(u.id(), r.name(), r.parentId(), r.color());
    }

    @PatchMapping("/{id}")
    public FolderDto update(@AuthenticationPrincipal AuthUser u, @PathVariable UUID id, @Valid @RequestBody FolderUpdateRequest r) {
        return service.update(u.id(), id, r.name(), r.color());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthUser u, @PathVariable UUID id) { service.delete(u.id(), id); }
}
