import urllib.request
from urllib.error import HTTPError

req = urllib.request.Request('http://localhost:8000/api/v1/rewards')
try:
    r = urllib.request.urlopen(req)
    print('Success:', r.read().decode())
except HTTPError as e:
    print('Error:', e.code, e.reason)
    print('Body:', e.read().decode())
