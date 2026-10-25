package ru.aptechka.backend.health;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// "Мне плохо": the person (or the caregiver next to them) asks the family to react.
@Entity
@Table(name = "help_request")
public class HelpRequest {

	@Id
	private UUID id;

	@Column(name = "patient_id", nullable = false)
	private UUID patientId;

	@Column(name = "created_by")
	private UUID createdBy;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	private String message;

	@Column(name = "resolved_at")
	private Instant resolvedAt;

	@Column(name = "resolved_by")
	private UUID resolvedBy;

	protected HelpRequest() {
	}

	public HelpRequest(UUID patientId, UUID createdBy, Instant createdAt, String message) {
		this.id = UUID.randomUUID();
		this.patientId = patientId;
		this.createdBy = createdBy;
		this.createdAt = createdAt;
		this.message = message;
	}

	public void resolve(UUID by, Instant at) {
		this.resolvedBy = by;
		this.resolvedAt = at;
	}

	public UUID getId() {
		return id;
	}

	public UUID getCreatedBy() {
		return createdBy;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public String getMessage() {
		return message;
	}

	public Instant getResolvedAt() {
		return resolvedAt;
	}

	public UUID getResolvedBy() {
		return resolvedBy;
	}

}
