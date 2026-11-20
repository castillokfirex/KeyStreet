package co.keystreet.documents;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentRepository extends JpaRepository<Document, UUID> {
  Optional<Document> findBySha256Hash(String sha256Hash);

  Page<Document> findByStatusOrderByCreatedAtDesc(DocumentStatus status, Pageable pageable);

  Page<Document> findAllByOrderByCreatedAtDesc(Pageable pageable);

  List<Document> findByStatusAndProcessingStartedAtBefore(
      DocumentStatus status, Instant cutoff);
}
