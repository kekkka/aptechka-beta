import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from openpyxl import Workbook

spec = importlib.util.spec_from_file_location('prepare_grls', Path(__file__).resolve().parents[1]/'scripts/prepare-grls.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

def make_book(path, rows, date='30.10.2026'):
    w=Workbook();s=w.active
    s.cell(3,4,'Государственный реестр лекарственных средств по состоянию на '+date)
    for col,name in [(3,'Номер регистрационного удостоверения'),(9,'Торговое наименование'),(14,'Фармако-терапевтическая группа')]:s.cell(5,col,name)
    s.cell(5,17,'Орфанный')
    for n,row in enumerate(rows,7):
        for col,value in enumerate(row,1):s.cell(n,col,value)
    w.save(path);w.close()

def row(ru='ЛП-00123',group='Группа'):
    r=[None]*17;r[2]=ru;r[3]='02.01.2020';r[4]='~';r[6]='Держатель';r[7]='Россия';r[8]='Название';r[11]='Строка_x000D_\nСледующая';r[13]=group;r[14]='Нет';return r

class ImportTests(unittest.TestCase):
    def test_clean_dates_flags_and_keys(self):
        self.assertIsNone(m.clean(' ~ '));self.assertIsNone(m.flag('~'))
        self.assertEqual(m.flag('Нет'),False);self.assertEqual(m.flag('Да'),True)
        self.assertEqual(m.clean(' A_x000D_\n\nB '),'A\nB')
        self.assertEqual(m.registration_key('П N015875/01'),m.registration_key('П №015875/01'))
        self.assertNotEqual(m.registration_key('ЛП-00123'),m.registration_key('ЛП-0123'))
        self.assertEqual(m.date_value('02.01.2020'),'2020-01-02')
    def test_current_files_only_deduplicate_identical_rows_keep_variants(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);source=root/'source';source.mkdir();out=root/'out'
            for i,status in enumerate(m.STATUSES):
                rows=[row(f'ЛП-00{i}')]
                if i==0:rows += [row('ЛП-000'),row('ЛП-000','Другая группа')]
                make_book(source/('grls2026-10-30-1-'+status.replace(' ','_')+'.xlsx'),rows)
            (source/'grls2026-10-30-1-Исключённый.xlsx').write_text('This file must not be opened')
            mdlp=root/'mdlp.json';mdlp.write_text(json.dumps([['0']*10+['ЛП-000'],['0']*10+['ЛП-999']]))
            m.prepare(source,out,mdlp)
            result=json.loads((out/'grls.json').read_text());meta=json.loads((out/'grls-metadata.json').read_text())
            self.assertEqual(len(result['registrations']['лп000']),2)
            self.assertEqual(meta['records'],6);self.assertEqual(meta['variants'],5)
            self.assertEqual(meta['matching']['matchedPackages'],1)
            before=(out/'grls.json').read_bytes();m.prepare(source,out,mdlp);self.assertEqual(before,(out/'grls.json').read_bytes())
    def test_bad_headers_and_mixed_dates_do_not_overwrite_snapshot(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);source=root/'source';source.mkdir();out=root/'out';out.mkdir()
            (out/'grls.json').write_text('keep')
            for i,status in enumerate(m.STATUSES):make_book(source/('grls-'+status.replace(' ','_')+'.xlsx'),[row()], '29.10.2026' if i==0 else '30.10.2026')
            mdlp=root/'mdlp.json';mdlp.write_text('[]')
            with self.assertRaisesRegex(ValueError,'different snapshot'):m.prepare(source,out,mdlp)
            self.assertEqual((out/'grls.json').read_text(),'keep')
            bad=root/'bad.xlsx';w=Workbook();w.active.cell(3,4,'30.10.2026');w.save(bad);w.close()
            with self.assertRaisesRegex(ValueError,'Unsupported GRLS columns'):m.read_source(bad,'Действующий')

if __name__=='__main__': unittest.main()
