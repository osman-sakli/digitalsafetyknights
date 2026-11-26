#!/usr/bin/env python3
"""Builds traffic_countries.bin, the table the daily traffic report finds each visitor's country in.

Why a table inside the report: the site promises no tracking, so a visitor's
address is never sent to a geolocation service. Until 2026-11-23 the report
used the CloudFront edge that served each visitor as a stand-in for their
country. Since then the site is served through Preclearance's firewall, whose
edge stands in Frankfurt, and that stand-in says "Germany" for everybody. So
the report looks the address up itself, in a copy of DB-IP's free "IP to
Country Lite" table (https://db-ip.com/db/download/ip-to-country-lite,
CC BY 4.0: anything that shows its results carries the credit
"IP Geolocation by DB-IP" with a link to https://db-ip.com).

DB-IP publishes a new table each month. To take a newer one:

    curl -fsSO https://download.db-ip.com/free/dbip-country-lite-YYYY-MM.csv.gz
    python3 backend/build_country_table.py dbip-country-lite-YYYY-MM.csv.gz
    cd backend && zip traffic-report.zip lambda_traffic_report.py traffic_countries.bin
    aws lambda update-function-code --function-name dsk-traffic-report --zip-file fileb://traffic-report.zip

The build checks the finished file against every row it was made from, and
stops if a country code has no name in country_names.json.

The file: b"DSKGEO1\\n", a 4-byte length, a JSON header (the table's month,
names by country code, row counts), then for IPv4 and for IPv6 the first
address of every stretch (4 or 16 bytes each, in order) followed by each
stretch's two-letter code. A stretch runs up to the next one's first address.
"ZZ" is DB-IP's own code for "not known".
"""
import csv
import gzip
import ipaddress
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "traffic_countries.bin")
NAMES = os.path.join(HERE, "country_names.json")
MAGIC = b"DSKGEO1\n"
UNKNOWN = "ZZ"
WIDTH = {4: 4, 6: 16}


def read_rows(path):
    """{4: [(first, last, code)], 6: [...]} with the addresses as numbers."""
    rows = {4: [], 6: []}
    with gzip.open(path, "rt", encoding="utf-8", newline="") as f:
        for n, line in enumerate(csv.reader(f), 1):
            if len(line) != 3:
                sys.exit(f"line {n}: expected first address, last address, country code; got {line!r}")
            first, last, code = line
            a, b = ipaddress.ip_address(first), ipaddress.ip_address(last)
            if a.version != b.version or int(b) < int(a) or not re.fullmatch(r"[A-Z]{2}", code):
                sys.exit(f"line {n}: not a stretch of addresses with a country code: {line!r}")
            rows[a.version].append((int(a), int(b), code))
    return rows


def stretches(rows, version):
    """[(first address, code)] covering every address once, neighbours with the same code joined."""
    top = (1 << (WIDTH[version] * 8)) - 1
    out = []

    def add(first, code):
        if not out or out[-1][1] != code:
            out.append((first, code))

    cursor = 0
    for first, last, code in sorted(rows):
        if first < cursor:
            sys.exit(f"IPv{version}: two stretches overlap at {ipaddress.ip_address(first)}")
        if first > cursor:
            add(cursor, UNKNOWN)
        add(first, code)
        cursor = last + 1
    if cursor <= top:
        add(cursor, UNKNOWN)
    return out


def build(source):
    month = re.search(r"(\d{4}-\d{2})", os.path.basename(source))
    if not month:
        sys.exit("the file's name should carry its month, as DB-IP names it: dbip-country-lite-YYYY-MM.csv.gz")
    with open(NAMES, encoding="utf-8") as f:
        names = json.load(f)
    rows = read_rows(source)
    table = {v: stretches(rows[v], v) for v in (4, 6)}
    codes = {code for v in table for _, code in table[v]} - {UNKNOWN}
    nameless = sorted(codes - set(names))
    if nameless:
        sys.exit(f"no name in country_names.json for: {', '.join(nameless)}")
    head = json.dumps({
        "release": month.group(1),
        "source": "DB-IP IP to Country Lite, CC BY 4.0, https://db-ip.com",
        "rows": {str(v): len(table[v]) for v in (4, 6)},
        "names": {c: names[c] for c in sorted(codes)},
    }, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    blob = bytearray(MAGIC + len(head).to_bytes(4, "big") + head)
    for v in (4, 6):
        blob += b"".join(first.to_bytes(WIDTH[v], "big") for first, _ in table[v])
        blob += b"".join(code.encode("ascii") for _, code in table[v])
    with open(OUT, "wb") as f:
        f.write(blob)
    return rows, table


def check(rows):
    """Every row the table was made from must come back out of the report's own lookup."""
    sys.path.insert(0, HERE)
    import lambda_traffic_report as report
    with open(NAMES, encoding="utf-8") as f:
        names = json.load(f)
    report._countries = None
    asked = wrong = 0
    for version in (4, 6):
        for first, last, code in rows[version]:
            want = None if code == UNKNOWN else names[code]
            for number in {first, last, (first + last) // 2}:
                asked += 1
                got = report.country_of(str(ipaddress.ip_address(number) if version == 4 else ipaddress.IPv6Address(number)))
                if got != want:
                    wrong += 1
                    if wrong <= 5:
                        print(f"  wrong: {ipaddress.ip_address(number) if version == 4 else ipaddress.IPv6Address(number)} gave {got!r}, the table says {want!r}")
    return asked, wrong


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    rows, table = build(sys.argv[1])
    print(f"{OUT}: {os.path.getsize(OUT):,} bytes; "
          f"IPv4 {len(rows[4]):,} rows -> {len(table[4]):,} stretches, IPv6 {len(rows[6]):,} rows -> {len(table[6]):,} stretches")
    asked, wrong = check(rows)
    print(f"checked {asked:,} addresses against the source: {wrong} wrong")
    if wrong:
        os.remove(OUT)
        sys.exit("the table does not agree with its source; not kept")
