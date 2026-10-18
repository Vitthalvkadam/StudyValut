package com.studyvault.controller;

import com.studyvault.domain.StoredFile;
import com.studyvault.dto.Dtos.*;
import com.studyvault.security.AuthUser;
import com.studyvault.service.FileService;
import com.studyvault.service.FileValidator;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
public class FileController {
    private final FileService service;

    public FileController(FileService service) { this.service = service; }

    @GetMapping
    public List<FileDto> list(@AuthenticationPrincipal AuthUser u,
                              @RequestParam(required = false) UUID folderId,
                              @RequestParam(defaultValue = "false") boolean rootOnly,
                              @RequestParam(required = false) String q,
                              @RequestParam(defaultValue = "false") boolean favorite,
                              @RequestParam(defaultValue = "date") String sort,
                              @RequestParam(defaultValue = "desc") String dir,
                              @RequestParam(defaultValue = "200") int limit) {
        return service.list(u.id(), folderId, rootOnly, q, favorite, sort, dir, limit);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public FileDto upload(@AuthenticationPrincipal AuthUser u, @RequestPart("file") MultipartFile file,
                          @RequestParam(required = false) UUID folderId) {
        return service.upload(u.id(), file, folderId);
    }

    @GetMapping("/{id}")
    public FileDto get(@AuthenticationPrincipal AuthUser u, @PathVariable UUID id) { return service.get(u.id(), id); }

    @PatchMapping("/{id}")
    public FileDto rename(@AuthenticationPrincipal AuthUser u, @PathVariable UUID id, @Valid @RequestBody RenameRequest r) {
        return service.rename(u.id(), id, r.name());
    }

    @PutMapping("/{id}/folder")
    public FileDto move(@AuthenticationPrincipal AuthUser u, @PathVariable UUID id, @RequestBody MoveRequest r) {
        return service.move(u.id(), id, r.folderId());
    }

    @PutMapping("/{id}/favorite")
    public FileDto favorite(@AuthenticationPrincipal AuthUser u, @PathVariable UUID id, @RequestBody FavoriteRequest r) {
        return service.favorite(u.id(), id, r.favorite());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthUser u, @PathVariable UUID id) { service.delete(u.id(), id); }

    @GetMapping("/{id}/content")
    public ResponseEntity<Resource> content(@AuthenticationPrincipal AuthUser u, @PathVariable UUID id) {
        return serve(u, id, false);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@AuthenticationPrincipal AuthUser u, @PathVariable UUID id) {
        return serve(u, id, true);
    }

    private ResponseEntity<Resource> serve(AuthUser u, UUID id, boolean forceDownload) {
        StoredFile f = service.owned(u.id(), id); // 404 for anything not owned by the caller
        Resource body = service.resource(f);
        boolean inline = !forceDownload && FileValidator.inlineSafe(f.contentType);
        String type = f.contentType.startsWith("text/") ? f.contentType + "; charset=utf-8" : f.contentType;
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(inline ? type : f.contentType))
                .contentLength(f.sizeBytes)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.builder(inline ? "inline" : "attachment")
                        .filename(f.originalName, StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noStore().cachePrivate())
                .body(body);
    }
}
