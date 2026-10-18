package com.studyvault.repository;

import com.studyvault.domain.Folder;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FolderRepository extends JpaRepository<Folder, UUID> {
    Optional<Folder> findByIdAndUserId(UUID id, UUID userId);
    List<Folder> findByUserIdAndParentIdIsNullOrderByNameAsc(UUID userId);
    List<Folder> findByUserIdAndParentIdOrderByNameAsc(UUID userId, UUID parentId);
    List<Folder> findByUserIdOrderByNameAsc(UUID userId);
    List<Folder> findByUserIdAndNameContainingIgnoreCaseOrderByNameAsc(UUID userId, String q);
    List<Folder> findByParentIdIn(List<UUID> parentIds);
    long countByUserId(UUID userId);
    int countByParentId(UUID parentId);
    boolean existsByUserIdAndParentIdAndNameIgnoreCase(UUID userId, UUID parentId, String name);
    boolean existsByUserIdAndParentIdIsNullAndNameIgnoreCase(UUID userId, String name);
}
