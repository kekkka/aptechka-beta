package ru.aptechka.backend.stock;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import ru.aptechka.backend.account.CurrentUser;
import ru.aptechka.backend.stock.StockService.ScanResult;
import ru.aptechka.backend.stock.StockService.StockValues;
import ru.aptechka.backend.stock.StockService.StockView;

@RestController
@RequestMapping("/api/patients/{patientId}/stock")
public class StockController {

	private final StockService stock;

	public StockController(StockService stock) {
		this.stock = stock;
	}

	public record StockRequest(
			@NotBlank @Size(max = 100) String name,
			@NotBlank @Size(max = 50) String strength,
			@NotBlank @Size(max = 30) String form,
			@NotBlank @Size(max = 20) String unit,
			@NotNull @DecimalMin("0") @DecimalMax("100000") BigDecimal qty,
			@Min(1) @Max(1000) Integer packSize,
			LocalDate expiry,
			@Size(max = 200) String gtin) {

		StockValues values() {
			return new StockValues(new MedIdentity(name, strength, form, unit), qty, packSize, expiry, gtin);
		}

	}

	public record ScanRequest(@NotBlank @Size(max = 300) String code) {
	}

	@GetMapping
	List<StockView> list(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId) {
		return stock.list(patientId, me.id());
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	StockView add(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId, @Valid @RequestBody StockRequest r) {
		return stock.add(patientId, me.id(), r.values());
	}

	@PutMapping("/{itemId}")
	StockView update(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId, @PathVariable UUID itemId,
			@Valid @RequestBody StockRequest r) {
		return stock.update(patientId, me.id(), itemId, r.values());
	}

	@DeleteMapping("/{itemId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void delete(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId, @PathVariable UUID itemId) {
		stock.delete(patientId, me.id(), itemId);
	}

	// Barcode or DataMatrix from the camera → what the package is and what is already known about it.
	@PostMapping("/scan")
	ScanResult scan(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId, @Valid @RequestBody ScanRequest r) {
		return stock.scan(patientId, me.id(), r.code());
	}

}
