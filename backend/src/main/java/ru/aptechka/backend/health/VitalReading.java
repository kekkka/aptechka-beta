package ru.aptechka.backend.health;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "vital_reading")
public class VitalReading {

	@Id
	private UUID id;

	@Column(name = "patient_id", nullable = false)
	private UUID patientId;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.VARCHAR)
	@Column(nullable = false)
	private VitalType type;

	@Column(nullable = false)
	private BigDecimal value1;

	private BigDecimal value2;

	@Column(name = "measured_at", nullable = false)
	private Instant measuredAt;

	@Column(name = "recorded_by")
	private UUID recordedBy;

	private String note;

	protected VitalReading() {
	}

	public VitalReading(UUID patientId, VitalType type, BigDecimal value1, BigDecimal value2, Instant measuredAt, UUID recordedBy, String note) {
		this.id = UUID.randomUUID();
		this.patientId = patientId;
		this.type = type;
		this.value1 = value1;
		this.value2 = value2;
		this.measuredAt = measuredAt;
		this.recordedBy = recordedBy;
		this.note = note;
	}

	public UUID getId() {
		return id;
	}

	public UUID getPatientId() {
		return patientId;
	}

	public VitalType getType() {
		return type;
	}

	public BigDecimal getValue1() {
		return value1;
	}

	public BigDecimal getValue2() {
		return value2;
	}

	public Instant getMeasuredAt() {
		return measuredAt;
	}

	public UUID getRecordedBy() {
		return recordedBy;
	}

	public String getNote() {
		return note;
	}

}
