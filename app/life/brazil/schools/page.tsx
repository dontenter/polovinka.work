import {GuideChatNotes} from "@/components/brazil/guide-chat-notes";
import { Source } from "@/components/brazil/source";
import { SchoolDirectory } from "@/components/brazil/school-directory";
export default function Page() { return <>
  <section className="brazil-section"><div className="section-heading"><div><h2>Школа для ребёнка 8 лет</h2></div></div><p className="section-lead">Приоритет — иностранные языки и поддержка адаптации. На карте и в каталоге есть международные, билингвальные и другие местные школы с начальной ступенью. Название International и английский в расписании сами по себе не означают IB или все предметы на английском. Конкретные классы и программу проверять у кампуса.</p><SchoolDirectory/><details className="brazil-details"><summary>Что спросить у школы перед оплатой</summary><ul><li>Есть ли место на 2027 год и в какой класс зачислят по дате рождения и предыдущему обучению?</li><li>Сколько предметов на английском? Как поддерживают ребёнка без португальского?</li><li>Полный бюджет: matrícula, mensalidade, питание, форма, материалы, продлёнка и автобус.</li><li>Какие табели, переводы и документы нужны? Возможны ли пробный день и встреча с учителем?</li><li>Какие международные аккредитации есть именно у кампуса? Как признаётся обучение при следующем переезде?</li></ul></details></section>

<GuideChatNotes section="schools"/></>; }
