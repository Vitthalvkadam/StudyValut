package com.studyvault.service;

import com.studyvault.exception.ApiException;
import java.util.Map;
import org.springframework.http.HttpStatus;

/** Allow-list of file types. The stored content type is derived from the extension AFTER the magic bytes match. */
public final class FileValidator {
    private FileValidator() {}

    public record Result(String ext, String contentType) {}

    private static final Map<String, String> TYPES = Map.ofEntries(
            Map.entry("pdf", "application/pdf"),
            Map.entry("png", "image/png"),
            Map.entry("jpg", "image/jpeg"),
            Map.entry("jpeg", "image/jpeg"),
            Map.entry("gif", "image/gif"),
            Map.entry("webp", "image/webp"),
            Map.entry("txt", "text/plain"),
            Map.entry("md", "text/markdown"),
            Map.entry("csv", "text/csv"),
            Map.entry("doc", "application/msword"),
            Map.entry("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            Map.entry("ppt", "application/vnd.ms-powerpoint"),
            Map.entry("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            Map.entry("xls", "application/vnd.ms-excel"),
            Map.entry("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));

    public static String extensionOf(String name) {
        int dot = name.lastIndexOf('.');
        return dot < 0 || dot == name.length() - 1 ? "" : name.substring(dot + 1).toLowerCase();
    }

    /** Strips directory parts and control characters, keeps the name within 200 chars. */
    public static String cleanName(String raw) {
        String n = raw == null ? "" : raw.replace('\\', '/');
        n = n.substring(n.lastIndexOf('/') + 1).replaceAll("\\p{Cntrl}", "").trim();
        if (n.isEmpty() || n.equals(".") || n.equals("..")) n = "file";
        if (n.length() > 200) {
            String ext = extensionOf(n);
            int keep = ext.isEmpty() ? 200 : 200 - ext.length() - 1;
            n = n.substring(0, keep) + (ext.isEmpty() ? "" : "." + ext);
        }
        return n;
    }

    public static Result validate(String name, byte[] head) {
        String ext = extensionOf(name);
        String type = TYPES.get(ext);
        if (type == null) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "This file type isn't supported. Use PDF, images, Word, PowerPoint, Excel, or text files.");
        }
        if (head.length == 0 || !magicMatches(ext, head)) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "The file's contents don't match its extension.");
        }
        return new Result(ext, type);
    }

    private static boolean magicMatches(String ext, byte[] h) {
        return switch (ext) {
            case "pdf" -> startsWith(h, 0, '%', 'P', 'D', 'F', '-');
            case "png" -> startsWith(h, 0, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A);
            case "jpg", "jpeg" -> startsWith(h, 0, 0xFF, 0xD8, 0xFF);
            case "gif" -> startsWith(h, 0, 'G', 'I', 'F', '8') && (h.length > 4 && (h[4] == '7' || h[4] == '9'));
            case "webp" -> startsWith(h, 0, 'R', 'I', 'F', 'F') && startsWith(h, 8, 'W', 'E', 'B', 'P');
            case "docx", "pptx", "xlsx" -> startsWith(h, 0, 'P', 'K', 0x03, 0x04);
            case "doc", "ppt", "xls" -> startsWith(h, 0, 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1);
            case "txt", "md", "csv" -> noNulBytes(h);
            default -> false;
        };
    }

    private static boolean startsWith(byte[] h, int off, int... sig) {
        if (h.length < off + sig.length) return false;
        for (int i = 0; i < sig.length; i++) if ((h[off + i] & 0xFF) != sig[i]) return false;
        return true;
    }

    private static boolean noNulBytes(byte[] h) {
        for (byte b : h) if (b == 0) return false;
        return true;
    }

    public static String kindOf(String contentType) {
        if (contentType.equals("application/pdf")) return "pdf";
        if (contentType.startsWith("image/")) return "image";
        if (contentType.startsWith("text/")) return "text";
        if (contentType.contains("word")) return "document";
        if (contentType.contains("presentation") || contentType.contains("powerpoint")) return "presentation";
        if (contentType.contains("sheet") || contentType.contains("excel")) return "spreadsheet";
        return "file";
    }

    /** Only these may be rendered inline in the browser; everything else is forced to download. */
    public static boolean inlineSafe(String contentType) {
        String k = kindOf(contentType);
        return k.equals("pdf") || k.equals("image") || k.equals("text");
    }
}
