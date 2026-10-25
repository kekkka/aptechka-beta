package ru.aptechka.backend.care;

import static ru.aptechka.backend.care.Permission.EDIT_STOCK;
import static ru.aptechka.backend.care.Permission.MANAGE;
import static ru.aptechka.backend.care.Permission.MARK_DOSE;
import static ru.aptechka.backend.care.Permission.RECORD_VITALS;
import static ru.aptechka.backend.care.Permission.REQUEST_HELP;
import static ru.aptechka.backend.care.Permission.RESOLVE_HELP;
import static ru.aptechka.backend.care.Permission.VIEW_ALL;
import static ru.aptechka.backend.care.Permission.VIEW_PLAN;

import java.util.EnumSet;
import java.util.Set;

// A person's role in one patient's care circle and what it allows.
public enum CareRole {
	// The relative who organises care.
	OWNER(EnumSet.allOf(Permission.class)),
	// Caregiver on shift: does the hands-on work, cannot change the plan or the circle.
	CAREGIVER(EnumSet.of(VIEW_PLAN, VIEW_ALL, MARK_DOSE, EDIT_STOCK, RECORD_VITALS, REQUEST_HELP, RESOLVE_HELP)),
	// Other relatives: watch and react to signals.
	FAMILY(EnumSet.of(VIEW_PLAN, VIEW_ALL, RESOLVE_HELP)),
	// The person receiving care: a lightweight profile with only the essentials.
	PATIENT(EnumSet.of(VIEW_PLAN, MARK_DOSE, RECORD_VITALS, REQUEST_HELP));

	private final Set<Permission> permissions;

	CareRole(Set<Permission> permissions) {
		this.permissions = permissions;
	}

	public Set<Permission> permissions() {
		return permissions;
	}

	public boolean can(Permission permission) {
		return permissions.contains(permission);
	}

}
