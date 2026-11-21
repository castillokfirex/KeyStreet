package co.keystreet.catalog;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository
    extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {

  @EntityGraph(attributePaths = {"brand", "variants"})
  Optional<Product> findBySlugAndIsActiveTrue(String slug);

  @EntityGraph(attributePaths = {"brand", "variants"})
  Optional<Product> findWithDetailsById(UUID id);

  @EntityGraph(attributePaths = {"brand", "variants"})
  List<Product> findByIdIn(List<UUID> ids);

  @Query(
      value =
          "SELECT id FROM products WHERE tenant_id = :tenantId AND is_active = true "
              + "AND search_vector @@ websearch_to_tsquery('es_unaccent', :query)",
      nativeQuery = true)
  List<UUID> findIdsMatchingFts(@Param("tenantId") UUID tenantId, @Param("query") String query);

  @Query(
      value =
          "SELECT id FROM products WHERE tenant_id = :tenantId AND is_active = true "
              + "AND style_tags && string_to_array(:tagsCsv, ',')",
      nativeQuery = true)
  List<UUID> findIdsMatchingTags(
      @Param("tenantId") UUID tenantId, @Param("tagsCsv") String tagsCsv);
}
