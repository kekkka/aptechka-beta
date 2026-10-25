package ru.aptechka.backend.health;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VitalThresholdRepository extends JpaRepository<VitalThreshold, UUID> {

	List<VitalThreshold> findByPatientId(UUID patientId);

	Optional<VitalThreshold> findByPatientIdAndType(UUID patientId, VitalType type);

}
