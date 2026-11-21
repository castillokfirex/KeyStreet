package co.keystreet.assistant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class AssistantDtos {
  private AssistantDtos() {}

  public record AssistantQueryRequest(
      @NotBlank @Size(min = 3, max = 1000) String question,
      @Size(max = 160) String productSlug,
      UUID sessionId) {}

  public record CitationDto(
      int n,
      UUID documentId,
      String documentTitle,
      int pageNumber,
      int pageEnd,
      String sectionTitle,
      String snippet,
      UUID chunkId) {}

  public record AssistantQueryResponse(
      String status, String answer, List<CitationDto> citations, UUID auditId, int latencyMs) {}

  public record RagIngestPayload(
      UUID documentId, UUID tenantId, String filePath, String sha256, String title) {}

  public record RagQueryPayload(
      UUID tenantId,
      String question,
      UUID userId,
      UUID sessionId,
      String channel,
      Map<String, Object> productContext,
      Integer topK,
      String clientIpHash) {}
}
