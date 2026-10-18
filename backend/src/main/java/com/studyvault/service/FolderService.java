package com.studyvault.service;

import com.studyvault.domain.Folder;
import com.studyvault.domain.StoredFile;
import com.studyvault.dto.Dtos.FolderDetail;
import com.studyvault.dto.Dtos.FolderDto;
import com.studyvault.exception.ApiException;
import com.studyvault.repository.FileRepository;
import com.studyvault.repository.FolderRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FolderService {
    static final List<String> COLORS = List.of("mustard", "sage", "terracotta", "lavender");

    private final FolderRepository folders;
    private final FileRepository files;
    private final FileService fileService;

    public FolderService(FolderRepository folders, FileRepository files, FileService fileService) {
        this.folders = folders;
        this.files = files;
        this.fileService = fileService;
    }

    public FolderDto toDto(Folder f) {
        return new FolderDto(f.id, f.parentId, f.name, f.color, files.countByFolderId(f.id),
                folders.countByParentId(f.id), f.createdAt);
    }

    Folder owned(UUID userId, UUID id) {
        return folders.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Folder"));
    }

    @Transactional(readOnly = true)
    public List<FolderDto> list(UUID userId, UUID parentId, String q) {
        List<Folder> result;
        if (q != null && !q.isBlank()) {
            result = folders.findByUserIdAndNameContainingIgnoreCaseOrderByNameAsc(userId, q.trim());
        } else if (parentId == null) {
            result = folders.findByUserIdAndParentIdIsNullOrderByNameAsc(userId);
        } else {
            owned(userId, parentId);
            result = folders.findByUserIdAndParentIdOrderByNameAsc(userId, parentId);
        }
        return result.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<FolderDto> all(UUID userId) {
        return folders.findByUserIdOrderByNameAsc(userId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public FolderDetail detail(UUID userId, UUID id) {
        Folder f = owned(userId, id);
        List<FolderDto> crumbs = new ArrayList<>();
        Folder cur = f;
        for (int i = 0; i < 64 && cur != null; i++) {
            crumbs.add(toDto(cur));
            cur = cur.parentId == null ? null : folders.findByIdAndUserId(cur.parentId, userId).orElse(null);
        }
        Collections.reverse(crumbs);
        return new FolderDetail(toDto(f), crumbs);
    }

    @Transactional
    public FolderDto create(UUID userId, String name, UUID parentId, String color) {
        if (parentId != null) owned(userId, parentId);
        String clean = clean(name);
        if (exists(userId, parentId, clean)) throw ApiException.conflict("A folder with that name already exists here.");
        Folder f = new Folder();
        f.userId = userId;
        f.parentId = parentId;
        f.name = clean;
        f.color = validColor(color, (int) folders.countByUserId(userId));
        return toDto(folders.save(f));
    }

    @Transactional
    public FolderDto update(UUID userId, UUID id, String name, String color) {
        Folder f = owned(userId, id);
        String clean = clean(name);
        if (!clean.equalsIgnoreCase(f.name) && exists(userId, f.parentId, clean)) {
            throw ApiException.conflict("A folder with that name already exists here.");
        }
        f.name = clean;
        if (color != null && !color.isBlank()) f.color = validColor(color, 0);
        f.updatedAt = Instant.now();
        return toDto(folders.save(f));
    }

    /** Deletes the folder, all subfolders and all files inside them (rows via FK cascade, bytes after commit). */
    @Transactional
    public void delete(UUID userId, UUID id) {
        Folder root = owned(userId, id);
        List<UUID> ids = new ArrayList<>(List.of(root.id));
        List<UUID> frontier = List.of(root.id);
        while (!frontier.isEmpty()) {
            List<UUID> next = folders.findByParentIdIn(frontier).stream().map(c -> c.id).toList();
            ids.addAll(next);
            frontier = next;
        }
        List<String> keys = files.findByFolderIdIn(ids).stream().map((StoredFile f) -> f.storageKey).toList();
        folders.delete(root);
        folders.flush();
        fileService.deleteBlobsAfterCommit(keys);
    }

    private boolean exists(UUID userId, UUID parentId, String name) {
        return parentId == null
                ? folders.existsByUserIdAndParentIdIsNullAndNameIgnoreCase(userId, name)
                : folders.existsByUserIdAndParentIdAndNameIgnoreCase(userId, parentId, name);
    }

    private static String clean(String name) {
        String n = name == null ? "" : name.replaceAll("\\p{Cntrl}", "").trim();
        if (n.isEmpty()) throw ApiException.badRequest("Folder name is required.");
        return n;
    }

    private static String validColor(String color, int fallbackIndex) {
        if (color != null && Set.copyOf(COLORS).contains(color)) return color;
        return COLORS.get(Math.floorMod(fallbackIndex, COLORS.size()));
    }
}
