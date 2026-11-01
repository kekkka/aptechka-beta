import type { MedicationInstruction as Instruction } from "./medication-instructions";

export function MedicationInstruction({
  instruction,
}: {
  instruction: Instruction;
}) {
  const sections = [
    ["Показания", instruction.indications],
    ["Противопоказания", instruction.contraindications],
    ["Способ применения", instruction.administration],
    ["Побочные эффекты", instruction.sideEffects],
  ];
  return (
    <section className="medication-instruction" aria-label="Краткая инструкция">
      <p className="instruction-purpose">{instruction.purpose}</p>
      <p className="catalog-meta">
        Коротко о препарате · не заменяет полную инструкцию
      </p>
      <div className="instruction-sections">
        {sections.map(([title, description]) => (
          <section key={title}>
            <h3>{title}</h3>
            <p>{description}</p>
          </section>
        ))}
      </div>
      <p className="instruction-note">
        Здесь общие сведения, а схема приёма — в назначении врача.
        Противопоказания, взаимодействия и побочные эффекты перечислены не
        полностью.
      </p>
      <a
        className="instruction-original"
        href={instruction.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Полная инструкция ↗
      </a>
      <p className="catalog-meta">
        Источник: {instruction.publisher}. Инструкция к РУ{" "}
        {instruction.registration}. Проверено{" "}
        {instruction.checkedAt.split("-").reverse().join(".")}.
      </p>
    </section>
  );
}
