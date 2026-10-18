package com.studyvault.service;

import com.studyvault.config.AppProperties;
import com.studyvault.domain.Folder;
import com.studyvault.domain.StoredFile;
import com.studyvault.dto.Dtos.FileDto;
import com.studyvault.exception.ApiException;
import com.studyvault.repository.FileRepository;
import com.studyvault.repository.FolderRepository;
import jakarta.persistence.criteria.Predicate;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileService {
    private final FileRepository files;
    private final FolderRepository folders;
    private final StorageService storage;
    private final AppProperties props;

    public FileService(FileRepository files, FolderRepository folders, StorageService storage, AppProperties props) {
        this.files = files;
        this.folders = folders;
        this.storage = storage;
        this.props = props;
    }

    public List<FileDto> toDtos(UUID userId, List<StoredFile> list) {
        Map<UUID, String> names = folders.findByUserIdOrderByNameAsc(userId).stream()
                .collect(Collectors.toMap(f -> f.id, f -> f.name));
        return list.stream().map(f -> toDto(f, f.folderId == null ? null : names.get(f.folderId))).toList();
    }

    private FileDto toDto(StoredFile f, String folderName) {
        return new FileDto(f.id, f.folderId, folderName, f.originalName, f.contentType,
                FileValidator.kindOf(f.contentType), f.sizeBytes, f.favorite, f.createdAt, f.updatedAt);
    }

    public StoredFile owned(UUID userId, UUID id) {
        return files.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("File"));
    }

    @Transactional(readOnly = true)
    public FileDto get(UUID userId, UUID id) {
        return toDtos(userId, List.of(owned(userId, id))).get(0);
    }

    @Transactional(readOnly = true)
    public List<FileDto> list(UUID userId, UUID folderId, boolean rootOnly, String q, boolean favorite,
                              String sort, String dir, int limit) {
        if (folderId != null) folders.findByIdAndUserId(folderId, userId).orElseThrow(() -> ApiException.notFound("Folder"));
        Specification<StoredFile> spec = (root, cq, cb) -> {
            List<Predicate> p = new ArrayList<>();
            p.add(cb.equal(root.get("userId"), userId));
            if (folderId != null) p.add(cb.equal(root.get("folderId"), folderId));
            else if (rootOnly) p.add(cb.isNull(root.get("folderId")));
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                p.add(cb.like(cb.lower(root.get("originalName")), like, '\\'));
            }
            if (favorite) p.add(cb.isTrue(root.get("favorite")));
            return cb.and(p.toArray(new Predicate[0]));
        };
        String prop = switch (sort == null ? "date" : sort) {
            case "name" -> "originalName";
            case "size" -> "sizeBytes";
            default -> "createdAt";
        };
        Sort.Direction d = "asc".equalsIgnoreCase(dir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        var page = PageRequest.of(0, Math.min(Math.max(limit, 1), 500), Sort.by(d, prop).and(Sort.by("id")));
        return toDtos(userId, files.findAll(spec, page).getContent());
    }

    public FileDto upload(UUID userId, MultipartFile mf, UUID folderId) {
        if (mf == null || mf.isEmpty()) throw ApiException.badRequest("Choose a file to upload.");
        if (folderId != null) folders.findByIdAndUserId(folderId, userId).orElseThrow(() -> ApiException.notFound("Folder"));
        long max = props.storage().maxFileMb() * 1024 * 1024;
        if (mf.getSize() > max) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "Files can be up to " + props.storage().maxFileMb() + " MB.");
        }
        if (files.totalSize(userId) + mf.getSize() > props.storage().quotaMb() * 1024 * 1024) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "Your vault is full. Delete some files to free up space.");
        }
        String name = FileValidator.cleanName(mf.getOriginalFilename());
        try {
            byte[] head;
            try (InputStream in = mf.getInputStream()) { head = in.readNBytes(8192); }
            var result = FileValidator.validate(name, head);
            String key = userId + "/" + UUID.randomUUID();
            try (InputStream in = mf.getInputStream()) { storage.store(key, in); }
            StoredFile f = new StoredFile();
            f.userId = userId;
            f.folderId = folderId;
            f.originalName = name;
            f.storageKey = key;
            f.contentType = result.contentType();
            f.sizeBytes = mf.getSize();
            try {
                files.save(f);
            } catch (RuntimeException e) {
                storage.delete(key);
                throw e;
            }
            return toDtos(userId, List.of(f)).get(0);
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save that file. Please try again.");
        }
    }

    @Transactional
    public FileDto rename(UUID userId, UUID id, String newName) {
        StoredFile f = owned(userId, id);
        String name = FileValidator.cleanName(newName);
        String ext = FileValidator.extensionOf(f.originalName);
        if (!FileValidator.extensionOf(name).equals(ext)) name = FileValidator.cleanName(name + "." + ext);
        f.originalName = name;
        f.updatedAt = Instant.now();
        files.save(f);
        return toDtos(userId, List.of(f)).get(0);
    }

    @Transactional
    public FileDto move(UUID userId, UUID id, UUID folderId) {
        StoredFile f = owned(userId, id);
        if (folderId != null) folders.findByIdAndUserId(folderId, userId).orElseThrow(() -> ApiException.notFound("Folder"));
        f.folderId = folderId;
        f.updatedAt = Instant.now();
        files.save(f);
        return toDtos(userId, List.of(f)).get(0);
    }

    @Transactional
    public FileDto favorite(UUID userId, UUID id, boolean value) {
        StoredFile f = owned(userId, id);
        f.favorite = value;
        files.save(f);
        return toDtos(userId, List.of(f)).get(0);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        StoredFile f = owned(userId, id);
        files.delete(f);
        deleteBlobsAfterCommit(List.of(f.storageKey));
    }

    @Transactional
    public List<String> collectKeysForUser(UUID userId) {
        return files.findByUserId(userId).stream().map(f -> f.storageKey).toList();
    }

    public Resource resource(StoredFile f) {
        Resource r = storage.load(f.storageKey);
        if (!r.exists()) throw ApiException.notFound("File");
        return r;
    }

    public byte[] readBytes(StoredFile f) {
        try {
            return resource(f).getContentAsByteArray();
        } catch (IOException e) {
            throw ApiException.notFound("File");
        }
    }

    /** Bytes are removed only once the DB transaction has committed, so a rollback never orphans a row. */
    public void deleteBlobsAfterCommit(List<String> keys) {
        if (keys.isEmpty()) return;
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { keys.forEach(storage::delete); }
            });
        } else {
            keys.forEach(storage::delete);
        }
    }

    public long used(UUID userId) { return files.totalSize(userId); }
    public long quota() { return props.storage().quotaMb() * 1024 * 1024; }
}
