package ru.aptechka.backend.course;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DoseLogRepository extends JpaRepository<DoseLog, UUID> {

	@EntityGraph(attributePaths = "courseMed")
	List<DoseLog> findByCourseMedCoursePatientIdAndDoseDateBetween(UUID patientId, LocalDate from, LocalDate to);

	@EntityGraph(attributePaths = {"courseMed", "courseMed.course"})
	Optional<DoseLog> findByIdAndCourseMedCoursePatientId(UUID id, UUID patientId);

	boolean existsByCourseMedIdAndDoseDateAndDoseTime(UUID courseMedId, LocalDate doseDate, String doseTime);

}
