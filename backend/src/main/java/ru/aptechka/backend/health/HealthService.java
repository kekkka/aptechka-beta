package ru.aptechka.backend.health;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ru.aptechka.backend.account.AppUser;
import ru.aptechka.backend.account.AppUserRepository;
import ru.aptechka.backend.care.CareService;
import ru.aptechka.backend.care.Permission;
import ru.aptechka.backend.common.Errors;

@Service
@Transactional
public class HealthService {

	// Readings older than this no longer raise a signal on their own.
	public static final Duration SIGNAL_WINDOW = Duration.ofHours(48);

	private final VitalReadingRepository readings;
	private final VitalThresholdRepository thresholds;
	private final HelpRequestRepository help;
	private final AppUserRepository users;
	private final CareService care;
	private final Clock clock;

	public HealthService(VitalReadingRepository readings, VitalThresholdRepository thresholds, HelpRequestRepository help,
			AppUserRepository users, CareService care, Clock clock) {
		this.readings = readings;
		this.thresholds = thresholds;
		this.help = help;
		this.users = users;
		this.care = care;
		this.clock = clock;
	}

	public record ReadingView(UUID id, VitalType type, String label, String unit, BigDecimal value1, BigDecimal value2,
			Instant measuredAt, String recordedByName, String note, boolean outOfRange) {
	}

	public record ThresholdView(VitalType type, String label, String unit, boolean twoValues, BigDecimal min1, BigDecimal max1,
			BigDecimal min2, BigDecimal max2, boolean custom) {
	}

	public record HelpView(UUID id, String message, Instant createdAt, String createdByName, Instant resolvedAt, String resolvedByName) {
	}

	public ReadingView record(UUID patientId, UUID userId, VitalType type, BigDecimal value1, BigDecimal value2, Instant measuredAt, String note) {
		care.require(patientId, userId, Permission.RECORD_VITALS);
		if (type.twoValues() != (value2 != null)) {
			throw Errors.badRequest(type.twoValues() ? "Укажите верхнее и нижнее давление" : "Для этого показателя нужно одно значение");
		}
		if (!type.plausible(value1) || value2 != null && !type.plausible(value2)) {
			throw Errors.badRequest(type.label() + ": значение вне допустимого диапазона, проверьте ввод");
		}
		Instant at = measuredAt != null ? measuredAt : clock.instant();
		if (at.isAfter(clock.instant().plus(Duration.ofMinutes(5)))) {
			throw Errors.badRequest("Время измерения не может быть в будущем");
		}
		VitalReading saved = readings.save(new VitalReading(patientId, type, value1, value2, at, userId, note));
		return views(patientId, List.of(saved)).getFirst();
	}

	@Transactional(readOnly = true)
	public List<ReadingView> list(UUID patientId, UUID userId, VitalType type, int days) {
		care.require(patientId, userId, Permission.VIEW_ALL);
		Instant to = clock.instant().plus(Duration.ofMinutes(5)), from = to.minus(Duration.ofDays(days));
		List<VitalReading> found = type == null
				? readings.findByPatientIdAndMeasuredAtBetweenOrderByMeasuredAtDesc(patientId, from, to)
				: readings.findByPatientIdAndTypeAndMeasuredAtBetweenOrderByMeasuredAtDesc(patientId, type, from, to);
		return views(patientId, found);
	}

	// The newest reading of each type within the signal window.
	@Transactional(readOnly = true)
	public List<ReadingView> latest(UUID patientId) {
		Instant now = clock.instant();
		List<VitalReading> recent = readings.findByPatientIdAndMeasuredAtBetweenOrderByMeasuredAtDesc(patientId, now.minus(SIGNAL_WINDOW), now.plus(Duration.ofMinutes(5)));
		Map<VitalType, VitalReading> newest = new EnumMap<>(VitalType.class);
		recent.forEach(r -> newest.putIfAbsent(r.getType(), r));
		return views(patientId, List.copyOf(newest.values()));
	}

	@Transactional(readOnly = true)
	public List<ThresholdView> thresholds(UUID patientId, UUID userId) {
		care.require(patientId, userId, Permission.VIEW_ALL);
		Map<VitalType, VitalType.Limits> custom = customLimits(patientId);
		return Arrays.stream(VitalType.values()).map(t -> thresholdView(t, custom.get(t))).toList();
	}

	public ThresholdView setThreshold(UUID patientId, UUID userId, VitalType type, VitalType.Limits limits) {
		care.require(patientId, userId, Permission.MANAGE);
		VitalThreshold t = thresholds.findByPatientIdAndType(patientId, type).orElseGet(() -> thresholds.save(new VitalThreshold(patientId, type)));
		t.set(limits);
		return thresholdView(type, limits);
	}

	public void resetThreshold(UUID patientId, UUID userId, VitalType type) {
		care.require(patientId, userId, Permission.MANAGE);
		thresholds.findByPatientIdAndType(patientId, type).ifPresent(thresholds::delete);
	}

	public HelpView requestHelp(UUID patientId, UUID userId, String message) {
		care.require(patientId, userId, Permission.REQUEST_HELP);
		return helpViews(List.of(help.save(new HelpRequest(patientId, userId, clock.instant(), message)))).getFirst();
	}

	@Transactional(readOnly = true)
	public List<HelpView> openHelp(UUID patientId) {
		return helpViews(help.findByPatientIdAndResolvedAtIsNullOrderByCreatedAtDesc(patientId));
	}

	public HelpView resolveHelp(UUID patientId, UUID userId, UUID requestId) {
		care.require(patientId, userId, Permission.RESOLVE_HELP);
		HelpRequest r = help.findByIdAndPatientId(requestId, patientId).orElseThrow(() -> Errors.notFound("Запрос не найден"));
		if (r.getResolvedAt() == null) {
			r.resolve(userId, clock.instant());
		}
		return helpViews(List.of(r)).getFirst();
	}

	private Map<VitalType, VitalType.Limits> customLimits(UUID patientId) {
		return thresholds.findByPatientId(patientId).stream().collect(Collectors.toMap(VitalThreshold::getType, VitalThreshold::limits));
	}

	private List<ReadingView> views(UUID patientId, List<VitalReading> list) {
		Map<VitalType, VitalType.Limits> custom = customLimits(patientId);
		Map<UUID, String> names = names(list.stream().map(VitalReading::getRecordedBy).toList());
		return list.stream().map(r -> {
			VitalType.Limits limits = custom.getOrDefault(r.getType(), r.getType().defaults());
			return new ReadingView(r.getId(), r.getType(), r.getType().label(), r.getType().unit(), r.getValue1(), r.getValue2(),
					r.getMeasuredAt(), names.get(r.getRecordedBy()), r.getNote(), limits.outOfRange(r.getValue1(), r.getValue2()));
		}).toList();
	}

	private List<HelpView> helpViews(List<HelpRequest> list) {
		Map<UUID, String> names = names(list.stream().flatMap(r -> java.util.stream.Stream.of(r.getCreatedBy(), r.getResolvedBy())).toList());
		return list.stream()
				.map(r -> new HelpView(r.getId(), r.getMessage(), r.getCreatedAt(), names.get(r.getCreatedBy()), r.getResolvedAt(), names.get(r.getResolvedBy())))
				.toList();
	}

	private Map<UUID, String> names(List<UUID> ids) {
		return users.findAllById(ids.stream().filter(Objects::nonNull).distinct().toList()).stream()
				.collect(Collectors.toMap(AppUser::getId, AppUser::getDisplayName));
	}

	private static ThresholdView thresholdView(VitalType t, VitalType.Limits custom) {
		VitalType.Limits l = custom != null ? custom : t.defaults();
		return new ThresholdView(t, t.label(), t.unit(), t.twoValues(), l.min1(), l.max1(), l.min2(), l.max2(), custom != null);
	}

}
