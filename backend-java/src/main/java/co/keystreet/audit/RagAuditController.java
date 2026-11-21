package co.keystreet.audit;

import co.keystreet.catalog.dto.PagedResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/rag-audit")
public class RagAuditController {

  public record RagAuditEntryDto(
      UUID id,
      UUID userId,
      String channel,
      String question,
      String productSlug,
      String status,
      List<Map<String, Object>> citations,
      String embeddingModel,
      String chatModel,
      Integer latencyMs,
      Instant createdAt) {}

  private final JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;

  public RagAuditController(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
    this.jdbcTemplate = jdbcTemplate;
    this.objectMapper = objectMapper;
  }

  @GetMapping
  @Transactional(readOnly = true)
  public PagedResponse<RagAuditEntryDto> list(
      @RequestParam(required = false) String status,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int pageSize) {
    int safeSize = Math.max(1, Math.min(pageSize, 50));
    int safePage = Math.max(0, page);

    StringBuilder where = new StringBuilder(" WHERE 1=1");
    List<Object> params = new ArrayList<>();
    if (status != null && !status.isBlank()) {
      where.append(" AND status = ?");
      params.add(status.trim().toUpperCase());
    }
    if (from != null) {
      where.append(" AND created_at >= ?");
      params.add(java.sql.Timestamp.from(from));
    }
    if (to != null) {
      where.append(" AND created_at <= ?");
      params.add(java.sql.Timestamp.from(to));
    }

    Long totalObj =
        jdbcTemplate.queryForObject(
            "SELECT count(*) FROM rag_audit_logs" + where, Long.class, params.toArray());
    long total = totalObj != null ? totalObj : 0L;

    List<Object> queryParams = new ArrayList<>(params);
    queryParams.add(safeSize);
    queryParams.add(safePage * safeSize);

    List<RagAuditEntryDto> items =
        jdbcTemplate.query(
            "SELECT id, user_id, channel, question, product_slug, status, citations::text AS citations_json, "
                + "embedding_model, chat_model, latency_ms, created_at "
                + "FROM rag_audit_logs"
                + where
                + " ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (rs, i) -> {
              List<Map<String, Object>> cites = List.of();
              String raw = rs.getString("citations_json");
              if (raw != null && !raw.isBlank()) {
                try {
                  cites = objectMapper.readValue(raw, new TypeReference<>() {});
                } catch (Exception ignored) {
                }
              }
              return new RagAuditEntryDto(
                  rs.getObject("id", UUID.class),
                  rs.getObject("user_id", UUID.class),
                  rs.getString("channel"),
                  rs.getString("question"),
                  rs.getString("product_slug"),
                  rs.getString("status"),
                  cites,
                  rs.getString("embedding_model"),
                  rs.getString("chat_model"),
                  (Integer) rs.getObject("latency_ms"),
                  rs.getTimestamp("created_at").toInstant());
            },
            queryParams.toArray());

    int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / safeSize);
    return new PagedResponse<>(items, safePage, safeSize, total, totalPages);
  }
}
