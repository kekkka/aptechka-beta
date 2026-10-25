package ru.aptechka.backend.health;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VitalReadingRepository extends JpaRepository<VitalReading, UUID> {

	List<VitalReading> findByPatientIdAndMeasuredAtBetweenOrderByMeasuredAtDesc(UUID patientId, Instant from, Instant to);

	List<VitalReading> findByPatientIdAndTypeAndMeasuredAtBetweenOrderByMeasuredAtDesc(UUID patientId, VitalType type, Instant from, Instant to);

}
