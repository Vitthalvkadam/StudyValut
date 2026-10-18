package com.studyvault.service;

import com.studyvault.dto.Dtos.DashboardDto;
import com.studyvault.repository.FileRepository;
import com.studyvault.repository.FolderRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {
    private final FileRepository files;
    private final FolderRepository folders;
    private final FileService fileService;
    private final FolderService folderService;

    public DashboardService(FileRepository files, FolderRepository folders, FileService fileService, FolderService folderService) {
        this.files = files;
        this.folders = folders;
        this.fileService = fileService;
        this.folderService = folderService;
    }

    @Transactional(readOnly = true)
    public DashboardDto get(UUID userId) {
        return new DashboardDto(
                files.countByUserId(userId),
                folders.countByUserId(userId),
                files.countByUserIdAndFavoriteTrue(userId),
                fileService.used(userId),
                fileService.quota(),
                fileService.toDtos(userId, files.findTop8ByUserIdOrderByCreatedAtDesc(userId)),
                folderService.list(userId, null, null).stream().limit(8).toList());
    }
}
