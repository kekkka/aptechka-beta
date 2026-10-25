package ru.aptechka.backend.stock;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DrugCatalogRepository extends JpaRepository<DrugCatalogEntry, String> {
}
