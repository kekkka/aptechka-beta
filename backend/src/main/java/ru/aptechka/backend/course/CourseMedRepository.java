package ru.aptechka.backend.course;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseMedRepository extends JpaRepository<CourseMed, UUID> {

	@EntityGraph(attributePaths = "course")
	Optional<CourseMed> findByIdAndCoursePatientId(UUID id, UUID patientId);

}
