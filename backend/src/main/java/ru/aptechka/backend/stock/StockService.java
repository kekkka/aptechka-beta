package ru.aptechka.backend.stock;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ru.aptechka.backend.care.CareService;
import ru.aptechka.backend.care.Permission;
import ru.aptechka.backend.common.Errors;

@Service
@Transactional
public class StockService {

	// Packages that expire within this many days are flagged in the cabinet and in signals.
	public static final int EXPIRY_WARNING_DAYS = 30;

	private final StockItemRepository stock;
	private final DrugCatalogRepository catalog;
	private final CareService care;
	private final Clock clock;

	public StockService(StockItemRepository stock, DrugCatalogRepository catalog, CareService care, Clock clock) {
		this.stock = stock;
		this.catalog = catalog;
		this.care = care;
		this.clock = clock;
	}

	public record StockValues(MedIdentity med, BigDecimal qty, Integer packSize, LocalDate expiry, String gtin) {
	}

	public record StockView(UUID id, String name, String strength, String form, String unit, BigDecimal qty,
			Integer packSize, LocalDate expiry, String gtin, boolean expired, boolean expiresSoon) {
	}

	public enum MatchSource {
		// This cabinet already has a package with the same barcode.
		STOCK,
		// Found in the reference catalog.
		CATALOG,
		// Unknown barcode: the user fills the form by hand once, then it is remembered.
		NONE
	}

	public record Suggestion(String name, String strength, String form, String unit, Integer packSize, String manufacturer) {
	}

	public record ScanResult(String gtin, String serial, String batch, LocalDate expiry, MatchSource source,
			UUID stockItemId, Suggestion suggestion) {
	}

	@Transactional(readOnly = true)
	public List<StockView> list(UUID patientId, UUID userId) {
		care.require(patientId, userId, Permission.VIEW_PLAN);
		return items(patientId).stream().map(this::view).toList();
	}

	@Transactional(readOnly = true)
	public List<StockItem> items(UUID patientId) {
		return stock.findByPatientIdOrderByName(patientId);
	}

	// Adding a package of a medicine that is already in the cabinet (same barcode or
	// same name/strength/form/unit) tops up that entry instead of creating a duplicate.
	public StockView add(UUID patientId, UUID userId, StockValues v) {
		care.require(patientId, userId, Permission.EDIT_STOCK);
		String gtin = normalizeGtin(v.gtin());
		Optional<StockItem> existing = Optional.<StockItem>empty();
		if (gtin != null) {
			existing = stock.findFirstByPatientIdAndGtin(patientId, gtin);
		}
		if (existing.isEmpty()) {
			String key = v.med().key();
			existing = items(patientId).stream().filter(s -> s.identity().key().equals(key)).findFirst();
		}
		if (existing.isPresent()) {
			StockItem item = existing.get();
			item.restock(v.qty(), v.packSize(), v.expiry(), clock.instant());
			return view(item);
		}
		return view(stock.save(new StockItem(patientId, v.med(), v.qty(), v.packSize(), v.expiry(), gtin, clock.instant())));
	}

	public StockView update(UUID patientId, UUID userId, UUID itemId, StockValues v) {
		care.require(patientId, userId, Permission.EDIT_STOCK);
		StockItem item = find(patientId, itemId);
		item.update(v.med(), v.qty(), v.packSize(), v.expiry(), normalizeGtin(v.gtin()), clock.instant());
		return view(item);
	}

	public void delete(UUID patientId, UUID userId, UUID itemId) {
		care.require(patientId, userId, Permission.EDIT_STOCK);
		stock.delete(find(patientId, itemId));
	}

	@Transactional(readOnly = true)
	public ScanResult scan(UUID patientId, UUID userId, String code) {
		care.require(patientId, userId, Permission.EDIT_STOCK);
		Gs1Code parsed;
		try {
			parsed = Gs1Code.parse(code);
		} catch (IllegalArgumentException e) {
			throw Errors.badRequest(e.getMessage());
		}
		Optional<StockItem> own = stock.findFirstByPatientIdAndGtin(patientId, parsed.gtin());
		if (own.isPresent()) {
			StockItem s = own.get();
			return result(parsed, MatchSource.STOCK, s.getId(), new Suggestion(s.getName(), s.getStrength(), s.getForm(), s.getUnit(), s.getPackSize(), null));
		}
		return catalog.findById(parsed.gtin())
				.map(c -> result(parsed, MatchSource.CATALOG, null, new Suggestion(c.identity().name(), c.identity().strength(),
						c.identity().form(), c.identity().unit(), c.getPackSize(), c.getManufacturer())))
				.orElseGet(() -> result(parsed, MatchSource.NONE, null, null));
	}

	// Takes one dose from the package that expires first and still holds enough.
	public Optional<StockItem> consume(UUID patientId, MedIdentity med, BigDecimal amount) {
		String key = med.key();
		Optional<StockItem> source = items(patientId).stream()
				.filter(s -> s.identity().key().equals(key) && s.getQty().compareTo(amount) >= 0)
				.min(Comparator.comparing(StockItem::getExpiry, Comparator.nullsLast(Comparator.naturalOrder())));
		source.ifPresent(s -> s.adjust(amount.negate(), clock.instant()));
		return source;
	}

	public void restore(UUID stockItemId, BigDecimal amount) {
		stock.findById(stockItemId).ifPresent(s -> s.adjust(amount, clock.instant()));
	}

	public StockView view(StockItem s) {
		LocalDate today = LocalDate.now(clock);
		boolean expired = s.getExpiry() != null && s.getExpiry().isBefore(today);
		boolean soon = !expired && s.getExpiry() != null && !s.getExpiry().isAfter(today.plusDays(EXPIRY_WARNING_DAYS));
		return new StockView(s.getId(), s.getName(), s.getStrength(), s.getForm(), s.getUnit(), s.getQty(), s.getPackSize(),
				s.getExpiry(), s.getGtin(), expired, soon);
	}

	private StockItem find(UUID patientId, UUID itemId) {
		return stock.findByIdAndPatientId(itemId, patientId).orElseThrow(() -> Errors.notFound("Препарат не найден"));
	}

	private static String normalizeGtin(String gtin) {
		if (gtin == null || gtin.isBlank()) {
			return null;
		}
		try {
			return Gs1Code.parse(gtin).gtin();
		} catch (IllegalArgumentException e) {
			throw Errors.badRequest(e.getMessage());
		}
	}

	private static ScanResult result(Gs1Code code, MatchSource source, UUID stockItemId, Suggestion suggestion) {
		return new ScanResult(code.gtin(), code.serial(), code.batch(), code.expiry(), source, stockItemId, suggestion);
	}

}
