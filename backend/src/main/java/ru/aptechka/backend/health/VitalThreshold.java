package ru.aptechka.backend.health;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

// Limits set by the organiser for one measurement, replacing VitalType defaults.
@Entity
@Table(name = "vital_threshold")
public class VitalThreshold {

	@Id
	private UUID id;

	@Column(name = "patient_id", nullable = false)
	private UUID patientId;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.VARCHAR)
	@Column(nullable = false)
	private VitalType type;

	private BigDecimal min1;
	private BigDecimal max1;
	private BigDecimal min2;
	private BigDecimal max2;

	protected VitalThreshold() {
	}

	public VitalThreshold(UUID patientId, VitalType type) {
		this.id = UUID.randomUUID();
		this.patientId = patientId;
		this.type = type;
	}

	public void set(VitalType.Limits limits) {
		this.min1 = limits.min1();
		this.max1 = limits.max1();
		this.min2 = limits.min2();
		this.max2 = limits.max2();
	}

	public VitalType getType() {
		return type;
	}

	public VitalType.Limits limits() {
		return new VitalType.Limits(min1, max1, min2, max2);
	}

}
