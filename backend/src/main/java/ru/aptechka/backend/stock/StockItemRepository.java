package ru.aptechka.backend.stock;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StockItemRepository extends JpaRepository<StockItem, UUID> {

	List<StockItem> findByPatientIdOrderByName(UUID patientId);

	Optional<StockItem> findFirstByPatientIdAndGtin(UUID patientId, String gtin);

	Optional<StockItem> findByIdAndPatientId(UUID id, UUID patientId);

}
