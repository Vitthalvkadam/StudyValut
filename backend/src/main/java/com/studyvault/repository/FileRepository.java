package com.studyvault.repository;

import com.studyvault.domain.StoredFile;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FileRepository extends JpaRepository<StoredFile, UUID>, JpaSpecificationExecutor<StoredFile> {
    Optional<StoredFile> findByIdAndUserId(UUID id, UUID userId);
    List<StoredFile> findByUserId(UUID userId);
    List<StoredFile> findByFolderIdIn(List<UUID> folderIds);
    List<StoredFile> findTop8ByUserIdOrderByCreatedAtDesc(UUID userId);
    long countByUserId(UUID userId);
    long countByUserIdAndFavoriteTrue(UUID userId);
    int countByFolderId(UUID folderId);

    @Query("select coalesce(sum(f.sizeBytes), 0) from StoredFile f where f.userId = :userId")
    long totalSize(@Param("userId") UUID userId);
}
