package ru.aptechka.backend.course;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ru.aptechka.backend.care.CareMember;
import ru.aptechka.backend.care.CareService;
import ru.aptechka.backend.care.Permission;
import ru.aptechka.backend.stock.MedIdentity;
import ru.aptechka.backend.stock.StockItem;
import ru.aptechka.backend.stock.StockService;

// What to buy so that every remaining planned dose of active courses is covered.
@Service
@Transactional(readOnly = true)
public class ShoppingService {

	private final ScheduleService schedule;
	private final CourseService courses;
	private final StockService stock;
	private final CareService care;
	private final Clock clock;

	public ShoppingService(ScheduleService schedule, CourseService courses, StockService stock, CareService care, Clock clock) {
		this.schedule = schedule;
		this.courses = courses;
		this.stock = stock;
		this.care = care;
		this.clock = clock;
	}

	public record ShoppingItem(String name, String strength, String form, String unit, BigDecimal needed, BigDecimal inStock,
			BigDecimal missing, Integer packSize, Integer packs) {
	}

	public List<ShoppingItem> list(UUID patientId, UUID userId) {
		CareMember member = care.require(patientId, userId, Permission.VIEW_PLAN);
		return shortages(patientId, member.getPatient().getGraceMinutes());
	}

	public List<ShoppingItem> shortages(UUID patientId, int graceMinutes) {
		LocalDate today = LocalDate.now(clock);
		LocalDate last = courses.courses(patientId).stream().filter(Course::isActive).map(Course::lastDay)
				.max(LocalDate::compareTo).orElse(null);
		if (last == null || last.isBefore(today)) {
			return List.of();
		}
		Map<String, MedIdentity> meds = new LinkedHashMap<>();
		Map<String, BigDecimal> needed = new LinkedHashMap<>();
		for (ScheduleService.DoseView d : schedule.doses(patientId, graceMinutes, today, last)) {
			if (d.status() == DoseStatus.TAKEN || d.status() == DoseStatus.SKIPPED) {
				continue;
			}
			MedIdentity med = new MedIdentity(d.name(), d.strength(), d.form(), d.unit());
			meds.putIfAbsent(med.key(), med);
			needed.merge(med.key(), d.dose(), BigDecimal::add);
		}
		List<StockItem> items = stock.items(patientId);
		return needed.entrySet().stream().map(e -> {
			MedIdentity med = meds.get(e.getKey());
			// Expired packages do not count as available.
			List<StockItem> usable = items.stream()
					.filter(s -> s.identity().key().equals(e.getKey()) && (s.getExpiry() == null || !s.getExpiry().isBefore(today)))
					.toList();
			BigDecimal have = usable.stream().map(StockItem::getQty).reduce(BigDecimal.ZERO, BigDecimal::add);
			BigDecimal missing = e.getValue().subtract(have).max(BigDecimal.ZERO);
			Integer packSize = usable.stream().map(StockItem::getPackSize).filter(java.util.Objects::nonNull).findFirst().orElse(null);
			Integer packs = packSize == null || missing.signum() == 0 ? null
					: missing.divide(BigDecimal.valueOf(packSize), 0, RoundingMode.CEILING).intValueExact();
			return new ShoppingItem(med.name(), med.strength(), med.form(), med.unit(), e.getValue(), have, missing, packSize, packs);
		}).filter(i -> i.missing().signum() > 0).sorted(java.util.Comparator.comparing(ShoppingItem::name)).toList();
	}

}
