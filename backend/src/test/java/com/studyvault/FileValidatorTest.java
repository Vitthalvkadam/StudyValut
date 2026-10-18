package com.studyvault;

import static org.junit.jupiter.api.Assertions.*;

import com.studyvault.exception.ApiException;
import com.studyvault.service.FileValidator;
import org.junit.jupiter.api.Test;

class FileValidatorTest {
    @Test void acceptsRealPdfHeader() {
        assertEquals("application/pdf", FileValidator.validate("notes.pdf", "%PDF-1.7 ...".getBytes()).contentType());
    }
    @Test void rejectsExecutableRenamedToPdf() {
        assertThrows(ApiException.class, () -> FileValidator.validate("notes.pdf", new byte[]{'M', 'Z', 0, 0}));
    }
    @Test void rejectsUnknownExtension() {
        assertThrows(ApiException.class, () -> FileValidator.validate("run.exe", "hello".getBytes()));
        assertThrows(ApiException.class, () -> FileValidator.validate("page.html", "<html>".getBytes()));
    }
    @Test void rejectsBinaryTextFile() {
        assertThrows(ApiException.class, () -> FileValidator.validate("a.txt", new byte[]{'a', 0, 'b'}));
    }
    @Test void cleansPathsFromNames() {
        assertEquals("passwd.txt", FileValidator.cleanName("../../etc/passwd.txt"));
        assertEquals("evil.png", FileValidator.cleanName("C:\\temp\\evil.png"));
    }
}
