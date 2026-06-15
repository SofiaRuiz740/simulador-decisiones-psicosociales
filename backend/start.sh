#!/bin/sh
set -e
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py seed_admin
exec gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
