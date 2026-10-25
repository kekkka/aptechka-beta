package ru.aptechka.backend.care;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CareMemberRepository extends JpaRepository<CareMember, UUID> {

	@EntityGraph(attributePaths = {"patient", "user"})
	Optional<CareMember> findByPatientIdAndUserId(UUID patientId, UUID userId);

	@EntityGraph(attributePaths = {"patient"})
	List<CareMember> findByUserIdOrderByCreatedAt(UUID userId);

	@EntityGraph(attributePaths = {"user"})
	List<CareMember> findByPatientIdOrderByCreatedAt(UUID patientId);

	boolean existsByPatientIdAndRole(UUID patientId, CareRole role);

}
