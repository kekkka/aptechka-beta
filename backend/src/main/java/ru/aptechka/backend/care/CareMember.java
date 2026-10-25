package ru.aptechka.backend.care;

import java.time.Instant;
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

import ru.aptechka.backend.account.AppUser;

@Entity
@Table(name = "care_member")
public class CareMember {

	@Id
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "patient_id")
	private Patient patient;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id")
	private AppUser user;

	@Enumerated(EnumType.STRING)
	@JdbcTypeCode(SqlTypes.VARCHAR)
	@Column(nullable = false)
	private CareRole role;

	private String relation;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected CareMember() {
	}

	public CareMember(Patient patient, AppUser user, CareRole role, String relation, Instant createdAt) {
		this.id = UUID.randomUUID();
		this.patient = patient;
		this.user = user;
		this.role = role;
		this.relation = relation;
		this.createdAt = createdAt;
	}

	public UUID getId() {
		return id;
	}

	public Patient getPatient() {
		return patient;
	}

	public AppUser getUser() {
		return user;
	}

	public CareRole getRole() {
		return role;
	}

	public String getRelation() {
		return relation;
	}

	public void update(CareRole role, String relation) {
		this.role = role;
		this.relation = relation;
	}

	public boolean can(Permission permission) {
		return role.can(permission);
	}

}
