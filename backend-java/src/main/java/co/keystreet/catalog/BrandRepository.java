package co.keystreet.catalog;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BrandRepository extends JpaRepository<Brand, UUID> {
  Optional<Brand> findBySlug(String slug);

  List<Brand> findAllByOrderByNameAsc();
}
