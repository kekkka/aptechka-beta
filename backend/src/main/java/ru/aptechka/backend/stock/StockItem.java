package ru.aptechka.backend.stock;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "stock_item")
public class StockItem {

	@Id
	private UUID id;

	@Column(name = "patient_id", nullable = false)
	private UUID patientId;

	@Column(nullable = false)
	private String name;

	@Column(nullable = false)
	private String strength;

	@Column(nullable = false)
	private String form;

	@Column(nullable = false)
	private String unit;

	@Column(nullable = false)
	private BigDecimal qty;

	@Column(name = "pack_size")
	private Integer packSize;

	private LocalDate expiry;

	private String gtin;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected StockItem() {
	}

	public StockItem(UUID patientId, MedIdentity med, BigDecimal qty, Integer packSize, LocalDate expiry, String gtin, Instant now) {
		this.id = UUID.randomUUID();
		this.patientId = patientId;
		update(med, qty, packSize, expiry, gtin, now);
	}

	public void update(MedIdentity med, BigDecimal qty, Integer packSize, LocalDate expiry, String gtin, Instant now) {
		this.name = med.name().trim();
		this.strength = med.strength().trim();
		this.form = med.form().trim();
		this.unit = med.unit().trim();
		this.qty = qty;
		this.packSize = packSize;
		this.expiry = expiry;
		this.gtin = gtin;
		this.updatedAt = now;
	}

	// A new package of the same medicine: add to the count and keep the earliest expiry,
	// so the cabinet never looks fresher than its oldest box.
	public void restock(BigDecimal added, Integer packSize, LocalDate expiry, Instant now) {
		this.qty = this.qty.add(added);
		if (packSize != null) {
			this.packSize = packSize;
		}
		if (expiry != null && (this.expiry == null || expiry.isBefore(this.expiry))) {
			this.expiry = expiry;
		}
		this.updatedAt = now;
	}

	public void adjust(BigDecimal delta, Instant now) {
		this.qty = this.qty.add(delta);
		this.updatedAt = now;
	}

	public MedIdentity identity() {
		return new MedIdentity(name, strength, form, unit);
	}

	public UUID getId() {
		return id;
	}

	public UUID getPatientId() {
		return patientId;
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

	public BigDecimal getQty() {
		return qty;
	}

	public Integer getPackSize() {
		return packSize;
	}

	public LocalDate getExpiry() {
		return expiry;
	}

	public String getGtin() {
		return gtin;
	}

}
