package ru.aptechka.backend.signal;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import ru.aptechka.backend.account.CurrentUser;
import ru.aptechka.backend.signal.SignalService.Signal;
import ru.aptechka.backend.signal.SignalService.Summary;

@RestController
@RequestMapping("/api/patients/{patientId}")
public class SignalController {

	private final SignalService signals;

	public SignalController(SignalService signals) {
		this.signals = signals;
	}

	@GetMapping("/signals")
	List<Signal> signals(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId) {
		return signals.signals(patientId, me.id());
	}

	// One call for the watcher's home screen: today's doses, signals, latest readings.
	@GetMapping("/summary")
	Summary summary(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId) {
		return signals.summary(patientId, me.id());
	}

}
