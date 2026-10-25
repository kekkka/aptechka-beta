package ru.aptechka.backend.course;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

// A verified prescription, decomposed into medicines with daily times.
@Entity
@Table(name = "course")
public class Course {

	@Id
	private UUID id;

	@Column(name = "patient_id", nullable = false)
	private UUID patientId;

	@Column(nullable = false)
	private String title;

	@Column(name = "start_date", nullable = false)
	private LocalDate startDate;

	private String source;

	@Column(nullable = false)
	private boolean active;

	@Column(name = "created_by")
	private UUID createdBy;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	// Last day of a course that was stopped early; doses after it are no longer planned.
	@Column(name = "ended_on")
	private LocalDate endedOn;

	@OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("position")
	private List<CourseMed> meds = new ArrayList<>();

	protected Course() {
	}

	public Course(UUID patientId, String title, LocalDate startDate, String source, UUID createdBy, Instant createdAt) {
		this.id = UUID.randomUUID();
		this.patientId = patientId;
		this.title = title;
		this.startDate = startDate;
		this.source = source;
		this.active = true;
		this.createdBy = createdBy;
		this.createdAt = createdAt;
	}

	public void addMed(CourseMed med) {
		meds.add(med);
	}

	public void end(LocalDate on) {
		this.active = false;
		this.endedOn = on;
	}

	public LocalDate lastDay() {
		LocalDate last = meds.stream().map(CourseMed::lastDay).max(LocalDate::compareTo).orElse(startDate);
		return endedOn != null && endedOn.isBefore(last) ? endedOn : last;
	}

	public UUID getId() {
		return id;
	}

	public UUID getPatientId() {
		return patientId;
	}

	public String getTitle() {
		return title;
	}

	public LocalDate getStartDate() {
		return startDate;
	}

	public String getSource() {
		return source;
	}

	public boolean isActive() {
		return active;
	}

	public LocalDate getEndedOn() {
		return endedOn;
	}

	public List<CourseMed> getMeds() {
		return meds;
	}

}
