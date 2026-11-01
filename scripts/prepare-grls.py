"""Import the four current GRLS XLSX exports without modifying source files."""
import argparse
from collections import Counter
from datetime import datetime
import hashlib
import json
from pathlib import Path
import re
import unicodedata
from openpyxl import load_workbook

STATUSES = (
    'Действующий', 'Выдано по правилам ЕАЭС',
    'Действует в иностранных упаковках',
    'Действует на подтверждении государственной регистрации',
)
SOURCE = 'https://grls.minzdrav.gov.ru/grls.aspx'

def clean(value):
    if value is None: return None
    value = str(value).replace('_x000D_', '\n').replace('\r', '\n')
    value = re.sub(r'[ \t]+', ' ', value)
    value = re.sub(r'\n\s*\n+', '\n', value).strip()
    return None if value in ('', '~', '-', '—') else value

def registration_key(value):
    value = clean(value)
    if not value or not re.search(r'\d', value): return None
    value = unicodedata.normalize('NFC', value).lower().replace('ё', 'е')
    value = re.sub(r'№|n(?=\s*\d)', '', value)
    return re.sub(r'[^а-яa-z0-9]', '', value) or None

def date_value(value):
    if isinstance(value, datetime): return value.date().isoformat()
    value = clean(value)
    if not value: return None
    for fmt in ('%d.%m.%Y', '%Y-%m-%d'):
        try: return datetime.strptime(value, fmt).date().isoformat()
        except ValueError: pass
    raise ValueError(f'Unrecognized registration date: {value}')

def flag(value):
    value = clean(value)
    if value and value.lower() == 'да': return True
    if value and value.lower() == 'нет': return False
    return None

def record_from_row(row, status):
    if len(row) < 17 or not clean(row[2]) or not clean(row[8]): return None
    key = registration_key(row[2])
    if not key: return None
    return key, dict(
        registration=clean(row[2]), name=clean(row[8]), status=status,
        registeredAt=date_value(row[3]), expiresAt=date_value(row[4]),
        holder=clean(row[6]), country=clean(row[7]),
        group=clean(row[13]), vital=flag(row[14]),
        narcotic=flag(row[15]), orphan=flag(row[16]),
        manufacturing=clean(row[11]), documents=clean(row[12]),
    )

def read_source(path, status):
    workbook = load_workbook(path, read_only=True, data_only=True)
    try:
        if len(workbook.worksheets) != 1: raise ValueError(f'Expected one worksheet: {path.name}')
        sheet = workbook.active
        head = list(sheet.iter_rows(min_row=3, max_row=5, values_only=True))
        if len(head) < 3 or len(head[0]) < 4:
            raise ValueError(f'Unsupported GRLS columns: {path.name}')
        title = str(head[0][3])
        match = re.search(r'\d{2}\.\d{2}\.\d{4}', title)
        if not match: raise ValueError(f'Missing snapshot date: {path.name}')
        header = [clean(v) for v in head[2]]
        if len(header) < 17 or header[2] != 'Номер регистрационного удостоверения' or not header[8] or not header[8].startswith('Торговое наименование') or not header[13] or not header[13].startswith('Фармако-терапевтическая группа'):
            raise ValueError(f'Unsupported GRLS columns: {path.name}')
        records = []
        for row in sheet.iter_rows(min_row=7, values_only=True):
            record = record_from_row(row, status)
            if record: records.append(record)
        if not records: raise ValueError(f'No records in {path.name}')
        return date_value(match[0]), records
    finally:
        workbook.close()

def prepare(input_dir, output_dir, mdlp_path):
    files = []
    for status in STATUSES:
        suffix = '-' + status.replace(' ', '_') + '.xlsx'
        candidates = [p for p in input_dir.glob('*.xlsx') if unicodedata.normalize('NFC', p.name).endswith(suffix)]
        if len(candidates) != 1: raise ValueError(f'Expected one file for {status}, found {len(candidates)}')
        files.append((status, candidates[0]))
    grouped = {}; source_files = []; dates = set(); total = 0
    for status, path in files:
        snapshot, records = read_source(path, status)
        dates.add(snapshot); total += len(records)
        source_files.append(dict(file=path.name, status=status, records=len(records), sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
        for key, record in records:
            signature = json.dumps(record, ensure_ascii=False, sort_keys=True)
            grouped.setdefault(key, {})[signature] = record
    if len(dates) != 1: raise ValueError('Source files have different snapshot dates')
    registrations = {key: [variants[k] for k in sorted(variants)] for key, variants in sorted(grouped.items())}
    rows = json.loads(mdlp_path.read_text(encoding='utf-8'))
    matched = sum(registration_key(row[10]) in registrations for row in rows)
    snapshot = next(iter(dates))
    data = dict(schemaVersion=1, snapshotDate=snapshot, source=SOURCE, registrations=registrations)
    metadata = dict(schemaVersion=1, snapshotDate=snapshot, source=SOURCE, sourceFiles=source_files,
        records=total, registrationKeys=len(registrations), variants=sum(len(v) for v in registrations.values()),
        conflictingKeys=sum(len(v)>1 for v in registrations.values()),
        matching=dict(mdlpPackages=len(rows), matchedPackages=matched, unmatchedPackages=len(rows)-matched,
            matchedRegistrationKeys=len({registration_key(row[10]) for row in rows if registration_key(row[10]) in registrations})))
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir/'grls.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    (output_dir/'grls-metadata.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(dict(records=total, registrationKeys=len(registrations), matchedPackages=matched,
        sizeMB=round((output_dir/'grls.json').stat().st_size/1024**2,1)), ensure_ascii=False))

def main():
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input_dir', type=Path)
    parser.add_argument('--output-dir', type=Path, default=root/'public/catalog')
    parser.add_argument('--mdlp', type=Path, default=root/'public/catalog/medications.json')
    args = parser.parse_args()
    prepare(args.input_dir, args.output_dir, args.mdlp)

if __name__ == '__main__': main()
