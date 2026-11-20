package co.keystreet.catalog;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

public final class ProductSpecifications {

  private ProductSpecifications() {}

  public record Filter(
      List<String> brandSlugs,
      Short sizeEu,
      Integer minPrice,
      Integer maxPrice,
      Boolean discounted,
      String silhouette,
      List<UUID> tagMatchedIds,
      boolean tagFilterActive,
      List<UUID> ftsMatchedIds,
      String searchText,
      boolean onlyActive) {}

  public static Specification<Product> withFilter(Filter f) {
    return (root, query, cb) -> {
      List<Predicate> preds = new ArrayList<>();

      if (f.onlyActive()) {
        preds.add(cb.isTrue(root.get("isActive")));
      }
      if (f.brandSlugs() != null && !f.brandSlugs().isEmpty()) {
        preds.add(root.join("brand", JoinType.INNER).get("slug").in(f.brandSlugs()));
      }
      if (f.sizeEu() != null) {
        Subquery<UUID> sq = query.subquery(UUID.class);
        Root<ProductVariant> v = sq.from(ProductVariant.class);
        sq.select(v.get("id"))
            .where(
                cb.equal(v.get("product"), root),
                cb.equal(v.get("sizeEu"), f.sizeEu()),
                cb.greaterThan(v.get("stock"), 0),
                cb.isTrue(v.get("isActive")));
        preds.add(cb.exists(sq));
      }
      if (f.minPrice() != null) {
        preds.add(cb.greaterThanOrEqualTo(root.get("finalPriceCop"), f.minPrice()));
      }
      if (f.maxPrice() != null) {
        preds.add(cb.lessThanOrEqualTo(root.get("finalPriceCop"), f.maxPrice()));
      }
      if (Boolean.TRUE.equals(f.discounted())) {
        preds.add(cb.isTrue(root.get("hasDiscount")));
      }
      if (f.silhouette() != null && !f.silhouette().isBlank()) {
        preds.add(cb.equal(root.get("silhouette"), f.silhouette().trim().toUpperCase()));
      }
      if (f.tagFilterActive()) {
        if (f.tagMatchedIds() == null || f.tagMatchedIds().isEmpty()) {
          preds.add(cb.disjunction());
        } else {
          preds.add(root.get("id").in(f.tagMatchedIds()));
        }
      }
      if (f.searchText() != null && !f.searchText().isBlank()) {
        String like = "%" + f.searchText().trim().toLowerCase() + "%";
        Predicate ilikePred =
            cb.or(
                cb.like(cb.lower(root.get("name")), like),
                cb.like(cb.lower(root.get("colorway")), like),
                cb.like(cb.lower(root.get("shortDescription")), like));
        if (f.ftsMatchedIds() != null && !f.ftsMatchedIds().isEmpty()) {
          preds.add(cb.or(root.get("id").in(f.ftsMatchedIds()), ilikePred));
        } else {
          preds.add(ilikePred);
        }
      }

      return cb.and(preds.toArray(Predicate[]::new));
    };
  }
}
