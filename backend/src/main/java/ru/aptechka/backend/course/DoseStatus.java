package ru.aptechka.backend.course;

public enum DoseStatus {
	TAKEN,
	SKIPPED,
	// Not marked and not yet due.
	PLANNED,
	// Due, still within the grace period.
	DUE,
	// No mark after the grace period: the family gets a signal.
	OVERDUE
}
