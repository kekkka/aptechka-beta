package ru.aptechka.backend.course;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<Course, UUID> {

	@EntityGraph(attributePaths = "meds")
	List<Course> findByPatientIdOrderByStartDateDesc(UUID patientId);

	@EntityGraph(attributePaths = "meds")
	Optional<Course> findByIdAndPatientId(UUID id, UUID patientId);

}
