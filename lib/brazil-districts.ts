import evidence from "@/lib/brazil-rental-evidence.json";
import { languageSchools, type Place } from "@/lib/brazil-data";
export type MetricKey = "traffic" | "cafes" | "children" | "sports" | "business" | "safety" | "community" | "walking";
export type Metric = {key: MetricKey; label: string; score: number | null; note: string};
export type RentalSample = {price: number; area: number; address: string; bedrooms: number; source?: string};
export type RentalEvidence = {url: string; samples: RentalSample[]};
export const districtCheckedAt = "24 октября 2026";
export const metricLabels: Record<MetricKey, string> = {traffic:"Пробки",cafes:"Кафе и рестораны",children:"Детская инфраструктура",sports:"Спорт",business:"Бизнес-тусовка",safety:"Безопасность",community:"Комьюнити",walking:"Пешие прогулки"};
const acate = "https://www.acate.com.br/institucional/";
export const safetySource = "https://ssp.sc.gov.br/wp-content/uploads/2026/05/03-marco-2026.pdf";
const profile = (scores: number[], notes: string[], extraSources: {label: string; url: string}[] = []) => ({
 metrics: (Object.keys(metricLabels) as MetricKey[]).map(key => {
  if(key === "safety") return {key,label:metricLabels[key],score:null,note:"Сопоставимая статистика по этим районам не подтверждена."};
  const index = (["traffic","cafes","children","sports","business","community","walking"] as string[]).indexOf(key);
  return {key,label:metricLabels[key],score:scores[index],note:notes[index]};
 }), extraSources,
});
// Editorial hypotheses for comparing locations, not measured indices or resident survey results.
const profiles: Record<string, ReturnType<typeof profile>> = {
 lagoa:profile([2,5,3,5,3,5,3],["Выезды из лагуны могут ограничивать ежедневные маршруты.","Центр Lagoa и набережная с заведениями.","Выбор школы и жилья лучше согласовать заранее.","Лагуна, кайт и доступ к океанским спотам.","Ожидаем среду удалёнщиков; мероприятия проверять отдельно.","Водные виды спорта создают поводы знакомиться.","У лагуны приятно гулять; тротуары зависят от улицы."]),
 campeche:profile([2,4,4,5,2,4,3],["Путь к центру зависит от загруженности южных выездов.","Заведения распределены между жилыми зонами и пляжем.","Семейный быт удобнее планировать вокруг конкретной школы.","Океанский серф и активность на пляже.","Для регулярных деловых событий вероятны поездки.","Спортивные занятия помогают найти местный круг.","Пляж протяжённый; бытовые маршруты часто требуют машины."]),
 "rio-tavares":profile([2,4,4,5,3,4,2],["SC-405 и соединения с Campeche — точки проверки.","Локальные кафе удобнее искать рядом с домом.","Жильё, кружки и школу стоит собрать в одном маршруте.","Близость к океанским спотам и лагуне.","Среда удалённой работы возможна; календарь встреч уточнять.","Связи удобно искать через спортивные занятия.","Район растянут; непрерывные тротуары нужно проверять."]),
 barra:profile([2,3,3,5,1,4,3],["Выезды через восток острова могут усложнять поездки.","Пляжные заведения и небольшие местные кафе.","Международные школы из списка расположены в других районах.","Серф-школы прямо у пляжа.","Меньше оснований выбирать район ради бизнес-событий.","Местная жизнь и школы серфинга дают точки знакомства.","Пешие прогулки у пляжа; маршрут до услуг проверять."]),
 trindade:profile([3,4,4,3,3,4,4],["Городские маршруты короче, но есть университетский трафик.","Заведения ориентированы также на университетскую среду.","Рядом EIF и университетский роддом HU.","Городские занятия; к океану нужна поездка.","Университетская среда полезна для профессиональных связей.","Университет даёт разнообразные поводы знакомиться.","Плотная городская сеть удобнее для повседневных дел."]),
 itacorubi:profile([3,3,4,3,4,3,3],["Проверить Admar Gonzaga и выезды в час пик.","Повседневные заведения распределены по основным улицам.","Городские услуги и сравнительная близость к EIF.","Городской спорт и Jardim Botânico; до моря ехать.","Городская база для поездок к инновационным центрам.","Знакомства чаще через работу, школу и локальные занятия.","Есть Jardim Botânico; остальные маршруты зависят от улицы."],[{label:"Jardim Botânico · Prefeitura",url:"https://redeplanejamento.pmf.sc.gov.br/pt-BR/projetos/jardim-botanico"},{label:"Центры ACATE",url:acate}]),
 centro:profile([2,5,4,4,5,3,5],["Центральный трафик и въезды на мосты требуют проверки.","Большой городской выбор кафе и ресторанов.","Maple Bear Ilha и городские услуги рядом.","Набережная и городская спортивная инфраструктура.","В Centro находится CIA Downtown сети ACATE.","Городское окружение; свой круг искать по интересам.","Услуги и набережная дают много пеших маршрутов."],[{label:"CIA Downtown · ACATE",url:acate}]),
 jurere:profile([3,4,4,4,2,3,4],["Сезонная загрузка дорог может менять картину.","Пляжные заведения; годовую доступность проверять.","Семейный комфорт зависит от конкретной части Jurerê.","Пляжные занятия и прогулки у воды.","Бизнес-мероприятия лучше искать по актуальному календарю.","Местный круг и сезонные гости могут различаться.","В жилых частях и у моря есть маршруты для прогулок."]),
 canasvieiras:profile([2,4,4,4,4,3,4],["Сезонность и SC-401 важны для поездок на юг.","Центр района с туристическими и повседневными заведениями.","В нашем списке есть северный кампус Maple Bear.","Пляж и водные виды спорта.","Север острова близок к центрам ACATE в Sapiens Parque.","Сезонные гости дополняют постоянных жителей.","В центре услуги компактнее; тихую улицу выбирать отдельно."],[{label:"Sapiens Parque · ACATE",url:acate}]),
 ingleses:profile([1,4,4,4,2,4,3],["Дальний маршрут к центру и сезонная нагрузка.","Собственный центр торговли и заведений.","Много повседневных услуг; международную школу выбирать отдельно.","Океанский пляж и локальные спортивные занятия.","До многих центральных деловых площадок потребуется ехать.","Собственная районная жизнь удобна для локальных знакомств.","Центральные улицы и пляж; тротуары проверять на месте."]),
 "santo-antonio":profile([3,4,3,3,3,4,3],["Район связан с SC-401; маршрут проверять в час пик.","Гастрономические заведения в исторической части.","Для школы из shortlist нужен отдельный маршрут.","Прогулки у залива; океанский серф в другой части острова.","SC-401 связывает район с северными деловыми площадками.","Историческая местная среда и культурная жизнь.","Исторический центр удобен для прогулки, весь район — неравномерно."]),
};
export function getDistrictProfile(id: string) {
 const rents = (evidence.districts as Record<string,{house:RentalEvidence;apartment:RentalEvidence}>)[id];
 return profiles[id] && rents ? {...profiles[id],rents} : null;
}
export function rentalSummary(rent: RentalEvidence) {
 const prices=rent.samples.map(s=>s.price);
 if (!prices.length) return null;
 const mean=prices.reduce((sum,p)=>sum+p,0)/prices.length;
 return {count:prices.length,mean:Math.round(mean/100)*100,min:Math.min(...prices),max:Math.max(...prices)};
}
export function distanceKm(from: Pick<Place,"lat"|"lng">,to: Pick<Place,"lat"|"lng">): number {
 const rad=(v:number)=>v*Math.PI/180;
 const a=Math.sin(rad(to.lat-from.lat)/2)**2+Math.cos(rad(from.lat))*Math.cos(rad(to.lat))*Math.sin(rad(to.lng-from.lng)/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
}
export function nearestShortlistSchool(place: Place): {school: Place;km: number} | null {
 const sorted=languageSchools.map(school=>({school,km:distanceKm(place,school)})).sort((a,b)=>a.km-b.km);
 return sorted[0] || null;
}
