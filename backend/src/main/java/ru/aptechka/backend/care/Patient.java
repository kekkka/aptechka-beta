package ru.aptechka.backend.care;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// The care profile of the person being looked after.
@Entity
@Table(name = "patient")
public class Patient {

	@Id
	private UUID id;

	@Column(nullable = false)
	private String name;

	@Column(name = "birth_year")
	private Integer birthYear;

	private String notes;

	// How long after a planned dose the family is signalled if there is no mark.
	@Column(name = "grace_minutes", nullable = false)
	private int graceMinutes;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected Patient() {
	}

	public Patient(String name, Integer birthYear, String notes, int graceMinutes, Instant createdAt) {
		this.id = UUID.randomUUID();
		update(name, birthYear, notes, graceMinutes);
		this.createdAt = createdAt;
	}

	public void update(String name, Integer birthYear, String notes, int graceMinutes) {
		this.name = name;
		this.birthYear = birthYear;
		this.notes = notes;
		this.graceMinutes = graceMinutes;
	}

	public UUID getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public Integer getBirthYear() {
		return birthYear;
	}

	public String getNotes() {
		return notes;
	}

	public int getGraceMinutes() {
		return graceMinutes;
	}

}
