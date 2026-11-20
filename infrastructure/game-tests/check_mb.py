#!/usr/bin/env python3
"""Check a Mirror Bay translation against the English: same structure, same placeholders, nothing left empty or untranslated by accident.
usage: python3 check_mb.py tr"""
import json, re, sys
L = sys.argv[1]; D = '/Users/osmansakli/digitalsafetyknights/frontend/content/story/'
bad = 0
def walk(a, b, path):
    global bad
    if type(a) != type(b): print('TYPE', path); bad += 1; return
    if isinstance(a, dict):
        if list(a) != list(b): print('KEYS', path, 'missing', [k for k in a if k not in b], 'extra', [k for k in b if k not in a], '(order must match too)'); bad += 1
        for k in a:
            if k in b: walk(a[k], b[k], path + '.' + k)
    elif isinstance(a, list):
        if len(a) != len(b): print('LEN', path, len(a), len(b)); bad += 1
        for i, (x, y) in enumerate(zip(a, b)): walk(x, y, path + f'[{i}]')
    elif isinstance(a, str):
        if path.endswith('.s') or path.endswith('.from'):
            if a != b: print('SPEAKER CHANGED', path, a, b); bad += 1
            return
        if sorted(re.findall(r'\{\w+\}', a)) != sorted(re.findall(r'\{\w+\}', b)): print('PLACEHOLDER', path, a, '=>', b); bad += 1
        if not b.strip(): print('EMPTY', path); bad += 1
        if a == b and len(a) > 14 and not path.startswith('.ui.radio'): print('SAME AS ENGLISH?', path, a[:60])
        if '...' in b: print('ASCII ELLIPSIS', path, b[:60]); bad += 1
for f in ('mirror-bay', 'mirror-bay-talk'):
    try: walk(json.load(open(D + f + '.json')), json.load(open(D + f + '-' + L + '.json')), '')
    except Exception as e: print('CANNOT READ', f, e); bad += 1
print('OK' if not bad else f'{bad} problem(s)')
