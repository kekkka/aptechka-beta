package ru.aptechka.backend.stock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

class Gs1CodeTests {

	@Test
	void plainEan13IsPaddedToGtin14() {
		assertThat(Gs1Code.parse("4601234567893")).isEqualTo(new Gs1Code("04601234567893", null, null, null));
	}

	@Test
	void wrongCheckDigitIsRejected() {
		assertThatThrownBy(() -> Gs1Code.parse("4601234567890")).isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void dataMatrixWithGroupSeparators() {
		Gs1Code code = Gs1Code.parse("]d2010460123456789317270131" + "10AB12\u001d21SERIAL123\u001d91EE07\u001d92abc");
		assertThat(code.gtin()).isEqualTo("04601234567893");
		assertThat(code.expiry()).isEqualTo(LocalDate.of(2027, 1, 31));
		assertThat(code.batch()).isEqualTo("AB12");
		assertThat(code.serial()).isEqualTo("SERIAL123");
	}

	@Test
	void drugMarkingCodeWithoutSeparatorsKeepsThirteenCharSerial() {
		Gs1Code code = Gs1Code.parse("010460123456789321ABCDEFGHIJKLM91EE0792dGVzdA==");
		assertThat(code.gtin()).isEqualTo("04601234567893");
		assertThat(code.serial()).isEqualTo("ABCDEFGHIJKLM");
	}

	@Test
	void bracketedHumanReadableFormWithDayZeroMeaningEndOfMonth() {
		Gs1Code code = Gs1Code.parse("(01)04601234567893(17)270200(10)X1");
		assertThat(code.expiry()).isEqualTo(LocalDate.of(2027, 2, 28));
		assertThat(code.batch()).isEqualTo("X1");
	}

	@Test
	void codeWithoutGtinIsRejected() {
		assertThatThrownBy(() -> Gs1Code.parse("(21)ABC")).isInstanceOf(IllegalArgumentException.class);
	}

}
