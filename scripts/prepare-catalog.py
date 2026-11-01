"""Download the public MDLP snapshot. Run explicitly; never part of build."""
import argparse, csv, datetime, io, json, pathlib, re, urllib.request
p = argparse.ArgumentParser()
p.add_argument('--url', default='https://xn--80aaani3am7aog.xn--80ajghhoc2aj1c8b.xn--p1ai/bi/api/opendata/7731376812-MDLPGtins/data/latest')
p.add_argument('--input', help='Rebuild from a previously downloaded CSV')
p.add_argument('--date', default=datetime.date.today().isoformat())
a = p.parse_args()
source = 'https://датамаркет.честныйзнак.рф/bi/opendata/7731376812-MDLPGtins'
stream = open(a.input, 'rb') if a.input else urllib.request.urlopen(a.url, timeout=180)
rows = {}
reader = csv.DictReader(io.TextIOWrapper(stream, encoding='utf-8-sig'))
required = {'gtin', 'prod_sell_name', 'prod_form_name', 'reg_status'}
if not required.issubset(reader.fieldnames or []): raise ValueError('Unsupported catalog schema')
for r in reader:
    gtin = r.get('gtin', '').strip()
    name = r.get('prod_sell_name', '').strip()
    if not re.fullmatch(r'\d{14}', gtin) or not name or r.get('reg_status') != 'Действующий': continue
    form = r.get('prod_form_norm_name') or r.get('prod_form_name', '')
    # Only unambiguous counts; mass/volume products require manual unit entry.
    desc = r.get('prod_pack_1_desc', '')
    count = None
    if re.search(r'таблет|капсул', form, re.I):
        match = re.search(r'по\s+(\d+(?:[.,]\d+)?)\s*шт', desc, re.I)
        containers = r.get('prod_pack_1_2', '')
        if match and re.fullmatch(r'\d+(?:\.0+)?', containers):
            n = float(match[1].replace(',', '.')) * float(containers)
            if n.is_integer() and 0 < n <= 100000: count = int(n)
    unit = 'табл.' if 'таблет' in form.lower() else 'капс.' if 'капсул' in form.lower() else 'шт.'
    rows[gtin] = [gtin, name, r.get('prod_norm_name') or r.get('prod_name', ''),
        r.get('prod_d_norm_name') or r.get('prod_d_name', ''), form,
        r.get('glf_name', ''), desc, count, unit, r.get('prod_desc', ''), r.get('reg_id', '')]
if not rows: raise ValueError('No active products found; keeping existing snapshot')
out = pathlib.Path(__file__).resolve().parents[1] / 'public/catalog'
out.mkdir(parents=True, exist_ok=True)
(out / 'medications.json').write_text(json.dumps(list(rows.values()), ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
(out / 'metadata.json').write_text(json.dumps({'source': source, 'downloadUrl': a.url, 'snapshotDate': a.date,
    'count': len(rows), 'schemaVersion': 1, 'columns': ['gtin','name','inn','strength','form','manufacturer','package','packSize','unit','description','registration']}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Prepared {len(rows)} active products; {(out / "medications.json").stat().st_size / 1024**2:.1f} MB')
