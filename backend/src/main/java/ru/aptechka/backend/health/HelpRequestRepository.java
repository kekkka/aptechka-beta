package ru.aptechka.backend.health;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface HelpRequestRepository extends JpaRepository<HelpRequest, UUID> {

	List<HelpRequest> findByPatientIdAndResolvedAtIsNullOrderByCreatedAtDesc(UUID patientId);

	Optional<HelpRequest> findByIdAndPatientId(UUID id, UUID patientId);

}
