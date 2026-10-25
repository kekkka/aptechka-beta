package ru.aptechka.backend.health;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import ru.aptechka.backend.account.CurrentUser;
import ru.aptechka.backend.health.HealthService.HelpView;
import ru.aptechka.backend.health.HealthService.ReadingView;
import ru.aptechka.backend.health.HealthService.ThresholdView;

@RestController
@RequestMapping("/api/patients/{patientId}")
public class HealthController {

	private final HealthService health;

	public HealthController(HealthService health) {
		this.health = health;
	}

	public record ReadingRequest(@NotNull VitalType type, @NotNull BigDecimal value1, BigDecimal value2, Instant measuredAt,
			@Size(max = 200) String note) {
	}

	public record ThresholdRequest(BigDecimal min1, BigDecimal max1, BigDecimal min2, BigDecimal max2) {
	}

	public record HelpRequestBody(@Size(max = 300) String message) {
	}

	@GetMapping("/vitals")
	List<ReadingView> list(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId,
			@RequestParam(required = false) VitalType type, @RequestParam(defaultValue = "30") @Min(1) @Max(365) int days) {
		return health.list(patientId, me.id(), type, days);
	}

	@PostMapping("/vitals")
	@ResponseStatus(HttpStatus.CREATED)
	ReadingView record(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId, @Valid @RequestBody ReadingRequest r) {
		return health.record(patientId, me.id(), r.type(), r.value1(), r.value2(), r.measuredAt(), r.note());
	}

	@GetMapping("/vital-thresholds")
	List<ThresholdView> thresholds(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId) {
		return health.thresholds(patientId, me.id());
	}

	@PutMapping("/vital-thresholds/{type}")
	ThresholdView setThreshold(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId, @PathVariable VitalType type,
			@RequestBody ThresholdRequest r) {
		return health.setThreshold(patientId, me.id(), type, new VitalType.Limits(r.min1(), r.max1(), r.min2(), r.max2()));
	}

	@DeleteMapping("/vital-thresholds/{type}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void resetThreshold(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId, @PathVariable VitalType type) {
		health.resetThreshold(patientId, me.id(), type);
	}

	@PostMapping("/help-requests")
	@ResponseStatus(HttpStatus.CREATED)
	HelpView requestHelp(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId, @Valid @RequestBody HelpRequestBody r) {
		return health.requestHelp(patientId, me.id(), r.message());
	}

	@PostMapping("/help-requests/{requestId}/resolve")
	HelpView resolveHelp(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId, @PathVariable UUID requestId) {
		return health.resolveHelp(patientId, me.id(), requestId);
	}

}
