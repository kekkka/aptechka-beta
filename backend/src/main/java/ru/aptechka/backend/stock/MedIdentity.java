package ru.aptechka.backend.stock;

import java.util.Locale;

// What makes two medicines interchangeable for stock: same name, strength, form and unit.
public record MedIdentity(String name, String strength, String form, String unit) {

	public String key() {
		return String.join("|", norm(name), norm(strength), norm(form), norm(unit));
	}

	private static String norm(String s) {
		return s == null ? "" : s.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
	}

}
