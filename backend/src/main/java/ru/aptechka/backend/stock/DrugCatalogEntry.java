package ru.aptechka.backend.stock;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Reference data: what a package barcode (GTIN) contains. Meant to be filled from
// an official source (ГРЛС, «Честный знак»); the app only reads it.
@Entity
@Table(name = "drug_catalog")
public class DrugCatalogEntry {

	@Id
	private String gtin;

	@Column(nullable = false)
	private String name;

	@Column(nullable = false)
	private String strength;

	@Column(nullable = false)
	private String form;

	@Column(nullable = false)
	private String unit;

	@Column(name = "pack_size")
	private Integer packSize;

	private String manufacturer;

	protected DrugCatalogEntry() {
	}

	public DrugCatalogEntry(String gtin, MedIdentity med, Integer packSize, String manufacturer) {
		this.gtin = gtin;
		this.name = med.name();
		this.strength = med.strength();
		this.form = med.form();
		this.unit = med.unit();
		this.packSize = packSize;
		this.manufacturer = manufacturer;
	}

	public String getGtin() {
		return gtin;
	}

	public MedIdentity identity() {
		return new MedIdentity(name, strength, form, unit);
	}

	public Integer getPackSize() {
		return packSize;
	}

	public String getManufacturer() {
		return manufacturer;
	}

}
