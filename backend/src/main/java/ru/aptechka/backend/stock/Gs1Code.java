package ru.aptechka.backend.stock;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// What a package barcode says: GTIN, and for GS1 DataMatrix («Честный знак»)
// also serial number, batch and expiry date when the producer encoded them.
public record Gs1Code(String gtin, String serial, String batch, LocalDate expiry) {

	private static final char GS = '\u001d';
	// Fixed-length application identifiers we need; everything else is variable length.
	private static final Map<String, Integer> FIXED = Map.of("00", 18, "01", 14, "02", 14, "11", 6, "13", 6, "15", 6, "17", 6);
	// Serial length in drug marking codes when the scanner drops the GS separator.
	private static final int MARKING_SERIAL_LENGTH = 13;
	private static final Pattern BRACKETED = Pattern.compile("\\((\\d{2,4})\\)([^(]*)");

	public static Gs1Code parse(String raw) {
		if (raw == null) {
			throw new IllegalArgumentException("Пустой код");
		}
		String code = raw.strip();
		if (code.startsWith("]d2") || code.startsWith("]C1") || code.startsWith("]Q3")) {
			code = code.substring(3);
		}
		if (code.matches("\\d{8}|\\d{12,14}")) {
			return new Gs1Code(checkedGtin(code), null, null, null);
		}
		return code.startsWith("(") ? parseBracketed(code) : parseElementString(code);
	}

	private static Gs1Code parseBracketed(String code) {
		Builder b = new Builder();
		Matcher m = BRACKETED.matcher(code);
		while (m.find()) {
			b.put(m.group(1), m.group(2).strip());
		}
		return b.build();
	}

	private static Gs1Code parseElementString(String code) {
		Builder b = new Builder();
		int i = 0;
		while (i < code.length()) {
			if (code.charAt(i) == GS) {
				i++;
				continue;
			}
			if (i + 2 > code.length()) {
				break;
			}
			String ai = code.substring(i, i + 2);
			i += 2;
			Integer fixed = FIXED.get(ai);
			int end;
			if (fixed != null) {
				end = Math.min(code.length(), i + fixed);
			} else {
				int gs = code.indexOf(GS, i);
				end = gs >= 0 ? gs : code.length();
				if (gs < 0 && "21".equals(ai) && code.length() - i > MARKING_SERIAL_LENGTH
						&& code.startsWith("91", i + MARKING_SERIAL_LENGTH)) {
					end = i + MARKING_SERIAL_LENGTH;
				}
			}
			b.put(ai, code.substring(i, end));
			i = end;
			// Crypto tails (91/92/93) are the last fields of a marking code.
			if (ai.startsWith("9")) {
				break;
			}
		}
		return b.build();
	}

	static String checkedGtin(String digits) {
		String gtin = "0".repeat(14 - digits.length()) + digits;
		int sum = 0;
		for (int k = 0; k < 13; k++) {
			sum += (gtin.charAt(k) - '0') * (k % 2 == 0 ? 3 : 1);
		}
		if ((10 - sum % 10) % 10 != gtin.charAt(13) - '0') {
			throw new IllegalArgumentException("Код не похож на штрихкод упаковки: не сходится контрольная цифра");
		}
		return gtin;
	}

	static LocalDate expiry(String yymmdd) {
		if (!yymmdd.matches("\\d{6}")) {
			return null;
		}
		try {
			YearMonth month = YearMonth.of(2000 + Integer.parseInt(yymmdd.substring(0, 2)), Integer.parseInt(yymmdd.substring(2, 4)));
			int day = Integer.parseInt(yymmdd.substring(4, 6));
			return day == 0 ? month.atEndOfMonth() : month.atDay(day);
		} catch (DateTimeException e) {
			return null;
		}
	}

	private static final class Builder {

		private String gtin;
		private String serial;
		private String batch;
		private LocalDate expiry;

		void put(String ai, String value) {
			switch (ai) {
				case "01", "02" -> gtin = value.matches("\\d{14}") ? checkedGtin(value) : null;
				case "21" -> serial = value;
				case "10" -> batch = value;
				case "17" -> expiry = expiry(value);
				default -> {
				}
			}
		}

		Gs1Code build() {
			if (gtin == null) {
				throw new IllegalArgumentException("В коде не найден GTIN упаковки");
			}
			return new Gs1Code(gtin, serial, batch, expiry);
		}

	}

}
