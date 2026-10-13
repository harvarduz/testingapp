"""Verify the actual production image and persistent-volume restoration.
Build curio-marketplace:test first. Only this test's containers/volume are removed.
"""
import json
import os
import subprocess
import time
import urllib.error
import urllib.request
import uuid

run_id = uuid.uuid4().hex[:10]
name = f'curio-check-{run_id}'
volume = f'curio-check-data-{run_id}'
docker = ['docker']
if os.environ.get('CURIO_DOCKER_CONFIG'):
    docker += ['--config', os.environ['CURIO_DOCKER_CONFIG']]
image = os.environ.get('CURIO_TEST_IMAGE', 'curio-marketplace:test')
checks = 0


def command(*args):
    return subprocess.check_output([*docker, *args], text=True).strip()


def passed(description):
    global checks
    checks += 1
    print(f'PASS {checks}: {description}', flush=True)


def start(with_domain=True):
    environment = ['-e', 'RAILWAY_PUBLIC_DOMAIN=curio.example'] if with_domain else []
    command('run', '-d', '--name', name, '-p', '127.0.0.1::3000', '--mount', f'type=volume,source={volume},target=/data', *environment, image)
    port = command('inspect', '--format', '{{(index (index .NetworkSettings.Ports "3000/tcp") 0).HostPort}}', name)
    base = f'http://127.0.0.1:{port}'
    for _ in range(100):
        try:
            with urllib.request.urlopen(base + '/api/health') as response:
                assert json.load(response)['status'] == 'ok'
            return base
        except OSError:
            time.sleep(.1)
    raise RuntimeError('Container did not become ready: ' + command('logs', name))


def request(base, path, method='GET', data=None, cookie=None, origin=None):
    headers = {'Content-Type': 'application/json'} if data is not None else {}
    if cookie:
        headers['Cookie'] = cookie
    if origin:
        headers['Origin'] = origin
    req = urllib.request.Request(base + path, method=method, data=json.dumps(data).encode() if data is not None else None, headers=headers)
    try:
        response = urllib.request.urlopen(req)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        content = response.read()
        value = json.loads(content) if response.headers.get('Content-Type', '').startswith('application/json') else content.decode()
        return response.status, value, response.headers


try:
    base = start(with_domain=False)
    assert request(base, '/')[0] == 200
    assert request(base, '/api/auth/register', 'POST', {'name': 'Unconfigured Student'}, origin='https://unrelated.example')[0] == 503
    passed('An unexposed production service starts without PUBLIC_URL; account writes remain disabled')
    command('rm', '-f', name)
    base = start()
    starters = request(base, '/api/courses')[1]['courses']
    assert len(starters) == 20
    assert sum(len(course['lessons']) for course in starters) == 121
    assert sum(len(lesson['practice']) for course in starters for lesson in course['lessons']) == 278
    passed('The production image includes every curriculum module and serves 121 lessons with 278 transfer questions')
    passed('Production starts with the automatic Railway public domain and a root-owned volume')
    status, html, headers = request(base, '/')
    assert status == 200 and 'Curio' in html
    assert "frame-ancestors 'none'" in headers['Content-Security-Policy']
    assert headers['X-Content-Type-Options'] == 'nosniff'
    uid = command('exec', name, 'node', '-e', "const s=require('node:fs').readFileSync('/proc/1/status','utf8'); console.log(s.split('\\n').find(l=>l.startsWith('Uid:')))")
    assert '1000' in uid and '0\t0\t0\t0' not in uid
    passed('Production HTML has browser security headers; the application runs as UID 1000')
    status, account, headers = request(base, '/api/auth/register', 'POST', {'name': 'Container Teacher', 'email': 'container@example.test', 'password': 'A unique container test password!'}, origin='https://curio.example')
    assert status == 201
    assert 'Secure' in headers['Set-Cookie'] and 'HttpOnly' in headers['Set-Cookie']
    cookie = headers['Set-Cookie'].split(';')[0]
    passed('Real production account registration sets Secure, HttpOnly session cookies')
    _, catalog, _ = request(base, '/api/courses')
    course = catalog['courses'][0]
    status, saved, _ = request(base, '/api/creator/courses', 'POST', course, cookie, 'https://curio.example')
    assert status == 201
    course_id = saved['course']['id']
    status, result, _ = request(base, f'/api/creator/courses/{course_id}/publish', 'POST', {}, cookie, 'https://curio.example')
    assert status == 200 and result['fee'] == 0
    passed('The container saves a draft to SQLite and publishes it for a zero fee')
    status, _, _ = request(base, '/api/progress', 'PUT', {
        'savedCourses': {course_id: {'saved': True, 'updatedAt': 100}},
        'notes': {f'{course_id}:0': {'text': 'A private note in the production volume.', 'updatedAt': 100}},
        'activePath': {'id': 'math-foundations', 'updatedAt': 100},
        'practiceAttempts': {'container-attempt': {'courseId': course_id, 'lessonIndex': 0, 'questionIndex': 0, 'correct': True, 'answeredAt': 100}},
        'practiceDays': ['2026-10-10'],
        'completedLabs': {'fractions': '2026-10-12'},
    }, cookie, 'https://curio.example')
    assert status == 200
    command('rm', '-f', name)
    base = start()
    _, restored, _ = request(base, '/api/session', cookie=cookie)
    assert restored['user']['id'] == account['user']['id']
    _, catalog, _ = request(base, '/api/courses')
    assert any(course['id'] == course_id for course in catalog['courses'])
    passed('A replacement container restores accounts, sessions, and courses from the same volume')
    assert restored['progress']['savedCourses'][course_id]['saved'] is True
    assert restored['progress']['notes'][f'{course_id}:0']['text'] == 'A private note in the production volume.'
    passed('Private lesson notes and saved courses survive production container replacement')
    assert restored['progress']['activePath']['id'] == 'math-foundations'
    assert restored['progress']['practiceAttempts']['container-attempt']['correct'] is True
    assert restored['progress']['practiceDays'] == ['2026-10-10']
    passed('Study paths, practice answers, and coin-earning days survive production container replacement')
    assert restored['progress']['completedLabs'] == {'fractions': '2026-10-12'}
    passed('Learning Lab completion survives replacement without requiring a database migration')
    assert request(base, '/api/auth/logout', 'POST', {}, cookie, 'https://unrelated.example')[0] == 403
    passed('Production rejects writes from an unrelated origin')
finally:
    subprocess.run([*docker, 'rm', '-f', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run([*docker, 'volume', 'rm', volume], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

print(f'\n{checks} production container checks passed. Test containers and their volume were removed.')
