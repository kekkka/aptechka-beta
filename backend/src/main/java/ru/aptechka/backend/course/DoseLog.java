package ru.aptechka.backend.course;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import ru.aptechka.backend.care.CareRole;

// A person's statement that a planned dose was taken or skipped. It records who
// said so and in which role; it is not an objective confirmation of intake.
@Entity
@Table(name = "dose_log")
public class DoseLog {

	@Id
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "course_med_id")
	private CourseMed courseMed;

	@Column(name = "dose_date", nullable = false)
	private LocalDate doseDate;

	@Column(name = "dose_time", nullable = false)
	private String doseTime;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.VARCHAR)
	@Column(nullable = false)
	private DoseStatus status;

	private String note;

	@Column(name = "marked_by")
	private UUID markedBy;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.VARCHAR)
	@Column(name = "marked_by_role", nullable = false)
	private CareRole markedByRole;

	@Column(name = "marked_at", nullable = false)
	private Instant markedAt;

	@Column(name = "stock_item_id")
	private UUID stockItemId;

	@Column(nullable = false)
	private BigDecimal consumed;

	protected DoseLog() {
	}

	public DoseLog(CourseMed courseMed, LocalDate doseDate, String doseTime, DoseStatus status, String note,
			UUID markedBy, CareRole markedByRole, Instant markedAt, UUID stockItemId, BigDecimal consumed) {
		this.id = UUID.randomUUID();
		this.courseMed = courseMed;
		this.doseDate = doseDate;
		this.doseTime = doseTime;
		this.status = status;
		this.note = note;
		this.markedBy = markedBy;
		this.markedByRole = markedByRole;
		this.markedAt = markedAt;
		this.stockItemId = stockItemId;
		this.consumed = consumed;
	}

	public String doseKey() {
		return courseMed.getId() + "|" + doseDate + "|" + doseTime;
	}

	public UUID getId() {
		return id;
	}

	public CourseMed getCourseMed() {
		return courseMed;
	}

	public LocalDate getDoseDate() {
		return doseDate;
	}

	public String getDoseTime() {
		return doseTime;
	}

	public DoseStatus getStatus() {
		return status;
	}

	public String getNote() {
		return note;
	}

	public UUID getMarkedBy() {
		return markedBy;
	}

	public CareRole getMarkedByRole() {
		return markedByRole;
	}

	public Instant getMarkedAt() {
		return markedAt;
	}

	public UUID getStockItemId() {
		return stockItemId;
	}

	public BigDecimal getConsumed() {
		return consumed;
	}

}
