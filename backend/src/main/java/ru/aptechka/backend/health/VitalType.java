package ru.aptechka.backend.health;

import java.math.BigDecimal;

// Health diary measurements. Default limits are generic adult values used until the
// organiser sets the ones the doctor gave; they only decide when the family is signalled.
public enum VitalType {
	// value1 = systolic, value2 = diastolic.
	BLOOD_PRESSURE("Давление", "мм рт. ст.", 40, 300, limits(90, 160, 50, 100)),
	PULSE("Пульс", "уд/мин", 20, 250, limits(50, 110, null, null)),
	GLUCOSE("Сахар", "ммоль/л", 0.5, 40, limits(3.9, 11.0, null, null)),
	TEMPERATURE("Температура", "°C", 30, 43, limits(35.5, 37.5, null, null)),
	SPO2("Сатурация", "%", 50, 100, limits(94, null, null, null)),
	WEIGHT("Вес", "кг", 20, 300, limits(null, null, null, null)),
	// Self-reported, 1 (very bad) to 5 (good).
	WELLBEING("Самочувствие", "из 5", 1, 5, limits(3, null, null, null));

	public record Limits(BigDecimal min1, BigDecimal max1, BigDecimal min2, BigDecimal max2) {

		public boolean outOfRange(BigDecimal v1, BigDecimal v2) {
			return below(v1, min1) || above(v1, max1) || v2 != null && (below(v2, min2) || above(v2, max2));
		}

		private static boolean below(BigDecimal v, BigDecimal limit) {
			return limit != null && v.compareTo(limit) < 0;
		}

		private static boolean above(BigDecimal v, BigDecimal limit) {
			return limit != null && v.compareTo(limit) > 0;
		}

	}

	private final String label;
	private final String unit;
	private final BigDecimal lowest;
	private final BigDecimal highest;
	private final Limits defaults;

	VitalType(String label, String unit, double lowest, double highest, Limits defaults) {
		this.label = label;
		this.unit = unit;
		this.lowest = BigDecimal.valueOf(lowest);
		this.highest = BigDecimal.valueOf(highest);
		this.defaults = defaults;
	}

	public String label() {
		return label;
	}

	public String unit() {
		return unit;
	}

	public boolean twoValues() {
		return this == BLOOD_PRESSURE;
	}

	public Limits defaults() {
		return defaults;
	}

	// Physically plausible input, to catch typos like 1200 instead of 120.
	public boolean plausible(BigDecimal v) {
		return v.compareTo(lowest) >= 0 && v.compareTo(highest) <= 0;
	}

	private static Limits limits(Number min1, Number max1, Number min2, Number max2) {
		return new Limits(dec(min1), dec(max1), dec(min2), dec(max2));
	}

	private static BigDecimal dec(Number n) {
		return n == null ? null : new BigDecimal(n.toString());
	}

}
