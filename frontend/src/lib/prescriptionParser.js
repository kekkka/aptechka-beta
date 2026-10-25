// Rule-based extraction of simple Russian prescription lines. Never guesses missing fields.
const number=s=>s?.includes('/')?s.split('/').map(Number).reduce((a,b)=>a/b):Number(String(s).replace(',','.'));
const strengthRe=/(\d+(?:[.,]\d+)?)\s*(мкг|мг|mg|mcg|мл|ml|г|g|ме|ед|%)(?![а-яa-z])/i;
const formRe=/(?:таблет[а-я]*|табл\.?|капсул[а-я]*|капс\.?)/i;
const complexRe=/(?:затем|далее|через\s+день|по\s+(?:необходимости|требованию)|при\s+(?:бол|повыш|ухудш)|при\s+необходимости|постепенно|сниж[а-я]*|увелич[а-я]*|черед[а-я]*|перерыв|первые\s+\d+|\d+\s*[-–]\s*\d+\s*(?:табл|капс|мг))/i;
export function parse(text){
  const lines=String(text||'').replace(/\r/g,'').replace(/\u00a0/g,' ').split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const blocks=[];let current=null;
  for(const raw of lines){
    const line=raw.replace(/^\s*(?:\d+[.)]|[•*—])\s*/,'');
    const at=line.search(strengthRe),prefix=at>=0?line.slice(0,at):line;
    const possibleUnit=/\d+(?:[.,]\d+)?\s*[a-zа-я%]{1,4}(?=[,;\s]|$)/i.test(line);
    const candidate=(at>0||(possibleUnit&&formRe.test(line))) && /[а-яa-z]/i.test(prefix) && !/^(?:по\s|доза|принимать|прием|приём|длитель|курс|через|в\s|утром|вечером|давление|пульс|температура|вес|рост|анализ|глюкоза|гемоглобин)/i.test(prefix);
    if(candidate){current={text:line,line:blocks.length+1};blocks.push(current)}
    else if(current && !/^(?:врач|подпись|пациент|фио|дата|телефон|диагноз)/i.test(line))current.text+='\n'+line;
  }
  const meds=blocks.map((block,index)=>{
    const text=block.text,firstLine=text.split('\n')[0],match=firstLine.match(strengthRe),possible=firstLine.match(/\d+(?:[.,]\d+)?\s*[a-zа-я%]{1,4}(?=[,;\s]|$)/i),prefix=firstLine.slice(0,match?.index??possible?.index??firstLine.length);
    const name=prefix.replace(/^(?:таблет[а-я]*|табл\.?|капсул[а-я]*|капс\.?)\s*/i,'').replace(/[,:;—–\s]+$/,'').trim();
    const unit=match?(({mg:'мг',mcg:'мкг',ml:'мл',g:'г'})[match[2].toLowerCase()]||match[2].toLowerCase()):'';
    const form=/капсул|капс\./i.test(text)?'Капсулы':/таблет|табл\./i.test(text)?'Таблетки':'';
    const doses=[...text.matchAll(/(?:по\s+)(\d+(?:[.,]\d+|\s*\/\s*\d+)?)\s*(?:таблет[а-я]*|табл\.?|капсул[а-я]*|капс\.?)/gi)].map(m=>number(m[1].replace(/\s/g,'')));
    const durations=[...text.matchAll(/(\d+)\s*(дней|дня|день|суток|сутки|недели|недель|неделю)(?![а-я])/gi)].map(m=>Number(m[1])*(m[2].startsWith('недел')?7:1));
    const times=[...new Set([...text.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)].map(m=>m[1].padStart(2,'0')+':'+m[2]))].sort();
    const frequency=text.match(/(\d+)\s*(?:раз[а]?|р\.?)(?:\s*\/\s*|\s+в\s+)(?:день|сутки|д\b|сут)/i);
    const interval=text.match(/(?:каждые?|через)\s+(\d+)\s*час/i);
    const expected=frequency?Number(frequency[1]):interval&&24%Number(interval[1])===0?24/Number(interval[1]):null;
    const meals=[...text.matchAll(/(?:до|после|во\s+время|независимо\s+от)\s+(?:еды|при[её]ма\s+пищи)/gi)].map(m=>m[0]);
    const complex=complexRe.test(text)||new Set(doses).size>1||new Set(durations).size>1||(/\d+(?:[.,]\d+)?\s*(?:мг|г|мкг)\s*\/|\d+\s*\/\s*\d+\s*(?:мг|мкг|мл)/i.test(text))||(interval&&24%Number(interval[1])!==0);
    const warnings=[];
    if(!match)warnings.push('Дозировка не распознана: проверьте обозначение единицы в оригинале');
    if(!form)warnings.push('Форма не определена');
    if(!doses.length)warnings.push('Количество за приём не определено');
    if(!durations.length)warnings.push('Длительность не определена');
    if(!times.length)warnings.push(expected?`Указано ${expected} приёма в день — уточните время`:'Время приёма не найдено');
    if(times.length&&expected&&expected!==times.length)warnings.push('Частота и количество времён не совпадают');
    if(complex)warnings.push('Есть сложная или неоднозначная схема: автоматический запуск недоступен');
    return {name,strength:match?match[1].replace(',','.')+' '+unit:'',form,dose:new Set(doses).size===1?doses[0]:'',days:new Set(durations).size===1?durations[0]:'',times:times.join(', '),frequency:expected,note:[...new Set(meals)].join('; '),sourceText:text,complex,warnings,index};
  });
  return {meds,text:lines.join('\n'),warnings:meds.length?[]:['Строки с препаратами не найдены. Проверьте распознанный текст или внесите назначение вручную.']};
}
