import { familyPlaces } from "./brazil-family";
import { activityPlaces } from "./brazil-activities";
export type Category = "area" | "school" | "hospital" | "surf" | "kite" | "kids" | "gym" | "padel" | "medical";
export type Place = { id: string; name: string; category: Category; lat: number; lng: number; area: string; summary: string; note: string; source: string; sourceLabel: string; address?: string; phone?: string; additionalCategories?: Category[]; confirmationNote?: string; schoolKind?: "international" | "bilingual" | "local"; schoolAge8?: boolean; medicalKind?: "maternity" | "general" | "pediatric" | "upa" | "specialty"; locationNote?: string; };
export const checkedAt = "24 октября 2026";
export const categories: Record<Category, { label: string; color: string; symbol: string; icon?: string }> = {
  area: { label: "Районы", color: "#278065", symbol: "⌂" },
  school: { label: "Школы", color: "#825bc9", symbol: "S", icon: "/brazil/icons/school.svg" },
  hospital: { label: "Роддома", color: "#dc6064", symbol: "+", icon: "/brazil/icons/hospital.svg" },
  medical: { label: "Больницы и UPA", color: "#558296", symbol: "+", icon: "/brazil/icons/medical.svg" },
  surf: { label: "Серф", color: "#248eb0", symbol: "≈", icon: "/brazil/icons/surf.svg" },
  kite: { label: "Кайт", color: "#c48b24", symbol: "↗", icon: "/brazil/icons/kite.svg" },
  kids: { label: "Детские занятия", color: "#bc7972", symbol: "✦", icon: "/brazil/icons/kids.svg" },
  gym: { label: "Тренажёрные залы", color: "#667b94", symbol: "◆", icon: "/brazil/icons/gym.svg" },
  padel: { label: "Падел", color: "#9b7d4a", symbol: "●", icon: "/brazil/icons/padel.svg" },
};
export const sources = {
  visa: "https://www.gov.br/mre/pt-br/embaixada-moscou/servicos-consulares/vistos-visa/visa-free-travel",
  pf: "https://www.gov.br/pf/pt-br/assuntos/carta-de-servicos/migracao/obter-autorizacao-de-residencia",
  documents: "https://www.gov.br/pf/pt-br/assuntos/imigracao/pt/nacionalidade/objetivo/servico/documentos/documentos",
  family: "https://www.gov.br/pf/pt-br/assuntos/imigracao/duvidas-frequentes/autorizacao-de-residencia-e-registro-nacional-migratorio-rnm/o-que-e-chamante-e",
  forms: "https://www.gov.br/pf/pt-br/assuntos/imigracao/autorizacao-residencia/formularios",
  cpf: "https://www.gov.br/pt-br/servicos/inscrever-no-cpf",
  birth: "https://www.planalto.gov.br/ccivil_03/leis/l6015compilada.htm",
  citizenship: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm",
  insurance: "https://www.gov.br/ans/pt-br/assuntos/consumidor/carencia",
  coverage: "https://www.gov.br/ans/pt-br/assuntos/contratacao-e-troca-de-plano/dicas-de-como-escolher-um-plano-de-saude-1/segmentacao-assistencial",
  hu: "https://www.gov.br/ebserh/pt-br/hospitais-universitarios/regiao-sul/hu-ufsc/governanca/estrutura-administrativa/saude/maternidade",
  huTerritory: "https://www.gov.br/hubrasil/pt-br/hospitais-universitarios/regiao-sul/hu-ufsc/acesso-a-informacao/acoes-e-programas/CartadeServiosaoCidado20262.pdf",
  carmela: "https://saude.sc.gov.br/index.php/pt/ses-sc/unidades-de-saude/maternidade-carmela-dutra-mcd",
  carmelaFaq: "https://www.saude.sc.gov.br/index.php/pt/ses-sc/unidades-de-saude/maternidade-carmela-dutra-mcd/perguntas-frequentes-mcd",
  ilha: "https://www.ideas.med.br/ideas-assume-a-operacao-do-ilha-hospital-e-maternidade-de-florianopolis/",
  water: "https://balneabilidade.ima.sc.gov.br/",
  surf: "https://swshostel.com/aulas-de-surf-florianopolis/",
  kite: "https://www.aguavivakitesurf.com/perguntasfrequentes/",
};
const area = (id: string, name: string, lat: number, lng: number, summary: string, note: string): Place => ({ id, name, lat, lng, category: "area", area: name, summary, note, source: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`, sourceLabel: "Посмотреть местность · OSM" });
export const places: Place[] = [
  area("lagoa", "Lagoa da Conceição", -27.603, -48.468, "Лагуна, кайт и доступ к пляжам восточного побережья.", "Проверить на месте: пробки на выезде, шум возле баров и путь до школы. Описание — ориентир для просмотра жилья."),
  area("campeche", "Campeche", -27.681, -48.493, "Юго-восток острова, океан и серф рядом.", "Проверить улицу после дождя, интернет и дорогу до роддома в час пик."),
  area("rio-tavares", "Rio Tavares", -27.655, -48.483, "Между Campeche и Lagoa: вариант для сравнения семейной логистики.", "Проверить трафик на SC-405 и расстояние до конкретного кампуса школы."),
  area("barra", "Barra da Lagoa", -27.575, -48.426, "Пляж и школы серфинга; восточная часть острова.", "До клиник и международных школ нужно оценивать реальный маршрут, а не расстояние по прямой."),
  area("trindade", "Trindade", -27.588, -48.523, "Университетский район: рядом HU-UFSC и Escola Internacional.", "Сравнить шум, парковку и конкретную улицу. До океана потребуется поездка."),
  area("itacorubi", "Itacorubi", -27.582, -48.506, "Городская база между центром и востоком острова.", "Проверить дорогу до школы и пляжа в будний день."),
  area("centro", "Centro / Beira-Mar", -27.589, -48.548, "Городские услуги, Carmela Dutra и Maple Bear Ilha.", "Океанские серф-споты находятся в другой части острова."),
  area("jurere", "Jurerê", -27.440, -48.499, "Север острова: пляжная жизнь вдали от центра.", "Сравнить сезонную и годовую аренду; проверить время до роддома."),
  area("canasvieiras", "Canasvieiras", -27.431, -48.459, "Север острова, рядом Maple Bear Norte.", "Проверить летнюю загрузку дорог и условия аренды на весь год."),
  area("ingleses", "Ingleses", -27.438, -48.396, "Северо-восток острова с собственной городской инфраструктурой.", "Дорога до центральных роддомов — отдельный критерий выбора."),
  area("santo-antonio", "Santo Antônio de Lisboa", -27.506, -48.519, "Западный берег северной части острова.", "Это побережье залива; для океанского серфа придётся ездить."),
  { id: "carmela", name: "Maternidade Carmela Dutra", category: "hospital", lat: -27.5839, lng: -48.5497, area: "Centro", address: "Rua Irmã Benwarda, 208", phone: "+55 48 3664-3900", summary: "Государственный роддом · SUS.", note: "Наблюдение и направление — через Centro de Saúde.", source: sources.carmela, sourceLabel: "SES Santa Catarina" },
  { id: "hu", name: "Maternidade HU-UFSC", category: "hospital", lat: -27.5971, lng: -48.5194, area: "Trindade", address: "Rua Professora Maria Flora Pausewang · HU-UFSC", summary: "Университетский роддом · SUS.", note: "Территориальное распределение через Centro de Saúde. В справочнике 2026: Campeche, Lagoa, Rio Tavares и другие районы.", source: sources.hu, sourceLabel: "Официальная страница HU-UFSC" },
  { id: "ilha", name: "Ilha Hospital e Maternidade", category: "hospital", lat: -27.6119, lng: -48.5221, area: "Pantanal", address: "Rua Deputado Antônio Edu Vieira, 1414", summary: "Частная больница и роддом · сведения оператора за 2020 год.", note: "", source: sources.ilha, sourceLabel: "IDEAS · исторические сведения 2020" },
  { id: "eif", name: "Escola Internacional de Florianópolis", category: "school", lat: -27.5961, lng: -48.5180, area: "Trindade", address: "Rua Profa. Maria Flora Pausewang, 418", phone: "+55 48 3024-9838", summary: "Международная школа · португальский, английский и французский.", note: "Для 8 лет: Ensino Fundamental I.", source: "https://eif.com.br/", sourceLabel: "Официальный сайт EIF" },
  { id: "maple-ilha", name: "Maple Bear · Ilha", category: "school", lat: -27.5894, lng: -48.5438, area: "Centro", address: "Avenida Mauro Ramos, 1264", summary: "Билингвальная школа · канадская методика, португальский / английский.", note: "", source: "https://florianopolis-ilha.maplebear.com.br/pt/", sourceLabel: "Официальный сайт кампуса" },
  { id: "maple-norte", name: "Maple Bear · Norte", category: "school", lat: -27.4274, lng: -48.4444, area: "Canasvieiras", address: "Avenida Luiz Boiteux Piazza, 1302", summary: "Билингвальная школа на севере острова.", note: "", source: "https://florianopolis-norte.maplebear.com.br/pt/fale-conosco/", sourceLabel: "Официальные контакты кампуса" },
  { id: "surf-barra", name: "Barra da Lagoa · surf", category: "surf", lat: -27.5731, lng: -48.4238, area: "Восток", summary: "Обучение с инструктором · школы для разных уровней.", note: "Канал не подходит для катания.", source: "https://www.thesurffamily.com.br/surf-school", sourceLabel: "Surf Family · школа на пляже" },
  { id: "surf-joaquina", name: "Joaquina · surf", category: "surf", lat: -27.63, lng: -48.448, area: "Восток", summary: "Океанский серф-спот. Есть занятия со школой.", note: "", source: sources.surf, sourceLabel: "Sea Wolf · локации занятий" },
  { id: "surf-mole", name: "Praia Mole · surf", category: "surf", lat: -27.604, lng: -48.433, area: "Восток", summary: "Серф в открытом океане.", note: "", source: "https://swshostel.com/wp-content/uploads/2024/07/Guia-Lagoa-da-Conceicao-e-Regiao-1.pdf", sourceLabel: "Sea Wolf · местный гид" },
  { id: "surf-campeche", name: "Campeche / Riozinho · surf", category: "surf", lat: -27.689, lng: -48.478, area: "Юго-восток", summary: "Океанский серф рядом с Campeche.", note: "", source: sources.surf, sourceLabel: "Sea Wolf · локации занятий" },
  { id: "surf-matadeiro", name: "Matadeiro · surf", category: "surf", lat: -27.751, lng: -48.497, area: "Юг", summary: "Южный океанский спот.", note: "", source: sources.surf, sourceLabel: "Sea Wolf · локации занятий" },
  { id: "kite-lagoa", name: "Lagoa da Conceição · kite", category: "kite", lat: -27.607, lng: -48.451, area: "Лагуна", summary: "Обучение кайту с лодкой сопровождения.", note: "", source: "https://gokite.com.br/aulas-kitesurf-florianopolis/", sourceLabel: "GoKite · занятия на лагуне" },
  { id: "kite-daniela", name: "Daniela · kite", category: "kite", lat: -27.448, lng: -48.534, area: "Северо-запад", summary: "Кайт-занятия со школой Água Viva.", note: "", source: sources.kite, sourceLabel: "Água Viva · FAQ и локации" },
  ...activityPlaces,
  ...familyPlaces,
];
// Explicit education metadata keeps nearby-language-school calculations independent of leisure venues.
for (const place of places) {
  if (["eif", "maple-ilha", "maple-norte"].includes(place.id)) { place.schoolKind = place.id === "eif" ? "international" : "bilingual"; place.schoolAge8 = true; }
  if (place.id === "hu") { place.additionalCategories = [...(place.additionalCategories || []), "medical"]; place.medicalKind = "maternity"; }
  if (place.id === "ilha") place.confirmationNote = "Родильное отделение требует актуального подтверждения";
  if (place.id === "kids-logosofico") { place.additionalCategories = ["school"]; place.schoolKind = "local"; place.schoolAge8 = true; place.summary += " При школе есть начальная ступень."; }
  if (place.id === "padel-elase") { place.additionalCategories = [...(place.additionalCategories || []), "kids"]; place.summary += " Также робототехника, музыка, балет и Sports Kids."; place.note += " Детские курсы — для членов клуба; робототехника с 6 лет."; }
  if (place.id === "gym-sotalia") { place.additionalCategories = ["kids"]; place.summary += " Среди направлений есть детское плавание."; }
}
export const schools = places.filter(p => p.category === "school" || p.additionalCategories?.includes("school"));
export const languageSchools = schools.filter(p => ["international", "bilingual"].includes(p.schoolKind || "") && p.schoolAge8 === true);
export const hospitals = places.filter(p => p.category === "hospital");
export const medicalPlaces = places.filter(p => p.category === "medical" || p.additionalCategories?.includes("medical"));
export const mapLink = (place: Place): string => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + " " + (place.address || "") + " Florianópolis Brazil")}`;
export const checklist = [
  { id: "documents", stage: "Сейчас · за 4 месяца", text: "Паспорта всей семьи, свидетельства о рождении и браке: проверить сроки и единое написание имён." },
  { id: "police", stage: "Сейчас · за 4 месяца", text: "Уточнить в PF пакет для родителей и старшего ребёнка; определить, какие справки нужны из стран проживания за последние 5 лет и когда их заказывать." },
  { id: "obstetrician", stage: "Сейчас · за 4 месяца", text: "Выбрать акушера, передать срок беременности и запросить план наблюдения и полную смету родов." },
  { id: "schools", stage: "Сейчас · за 4 месяца", text: "Написать в EIF и Maple Bear: ребёнку 8 лет, поступление в 2027, поддержка без португальского, стоимость и свободные места." },
  { id: "legal-window", stage: "За 3 месяца", text: "Сопоставить дату въезда, ПДР и лимит 90/180; согласовать законный статус до рождения и запасной маршрут при задержке." },
  { id: "apostille", stage: "За 3 месяца", text: "Подготовить апостили / легализацию и присяжные переводы по подтверждённому списку; взять оригиналы." },
  { id: "housing", stage: "За 2 месяца", text: "Сравнить Trindade, Lagoa, Rio Tavares и Campeche по маршрутам школа → роддом; забронировать первое жильё." },
  { id: "medical", stage: "За 2 месяца", text: "Собрать обменную карту, анализы, УЗИ и прививки; уточнить перевод, правила перелёта и страховку." },
  { id: "budget", stage: "За 2 месяца", text: "Составить бюджет в BRL: аренда + condomínio + IPTU, школа, роды, переводы, транспорт и резерв." },
  { id: "confirm", stage: "За месяц", text: "Получить письменное подтверждение врача и роддома, состава пакета и помощи новорождённому; подтвердить школьный визит." },
  { id: "arrival", stage: "После прилёта", text: "Сохранить запись о въезде, оформить CPF, местный номер и подтверждение адреса; зарегистрироваться в Centro de Saúde." },
  { id: "visits", stage: "После прилёта", text: "Посетить школы и роддом, проверить маршруты в час пик, согласовать план экстренного обращения." },
  { id: "newborn", stage: "После рождения", text: "Получить DNV, оформить certidão de nascimento в cartório и проверить CPF малыша." },
  { id: "residence", stage: "После рождения", text: "Подать отдельные заявления родителей и согласованный пакет старшего ребёнка в PF, сохранить протоколы и контролировать CRNM." },
];

export const placeCategories = (place: Place): Category[] => [place.category, ...(place.additionalCategories || [])];
