(function(){
  'use strict';
  const base=new URL('.',document.currentScript.src);
  let loader;
  function loadOCR(){return loader||=(new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('vendor/tesseract/tesseract.min.js',base);s.onload=resolve;s.onerror=()=>{loader=null;reject(new Error('Не удалось загрузить модуль распознавания. Проверьте соединение и повторите.'))};document.head.append(s)}))}
  function check(signal){if(signal.aborted)throw new DOMException('Остановлено','AbortError')}
  async function read(files,{signal,onProgress}){
    let worker,pdf,initializing,currentLabel='';const pages=[];let pageCount=0;
    const cancel=()=>{worker?.terminate();pdf?.destroy()};signal.addEventListener('abort',cancel,{once:true});
    async function recognize(canvas,label){
      check(signal);currentLabel=label;
      if(!worker){onProgress({label:'Подготавливаем распознавание',detail:'Русский и английский текст · первый запуск может занять больше времени',progress:0});await loadOCR();check(signal);
        initializing=Tesseract.createWorker(['rus','eng'],1,{workerPath:new URL('vendor/tesseract/worker.min.js',base).href,corePath:new URL('vendor/tesseract/core/',base).href,langPath:new URL('vendor/tesseract/lang',base).href,workerBlobURL:false,logger:m=>{if(!signal.aborted)onProgress({label:m.status==='recognizing text'?'Распознаём текст':'Подготавливаем распознавание',detail:currentLabel,progress:m.status==='recognizing text'?m.progress:0})}});
        worker=await initializing;check(signal);await worker.setParameters({tessedit_pageseg_mode:'3',preserve_interword_spaces:'1'});
      }
      onProgress({label:'Распознаём текст',detail:label,progress:0});
      const {data}=await worker.recognize(canvas);check(signal);return {text:data.text,confidence:data.confidence,method:'OCR'};
    }
    try{
      for(const file of files){
        check(signal);onProgress({label:'Открываем документ',detail:file.name,progress:0});
        if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){
          const lib=await import(new URL('vendor/pdfjs/build/pdf.mjs',base));lib.GlobalWorkerOptions.workerSrc=new URL('vendor/pdfjs/build/pdf.worker.mjs',base).href;
          const task=lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,cMapUrl:new URL('vendor/pdfjs/cmaps/',base).href,cMapPacked:true,standardFontDataUrl:new URL('vendor/pdfjs/standard_fonts/',base).href});
          task.onPassword=()=>{task.destroy()};pdf=await task.promise;check(signal);
          if(pageCount+pdf.numPages>10)throw new Error('В одном назначении можно обработать до 10 страниц. Разделите документ.');
          for(let p=1;p<=pdf.numPages;p++){
            check(signal);const page=await pdf.getPage(p),content=await page.getTextContent();let text='',y=null;
            for(const item of content.items){if(!('str' in item))continue;const nextY=item.transform[5];if(y!==null&&Math.abs(y-nextY)>3)text+='\n';else if(text&&!text.endsWith('\n'))text+=' ';text+=item.str;if(item.hasEOL)text+='\n';y=nextY}
            const viewport0=page.getViewport({scale:1}),scale=Math.min(2.5,2200/Math.max(viewport0.width,viewport0.height));const viewport=page.getViewport({scale});const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
            await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;check(signal);
            const result=text.replace(/\s/g,'').length>=25?{text,confidence:null,method:'Текст PDF'}:await recognize(canvas,`${file.name} · страница ${p} из ${pdf.numPages}`);
            pages.push({...result,fileName:file.name,page:p,preview:thumbnail(canvas)});pageCount++;canvas.width=canvas.height=1;page.cleanup();
          }
          await pdf.destroy();pdf=null;
        }else{
          if(++pageCount>10)throw new Error('Можно обработать до 10 страниц за один раз.');
          let bitmap;try{bitmap=await createImageBitmap(file)}catch{throw new Error('Не удалось прочитать изображение. Сохраните фото в JPG, PNG или WebP.')}
          const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
          const result=await recognize(canvas,`${file.name} · страница ${pageCount}`);pages.push({...result,fileName:file.name,page:1,preview:thumbnail(canvas)});canvas.width=canvas.height=1;
        }
      }
      check(signal);return {pages,text:pages.map(p=>p.text.trim()).join('\n\n')};
    }catch(e){if(signal.aborted)throw new DOMException('Остановлено','AbortError');if(/password|passwordexception/i.test(e.name+' '+e.message))throw new Error('PDF защищён паролем. Загрузите копию без пароля или фотографию страниц.');throw e}
    finally{signal.removeEventListener('abort',cancel);await worker?.terminate();await pdf?.destroy()}
  }
  function thumbnail(canvas){const small=document.createElement('canvas'),scale=Math.min(1,1000/canvas.width);small.width=Math.round(canvas.width*scale);small.height=Math.round(canvas.height*scale);small.getContext('2d').drawImage(canvas,0,0,small.width,small.height);return small.toDataURL('image/jpeg',.82)}
  window.PrescriptionReader={read};
})();
