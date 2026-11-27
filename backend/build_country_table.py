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

The report also renews the table by itself once a month (renew_countries in
lambda_traffic_report.py) and keeps that copy in the site's bucket; this
script is for the copy that ships in the zip. The file's layout is described
at parse_countries there.
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
sys.path.insert(0, HERE)
import lambda_traffic_report as report  # noqa: E402  (the builder and the lookup live in the report itself)


def build(source):
    """Writes the table and returns the rows it was made from."""
    month = re.search(r"(\d{4}-\d{2})", os.path.basename(source))
    if not month:
        sys.exit("the file's name should carry its month, as DB-IP names it: dbip-country-lite-YYYY-MM.csv.gz")
    with open(NAMES, encoding="utf-8") as f:
        names = json.load(f)
    with gzip.open(source, "rt", encoding="utf-8", newline="") as f:
        rows = list(csv.reader(f))
    nameless = sorted({row[2] for row in rows if len(row) == 3} - set(names) - {report.COUNTRY_UNKNOWN})
    if nameless:
        sys.exit(f"no name in country_names.json for: {', '.join(nameless)}")
    try:
        blob = report.make_country_table(rows, month.group(1), names)
    except ValueError as e:
        sys.exit(str(e))
    with open(OUT, "wb") as f:
        f.write(blob)
    return rows, names


def check(rows, names):
    """Every row the table was made from must come back out of the report's own lookup."""
    with open(OUT, "rb") as f:
        table = report.parse_countries(f.read())
    asked = wrong = 0
    for first, last, code in rows:
        want = None if code == report.COUNTRY_UNKNOWN else names[code]
        a, b = ipaddress.ip_address(first), ipaddress.ip_address(last)
        middle = type(a)((int(a) + int(b)) // 2)
        for address in {str(a), str(b), str(middle)}:
            asked += 1
            got = report.code_of(table, address)
            got = table["names"].get(got, got) if got else None
            if got != want:
                wrong += 1
                if wrong <= 5:
                    print(f"  wrong: {address} gave {got!r}, the source says {want!r}")
    return table, asked, wrong


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    rows, names = build(sys.argv[1])
    table, asked, wrong = check(rows, names)
    print(f"{OUT}: {os.path.getsize(OUT):,} bytes, {table['release']}; "
          f"{len(rows):,} rows -> {table['parts'][4][1]:,} IPv4 and {table['parts'][6][1]:,} IPv6 stretches")
    print(f"checked {asked:,} addresses against the source: {wrong} wrong")
    if wrong:
        os.remove(OUT)
        sys.exit("the table does not agree with its source; not kept")
