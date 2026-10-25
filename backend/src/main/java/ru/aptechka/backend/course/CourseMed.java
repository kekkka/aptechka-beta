package ru.aptechka.backend.course;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import ru.aptechka.backend.stock.MedIdentity;

@Entity
@Table(name = "course_med")
public class CourseMed {

	@Id
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "course_id")
	private Course course;

	@Column(nullable = false)
	private int position;

	@Column(nullable = false)
	private String name;

	@Column(nullable = false)
	private String strength;

	@Column(nullable = false)
	private String form;

	@Column(nullable = false)
	private String unit;

	// Units (tablets, capsules) per intake.
	@Column(nullable = false)
	private BigDecimal dose;

	// Comma-separated "HH:mm" intake times, sorted.
	@Column(nullable = false)
	private String times;

	@Column(nullable = false)
	private int days;

	private String note;

	protected CourseMed() {
	}

	public CourseMed(Course course, int position, MedIdentity med, BigDecimal dose, List<String> times, int days, String note) {
		this.id = UUID.randomUUID();
		this.course = course;
		this.position = position;
		this.name = med.name().trim();
		this.strength = med.strength().trim();
		this.form = med.form().trim();
		this.unit = med.unit().trim();
		this.dose = dose;
		this.times = String.join(",", times.stream().sorted().toList());
		this.days = days;
		this.note = note;
	}

	public List<String> timeList() {
		return Arrays.asList(times.split(","));
	}

	public LocalDate lastDay() {
		return course.getStartDate().plusDays(days - 1L);
	}

	public boolean plannedOn(LocalDate date) {
		return !date.isBefore(course.getStartDate()) && !date.isAfter(lastDay());
	}

	public MedIdentity identity() {
		return new MedIdentity(name, strength, form, unit);
	}

	public UUID getId() {
		return id;
	}

	public Course getCourse() {
		return course;
	}

	public String getName() {
		return name;
	}

	public String getStrength() {
		return strength;
	}

	public String getForm() {
		return form;
	}

	public String getUnit() {
		return unit;
	}

	public BigDecimal getDose() {
		return dose;
	}

	public int getDays() {
		return days;
	}

	public String getNote() {
		return note;
	}

}
