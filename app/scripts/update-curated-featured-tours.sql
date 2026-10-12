BEGIN;
DELETE FROM pages_rels WHERE parent_id = 208 AND path = 'wingsGoTourCatalog.featuredTours';
INSERT INTO pages_rels ("order", parent_id, path, tour_products_id) VALUES
  (0, 208, 'wingsGoTourCatalog.featuredTours', 117),
  (1, 208, 'wingsGoTourCatalog.featuredTours', 119),
  (2, 208, 'wingsGoTourCatalog.featuredTours', 121),
  (3, 208, 'wingsGoTourCatalog.featuredTours', 139);
COMMIT;
