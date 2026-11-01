import { normalizeSearch, type CatalogProduct } from "./catalog";
import { registrationKey } from "./grls";

export interface MedicationInstruction {
  name: string;
  registration: string;
  strength: string;
  form: string;
  publisher: string;
  sourceUrl: string;
  checkedAt: string;
  purpose: string;
  indications: string;
  contraindications: string;
  administration: string;
  sideEffects: string;
}

// Editorial summaries for the demo, checked against the exact registered product.
// These are not the full instruction text and never set the patient's regimen.
export const MEDICATION_INSTRUCTIONS: MedicationInstruction[] = [
  {
    name: "Эналаприл Реневал",
    registration: "ЛП-№(000803)-(РГ-RU)",
    strength: "10 мг",
    form: "ТАБЛЕТКИ",
    publisher: "Обновление (Renewal)",
    sourceUrl:
      "https://www.renewal.ru/upload/iblock/ef9/xejhyl0esssi42vw0nfp2sjv7yo5xz5p/Enalapril-Reneval-_-instruktsiya-po-primeneniyu.pdf",
    checkedAt: "2026-11-01",
    purpose: "Помогает снижать повышенное давление.",
    indications:
      "Повышенное давление и сердечная недостаточность у взрослых. При нарушении работы левого желудочка — также для предупреждения осложнений.",
    contraindications:
      "Аллергия на компоненты; перенесённый отёк Квинке; беременность, кормление грудью; возраст до 18 лет; некоторые наследственные нарушения усвоения сахаров. Есть запрещённые сочетания с другими средствами от давления, включая сакубитрил: проверьте полный список в инструкции.",
    administration:
      "Принимают внутрь, с едой или без неё. Дозу и число приёмов врач подбирает индивидуально, особенно при заболеваниях почек.",
    sideEffects:
      "Возможны кашель, головокружение, тошнота, слабость, снижение давления. Врач может контролировать калий и работу почек. При отёке лица, языка или горла нужна срочная медицинская помощь.",
  },
  {
    name: "Амлодипин Реневал",
    registration: "ЛП-№(004551)-(РГ-RU)",
    strength: "5 мг",
    form: "ТАБЛЕТКИ",
    publisher: "Обновление (Renewal)",
    sourceUrl:
      "https://www.renewal.ru/upload/iblock/f44/9pe61qedj8r4b0yczez80cdmo4dupfh2/Amlodipin-Reneval-5-mg-instruktsiya-po-primeneniyu_60-I-_90.pdf",
    checkedAt: "2026-11-01",
    purpose:
      "Помогает контролировать давление и предупреждать приступы стенокардии.",
    indications:
      "Повышенное давление; у взрослых — стабильная стенокардия и стенокардия, связанная со спазмом сосудов сердца.",
    contraindications:
      "Аллергия на компоненты или похожие препараты; очень низкое давление (верхнее ниже 90); шок; препятствие выходу крови из левого желудочка; нестабильная сердечная недостаточность после инфаркта. До 6 лет не применяется, до 18 лет разрешён только при гипертензии.",
    administration:
      "Принимают внутрь, запивая половиной стакана воды, обычно один раз в день. Дозу определяет врач. Для экстренного снижения давления при кризе не подходит.",
    sideEffects:
      "Часто встречаются отёки лодыжек и стоп, приливы, сердцебиение, головная боль, головокружение, сонливость, тошнота и боль в животе. При отёке лица или горла нужна срочная медицинская помощь.",
  },
  {
    name: "Омепразол",
    registration: "ЛП-№(007752)-(РГ-RU)",
    strength: "20 мг",
    form: "КАПСУЛЫ КИШЕЧНОРАСТВОРИМЫЕ",
    publisher: "Канонфарма продакшн",
    sourceUrl:
      "https://www.canonpharma.ru/upload/iblock/83a/9fueoenb78lc7ttps8iqu1rsaog5matq.pdf",
    checkedAt: "2026-11-01",
    purpose: "Уменьшает количество кислоты в желудке.",
    indications:
      "Рефлюкс и изжога при ГЭРБ, язвы желудка и двенадцатиперстной кишки. Также применяется при повреждениях от противовоспалительных лекарств и вместе с другими средствами против Helicobacter pylori.",
    contraindications:
      "Аллергия на компоненты; некоторые нарушения усвоения лактозы, фруктозы и других сахаров. Нельзя сочетать с атазанавиром, зверобоем, эрлотинибом, позаконазолом; с кларитромицином — при почечной недостаточности. Детские ограничения зависят от возраста, веса и диагноза — см. полную инструкцию.",
    administration:
      "Капсулы обычно принимают утром, перед едой или вместе с ней, запивая водой. Не разжёвывать. Дозу и длительность курса определяет врач.",
    sideEffects:
      "Часто встречаются головная боль, тошнота, рвота, вздутие, боль в животе, запор или диарея. Редко возможны тяжёлые аллергические реакции, включая отёк и анафилаксию: нужна срочная медицинская помощь.",
  },
];

/** Never transfer a summary to another manufacturer, registration or dosage. */
export function findMedicationInstruction(product: CatalogProduct) {
  return MEDICATION_INSTRUCTIONS.find(
    (instruction) =>
      registrationKey(instruction.registration) ===
        registrationKey(product.registration) &&
      normalizeSearch(instruction.name) === normalizeSearch(product.name) &&
      normalizeSearch(instruction.strength) ===
        normalizeSearch(product.strength) &&
      normalizeSearch(instruction.form) === normalizeSearch(product.form),
  );
}
