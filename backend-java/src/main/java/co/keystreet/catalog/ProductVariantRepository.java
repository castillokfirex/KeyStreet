package co.keystreet.catalog;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> {

  @EntityGraph(attributePaths = {"product", "product.brand"})
  List<ProductVariant> findAllByIdIn(List<UUID> ids);
}
