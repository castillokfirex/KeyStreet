package co.keystreet.documents;

import java.util.UUID;

public record DocumentUploadedEvent(
    UUID documentId, UUID tenantId, String filePath, String sha256, String title) {}
