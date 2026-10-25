package ru.aptechka.backend.signal;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ru.aptechka.backend.care.CareMember;
import ru.aptechka.backend.care.CareService;
import ru.aptechka.backend.care.Permission;
import ru.aptechka.backend.course.DoseStatus;
import ru.aptechka.backend.course.ScheduleService;
import ru.aptechka.backend.course.ScheduleService.DoseView;
import ru.aptechka.backend.course.ShoppingService;
import ru.aptechka.backend.health.HealthService;
import ru.aptechka.backend.health.HealthService.ReadingView;
import ru.aptechka.backend.stock.StockService;
import ru.aptechka.backend.stock.StockService.StockView;

// Everything the family should react to, computed from the current data on each
// request. Delivery as push notifications is a separate, later step.
@Service
@Transactional(readOnly = true)
public class SignalService {

	private final CareService care;
	private final ScheduleService schedule;
	private final ShoppingService shopping;
	private final StockService stock;
	private final HealthService health;
	private final Clock clock;

	public SignalService(CareService care, ScheduleService schedule, ShoppingService shopping, StockService stock, HealthService health, Clock clock) {
		this.care = care;
		this.schedule = schedule;
		this.shopping = shopping;
		this.stock = stock;
		this.health = health;
		this.clock = clock;
	}

	public enum Kind {
		HELP_REQUEST, VITAL_OUT_OF_RANGE, MISSED_DOSE, SKIPPED_DOSE, LOW_STOCK, EXPIRING_STOCK
	}

	public enum Severity {
		HIGH, MEDIUM, LOW
	}

	public record Signal(Kind kind, Severity severity, String title, String detail, Instant at, UUID refId) {
	}

	public record TodayView(int total, int taken, int skipped, int overdue, int open) {
	}

	public record Summary(UUID patientId, String patientName, LocalDate date, TodayView today, DoseView nextDose,
			List<Signal> signals, List<ReadingView> latestVitals, int shortages) {
	}

	public List<Signal> signals(UUID patientId, UUID userId) {
		CareMember member = care.require(patientId, userId, Permission.VIEW_ALL);
		LocalDate today = LocalDate.now(clock);
		return collect(patientId, member.getPatient().getGraceMinutes(), schedule.doses(patientId, member.getPatient().getGraceMinutes(), today.minusDays(1), today));
	}

	public Summary summary(UUID patientId, UUID userId) {
		CareMember member = care.require(patientId, userId, Permission.VIEW_ALL);
		int grace = member.getPatient().getGraceMinutes();
		LocalDate today = LocalDate.now(clock);
		List<DoseView> doses = schedule.doses(patientId, grace, today.minusDays(1), today);
		List<DoseView> todays = doses.stream().filter(d -> d.date().equals(today)).toList();
		TodayView counts = new TodayView(todays.size(),
				count(todays, DoseStatus.TAKEN), count(todays, DoseStatus.SKIPPED), count(todays, DoseStatus.OVERDUE),
				count(todays, DoseStatus.PLANNED) + count(todays, DoseStatus.DUE));
		DoseView next = todays.stream().filter(d -> d.status() == DoseStatus.PLANNED || d.status() == DoseStatus.DUE).findFirst().orElse(null);
		return new Summary(patientId, member.getPatient().getName(), today, counts, next, collect(patientId, grace, doses),
				health.latest(patientId), shopping.shortages(patientId, grace).size());
	}

	private List<Signal> collect(UUID patientId, int grace, List<DoseView> recentDoses) {
		List<Signal> out = new ArrayList<>();
		for (HealthService.HelpView h : health.openHelp(patientId)) {
			out.add(new Signal(Kind.HELP_REQUEST, Severity.HIGH, "Просит помощи: " + (h.createdByName() == null ? "подопечный" : h.createdByName()),
					h.message() == null || h.message().isBlank() ? "Нажата кнопка «Мне плохо»" : h.message(), h.createdAt(), h.id()));
		}
		for (ReadingView r : health.latest(patientId)) {
			if (r.outOfRange()) {
				String value = r.value2() == null ? r.value1().toPlainString() : r.value1().toPlainString() + "/" + r.value2().toPlainString();
				out.add(new Signal(Kind.VITAL_OUT_OF_RANGE, Severity.HIGH, r.label() + " вне нормы", value + " " + r.unit(), r.measuredAt(), r.id()));
			}
		}
		for (DoseView d : recentDoses) {
			Instant at = d.date().atTime(LocalTime.parse(d.time())).atZone(clock.getZone()).toInstant();
			if (d.status() == DoseStatus.OVERDUE) {
				out.add(new Signal(Kind.MISSED_DOSE, Severity.MEDIUM, "Нет отметки о приёме", d.name() + " " + d.strength() + " · " + d.time(), at, d.courseMedId()));
			} else if (d.status() == DoseStatus.SKIPPED) {
				out.add(new Signal(Kind.SKIPPED_DOSE, Severity.MEDIUM, "Приём пропущен", d.name() + " · " + d.time()
						+ (d.note() == null ? "" : " · " + d.note()), at, d.logId()));
			}
		}
		for (ShoppingService.ShoppingItem s : shopping.shortages(patientId, grace)) {
			out.add(new Signal(Kind.LOW_STOCK, Severity.LOW, "Не хватит на курс: " + s.name(),
					"Нужно докупить " + (s.packs() != null ? s.packs() + " уп." : s.missing().stripTrailingZeros().toPlainString() + " " + s.unit()), null, null));
		}
		for (StockView s : stock.items(patientId).stream().map(stock::view).toList()) {
			if (s.expired() || s.expiresSoon()) {
				out.add(new Signal(Kind.EXPIRING_STOCK, Severity.LOW, (s.expired() ? "Истёк срок годности: " : "Скоро истекает срок: ") + s.name(),
						"Годен до " + s.expiry(), null, s.id()));
			}
		}
		out.sort(Comparator.comparing(Signal::severity).thenComparing(Signal::at, Comparator.nullsLast(Comparator.reverseOrder())));
		return out;
	}

	private static int count(List<DoseView> doses, DoseStatus status) {
		return (int) doses.stream().filter(d -> d.status() == status).count();
	}

}
