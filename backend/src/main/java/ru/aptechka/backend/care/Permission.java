package ru.aptechka.backend.care;

public enum Permission {
	// Today's plan, courses and the medicine cabinet.
	VIEW_PLAN,
	// Everything else about the person: health diary, signals, care circle.
	VIEW_ALL,
	// Profile, care circle, courses and health thresholds.
	MANAGE,
	MARK_DOSE,
	EDIT_STOCK,
	RECORD_VITALS,
	REQUEST_HELP,
	RESOLVE_HELP
}
