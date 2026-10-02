import os, pathlib, subprocess, urllib.parse
root = pathlib.Path('/Users/xaviergerinette/SQuizz/squizz')
raw = next(l.split('=', 1)[1].strip().strip('"') for l in (root / '.env').read_text().splitlines() if l.startswith('DATABASE_URL='))
url = urllib.parse.urlsplit(raw)
assert url.hostname in ('localhost', '127.0.0.1')
def db(name):
    return urllib.parse.urlunsplit((url.scheme, url.netloc, '/' + name, '', ''))
def run(args, **kwargs):
    return subprocess.run(args, check=True, capture_output=True, **kwargs).stdout
psql = '/opt/homebrew/bin/psql'
source, destination, admin = db('squizz_e2e'), db('squizz_audit_restore_test'), db('postgres')
dump = run(['/opt/homebrew/bin/pg_dump', '--no-owner', source])
run([psql, admin, '-v', 'ON_ERROR_STOP=1', '-c', 'DROP DATABASE IF EXISTS squizz_audit_restore_test WITH (FORCE)', '-c', 'CREATE DATABASE squizz_audit_restore_test'])
try:
    run([psql, destination, '-v', 'ON_ERROR_STOP=1'], input=dump)
    for table in ('Organization', 'User', 'Quiz', 'Room', 'Media', 'Answer', '_prisma_migrations'):
        query = 'SELECT COUNT(*) FROM "' + table + '"'
        a = run([psql, source, '-Atc', query]).decode().strip()
        b = run([psql, destination, '-Atc', query]).decode().strip()
        assert a == b, (table, a, b)
        print(table, a, 'restored', flush=True)
    print('PASS: isolated database dump restored with matching row counts. Media archive not tested.')
finally:
    run([psql, admin, '-c', 'DROP DATABASE squizz_audit_restore_test WITH (FORCE)'])
